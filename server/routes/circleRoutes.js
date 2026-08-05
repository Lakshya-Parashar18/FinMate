import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireVerification } from '../middleware/verificationMiddleware.js';
import {
  getCircles,
  createCircle,
  getCircleById,
  updateCircle,
  deleteCircle,
  leaveCircle,
  addExpense,
  deleteExpense,
  addGoal,
  contributeGoal,
  deleteGoal,
  addMemberToCircle,
  removeMemberFromCircle,
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend
} from '../controllers/circleController.js';

const router = express.Router();

router.use(protect);
router.use(requireVerification);

// Base Circle CRUD
router.route('/')
  .get(getCircles)
  .post(createCircle);

// Friendships and Requests (nested under circle path)
router.route('/friends')
  .get(getFriends);

router.route('/friends/requests')
  .get(getFriendRequests);

router.route('/friends/request')
  .post(sendFriendRequest);

router.route('/friends/request/:id')
  .put(respondFriendRequest);

router.route('/friends/:id')
  .delete(removeFriend);

// User Search for adding friends
router.route('/users/search')
  .get(searchUsers);

// Individual Circle CRUD & Actions
router.route('/:id')
  .get(getCircleById)
  .put(updateCircle)
  .delete(deleteCircle);

router.route('/:id/leave')
  .post(leaveCircle);

router.route('/:id/expenses')
  .post(addExpense);

router.route('/:id/expenses/:eid')
  .delete(deleteExpense);

router.route('/:id/goals')
  .post(addGoal);

router.route('/:id/goals/:gid')
  .put(contributeGoal)
  .delete(deleteGoal);

router.route('/:id/members')
  .post(addMemberToCircle);

router.route('/:id/members/:uid')
  .delete(removeMemberFromCircle);

export default router;
