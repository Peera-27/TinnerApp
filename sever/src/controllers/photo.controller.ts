import Elysia from "elysia"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { PhotoService } from "../services/photo.service"
import { PhotoDto } from "../types/photo.type"

export const PhotoController = new Elysia({
    prefix: "api/photo",
    tags: ['Photo']
})
    .use(PhotoDto)
    .use(AuthMiddleWare)

    .patch('/:photo_id', async ({ params: { photo_id }, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPayload).id
            await PhotoService.setAvatar(photo_id, user_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("Set Avatar Failed !!")
        }
    }, {
        detail: { summary: "Set Avatar" },
        isSignIn: true,
        params: "photo_id"
    })



    .delete('/:photo_id', async ({ params: { photo_id }, set }) => {
        try {
            await PhotoService.delete(photo_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("Delete Photo Failed !!")
        }
    }, {
        detail: { summary: "Delete Photo by photo_id" },
        isSignIn: true,
        params: "photo_id"
    })

    .get('/', async ({ Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        return await PhotoService.getPhotos(user_id)
    }, {
        detail: { summary: "Get Photo[] by user_id" },
        isSignIn: true,
        response: "photos"
    })

    .post('/', async ({ body: { file }, set, Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        try {
            return await PhotoService.upload(file, user_id)
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw error
            throw new Error("Something went wrong , try again later!!")
        }



    }, {
        detail: { summary: "Upload Photo" },
        body: "upload",
        response: "photo",
        isSignIn: true
    })