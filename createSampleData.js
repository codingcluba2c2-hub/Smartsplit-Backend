const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Group = require('./src/models/Group');
const Expense = require('./src/models/Expense');
const Settlement = require('./src/models/Settlement');

async function createSampleData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check existing data
    const userCount = await User.countDocuments();
    console.log('Existing users:', userCount);

    if (userCount === 0) {
      console.log('Creating sample data...');

      // Create sample users
      const sampleUsers = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          isVerified: true
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: 'password123',
          isVerified: true
        },
        {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          password: 'password123',
          isVerified: true
        }
      ];

      const createdUsers = await User.create(sampleUsers);
      console.log('Created sample users:', createdUsers.length);

      // Create sample groups
      const sampleGroups = [
        {
          name: 'Trip to Goa',
          description: 'Summer vacation expenses',
          members: [
            { user: createdUsers[0]._id, role: 'admin' },
            { user: createdUsers[1]._id, role: 'member' }
          ],
          createdBy: createdUsers[0]._id,
          category: 'Trip'
        },
        {
          name: 'Office Lunch',
          description: 'Monthly team lunch expenses',
          members: [
            { user: createdUsers[1]._id, role: 'admin' },
            { user: createdUsers[2]._id, role: 'member' }
          ],
          createdBy: createdUsers[1]._id,
          category: 'Office'
        }
      ];

      const createdGroups = await Group.create(sampleGroups);
      console.log('Created sample groups:', createdGroups.length);

      // Create sample expenses
      const sampleExpenses = [
        {
          groupId: createdGroups[0]._id,
          description: 'Hotel booking',
          amount: 5000,
          paidBy: createdUsers[0]._id,
          splitType: 'equal',
          splitDetails: [
            { user: createdUsers[0]._id, amount: 2500 },
            { user: createdUsers[1]._id, amount: 2500 }
          ],
          category: 'Accommodation'
        },
        {
          groupId: createdGroups[1]._id,
          description: 'Restaurant bill',
          amount: 1200,
          paidBy: createdUsers[1]._id,
          splitType: 'equal',
          splitDetails: [
            { user: createdUsers[1]._id, amount: 600 },
            { user: createdUsers[2]._id, amount: 600 }
          ],
          category: 'Food'
        }
      ];

      const createdExpenses = await Expense.create(sampleExpenses);
      console.log('Created sample expenses:', createdExpenses.length);

      // Create sample settlements
      const sampleSettlements = [
        {
          groupId: createdGroups[0]._id,
          payerId: createdUsers[1]._id,
          receiverId: createdUsers[0]._id,
          amount: 2500,
          paymentType: 'UPI',
          status: 'completed'
        }
      ];

      const createdSettlements = await Settlement.create(sampleSettlements);
      console.log('Created sample settlements:', createdSettlements.length);
    } else {
      console.log('Sample data already exists');
    }

    // Show final counts
    const finalCounts = {
      users: await User.countDocuments(),
      groups: await Group.countDocuments(),
      expenses: await Expense.countDocuments(),
      settlements: await Settlement.countDocuments()
    };

    console.log('Final database counts:', finalCounts);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSampleData();