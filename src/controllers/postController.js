const Post = require('../models/Post');
const User = require('../models/User');
const BusinessUser = require('../models/BusinessUser');

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
    const { content, image } = req.body;
    
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
      // Ensure no business-specific fields are set for normal users if they try to sneak them in
      // Since the schema is flexible, we just rely on what we construct above in authorData
    });

    const createdPost = await post.save();
    res.status(201).json(createdPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getHomeFeed, createPost, toggleLike, addComment, toggleSave };
