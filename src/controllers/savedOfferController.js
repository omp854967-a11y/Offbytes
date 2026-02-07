const SavedOffer = require('../models/SavedOffer');
const Post = require('../models/Post');
const User = require('../models/User');

const getSavedOffers = async (req, res) => {
  try {
    const savedOffers = await SavedOffer.find({ user: req.user.id })
      .populate({
        path: 'post',
        populate: { path: 'author', select: 'name profilePicture isVerified' }
      })
      .sort({ savedAt: -1 });

    // Filter out posts that are null (deleted) or expired (if expiry logic exists)
    // Also format the response to match frontend expectations if needed
    // The prompt asks for: postId, businessName, offerText, offerImage, savedAt
    
    const formattedOffers = savedOffers
      .filter(item => item.post != null)
      .map(item => ({
        id: item.post._id,
        businessName: item.post.author ? item.post.author.name : 'Unknown Business',
        offerText: item.post.content, // Assuming content is offer text
        offerImage: item.post.image,
        savedAt: item.savedAt,
        // Include full post object for PostCard reusability
        post: item.post 
      }));

    res.json(formattedOffers);
  } catch (error) {
    console.error('Get Saved Offers Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const saveOffer = async (req, res) => {
  try {
    const { postId } = req.body;
    
    // Check if already saved
    let savedOffer = await SavedOffer.findOne({ user: req.user.id, post: postId });
    if (savedOffer) {
      return res.status(400).json({ message: 'Offer already saved' });
    }

    savedOffer = new SavedOffer({
      user: req.user.id,
      post: postId,
    });
    await savedOffer.save();

    // Also update User model for quick lookup if needed, but SavedOffer is primary source
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedPosts: postId } });

    res.status(201).json({ message: 'Offer saved' });
  } catch (error) {
    console.error('Save Offer Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const unsaveOffer = async (req, res) => {
  try {
    const { postId } = req.params;
    
    await SavedOffer.findOneAndDelete({ user: req.user.id, post: postId });
    
    // Update User model
    await User.findByIdAndUpdate(req.user.id, { $pull: { savedPosts: postId } });

    res.json({ message: 'Offer unsaved' });
  } catch (error) {
    console.error('Unsave Offer Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getSavedOffers,
  saveOffer,
  unsaveOffer,
};
