import { fileTypeFromBuffer } from 'file-type'

const acceptImageTypes = ['image/jpeg', 'image/png']

export const ImageHelper = {
    isImage: async function (fileArrayBuffer: ArrayBuffer): Promise<boolean> {
        // const buffer = await file.arrayBuffer()

        const fileTypeResult = await fileTypeFromBuffer(fileArrayBuffer)
        if (fileTypeResult === undefined)
            return false
        return acceptImageTypes.includes(fileTypeResult.mime)
    }
}