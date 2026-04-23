const mongoose = require('mongoose');
const Expense = require('./src/models/Expense');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const expense = await Expense.findOne().sort({ createdAt: -1 });
    console.log(expense);
    process.exit(0);
  })
  .catch(err => console.error(err));
