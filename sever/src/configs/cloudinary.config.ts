import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
    cloud_name:Bun.env.CLOUDINARY_NAME,
    api_key:Bun.env.CLOUDINARY_API_KEY,
    api_secert:Bun.env.CLOUDINARY_API_SECRET,
})
export const Cloudinary = cloudinary