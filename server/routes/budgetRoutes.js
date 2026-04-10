import express from 'express';
import {
  getBudget,
  setBudget
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply the 'protect' middleware to all budget routes
router.use(protect);

// Define routes
router.route('/')
  .get(getBudget)   // GET /api/budgets?month=M&year=YYYY
  .post(setBudget);  // POST /api/budgets

// Note: If you needed routes for specific budget categories or periods by ID,
// you might add router.route('/:id') later.

export default router; 