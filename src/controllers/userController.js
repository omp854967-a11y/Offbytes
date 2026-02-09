const User = require('../models/User');
const Notification = require('../models/Notification');
const SavedOffer = require('../models/SavedOffer');
const BusinessUser = require('../models/BusinessUser');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // req.user is already fetched by authMiddleware
    const user = req.user; 
    
    if (user) {
      let businessDetails = {};
      
      // Fetch additional business details using email
      if (user.role === 'BUSINESS') {
        const business = await BusinessUser.findOne({ email: user.email });
        if (business) {
          businessDetails = {
            businessName: business.businessName,
            address: business.businessAddress,
            category: 'Retail', // Default or fetch if added to schema
          };
        }
      }

      // Default Avatar if missing
      const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random';

      console.log(`Fetch Profile: Sending data for ${user.email} (Role: ${user.role})`);

      res.json({
        _id: user._id,
        name: businessDetails.businessName || user.name, // Prefer business name
        email: user.email,
        profilePicture: user.profilePicture || defaultAvatar,
        role: user.role,
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'none',
        ...businessDetails
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get public user profile
// @route   GET /api/user/:id/public
// @access  Public
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (user) {
      // Format joined date (e.g., "March 2025")
      const joinedDate = new Date(user.createdAt);
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const joinedString = `${monthNames[joinedDate.getMonth()]} ${joinedDate.getFullYear()}`;

      res.json({
        displayName: user.name,
        profileImageUrl: user.profilePicture,
        accountType: user.role === 'BUSINESS' ? 'Business' : 'User',
        joinedMonthYear: `Joined ${joinedString}`
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    // If ID is invalid format
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user notifications
// @route   GET /api/user/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get saved offers
// @route   GET /api/user/saved-offers
// @access  Private
const getSavedOffers = async (req, res) => {
  try {
    const savedOffers = await SavedOffer.find({ user: req.user._id }).populate('post');
    res.json(savedOffers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getUserProfile,
  getPublicProfile,
  getNotifications,
  getSavedOffers,
};
