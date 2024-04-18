import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_CLOUD_KEY,
  api_secret: CLOUDINARY_CLOUD_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("file is uploaded on cloudinary", response.url);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // to remove locally saved temporary file as the upload failed so that the server wont filled with junk file(unnessary files)

    return null;
  }
};

export { uploadOnCloudinary };
