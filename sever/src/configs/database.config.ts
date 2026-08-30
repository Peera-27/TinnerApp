import { sql } from "../db"

export const postgres = {
    connect: async function () {
        try {
            await sql`select 1`
            console.log("------------- PostgreSQL Connected!!!!! -------------")
        } catch (error) {
            console.error("------------- PostgreSQL connect fail -------------")
            console.error(error)
        }
    },
    disconnect: async function () {
        await sql.close()
    },
}
