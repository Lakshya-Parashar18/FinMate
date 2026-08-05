import Goal from '../models/Goal.js';

// @desc    Get all savings goals for the user
// @route   GET /api/goals
// @access  Private
export const getGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    console.error('Error fetching savings goals:', err);
    res.status(500).json({ message: 'Server error loading goals.' });
  }
};

// @desc    Create a new savings goal
// @route   POST /api/goals
// @access  Private
export const createGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, targetAmount, currentAmount, targetDate, category } = req.body;

    if (!name || targetAmount === undefined || !targetDate) {
      return res.status(400).json({ message: 'Please provide all required fields (name, targetAmount, targetDate).' });
    }

    const newGoal = new Goal({
      user: userId,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      targetDate: new Date(targetDate),
      category: category || 'General'
    });

    const savedGoal = await newGoal.save();
    res.status(201).json(savedGoal);
  } catch (err) {
    console.error('Error creating savings goal:', err);
    res.status(500).json({ message: 'Server error creating goal.' });
  }
};

// @desc    Update an existing savings goal
// @route   PUT /api/goals/:id
// @access  Private
export const updateGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { name, targetAmount, currentAmount, targetDate, category } = req.body;

    let goal = await Goal.findOne({ _id: id, user: userId });
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found or unauthorized.' });
    }

    if (name !== undefined) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined) goal.currentAmount = Number(currentAmount);
    if (targetDate !== undefined) goal.targetDate = new Date(targetDate);
    if (category !== undefined) goal.category = category;

    const updatedGoal = await goal.save();
    res.json(updatedGoal);
  } catch (err) {
    console.error('Error updating savings goal:', err);
    res.status(500).json({ message: 'Server error updating goal.' });
  }
};

// @desc    Delete a savings goal
// @route   DELETE /api/goals/:id
// @access  Private
export const deleteGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const goal = await Goal.findOneAndDelete({ _id: id, user: userId });
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found or unauthorized.' });
    }

    res.json({ message: 'Savings goal deleted successfully.' });
  } catch (err) {
    console.error('Error deleting savings goal:', err);
    res.status(500).json({ message: 'Server error deleting goal.' });
  }
};
