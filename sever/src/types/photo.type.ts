import Elysia, { t, Static } from "elysia"

export const _photo = t.Object({
    id: t.Optional(t.String()),
    url: t.String(),
    is_avatar: t.Optional(t.Boolean()),
    create_at: t.Optional(t.Date()),
    public_id: t.String()
})

// the same ceiling the upload dialog enforces before it ever posts. The two
// have to agree: a smaller limit here rejects a file the client already
// accepted, and that arrives as a 422 the user can do nothing about
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const _uploadPhoto = t.Object({
    file: t.File({
        type: ['image/jpeg', 'image/png'],
        maxSize: MAX_PHOTO_BYTES,
        // one message covers both the type and the size check, so it has to
        // name both — "jpeg or png" alone sent people hunting a format problem
        // when the file was simply too big
        error: 'image must be a JPG or PNG no larger than 5 MB'
    })
})
export type photo = Static<typeof _photo>
export const PhotoDto = new Elysia().model({
    upload: _uploadPhoto,
    photo_id: t.Object({ photo_id: t.String() }),

    photo: _photo,
    photos: t.Array(_photo)
})