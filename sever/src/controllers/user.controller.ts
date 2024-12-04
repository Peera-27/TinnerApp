import Elysia from "elysia"
import { AuthMiddleware, AuthPaylode } from "../middlewares/auth.middleware"
import { userService } from "../services/user.service"
import { UserDto, userPagination } from "../types/user.type"

export const UserController = new Elysia({
    prefix: "/api/user",
    tags: ['user']
})
    .use(UserDto)
    .use(AuthMiddleware)

    .get('/all', () => {
        return {
            text: 'hello G'
        }
    }, {
        isSignIn: true
    })

    .get('/x', () => { }, {

    })

    .get('/', ({ query, Auth }) => {
        const user_id = (Auth.payload as AuthPaylode).id
        return userService.get(query, user_id)

    }, {
        query: "pagination",
        detail: { summary: "Get user" },
        response: "users",
        isSignIn: true,
    })