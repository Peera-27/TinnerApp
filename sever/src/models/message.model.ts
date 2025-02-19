import mongoose from "mongoose"
import { Imessagedocument, ImessageModel } from "../interfaces/message.interface"
import { message } from "../types/mesage.types"

const schema = new mongoose.Schema<Imessagedocument, ImessageModel>({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    read_at: { type: Date },
    sender_delete: { type: Boolean },
    receiver_delete: { type: Boolean }

}, {
    timestamps: { createdAt: 'created_at' }
})
schema.methods.toMessage = function (): message {
    return {
        id: this._id.toString(),
        sender: this.sender.toString(),
        receiver: this.receiver.toString(),
        content: this.content,
        created_at: this.created_at,
        read_at: this.read_at,
        sender_delete: this.sender_delete,
        receiver_delete: this.receiver_delete,
    }
}

schema.index({ sender: 1, receiver: 1, created_at: 1 })
schema.index({ receiver: 1, sender: 1, read_at: 1 })

export const Message = mongoose.model<Imessagedocument, ImessageModel>("Message", schema)