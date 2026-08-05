import express from 'express';
import { checkAnomaly, getAnomaly } from '../controllers/anomalyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes for AI anomaly scans and checks
router.route('/check').post(protect, checkAnomaly);
router.route('/:transactionId').get(protect, getAnomaly);

export default router;
