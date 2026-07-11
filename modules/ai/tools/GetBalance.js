const ITool = require('./ITool');
const Group = require('../../../src/models/Group');
const User = require('../../../src/models/User');
const balanceService = require('../../../src/services/balanceService');

class GetBalance extends ITool {
  constructor() {
    super();
    this.name = 'GetBalance';
    this.description = 'Fetches the user current overall balance, total groups they are in, pending settlement amounts, and net balance for specific groups. ALWAYS use this tool when the user asks about their balance, owes, or group details.';
    this.schema = {
      type: 'object',
      properties: {}
    };
  }

  async execute(params, context) {
    const userId = context.userId;
    if (!userId || userId === 'anonymous') {
      return { error: 'User is not logged in or userId is missing from context.' };
    }

    try {
      console.log(`[Tool: GetBalance] Querying DB for user: ${userId}`);
      
      const user = await User.findById(userId).select('name email');
      
      // Get all groups the user is in
      const groups = await Group.find({ 'members.user': userId });
      const groupCount = groups.length;
      
      let totalOwes = 0;
      let totalOwedToUser = 0;
      let groupDetails = [];

      for (const group of groups) {
        try {
          const summary = await balanceService.calculateGroupBalances(group._id);
          const memberBalance = summary.memberBalances.find(m => m.user._id.toString() === userId.toString());
          
          if (memberBalance) {
            // netBalance < 0 means user owes money. netBalance > 0 means user is owed money.
            if (memberBalance.netBalance < 0) {
              totalOwes += Math.abs(memberBalance.netBalance);
            } else if (memberBalance.netBalance > 0) {
              totalOwedToUser += memberBalance.netBalance;
            }

            groupDetails.push({
              groupName: group.name,
              netBalance: memberBalance.netBalance,
              totalPaidByYou: memberBalance.totalPaid,
              yourTotalShare: memberBalance.totalShare
            });
          }
        } catch (err) {
          console.error(`[Tool: GetBalance] Error calculating for group ${group._id}:`, err);
        }
      }

      return {
        userName: user ? user.name : 'Unknown',
        totalGroups: groupCount,
        pendingAmountToPay: totalOwes,
        pendingAmountToReceive: totalOwedToUser,
        currency: 'INR',
        groupBreakdown: groupDetails
      };
    } catch (error) {
      console.error('[Tool: GetBalance] Error:', error);
      return { error: 'Failed to fetch balance from database.' };
    }
  }
}
module.exports = GetBalance;