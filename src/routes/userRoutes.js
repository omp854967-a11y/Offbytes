const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  getPublicProfile,
  getNotifications,
  getSavedOffers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getUserProfile);
router.get('/notifications', protect, getNotifications);
router.get('/saved-offers', protect, getSavedOffers);
router.get('/:id/public', getPublicProfile); // Public access

module.exports = router;
