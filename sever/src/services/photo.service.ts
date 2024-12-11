import mongoose from "mongoose";
import { Cloudinary } from "../configs/cloudinary.config";
import { imagehelper } from "../helper/image.helper";
import { _Photo } from "../models/photo.model";
import { Photo } from "../types/photo.type";
import { User } from "../models/user.model";

export const PhotoService = {
    upload:async function(file :File,user_id:string):Promise<Photo> {
 const buffer = await file.arrayBuffer()
const isFileValid = imagehelper.isimage(buffer)
if (!isFileValid) 
    throw new Error("image must be jpg or png")
const base64 = Buffer.from(buffer).toString('base64')
const dataURI = `data:${file.type};base64;${base64}`
const cloudPhoto = await Cloudinary.uploader.upload(dataURI,{
    folder :'class-example-user-image',
    resource_type:'auto',
    transformation:[{
        width:500,
        height:500,
        crop:'fill',
        gravity:'face'
    }]

})
if (!cloudPhoto.public_id || !cloudPhoto.secure_url) 

        throw new Error("some went wrong")
        const uploadphoto = new _Photo({
            user:new mongoose.Types.ObjectId(user_id),
            url:cloudPhoto.secure_url,
            public_id:cloudPhoto.public_id
        })
        await uploadphoto.save()
        await User.findByIdAndUpdate(
            user_id,
        {$push:{photos:uploadphoto._id}}
        )
        return uploadphoto.toPhoto()
     },
   
    get:async function(user_id:string):Promise<Photo[]> {
        throw new Error("not implement")
     },
   
    delete:async function(photo_id:string):Promise<boolean> {
        throw new Error("not implement")
     },
   
    setavatar:async function(photo_id:string,user_id:string):Promise<boolean> {
        throw new Error("not implement")
     },
   
   
}