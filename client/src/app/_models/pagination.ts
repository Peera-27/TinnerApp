export interface QueryPagination {
    pageSize?: number,
    currentPage?: number,
    length?: number,
}
export interface UserQueryPagination extends QueryPagination {
    username?: string
    min_age?: number
    max_age?: number
    looking_for?: string
    gender?: string
    location?: string
    interest?: string
}
export interface Paginator<T, U> {
    pagination: T,
    items: U[]
}
export const default_pageSizeOption = [12, 24, 48, 96]

/**
 * Every list (members, followers, following) needs its OWN paginator object —
 * sharing one const meant a page-size change on one screen silently changed the
 * others, because the pagination object was mutated in place.
 */
export function createPaginator<T extends QueryPagination, U>(): Paginator<T, U> {
    return {
        pagination: {
            pageSize: 12,
            currentPage: 1,
            length: 0,
        } as T,
        items: []
    }
}

/** @deprecated use {@link createPaginator} — this const is shared by reference. */
export const default_paginator = createPaginator<UserQueryPagination, never>()
