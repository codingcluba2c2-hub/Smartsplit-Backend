const Greeting = require('../models/Greeting');
const FallbackRule = require('../models/FallbackRule');
const adminRuleService = require('../services/adminRuleService');

const getDashboardStats = async (req, res) => {
  try {
    const totalGreetings = await Greeting.countDocuments();
    const enabledGreetings = await Greeting.countDocuments({ status: 'enabled' });
    const totalFallbacks = await FallbackRule.countDocuments();
    const enabledFallbacks = await FallbackRule.countDocuments({ status: 'enabled' });
    const escalationRules = await FallbackRule.countDocuments({ 'escalationSettings.enabled': true });
    
    // In a real app we'd query today's logs/analytics, assuming total for now
    const todaysTriggerCount = await Greeting.aggregate([
      { $group: { _id: null, total: { $sum: "$triggerCount" } } }
    ]);
    const topGreeting = await Greeting.findOne().sort({ triggerCount: -1 }).select('name triggerCount');
    const topFallback = await FallbackRule.findOne().sort({ usageCount: -1 }).select('name usageCount');

    res.json({
      totalGreetings,
      enabledGreetings,
      totalFallbacks,
      enabledFallbacks,
      escalationRules,
      todaysTriggerCount: todaysTriggerCount[0]?.total || 0,
      averageConfidence: 78, // Mock metric
      topGreeting,
      topFallback,
      mostUsedAlias: 'hello' // Mock metric
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getGreetings = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort, search, status, language, channel } = req.query;
    const query = {};
    
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status) query.status = status;
    if (language) query.languages = language;
    if (channel) query.channel = channel;

    const skip = (page - 1) * limit;
    const greetings = await Greeting.find(query)
      .sort(sort ? { [sort]: 1 } : { createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
      
    const total = await Greeting.countDocuments(query);
    
    res.json({
      data: greetings,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createGreeting = async (req, res) => {
  try {
    const data = req.body;
    if (!data.regexGenerated || data.regexGenerated.trim() === '') {
      data.regexGenerated = adminRuleService.generateRegex(data.aliases || []);
    }
    // Assuming req.user is set by auth middleware
    const userId = req.user?._id || null; 
    data.createdBy = userId;
    
    const greeting = await Greeting.create(data);

    
    await adminRuleService.createVersion(greeting._id, 'Greeting', greeting.toObject(), { type: 'CREATE' }, userId);
    await adminRuleService.logAudit('CREATE', 'Greeting', greeting._id, data, userId);
    await adminRuleService.triggerTrainingJob();
    
    res.status(201).json(greeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateGreeting = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    if (!data.regexGenerated || data.regexGenerated.trim() === '') {
      data.regexGenerated = adminRuleService.generateRegex(data.aliases || []);
    }

    
    const userId = req.user?._id || null;
    data.updatedBy = userId;
    
    const oldGreeting = await Greeting.findById(id);
    if (!oldGreeting) return res.status(404).json({ error: 'Not found' });
    
    const greeting = await Greeting.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    
    await adminRuleService.createVersion(greeting._id, 'Greeting', greeting.toObject(), { type: 'UPDATE' }, userId);
    await adminRuleService.logAudit('UPDATE', 'Greeting', greeting._id, data, userId);
    await adminRuleService.triggerTrainingJob();
    
    res.json(greeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteGreeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || null;
    
    // Soft delete by disabling
    const greeting = await Greeting.findByIdAndUpdate(id, { status: 'disabled', updatedBy: userId }, { returnDocument: 'after' });
    
    await adminRuleService.logAudit('DELETE', 'Greeting', greeting._id, { type: 'SOFT_DELETE' }, userId);
    
    res.json(greeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleGreetingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?._id || null;
    
    const greeting = await Greeting.findByIdAndUpdate(id, { status, updatedBy: userId }, { returnDocument: 'after' });
    await adminRuleService.logAudit(status.toUpperCase(), 'Greeting', greeting._id, { status }, userId);
    
    res.json(greeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const cloneGreeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || null;
    
    const oldGreeting = await Greeting.findById(id).lean();
    if (!oldGreeting) return res.status(404).json({ error: 'Not found' });
    
    delete oldGreeting._id;
    delete oldGreeting.createdAt;
    delete oldGreeting.updatedAt;
    oldGreeting.name = `${oldGreeting.name} (Copy)`;
    oldGreeting.triggerCount = 0;
    oldGreeting.createdBy = userId;
    
    const greeting = await Greeting.create(oldGreeting);
    
    await adminRuleService.createVersion(greeting._id, 'Greeting', greeting.toObject(), { type: 'CLONE' }, userId);
    await adminRuleService.logAudit('CLONE', 'Greeting', greeting._id, {}, userId);
    
    res.status(201).json(greeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testGreeting = async (req, res) => {
  try {
    const { input } = req.body;
    const start = Date.now();
    
    const greetings = await Greeting.find({ status: 'enabled' }).sort({ priority: -1 });
    
    let matchedGreeting = null;
    for (const g of greetings) {
      if (g.regexGenerated) {
        const regex = new RegExp(g.regexGenerated, 'i');
        if (regex.test(input)) {
          matchedGreeting = g;
          break;
        }
      }
    }
    
    const executionTime = Date.now() - start;
    
    if (matchedGreeting) {
      res.json({
        matchedRule: matchedGreeting.name,
        confidence: 95,
        regex: matchedGreeting.regexGenerated,
        alias: input,
        response: matchedGreeting.responseTemplate,
        executionTime: `${executionTime}ms`
      });
    } else {
      res.json({
        matchedRule: null,
        confidence: 0,
        regex: null,
        alias: input,
        response: null,
        executionTime: `${executionTime}ms`
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getGreetings,
  createGreeting,
  updateGreeting,
  deleteGreeting,
  toggleGreetingStatus,
  cloneGreeting,
  testGreeting
};
