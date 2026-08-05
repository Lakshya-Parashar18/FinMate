import express from 'express';
import {
    getAiForecast,
    categorizeTransaction,
    batchCategorizeTransactions,
    getFinancialHealth,
    getAiPlatformStatus,
    submitAiFeedback
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/forecast').get(protect, getAiForecast);
router.route('/categorize').post(protect, categorizeTransaction);
router.route('/categorize/batch').post(protect, batchCategorizeTransactions);
router.route('/financial-health').get(protect, getFinancialHealth);
router.route('/status').get(protect, getAiPlatformStatus);
router.route('/feedback').post(protect, submitAiFeedback);

export default router;
