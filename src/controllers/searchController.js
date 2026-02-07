const User = require('../models/User');
const BusinessUser = require('../models/BusinessUser');
const Post = require('../models/Post');

// @desc    Search for businesses and offers
// @route   GET /api/search
// @access  Protected
const search = async (req, res) => {
  try {
    const { q, category, location } = req.query;

    if ((!q || q.trim() === '') && !category && !location) {
      return res.status(400).json({ message: 'Search query or filters are required' });
    }

    const searchRegex = q ? new RegExp(q, 'i') : null;
    const categoryRegex = category ? new RegExp(category, 'i') : null;
    const locationRegex = location ? new RegExp(location, 'i') : null;

    // 1. Search Businesses
    // Filters: q (name/address), location (address/pincode)
    // Note: BusinessUser has address/pincode. User has name.
    
    let businessEmails = [];
    
    // A. Find matching BusinessUser (Address/Pincode/Name if stored there)
    const businessUserQuery = {};
    if (searchRegex) {
      businessUserQuery.$or = [
        { businessName: searchRegex },
        { businessAddress: searchRegex },
        { pincode: searchRegex }
      ];
    }
    if (locationRegex) {
      // Refine by location if provided
      const locQuery = { $or: [{ businessAddress: locationRegex }, { pincode: locationRegex }] };
      if (businessUserQuery.$or) {
        businessUserQuery.$and = [locQuery];
      } else {
        Object.assign(businessUserQuery, locQuery);
      }
    }

    // Only run BusinessUser query if we have relevant filters
    if (Object.keys(businessUserQuery).length > 0) {
      const businessUserMatches = await BusinessUser.find(businessUserQuery);
      businessEmails = businessUserMatches.map(b => b.email);
    }

    // B. Find matching User (Name) OR emails from A
    const userQuery = { role: 'BUSINESS' };
    const orConditions = [];

    if (searchRegex) {
      orConditions.push({ name: searchRegex });
    }
    if (businessEmails.length > 0) {
      orConditions.push({ email: { $in: businessEmails } });
    }

    // If we have filters but no text search, we rely on the emails found from BusinessUser
    // If we have text search, we look in User.name OR the emails.
    if (orConditions.length > 0) {
      userQuery.$or = orConditions;
    } else if (businessEmails.length === 0 && searchRegex) {
       // If searchRegex exists but no business matches found, we still search User names
       userQuery.name = searchRegex;
    } else if (businessEmails.length === 0 && !searchRegex) {
       // If no searchRegex and no business matches (e.g. only category provided?), 
       // User model doesn't have category/location directly usually (unless synced).
       // We might skip User search if we strictly need location and found nothing in BusinessUser.
       // However, let's allow finding all businesses if just listing.
    }

    const businessResults = await User.find(userQuery).select('-password -googleId');

    const formattedBusinesses = businessResults.map(user => ({
      id: user._id,
      type: 'business',
      name: user.name,
      image: user.profilePicture,
      description: 'Local Business', // We could fetch address from BusinessUser if needed
      isVerified: user.isVerified || false,
      category: 'Retail' // Default
    }));

    // 2. Search Posts (Offers)
    const postQuery = {};
    const postOrConditions = [];

    if (searchRegex) {
      postOrConditions.push({ content: searchRegex });
      postOrConditions.push({ 'author.name': searchRegex });
      // Also match category/location in text search just in case
      postOrConditions.push({ 'author.category': searchRegex });
      postOrConditions.push({ 'author.location': searchRegex });
    }

    if (postOrConditions.length > 0) {
      postQuery.$or = postOrConditions;
    }

    // Apply strict filters if provided
    if (categoryRegex) {
      postQuery['author.category'] = categoryRegex;
    }
    if (locationRegex) {
      postQuery['author.location'] = locationRegex;
    }

    const postResults = await Post.find(postQuery).sort({ createdAt: -1 });

    const formattedPosts = postResults.map(post => ({
      id: post._id,
      type: 'post',
      name: post.author.name,
      image: post.image || post.author.picture,
      description: post.content,
      isVerified: post.author.verified,
      category: post.author.category,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0
    }));

    // 3. Combine and Sort
    const combinedResults = [
      ...formattedBusinesses,
      ...formattedPosts
    ];

    combinedResults.sort((a, b) => {
      // Prioritize Verified Businesses
      if (a.type === 'business' && a.isVerified && (!b.isVerified || b.type !== 'business')) return -1;
      if (b.type === 'business' && b.isVerified && (!a.isVerified || a.type !== 'business')) return 1;
      
      // Then Verified Posts
      if (a.type === 'post' && a.isVerified && !b.isVerified) return -1;
      if (b.type === 'post' && b.isVerified && !a.isVerified) return 1;

      return 0;
    });

    res.json(combinedResults);

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { search };
