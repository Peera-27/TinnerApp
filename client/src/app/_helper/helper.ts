import { QueryPagination, UserQueryPagination } from "../_models/pagination"
import { User } from "../_models/user"

// Single source of truth for the placeholder art — imported anywhere a photo
// or avatar can be missing, so the paths never drift apart again.
export const DEFAULT_AVATAR = '/assets/default-avatar.svg'
export const DEFAULT_PHOTO = '/assets/default-photo.svg'

/** Which photo the avatar renders from. Exported so setting or deleting a
 *  photo can refresh `user.avatar` without re-rolling `photoOfTheDay`. */
export function getAvatar(user: User): string {
    if (user.photos) {
        const avatar = user.photos.find(p => p.is_avatar === true)
        if (avatar)
            return avatar.url
    }
    return DEFAULT_AVATAR
}
function getPhotoOfTheDay(user: User): string {
    if (user.photos && user.photos.length > 0) {
        const index = Math.floor(Math.random() * user.photos.length)
        return user.photos[index].url
    }
    return DEFAULT_PHOTO
}

export function pareUserPhoto(user: User): User {
    user.avatar = getAvatar(user)
    user.photoOfTheDay = getPhotoOfTheDay(user)
    return user
}
export function pareQuery(query: QueryPagination | UserQueryPagination): string {
    let querystring = '?'
    if (query.pageSize)
        querystring += `&pageSize=${query.pageSize}`
    if (query.currentPage)
        querystring += `&currentPage=${query.currentPage}`

    if ('username' in query && query.username) {
        querystring += `&username=${query.username}`

    }
    if ('looking_for' in query && query.looking_for) {
        querystring += `&looking_for=${query.looking_for}`

    }
    if ('gender' in query && query.gender) {
        querystring += `&gender=${query.gender}`

    }
    if ('min_age' in query && query.min_age) {
        querystring += `&min_age=${query.min_age}`

    }
    if ('max_age' in query && query.max_age) {
        querystring += `&max_age=${query.max_age}`

    }
    if ('location' in query && query.location) {
        querystring += `&location=${encodeURIComponent(query.location)}`

    }
    if ('interest' in query && query.interest) {
        querystring += `&interest=${encodeURIComponent(query.interest)}`

    }
    return querystring
}

/** Short relative time for chat lists: "now", "5m", "3h", "2d", then a date. */
export function timeAgo(value?: Date | string): string {
    if (!value) return ''
    const then = new Date(value).getTime()
    if (Number.isNaN(then)) return ''

    const seconds = Math.floor((Date.now() - then) / 1000)
    if (seconds < 60) return 'now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`

    return new Date(value).toLocaleDateString()
}

/**
 * Angular leaves an untouched control as `null`, but the API's optional fields
 * are `t.Optional(...)` — they accept a value or no key at all, and reject
 * `null` with a 422. Dropping the empties turns "the user skipped this" into
 * "absent", which is what the server actually expects.
 *
 * `dropBlank` also treats '' as absent. Use it for register, where a blank
 * email would otherwise be stored as an empty string — and `email` is uniquely
 * indexed, so the second blank one would collide. Leave it off for profile
 * edits, where '' is how someone clears a field they had filled in before.
 */
export function compact<T extends object>(body: T, dropBlank = false): Partial<T> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
        if (value === null || value === undefined) continue
        if (dropBlank && value === '') continue
        out[key] = value
    }
    return out as Partial<T>
}
