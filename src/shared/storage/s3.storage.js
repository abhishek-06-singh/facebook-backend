const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET;

const s3 = new S3Client({
  region,
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
});

const ensureConfig = () => {
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 configuration is missing');
  }
};

const buildKey = (originalName = '') => {
  const ext = path.extname(originalName || '').toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `posts/${unique}${ext}`;
};

const upload = async (file, options = {}) => {
  ensureConfig();

  const key = options.key || buildKey(file.originalname);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return {
    key,
    url: getPublicUrl(key),
    mimeType: file.mimetype || '',
    size: file.size || 0,
  };
};

const remove = async (key) => {
  ensureConfig();
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);
};

const getPublicUrl = (key) => {
  if (!key) return '';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

module.exports = {
  upload,
  remove,
  getPublicUrl,
};
