import Elysia from "elysia"
import { jwtConfig } from "../configs/jwt.config"
import { clientIp, createRateLimiter } from "../helper/rate-limit.helper"
import { isValidPassword, isValidUsername, PASSWORD_REQUIREMENTS, USERNAME_REQUIREMENTS } from "../helper/validation.helper"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { AccountService } from "../services/account.service"
import { PasswordService } from "../services/password.service"
import { TokenService } from "../services/token.service"
import { AccountDto } from "../types/account.types"

/**
 * Password guessing is only expensive for the attacker if they get few tries.
 * Keyed by IP *and* username so one noisy network cannot lock out an account,
 * and a single account cannot be hammered from a botnet either.
 */
const loginLimiter = createRateLimiter(10, 5 * 60_000)
/**
 * Registration is rarer still — this only stops bulk account creation.
 * Kept at 15/hour rather than a tighter number because a single IP is often a
 * whole office or a mobile carrier's NAT: the sixth genuine person behind it
 * should not be turned away. Anyone bulk-creating accounts rotates IPs anyway,
 * so a stricter limit mostly costs real users.
 */
const registerLimiter = createRateLimiter(15, 60 * 60_000)
/** Reset mails go to somebody's inbox, so the limit is per IP and strict. */
const resetLimiter = createRateLimiter(5, 60 * 60_000)

export const AccountController = new Elysia({
    prefix: '/api/account',
    tags: ['Account']
})
    .use(jwtConfig)
    .use(AuthMiddleWare)
    .use(AccountDto)

    .post('/login', async ({ body, jwt, set, request, server }) => {
        const ip = clientIp(request, server)
        try {
            const user = await AccountService.login(body)
            // a correct password clears the counter, so a legitimate user who
            // fumbled their password a few times is not left throttled
            loginLimiter.reset(`${ip}:${body.username.toLowerCase()}`)
            const token = await jwt.sign({ id: user.id })
            const refresh_token = await TokenService.issue(user.id)
            return { token, refresh_token, user }

        } catch (error) {
            set.status = "Bad Request" //badd request
            if (error instanceof Error)
                throw new Error(error.message)
            set.status = "Internal Server Error"
            throw new Error("Something went wrong , try again later")
        }
    }, {
        detail: { summary: "Login" },
        body: "login",
        response: "user_and_token",
        beforeHandle: ({ body: { username }, set, request, server }) => {
            const limit = loginLimiter.check(`${clientIp(request, server)}:${username.toLowerCase()}`)
            if (!limit.allowed) {
                set.status = "Too Many Requests"
                throw new Error(`ลองเข้าสู่ระบบบ่อยเกินไป รอ ${limit.retry_after} วินาทีแล้วลองใหม่`)
            }
        },
    })
    .post('/register', async ({ body, set, jwt }) => {
        try {
            const user = await AccountService.createNewUser(body)
            const token = await jwt.sign({ id: user.id })
            const refresh_token = await TokenService.issue(user.id)
            return { token, refresh_token, user }
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw new Error(error.message)
            set.status = 500
            throw new Error('Something went wrong , try again later')
        }

    }, {
        body: "register",
        response: "user_and_token",
        detail: {

            summary: "Create new user",
        },
        beforeHandle: ({ body: { username, password }, set, request, server }) => {
            const limit = registerLimiter.check(clientIp(request, server))
            if (!limit.allowed) {
                set.status = "Too Many Requests"
                throw new Error(`สมัครถี่เกินไป รอ ${limit.retry_after} วินาทีแล้วลองใหม่`)
            }

            // Say which field is wrong and why. This is the user's own input on
            // the way in, not an existence check, so there is nothing to leak —
            // and a generic rejection here just leaves the form guessing.
            if (!isValidUsername(username)) {
                set.status = "Bad Request"
                throw new Error(USERNAME_REQUIREMENTS)
            }
            if (!isValidPassword(password)) {
                set.status = "Bad Request"
                throw new Error(PASSWORD_REQUIREMENTS)
            }
        },
    })

    /**
     * The access token lives a day; this is what keeps a session alive past
     * that without asking for the password again. The old refresh token is
     * spent in the process, so a stolen copy stops working after one use.
     */
    .post('/refresh', async ({ body: { refresh_token }, jwt, set }) => {
        const rotated = await TokenService.rotate(refresh_token)
        if (!rotated) {
            set.status = "Unauthorized"
            throw new Error("Session expired, please sign in again")
        }

        const token = await jwt.sign({ id: rotated.user_id })
        return { token, refresh_token: rotated.refresh_token }
    }, {
        detail: { summary: "Trade a refresh token for a new pair" },
        body: "refresh_request",
        response: "token_pair",
    })

    .post('/logout', async ({ body: { refresh_token }, set }) => {
        // no auth on purpose: signing out has to work even once the access
        // token has expired
        await TokenService.revoke(refresh_token)
        set.status = "No Content"
    }, {
        detail: { summary: "End one session" },
        body: "refresh_request",
    })

    .get('/me', async ({ Auth, set }) => {
        try {
            const user_id = (Auth.payload as AuthPayload).id
            return await AccountService.me(user_id)
        } catch (error) {
            set.status = "Bad Request"
            throw error
        }
    }, {
        detail: { summary: "My own account, email included" },
        isSignIn: true,
        response: "me",
    })

    .post('/forgot-password', async ({ body: { email }, set, request, server }) => {
        const limit = resetLimiter.check(clientIp(request, server))
        if (!limit.allowed) {
            set.status = "Too Many Requests"
            throw new Error(`ขอลิงก์ถี่เกินไป รอ ${limit.retry_after} วินาทีแล้วลองใหม่`)
        }

        // always 204, whether or not the address is registered — anything else
        // turns this into a way to find out who has an account here
        await PasswordService.requestReset(email)
        set.status = "No Content"
    }, {
        detail: { summary: "Send a password reset link" },
        body: "forgot_password",
    })

    .post('/reset-password', async ({ body: { token, password }, set }) => {
        try {
            await PasswordService.reset(token, password)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            throw error
        }
    }, {
        detail: { summary: "Set a new password from a reset link" },
        body: "reset_password",
    })

    .patch('/password', async ({ Auth, body, set }) => {
        try {
            const user_id = (Auth.payload as AuthPayload).id
            await PasswordService.change(user_id, body.current_password, body.new_password)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            throw error
        }
    }, {
        detail: { summary: "Change my password" },
        isSignIn: true,
        body: "change_password",
    })
