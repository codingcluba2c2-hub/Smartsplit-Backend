const mongoose = require('mongoose');
const AdminActivityLog = require('../models/AdminActivityLog');

// Helper to log admin actions
const logActivity = async (adminId, action, targetModel, targetId, details) => {
  try {
    await AdminActivityLog.create({
      adminId,
      action,
      targetModel,
      targetId,
      details,
      ipAddress: '127.0.0.1' // Can extract from req if needed
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const models = mongoose.modelNames();
    const stats = {
      collections: models.length,
      totalDocuments: 0,
      todayInserts: 0,
      todayUpdates: 0,
      users: 0,
      groups: 0,
      expenses: 0,
      settlements: 0
    };

    for (const modelName of models) {
      const Model = mongoose.model(modelName);
      const count = await Model.countDocuments();
      stats.totalDocuments += count;

      if (modelName === 'User') stats.users = count;
      if (modelName === 'Group') stats.groups = count;
      if (modelName === 'Expense') stats.expenses = count;
      if (modelName === 'Settlement') stats.settlements = count;
      
      // We can add today's inserts and updates if timestamps exist, but it's slow to query all
      // Will skip for now to maintain performance.
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

exports.getCollections = async (req, res) => {
  try {
    const models = mongoose.modelNames();
    const collections = await Promise.all(models.map(async (modelName) => {
      const Model = mongoose.model(modelName);
      const count = await Model.countDocuments();
      return {
        name: modelName,
        count
      };
    }));
    
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collections', error: error.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { modelName } = req.params;
    const { page = 1, limit = 50, sortField = 'createdAt', sortOrder = 'desc', search = '' } = req.query;
    
    if (!mongoose.modelNames().includes(modelName)) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const Model = mongoose.model(modelName);
    
    // Basic search setup (very generic, assuming search on string fields if needed)
    let query = {};
    if (search) {
      // Create a global search across all string fields for this schema
      const stringFields = [];
      Model.schema.eachPath((path, schemaType) => {
        if (schemaType.instance === 'String') {
          stringFields.push(path);
        }
      });
      
      if (stringFields.length > 0) {
        query.$or = stringFields.map(field => ({
          [field]: { $regex: search, $options: 'i' }
        }));
      }
    }

    // Pagination and sorting
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const documents = await Model.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean();
    const total = await Model.countDocuments(query);

    res.json({
      documents,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    
    if (!mongoose.modelNames().includes(modelName)) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const Model = mongoose.model(modelName);
    const document = await Model.findById(id).lean();

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.modelNames().includes(modelName)) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const Model = mongoose.model(modelName);
    const originalDoc = await Model.findById(id).lean();
    
    if (!originalDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const updatedDoc = await Model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    
    await logActivity(req.user.id, 'UPDATE_DOCUMENT', modelName, id, { original: originalDoc, updated: updatedDoc });

    res.json(updatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error updating document', error: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    
    if (!mongoose.modelNames().includes(modelName)) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const Model = mongoose.model(modelName);
    const doc = await Model.findById(id);
    
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Try soft delete if the fields exist, otherwise hard delete
    if (Model.schema.paths.isDeleted) {
      doc.isDeleted = true;
      if (Model.schema.paths.deletedAt) doc.deletedAt = new Date();
      if (Model.schema.paths.deletedBy) doc.deletedBy = req.user.id;
      await doc.save();
      await logActivity(req.user.id, 'SOFT_DELETE_DOCUMENT', modelName, id, { title: 'Soft Delete' });
    } else {
      await Model.findByIdAndDelete(id);
      await logActivity(req.user.id, 'HARD_DELETE_DOCUMENT', modelName, id, { title: 'Hard Delete' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

exports.restoreDocument = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    
    if (!mongoose.modelNames().includes(modelName)) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const Model = mongoose.model(modelName);
    const doc = await Model.findById(id);
    
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (Model.schema.paths.isDeleted) {
      doc.isDeleted = false;
      if (Model.schema.paths.deletedAt) doc.deletedAt = undefined;
      if (Model.schema.paths.deletedBy) doc.deletedBy = undefined;
      await doc.save();
      await logActivity(req.user.id, 'RESTORE_DOCUMENT', modelName, id, { title: 'Restore' });
      res.json({ message: 'Document restored successfully', document: doc });
    } else {
      res.status(400).json({ message: 'Schema does not support soft delete' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error restoring document', error: error.message });
  }
};
