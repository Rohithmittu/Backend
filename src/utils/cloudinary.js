import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("file is uploaded on cloudinary", response.url);

    // fs.unlinkSync(localFilePath);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // fs.unlinkSync(localFilePath); // to remove locally saved temporary file as the upload failed so that the server wont filled with junk file(unnessary files)

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

const deleteImageFromCloudinary = async (oldAvatar) => {
  try {
    const publicId = oldAvatar.split(".")[2].split("/").slice(5).join("/");

    // console.log(publicId);

    const response = await cloudinary.uploader.destroy(publicId);

    // console.log("deleted",response);

    return response.result;
  } catch (error) {
    return error;
  }
};



export { uploadOnCloudinary, deleteImageFromCloudinary };
