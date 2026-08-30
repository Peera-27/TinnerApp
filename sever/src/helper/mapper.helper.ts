import type { MessageRow, PhotoRow, UserRow } from "../db/schema"
import { message } from "../types/mesage.types"
import { photo } from "../types/photo.type"
import { user } from "../types/user.type"
import { calculateAge } from "./date.helper"
import { HubService } from "../services/hub.service"

/** Row shape accepted by `toUser`. Relations are optional: leave them out and the
 *  matching field is simply absent from the response, exactly like an unpopulated
 *  mongoose document was meant to behave. */
export type UserRowWithRelations = UserRow & {
    photos?: PhotoRow[]
    /** ids of users this user follows */
    following?: string[]
    /** ids of users following this user */
    followers?: string[]
}

export function toPhoto(row: PhotoRow): photo {
    return {
        id: row.id,
        url: row.url,
        public_id: row.public_id,
        is_avatar: row.is_avatar,
        create_at: row.created_at,
    }
}

export function toMessage(row: MessageRow): message {
    return {
        id: row.id,
        sender: row.sender_id,
        receiver: row.receiver_id,
        content: row.content,
        created_at: row.created_at,
        read_at: row.read_at ?? undefined,
        sender_delete: row.sender_delete,
        receiver_delete: row.receiver_delete,
    }
}

export function toUser(row: UserRowWithRelations): user {
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name ?? "",
        create_at: row.created_at,
        updated_at: row.updated_at,
        age: row.date_of_birth ? `${calculateAge(row.date_of_birth)}` : "N/A",
        last_active: row.last_active ?? undefined,
        // presence lives in memory, not in the row — every list that maps a user
        // through here gets the green dot for free
        is_online: HubService.isOnline(row.id),
        introduction: row.introduction ?? undefined,
        interest: row.interest ?? undefined,
        looking_for: (row.looking_for ?? "all") as user["looking_for"],
        location: row.location ?? undefined,
        gender: (row.gender ?? undefined) as user["gender"],

        photos: row.photos?.map(toPhoto),

        following: row.following,
        followers: row.followers,
    }
}

/**
 * The same user, plus the fields only its owner may see. Used by login,
 * register and the profile endpoints — never by a listing, which is what keeps
 * one person's email out of everybody else's member list.
 */
export function toSelfUser(row: UserRowWithRelations): user {
    return {
        ...toUser(row),
        email: row.email ?? undefined,
    }
}
