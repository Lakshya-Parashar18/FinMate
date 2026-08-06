import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

// Helper to execute Python fallback via spawn
const spawnPython = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    logger.info(`Spawning Python fallback process: python ${scriptPath} ${args.join(' ')}`);
    const pythonProcess = spawn('python', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`Python fallback exited with code ${code}. Error: ${stderr}`);
        return reject(new Error(stderr || `Python process failed with code ${code}`));
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        logger.error(`Failed to parse Python fallback JSON output: ${stdout}`);
        reject(err);
      }
    });
  });
};

export const categorizeTransaction = async (payload) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/categorize`;
      logger.info(`Calling AI Service: POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
  return spawnPython(scriptPath, ['categorize', JSON.stringify(payload)]);
};

export const batchCategorizeTransactions = async (payload) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/categorize/batch`;
      logger.info(`Calling AI Service: POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
  return spawnPython(scriptPath, ['batch_categorize', JSON.stringify(payload)]);
};

export const getFinancialHealth = async (userId, transactions = []) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/financial-health/evaluate`;
      logger.info(`Calling AI Service: POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
  return spawnPython(scriptPath, ['financial_health', JSON.stringify({ user_id: userId, transactions })]);
};

export const getAiPlatformStatus = async () => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/health`;
      logger.info(`Calling AI Service Health: GET ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service Health returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service Health call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
  return spawnPython(scriptPath, ['status']);
};

export const submitAiFeedback = async (payload) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/feedback`;
      logger.info(`Calling AI Service Feedback: POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service Feedback returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service Feedback call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/gateway/run_gateway_cmd.py');
  return spawnPython(scriptPath, ['feedback', JSON.stringify(payload)]);
};

export const getAiForecast = async (userId) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/forecast?user_id=${userId}`;
      logger.info(`Calling AI Service Forecast: GET ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service Forecast returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service Forecast call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/forecast/predict.py');
  return spawnPython(scriptPath, [userId]);
};

export const checkAnomaly = async (userId, transactionId) => {
  if (AI_SERVICE_URL) {
    try {
      const url = `${AI_SERVICE_URL}/api/ai/anomaly/check?user_id=${userId}&transaction_id=${transactionId}`;
      logger.info(`Calling AI Service Anomaly Check: GET ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      logger.warn(`AI Service Anomaly Check returned status ${response.status}. Falling back to Python.`);
    } catch (err) {
      logger.error('FastAPI AI Service Anomaly Check call failed. Falling back to local Python.', err);
    }
  }

  const scriptPath = path.join(__dirname, '../../backend/ai/anomaly/detect.py');
  return spawnPython(scriptPath, [userId.toString(), transactionId.toString()]);
};
