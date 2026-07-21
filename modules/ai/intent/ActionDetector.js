const IntentResult = require('../dto/IntentResult');

class ActionDetector {
  constructor() {
    this.actionMap = [
      {
        intent: 'ACTION_CREATE_GROUP',
        keywords: ['create group', 'new group', 'add group', 'group banana hai', 'trip create', 'new expense group', 'family group', 'office group']
      },
      {
        intent: 'ACTION_ADD_EXPENSE',
        keywords: ['add expense', 'new expense', 'expense add karo', 'bill add', 'restaurant bill', 'hotel bill', 'travel expense', 'shopping expense']
      },
      {
        intent: 'ACTION_SETTLEMENT',
        keywords: ['settle', 'settlement', 'pay request', 'request settlement', 'send payment']
      },
      {
        intent: 'ACTION_REPORTS',
        keywords: ['reports', 'report', 'monthly report', 'group report', 'financial report', 'generate report']
      },
      {
        intent: 'ACTION_RECENT_EXPENSES',
        keywords: ['recent expenses', 'recent', 'recent history', 'expense history']
      },
      {
        intent: 'ACTION_NET_BALANCE',
        keywords: ['my balance', 'net balance', 'how much i owe', 'how much i should receive', 'my expense', 'my dues', 'my pending']
      },
      {
        intent: 'ACTION_WHAT_CAN_YOU_DO',
        keywords: ['what can you do', 'features', 'help', 'what are your features', 'show menu', 'menu', 'options']
      }
    ];
  }

  detect(text) {
    const lowerText = text.toLowerCase().trim();
    
    for (const action of this.actionMap) {
      if (action.keywords.some(keyword => lowerText.includes(keyword))) {
        return new IntentResult(action.intent, 1.0, `Matched action keyword for ${action.intent}`);
      }
    }

    return new IntentResult('Unknown', 0, 'No action detected');
  }
}

module.exports = new ActionDetector();
