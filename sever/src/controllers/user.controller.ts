import Elysia from "elysia"
import { AuthMiddleware } from "../middlewares/auth.middleware"

export const UserController = new Elysia({
    prefix: "/api/user",
    tags: ['user']
})
    .use(AuthMiddleware)

    .get('/all', () => {
        return {
            text: 'hello G'
        }
    }, {
        isSignIn: true
    })