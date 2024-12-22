import Elysia from "elysia"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { LikeService } from "../services/like.service"
import { UserDto } from "../types/user.type"

export const LikeController = new Elysia({
    prefix: "api/like",
    tags: ['Like']
})
    .use(AuthMiddleWare)
    .use(UserDto)


    .put('/', async ({ body: { target_id }, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPayload).id
            await LikeService.toggleLike(user_id, target_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            throw error
        }
    }, {
        detail: { summary: "Toggle Like" },
        isSignIn: true,
        body: "target_id"
    })