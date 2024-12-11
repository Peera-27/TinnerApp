import mongoose from "mongoose";
import { Photo } from "../types/photo.type";

type photoWithOutId = Omit<Photo,'id'>
export interface IphotoDocument extends mongoose.Document,photoWithOutId{
user:mongoose.Types.ObjectId,
created_at?:Date,
toPhoto:()=>Photo
}
export interface IPhotoModel extends mongoose.Model<IphotoDocument>{
    setAvatar:(photo_id : string , user_id:string)=>Promise<boolean>
}