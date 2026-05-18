const mongoose = require('mongoose');

const expenseEditHistorySchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: [
    {
      field: {
        type: String,
        required: true
      },
      oldValue: {
        type: mongoose.Schema.Types.Mixed
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ],
  editedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExpenseEditHistory', expenseEditHistorySchema);
