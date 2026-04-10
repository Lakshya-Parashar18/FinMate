import express from 'express';
import { getInsights, getChatResponse } from '../controllers/insightController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getInsights);
router.post('/chat', protect, getChatResponse);

export default router;
