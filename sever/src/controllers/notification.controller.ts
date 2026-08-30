import Elysia, { error, t } from "elysia"
import { isUuid } from "../helper/id.helper"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { NotificationService } from "../services/notification.service"
import { NotificationDto } from "../types/notification.types"

export const NotificationController = new Elysia({
    prefix: "api/notification",
    tags: ['Notification']
})
    .use(AuthMiddleWare)
    .use(NotificationDto)

    // static segments first so `/unread` and `/read` are never read as an id
    .get('/unread', async ({ Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        return { count: await NotificationService.unreadCount(user_id) }
    }, {
        detail: { summary: "Unread notification count" },
        isSignIn: true,
        response: "notification_unread",
    })

    .patch('/read', async ({ Auth, set }) => {
        const user_id = (Auth.payload as AuthPayload).id
        await NotificationService.markAllRead(user_id)
        set.status = "No Content"
    }, {
        detail: { summary: "Mark every notification read" },
        isSignIn: true,
    })

    .get('/', async ({ Auth, query }) => {
        if (!query.pageSize || !query.currentPage)
            throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        return NotificationService.list(user_id, query)
    }, {
        detail: { summary: "My notifications" },
        isSignIn: true,
        query: "pagination",
        response: "notifications",
    })

    .patch('/:notification_id/read', async ({ Auth, params: { notification_id }, set }) => {
        if (!isUuid(notification_id)) throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        const marked = await NotificationService.markRead(user_id, notification_id)
        if (!marked) throw error(404)

        set.status = "No Content"
    }, {
        detail: { summary: "Mark one notification read" },
        isSignIn: true,
        params: t.Object({ notification_id: t.String() }),
    })
