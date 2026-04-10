import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route GET /api/dashboard/summary
router.route('/summary').get(protect, getDashboardSummary);

export default router; 