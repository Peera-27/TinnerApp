# syntax=docker/dockerfile:1

# ---------- 1. build the Angular client ----------
# Bun runs the Angular CLI's build fine (only `ng serve` trips over its
# incomplete node:http2), so both stages share one base image.
FROM oven/bun:1 AS client
WORKDIR /client
COPY client/package.json client/bun.lockb ./
RUN bun install --frozen-lockfile
COPY client/ ./
RUN bun node_modules/@angular/cli/bin/ng.js build --configuration production

# ---------- 2. runtime: API + the client build, one origin ----------
FROM oven/bun:1 AS runtime
WORKDIR /app

# devDependencies are kept: drizzle-kit and pg are what run the migrations
COPY sever/package.json sever/bun.lockb ./
RUN bun install --frozen-lockfile

COPY sever/ ./
COPY --from=client /client/dist/client/browser ./public/app

ENV CLIENT_DIST=/app/public/app
# MODE is deliberately unset -> tls.config skips the local certs and the
# platform terminates TLS in front of this process
EXPOSE 8000

# migrations run before the server accepts traffic; a failure here stops the
# deploy instead of booting against an out-of-date schema
CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]
