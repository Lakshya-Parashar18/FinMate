import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import asyncHandler from 'express-async-handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to execute Python AI Gateway commands
const executeAiGateway = (action, payload = {}) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
        const pythonProcess = spawn('python', [scriptPath, action, JSON.stringify(payload)]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`AI Gateway (${action}) process exited with code ${code}:`, stderrData);
                return reject(new Error(stderrData || 'AI Gateway process failed'));
            }

            try {
                const result = JSON.parse(stdoutData.trim());
                resolve(result);
            } catch (err) {
                console.error(`Failed to parse AI Gateway output (${action}):`, err, stdoutData);
                reject(err);
            }
        });
    });
};

// @desc    Get ML-powered spending forecast
// @route   GET /api/ai/forecast
// @access  Private
const getAiForecast = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    const scriptPath = path.join(__dirname, '../../backend/ai/forecast/predict.py');

    const pythonProcess = spawn('python', [scriptPath, userId]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`predict.py process exited with code ${code}:`, stderrData);
            return res.status(500).json({ error: 'Forecasting engine failed' });
        }

        try {
            const result = JSON.parse(stdoutData.trim());
            if (result.error) {
                return res.status(400).json({ error: result.error });
            }
            res.json(result);
        } catch (err) {
            console.error('Failed to parse Python forecast output:', err, stdoutData);
            res.status(500).json({ error: 'Failed to parse forecast output' });
        }
    });
});

// @desc    Categorize single transaction via AI Gateway
// @route   POST /api/ai/categorize
// @access  Private
const categorizeTransaction = asyncHandler(async (req, res) => {
    try {
        const result = await executeAiGateway('categorize', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Batch categorize transactions via AI Gateway
// @route   POST /api/ai/categorize/batch
// @access  Private
const batchCategorizeTransactions = asyncHandler(async (req, res) => {
    try {
        const result = await executeAiGateway('batch_categorize', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Get AI Financial Health Score & Insights
// @route   GET /api/ai/financial-health
// @access  Private
const getFinancialHealth = asyncHandler(async (req, res) => {
    try {
        const result = await executeAiGateway('financial_health', { user_id: req.user._id.toString() });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Get AI Platform Status & Telemetry
// @route   GET /api/ai/status
// @access  Private
const getAiPlatformStatus = asyncHandler(async (req, res) => {
    try {
        const result = await executeAiGateway('status');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Submit category feedback
// @route   POST /api/ai/feedback
// @access  Private
const submitAiFeedback = asyncHandler(async (req, res) => {
    try {
        const result = await executeAiGateway('feedback', req.body);
        res.json(result);
    } catch (error) {
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
