/**
 * Smart Split Algorithm
 * Calculates the minimum number of transactions needed to settle debts.
 */

const calculateSettlements = (expenses, members) => {
  const balances = {};

  // Initialize balances for all group members
  members.forEach(member => {
    balances[member.user.toString()] = 0;
  });

  // Calculate net balance for each user
  // balance = (amount paid) - (amount owed)
  expenses.forEach(expense => {
    const paidBy = expense.paidBy.toString();
    balances[paidBy] += expense.amount;

    expense.splitDetails.forEach(split => {
      const user = split.user.toString();
      balances[user] -= split.amount;
    });
  });

  // Separate creditors and debtors
  let creditors = [];
  let debtors = [];

  Object.keys(balances).forEach(userId => {
    const amount = balances[userId];
    if (amount > 0.01) {
      creditors.push({ userId, amount });
    } else if (amount < -0.01) {
      debtors.push({ userId, amount: Math.abs(amount) });
    }
  });

  // Sort to match largest debtors with largest creditors
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];

    const settlementAmount = Math.min(credit.amount, debt.amount);

    transactions.push({
      from: debt.userId,
      to: credit.userId,
      amount: Number(settlementAmount.toFixed(2))
    });

    creditors[i].amount -= settlementAmount;
    debtors[j].amount -= settlementAmount;

    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }

  return transactions;
};

module.exports = { calculateSettlements };
