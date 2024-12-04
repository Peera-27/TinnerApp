import Elysia from "elysia"
import { AuthMiddleware, AuthPaylode } from "../middlewares/auth.middleware"
import { userService } from "../services/user.service"
import { UserDto, userPagination } from "../types/user.type"
import { AccountService } from "../services/account.service"

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
    .patch('/', async ({ body, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPaylode).id
            await userService.updateProfile(body, user_id)
            set.status = 'No Content'
        } catch (error) {
            set.status = 'Bad Request'
            if (error instanceof Error)
                throw new Error(error.message)
            set.status = 500
            throw new Error("somethimg went wrong")
        }
    }, {
        detail: { summary: "Update Profile" },
        body: "updateProfile",
        // response: "user",
        isSignIn: true
    })