import { User } from "./user"

/** Something that happened while you were not looking. */
export interface Notification {
    id: string
    /** 'like' | 'match' | 'message' — a plain string so the server can add more. */
    type: string
    /** the person who caused it */
    actor: User
    message_id?: string
    read_at?: Date
    created_at: Date
}
