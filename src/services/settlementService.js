const { buildGroupBalanceLedger, fromCents } = require('./balanceService');

/**
 * Smart Split Algorithm
 * Calculates the minimum number of transactions needed to settle debts.
 */
const calculateSettlements = (expenses, members, settlements = []) => {
  const ledger = buildGroupBalanceLedger(expenses, members, settlements);

  // Separate creditors and debtors
  let creditors = [];
  let debtors = [];

  Object.keys(ledger).forEach(userId => {
    const amount = ledger[userId].netBalanceCents;
    if (amount > 1) {
      creditors.push({ userId, amount });
    } else if (amount < -1) {
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
      amount: fromCents(settlementAmount)
    });

    creditors[i].amount -= settlementAmount;
    debtors[j].amount -= settlementAmount;

    if (creditors[i].amount < 1) i++;
    if (debtors[j].amount < 1) j++;
  }

  return transactions;
};

module.exports = { calculateSettlements };
