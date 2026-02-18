const multer = require('multer');

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))) {
    const error = new Error('Only image and video files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error);
  }
  return cb(null, true);
};

const uploadPostMedia = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
});

const handlePostMediaUpload = (req, res, next) => {
  const uploader = uploadPostMedia.array('media', MAX_FILES);

  uploader(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large (max 50MB)' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Maximum 10 files allowed' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Unexpected field' });
      }
    }

    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ success: false, message: 'Only images and videos allowed' });
    }

    return res.status(400).json({ success: false, message: 'Upload failed' });
  });
};

module.exports = {
  handlePostMediaUpload,
};
