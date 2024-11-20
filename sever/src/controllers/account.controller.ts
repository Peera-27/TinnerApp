import Elysia from "elysia"
import { jwtconfig } from "../configs/jwt.config"
import { AccountDto } from "../types/account.types"
import { AccountService } from "../services/account.service"

export const AccountController = new Elysia({
    prefix: '/api/account',
    tags: ['Account']
})
    .use(jwtconfig)
    .use(AccountDto)

    .post('/register', async ({ body, jwt, set }) => {
        try {
            const user = await AccountService.createNewUser(body)
            const token = await jwt.sign({ id: user.id })
            return { token, user }
        } catch (error) {
            set.status = 400
            if (error instanceof Error)
                throw new Error(error.message)
            set.status = 500
            throw new Error('Something went wrong, try agian')

        }
    }, {
        body: "register",
        response: "account",
        detail: {
            summary: "Create new user"
        },
        beforeHandle: ({ body: { username, password }, set }) => {
            const usernameRegex = /^[A-Za-z][A-Za-z\d]{3,9}$/
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/
            if (!usernameRegex.test(username) || !passwordRegex.test(password)) {
                set.status = "Bad Request"
                throw new Error(`Invalid username or password`)
            }
        },
    })