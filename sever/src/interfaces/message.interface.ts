import mongoose from "mongoose"
import { message } from "../types/mesage.types"

type messagewithoutID = Omit<message, 'id' | 'sender' | 'receiver'>

export interface Imessagedocument extends mongoose.Document, messagewithoutID {
    sender: mongoose.Types.ObjectId
    receiver: mongoose.Types.ObjectId
    created_at?: Date
    toMessage: () => message
}

export interface ImessageModel extends mongoose.Model<Imessagedocument> { }