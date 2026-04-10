import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js'; // Needed to calculate spending
import mongoose from 'mongoose';

// @desc    Get budget for a specific month/year (or current if not specified)
// @route   GET /api/budgets?month=M&year=YYYY
// @access  Private
const getBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // Use query params or default to current month/year
    const year = parseInt(req.query.year) || currentYear;
    const month = req.query.month ? parseInt(req.query.month) : currentMonth;

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        return res.status(400).json({ message: 'Invalid year or month specified' });
    }

    // --- Calculate Dynamic Spending --- 
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    // Aggregate transactions for this user within the budget period
    const spendingByCategory = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense', 
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category', 
          totalSpent: { $sum: { $abs: '$amount' } }, // Sum absolute amounts
        },
      },
    ]);

    // Calculate total spending across ALL expenses this month
    const totalMonthSpending = spendingByCategory.reduce((sum, item) => sum + item.totalSpent, 0);

    // Find the budget document for the user and period
    let budget = await Budget.findOne({ user: userId, year, month });

    if (!budget) {
      // If no budget exists for this period, maybe return a default structure or 404?
      // Let's return an empty structure for the frontend to handle
      return res.status(200).json({
        year,
        month,
        totalLimit: null,
        categories: [],
        totalSpent: totalMonthSpending,
      });
    }

    // Map calculated spending onto the budget categories
    const categoriesWithSpending = budget.categories.map(cat => {
        const spendingData = spendingByCategory.find(s => 
            s._id && s._id.toLowerCase() === cat.name.toLowerCase()
        );
        return {
            name: cat.name,
            limit: cat.limit,
            spent: spendingData ? spendingData.totalSpent : 0,
        };
    });

    // --- Identify Unassigned (Miscellaneous) Spending ---
    const definedCategoryNames = budget.categories.map(cat => cat.name.toLowerCase());
    const hasManualMisc = definedCategoryNames.includes('miscellaneous');

    const unassignedSpending = spendingByCategory.filter(s => 
        !s._id || !definedCategoryNames.includes(s._id.toLowerCase())
    );

    const totalMiscSpent = unassignedSpending.reduce((sum, item) => sum + item.totalSpent, 0);

    // If there is misc spending and NO manually defined 'miscellaneous' category, add a virtual one
    if (totalMiscSpent > 0 && !hasManualMisc) {
        categoriesWithSpending.push({
            name: 'Miscellaneous',
            limit: 0,
            spent: totalMiscSpent,
            isMisc: true 
        });
    }
    
    // Sum of spending within DEFINED budget categories for category-based tracking
    const totalBudgetedSpent = categoriesWithSpending.reduce((sum, cat) => sum + (cat.isMisc ? 0 : cat.spent), 0);

    // Return the budget data including calculated spending
    res.status(200).json({
      _id: budget._id,
      user: budget.user,
      year: budget.year,
      month: budget.month,
      totalLimit: budget.totalLimit,
      categories: categoriesWithSpending, 
      totalSpent: totalMonthSpending, 
      totalBudgetedSpent: totalBudgetedSpent,
      createdAt: budget.createdAt,
    });

  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ message: 'Server error fetching budget' });
  }
};

// @desc    Set or update budget for a specific month/year
// @route   POST /api/budgets
// @access  Private
const setBudget = async (req, res) => {
  const { year, month, totalLimit, categories } = req.body; // Expect categories as [{ name: "Food", limit: 500 }, ...]
  const userId = req.user._id;

  // Basic validation
  if (year === undefined || month === undefined || !Array.isArray(categories)) {
    return res.status(400).json({ message: 'Year, month, and categories array are required' });
  }
  if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || month < 0 || month > 11) {
      return res.status(400).json({ message: 'Invalid year or month format' });
  }
  if (categories.some(cat => !cat.name || cat.limit === undefined || isNaN(parseFloat(cat.limit)) || cat.limit < 0)) {
      return res.status(400).json({ message: 'Invalid category format. Each category needs name and a non-negative limit.' });
  }
  if (totalLimit !== undefined && (isNaN(parseFloat(totalLimit)) || totalLimit < 0)) {
      return res.status(400).json({ message: 'Invalid totalLimit format. Must be a non-negative number.' });
  }

  try {
    const budgetData = {
      user: new mongoose.Types.ObjectId(userId),
      year: parseInt(year),
      month: parseInt(month),
      totalLimit: totalLimit !== undefined ? parseFloat(totalLimit) : null,
      categories: categories.map(cat => ({ name: cat.name, limit: parseFloat(cat.limit) })),
    };

    console.log(`Setting budget for user ${userId}, period ${month}/${year}`);

    // Use findOneAndUpdate with upsert: true 
    // This will update the budget if one exists for that user/month/year, or create it if it doesn't.
    const updatedBudget = await Budget.findOneAndUpdate(
      { 
        user: new mongoose.Types.ObjectId(userId), 
        year: parseInt(year), 
        month: parseInt(month) 
      }, // Find criteria
      budgetData, // Data to update or insert
      { new: true, upsert: true, runValidators: true } // Options: return updated doc, create if not found, run schema validation
    );

    console.log('Budget updated successfully:', updatedBudget._id);
    res.status(200).json(updatedBudget);

  } catch (error) {
    console.error('Error setting budget:', error);
    // Handle potential duplicate key error if index creation failed or timing issue
    if (error.code === 11000) {
        return res.status(409).json({ message: 'Budget for this period might already exist (concurrent request?).' });
    }
    res.status(500).json({ message: 'Server error setting budget' });
  }
};

export { getBudget, setBudget }; 