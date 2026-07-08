const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  const result = await User.updateMany({ role: 'admin' }, { $set: { isAppOwner: true } });
  console.log('Updated users:', result);
  process.exit(0);
}).catch(console.error);
