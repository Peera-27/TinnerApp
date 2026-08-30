import { and, count, eq, or, sql } from "drizzle-orm"
import { db } from "../db"
import { blocks, follows, users } from "../db/schema"
import { isUuid } from "../helper/id.helper"
import { toUser } from "../helper/mapper.helper"
import { byLastActive } from "../helper/query.helper"
import { userPaginatoin, userPaginator } from "../types/user.type"

export const BlockService = {
    /** True when either person has blocked the other. */
    isBlocked: async function (a: string, b: string): Promise<boolean> {
        if (!isUuid(a) || !isUuid(b)) return false
        const found = await db.query.blocks.findFirst({
            where: or(
                and(eq(blocks.blocker_id, a), eq(blocks.blocked_id, b)),
                and(eq(blocks.blocker_id, b), eq(blocks.blocked_id, a)),
            ),
            columns: { blocker_id: true },
        })
        return found !== undefined
    },

    /**
     * Blocks someone and tears down the follow in both directions — leaving the
     * hearts in place would keep each of them on the other's Following page.
     */
    block: async function (user_id: string, target_id: string): Promise<void> {
        if (!isUuid(target_id) || user_id === target_id)
            throw new Error("Invalid target_id")

        const target = await db.query.users.findFirst({
            where: eq(users.id, target_id),
            columns: { id: true },
        })
        if (!target) throw new Error("Invalid target_id")

        await db.transaction(async tx => {
            await tx.insert(blocks)
                .values({ blocker_id: user_id, blocked_id: target_id })
                .onConflictDoNothing()

            await tx.delete(follows).where(or(
                and(eq(follows.follower_id, user_id), eq(follows.following_id, target_id)),
                and(eq(follows.follower_id, target_id), eq(follows.following_id, user_id)),
            ))
        })
    },

    unblock: async function (user_id: string, target_id: string): Promise<void> {
        if (!isUuid(target_id)) throw new Error("Invalid target_id")
        await db.delete(blocks).where(and(
            eq(blocks.blocker_id, user_id),
            eq(blocks.blocked_id, target_id),
        ))
    },

    /** The people I blocked — the only ones I can lift again. */
    list: async function (user_id: string, pagination: userPaginatoin): Promise<userPaginator> {
        // bare identifiers on the inner side — see the note on `notBlockedWith`
        const where = sql`${users.id} in (
            select blocked_id from blocks where blocker_id = ${user_id}::uuid
        )`
        const offset = pagination.pageSize * (pagination.currentPage - 1)

        const [docs, total] = await Promise.all([
            db.query.users.findMany({
                where,
                with: { photos: true },
                orderBy: byLastActive,
                limit: pagination.pageSize,
                offset,
            }),
            db.select({ value: count() }).from(users).where(where),
        ])

        pagination.length = total[0].value
        return { pagination, items: docs.map(toUser) }
    },
}
