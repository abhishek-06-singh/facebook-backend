const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    media: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    viewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
