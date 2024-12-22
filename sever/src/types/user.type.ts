import Elysia, { t, Static } from "elysia"
import { _pagination, CreatePagination } from "./pagination.type"
import { _photo } from "./photo.type"
import { _register } from "./register.types"

export const _profile = t.Object({
    ...t.Omit(_register, ['password']).properties,
    id: t.String(),
    introduction: t.Optional(t.String()),
    interest: t.Optional(t.String()),
    location: t.Optional(t.String()),
    age: t.Optional(t.String()),
    last_active: t.Optional(t.Date()),
    create_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date()),
    //todo:implement image feature
    photos: t.Optional(t.Array(_photo))
})
export const _user = t.Object({
    ..._profile.properties,
    //todo:implement like feature
    followers: t.Optional(t.Array(t.Union([t.Partial(_profile), t.String()]))),
    following: t.Optional(t.Array(t.Union([t.Partial(_profile), t.String()]))),
})

const _userPagination = t.Object({
    ..._pagination.properties,
    username: t.Optional(t.String()),
    min_age: t.Optional(t.Number()),
    max_age: t.Optional(t.Number()),
    looking_for: t.Optional(t.Union([t.Literal('male'), t.Literal('female'), t.Literal('all')])),
    gender: t.Optional(t.Union([t.Literal('male'), t.Literal('female'), t.Literal('all')])),
})

export const _updateProfile = t.Omit(_profile, ['id', 'username', 'updated_at', 'create_at', 'last_active', 'age'])
export const _userPaginator = CreatePagination(_user, _userPagination)

export const UserDto = new Elysia().model({
    pagination: t.Optional(_userPagination),
    updateProfile: _updateProfile,
    users: _userPaginator,
    user: _user,
    target_id: t.Object({ target_id: t.String() })
})



export type updateProfile = Static<typeof _updateProfile>
export type userPaginatoin = Static<typeof _userPagination>
export type userPaginator = Static<typeof _userPaginator>
export type user = Static<typeof _user>