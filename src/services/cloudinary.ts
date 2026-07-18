import cloudinary from "../config/cloudinary";

export const uploadBufferToCloudinary = (fileBuffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `aurum_jewelry/${folder}`,
        resource_type: "image",
        quality: "auto:good",
        fetch_format: "auto"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteImageFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extracts public_id from a typical Cloudinary URL:
    // http://res.cloudinary.com/cloud-name/image/upload/v1234567/aurum_jewelry/folder/image-name.jpg -> aurum_jewelry/folder/image-name
    const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
    const match = imageUrl.match(regex);
    if (match && match[1]) {
      await cloudinary.uploader.destroy(match[1]);
      console.log(`Cloudinary image deleted: ${match[1]}`);
    }
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error);
  }
};
