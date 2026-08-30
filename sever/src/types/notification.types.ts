import Elysia, { Static, t } from "elysia"
import { _pagination, CreatePagination } from "./pagination.type"
import { _user } from "./user.type"

/** What caused the notification. Kept as a plain string column so adding a kind
 *  later does not need a migration. */
export const NOTIFICATION_TYPES = ["like", "match", "message"] as const
export type notificationType = typeof NOTIFICATION_TYPES[number]

export const _notification = t.Object({
    id: t.String(),
    type: t.String(),
    /** the person who caused it, ready to render */
    actor: _user,
    message_id: t.Optional(t.String()),
    read_at: t.Optional(t.Date()),
    created_at: t.Date(),
})

export const _notificationPaginator = CreatePagination(_notification, _pagination)

export type notification = Static<typeof _notification>
export type notificationPaginator = Static<typeof _notificationPaginator>

export const NotificationDto = new Elysia().model({
    pagination: t.Optional(_pagination),
    notifications: _notificationPaginator,
    notification_unread: t.Object({ count: t.Number() }),
})
