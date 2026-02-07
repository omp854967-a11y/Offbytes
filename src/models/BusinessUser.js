const mongoose = require('mongoose');

// Schema for registered business users
const businessUserSchema = mongoose.Schema(
  {
    businessName: { type: String, required: true },
    businessAddress: { type: String, required: true },
    pincode: { type: String, required: true },
    timing: { type: String, required: true }, // Closing and opening timing
    email: { type: String, required: true, unique: true },
    category: { type: String, default: 'Retail' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusinessUser', businessUserSchema);
