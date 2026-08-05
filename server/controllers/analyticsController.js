import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import dayjs from 'dayjs'; // Using dayjs for easier date manipulation
import utc from 'dayjs/plugin/utc.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dayjs.extend(utc);

// @desc    Get aggregated analytics data
// @route   GET /api/analytics
// @access  Private
// @query   startDate (optional, YYYY-MM-DD), endDate (optional, YYYY-MM-DD)
const getAnalyticsData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // --- Determine Date Range ---
    const endDate = req.query.endDate
        ? dayjs.utc(req.query.endDate).endOf('day').toDate()
        : dayjs.utc().endOf('day').toDate();
    const startDate = req.query.startDate
        ? dayjs.utc(req.query.startDate).startOf('day').toDate()
        : dayjs.utc(endDate).subtract(30, 'day').startOf('day').toDate();

    // --- Previous period (same duration, shifted back) ---
    const periodDays = dayjs.utc(endDate).diff(dayjs.utc(startDate), 'day') + 1;
    const prevEndDate = dayjs.utc(startDate).subtract(1, 'day').endOf('day').toDate();
    const prevStartDate = dayjs.utc(prevEndDate).subtract(periodDays - 1, 'day').startOf('day').toDate();

    // --- Current period aggregation ---
    const results = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $facet: {
                spendingByCategory: [
                    { $match: { amount: { $lt: 0 } } },
                    { $group: { _id: '$category', totalAmount: { $sum: { $abs: '$amount' } } } },
                    { $sort: { totalAmount: -1 } },
                    { $project: { _id: 0, name: '$_id', value: '$totalAmount' } }
                ],
                spendingOverTime: [
                    { $match: { amount: { $lt: 0 } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                            totalAmount: { $sum: { $abs: '$amount' } }
                        }
                    },
                    { $sort: { _id: 1 } },
                    { $project: { _id: 0, date: '$_id', value: '$totalAmount' } }
                ],
                incomeVsExpense: [
                    {
                        $group: {
                            _id: null,
                            totalIncome: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
                            totalExpenses: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } }
                        }
                    },
                    { $project: { _id: 0, income: '$totalIncome', expenses: '$totalExpenses' } }
                ]
            }
        }
    ]);

    // --- Previous period aggregation (category spending only) ---
    const prevResults = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: prevStartDate, $lte: prevEndDate }
            }
        },
        {
            $facet: {
                spendingByCategory: [
                    { $match: { amount: { $lt: 0 } } },
                    { $group: { _id: '$category', totalAmount: { $sum: { $abs: '$amount' } } } },
                    { $sort: { totalAmount: -1 } },
                    { $project: { _id: 0, name: '$_id', value: '$totalAmount' } }
                ]
            }
        }
    ]);

    const analyticsData = results[0];
    const prevAnalyticsData = prevResults[0];

    if (!analyticsData.incomeVsExpense || analyticsData.incomeVsExpense.length === 0) {
        analyticsData.incomeVsExpense = [{ income: 0, expenses: 0 }];
    }

    // --- Fetch raw transactions and budgets ---
    const rawTransactions = await Transaction.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const budgets = await Budget.find({ user: userId });

    // --- EVENT DETECTION PIPELINE ---
    const monthlySpend = {};
    const budgetCrossings = new Set();
    const eventsMap = {};

    const expenses = rawTransactions.filter(t => t.amount < 0);
    const expenseValues = expenses.map(t => Math.abs(t.amount));
    const totalExpenseSum = expenseValues.reduce((a, b) => a + b, 0);
    const avgExpense = expenseValues.length > 0 ? totalExpenseSum / expenseValues.length : 0;

    const variance = expenseValues.length > 0
        ? expenseValues.reduce((sum, val) => sum + Math.pow(val - avgExpense, 2), 0) / expenseValues.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const largeExpenseThreshold = Math.max(avgExpense + 2.2 * stdDev, avgExpense * 2.2, 3000);

    const dailyCategorySpend = {};
    const dailyTotalSpend = {};

    for (const t of rawTransactions) {
        if (t.amount < 0) {
            const dateStr = dayjs(t.date).format('YYYY-MM-DD');
            const absAmt = Math.abs(t.amount);
            if (!dailyCategorySpend[dateStr]) dailyCategorySpend[dateStr] = {};
            dailyCategorySpend[dateStr][t.category] = (dailyCategorySpend[dateStr][t.category] || 0) + absAmt;
            dailyTotalSpend[dateStr] = (dailyTotalSpend[dateStr] || 0) + absAmt;
        }
    }

    for (const t of rawTransactions) {
        const dateStr = dayjs(t.date).format('YYYY-MM-DD');
        const amount = t.amount;
        const absAmount = Math.abs(amount);
        const category = t.category;
        const description = t.description || '';
        const lowerDesc = description.toLowerCase();
        const monthKey = dayjs(t.date).format('YYYY-MM');

        if (!eventsMap[dateStr]) eventsMap[dateStr] = [];

        // 1. Salary Deposit
        if (amount > 0 && (category.toLowerCase() === 'salary' || lowerDesc.includes('salary') || lowerDesc.includes('payroll') || lowerDesc.includes('direct deposit'))) {
            eventsMap[dateStr].push({ type: 'salary', label: 'Salary Received', description: description || 'Direct deposit received.', amount });
        }

        // 2. Unusually High Expense
        if (amount < 0 && absAmount >= largeExpenseThreshold) {
            eventsMap[dateStr].push({ type: 'high_expense', label: 'Large Outlay', description: `Large spend on ${category}${description ? ` (${description})` : ''}.`, amount });
        }

        // 3. Recurring Payments & Subscriptions
        const subKeywords = ['netflix', 'spotify', 'youtube premium', 'youtube sub', 'github', 'aws', 'amazon prime', 'google cloud', 'adobe', 'gym', 'rent', 'landlord', 'electricity', 'water bill', 'internet', 'wifi'];
        const isSub = amount < 0 && subKeywords.some(k => lowerDesc.includes(k) || category.toLowerCase().includes(k));
        const alreadyFlaggedHigh = eventsMap[dateStr].some(e => e.type === 'high_expense' && e.amount === amount);
        if (isSub && !alreadyFlaggedHigh) {
            eventsMap[dateStr].push({ type: 'recurring', label: 'Recurring Bill', description: `${category} payment for ${description || category}.`, amount });
        }

        // 4. Budget Crossing Alerts
        if (amount < 0) {
            monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + absAmount;
            const currentTotal = monthlySpend[monthKey];
            const monthNum = dayjs(t.date).month();
            const yearNum = dayjs(t.date).year();
            const budgetObj = budgets.find(b => b.month === monthNum && b.year === yearNum);
            if (budgetObj) {
                const budgetLimit = budgetObj.totalLimit || budgetObj.categories.reduce((s, c) => s + c.limit, 0);
                if (budgetLimit > 0) {
                    const pctBefore = (currentTotal - absAmount) / budgetLimit;
                    const pctAfter = currentTotal / budgetLimit;
                    const thresholds = [
                        { ratio: 0.5, label: '50% Budget Crossed', key: `${monthKey}-50` },
                        { ratio: 0.8, label: '80% Budget Crossed', key: `${monthKey}-80` },
                        { ratio: 1.0, label: 'Budget Exhausted (100%)', key: `${monthKey}-100` }
                    ];
                    for (const thresh of thresholds) {
                        if (pctBefore < thresh.ratio && pctAfter >= thresh.ratio && !budgetCrossings.has(thresh.key)) {
                            budgetCrossings.add(thresh.key);
                            eventsMap[dateStr].push({ type: 'budget_crossing', label: thresh.label, description: `Monthly spend reached ${Math.round(thresh.ratio * 100)}% of limit.`, amount: currentTotal });
                        }
                    }
                }
            }
        }
    }

    // 5. Category Spikes
    const activeDates = Object.keys(dailyTotalSpend);
    const totalDailyExpenses = activeDates.map(d => dailyTotalSpend[d]);
    const avgDailySpend = totalDailyExpenses.length > 0 ? totalDailyExpenses.reduce((a, b) => a + b, 0) / totalDailyExpenses.length : 0;

    for (const dateStr of activeDates) {
        const dailyTotal = dailyTotalSpend[dateStr];
        if (dailyTotal > avgDailySpend * 1.5) {
            const categoriesOnDay = dailyCategorySpend[dateStr];
            for (const catName of Object.keys(categoriesOnDay)) {
                const catSpend = categoriesOnDay[catName];
                if (catSpend / dailyTotal >= 0.70 && catSpend > 1500) {
                    if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
                    const alreadySpike = eventsMap[dateStr].some(e => e.type === 'category_spike' || e.type === 'high_expense');
                    if (!alreadySpike) {
                        eventsMap[dateStr].push({ type: 'category_spike', label: 'Category Spend Spike', description: `Spike in ${catName} category spend.`, amount: -catSpend });
                    }
                }
            }
        }
    }

    // Map events into spendingOverTime timeline
    const dailyDataMap = {};
    for (const item of (analyticsData.spendingOverTime || [])) {
        dailyDataMap[item.date] = { date: item.date, value: item.value, events: [] };
    }
    for (const eventDate of Object.keys(eventsMap)) {
        if (eventsMap[eventDate].length > 0) {
            if (!dailyDataMap[eventDate]) dailyDataMap[eventDate] = { date: eventDate, value: 0, events: [] };
            dailyDataMap[eventDate].events = eventsMap[eventDate];
        }
    }
    const finalSpendingOverTime = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

    // Active budget limit for ending month
    const endingMonth = dayjs(endDate).month();
    const endingYear = dayjs(endDate).year();
    const endingBudgetObj = budgets.find(b => b.month === endingMonth && b.year === endingYear);
    const activeBudgetLimit = endingBudgetObj
        ? (endingBudgetObj.totalLimit || endingBudgetObj.categories.reduce((s, c) => s + c.limit, 0))
        : 0;

    res.json({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        spendingByCategory: analyticsData.spendingByCategory || [],
        prevSpendingByCategory: prevAnalyticsData.spendingByCategory || [],
        spendingOverTime: finalSpendingOverTime,
        incomeVsExpense: analyticsData.incomeVsExpense[0],
        budgetLimit: activeBudgetLimit
    });
});

