const cloudinary = require('cloudinary').v2;
const { cleanEnvValue, getCloudinaryCredentials } = require('./cloudinaryService');

cloudinary.config({
  cloud_name: cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: cleanEnvValue(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanEnvValue(process.env.CLOUDINARY_API_SECRET)
});

const uploadToCloudinary = async (fileBuffer, folder = 'smartsplit/chat') => {
  const creds = getCloudinaryCredentials();
  cloudinary.config(creds);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { ...creds, folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
