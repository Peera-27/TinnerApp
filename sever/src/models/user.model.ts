import mongoose from "mongoose"
import { calculateAge } from "../helper/date.helper"
import { IUserDocument, IUserModel } from "../interfaces/user.interface"
import { register } from "../types/account.types"
import { user } from "../types/user.type"
import { Photo } from "./photo.model"

const schema = new mongoose.Schema<IUserDocument, IUserModel>({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    display_name: { type: String },
    date_of_birth: { type: Date },
    last_active: { type: Date },
    introduction: { type: String },
    interest: { type: String },
    looking_for: { type: String },
    location: { type: String },
    gender: { type: String },

    // todo: implement photo feature
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    // todo: implement like feature
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
    timestamps: { createdAt: 'create_at', updatedAt: 'updated_at' }
})
schema.methods.toUser = function (): user {
    let ageString = 'N/A'
    if (this.date_of_birth)
        ageString = `${calculateAge(this.date_of_birth)}`




    const userPhotos = Array.isArray(this.photos)
        ? this.photos.map(photo => (new Photo(photo)).toPhoto())
        : undefined

    const parseLikeUser = (user: IUserDocument[]) => {
        return user.map(u => {
            if (u.display_name)
                return u.toUser()
            return u._id!.toString()
        })
    }
    const following = Array.isArray(this.following)
        ? parseLikeUser(this.following)
        : undefined
    const followers = Array.isArray(this.followers)
        ? parseLikeUser(this.followers)
        : undefined

    return {
        id: this._id.toString(),
        display_name: this.display_name,
        username: this.username,
        create_at: this.create_at,
        updated_at: this.updated_at,
        // date_of_birth: this.date_of_birth,
        age: ageString,
        last_active: this.last_active,
        introduction: this.introduction,
        interest: this.interest,
        looking_for: this.looking_for ?? 'all',
        location: this.location,
        gender: this.gender,

        photos: userPhotos,

        following: following,
        followers: followers,
    }
}
schema.methods.verifyPassword = async function (password: string): Promise<boolean> {
    return await Bun.password.verify(password, this.password_hash)
}

schema.statics.createUser = async function (registerData: register): Promise<IUserDocument> {
    const newUser = await new this({
        display_name: registerData.display_name,
        username: registerData.username,
        password_hash: await Bun.password.hash(registerData.password),
        date_of_birth: registerData.date_of_birth,
        looking_for: registerData.looking_for,
        gender: registerData.gender,
    })
    await newUser.save()
    return newUser
}
export const User = mongoose.model<IUserDocument, IUserModel>("User", schema)