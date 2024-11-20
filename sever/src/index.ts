import { Elysia, t } from "elysia"
import { example } from "./controllers/example.controller"
import { swaggerconfig } from "./configs/swagger.config"
import { tlsConfig } from "./configs/tls.config"
import cors from "@elysiajs/cors"
import { MonggoDB } from "./configs/database.config"
import jwt from "@elysiajs/jwt"
import { jwtconfig } from "./configs/jwt.config"
import { AccountController } from "./controllers/account.controller"

MonggoDB.connect()

const app = new Elysia()
  .use(cors())
  .use(jwtconfig)
  .use(swaggerconfig)
  // .use(example)
  .use(AccountController)
  .listen({
    port: Bun.env.PORT || 8000,
    tls: tlsConfig
  })

let protocol = 'http'
if ('cert' in tlsConfig)
  protocol = 'https'
console.log(`🦊 Elysia is running at ${protocol}://${app.server?.hostname}:${app.server?.port}`)
