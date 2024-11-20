import jwt from "@elysiajs/jwt"

export const jwtconfig = jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET || 'Ifeellikesosigma',
    exp: '1d'

}
)