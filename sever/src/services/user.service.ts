import mongoose, { RootFilterQuery } from "mongoose"
import { QueryHelper } from "../helper/query.helper"
import { IUserDocument } from "../interfaces/user.interface"
import { User } from "../models/user.model"
import { userPaginatoin, userPaginator, updateProfile, user } from "../types/user.type"

export const UserService = {
    get: async function (pagintion: userPaginatoin, user_id: string): Promise<userPaginator> {
        let filter: RootFilterQuery<IUserDocument> = {
            _id: { $nin: new mongoose.Types.ObjectId(user_id) },
            $and: QueryHelper.parseUserQuery(pagintion)
        }
        //to be continiue,
        const query = User.find(filter).sort({ last_active: -1 })
        const skip = pagintion.pageSize * (pagintion.currentPage - 1)
        query.skip(skip).limit(pagintion.pageSize)
            .populate("photos")

        // const docs = await query.exec()
        // const total = await User.countDocuments(filter).exec()

        const [docs, total] = await Promise.all([
            query.exec(),
            User.countDocuments(filter).exec()
        ])

        pagintion.length = total
        return {
            pagination: pagintion,
            items: docs.map(doc => doc.toUser())
        }
    },

    getByuserName: async function (username: string): Promise<user> {
        const user = await User.findOne({ username }).populate("photos").exec()
        if (user)
            return user.toUser()
        throw new Error(`"Username: "${username}"not found!!!`)


    },
    updateProfile: async function (newProfile: updateProfile, user_id: string): Promise<user> {
        const user = await User.findByIdAndUpdate(user_id, { $set: newProfile }, { new: true, runValidators: true })
        if (user)
            return user.toUser()
        throw new Error('Something went wrong , try again later')
    }
}