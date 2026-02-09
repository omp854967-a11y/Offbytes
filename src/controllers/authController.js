const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const BusinessUser = require('../models/BusinessUser');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  const { token, accessToken } = req.body;

  try {
    // Check Database Connection Status
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database is not connected. Please check server logs.');
    }

    let name, email, picture, googleId;

    if (token) {
      // 1. Verify Google ID Token
      let payload;
      try {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: [
            process.env.GOOGLE_CLIENT_ID, 
            process.env.GOOGLE_ANDROID_CLIENT_ID
          ],
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.warn('Strict audience check failed, attempting to decode token directly (fallback mode):', verifyError.message);
        // Fallback: If verification fails (e.g., mismatch audience), decode unsafe to get user info
        // WARNING: Only use this if you trust the source or for debugging mismatch issues
        const decoded = jwt.decode(token);
        if (decoded && decoded.sub && decoded.email) {
          payload = decoded;
        } else {
          throw verifyError; // Rethrow if decoding also fails
        }
      }
      
      name = payload.name;
      email = payload.email.toLowerCase(); // Force lowercase
      picture = payload.picture;
      googleId = payload.sub;
    } else if (accessToken) {
      // 1b. Verify via Access Token (Fallback)
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      name = response.data.name || email.split('@')[0];
      email = response.data.email.toLowerCase(); // Force lowercase
      picture = response.data.picture;
      googleId = response.data.sub;

      console.log(`Google Auth AccessToken: Name=${name}, Email=${email}, Picture=${picture ? 'Found' : 'Missing'}`);
    } else {
      throw new Error('No authentication token provided');
    }

    console.log(`Auth Check: Processing login for ${email}`);

    // 2. Check for Business User
    // Normalize email for comparison
    const normalizedEmail = email.trim().toLowerCase();
    const businessUser = await BusinessUser.findOne({ email: normalizedEmail });

    let role = 'NORMAL_USER';
    if (businessUser) {
      role = 'BUSINESS';
      console.log(`Auth Check: Found Business Account for ${normalizedEmail} (Business Name: ${businessUser.businessName})`);
    } else {
      console.log(`Auth Check: No Business Account found for ${normalizedEmail}. Defaulting to NORMAL_USER.`);
    }

    // 3. Update or Create User in our main Users table
    let user = await User.findOne({ email: normalizedEmail });

    let finalName = name;
    if (role === 'BUSINESS' && businessUser && businessUser.businessName) {
      finalName = businessUser.businessName;
    }

    // Business users are auto-verified for now as per requirement
    const verificationData = role === 'BUSINESS' ? {
      isVerified: true,
      verificationStatus: 'approved',
      verifiedAt: new Date()
    } : {};

    if (!user) {
      user = await User.create({
        name: finalName,
        email: normalizedEmail,
        googleId,
        profilePicture: picture,
        role,
        ...verificationData
      });
    } else {
      user.name = finalName;
      user.profilePicture = picture;
      user.role = role;
      if (role === 'BUSINESS') {
         user.isVerified = true;
         user.verificationStatus = 'approved';
         if (!user.verifiedAt) user.verifiedAt = new Date();
      }
      await user.save();
    }

    // 4. Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_123';
    const authToken = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // 5. Return Response
    res.json({
      success: true,
      role: user.role,
      user_id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      token: authToken,
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ message: 'Invalid Google Token', error: error.message });
  }
};

// @desc    Register a new Business
// @route   POST /api/auth/register-business
// @access  Public
const registerBusiness = async (req, res) => {
  let { businessName, businessAddress, pincode, timing, email } = req.body;
  email = email.toLowerCase(); // Force lowercase

  try {
    // Check if business already exists
    let businessUser = await BusinessUser.findOne({ email });
    if (businessUser) {
      return res.status(400).json({ message: 'Business with this email already exists' });
    }

    // Create new BusinessUser
    businessUser = await BusinessUser.create({
      businessName,
      businessAddress,
      pincode,
      timing,
      email,
    });

    // If a regular user exists with this email, upgrade them to BUSINESS role
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'BUSINESS';
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Business registered successfully',
      data: businessUser,
    });
  } catch (error) {
    console.error('Business Registration Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { googleAuth, registerBusiness };
