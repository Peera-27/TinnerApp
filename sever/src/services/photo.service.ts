import mongoose from "mongoose"
import { Cloudinary } from "../configs/cloudinary.config"
import { imagehelper } from "../helper/image.helper"

import { User } from "../models/user.model"
import { photo } from "../types/photo.type"
import { _Photo } from "../models/photo.model"
import { formatDiagnosticsWithColorAndContext } from "typescript"

export const PhotoService = {
    upload: async function (file: File, user_id: string): Promise<photo> {
        const buffer = await file.arrayBuffer()
        const isFileValid = imagehelper.isimage(buffer)
        if (!isFileValid)
            throw new Error("image must be jpg or png")
        const base64 = Buffer.from(buffer).toString('base64')
        const dataURI = `data:${file.type};base64;${base64}`
        const cloudPhoto = await Cloudinary.uploader.upload(dataURI, {
            folder: 'class-example-user-image',
            resource_type: 'auto',
            transformation: [{
                width: 500,
                height: 500,
                crop: 'fill',
                gravity: 'face'
            }]

        })
        if (!cloudPhoto.public_id || !cloudPhoto.secure_url)

            throw new Error("some went wrong")
        const uploadphoto = new _Photo({
            user: new mongoose.Types.ObjectId(user_id),
            url: cloudPhoto.secure_url,
            public_id: cloudPhoto.public_id
        })
        await uploadphoto.save()
        await User.findByIdAndUpdate(
            user_id,
            { $push: { photos: uploadphoto._id } }
        )
        return uploadphoto.toPhoto()
    },

    getPhotos: async function (user_id: string): Promise<photo[]> {
        const photoDocs = await _Photo.find({ user: user_id }).exec()
        return photoDocs.map(doc => doc.toPhoto())
    },

    delete: async function (photo_id: string): Promise<boolean> {
        const doc = await _Photo.findById(photo_id).exec()
        if (!doc)
            throw new Error(`photo ${photo_id} not existing`)
        await User.findByIdAndUpdate(doc.user, {
            $pull: { photos: photo_id }
        })
        await _Photo.findByIdAndDelete(photo_id)
        await Cloudinary.uploader.destroy(doc.public_id)
        return true

    },

    setavatar: async function (photo_id: string, user_id: string): Promise<boolean> {
        await _Photo.updateMany(
            { user: new mongoose.Types.ObjectId(user_id) },
            { $set: { is_avatar: false } }
        )
        const result = await _Photo.findByIdAndUpdate(photo_id,
            { $set: { is_avatar: true } },
            { new: true }
        )

        return !!result

    },


}