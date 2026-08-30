import Elysia, { Static, t } from "elysia"
import { _pagination, CreatePagination } from "./pagination.type"
import { _user } from "./user.type"

export const _message = t.Object({
    id: t.Optional(t.String()),
    sender: t.String(),
    receiver: t.String(),
    content: t.String(),
    created_at: t.Optional(t.Date()),
    read_at: t.Optional(t.Date()),
    sender_delete: t.Optional(t.Boolean()),
    receiver_delete: t.Optional(t.Boolean())

})

/** One row of the inbox: who the thread is with, its newest message, and how
 *  many of their messages are still unread. */
export const _thread = t.Object({
    user: _user,
    last_message: _message,
    unread: t.Number(),
})

export const _unreadCount = t.Object({ count: t.Number() })

export const _messagePaginator = CreatePagination(_message, _pagination)
export const _threadPaginator = CreatePagination(_thread, _pagination)
export type MessagePaginator = Static<typeof _messagePaginator>
export type ThreadPaginator = Static<typeof _threadPaginator>
export type thread = Static<typeof _thread>
export type message = Static<typeof _message>

export const MessageDto = new Elysia().model({
    pagination: t.Optional(_pagination),
    message: _messagePaginator,
    threads: _threadPaginator,
    unread: _unreadCount,

})
