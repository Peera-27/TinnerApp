import Elysia, { error, t } from "elysia"
import { imagehelper } from "../helper/image.helper"
import { PhotoDto } from "../types/photo.type"
import { AuthMiddleware, AuthPaylode } from "../middlewares/auth.middleware"
import { PhotoService } from "../services/photo.service"
export const PhothoController = new Elysia({
    prefix: "api/photo",
    tags: ['Photo']
})
.use(PhotoDto)
.use(AuthMiddleware)

    .post('/', async ({ body: { file },set ,Auth}) => {
        const user_id = (Auth.payload as AuthPaylode).id
        try {
            return await PhotoService.upload(file,user_id)
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error) 
                throw error
                throw new Error("something Wrong")
            
        }
    }, {
        detail: { summary: "Upload Photo" },
        body: "upload",
        response:"phot",
        isSignIn:true
    })