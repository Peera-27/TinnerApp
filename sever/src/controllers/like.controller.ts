import Elysia, { t } from "elysia"
import { AuthMiddleware, AuthPaylode } from "../middlewares/auth.middleware"
import { UserDto } from "../types/user.type"
import { PhotoDto } from "../types/photo.type"
import { LikeService } from "../services/like.service"

export const likeController = new Elysia({
    prefix: "api/like",
    tags: ['like']
})
    .use(AuthMiddleware)
    .use(UserDto)
    .use(PhotoDto)
    .put('/', async ({ body: { target_id }, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPaylode).id
            await LikeService.togglelke(user_id, target_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            throw error
        }
    }, {
        detail: { summary: "toggle like" },
        isSignIn: true,
        body: "target_id"
    })