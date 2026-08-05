import Circle from '../models/Circle.js';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';

// Helper to format activity timestamps
const formatTimeAgo = () => {
  return new Date().toISOString();
};

// ─────────────────────────────────────────────────────────────────────────────
// CIRCLE CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get my circles
// @route   GET /api/circles
// @access  Private
export const getCircles = async (req, res) => {
  try {
    const circles = await Circle.find({ members: req.user._id })
      .populate('members', 'name username email bio')
      .sort({ updatedAt: -1 });
    res.json(circles);
  } catch (error) {
    console.error('Error fetching circles:', error);
    res.status(500).json({ message: 'Server error fetching circles' });
  }
};

// @desc    Create a collaborative circle
// @route   POST /api/circles
// @access  Private
export const createCircle = async (req, res) => {
  try {
    const { name, description, icon, themeColor, members } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Circle name is required' });
    }

    // Prepare members: must include 'you' (req.user._id)
    const memberIds = new Set([req.user._id.toString()]);
    if (Array.isArray(members)) {
      members.forEach(id => memberIds.add(id.toString()));
    }

    const uniqueMembers = Array.from(memberIds);

    const newCircle = new Circle({
      name,
      description: description || 'Collaborative finance circle.',
      icon: icon || '✈',
      themeColor: themeColor || '#f59e0b',
      coverGradient: `linear-gradient(135deg, ${themeColor || '#f59e0b'}, #1e293b)`,
      members: uniqueMembers,
      budget: {
        limit: 1000,
        spent: 0,
        history: [{ month: 'Jul', spent: 0 }],
        breakdown: []
      },
      goals: [],
      challenges: [],
      expenses: [],
      activity: [
        {
          id: `act_${Date.now()}`,
          type: 'system',
          message: `Circle "${name}" created`,
          time: new Date().toISOString(),
          color: 'green'
        }
      ],
      lastActive: new Date().toISOString()
    });

    const savedCircle = await newCircle.save();
    const populatedCircle = await Circle.findById(savedCircle._id).populate('members', 'name username email bio');

    res.status(201).json(populatedCircle);
  } catch (error) {
    console.error('Error creating circle:', error);
    res.status(500).json({ message: 'Server error creating circle' });
  }
};

// @desc    Get single circle detail
// @route   GET /api/circles/:id
// @access  Private
export const getCircleById = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id).populate('members', 'name username email bio');
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Ensure requesting user is a member
    const isMember = circle.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: not a member of this circle' });
    }

    res.json(circle);
  } catch (error) {
    console.error('Error fetching circle detail:', error);
    res.status(500).json({ message: 'Server error fetching circle details' });
  }
};

// @desc    Update circle details (name, desc, themeColor)
// @route   PUT /api/circles/:id
// @access  Private
export const updateCircle = async (req, res) => {
  try {
    const { name, description, themeColor } = req.body;
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Ensure member
    if (!circle.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) circle.name = name;
    if (description !== undefined) circle.description = description;
    if (themeColor) {
      circle.themeColor = themeColor;
      circle.coverGradient = `linear-gradient(135deg, ${themeColor}, #1e293b)`;
    }

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error updating circle:', error);
    res.status(500).json({ message: 'Server error updating circle' });
  }
};

// @desc    Delete circle
// @route   DELETE /api/circles/:id
// @access  Private
export const deleteCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Ensure member
    if (!circle.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Circle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Circle workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting circle:', error);
    res.status(500).json({ message: 'Server error deleting circle' });
  }
};

// @desc    Leave circle
// @route   POST /api/circles/:id/leave
// @access  Private
export const leaveCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Ensure member
    const memberIndex = circle.members.indexOf(req.user._id);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'You are not a member of this circle' });
    }

    // Remove user
    circle.members.splice(memberIndex, 1);

    if (circle.members.length === 0) {
      // If last member, delete circle
      await Circle.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Circle deleted as you were the last member' });
    }

    // Add activity log
    circle.activity.unshift({
      id: `act_${Date.now()}`,
      type: 'system',
      message: `${req.user.name} left the circle`,
      time: new Date().toISOString(),
      color: 'red'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    res.json({ message: 'You have left the circle' });
  } catch (error) {
    console.error('Error leaving circle:', error);
    res.status(500).json({ message: 'Server error leaving circle' });
  }
};

