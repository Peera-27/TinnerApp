import Elysia, { error, t } from "elysia"
import { jwtConfig } from "../configs/jwt.config"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { message, MessageDto } from "../types/mesage.types"
import mongoose from "mongoose"
import { Message } from "../models/message.model"
type client = {
    ws_id: string,
    user_id: string,
    group_name: string,
}
const groupSubscription = new Map<string, Set<client>>()

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
            const payload = await ws.data.jwt.verify(token)
            if (!payload || !receiver_id) {
                ws.send({ sender: 'system', content: 'Unauthorized 🥵' })
                ws.close()

            }
            const user_id = (payload as AuthPayload).id
            const group_name = getGroup(user_id, receiver_id!)
            ws.send({ sender: 'system', content: 'Connected 😘' })
            if (!ws.isSubscribed(group_name)) {
                ws.subscribe(group_name)
                if (!groupSubscription.has(group_name)) {
                    groupSubscription.set(group_name, new Set())

                }
                groupSubscription.get(group_name)?.add({
                    ws_id: ws.id,
                    user_id: user_id,
                    group_name: group_name
                })
            }
        },


        close(ws) {
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
            const msg = message as message
            if (!msg.sender || !msg.receiver || !msg.content) {
                ws.send({ sender: 'system', content: 'Invalid message ผิดปกติ 🥵' })
                return
            }
            const group_name = getGroup(msg.sender, msg.receiver)
            try {
                const newMessage = new Message({
                    sender: new mongoose.Types.ObjectId(msg.sender),
                    receiver: new mongoose.Types.ObjectId(msg.receiver),
                    content: msg.content
                })
                if (isReceiver(group_name, msg.receiver)) {
                    newMessage.read_at = new Date()
                }
                await newMessage.save()
                const msgObj = newMessage.toMessage()
                ws.publish(group_name, msgObj)
                ws.send(msgObj)
                ws.send({ sender: 'system', content: 'Something ผิดปกติ 💩' })
                return
            } catch (error) {

            }
        },
    })
    .get('/:receiver_id', async ({ Auth, params: { receiver_id }, query }) => {
        if (!query.pageSize || !query.currentPage) {
            throw error(400)
        }
        const user_id = (Auth.payload as any).id
        const sender_Obj_id = new mongoose.Types.ObjectId(user_id)
        const receiver_Obj_id = new mongoose.Types.ObjectId(receiver_id)
        const filter = {
            $or: [
                { sender: sender_Obj_id, receiver: receiver_Obj_id, sender_delete: { $ne: true } },
                { sender: receiver_Obj_id, receiver: sender_Obj_id, receiver_delete: { $ne: true } }
            ]
        }
        const model = Message.find(filter).sort({ created_at: -1 })
        const skip = query.pageSize * (query.currentPage - 1)
        model.skip(skip).limit(query.pageSize)
        const [mesageDocs, totalCount] = await Promise.all([
            model.exec(),
            Message.countDocuments(filter).exec()
        ])
        query.length = totalCount
        const messages = mesageDocs.map(doc => doc.toMessage())
        await Message.updateMany({
            sender: receiver_Obj_id,
            receiver: sender_Obj_id,
            read_at: { $exists: false }

        }, {
            $set: { read_at: new Date() }
        })
        return { 200: { pagination: query, items: messages } }

    }, {
        query: "pagination",
        response: "message",
        isSignIn: true,
        params: t.Object({ receiver_id: t.String() })
    })

const getGroup = function (sender: string, receiver: string): string {
    const compare = sender.localeCompare(receiver)
    if (compare < 0) return `${sender}-${receiver}`
    return `${receiver}-${sender}`
}
const countSubscribers = function (group_name: string): number {
    return groupSubscription.get(group_name)?.size || 0

}
const isReceiver = function (group_name: string, receiver: string): boolean {
    const clients = groupSubscription.get(group_name)
    if (clients) {
        return Array.from(clients).find(client => client.user_id === receiver) !== undefined
    }
    return false
}