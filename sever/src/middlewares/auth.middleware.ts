import { JWTPayloadSpec } from "@elysiajs/jwt"
import Elysia from "elysia"
import { jwtConfig } from "../configs/jwt.config"
import { PresenceService } from "../services/presence.service"

type AuthContext = {
    Auth: {
        payload: false | (Record<string, string | number> & JWTPayloadSpec)
    }
}

export type AuthPayload = { id: string }
export const AuthMiddleWare = new Elysia({ name: 'Middleware.Auth' })

    .use(jwtConfig)
    .derive({ as: 'scoped' }, async ({ headers, jwt }): Promise<AuthContext> => {
        let payload: false | (Record<string, string | number> & JWTPayloadSpec) = false

        //Extract the 'Authorization' header from the incoming request
        const auth = headers['authorization']
        const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
        if (token) {
            // an expired or forged token leaves the payload false, which the
            // isSignIn macro turns into a 401. Throwing here made it a 500,
            // which the client cannot tell apart from a real server fault —
            // and 401 is what tells it to refresh and retry.
            payload = await jwt.verify(token)
            // every authenticated request is a sign of life — this is the only
            // thing that keeps `last_active` (and the "recently active" sort
            // built on it) from staying null forever
            const user_id = (payload as unknown as AuthPayload).id
            if (user_id) PresenceService.touch(user_id)
        }
        return {
            Auth: { payload }
        }
    })
    .macro(({ onBeforeHandle }) => ({
        // This is declaring a service method
        isSignIn(value: boolean) {
            if (!value) return
            onBeforeHandle((context) => {
                const { Auth, error } = context as AuthContext & { error: Function }
                if (!Auth.payload) return error(401)
            })
        }
    }))
