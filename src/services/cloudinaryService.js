const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing in server environment variables');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
};

const uploadBufferStream = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    uploadStream.end(buffer);
  });
};

const uploadToCloudinary = async (fileStr, folderName = 'smartsplit_avatars') => {
  try {
    configureCloudinary();

    const uploadOptions = {
      folder: folderName,
      resource_type: 'auto',
      timeout: 55000,
      ...(folderName === 'smartsplit_avatars' && {
        transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto' }]
      })
    };

    const base64Marker = ';base64,';
    const markerIndex = typeof fileStr === 'string' && fileStr.startsWith('data:')
      ? fileStr.indexOf(base64Marker)
      : -1;

    const uploadResponse = markerIndex !== -1
      ? await uploadBufferStream(
          Buffer.from(fileStr.slice(markerIndex + base64Marker.length), 'base64'),
          uploadOptions
        )
      : await cloudinary.uploader.upload(fileStr, uploadOptions);

    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    if (error?.message?.includes('Cloudinary credentials are missing')) {
      throw error;
    }
    if (error?.name === 'TimeoutError' || error?.http_code === 499) {
      throw new Error('Image upload timed out. Please try a smaller image.');
    }
    const reason = error?.message || error?.error?.message;
    throw new Error(reason ? `Failed to upload image to cloud (${reason})` : 'Failed to upload image to cloud');
  }
};

module.exports = { uploadToCloudinary };
