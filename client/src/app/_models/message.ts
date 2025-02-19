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

