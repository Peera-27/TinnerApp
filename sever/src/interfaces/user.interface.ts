import mongoose from "mongoose"
import { register } from "../types/account.types"
import { user } from "../types/user.type"

type userWithout_id = Omit<user, 'id'>

export interface IUserDocument extends mongoose.Document, userWithout_id {
    password_hash: string
    verifyPassword: (password: string) => Promise<boolean>
    toUser: () => user
}
export interface IUsermodel extends mongoose.Model<IUserDocument> {
    createUser: (registerData: register) => Promise<IUserDocument>
}