// @desc    Add expense to circle
// @route   POST /api/circles/:id/expenses
// @access  Private
export const addExpense = async (req, res) => {
  try {
    const { title, amount, category, paidById, splitType, splits, members } = req.body;
    if (!title || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid title and amount are required' });
    }

    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Add new expense subdocument
    const newExpense = {
      id: `e_${Date.now()}`,
      title,
      amount: parseFloat(amount),
      category: category || 'Food',
      paidById: paidById || 'you',
      date: new Date().toISOString().split('T')[0],
      splitType: splitType || 'equal',
      splits: splits || {},
      members: members || []
    };

    circle.expenses.unshift(newExpense);

    // Update budget spent
    circle.budget.spent += newExpense.amount;

    // Recompute category breakdown
    const breakdownMap = {};
    circle.expenses.forEach(exp => {
      if (exp.category === 'Settlement') return;
      breakdownMap[exp.category] = (breakdownMap[exp.category] || 0) + exp.amount;
    });

    const categoryColors = {
      Food: '#ec4899',
      Rent: '#10b981',
      Stay: '#f59e0b',
      Flights: '#3b82f6',
      Utilities: '#8b5cf6',
      Miscellaneous: '#64748b'
    };

    circle.budget.breakdown = Object.entries(breakdownMap).map(([name, val]) => ({
      name,
      value: val,
      color: categoryColors[name] || '#3b82f6'
    }));

    // Alert if exceeded
    const isExceeded = circle.budget.spent > circle.budget.limit;
    const payerName = paidById === 'you' ? 'Lakshya' : (await User.findById(paidById))?.name.split(' ')[0] || 'Member';

    circle.activity.unshift({
      id: `act_${Date.now()}`,
      type: 'expense',
      message: `${payerName} added "${title}" ($${parseFloat(amount).toFixed(2)})`,
      time: new Date().toISOString(),
      color: 'green'
    });

    if (isExceeded) {
      circle.activity.unshift({
        id: `act_b_${Date.now()}`,
        type: 'budget',
        message: `⚠️ Circle budget exceeded limit of $${circle.budget.limit}!`,
        time: new Date().toISOString(),
        color: 'red'
      });
    }

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ message: 'Server error adding expense' });
  }
};

// @desc    Delete expense from circle
// @route   DELETE /api/circles/:id/expenses/:eid
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const expenseIndex = circle.expenses.findIndex(e => e.id === req.params.eid);
    if (expenseIndex === -1) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const removedExpense = circle.expenses[expenseIndex];
    circle.expenses.splice(expenseIndex, 1);

    // Deduct from budget spent
    circle.budget.spent = Math.max(0, circle.budget.spent - removedExpense.amount);

    // Recompute category breakdown
    const breakdownMap = {};
    circle.expenses.forEach(exp => {
      if (exp.category === 'Settlement') return;
      breakdownMap[exp.category] = (breakdownMap[exp.category] || 0) + exp.amount;
    });

    const categoryColors = {
      Food: '#ec4899',
      Rent: '#10b981',
      Stay: '#f59e0b',
      Flights: '#3b82f6',
      Utilities: '#8b5cf6',
      Miscellaneous: '#64748b'
    };

    circle.budget.breakdown = Object.entries(breakdownMap).map(([name, val]) => ({
      name,
      value: val,
      color: categoryColors[name] || '#3b82f6'
    }));

    circle.activity.unshift({
      id: `act_del_${Date.now()}`,
      type: 'expense',
      message: `Expense "${removedExpense.title}" deleted`,
      time: new Date().toISOString(),
      color: 'red'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Server error deleting expense' });
  }
};

