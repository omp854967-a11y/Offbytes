const Post = require('../models/Post');
const SavedOffer = require('../models/SavedOffer');
const BusinessUser = require('../models/BusinessUser');
const User = require('../models/User');

// @desc    Get public business profile card data
// @route   GET /api/business/:businessId/public-card
// @access  Protected (Authenticated users)
const getPublicBusinessProfile = async (req, res) => {
  try {
    const { businessId } = req.params;

    // 1. Fetch User (Business) basic info
    const user = await User.findById(businessId);
    if (!user || user.role !== 'BUSINESS') {
      return res.status(404).json({ message: 'Business not found' });
    }

    // 2. Fetch Business Details (Address, Name)
    const businessDetails = await BusinessUser.findOne({ email: user.email });
    
    // 3. Fetch Latest Post (Active Offer)
    const latestPost = await Post.findOne({ "author.id": businessId })
      .sort({ createdAt: -1 });

    // 4. Construct Response
    const response = {
      businessName: businessDetails?.businessName || user.name,
      profileImageUrl: user.profilePicture,
      category: latestPost?.author?.category || businessDetails?.category || 'Retail',
      locality: businessDetails?.businessAddress || 'Location unavailable',
      verifiedStatus: user.isVerified || false,
      activeOffer: latestPost ? {
        offerText: latestPost.content,
        offerBadgeText: "LATEST OFFER", // Static for now as we don't have discount field
        createdAt: latestPost.createdAt
      } : null
    };

    res.json(response);

  } catch (error) {
    console.error('Public Profile Card Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Helper: Get business details by email (internal use)
const getBusinessDetailsByEmail = async (email) => {
  try {
    const business = await BusinessUser.findOne({ email });
    if (business) {
      return {
        businessName: business.businessName,
        address: business.businessAddress,
        category: 'Retail', // Default or fetch if added to schema
        isBusiness: true
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching business details:', error);
    return null;
  }
};

// @desc    Get business insights (views, saved, likes)
// @route   GET /api/business/insights
// @access  Private (Business only)
const getBusinessInsights = async (req, res) => {
  try {
    // 1. Get all posts by this user
    // Note: author.id is stored as String in Post model, req.user._id is ObjectId
    const posts = await Post.find({ "author.id": req.user._id.toString() });

    if (!posts || posts.length === 0) {
      return res.json({
        totalViews: 0,
        savedCount: 0,
        likesCount: 0,
        postCount: 0
      });
    }

    // 2. Calculate Views and Likes
    let totalViews = 0;
    let totalLikes = 0;
    const postIds = [];

    posts.forEach(post => {
      totalViews += (post.views || 0);
      totalLikes += (post.likesCount || 0);
      postIds.push(post._id);
    });

    // 3. Calculate Saved Offers count
    const savedCount = await SavedOffer.countDocuments({
      post: { $in: postIds }
    });

    res.json({
      totalViews,
      savedCount,
      likesCount: totalLikes,
      postCount: posts.length
    });

  } catch (error) {
    console.error('Insights Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get posts created by business
// @route   GET /api/business/posts
// @access  Private (Business only)
const getBusinessPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ "author.id": req.user._id.toString() })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (error) {
    console.error('My Posts Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get public business profile page data (Full View)
// @route   GET /api/business/:businessId/public-profile
// @access  Public
const getPublicBusinessProfilePage = async (req, res) => {
  try {
    const { businessId } = req.params;

    // 1. Fetch User (Business) basic info
    const user = await User.findById(businessId);
    if (!user || user.role !== 'BUSINESS') {
      return res.status(404).json({ message: 'Business not found' });
    }

    // 2. Fetch Business Details (Address, Name)
    const businessDetails = await BusinessUser.findOne({ email: user.email });
    
    // 3. Fetch Latest 3 Posts (Active Offers)
    const latestPosts = await Post.find({ "author.id": businessId })
      .sort({ createdAt: -1 })
      .limit(3);

    // 4. Construct Response
    const response = {
      businessName: businessDetails?.businessName || user.name,
      profileImageUrl: user.profilePicture,
      verifiedStatus: user.isVerified || false,
      category: latestPosts[0]?.author?.category || businessDetails?.category || 'Retail',
      locality: businessDetails?.businessAddress || 'Location unavailable', // Simplified for now
      shortDescription: `Welcome to ${businessDetails?.businessName || user.name}. Check out our latest offers!`,
      activeOffers: latestPosts.map(post => ({
        _id: post._id, // Needed for PostCard
        offerText: post.content,
        offerImageUrl: post.image,
        createdAt: post.createdAt,
        // Include minimal author info for PostCard reuse if needed
        author: {
           name: businessDetails?.businessName || user.name,
           picture: user.profilePicture,
           verified: user.isVerified || false,
           category: latestPosts[0]?.author?.category || businessDetails?.category || 'Retail'
        },
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Public Profile Page Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update business profile
// @route   PUT /api/business/profile
// @access  Private (Business only)
const updateBusinessProfile = async (req, res) => {
  try {
    const { businessName, address, category, profilePicture } = req.body;
    
    // 1. Find User
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'BUSINESS') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // 2. Find BusinessUser
    const businessUser = await BusinessUser.findOne({ email: user.email });
    if (!businessUser) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    // 3. Update Fields
    if (businessName) {
      businessUser.businessName = businessName;
      user.name = businessName; // Sync User name
    }
    if (address) businessUser.businessAddress = address;
    if (category) businessUser.category = category;
    
    if (profilePicture) {
      user.profilePicture = profilePicture;
    }

    // 4. Save
    await businessUser.save();
    await user.save();

    // Trigger Business Profile Update Notification (Type 4)
    // Notify users who have saved offers from this business
    const posts = await Post.find({ "author.id": user._id.toString() }).select('_id');
    const postIds = posts.map(p => p._id);
    
    if (postIds.length > 0) {
        const savedOffers = await SavedOffer.find({ post: { $in: postIds } }).populate('user', '_id');
        const uniqueUserIds = [...new Set(savedOffers.map(s => s.user._id.toString()))];
        
        const notifications = uniqueUserIds.map(userId => ({
            user: userId,
            title: `${businessUser.businessName} Updated Profile`,
            message: 'A business you are interested in has updated their profile.',
            relatedId: user._id,
            relatedModel: 'User',
            type: 'business_update'
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      businessName: businessUser.businessName,
      address: businessUser.businessAddress,
      category: businessUser.category,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getBusinessInsights,
  getBusinessPosts,
  getBusinessDetailsByEmail,
  getPublicBusinessProfile,
  getPublicBusinessProfilePage,
  updateBusinessProfile
};
