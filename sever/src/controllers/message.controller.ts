import Elysia, { error, t } from "elysia"
import { jwtConfig } from "../configs/jwt.config"
import { isUuid } from "../helper/id.helper"
import { createRateLimiter } from "../helper/rate-limit.helper"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { BlockService } from "../services/block.service"
import { MessageService } from "../services/message.service"
import { NotificationService } from "../services/notification.service"
import { message, MessageDto } from "../types/mesage.types"

/** One open socket. `user_id` comes from the verified token, never from the
 *  client, so it is the only identity the message handler trusts. */
type client = {
    ws_id: string,
    user_id: string,
    receiver_id: string,
    group_name: string,
}

const groupSubscription = new Map<string, Set<client>>()
/** ws.id -> the connection that was authenticated in `open`. */
const connections = new Map<string, client>()

const MAX_CONTENT_LENGTH = 2000
/** Per-user chat limit. Generous for typing, tight enough to stop a flood. */
const chatLimiter = createRateLimiter(20, 10_000)

export const MessageController = new Elysia({
    prefix: "api/message",
    tags: ['Message']
})
    .use(jwtConfig)
    .use(AuthMiddleWare)
    .use(MessageDto)
    .ws('/ws', {

        async open(ws) {
            const token = ws.data.query.token
            const receiver_id = ws.data.query.receiver_id
            const payload = token ? await ws.data.jwt.verify(token) : false

            // `return` matters: without it the handler carried on and read `id`
            // off a payload it had just rejected.
            if (!payload || !receiver_id || !isUuid(receiver_id)) {
                ws.send({ sender: 'system', content: 'Unauthorized 🥵' })
                ws.close()
                return
            }

            const user_id = (payload as AuthPayload).id
            if (user_id === receiver_id || !await MessageService.userExists(receiver_id)) {
                ws.send({ sender: 'system', content: 'Invalid conversation 🥵' })
                ws.close()
                return
            }
            if (await BlockService.isBlocked(user_id, receiver_id)) {
                ws.send({ sender: 'system', content: 'ไม่สามารถสนทนากับผู้ใช้นี้ได้ 🚫' })
                ws.close()
                return
            }

            const group_name = getGroup(user_id, receiver_id)
            const client: client = { ws_id: ws.id, user_id, receiver_id, group_name }
            connections.set(ws.id, client)

            ws.send({ sender: 'system', content: 'Connected 😘' })
            if (!ws.isSubscribed(group_name)) {
                ws.subscribe(group_name)
                if (!groupSubscription.has(group_name)) {
                    groupSubscription.set(group_name, new Set())
                }
                groupSubscription.get(group_name)?.add(client)
            }
        },


        close(ws) {
            connections.delete(ws.id)
            for (const clients of groupSubscription.values()) {
                for (const client of clients) {
                    if (client.ws_id === ws.id) {
                        ws.unsubscribe(client.group_name)
                        clients.delete(client)
                    }
                }
            }
        },

        async message(ws, message) {
            // The socket was authenticated once, in `open`. Taking `sender` from
            // the payload instead would let any client write a message in
            // someone else's name and publish it into a thread they are not in.
            const connection = connections.get(ws.id)
            if (!connection) {
                ws.send({ sender: 'system', content: 'Unauthorized 🥵' })
                ws.close()
                return
            }

            const msg = message as message
            const content = typeof msg?.content === 'string' ? msg.content.trim() : ''
            if (!content) {
                ws.send({ sender: 'system', content: 'Invalid message ผิดปกติ 🥵' })
                return
            }
            if (content.length > MAX_CONTENT_LENGTH) {
                ws.send({ sender: 'system', content: `ข้อความยาวเกิน ${MAX_CONTENT_LENGTH} ตัวอักษร 🥵` })
                return
            }

            const limit = chatLimiter.check(connection.user_id)
            if (!limit.allowed) {
                ws.send({ sender: 'system', content: `ส่งถี่เกินไป ลองใหม่ใน ${limit.retry_after} วินาที 🥵` })
                return
            }

            try {
                // "delivered" means the other person is sitting in this room:
                // it both marks the row read and decides whether the message is
                // worth a notification
                const delivered = isReceiver(connection.group_name, connection.receiver_id)
                const saved = await MessageService.save(
                    connection.user_id,
                    connection.receiver_id,
                    content,
                    delivered,
                )

                ws.publish(connection.group_name, saved)
                ws.send(saved)

                if (saved.id)
                    await NotificationService.forMessage(connection.receiver_id, connection.user_id, saved.id, delivered)
                return
            } catch (error) {
                ws.send({ sender: 'system', content: 'Something ผิดปกติ 💩' })
            }
        },
    })

    // static segments are declared before `/:receiver_id` so the router can
    // never read "threads" as somebody's id
    .get('/threads', async ({ Auth, query }) => {
        if (!query.pageSize || !query.currentPage)
            throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        return MessageService.getThreads(user_id, query)
    }, {
        detail: { summary: "Inbox — one row per conversation" },
        query: "pagination",
        response: "threads",
        isSignIn: true,
    })

    .get('/unread', async ({ Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        return { count: await MessageService.getUnreadCount(user_id) }
    }, {
        detail: { summary: "Total unread messages" },
        response: "unread",
        isSignIn: true,
    })

    .get('/:receiver_id', async ({ Auth, params: { receiver_id }, query }) => {
        if (!query.pageSize || !query.currentPage || !isUuid(receiver_id)) {
            throw error(400)
        }
        const user_id = (Auth.payload as AuthPayload).id
        // a blocked thread reads as one that is not there
        if (await BlockService.isBlocked(user_id, receiver_id))
            throw error(404)

        // `response: "message"` is a single schema, not a per-status map, so the
        // body is validated as-is — wrapping it in { 200: ... } fails validation
        return MessageService.getThread(user_id, receiver_id, query)
    }, {
        detail: { summary: "One conversation" },
        query: "pagination",
        response: "message",
        isSignIn: true,
        params: t.Object({ receiver_id: t.String() })
    })

    .delete('/:message_id', async ({ Auth, params: { message_id }, set }) => {
        if (!isUuid(message_id))
            throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        const removed = await MessageService.remove(user_id, message_id)
        // a message that is not yours is reported as missing, so the endpoint
        // cannot be used to probe which ids exist
        if (!removed) throw error(404)

        set.status = "No Content"
    }, {
        detail: { summary: "Delete one message for me" },
        isSignIn: true,
        params: t.Object({ message_id: t.String() })
    })

const getGroup = function (sender: string, receiver: string): string {
    const compare = sender.localeCompare(receiver)
    if (compare < 0) return `${sender}-${receiver}`
    return `${receiver}-${sender}`
}

const isReceiver = function (group_name: string, receiver: string): boolean {
    const clients = groupSubscription.get(group_name)
    if (clients) {
        return Array.from(clients).find(client => client.user_id === receiver) !== undefined
    }
    return false
}