// @desc    Add savings goal
// @route   POST /api/circles/:id/goals
// @access  Private
export const addGoal = async (req, res) => {
  try {
    const { title, target, deadline } = req.body;
    if (!title || !target || parseFloat(target) <= 0) {
      return res.status(400).json({ message: 'Valid goal title and target are required' });
    }

    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const newGoal = {
      id: `g_${Date.now()}`,
      title,
      target: parseFloat(target),
      current: 0,
      deadline: deadline || 'No deadline',
      contributor: 'Shared'
    };

    circle.goals.push(newGoal);

    circle.activity.unshift({
      id: `act_g_${Date.now()}`,
      type: 'goal',
      message: `New goal "${title}" added`,
      time: new Date().toISOString(),
      color: 'blue'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error adding goal:', error);
    res.status(500).json({ message: 'Server error adding goal' });
  }
};

// @desc    Contribute to goal
// @route   PUT /api/circles/:id/goals/:gid
// @access  Private
export const contributeGoal = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Contribution amount must be greater than zero' });
    }

    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const goal = circle.goals.find(g => g.id === req.params.gid);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const prevCompleted = goal.current >= goal.target;
    goal.current = Math.min(goal.target, goal.current + parseFloat(amount));
    const nowCompleted = goal.current >= goal.target;

    circle.activity.unshift({
      id: `act_c_${Date.now()}`,
      type: 'goal',
      message: `${req.user.name} contributed $${parseFloat(amount).toFixed(2)} to "${goal.title}"`,
      time: new Date().toISOString(),
      color: 'blue'
    });

    if (nowCompleted && !prevCompleted) {
      circle.activity.unshift({
        id: `act_gc_${Date.now()}`,
        type: 'system',
        message: `🎉 Shared Goal "${goal.title}" has been fully funded!`,
        time: new Date().toISOString(),
        color: 'green'
      });
    }

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error contributing to goal:', error);
    res.status(500).json({ message: 'Server error contributing to goal' });
  }
};

// @desc    Delete savings goal
// @route   DELETE /api/circles/:id/goals/:gid
// @access  Private
export const deleteGoal = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const goalIndex = circle.goals.findIndex(g => g.id === req.params.gid);
    if (goalIndex === -1) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const removedGoal = circle.goals[goalIndex];
    circle.goals.splice(goalIndex, 1);

    circle.activity.unshift({
      id: `act_gdel_${Date.now()}`,
      type: 'goal',
      message: `Goal "${removedGoal.title}" deleted`,
      time: new Date().toISOString(),
      color: 'red'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: 'Server error deleting goal' });
  }
};

