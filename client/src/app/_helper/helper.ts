import { QueryPagination, UserQueryPagination } from "../_models/pagination"
import { User } from "../_models/user"

const defaultAvatar = '/assets/DefaultAvatar.png'
const defaultImage = '/assets/DefaultImage.png'
function getAvatar(user: User): string {
    if (user.photos) {
        const avatar = user.photos.find(p => p.is_avatar === true)
        if (avatar)
            return avatar.url
    }
    return defaultAvatar
}
function getPhotoOfTheDay(user: User): string {
    if (user.photos && user.photos.length > 0) {
        const index = Math.floor(Math.random() * user.photos.length)
        return user.photos[index].url
    }
    return defaultImage
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
    if ('min_age' in query && query.min_age) {
        querystring += `&min_age=${query.min_age}`

    }
    if ('max_age' in query && query.max_age) {
        querystring += `&max_age=${query.max_age}`

    }
    return querystring
}