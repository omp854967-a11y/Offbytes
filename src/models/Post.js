const mongoose = require('mongoose');

const postSchema = mongoose.Schema(
  {
    author: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        picture: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        role: { type: String, required: true },
        // Business specific fields
        category: { type: String },
        location: { type: String }
    },
    content: {
      type: String,
      // Content is optional if image is present, handled in controller validation
    },
    image: {
      type: String, // Storing as Base64 string or URL
    },
    likesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [{ type: String }], // Array of User IDs
    comments: [{
        userId: String,
        userName: String,
        userPicture: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Post', postSchema);
