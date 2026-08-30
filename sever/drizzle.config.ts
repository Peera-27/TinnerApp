import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: Bun.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
})
