const Greeting = require('../models/Greeting');
const FallbackRule = require('../models/FallbackRule');
const RuleVersion = require('../models/RuleVersion');
const AuditLog = require('../models/AuditLog');

const generateRegex = (aliases) => {
  if (!aliases || aliases.length === 0) return '';
  
  const processAlias = (alias) => {
    return alias.split('').map(char => {
      if (char === ' ') return '\\s+';
      const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `${escaped}+`;
    }).join('');
  };

  const regexParts = aliases.map(processAlias);
  return `(${regexParts.join('|')})`;
};


const createVersion = async (ruleId, ruleType, versionData, changes, userId) => {
  const lastVersion = await RuleVersion.findOne({ ruleId }).sort({ versionNumber: -1 });
  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
  
  await RuleVersion.create({
    ruleId,
    ruleType,
    versionData,
    changes,
    versionNumber,
    createdBy: userId
  });
};

const logAudit = async (action, entityType, entityId, details, userId) => {
  await AuditLog.create({
    action,
    entityType,
    entityId,
    details,
    performedBy: userId
  });
};

const triggerTrainingJob = async () => {
  // Mock training job logic - in reality, it interacts with training queues
  console.log('Training job triggered to update intent cache and regex engine.');
};

module.exports = {
  generateRegex,
  createVersion,
  logAudit,
  triggerTrainingJob
};
