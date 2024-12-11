import { fileTypeFromBlob, fileTypeFromBuffer } from "file-type";

const acceptImagTpye = ['image/jpeg','image/png']

export const imagehelper = {
    isimage :async function(fileArayBuffer : ArrayBuffer): Promise<boolean>{
// const buffer = await fileArayBuffer.arrayBuffer()
const fileTypeResult = await fileTypeFromBuffer(fileArayBuffer)
if (fileTypeResult === undefined)
        return false
    return acceptImagTpye.includes(fileTypeResult.mime)
    }
}