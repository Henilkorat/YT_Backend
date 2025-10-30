 import dotenv from "dotenv";
dotenv.config({ path: "./.env" }); // 👈 Add this

 
 import { v2 as cloudinary } from 'cloudinary';
    import fs from 'fs';
 
 // Configuration
    cloudinary.config({ 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        fs.unlinkSync(localFilePath); // remove local file after upload
        return response
        
    } catch (error) {
        fs.unlinkSync(localFilePath);
          console.error("Cloudinary upload failed:", error);
    return null;
        
    }
}

export { uploadOnCloudinary };