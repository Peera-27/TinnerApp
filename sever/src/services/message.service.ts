import { SQL, and, count, countDistinct, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { db } from "../db"
import { messages, users, type MessageRow } from "../db/schema"
import { toMessage, toUser } from "../helper/mapper.helper"
import { notBlockedWith } from "../helper/query.helper"
import type { MessagePaginator, ThreadPaginator, message, thread } from "../types/mesage.types"
import type { pagination } from "../types/pagination.type"

/** Rows the caller has not removed from their own side of the thread. */
function visibleToUser(user_id: string): SQL {
    return or(
        and(eq(messages.sender_id, user_id), eq(messages.sender_delete, false)),
        and(eq(messages.receiver_id, user_id), eq(messages.receiver_delete, false)),
    )!
}

/** The single thread between two people, in both directions. */
function threadBetween(user_id: string, other_id: string): SQL {
    return or(
        and(eq(messages.sender_id, user_id), eq(messages.receiver_id, other_id), eq(messages.sender_delete, false)),
        and(eq(messages.sender_id, other_id), eq(messages.receiver_id, user_id), eq(messages.receiver_delete, false)),
    )!
}

/** `db.execute` hands back whatever the driver returns: bun-sql gives the rows
 *  directly, node-postgres wraps them in `{ rows }`. */
function rowsOf<T>(result: unknown): T[] {
    if (Array.isArray(result)) return result as T[]
    const rows = (result as { rows?: unknown } | null)?.rows
    return Array.isArray(rows) ? (rows as T[]) : []
}

/** Raw `distinct on` row — the driver hands timestamps back untyped. */
type ThreadRow = {
    partner_id: string
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string | Date
    read_at: string | Date | null
    sender_delete: boolean
    receiver_delete: boolean
}

function toMessageRow(row: ThreadRow): MessageRow {
    return {
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        content: row.content,
        read_at: row.read_at ? new Date(row.read_at) : null,
        sender_delete: row.sender_delete,
        receiver_delete: row.receiver_delete,
        created_at: new Date(row.created_at),
    }
}

export const MessageService = {
    /** One conversation, newest first. Everything the caller had not read yet is
     *  marked read on the way out. */
    getThread: async function (user_id: string, other_id: string, query: pagination): Promise<MessagePaginator> {
        const filter = threadBetween(user_id, other_id)
        const offset = query.pageSize * (query.currentPage - 1)

        const [rows, total] = await Promise.all([
            db.select().from(messages)
                .where(filter)
                .orderBy(desc(messages.created_at))
                .limit(query.pageSize)
                .offset(offset),
            db.select({ value: count() }).from(messages).where(filter),
        ])

        query.length = total[0]?.value ?? 0
        const items = rows.map(toMessage)

        await db.update(messages)
            .set({ read_at: new Date() })
            .where(and(
                eq(messages.sender_id, other_id),
                eq(messages.receiver_id, user_id),
                isNull(messages.read_at),
            ))

        return { pagination: query, items }
    },

    /**
     * The inbox: one row per person the caller has talked to, carrying that
     * thread's newest message and the caller's unread count for it.
     */
    getThreads: async function (user_id: string, query: pagination): Promise<ThreadPaginator> {
        const offset = query.pageSize * (query.currentPage - 1)
        const partnerExpr = sql`case when ${messages.sender_id} = ${user_id} then ${messages.receiver_id} else ${messages.sender_id} end`

        // `distinct on` picks the newest row per partner in a single pass; the
        // portable ranked-subquery version costs an extra sort over the table.
        const [rowResult, total] = await Promise.all([
            db.execute(sql`
                select * from (
                    select distinct on (partner_id) *
                    from (
                        select
                            m.*,
                            case when m.sender_id = ${user_id}::uuid then m.receiver_id else m.sender_id end as partner_id
                        from ${messages} m
                        where (m.sender_id = ${user_id}::uuid and m.sender_delete = false)
                           or (m.receiver_id = ${user_id}::uuid and m.receiver_delete = false)
                    ) tagged
                    order by partner_id, created_at desc
                ) newest
                where ${notBlockedWith(user_id, sql`newest.partner_id`)}
                order by newest.created_at desc
                limit ${query.pageSize} offset ${offset}
            `),
            db.select({ value: countDistinct(partnerExpr) })
                .from(messages)
                .where(and(visibleToUser(user_id), notBlockedWith(user_id, partnerExpr))),
        ])

        const rows = rowsOf<ThreadRow>(rowResult)
        query.length = total[0]?.value ?? 0
        if (rows.length === 0)
            return { pagination: query, items: [] }

        const partnerIds = rows.map(row => row.partner_id)
        const [partners, unreadRows] = await Promise.all([
            db.query.users.findMany({ where: inArray(users.id, partnerIds), with: { photos: true } }),
            db.select({ sender_id: messages.sender_id, unread: count() })
                .from(messages)
                .where(and(
                    eq(messages.receiver_id, user_id),
                    eq(messages.receiver_delete, false),
                    isNull(messages.read_at),
                    inArray(messages.sender_id, partnerIds),
                ))
                .groupBy(messages.sender_id),
        ])

        const partnerById = new Map(partners.map(partner => [partner.id, partner]))
        const unreadById = new Map(unreadRows.map(row => [row.sender_id, row.unread]))

        const items: thread[] = []
        for (const row of rows) {
            const partner = partnerById.get(row.partner_id)
            // the account can disappear between the two queries — drop the row
            // rather than answer with a thread that has nobody on the other end
            if (!partner) continue
            items.push({
                user: toUser(partner),
                last_message: toMessage(toMessageRow(row)),
                unread: unreadById.get(row.partner_id) ?? 0,
            })
        }

        return { pagination: query, items }
    },

    /** Unread messages across every thread — drives the header badge. */
    getUnreadCount: async function (user_id: string): Promise<number> {
        const [row] = await db.select({ value: count() })
            .from(messages)
            .where(and(
                eq(messages.receiver_id, user_id),
                eq(messages.receiver_delete, false),
                isNull(messages.read_at),
            ))
        return row?.value ?? 0
    },

    /**
     * Hides one message from the caller's side. The row is only really deleted
     * once both people have removed it, so the other side keeps their copy.
     */
    remove: async function (user_id: string, message_id: string): Promise<boolean> {
        const row = await db.query.messages.findFirst({ where: eq(messages.id, message_id) })
        if (!row) return false

        const is_sender = row.sender_id === user_id
        const is_receiver = row.receiver_id === user_id
        if (!is_sender && !is_receiver) return false

        const sender_delete = is_sender || row.sender_delete
        const receiver_delete = is_receiver || row.receiver_delete

        if (sender_delete && receiver_delete)
            await db.delete(messages).where(eq(messages.id, message_id))
        else
            await db.update(messages)
                .set({ sender_delete, receiver_delete })
                .where(eq(messages.id, message_id))

        return true
    },

    /** Stores one chat message. `read` is true when the receiver is in the room. */
    save: async function (sender_id: string, receiver_id: string, content: string, read: boolean): Promise<message> {
        const [saved] = await db.insert(messages).values({
            sender_id,
            receiver_id,
            content,
            read_at: read ? new Date() : null,
        }).returning()

        if (!saved) throw new Error("Message was not stored")
        return toMessage(saved)
    },

    /** Guards the websocket: a thread cannot be opened against an id that is nobody. */
    userExists: async function (user_id: string): Promise<boolean> {
        const found = await db.query.users.findFirst({
            where: eq(users.id, user_id),
            columns: { id: true },
        })
        return found !== undefined
    },
}
