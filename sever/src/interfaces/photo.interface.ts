import mongoose from "mongoose"
import { photo } from "../types/photo.type"

type photoWithOutId = Omit<photo, 'id'>

export interface IPhotoDocument extends mongoose.Document, photoWithOutId {
    user: mongoose.Types.ObjectId
    create_at?: Date,
    toPhoto: () => photo


}

export interface IPhotoModel extends mongoose.Model<IPhotoDocument> {
    setAvatar: (photo_id: string, user_id: string) => Promise<boolean>
}