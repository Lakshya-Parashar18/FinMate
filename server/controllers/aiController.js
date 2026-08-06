import asyncHandler from 'express-async-handler';
import * as aiService from '../utils/aiService.js';
import logger from '../utils/logger.js';

// @desc    Get ML-powered spending forecast
// @route   GET /api/ai/forecast
// @access  Private
const getAiForecast = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    try {
        const result = await aiService.getAiForecast(userId);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json(result);
    } catch (err) {
        logger.error(`Forecast controller error for user ${userId}:`, err);
        res.status(500).json({ error: err.message || 'Forecasting engine failed' });
    }
});

// @desc    Categorize single transaction via AI Gateway
// @route   POST /api/ai/categorize
// @access  Private
const categorizeTransaction = asyncHandler(async (req, res) => {
    try {
        const result = await aiService.categorizeTransaction(req.body);
        res.json(result);
    } catch (error) {
        logger.error('Categorization controller error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Batch categorize transactions via AI Gateway
// @route   POST /api/ai/categorize/batch
// @access  Private
const batchCategorizeTransactions = asyncHandler(async (req, res) => {
    try {
        const result = await aiService.batchCategorizeTransactions(req.body);
        res.json(result);
    } catch (error) {
        logger.error('Batch categorization controller error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Get AI Financial Health Score & Insights
// @route   GET /api/ai/financial-health
// @access  Private
const getFinancialHealth = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    try {
        const result = await aiService.getFinancialHealth(userId);
        res.json(result);
    } catch (error) {
        logger.error(`Financial health controller error for user ${userId}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Get AI Platform Status & Telemetry
// @route   GET /api/ai/status
// @access  Private
const getAiPlatformStatus = asyncHandler(async (req, res) => {
    try {
        const result = await aiService.getAiPlatformStatus();
        res.json(result);
    } catch (error) {
        logger.error('AI status controller error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Submit category feedback
// @route   POST /api/ai/feedback
// @access  Private
const submitAiFeedback = asyncHandler(async (req, res) => {
    try {
        const result = await aiService.submitAiFeedback(req.body);
        res.json(result);
    } catch (error) {
        logger.error('Submit feedback controller error:', error);
        res.status(500).json({ error: error.message });
    }
});

export {
    getAiForecast,
    categorizeTransaction,
    batchCategorizeTransactions,
    getFinancialHealth,
    getAiPlatformStatus,
    submitAiFeedback
};
