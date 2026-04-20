const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function setAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateOne(
      { email: 'akhlaquerahman18@gmail.com' },
      { role: 'admin' }
    );

    if (result.matchedCount > 0) {
      console.log('Admin role set successfully for akhlaquerahman18@gmail.com');
    } else {
      console.log('User not found. Please register first with email akhlaquerahman18@gmail.com');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdminRole();