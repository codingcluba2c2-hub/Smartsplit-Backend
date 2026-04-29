const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));

const getUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const getExpenseParticipantIds = (expense) => {
  if (Array.isArray(expense.participants) && expense.participants.length > 0) {
    return [...new Set(expense.participants.map((participant) => getUserId(participant)).filter(Boolean))];
  }

  if (Array.isArray(expense.splitDetails) && expense.splitDetails.length > 0) {
    return [...new Set(expense.splitDetails.map((split) => getUserId(split.user)).filter(Boolean))];
  }

  return [];
};

const getExpenseShares = (expense) => {
  if (expense.splitType === 'unequal' && Array.isArray(expense.splitDetails) && expense.splitDetails.length > 0) {
    return expense.splitDetails.reduce((acc, split) => {
      const userId = getUserId(split.user);
      if (!userId) return acc;
      acc[userId] = (acc[userId] || 0) + toCents(split.amount);
      return acc;
    }, {});
  }

  const participantIds = getExpenseParticipantIds(expense);
  if (participantIds.length === 0) {
    return {};
  }

  const totalAmountCents = toCents(expense.amount);
  const baseShare = Math.floor(totalAmountCents / participantIds.length);
  const remainder = totalAmountCents - (baseShare * participantIds.length);

  return participantIds.reduce((acc, userId, index) => {
    acc[userId] = baseShare + (index === participantIds.length - 1 ? remainder : 0);
    return acc;
  }, {});
};

const buildGroupBalanceLedger = (expenses, members, settlements = []) => {
  const memberIds = members.map((member) => getUserId(member.user || member)).filter(Boolean);
  const ledger = memberIds.reduce((acc, userId) => {
    acc[userId] = {
      totalShareCents: 0,
      totalPaidCents: 0,
      settlementPaidCents: 0,
      settlementReceivedCents: 0,
      balanceCents: 0,
      netBalanceCents: 0
    };
    return acc;
  }, {});

  expenses.forEach((expense) => {
    const paidBy = getUserId(expense.paidBy);
    const amountCents = toCents(expense.amount);

    if (paidBy) {
      if (!ledger[paidBy]) {
        ledger[paidBy] = {
          totalShareCents: 0,
          totalPaidCents: 0,
          settlementPaidCents: 0,
          settlementReceivedCents: 0,
          balanceCents: 0,
          netBalanceCents: 0
        };
      }
      ledger[paidBy].totalPaidCents += amountCents;
    }

    const shares = getExpenseShares(expense);
    Object.entries(shares).forEach(([userId, shareCents]) => {
      if (!ledger[userId]) {
        ledger[userId] = {
          totalShareCents: 0,
          totalPaidCents: 0,
          settlementPaidCents: 0,
          settlementReceivedCents: 0,
          balanceCents: 0,
          netBalanceCents: 0
        };
      }
      ledger[userId].totalShareCents += shareCents;
    });
  });

  settlements
    .filter((settlement) => settlement.status === 'completed')
    .forEach((settlement) => {
      const payerId = getUserId(settlement.payerId);
      const receiverId = getUserId(settlement.receiverId);
      const amountCents = toCents(settlement.amount);

      if (payerId) {
        if (!ledger[payerId]) {
          ledger[payerId] = {
            totalShareCents: 0,
            totalPaidCents: 0,
            settlementPaidCents: 0,
            settlementReceivedCents: 0,
            balanceCents: 0,
            netBalanceCents: 0
          };
        }
        ledger[payerId].settlementPaidCents += amountCents;
      }

      if (receiverId) {
        if (!ledger[receiverId]) {
          ledger[receiverId] = {
            totalShareCents: 0,
            totalPaidCents: 0,
            settlementPaidCents: 0,
            settlementReceivedCents: 0,
            balanceCents: 0,
            netBalanceCents: 0
          };
        }
        ledger[receiverId].settlementReceivedCents += amountCents;
      }
    });

  Object.values(ledger).forEach((entry) => {
    entry.balanceCents = entry.totalPaidCents - entry.totalShareCents;
    // Net Balance = (What you spent + What you paid in settlements) - (Your share of expenses + What you received in settlements)
    entry.netBalanceCents = (entry.totalPaidCents + entry.settlementPaidCents) - (entry.totalShareCents + entry.settlementReceivedCents);
  });

  return ledger;
};

