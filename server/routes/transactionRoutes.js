import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply the 'protect' middleware to all routes in this file
router.use(protect);

// Define routes
router.route('/')
  .get(getTransactions)     // GET /api/transactions
  .post(createTransaction);  // POST /api/transactions

router.route('/:id')
  .put(updateTransaction)     // PUT /api/transactions/:id
  .delete(deleteTransaction);  // DELETE /api/transactions/:id

export default router; 