const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (fileStr, folderName = 'smartsplit_avatars') => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: folderName,
      resource_type: 'auto'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('Failed to upload image to cloud');
  }
};

module.exports = { uploadToCloudinary };
