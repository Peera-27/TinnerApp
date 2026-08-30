import { and, count, desc, eq, inArray, isNull } from "drizzle-orm"
import { db } from "../db"
import { notifications, users, type NotificationRow, type PhotoRow, type UserRow } from "../db/schema"
import { toUser } from "../helper/mapper.helper"
import type { pagination } from "../types/pagination.type"
import type { notification, notificationPaginator, notificationType } from "../types/notification.types"
import { HubService } from "./hub.service"

type ActorRow = UserRow & { photos: PhotoRow[] }

function toNotification(row: NotificationRow, actor: ActorRow): notification {
    return {
        id: row.id,
        type: row.type,
        actor: toUser(actor),
        message_id: row.message_id ?? undefined,
        read_at: row.read_at ?? undefined,
        created_at: row.created_at,
    }
}

export const NotificationService = {
    /**
     * Records something worth knowing about and pushes it down the hub socket
     * if the person happens to be connected. Never throws: a notification that
     * cannot be stored must not fail the like or the message that caused it.
     */
    create: async function (
        user_id: string,
        actor_id: string,
        type: notificationType,
        message_id?: string,
    ): Promise<void> {
        if (user_id === actor_id) return

        try {
            const [row] = await db.insert(notifications)
                .values({ user_id, actor_id, type, message_id: message_id ?? null })
                .returning()
            if (!row) return

            const actor = await db.query.users.findFirst({
                where: eq(users.id, actor_id),
                with: { photos: true },
            })
            if (!actor) return

            HubService.send(user_id, { type: "notification", payload: toNotification(row, actor) })
        } catch (error) {
            console.error("notification not stored", error)
        }
    },

    /**
     * A message only becomes a notification when it lands somewhere the person
     * is not looking — otherwise every line of a live conversation would ring.
     */
    forMessage: async function (receiver_id: string, sender_id: string, message_id: string, delivered: boolean): Promise<void> {
        if (delivered) return
        await NotificationService.create(receiver_id, sender_id, "message", message_id)
    },

    list: async function (user_id: string, query: pagination): Promise<notificationPaginator> {
        const where = eq(notifications.user_id, user_id)
        const offset = query.pageSize * (query.currentPage - 1)

        const [rows, total] = await Promise.all([
            db.select().from(notifications)
                .where(where)
                .orderBy(desc(notifications.created_at))
                .limit(query.pageSize)
                .offset(offset),
            db.select({ value: count() }).from(notifications).where(where),
        ])

        query.length = total[0]?.value ?? 0
        if (rows.length === 0) return { pagination: query, items: [] }

        const actors = await db.query.users.findMany({
            where: inArray(users.id, rows.map(row => row.actor_id)),
            with: { photos: true },
        })
        const actorById = new Map(actors.map(actor => [actor.id, actor]))

        const items: notification[] = []
        for (const row of rows) {
            const actor = actorById.get(row.actor_id)
            // the actor can have deleted their account since — drop the row
            // rather than render a notification from nobody
            if (!actor) continue
            items.push(toNotification(row, actor))
        }

        return { pagination: query, items }
    },

    unreadCount: async function (user_id: string): Promise<number> {
        const [row] = await db.select({ value: count() })
            .from(notifications)
            .where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
        return row?.value ?? 0
    },

    markAllRead: async function (user_id: string): Promise<void> {
        await db.update(notifications)
            .set({ read_at: new Date() })
            .where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
    },

    markRead: async function (user_id: string, notification_id: string): Promise<boolean> {
        const updated = await db.update(notifications)
            .set({ read_at: new Date() })
            .where(and(eq(notifications.id, notification_id), eq(notifications.user_id, user_id)))
            .returning({ id: notifications.id })
        return updated.length > 0
    },
}
