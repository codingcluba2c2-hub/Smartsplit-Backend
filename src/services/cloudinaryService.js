const cloudinary = require('cloudinary').v2;

const cleanEnvValue = (value = '') => {
  let cleaned = String(value).trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/(?:\\r|\\n)+$/g, '').trim();
};

const getCloudinaryCredentials = () => {
  const cloudName = cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvValue(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvValue(process.env.CLOUDINARY_API_SECRET);

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing in server environment variables');
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  };
};

const configureCloudinary = () => {
  const creds = getCloudinaryCredentials();
  cloudinary.config(creds);
  return creds;
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
    const creds = configureCloudinary();

    const uploadOptions = {
      ...creds,
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
    if (reason && reason.includes('Invalid Signature')) {
      throw new Error(
        'Failed to upload image to cloud (Invalid Cloudinary signature — verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in deployment environment variables)'
      );
    }
    throw new Error(reason ? `Failed to upload image to cloud (${reason})` : 'Failed to upload image to cloud');
  }
};

module.exports = { uploadToCloudinary, getCloudinaryCredentials, cleanEnvValue };
