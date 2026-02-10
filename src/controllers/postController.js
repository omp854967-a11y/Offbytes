const Post = require('../models/Post');
const User = require('../models/User');
const BusinessUser = require('../models/BusinessUser');
const Notification = require('../models/Notification');
const SavedOffer = require('../models/SavedOffer');

// @desc    Get home feed posts
// @route   GET /api/posts/feed
// @access  Public (or Private if we want personalized, but req says Public for now)
const getHomeFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Check if user is logged in to return isLiked/isSaved status
    // Note: Since this route is currently public in routes, we might need to parse token manually 
    // or rely on frontend sending it. For now, let's assume if 'Authorization' header exists, we decode it.
    // However, keeping it simple: The endpoint is public, so we might not have user info.
    // Ideally, we should change the route to optional auth.
    // But for this task, I'll stick to the existing structure. 
    // Let's assume the frontend sends the token if available.
    
    const skip = (page - 1) * limit;
    
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Note: removed client-side filtering for now to ensure consistent pagination 
    // and "unlimited" scrolling behavior without gaps or premature stopping.

    const count = await Post.countDocuments();

    res.json({
      posts: posts,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Toggle Like
// @route   PUT /api/posts/:id/like
// @access  Private
const toggleLike = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = req.user._id.toString();
        const index = post.likes.indexOf(userId);

        if (index === -1) {
            // Like
            post.likes.push(userId);
            post.likesCount += 1;
        } else {
            // Unlike
            post.likes.splice(index, 1);
            post.likesCount = Math.max(0, post.likesCount - 1);
        }

        await post.save();
        res.json({ likesCount: post.likesCount, isLiked: index === -1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add Comment
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const user = await User.findById(req.user._id);

        const newComment = {
            userId: req.user._id,
            userName: user.name,
            userPicture: user.profilePicture || '',
            text,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        post.commentsCount += 1;

        await post.save();
        res.json(post.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle Save
// @route   PUT /api/posts/:id/save
// @access  Private
const toggleSave = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const postId = req.params.id;
        const index = user.savedPosts.indexOf(postId);
        let isSaved = false;

        if (index === -1) {
            // Save
            user.savedPosts.push(postId);
            isSaved = true;
        } else {
            // Unsave
            user.savedPosts.splice(index, 1);
            isSaved = false;
        }

        await user.save();
        res.json({ isSaved });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    let image = req.body.image; // Fallback or if sent as string

    // Handle File Upload
    if (req.file) {
        // Save relative path so frontend can construct full URL based on its environment (Emulator vs Device vs Web)
        // Example: /uploads/17154321.jpg
        image = `/uploads/${req.file.filename}`;
        console.log(`Image saved as relative path: ${image}`);
    }
    
    // Basic validation
    if ((!content || content.trim() === '') && !image) {
        return res.status(400).json({ message: 'Post must have content or image' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    // Fetch Full Profile Details
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    let authorData = {
      id: user._id.toString(),
      name: user.name,
      picture: user.profilePicture || '',
      verified: user.isVerified || false,
      role: user.role
    };

    // If Business, fetch business specific details
    if (user.role === 'BUSINESS') {
        const business = await BusinessUser.findOne({ email: user.email });
        if (business) {
            authorData.name = business.businessName; // Use business name
            authorData.category = business.category || 'Retail'; 
            authorData.location = business.businessAddress;
        }
    } else {
        // For normal users, we might want to attach a general location if available
        // The user prompt mentioned "Auto-detect city/area (read-only)"
        // For now, we can check if the request body provides location, otherwise use user's address or default
        if (req.body.location) {
             authorData.location = req.body.location;
        } else if (user.address) {
             authorData.location = user.address;
        }
    }

    const post = new Post({
      content: content || '',
      image,
      author: authorData,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
    });

    const createdPost = await post.save();

    // Trigger New Offer Alert (Type 1)
    if (user.role === 'BUSINESS') {
        // Find users to notify (Simple: All users except author)
        // In real app: Nearby users or followers
        const usersToNotify = await User.find({ _id: { $ne: user._id } }).select('_id');
        
        const notifications = usersToNotify.map(u => ({
            user: u._id,
            title: `New Offer from ${authorData.name}`,
            message: content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'New offer posted!',
            relatedId: createdPost._id,
            relatedModel: 'Post',
            type: 'new_offer'
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    }

    res.status(201).json(createdPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Check Expiry and Notify
// @route   GET /api/test/trigger-expiry
// @access  Public (or Protected)
const checkExpiryAndNotify = async (req, res) => {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Find posts expiring in next 24h
        const expiringPosts = await Post.find({
            expiresAt: {
                $gte: today,
                $lt: tomorrow
            }
        });
        
        let notificationCount = 0;

        for (const post of expiringPosts) {
            // Notify users who saved this post
            const savedOffers = await SavedOffer.find({ post: post._id });
            
            for (const saved of savedOffers) {
                const existing = await Notification.findOne({
                    user: saved.user,
                    relatedId: post._id,
                    type: 'offer_expiry'
                });
                
                if (!existing) {
                    await Notification.create({
                        user: saved.user,
                        title: 'Offer Expiring Soon!',
                        message: `The offer from ${post.author.name} is expiring today.`,
                        relatedId: post._id,
                        relatedModel: 'Post',
                        type: 'offer_expiry'
                    });
                    notificationCount++;
                }
            }
        }
        
        res.json({ message: `Expiry check complete. Sent ${notificationCount} notifications.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'Post not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
    try {
        const { content, expiresAt } = req.body;
        let post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check user
        if (post.author.id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Update fields
        if (content) post.content = content;
        if (expiresAt) post.expiresAt = new Date(expiresAt);
        if (req.file) {
             post.image = `/uploads/${req.file.filename}`;
        }

        const updatedPost = await post.save();

        // Trigger Saved Offer Update Notification (Type 3)
        // Notify users who saved this post
        const savedOffers = await SavedOffer.find({ post: post._id });
        
        const notifications = savedOffers.map(saved => ({
            user: saved.user,
            title: 'Saved Offer Updated',
            message: `The offer from ${post.author.name} has been updated.`,
            relatedId: post._id,
            relatedModel: 'Post',
            type: 'saved_offer_update'
        }));

        if (notifications.length > 0) {
            // Avoid duplicates for same update? Timestamp check could be complex.
            // For now, just insert.
            await Notification.insertMany(notifications);
        }

        res.json(updatedPost);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getHomeFeed, createPost, toggleLike, addComment, toggleSave, checkExpiryAndNotify, getPostById, updatePost };
