const express = require('express');
const router = express.Router();
const { getHomeFeed, createPost, toggleLike, addComment, toggleSave } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

router.get('/feed', getHomeFeed); // Optionally protect if we want user context
router.post('/', protect, createPost);
router.put('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.put('/:id/save', protect, toggleSave);

module.exports = router;
