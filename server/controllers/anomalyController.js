import Anomaly from '../models/Anomaly.js';
import Transaction from '../models/Transaction.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import asyncHandler from 'express-async-handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to run detect.py subprocess and upsert Anomaly record in database
const detectAndSaveAnomaly = (userId, transactionId) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../backend/ai/anomaly/detect.py');
        const pythonProcess = spawn('python', [scriptPath, userId.toString(), transactionId.toString()]);
        
        let stdoutData = '';
        let stderrData = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        
        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                return reject(new Error(`detect.py process exited with code ${code}. Error: ${stderrData}`));
            }
            try {
                const result = JSON.parse(stdoutData.trim());
                if (result.error) {
                    return reject(new Error(result.error));
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
                
                resolve(anomalyRecord);
            } catch (err) {
                reject(err);
            }
        });
    });
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
        console.error('Anomaly scan error:', err);
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
            console.log(`Anomaly record missing for transaction ${transactionId} - running scan now...`);
            anomalyRecord = await detectAndSaveAnomaly(userId, transactionId);
        }
        
        res.json(anomalyRecord);
    } catch (err) {
        console.error('Fetch anomaly error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch anomaly record' });
    }
});

export {
    detectAndSaveAnomaly,
    checkAnomaly,
    getAnomaly
};
