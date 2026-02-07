const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getBusinessInsights, 
  getBusinessPosts,
  getPublicBusinessProfile,
  getPublicBusinessProfilePage,
  updateBusinessProfile
} = require('../controllers/businessController');

// Public routes
router.get('/:businessId/public-profile', getPublicBusinessProfilePage);

// Protected routes
router.use(protect);

router.get('/insights', getBusinessInsights);
router.get('/posts', getBusinessPosts);
router.get('/:businessId/public-card', getPublicBusinessProfile);
router.put('/profile', updateBusinessProfile);

module.exports = router;
