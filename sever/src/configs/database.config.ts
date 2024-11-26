import { connect } from "bun"
import mongoose from "mongoose"

const username = Bun.env.MONGO_USERNAME || 'your-mongo-name'
const password = Bun.env.MONGO_PASSWORD || 'your-mongo-password'
const db_name = Bun.env.MONGGO_DBNAME || 'tinner_app'

const uri = `mongodb+srv://${username}:${password}@cluster0.5joiu.mongodb.net/?retryWrites=true&w=majority&appName=${db_name}`


export const mongodb = {
    connect: async function () {
        try {
            await mongoose.connect(uri)
            console.log("------------- mongoDB Connected!!!!! -------------")
        } catch (error) {
            console.error("------------- mongoDB connected fail -------------")
            console.error(error)

        }
    }
}