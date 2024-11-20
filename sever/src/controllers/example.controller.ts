import Elysia, { t } from "elysia"

export const example = new Elysia()
    .get("/home", () => "Wowww", {
        detail: {
            tags: ["Example"],
            summary: "Get Hello Elysia",
            description: "i am Elysia"
        }
    })
    .post("/about", ({ body }) => {
        return {
            id: 'wasa',
            msg: 'nuania ' + body.name
        }
    }, {
        body: t.Object({
            name: t.String()
        }),
        detail: {
            tags: ["Example"],
            summary: "About",
            description: "i am About"
        }
    }
    )
