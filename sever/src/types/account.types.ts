import { password } from "bun"
import { profile } from "bun:jsc"
import Elysia, { Static, t } from "elysia"

export const _login = t.Object({
    username: t.String(),
    password: t.String()
})

export const _register = t.Object({
    username: t.String(),
    password: t.String(),
    display_name: t.String(),
    date_of_birth: t.Optional(t.Date()),
    looking_for: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('all')])

})

export const _profile = t.Object({
    ...t.Omit(_register, ['password']).properties,
    id: t.String(),
    introduction: t.Optional(t.String()),
    interest: t.Optional(t.String()),
    location: t.Optional(t.String()),
    age: t.Optional(t.String()),
    last_active: t.Optional(t.Date()),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date()),

    //photo : photo_id[]
})

export const _user = t.Object({
    ..._profile.properties,

    //follewers:_profile[]
    //follewing:_profile[]
})

export const _account = t.Object({
    user: _user,
    token: t.String()
})

export const AccountDto = new Elysia().model({
    register: _register,
    login: _login,

    account: _account
})

export type user = Static<typeof _user>
export type register = Static<typeof _register>
export type login = Static<typeof _login>