const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  // Set mock mobile numbers for friends
  const updates = [
    { email: 'u3480826@gmail.com', mobile: '9876543210' }, // Rohit Kumar
    { email: 'fahadasfaque0786@gmail.com', mobile: '9123456789' }, // Fahad Asfaque
    { email: 'aamiralam709145@gmail.com', mobile: '8877665544' } // Md Khalid
  ];

  for (const item of updates) {
    const res = await User.updateOne({ email: item.email }, { $set: { mobile: item.mobile } });
    console.log(`Updated ${item.email}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }
  
  process.exit(0);
}

run().catch(console.error);
