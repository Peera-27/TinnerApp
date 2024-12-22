import Elysia, { t, Static } from "elysia"

export const _photo = t.Object({
    id: t.Optional(t.String()),
    url: t.String(),
    is_avatar: t.Optional(t.Boolean()),
    create_at: t.Optional(t.Date()),
    public_id: t.String()
})

export const _uploadPhoto = t.Object({
    file: t.File({
        type: ['image/jpeg', 'image/png'],
        maxSize: '1m',
        error: 'image must be jpeg or png'
    })
})
export type photo = Static<typeof _photo>
export const PhotoDto = new Elysia().model({
    upload: _uploadPhoto,
    photo_id: t.Object({ photo_id: t.String() }),

    photo: _photo,
    photos: t.Array(_photo)
})