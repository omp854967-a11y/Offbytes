const mongoose = require('mongoose');
const User = require('./src/models/User');

const verifyUser = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/offbytes');
    console.log('MongoDB Connected');

    const email = 'prakashlifestyle479@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    user.isVerified = true;
    user.verificationStatus = 'approved';
    user.verifiedAt = Date.now();
    
    await user.save();
    console.log(`User ${user.name} (${user.email}) verified successfully!`);
    console.log('New status:', user.verificationStatus);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyUser();
