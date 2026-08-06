import Anomaly from '../models/Anomaly.js';
import Transaction from '../models/Transaction.js';
import asyncHandler from 'express-async-handler';
import * as aiService from '../utils/aiService.js';
import logger from '../utils/logger.js';

// Helper function to run detect and upsert Anomaly record in database
const detectAndSaveAnomaly = async (userId, transactionId) => {
    try {
        const result = await aiService.checkAnomaly(userId, transactionId);
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Save/update anomaly record in database
        const anomalyRecord = await Anomaly.findOneAndUpdate(
            { transaction: transactionId },
            {
                user: userId,
                isAnomaly: result.isAnomaly,
                anomalyScore: result.anomalyScore,
                severity: result.severity,
                reasons: result.reasons
            },
            { upsert: true, new: true }
        );
        
        return anomalyRecord;
    } catch (err) {
        logger.error(`Anomaly detection execution failed for transaction ${transactionId}:`, err);
        throw err;
    }
};

// @desc    Perform live anomaly check on a transaction
// @route   POST /api/ai/anomaly/check
// @access  Private
const checkAnomaly = asyncHandler(async (req, res) => {
    const { transactionId } = req.body;
    const userId = req.user._id;

    if (!transactionId) {
        return res.status(400).json({ error: 'Please provide transactionId' });
    }

    // Verify transaction exists and belongs to user
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.user.toString() !== userId.toString()) {
        return res.status(401).json({ error: 'User not authorized to scan this transaction' });
    }

    try {
        const anomalyRecord = await detectAndSaveAnomaly(userId, transactionId);
        res.json(anomalyRecord);
    } catch (err) {
        logger.error('Anomaly scan error:', err);
        res.status(500).json({ error: err.message || 'Anomaly scan execution failed' });
    }
});

// @desc    Get anomaly status for a transaction
// @route   GET /api/ai/anomaly/:transactionId
// @access  Private
const getAnomaly = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const userId = req.user._id;

    // Verify transaction exists and belongs to user
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.user.toString() !== userId.toString()) {
        return res.status(401).json({ error: 'User not authorized to access this anomaly record' });
    }

    try {
        let anomalyRecord = await Anomaly.findOne({ transaction: transactionId });
        
        // If it doesn't exist yet, run scanning on the fly
        if (!anomalyRecord) {
            logger.info(`Anomaly record missing for transaction ${transactionId} - running scan now...`);
            anomalyRecord = await detectAndSaveAnomaly(userId, transactionId);
        }
        
        res.json(anomalyRecord);
    } catch (err) {
        logger.error(`Fetch anomaly error for transaction ${transactionId}:`, err);
        res.status(500).json({ error: err.message || 'Failed to fetch anomaly record' });
    }
});

export {
    detectAndSaveAnomaly,
    checkAnomaly,
    getAnomaly
};
