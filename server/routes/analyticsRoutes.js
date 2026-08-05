import express from 'express';
import { getAnalyticsData, getSpendingForecast, getMonthlySummary } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route GET /api/analytics/summary
// @desc Get AI-generated monthly financial summary
router.route('/summary').get(protect, getMonthlySummary);

// @route GET /api/analytics/forecast
// @desc Get AI-powered spending forecast
router.route('/forecast').get(protect, getSpendingForecast);

// @route GET /api/analytics
// @desc Get aggregated analytics data, accepts startDate/endDate query params
router.route('/').get(protect, getAnalyticsData);

export default router;