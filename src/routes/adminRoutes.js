const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { verifyBusiness, rejectBusiness } = require('../controllers/adminController');

router.post('/business/:businessId/verify', protect, admin, verifyBusiness);
router.post('/business/:businessId/reject', protect, admin, rejectBusiness);

module.exports = router;
