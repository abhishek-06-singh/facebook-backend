const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      maxlength: 5000,
      default: '',
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    media: [
      {
        key: { type: String, default: '' },
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: '' },
        thumbnailUrl: { type: String, default: '' },
        previewUrl: { type: String, default: '' },
        optimizedUrl: { type: String, default: '' },
      },
    ],
    privacy: {
      type: String,
      enum: ['public', 'friends'],
      default: 'public',
    },
    reactionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ privacy: 1, createdAt: -1 });
postSchema.index({ reactionsCount: -1 });
postSchema.index({ commentsCount: -1 });

module.exports = mongoose.model('Post', postSchema);
