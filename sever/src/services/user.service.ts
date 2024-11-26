import mongoose, { RootFilterQuery } from "mongoose"
import { updatedProfile, user, userPagination, userPaginator } from "../types/user.type"
import { IUserDocument } from "../interfaces/user.interface"
import { QueryHelper } from "../helper/query.helper"

export const userService = {
    get: function (pagination: userPagination, user_id: string): Promise<userPaginator> {
        let filter: RootFilterQuery<IUserDocument> = {
            _id: { $nin: new mongoose.Types.ObjectId(user_id) },
            $and: QueryHelper.parseUserQuery(pagination)
        }
        throw new Error('not implement')

    },
    getByUsername: function (username: string): Promise<user> {
        throw new Error('not implement')
    },
    updateProfile: function (newprofile: updatedProfile, user_id: string): Promise<user> {
        throw new Error('not implement')
    }
}