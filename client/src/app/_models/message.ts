import { User } from "./user"

export interface Message {
    id?: string
    created_at?: Date
    read_at?: Date
    sender_delete?: boolean
    receiver_delete?: boolean
    sender?: string
    receiver?: string
    content?: string
}

/** One row of the inbox: who the conversation is with, its newest message and
 *  how many of their messages are still unread. */
export interface Thread {
    user: User
    last_message: Message
    unread: number
}
