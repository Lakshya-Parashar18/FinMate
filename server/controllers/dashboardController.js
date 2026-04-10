import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// Helper function to get month name
const getMonthName = (monthIndex) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
}

// @desc    Get dashboard summary data
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const numberOfMonthsForChart = 6; // How many months for the bar chart

    // --- Calculate date ranges ---
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);
    // Start date for historical chart data (e.g., 6 months ago)
    const startOfChartPeriod = new Date(currentYear, currentMonth - numberOfMonthsForChart + 1, 1);

    // --- Fetch ALL Transactions for Total Balance --- 
    const allTransactions = await Transaction.find({ user: userId });
    const totalBalance = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // --- Fetch Transactions for the current month --- 
    // Filter from allTransactions to avoid second DB call
    const currentMonthTransactions = allTransactions.filter(tx => 
        tx.date >= startOfCurrentMonth && tx.date <= endOfCurrentMonth
    );

    // --- Calculate Income & Expenses for the current month --- 
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const expenseBreakdown = {}; 

    // Aggregate specifically for current month to ensure consistency with Budget/Insights
    const currentMonthData = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
            }
        },
        {
            $group: {
                _id: null,
                income: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                expenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } }
            }
        }
    ]);

    monthlyIncome = currentMonthData[0]?.income || 0;
    monthlyExpenses = currentMonthData[0]?.expenses || 0;

    // Categorical breakdown for pie chart
    currentMonthTransactions.forEach(tx => {
        if (tx.amount < 0) {
            const category = tx.category || 'Uncategorized';
            expenseBreakdown[category] = (expenseBreakdown[category] || 0) + Math.abs(tx.amount);
        }
    });

    // --- Fetch Budget for the current month --- 
    const budget = await Budget.findOne({
        user: userId,
        month: currentMonth,
        year: currentYear,
    });

    let totalBudgetLimit = 0;
    let budgetLeft = 0;
    if (budget) {
        totalBudgetLimit = budget.totalLimit || budget.categories.reduce((sum, cat) => sum + cat.limit, 0);
        budgetLeft = totalBudgetLimit - monthlyExpenses;
    } else {
        budgetLeft = -monthlyExpenses; 
    }

    console.log(`[Dashboard] Sync: Expenses=₹${monthlyExpenses}, Limit=₹${totalBudgetLimit}, Utilization=${((monthlyExpenses/totalBudgetLimit)*100).toFixed(1)}%`);

    // --- Format Expense Breakdown for Chart --- 
    const expenseBreakdownChartData = Object.entries(expenseBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort descending

    // --- Aggregate Monthly Comparison Data (using aggregation pipeline) ---
    const monthlyComparisonData = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startOfChartPeriod, $lte: endOfCurrentMonth } // Filter for the chart period
            }
        },
        {
            $project: {
                year: { $year: "$date" },
                month: { $month: "$date" }, // 1-12
                income: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] },
                expenses: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] }
            }
        },
        {
            $group: {
                _id: { year: "$year", month: "$month" },
                totalIncome: { $sum: "$income" },
                totalExpenses: { $sum: "$expenses" }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 } // Sort chronologically
        },
        {
             $limit: numberOfMonthsForChart // Limit to the last N months
        },
        {
            $project: {
                _id: 0,
                name: {
                    $concat: [
                        {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                                    { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                                    { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                                    { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                                    { case: { $eq: ["$_id.month", 5] }, then: "May" },
                                    { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                                    { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                                    { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                                    { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                                    { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                                    { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                                    { case: { $eq: ["$_id.month", 12] }, then: "Dec" }
                                ],
                                default: "Unknown"
                            }
                        },
                        " ",
                        { $toString: "$_id.year" }
                    ]
                },
                Income: "$totalIncome",
                Expenses: "$totalExpenses"
            }
        }
    ]);

    res.json({
        totalBalance: totalBalance, // Now calculated
        income: monthlyIncome,
        expenses: monthlyExpenses,
        budgetLimit: totalBudgetLimit,
        budgetLeft: budgetLeft,
        expenseBreakdown: expenseBreakdownChartData, 
        monthlyComparison: monthlyComparisonData, // Now calculated via aggregation
    });
});

export { getDashboardSummary }; 