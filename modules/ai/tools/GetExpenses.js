const ITool = require('./ITool');

class GetExpenses extends ITool {
  constructor() {
    super();
    this.name = 'GetExpenses';
    this.description = 'Fetches recent expenses for the user.';
    this.schema = {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Number of expenses to fetch' }
      }
    };
  }

  async execute(params, context) {
    console.log('[Tool: GetExpenses] Querying database for expenses');
    // Mock DB response
    return [
      { id: 1, amount: 2800, category: 'Travel', date: '2023-10-01' },
      { id: 2, amount: 1500, category: 'Food', date: '2023-10-05' }
    ];
  }
}
module.exports = GetExpenses;