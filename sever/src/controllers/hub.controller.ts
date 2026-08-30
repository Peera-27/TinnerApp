import Elysia, { t } from "elysia"
import { jwtConfig } from "../configs/jwt.config"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { HubService, type Socket } from "../services/hub.service"
import { PresenceService } from "../services/presence.service"

/** ws.id -> the identity and socket object registered under it. */
const connections = new Map<string, { user_id: string, socket: Socket }>()

export const HubController = new Elysia({
    prefix: "api/hub",
    tags: ['Hub']
})
    .use(jwtConfig)
    .use(AuthMiddleWare)

    /**
     * One socket per signed-in tab, open for the whole session. Everything on it
     * is server -> client: presence changes and notifications. Anything a client
     * sends is ignored.
     */
    .ws('/ws', {
        async open(ws) {
            const token = ws.data.query.token
            const payload = token ? await ws.data.jwt.verify(token) : false
            if (!payload) {
                ws.send({ type: 'error', message: 'Unauthorized 🥵' })
                ws.close()
                return
            }

            const user_id = (payload as AuthPayload).id
            const socket = ws as unknown as Socket
            connections.set(ws.id, { user_id, socket })

            const cameOnline = HubService.join(user_id, socket)
            PresenceService.touch(user_id)

            // the newcomer needs the current picture; everyone else only needs
            // the delta, and only when this is the user's first open tab
            ws.send({ type: 'hello', online: HubService.onlineIds() })
            if (cameOnline)
                HubService.broadcast({ type: 'presence', user_id, online: true }, user_id)
        },

        close(ws) {
            const connection = connections.get(ws.id)
            if (!connection) return
            connections.delete(ws.id)

            // the stored socket is used rather than `ws`: the handler may be
            // handed a different wrapper around the same connection
            const wentOffline = HubService.leave(connection.user_id, connection.socket)
            if (wentOffline)
                HubService.broadcast({ type: 'presence', user_id: connection.user_id, online: false })
        },

        message() {
            // push-only channel — nothing a client sends here means anything
        },
    })

    .get('/online', () => ({ ids: HubService.onlineIds() }), {
        detail: { summary: "Ids of everyone currently connected" },
        isSignIn: true,
        response: t.Object({ ids: t.Array(t.String()) }),
    })
