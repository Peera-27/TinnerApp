import Elysia, { error, t } from "elysia"
import { imagehelper } from "../helper/image.helper"
import { PhotoDto } from "../types/photo.type"
import { AuthMiddleware, AuthPaylode } from "../middlewares/auth.middleware"
import { PhotoService } from "../services/photo.service"


export const PhotoController = new Elysia({
    prefix: "api/photo",
    tags: ['Photo']
})
    .use(PhotoDto)
    .use(AuthMiddleware)
    .patch('/:photo_id', async ({ params: { photo_id }, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPaylode).id
            await PhotoService.setavatar(photo_id, user_id)
            set.status = "No Content"

        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("something Wrong")

        }
    }, {
        detail: { summary: "Set Avatar" },
        isSignIn: true,
        params: "photo_id"
    })
    .post('/', async ({ body: { file }, set, Auth }) => {

        const user_id = (Auth.payload as AuthPaylode).id
        try {
            return await PhotoService.upload(file, user_id)
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("something Wrong")

        }
    }, {
        detail: { summary: "Upload Photo" },
        body: "upload",
        response: "photo",
        isSignIn: true
    })

    .get('/', async ({ Auth }) => {
        const user_id = (Auth.payload as AuthPaylode).id
        return await PhotoService.getPhotos(user_id)
    }, {
        detail: { summary: "Get Photo[] by user_id" },
        isSignIn: true,
        response: "photos"
    })
    .delete('/:photo_id', async ({ params: { photo_id }, set }) => {
        try {
            await PhotoService.delete(photo_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("something Wrong")

        }
    }, {
        detail: {
            summary: "Delete photo by photo_id"
        },
        isSignIn: true,
        params: "photo_id"
    })