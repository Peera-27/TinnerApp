import jwt from "@elysiajs/jwt"

export const jwtConfig = jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET || 'dssdsdsddsdshghghg',
    exp: '1d'
})