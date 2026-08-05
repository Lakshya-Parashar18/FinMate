import Transaction from '../models/Transaction.js';
import Anomaly from '../models/Anomaly.js';
import { detectAndSaveAnomaly } from './anomalyController.js';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to call AI Gateway synchronously/asynchronously
const callAiGateway = (action, payload) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
    const pythonProcess = spawn('python', [scriptPath, action, JSON.stringify(payload)]);

    let stdoutData = '';
    pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
    pythonProcess.on('close', (code) => {
      if (code !== 0) return resolve(null);
      try {
        const result = JSON.parse(stdoutData.trim());
        resolve(result);
      } catch (err) {
        resolve(null);
      }
    });
  });
};

// @desc    Get all transactions for logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const query = { user: req.user._id };

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

    const txIds = transactions.map(t => t._id);
    const anomalyDocs = await Anomaly.find({ transaction: { $in: txIds } }).lean();
    const anomalyMap = {};
    anomalyDocs.forEach(a => { anomalyMap[a.transaction.toString()] = a; });

    const enriched = transactions.map(t => ({
      ...t.toObject(),
      anomaly: anomalyMap[t._id.toString()] || null
    }));

    res.status(200).json({ transactions: enriched });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  let { date, description, category, amount, type, merchant } = req.body;

  if (!description || amount === undefined || !type) {
    return res.status(400).json({ message: 'Please provide description, amount, and type' });
  }

  try {
    const merchantName = merchant || description;

    // Auto AI Categorization if category is missing or Miscellaneous
    if (!category || category === 'Miscellaneous' || category === 'Uncategorized') {
      const aiResult = await callAiGateway('categorize', {
        merchant: merchantName,
        description: description
      });
      if (aiResult && aiResult.predictedCategory) {
        category = aiResult.predictedCategory;
      } else {
        category = category || 'Miscellaneous';
      }
    }

    const transaction = new Transaction({
      user: req.user._id,
      date: date ? new Date(date) : new Date(),
      description,
      category,
      amount: parseFloat(amount),
      type,
    });

    const createdTransaction = await transaction.save();

    // Scan for anomalies in background
    if (type === 'expense' || parseFloat(amount) < 0) {
      detectAndSaveAnomaly(req.user._id, createdTransaction._id).catch(err => {
        console.error('Background anomaly detection failed:', err);
      });
    }

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
  const { date, description, category, amount, type, merchant } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
  }

  try {
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to update this transaction' });
    }

    // Record user feedback if category was changed
    if (category && category !== transaction.category) {
      callAiGateway('feedback', {
        merchant: merchant || description || transaction.description,
        correct_category: category,
        description: description || transaction.description
      }).catch(err => console.error('Feedback recording failed:', err));
    }

    transaction.date = date ? new Date(date) : transaction.date;
    transaction.description = description || transaction.description;
    transaction.category = category || transaction.category;
    transaction.amount = amount !== undefined ? parseFloat(amount) : transaction.amount;
    transaction.type = type || transaction.type;

    const updatedTransaction = await transaction.save();

    if (updatedTransaction.type === 'expense' || updatedTransaction.amount < 0) {
      detectAndSaveAnomaly(req.user._id, updatedTransaction._id).catch(err => {
        console.error('Background anomaly detection failed:', err);
      });
    }

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

    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this transaction' });
    }

    await transaction.deleteOne();

    await Anomaly.deleteOne({ transaction: id }).catch(err => {
      console.error('Failed to clean up deleted transaction anomaly:', err);
    });

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