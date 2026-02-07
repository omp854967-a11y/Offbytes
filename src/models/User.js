const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true },
    profilePicture: { type: String },
    role: { 
      type: String, 
      enum: ['NORMAL_USER', 'BUSINESS', 'ADMIN'], 
      default: 'NORMAL_USER' 
    },
    isVerified: { type: Boolean, default: false },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'none'], 
      default: 'none' 
    },
    verifiedAt: { type: Date },
    savedPosts: [{ type: String }], // Array of Post IDs
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