const getGroq = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;
    return new Groq({ apiKey });
};

const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
};

const getBudgetLimit = (b) =>
    b ? (b.totalLimit ?? b.categories?.reduce((s, c) => s + c.limit, 0) ?? 0) : 0;

const runPythonForecast = (userId) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../backend/ai/forecast/predict.py');
        const pythonProcess = spawn('python', [scriptPath, userId.toString()]);
        
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
                return reject(new Error(`predict.py process exited with code ${code}. Error: ${stderrData}`));
            }
            try {
                const parsed = JSON.parse(stdoutData.trim());
                if (parsed.error) {
                    return reject(new Error(parsed.error));
                }
                resolve(parsed);
            } catch (err) {
                reject(err);
            }
        });
    });
};

// @desc    Get AI-powered spending forecast for the current month
// @route   GET /api/analytics/forecast
// @access  Private
const getSpendingForecast = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const now = dayjs().utc();
    const currentMonth = now.month(); // 0-11
    const currentYear = now.year();

    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth = now.endOf('month').toDate();

    // Fetch transactions and budget for the current month
    const transactions = await Transaction.find({
        user: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const budget = await Budget.findOne({
        user: userId,
        month: currentMonth,
        year: currentYear
    });

    const budgetLimit = getBudgetLimit(budget);

    // Primary: Try XGBoost Machine Learning Forecast
    try {
        console.log("System - Executing ML XGBoost forecasting engine...");
        const mlForecast = await runPythonForecast(userId);
        if (mlForecast && typeof mlForecast.predictedTotal === 'number') {
            console.log("System - ML XGBoost forecast generated successfully!");
            
            // Force strict mathematical alignment for safety
            if (budgetLimit > 0) {
                mlForecast.isLikelyToExceed = mlForecast.predictedTotal > budgetLimit;
                mlForecast.projectedRemainingBudget = budgetLimit - mlForecast.predictedTotal;
                
                if (mlForecast.isLikelyToExceed) {
                    if (!mlForecast.warningMessage || !mlForecast.warningMessage.toLowerCase().includes("exceed")) {
                        mlForecast.warningMessage = `Warning: Based on AI predictions, you are projected to exceed your monthly budget by ₹${Math.abs(mlForecast.projectedRemainingBudget).toLocaleString()}. Consider reducing discretionary spending.`;
                    }
                } else {
                    if (!mlForecast.warningMessage || !mlForecast.warningMessage.toLowerCase().includes("track")) {
                        mlForecast.warningMessage = `You are projected to stay within your monthly budget. Maintain your current spending patterns to save ₹${Math.abs(mlForecast.projectedRemainingBudget).toLocaleString()} by the end of the month.`;
                    }
                }
            } else {
                mlForecast.isLikelyToExceed = false;
                mlForecast.projectedRemainingBudget = 0;
                mlForecast.warningMessage = "Set a monthly budget to compare your forecast and receive overspending alerts.";
            }
            
            return res.json(mlForecast);
        }
    } catch (mlErr) {
        console.error("System - ML Forecasting failed, falling back to GenAI/Heuristics:", mlErr.message);
    }

    // Compute basic math context
    const expenses = transactions.filter(t => t.amount < 0);
    const currentSpent = Math.abs(expenses.reduce((acc, t) => acc + t.amount, 0));

    // Calculate category spending so far this month
    const catSums = {};
    expenses.forEach(t => {
        catSums[t.category] = (catSums[t.category] || 0) + Math.abs(t.amount);
    });

    const dayOfMonth = now.date();
    const daysInMonth = now.daysInMonth();
    const daysRemaining = daysInMonth - dayOfMonth;

    // Mathematical projection (Heuristics)
    const runRate = dayOfMonth > 0 ? currentSpent / dayOfMonth : 0;
    const projectedSpent = runRate * daysInMonth;
    const projectedRemaining = budgetLimit > 0 ? budgetLimit - projectedSpent : 0;
    const isOverBudget = budgetLimit > 0 && projectedSpent > budgetLimit;

    // Confidence heuristic:
    // More days elapsed = higher confidence. 
    // Higher spending variance = lower confidence.
    let heuristicConfidence = 50 + Math.round((dayOfMonth / daysInMonth) * 45); // ranges 50% - 95%
    if (expenses.length < 5) heuristicConfidence = Math.max(30, heuristicConfidence - 20);

    const heuristicForecast = {
        predictedTotal: Math.round(projectedSpent),
        confidence: heuristicConfidence,
        confidenceLabel: heuristicConfidence >= 80 ? 'High' : (heuristicConfidence >= 60 ? 'Medium' : 'Low'),
        projectedRemainingBudget: Math.round(projectedRemaining),
        isLikelyToExceed: isOverBudget,
        warningMessage: budgetLimit > 0
            ? (isOverBudget
                ? `Based on your current run rate of ₹${Math.round(runRate)}/day, you are projected to exceed your budget by ₹${Math.round(projectedSpent - budgetLimit)}. Consider trimming discretionary spending.`
                : `You're on track! Your current run rate is ₹${Math.round(runRate)}/day. Keep it up to save ₹${Math.round(budgetLimit - projectedSpent)} by end of month.`)
            : `Set a monthly budget to compare your forecast and receive overspending warnings.`,
        categoryForecasts: Object.entries(catSums).map(([category, amt]) => ({
            category,
            currentSpent: Math.round(amt),
            projected: Math.round((amt / dayOfMonth) * daysInMonth)
        }))
    };

    const groq = getGroq();
    const genAI = getGenAI();

    if (!genAI && !groq) {
        // Fallback to local heuristic forecast
        return res.json(heuristicForecast);
    }

    // AI context
    const aiContext = {
        currentMonthName: now.format('MMMM'),
        dayOfMonth,
        daysInMonth,
        daysRemaining,
        budgetLimit,
        currentSpent,
        categoryBreakdown: Object.entries(catSums).map(([k, v]) => ({ category: k, spent: v })),
        heuristicProjection: Math.round(projectedSpent),
        recentTransactions: transactions.slice(0, 20).map(t => ({
            category: t.category,
            amount: Math.abs(t.amount),
            description: t.description || '',
            date: dayjs(t.date).format('YYYY-MM-DD')
        }))
    };

    const forecastPrompt = `You are a financial planning AI. Predict the user's spending at the end of the month.
CONTEXT:
- Month: ${aiContext.currentMonthName}
- Day: ${aiContext.dayOfMonth} out of ${aiContext.daysInMonth} days (${aiContext.daysRemaining} days remaining)
- Current Spent: ₹${aiContext.currentSpent}
- Monthly Budget Limit: ₹${aiContext.budgetLimit}
- Category Breakdown: ${JSON.stringify(aiContext.categoryBreakdown)}
- Heuristic Projection based on straight line run-rate: ₹${aiContext.heuristicProjection}
- Recent Transaction Samples: ${JSON.stringify(aiContext.recentTransactions)}

TASK: Return a JSON object with a realistic, smart prediction. Adjust heuristic projection if recent transactions show high spikes or regular patterns.
RULES:
1. Estimate confidence (30-95%) and set a label ("High" | "Medium" | "Low").
2. Calculate projectedRemainingBudget as (Budget - predictedTotal).
3. If no budget limit is set, warningMessage should suggest setting a budget.
4. If budget is set, write a custom warningMessage (1-2 sentences) advising the user.
5. Provide category-level projections for each category in the current breakdown.
6. The response must be a valid JSON object matching the following structure:
{
  "predictedTotal": number,
  "confidence": number,
  "confidenceLabel": "High" | "Medium" | "Low",
  "projectedRemainingBudget": number,
  "isLikelyToExceed": boolean,
  "warningMessage": "string",
  "categoryForecasts": [
    { "category": "string", "currentSpent": number, "projected": number }
  ]
}
Return ONLY the JSON block. Do not include markdown wraps or explanations.`;

    const fetchGeminiForecast = async () => {
        console.log("System - Prompting Gemini-2.5-flash for Spending Forecast...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(forecastPrompt);
        return result.response.text();
    };

    const fetchGroqForecast = async () => {
        console.log("System - Prompting Groq (Llama-3.3-70b) for Spending Forecast...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a financial forecasting bot. Return ONLY a JSON object with predictions. Do not output anything else."
                },
                { role: "user", content: forecastPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 600,
            response_format: { type: "json_object" }
        });
        return chatCompletion.choices[0].message.content;
    };

    try {
        let rawAIResponse = "";
        let parsedForecast = null;

        if (genAI) {
            try {
                rawAIResponse = await fetchGeminiForecast();
            } catch (err) {
                console.error("System - Gemini Forecast API error, falling back to Groq:", err.message);
                if (groq) {
                    rawAIResponse = await fetchGroqForecast();
                } else {
                    throw err;
                }
            }
        } else if (groq) {
            rawAIResponse = await fetchGroqForecast();
        }

        // Parse AI response
        const jsonMatch = rawAIResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedForecast = JSON.parse(jsonMatch[0]);
        } else {
            parsedForecast = JSON.parse(rawAIResponse);
        }

        // Validate structure and sanitize to ensure 100% mathematical accuracy without bluffing
        if (parsedForecast && typeof parsedForecast.predictedTotal === 'number') {
            // Force strict mathematical alignment
            if (budgetLimit > 0) {
                parsedForecast.isLikelyToExceed = parsedForecast.predictedTotal > budgetLimit;
                parsedForecast.projectedRemainingBudget = budgetLimit - parsedForecast.predictedTotal;

                // Sanitize the warning/alert message if it contradicts the exceed status
                if (parsedForecast.isLikelyToExceed) {
                    const isExceedMessage = parsedForecast.warningMessage && (
                        parsedForecast.warningMessage.toLowerCase().includes("exceed") ||
                        parsedForecast.warningMessage.toLowerCase().includes("overdraft") ||
                        parsedForecast.warningMessage.toLowerCase().includes("over budget") ||
                        parsedForecast.warningMessage.toLowerCase().includes("trim") ||
                        parsedForecast.warningMessage.toLowerCase().includes("caution") ||
                        parsedForecast.warningMessage.toLowerCase().includes("warning")
                    );
                    if (!isExceedMessage) {
                        parsedForecast.warningMessage = `Warning: Based on AI predictions, you are projected to exceed your monthly budget by ₹${Math.abs(parsedForecast.projectedRemainingBudget).toLocaleString()}. Consider reducing discretionary spending.`;
                    }
                } else {
                    // Safe / within budget
                    const isSafeMessage = parsedForecast.warningMessage && (
                        parsedForecast.warningMessage.toLowerCase().includes("track") ||
                        parsedForecast.warningMessage.toLowerCase().includes("save") ||
                        parsedForecast.warningMessage.toLowerCase().includes("within") ||
                        parsedForecast.warningMessage.toLowerCase().includes("discipline")
                    );
                    if (!isSafeMessage) {
                        parsedForecast.warningMessage = `You are projected to stay within your monthly budget. Maintain your current spending patterns to save ₹${Math.abs(parsedForecast.projectedRemainingBudget).toLocaleString()} by the end of the month.`;
                    }
                }
            } else {
                parsedForecast.isLikelyToExceed = false;
                parsedForecast.projectedRemainingBudget = 0;
                parsedForecast.warningMessage = "Set a monthly budget to compare your forecast and receive overspending alerts.";
            }

            // Sanitize confidence values
            parsedForecast.confidence = Math.max(30, Math.min(95, parsedForecast.confidence || 75));
            parsedForecast.confidenceLabel = parsedForecast.confidence >= 80 ? 'High' : (parsedForecast.confidence >= 60 ? 'Medium' : 'Low');

            // Sanitize category-level projections (projected spend cannot be less than current spend)
            if (Array.isArray(parsedForecast.categoryForecasts)) {
                parsedForecast.categoryForecasts.forEach(cf => {
                    cf.currentSpent = Math.round(cf.currentSpent || 0);
                    cf.projected = Math.round(cf.projected || cf.currentSpent);
                    if (cf.projected < cf.currentSpent) {
                        cf.projected = cf.currentSpent;
                    }
                });
            }

            return res.json(parsedForecast);
        } else {
            throw new Error("Invalid forecast data structure from AI response");
        }
    } catch (err) {
        console.error("System - AI Forecast Error, falling back to local heuristics:", err.message);
        return res.json(heuristicForecast);
    }
});

