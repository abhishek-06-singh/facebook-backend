const s3Storage = require('./s3.storage');
const cloudinaryStorage = require('./cloudinary.storage');

const getProvider = () => {
  const provider = process.env.MEDIA_PROVIDER || 's3';

  if (provider === 's3') {
    return s3Storage;
  }

  if (provider === 'cloudinary') {
    return cloudinaryStorage;
  }

  throw new Error(`Unsupported media provider: ${provider}`);
};

const upload = async (file, options = {}) => {
  const storage = getProvider();
  return storage.upload(file, options);
};

const remove = async (key) => {
  const storage = getProvider();
  return storage.remove(key);
};

const getPublicUrl = (key) => {
  const storage = getProvider();
  return storage.getPublicUrl(key);
};

module.exports = {
  upload,
  delete: remove,
  remove,
  getPublicUrl,
};
