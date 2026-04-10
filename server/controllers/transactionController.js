import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// @desc    Get all transactions for logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    // Basic query for user's transactions, sorted by date descending
    const query = { user: req.user._id };

    // Filtering (optional, add more as needed from frontend)
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    let transactionsQuery = Transaction.find(query).sort({ date: -1, createdAt: -1 });
    
    if (req.query.limit) {
      transactionsQuery = transactionsQuery.limit(parseInt(req.query.limit));
    }

    const transactions = await transactionsQuery;
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  const { date, description, category, amount, type } = req.body;

  if (!description || !category || amount === undefined || !type) {
    return res.status(400).json({ message: 'Please provide description, category, amount, and type' });
  }

  try {
    const transaction = new Transaction({
      user: req.user._id,
      date: date ? new Date(date) : new Date(), // Use provided date or default to now
      description,
      category,
      amount: parseFloat(amount),
      type,
    });

    const createdTransaction = await transaction.save();
    res.status(201).json(createdTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Server error creating transaction' });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { date, description, category, amount, type } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
  }

  try {
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction belongs to the logged-in user
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to update this transaction' });
    }

    // Update fields if provided
    transaction.date = date ? new Date(date) : transaction.date;
    transaction.description = description || transaction.description;
    transaction.category = category || transaction.category;
    transaction.amount = amount !== undefined ? parseFloat(amount) : transaction.amount;
    transaction.type = type || transaction.type;

    const updatedTransaction = await transaction.save();
    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error updating transaction' });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
  }

  try {
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction belongs to the logged-in user
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this transaction' });
    }

    await transaction.deleteOne(); // Use deleteOne() in Mongoose 6+

    res.status(200).json({ message: 'Transaction removed successfully', id: id });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error deleting transaction' });
  }
};

export {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
}; 