const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    cloudinary.config({ secure: true });
    return;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary configuration is missing');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
};

const buildVariants = (publicId, resourceType) => {
  const isVideo = resourceType === 'video';

  const thumbnailUrl = cloudinary.url(publicId, {
    secure: true,
    resource_type: isVideo ? 'video' : 'image',
    transformation: isVideo
      ? [{ width: 300, height: 300, crop: 'fill' }, { start_offset: 1 }]
      : [{ width: 300, height: 300, crop: 'fill' }, { quality: 'auto', fetch_format: 'auto' }],
  });

  const optimizedUrl = cloudinary.url(publicId, {
    secure: true,
    resource_type: isVideo ? 'video' : 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  const previewUrl = isVideo
    ? cloudinary.url(publicId, {
        secure: true,
        resource_type: 'video',
        transformation: [{ quality: 'auto', fetch_format: 'auto', start_offset: 0, duration: 3 }],
      })
    : '';

  return {
    thumbnailUrl,
    optimizedUrl,
    previewUrl: previewUrl || undefined,
  };
};

const upload = async (file) => {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'posts' },
      (error, result) => {
        if (error) return reject(error);

        const variants = buildVariants(result.public_id, result.resource_type);

        return resolve({
          key: result.public_id,
          url: result.secure_url,
          mimeType: file.mimetype || '',
          size: result.bytes || 0,
          thumbnailUrl: variants.thumbnailUrl,
          optimizedUrl: variants.optimizedUrl,
          previewUrl: variants.previewUrl,
        });
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

const remove = async (key) => {
  configureCloudinary();
  if (!key) return;

  await cloudinary.uploader.destroy(key, { resource_type: 'auto' });
};

const getPublicUrl = (key) => {
  configureCloudinary();
  if (!key) return '';

  return cloudinary.url(key, { secure: true });
};

module.exports = {
  upload,
  remove,
  getPublicUrl,
};
