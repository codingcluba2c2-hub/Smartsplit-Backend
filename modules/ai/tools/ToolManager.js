const GetBalance = require('./GetBalance');
const GetExpenses = require('./GetExpenses');

class ToolManager {
  constructor() {
    this.tools = new Map();
    this.registerTool(new GetBalance());
    this.registerTool(new GetExpenses());
  }

  registerTool(toolInstance) {
    this.tools.set(toolInstance.name, toolInstance);
  }

  getToolSchemas() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.schema
    }));
  }

  async executeTool(name, params, context) {
    const tool = this.tools.get(name);
    if (!tool) return { error: `Tool ${name} not found. Please use one of the available tools: ${Array.from(this.tools.keys()).join(', ')}` };
    return await tool.execute(params, context);
  }

  async executeParallel(toolCalls, context) {
    const promises = toolCalls.map(call => this.executeTool(call.name, call.arguments, context));
    return Promise.all(promises);
  }
}
module.exports = new ToolManager();