import Transaction from '../models/Transaction.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import dayjs from 'dayjs'; // Using dayjs for easier date manipulation
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

// @desc    Get aggregated analytics data
// @route   GET /api/analytics
// @access  Private
// @query   startDate (optional, YYYY-MM-DD), endDate (optional, YYYY-MM-DD)
const getAnalyticsData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // --- Determine Date Range --- 
    // Default to last 30 days if no dates are provided
    const endDate = req.query.endDate ? dayjs.utc(req.query.endDate).endOf('day').toDate() : dayjs.utc().endOf('day').toDate();
    const startDate = req.query.startDate ? dayjs.utc(req.query.startDate).startOf('day').toDate() : dayjs.utc(endDate).subtract(30, 'day').startOf('day').toDate();

    // --- Aggregation using $facet --- 
    const results = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate } 
            }
        },
        {
            $facet: {
                // 1. Spending by Category
                spendingByCategory: [
                    { $match: { amount: { $lt: 0 } } }, // Only expenses
                    {
                        $group: {
                            _id: "$category",
                            totalAmount: { $sum: { $abs: "$amount" } }
                        }
                    },
                    { $sort: { totalAmount: -1 } }, // Sort descending by amount
                    { $project: { _id: 0, name: "$_id", value: "$totalAmount" } } // Format for charts
                ],
                // 2. Spending Over Time (Daily)
                spendingOverTime: [
                    { $match: { amount: { $lt: 0 } } }, // Only expenses
                    {
                        $group: {
                             // Group by date (YYYY-MM-DD)
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            totalAmount: { $sum: { $abs: "$amount" } }
                        }
                    },
                    { $sort: { _id: 1 } }, // Sort chronologically
                    { $project: { _id: 0, date: "$_id", value: "$totalAmount" } }
                ],
                // 3. Income vs Expense Summary
                incomeVsExpense: [
                    {
                        $group: {
                            _id: null, // Group all results together
                            totalIncome: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                            totalExpenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } }
                        }
                    },
                    { $project: { _id: 0, income: "$totalIncome", expenses: "$totalExpenses" } }
                ]
                // Add more facets here if needed (e.g., income by category, weekly trends, etc.)
            }
        }
    ]);

    // Extract results from the $facet stage
    // Facet returns an array containing an object; we take the first element.
    const analyticsData = results[0]; 

    // Ensure incomeVsExpense always has an entry, even if no transactions exist
    if (!analyticsData.incomeVsExpense || analyticsData.incomeVsExpense.length === 0) {
        analyticsData.incomeVsExpense = [{ income: 0, expenses: 0 }];
    }

    res.json({
        startDate: startDate.toISOString().split('T')[0], // Return the used date range
        endDate: endDate.toISOString().split('T')[0],
        spendingByCategory: analyticsData.spendingByCategory || [],
        spendingOverTime: analyticsData.spendingOverTime || [],
        // Return the single summary object, not the array
        incomeVsExpense: analyticsData.incomeVsExpense[0] 
    });
});

export { getAnalyticsData }; 