// @desc    Get AI-generated monthly financial summary
// @route   GET /api/analytics/summary
// @access  Private
const getMonthlySummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const now = dayjs().utc();

    const endDate = req.query.endDate
        ? dayjs.utc(req.query.endDate).endOf('day').toDate()
        : now.endOf('day').toDate();
    const startDate = req.query.startDate
        ? dayjs.utc(req.query.startDate).startOf('day').toDate()
        : dayjs.utc(endDate).subtract(29, 'day').startOf('day').toDate();

    const periodDays = Math.max(1, dayjs.utc(endDate).diff(dayjs.utc(startDate), 'day') + 1);
    const prevEndDate = dayjs.utc(startDate).subtract(1, 'day').endOf('day').toDate();
    const prevStartDate = dayjs.utc(prevEndDate).subtract(periodDays - 1, 'day').startOf('day').toDate();

    const [transactions, prevTransactions, budget] = await Promise.all([
        Transaction.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
        Transaction.find({ user: userId, date: { $gte: prevStartDate, $lte: prevEndDate } }),
        Budget.findOne({ user: userId, month: now.month(), year: now.year() })
    ]);

    // ── Current period metrics ──
    const incomeItems = transactions.filter(t => t.amount > 0);
    const expenseItems = transactions.filter(t => t.amount < 0);
    const income = incomeItems.reduce((s, t) => s + t.amount, 0);
    const expenses = Math.abs(expenseItems.reduce((s, t) => s + t.amount, 0));
    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    const dailySpend = expenses / periodDays;
    const budgetLimit = getBudgetLimit(budget);
    const budgetUsedPct = budgetLimit > 0 ? (expenses / budgetLimit) * 100 : null;
    const budgetRemaining = budgetLimit > 0 ? budgetLimit - expenses : null;

    // ── Category breakdown (current) ──
    const catSums = {};
    expenseItems.forEach(t => {
        catSums[t.category] = (catSums[t.category] || 0) + Math.abs(t.amount);
    });
    const catList = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
    const topCat = catList[0] || null;
    const topCatPct = topCat && expenses > 0 ? (topCat[1] / expenses) * 100 : 0;

    // ── Previous period metrics ──
    const prevExpenseItems = prevTransactions.filter(t => t.amount < 0);
    const prevExpenses = Math.abs(prevExpenseItems.reduce((s, t) => s + t.amount, 0));
    const prevCatSums = {};
    prevExpenseItems.forEach(t => {
        prevCatSums[t.category] = (prevCatSums[t.category] || 0) + Math.abs(t.amount);
    });

    // Per-category change vs previous period
    const catChanges = catList.map(([name, amount]) => {
        const prev = prevCatSums[name] || 0;
        const change = prev > 0 ? ((amount - prev) / prev) * 100 : null;
        return { name, amount, prev, change };
    });
    // Biggest category spike vs last period
    const biggestSpike = catChanges
        .filter(c => c.change !== null && c.change > 20 && c.amount > 1000)
        .sort((a, b) => b.change - a.change)[0] || null;

    const expenseChangePct = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null;

    const fmt = (n) => Math.round(n).toLocaleString('en-IN');
    const periodLabel = `${dayjs.utc(startDate).format('MMM D')} – ${dayjs.utc(endDate).format('MMM D, YYYY')}`;

    // ─────────────────────────────────────────────────
    // SMART HEURISTIC ENGINE  (used when AI unavailable)
    // ─────────────────────────────────────────────────
    const buildHeuristicSummary = () => {
        // Headline — specific, not generic
        let headline;
        if (netSavings < 0) {
            headline = `Deficit of ₹${fmt(Math.abs(netSavings))} — action needed`;
        } else if (savingsRate >= 30) {
            headline = `Excellent ${savingsRate.toFixed(1)}% savings rate — strong discipline`;
        } else if (savingsRate >= 20) {
            headline = `Healthy ${savingsRate.toFixed(1)}% savings rate this period`;
        } else if (income === 0 && expenses === 0) {
            headline = 'No transactions found for this period';
        } else {
            headline = `${savingsRate.toFixed(1)}% savings rate — room to improve`;
        }

        // Trends — always include comparison if available
        let trends = income > 0 || expenses > 0
            ? `Income: ₹${fmt(income)} | Expenses: ₹${fmt(expenses)} | Net ${netSavings >= 0 ? 'savings' : 'deficit'}: ₹${fmt(Math.abs(netSavings))}. Daily average spend: ₹${fmt(dailySpend)}/day.`
            : 'No transaction data found for this period.';
        if (expenseChangePct !== null) {
            trends += ` Expenses ${expenseChangePct >= 0 ? 'rose' : 'fell'} ${Math.abs(expenseChangePct).toFixed(1)}% vs the previous ${periodDays}-day period.`;
        }

        // Achievements — specific and metric-backed
        let achievements = null;
        if (netSavings > 0 && income > 0) {
            if (savingsRate >= 30) {
                achievements = `Outstanding! You saved ₹${fmt(netSavings)} (${savingsRate.toFixed(1)}% of income) — well above the recommended 20% target.`;
            } else if (savingsRate >= 20) {
                achievements = `You saved ₹${fmt(netSavings)} (${savingsRate.toFixed(1)}%) — meeting the 20% savings benchmark. ₹${fmt(netSavings)} set aside this period.`;
            } else {
                achievements = `You saved ₹${fmt(netSavings)} this period. Positive savings, though below the 20% target (your goal: ₹${fmt(income * 0.2)}).`;
            }
        } else if (budgetLimit > 0 && expenses <= budgetLimit) {
            achievements = `Stayed within budget — spent ₹${fmt(expenses)} of ₹${fmt(budgetLimit)} (${(budgetUsedPct).toFixed(0)}% used).`;
        }

        // Risks — data-driven, with exact numbers
        let risks = null;
        if (netSavings < 0) {
            risks = `Spending exceeded income by ₹${fmt(Math.abs(netSavings))}. At this rate over 12 months that's a ₹${fmt(Math.abs(netSavings) * 12)} annual deficit.`;
        } else if (budgetLimit > 0 && expenses > budgetLimit * 0.9) {
            risks = `Budget ${expenses > budgetLimit ? 'exceeded' : 'nearly exhausted'}: ₹${fmt(expenses)} spent of ₹${fmt(budgetLimit)} limit${budgetRemaining < 0 ? ` — over by ₹${fmt(Math.abs(budgetRemaining))}` : ` — only ₹${fmt(budgetRemaining)} left`}.`;
        } else if (topCat && topCatPct > 40) {
            risks = `${topCat[0]} accounts for ${topCatPct.toFixed(0)}% of all expenses (₹${fmt(topCat[1])}). Heavy concentration in one category reduces financial flexibility.`;
        } else if (biggestSpike) {
            risks = `${biggestSpike.name} spending jumped ${biggestSpike.change.toFixed(0)}% vs last period — from ₹${fmt(biggestSpike.prev)} to ₹${fmt(biggestSpike.amount)}.`;
        } else if (topCat) {
            risks = `${topCat[0]} is your top spend at ₹${fmt(topCat[1])} (${topCatPct.toFixed(0)}% of total expenses).`;
        }

        // Recommendations — always 3, always specific with rupee amounts
        const recs = [];

        // 1. Category-focused (most actionable)
        if (topCat && topCatPct > 25) {
            const saving10 = topCat[1] * 0.1;
            const saving20 = topCat[1] * 0.2;
            recs.push(`Cut ${topCat[0]} by 20%: reducing from ₹${fmt(topCat[1])} to ₹${fmt(topCat[1] - saving20)} would save ₹${fmt(saving20)} this period and ₹${fmt(saving20 * 12)} annually.`);
        } else if (catList.length > 1) {
            const secondCat = catList[1];
            recs.push(`${catList[0][0]} (₹${fmt(catList[0][1])}) and ${secondCat[0]} (₹${fmt(secondCat[1])}) together are ₹${fmt(catList[0][1] + secondCat[1])} — ${((catList[0][1] + secondCat[1]) / expenses * 100).toFixed(0)}% of total spend. Target these first for cuts.`);
        }

        // 2. Savings rate gap (always shown if income > 0)
        if (income > 0) {
            const targetSavings = income * 0.20;
            if (savingsRate < 20) {
                const gap = targetSavings - netSavings;
                recs.push(`To reach a 20% savings rate, you need ₹${fmt(targetSavings)}/period in savings. You're currently ₹${fmt(gap)} short — cut ₹${fmt(gap / periodDays)}/day from discretionary spending.`);
            } else if (savingsRate >= 20 && savingsRate < 35) {
                const stretch = income * 0.30 - netSavings;
                recs.push(`You're above the 20% target. Push to 30% by saving ₹${fmt(income * 0.30)} per period — just ₹${fmt(stretch)} more than you're saving now.`);
            }
        }

        // 3. Budget or spike alert
        if (biggestSpike && recs.length < 3) {
            recs.push(`${biggestSpike.name} spiked ${biggestSpike.change.toFixed(0)}% this period (₹${fmt(biggestSpike.prev)} → ₹${fmt(biggestSpike.amount)}). Investigate what drove this and set a cap of ₹${fmt(biggestSpike.prev * 1.1)} for next period.`);
        } else if (budgetLimit === 0 && recs.length < 3) {
            recs.push(`You have no budget set. Based on current spend patterns, a ₹${fmt(expenses * 1.1)} monthly budget (10% buffer) would give you useful overspending alerts.`);
        } else if (netSavings > 0 && recs.length < 3) {
            const annualSavings = netSavings * (365 / periodDays);
            recs.push(`At your current savings rate, you'll accumulate ₹${fmt(annualSavings)} in 12 months. Consider putting the surplus in a recurring deposit or index fund for compounding returns.`);
        }

        // 4. Fallback if still short
        if (recs.length < 2) {
            recs.push('Add more transactions to receive data-driven spending recommendations tailored to your patterns.');
        }

        return { headline, trends, achievements, risks, recommendations: recs.slice(0, 4), model: 'heuristic' };
    };

    // ─────────────────────────────────────────────────
    // AI PROMPT — Precise, data-grounded, actionable
    // ─────────────────────────────────────────────────
    const groq = getGroq();
    const genAI = getGenAI();

    if (!genAI && !groq) {
        return res.json(buildHeuristicSummary());
    }

    const catComparisonText = catChanges.slice(0, 6).map(c =>
        `${c.name}: ₹${fmt(c.amount)}${c.prev > 0 ? ` (prev: ₹${fmt(c.prev)}, ${c.change >= 0 ? '+' : ''}${c.change !== null ? c.change.toFixed(1) + '%' : 'new'})` : ' (new this period)'}`
    ).join('\n');

    const summaryPrompt = `You are a sharp personal finance advisor. Analyse this user's actual financial data and produce a summary that is genuinely useful — with specific rupee amounts, percentages, and concrete next actions. Do NOT give generic advice.

═══ FINANCIAL DATA: ${periodLabel} ═══
Income:          ₹${fmt(income)}
Expenses:        ₹${fmt(expenses)}
Net Savings:     ₹${fmt(netSavings)} (${savingsRate.toFixed(1)}% of income)
Daily Avg Spend: ₹${fmt(dailySpend)}/day
Budget Limit:    ${budgetLimit > 0 ? `₹${fmt(budgetLimit)} (${budgetUsedPct ? budgetUsedPct.toFixed(1) + '% used' : 'N/A'})` : 'Not set'}
Budget Remaining:${budgetRemaining !== null ? ` ₹${fmt(budgetRemaining)}` : ' N/A'}
Period:          ${periodDays} days
Expense change vs previous ${periodDays}-day period: ${expenseChangePct !== null ? (expenseChangePct >= 0 ? '+' : '') + expenseChangePct.toFixed(1) + '%' : 'no prior data'}

Category Breakdown (with period-over-period change):
${catComparisonText || 'No expense data'}

Largest spike vs last period: ${biggestSpike ? `${biggestSpike.name} up ${biggestSpike.change.toFixed(0)}% (₹${fmt(biggestSpike.prev)} → ₹${fmt(biggestSpike.amount)})` : 'None'}
Savings rate vs 20% target: ${income > 0 ? (savingsRate >= 20 ? `Meeting target (${savingsRate.toFixed(1)}%)` : `Below target — need ₹${fmt(income * 0.2 - netSavings)} more savings`) : 'No income data'}

═══ YOUR TASK ═══
Return a JSON object with EXACTLY these fields. Rules:
1. headline: 8-12 words, include the actual savings amount or key metric — make it SPECIFIC.
2. trends: 2 sentences max. Include: income vs expenses, comparison to last period if available, daily spend rate.
3. achievements: 1 sentence with specific amounts. Mention savings rate vs 20% benchmark. Set to null only if income=0 AND expenses=0.
4. risks: 1-2 sentences. Reference exact rupee amounts. Cover budget breach, category concentration, or a spending spike. Set to null only if there are truly no risks.
5. recommendations: Array of EXACTLY 3 strings. Each must:
   - Mention a specific rupee amount (e.g., "cutting ₹X from Y")
   - Be directly actionable (what to do, not just "consider reviewing")
   - Be grounded only in the data above

Return ONLY valid JSON — no markdown, no commentary:
{"headline":"...","trends":"...","achievements":"... or null","risks":"... or null","recommendations":["...","...","..."]}`;

    const fetchGeminiSummary = async () => {
        console.log('System - Prompting Gemini-2.5-flash for Monthly Summary...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(summaryPrompt);
        return result.response.text();
    };

    const fetchGroqSummary = async () => {
        console.log('System - Prompting Groq (Llama-3.3-70b) for Monthly Summary...');
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise financial analysis AI. Return ONLY a valid JSON object with no markdown or extra text. All monetary values must reference the actual figures from the user data. Do not give generic advice.'
                },
                { role: 'user', content: summaryPrompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 700,
            response_format: { type: 'json_object' }
        });
        return completion.choices[0].message.content;
    };

    try {
        let rawText = '';
        let modelUsed = 'ai';

        if (genAI) {
            try {
                rawText = await fetchGeminiSummary();
                modelUsed = 'gemini';
            } catch (err) {
                console.error('System - Gemini Summary failed, falling back to Groq:', err.message);
                if (!groq) throw err;
                rawText = await fetchGroqSummary();
                modelUsed = 'groq';
            }
        } else {
            rawText = await fetchGroqSummary();
            modelUsed = 'groq';
        }

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No valid JSON in AI response');
        const parsed = JSON.parse(jsonMatch[0]);

        // Sanitize — reject clearly placeholder values
        const headline = typeof parsed.headline === 'string' && parsed.headline.length > 5
            ? parsed.headline : buildHeuristicSummary().headline;
        const trends = typeof parsed.trends === 'string' && parsed.trends.length > 10
            ? parsed.trends : buildHeuristicSummary().trends;
        const achievements = typeof parsed.achievements === 'string' && parsed.achievements !== 'null'
            ? parsed.achievements : null;
        const risks = typeof parsed.risks === 'string' && parsed.risks !== 'null'
            ? parsed.risks : null;
        const recs = Array.isArray(parsed.recommendations)
            ? parsed.recommendations.filter(r => typeof r === 'string' && r.length > 10).slice(0, 4)
            : [];
        // If AI returned < 2 recommendations, fall back to heuristic recs
        const finalRecs = recs.length >= 2 ? recs : buildHeuristicSummary().recommendations;

        return res.json({ headline, trends, achievements, risks, recommendations: finalRecs, model: modelUsed });
    } catch (err) {
        console.error('System - AI Summary Error, falling back to heuristics:', err.message);
        return res.json(buildHeuristicSummary());
    }
});

export { getAnalyticsData, getSpendingForecast, getMonthlySummary };