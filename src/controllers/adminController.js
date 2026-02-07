const User = require('../models/User');

// @desc    Verify a business
// @route   POST /api/admin/business/:businessId/verify
// @access  Private/Admin
const verifyBusiness = async (req, res) => {
  try {
    const user = await User.findById(req.params.businessId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'BUSINESS') {
      return res.status(400).json({ message: 'User is not a business' });
    }

    user.isVerified = true;
    user.verificationStatus = 'approved';
    user.verifiedAt = Date.now();

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      verifiedAt: user.verifiedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reject a business verification
// @route   POST /api/admin/business/:businessId/reject
// @access  Private/Admin
const rejectBusiness = async (req, res) => {
  try {
    const user = await User.findById(req.params.businessId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'BUSINESS') {
      return res.status(400).json({ message: 'User is not a business' });
    }

    user.isVerified = false;
    user.verificationStatus = 'rejected';
    user.verifiedAt = undefined;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  verifyBusiness,
  rejectBusiness,
};
