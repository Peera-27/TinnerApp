import { and, eq, ne } from "drizzle-orm"
import { Cloudinary } from "../configs/cloudinary.config"
import { db } from "../db"
import { photos } from "../db/schema"
import { isUuid } from "../helper/id.helper"
import { ImageHelper } from "../helper/image.helper"
import { toPhoto } from "../helper/mapper.helper"
import { photo } from "../types/photo.type"

export const PhotoService = {
    upload: async function (file: File, user_id: string): Promise<photo> {
        const buffer = await file.arrayBuffer()
        const isFileValid = await ImageHelper.isImage(buffer)
        if (!isFileValid)
            throw new Error("Image must be .jpeg or .png")

        const base64 = Buffer.from(buffer).toString("base64")
        const dataURI = `data:${file.type};base64,${base64}`
        const cloudPhoto = await Cloudinary.uploader.upload(dataURI, {
            folder: "class-example-user-images",
            resource_type: "auto",
            transformation: [{
                width: 500,
                height: 500,
                crop: "fill",
                gravity: "face",
            }],
        })

        if (!cloudPhoto.public_id || !cloudPhoto.url)
            throw new Error("Something went wrong , try again later!!!")

        // the photo row carries user_id now, so there is no second write to keep
        // a `photos` array on the user in sync
        const [uploaded] = await db.insert(photos).values({
            user_id,
            url: cloudPhoto.secure_url,
            public_id: cloudPhoto.public_id,
        }).returning()

        return toPhoto(uploaded)
    },

    getPhotos: async function (user_id: string): Promise<photo[]> {
        const rows = await db.select().from(photos).where(eq(photos.user_id, user_id))
        return rows.map(toPhoto)
    },

    delete: async function (photo_id: string, user_id: string): Promise<boolean> {
        if (!isUuid(photo_id))
            throw new Error(`photo ${photo_id} not existing`)

        // scoped to the caller so one user cannot delete another user's photo
        const [deleted] = await db.delete(photos)
            .where(and(eq(photos.id, photo_id), eq(photos.user_id, user_id)))
            .returning()

        if (!deleted)
            throw new Error(`photo ${photo_id} not existing`)

        await Cloudinary.uploader.destroy(deleted.public_id)
        return true
    },

    setAvatar: async function (photo_id: string, user_id: string): Promise<boolean> {
        if (!isUuid(photo_id))
            throw new Error("Set Avatar Failed !!")

        // both writes land together: the old avatar is never cleared unless the
        // new one is actually set
        return db.transaction(async (tx) => {
            const [promoted] = await tx.update(photos)
                .set({ is_avatar: true })
                .where(and(eq(photos.id, photo_id), eq(photos.user_id, user_id)))
                .returning()

            // nothing was written when the photo is not the caller's, so no rollback needed
            if (!promoted)
                return false

            await tx.update(photos)
                .set({ is_avatar: false })
                .where(and(eq(photos.user_id, user_id), ne(photos.id, photo_id)))

            return true
        })
    },
}
