const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupById,
  getGroupMembers,
  addMember,
  removeMember,
  getFriends,
  updateGroup,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/friends', getFriends);
router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.get('/:id/members', getGroupMembers);
router.post('/:id/add-member', addMember);
router.delete('/:id/members', removeMember);

module.exports = router;
