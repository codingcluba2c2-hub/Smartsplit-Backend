const FallbackRule = require('../models/FallbackRule');
const adminRuleService = require('../services/adminRuleService');

const getFallbacks = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort, search, status } = req.query;
    const query = {};
    
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const fallbacks = await FallbackRule.find(query)
      .sort(sort ? { [sort]: 1 } : { createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
      
    const total = await FallbackRule.countDocuments(query);
    
    res.json({
      data: fallbacks,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createFallback = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user?._id || null; 
    data.createdBy = userId;
    
    const fallback = await FallbackRule.create(data);
    
    await adminRuleService.createVersion(fallback._id, 'FallbackRule', fallback.toObject(), { type: 'CREATE' }, userId);
    await adminRuleService.logAudit('CREATE', 'FallbackRule', fallback._id, data, userId);
    
    res.status(201).json(fallback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateFallback = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const userId = req.user?._id || null;
    data.updatedBy = userId;
    
    const oldFallback = await FallbackRule.findById(id);
    if (!oldFallback) return res.status(404).json({ error: 'Not found' });
    
    const fallback = await FallbackRule.findByIdAndUpdate(id, data, { new: true });
    
    await adminRuleService.createVersion(fallback._id, 'FallbackRule', fallback.toObject(), { type: 'UPDATE' }, userId);
    await adminRuleService.logAudit('UPDATE', 'FallbackRule', fallback._id, data, userId);
    
    res.json(fallback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteFallback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || null;
    
    const fallback = await FallbackRule.findByIdAndUpdate(id, { status: 'disabled', updatedBy: userId }, { new: true });
    
    await adminRuleService.logAudit('DELETE', 'FallbackRule', fallback._id, { type: 'SOFT_DELETE' }, userId);
    
    res.json(fallback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleFallbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?._id || null;
    
    const fallback = await FallbackRule.findByIdAndUpdate(id, { status, updatedBy: userId }, { new: true });
    await adminRuleService.logAudit(status.toUpperCase(), 'FallbackRule', fallback._id, { status }, userId);
    
    res.json(fallback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFallbacks,
  createFallback,
  updateFallback,
  deleteFallback,
  toggleFallbackStatus
};
