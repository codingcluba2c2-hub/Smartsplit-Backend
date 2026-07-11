class ITool {
  constructor() {
    this.name = 'UnknownTool';
    this.description = 'No description';
    this.schema = {};
  }
  async execute(params, context) {
    throw new Error('Not Implemented');
  }
}
module.exports = ITool;