const express = require('express');
const router = express.Router();
const { googleAuth, registerBusiness } = require('../controllers/authController');

router.post('/google', googleAuth);
router.post('/register-business', registerBusiness);

module.exports = router;
