const express = require('express');
const router = express.Router();
const { getHomeFeed, createPost, toggleLike, addComment, toggleSave, getPostById, checkExpiryAndNotify } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/feed', getHomeFeed); // Optionally protect if we want user context
router.get('/test/trigger-expiry', checkExpiryAndNotify);
router.get('/:id', getPostById);
router.post('/', protect, upload.single('image'), createPost);
router.put('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.put('/:id/save', protect, toggleSave);

module.exports = router;
