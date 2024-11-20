import { connect } from "bun"
import mongoose from "mongoose"

const username = Bun.env.MONGGO_DB_USERNAME || 'your-username'
const password = Bun.env.MONGGO_DB_PASSWORD || 'your-password'
const db_name = Bun.env.MONGGO_DBNAME || 'tinner_app'
const uri = `mongodb+srv://${username}:${password}@cluster0.5joiu.mongodb.net/?retryWrites=true&w=majority&appName=${db_name}`

export const MonggoDB = {
    connect: async () => {
        try {
            await mongoose.connect(uri)
            console.log("===============MonggoDB Conneted!!!!============")
        } catch (error) {
            console.error("==========MonggoDB Connect Fail===========")
            console.error(error)
        }
    }
}