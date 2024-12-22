import Elysia, { t } from "elysia"

export const example = new Elysia()
    .get("/home", () => "Wowwww", {
        detail: {
            tags: ["Example"],
            summary: "Get helloworld",
            description: "Bra bra bra"
        }
    })
    .post("/about", ({ body }) => {
        return {
            id: 'xxx',
            msg: 'hello' + body.name
        }
    }, {
        body: t.Object({
            name: t.String(),
        }),
        detail: {
            tags: ["Example"],
            summary: "About",
            description: "Numbertwo"
        }
    })