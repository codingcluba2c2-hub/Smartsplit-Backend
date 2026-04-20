require('dotenv').config();
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function setAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update the primary user to admin
    const result = await User.findOneAndUpdate(
      { email: 'akhlaquerahman0786@gmail.com' },
      { role: 'admin' },
      { new: true }
    );

    if (result) {
      console.log('✅ User updated to admin:');
      console.log('Name:', result.name);
      console.log('Email:', result.email);
      console.log('Role:', result.role);
    } else {
      console.log('❌ User not found with email akhlaquerahman0786@gmail.com');
      console.log('Available users:');
      const users = await User.find({}).select('name email role');
      users.forEach(u => {
        console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setAdminRole();
