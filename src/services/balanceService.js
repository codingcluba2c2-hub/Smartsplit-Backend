const calculateGroupSummary = (expenses, settlements, group) => {
  const memberIds = group.members.map(m => m.user.toString());
  const balances = memberIds.reduce((acc, userId) => ({ ...acc, [userId]: 0 }), {});

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy.toString();
    balances[paidBy] += expense.amount;
    expense.splitDetails.forEach((split) => {
      balances[split.user.toString()] -= split.amount;
    });
  });

  settlements
    .filter((settlement) => settlement.status === 'completed')
    .forEach((settlement) => {
      balances[settlement.payerId.toString()] -= settlement.amount;
      balances[settlement.receiverId.toString()] += settlement.amount;
    });

  const members = group.members.map((member) => ({
    ...member.toObject(),
    balance: balances[member.user.toString()] || 0
  }));

  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const completedSettlements = settlements.filter((settlement) => settlement.status === 'completed');
  const pendingSettlements = settlements.filter((settlement) => settlement.status === 'pending');

  const paidTotals = expenses.reduce((totals, expense) => {
    const payer = expense.paidBy.toString();
    totals[payer] = (totals[payer] || 0) + expense.amount;
    return totals;
  }, {});

  const owesTotals = members.reduce((totals, member) => {
    const value = member.balance;
    totals[member.user.toString()] = value;
    return totals;
  }, {});

  const maxPaid = Object.entries(paidTotals).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const maxOwed = Object.entries(owesTotals).sort((a, b) => a[1] - b[1])[0] || [null, 0];

  const summary = {
    totalExpense,
    totalMembers: memberIds.length,
    totalSettlements: completedSettlements.length,
    pendingSettlements: pendingSettlements.length,
    paidMost: maxPaid[0] ? { userId: maxPaid[0], amount: maxPaid[1] } : null,
    owesMost: maxOwed[0] ? { userId: maxOwed[0], amount: maxOwed[1] } : null,
    memberBalances: members,
    groupTotal: totalExpense,
    totalOwed: Object.values(balances).filter((value) => value < 0).reduce((sum, value) => sum + Math.abs(value), 0),
    totalOwedToGroup: Object.values(balances).filter((value) => value > 0).reduce((sum, value) => sum + value, 0)
  };

  return summary;
};

const calculateDirectNet = (expenses, settlements, fromUserId, toUserId) => {
  let net = 0;

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy.toString();
    expense.splitDetails.forEach((split) => {
      const splitUser = split.user.toString();
      if (splitUser === fromUserId && paidBy === toUserId) {
        net += split.amount;
      }
      if (splitUser === toUserId && paidBy === fromUserId) {
        net -= split.amount;
      }
    });
  });

  settlements
    .filter((settlement) => settlement.status === 'completed')
    .forEach((settlement) => {
      const payer = settlement.payerId.toString();
      const receiver = settlement.receiverId.toString();
      if (payer === fromUserId && receiver === toUserId) {
        net -= settlement.amount;
      }
      if (payer === toUserId && receiver === fromUserId) {
        net += settlement.amount;
      }
    });

  return net;
};

module.exports = { calculateGroupSummary, calculateDirectNet };
