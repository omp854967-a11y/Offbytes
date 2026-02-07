const express = require('express');
const router = express.Router();
const { getSavedOffers, saveOffer, unsaveOffer } = require('../controllers/savedOfferController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSavedOffers);
router.post('/', protect, saveOffer);
router.delete('/:postId', protect, unsaveOffer);

module.exports = router;
