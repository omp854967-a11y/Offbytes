const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/offbytes');
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log('Users found:', users.length);
    users.forEach(u => {
      console.log('--------------------------------');
      console.log('Name:', u.name);
      console.log('Email:', u.email);
      console.log('Picture:', u.profilePicture ? 'Present' : 'Missing');
      console.log('Role:', u.role);
    });

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkUsers();
