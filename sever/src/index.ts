import { Elysia, t } from "elysia"
import { example } from "./controllers/example.controller"
import { swaggerconfig } from "./configs/swagger.config"
import { tlsConfig } from "./configs/tls.config"
import cors from "@elysiajs/cors"
import jwt from "@elysiajs/jwt"
import { jwtconfig } from "./configs/jwt.config"
import { AccountController } from "./controllers/account.controller"
import Database from "bun:sqlite"
import { mongodb } from "./configs/database.config"
import { UserController } from "./controllers/user.controller"
import staticPlugin from "@elysiajs/static"
import { PhothoController } from "./controllers/photo.controller"

mongodb.connect()

const app = new Elysia()
  .use(staticPlugin({
    assets: "public/uploads",
    prefix: "img"
  }))
  .use(PhothoController)
  .use(cors())
  .use(jwtconfig)
  .use(swaggerconfig)
  .use(example)
  .use(AccountController)
  .use(UserController)
  .listen({
    port: Bun.env.PORT || 8000,
    tls: tlsConfig
  })

let protocol = 'http'
if ('cert' in tlsConfig)
  protocol = 'https'
console.log(`🦊 Elysia is running at ${protocol}://${app.server?.hostname}:${app.server?.port}`)
