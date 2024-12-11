import mongoose, { Types } from "mongoose";
import { IphotoDocument, IPhotoModel } from "../interfaces/photo.interface";
import { Photo } from "../types/photo.type";

const schema = new mongoose.Schema<IphotoDocument,IPhotoModel>({
    user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    public_id:{type : String,required:true},
    url:{type : String,required:true},
    is_avatar:{type : Boolean,required:true,default:false},
},{
timestamps:{createdAt :'created_at'}
})
schema.methods.tophoto = function():Photo{
    return {
     id:this._id.tostring(),
     url:this.url,   
     public_id:this.public_id,   
     is_avatar:this.is_avatar,   
     created_at:this.created_at,   
    }
}
schema.statics.setAvatar = async function(photo_id : string , user_id:string):Promise<boolean>{
 await this.updateMany(
    {user:new mongoose.Types.ObjectId(user_id)},
    {$set:{is_avatarL:false}}
 )
const updatePhoto = await this.findByIdAndUpdate(
    photo_id,
    {$set:{is_avatar:true}}
)
    return !!updatePhoto
}
export const _Photo = mongoose.model<IphotoDocument,IPhotoModel>("Photo",schema)