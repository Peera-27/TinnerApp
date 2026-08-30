import { Message, Thread } from "../_models/message"
import { Paginator, QueryPagination, UserQueryPagination } from "../_models/pagination"
import { User } from "../_models/user"
import { pareUserPhoto } from "./helper"


const data = new Map()
type cacheOpt = 'member' | 'chat' | 'follower' | 'following' | 'match' | 'thread'
type cacheValue = Paginator<UserQueryPagination, User> | Paginator<QueryPagination, User> | Paginator<QueryPagination, Message> | Paginator<QueryPagination, Thread>
export const cacheManager = {

    createKey: function <T extends { [key: string]: any }>(query: T) {
        return Object.values(query).join('-')
    },

    load: function (key: string, opt: cacheOpt): cacheValue | undefined {
        const _data = data.get(opt + key)
        if (_data)
            if (opt === 'chat')
                return _data as Paginator<QueryPagination, User>
            else if (opt === 'thread')
                return _data as Paginator<QueryPagination, Thread>
            else
                return _data as Paginator<UserQueryPagination, User>
        return undefined
    },

    save: function (key: string, value: cacheValue, opt: cacheOpt) {
        // 'chat' holds messages, not users — only user lists need their avatar
        // and photo-of-the-day resolved before they are handed to a card. A
        // thread carries its user one level down.
        if (opt === 'thread')
            value.items = (value.items as Thread[]).map(t => ({ ...t, user: pareUserPhoto(t.user) }))
        else if (opt !== 'chat')
            value.items = value.items.map(u => pareUserPhoto(u as User))

        data.set(opt + key, value)
    },


    clear: function (opt: cacheOpt | 'all') {
        if (opt === 'all')
            data.clear()
        else
            for (const key of data.keys()) {
                if (key.startsWith(opt))
                    data.delete(key)
            }
    },


}