const mapMemberBalances = (group, ledger) => group.members.map((member) => {
  const memberObject = typeof member.toObject === 'function' ? member.toObject() : { ...member };
  const userId = getUserId(member.user);
  const balance = ledger[userId] || {
    totalShareCents: 0,
    totalPaidCents: 0,
    settlementPaidCents: 0,
    settlementReceivedCents: 0,
    balanceCents: 0,
    netBalanceCents: 0
  };

  return {
    ...memberObject,
    totalShare: fromCents(balance.totalShareCents),
    totalPaid: fromCents(balance.totalPaidCents),
    settlementPaid: fromCents(balance.settlementPaidCents),
    settlementReceived: fromCents(balance.settlementReceivedCents),
    balance: fromCents(balance.balanceCents),
    netBalance: fromCents(balance.netBalanceCents)
  };
});

const calculateGroupSummary = (expenses, settlements, group) => {
  const ledger = buildGroupBalanceLedger(expenses, group.members, settlements);
  const memberBalances = mapMemberBalances(group, ledger);
  const totalExpense = fromCents(expenses.reduce((sum, expense) => sum + toCents(expense.amount), 0));
  const completedSettlements = settlements.filter((settlement) => settlement.status === 'completed');
  const pendingSettlements = settlements.filter((settlement) => settlement.status === 'pending');

  const paidMost = [...memberBalances]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .find((member) => member.totalPaid > 0);
  const owesMost = [...memberBalances]
    .sort((a, b) => a.netBalance - b.netBalance)
    .find((member) => member.netBalance < 0);

  return {
    totalExpense,
    totalMembers: group.members.length,
    totalSettlements: completedSettlements.length,
    pendingSettlements: pendingSettlements.length,
    paidMost: paidMost ? { userId: getUserId(paidMost.user), amount: paidMost.totalPaid } : null,
    owesMost: owesMost ? { userId: getUserId(owesMost.user), amount: Math.abs(owesMost.netBalance) } : null,
    memberBalances,
    groupTotal: totalExpense,
    totalOwed: fromCents(memberBalances
      .filter((member) => member.netBalance < 0)
      .reduce((sum, member) => sum + toCents(Math.abs(member.netBalance)), 0)),
    totalOwedToGroup: fromCents(memberBalances
      .filter((member) => member.netBalance > 0)
      .reduce((sum, member) => sum + toCents(member.netBalance), 0))
  };
};

const calculateGroupBalances = async (groupId) => {
  const group = await Group.findById(groupId).populate('members.user', 'name email avatar');
  if (!group) {
    throw new Error('Group not found');
  }

  const [expenses, settlements] = await Promise.all([
    Expense.find({ groupId }),
    Settlement.find({ groupId })
  ]);

  return calculateGroupSummary(expenses, settlements, group);
};

const calculateDirectNet = (expenses, settlements, fromUserId, toUserId) => {
  let netCents = 0;

  expenses.forEach((expense) => {
    const paidBy = getUserId(expense.paidBy);
    const shares = getExpenseShares(expense);

    if (paidBy === toUserId && shares[fromUserId]) {
      netCents += shares[fromUserId];
    }

    if (paidBy === fromUserId && shares[toUserId]) {
      netCents -= shares[toUserId];
    }
  });

  settlements
    .filter((settlement) => settlement.status === 'completed')
    .forEach((settlement) => {
      const payer = getUserId(settlement.payerId);
      const receiver = getUserId(settlement.receiverId);
      const amountCents = toCents(settlement.amount);

      if (payer === fromUserId && receiver === toUserId) {
        netCents -= amountCents;
      }
      if (payer === toUserId && receiver === fromUserId) {
        netCents += amountCents;
      }
    });

  return fromCents(netCents);
};

module.exports = {
  calculateGroupBalances,
  calculateGroupSummary,
  calculateDirectNet,
  buildGroupBalanceLedger,
  getExpenseShares,
  getExpenseParticipantIds,
  toCents,
  fromCents
};
