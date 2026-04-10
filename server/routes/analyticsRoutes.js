import express from 'express';
import { getAnalyticsData } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route GET /api/analytics
// @desc Get aggregated analytics data, accepts startDate/endDate query params
router.route('/').get(protect, getAnalyticsData);

export default router; 