// @desc    Add member to circle
// @route   POST /api/circles/:id/members
// @access  Private
export const addMemberToCircle = async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ message: 'Member ID is required' });
    }

    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    if (circle.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is already a member of this circle' });
    }

    const targetUser = await User.findById(memberId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User to add not found' });
    }

    circle.members.push(memberId);

    circle.activity.unshift({
      id: `act_add_${Date.now()}`,
      type: 'system',
      message: `${targetUser.name} joined the circle`,
      time: new Date().toISOString(),
      color: 'green'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error adding member to circle:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
};

// @desc    Remove member from circle
// @route   DELETE /api/circles/:id/members/:uid
// @access  Private
export const removeMemberFromCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const targetUserId = req.params.uid;
    const idx = circle.members.indexOf(targetUserId);
    if (idx === -1) {
      return res.status(400).json({ message: 'User is not a member of this circle' });
    }

    const targetUser = await User.findById(targetUserId);
    circle.members.splice(idx, 1);

    circle.activity.unshift({
      id: `act_rm_${Date.now()}`,
      type: 'system',
      message: `${targetUser ? targetUser.name : 'A member'} was removed from the circle`,
      time: new Date().toISOString(),
      color: 'red'
    });

    circle.lastActive = new Date().toISOString();
    await circle.save();

    const populated = await Circle.findById(circle._id).populate('members', 'name username email bio');
    res.json(populated);
  } catch (error) {
    console.error('Error removing member from circle:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// FRIENDSHIP & USER SEARCH CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Search users by username
// @route   GET /api/circles/users/search
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const cleanedQuery = query.toLowerCase().replace(/^@/, '').trim();

    // Find users with matching username (excluding self)
    const matchedUsers = await User.find({
      username: { $regex: cleanedQuery, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('name username email bio');

    res.json(matchedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
};

// @desc    Get accepted friends list
// @route   GET /api/circles/friends
// @access  Private
export const getFriends = async (req, res) => {
  try {
    // Find accepted friendships involving req.user
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user._id, status: 'accepted' },
        { recipient: req.user._id, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name username email bio');

    // Extract the OTHER user from the friendship pairs
    const friendList = friendships.map(f => {
      const otherUser = f.requester._id.toString() === req.user._id.toString() ? f.recipient : f.requester;
      return {
        id: otherUser._id,
        _id: otherUser._id,
        name: otherUser.name,
        username: otherUser.username,
        email: otherUser.email,
        bio: otherUser.bio || 'Personal finance enthusiast.',
        status: 'online', // Visual mock property
        mutualCircles: 0,
        dateJoined: 'Jan 2026',
        badges: ['Saver']
      };
    });

    res.json(friendList);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Server error fetching friends' });
  }
};

// @desc    Get pending incoming/outgoing friend requests
// @route   GET /api/circles/friends/requests
// @access  Private
export const getFriendRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user._id,
      status: 'pending'
    }).populate('requester', 'name username email bio');

    const formattedRequests = requests.map(r => ({
      id: r._id,
      _id: r._id,
      name: r.requester.name,
      username: r.requester.username,
      email: r.requester.email,
      type: 'incoming'
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Server error fetching friend requests' });
  }
};

// @desc    Send friend request by username
// @route   POST /api/circles/friends/request
// @access  Private
export const sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const cleanedUsername = username.toLowerCase().replace(/^@/, '').trim();

    // Find user
    const recipientUser = await User.findOne({ username: cleanedUsername });
    if (!recipientUser) {
      return res.status(404).json({ message: `User @${cleanedUsername} not found` });
    }

    if (recipientUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: req.user._id }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user' });
      } else if (existingFriendship.status === 'pending') {
        if (existingFriendship.requester.toString() === req.user._id.toString()) {
          return res.status(400).json({ message: 'Friend request is already pending' });
        } else {
          return res.status(400).json({ message: 'A pending friend request from this user already exists' });
        }
      } else {
        // rejected request - allow sending again
        existingFriendship.status = 'pending';
        existingFriendship.requester = req.user._id;
        existingFriendship.recipient = recipientUser._id;
        await existingFriendship.save();
        return res.json({ message: 'Friend request sent successfully' });
      }
    }

    const newFriendship = new Friendship({
      requester: req.user._id,
      recipient: recipientUser._id,
      status: 'pending'
    });

    await newFriendship.save();
    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Server error sending friend request' });
  }
};

// @desc    Respond to friend request (accept/reject)
// @route   PUT /api/circles/friends/request/:id
// @access  Private
export const respondFriendRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accept or reject' });
    }

    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Ensure recipient is req.user
    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }

    friendship.status = action === 'accept' ? 'accepted' : 'rejected';
    await friendship.save();

    res.json({ message: `Friend request ${friendship.status}` });
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ message: 'Server error responding to request' });
  }
};

// @desc    Remove friend
// @route   DELETE /api/circles/friends/:id
// @access  Private
export const removeFriend = async (req, res) => {
  try {
    const friendId = req.params.id;

    // Delete friendship document
    const deleted = await Friendship.findOneAndDelete({
      $or: [
        { requester: req.user._id, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: req.user._id, status: 'accepted' }
      ]
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Friendship record not found' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Server error removing friend' });
  }
};
