const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Group = require('./src/models/Group');
const Expense = require('./src/models/Expense');
const Settlement = require('./src/models/Settlement');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();
    const expenseCount = await Expense.countDocuments();
    const settlementCount = await Settlement.countDocuments();

    console.log('Database counts:');
    console.log('Users:', userCount);
    console.log('Groups:', groupCount);
    console.log('Expenses:', expenseCount);
    console.log('Settlements:', settlementCount);

    // List all users
    const users = await User.find({}, 'name email role isVerified');
    console.log('\nUsers:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Verified: ${user.isVerified}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();