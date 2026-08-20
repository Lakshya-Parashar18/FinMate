import User from '../models/User.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import {
  sendBudgetAlertEmail,
  sendHighValueAlertEmail,
  sendGoalMilestoneEmail
} from '../utils/emailService.js';

// Memory cache to prevent spamming duplicate budget warning emails for the same month/tier
const alertHistoryCache = new Map();

/**
 * Evaluate transaction for High Value alerts and Budget Threshold warnings (80%, 100%)
 */
export const evaluateTransactionAlerts = async (userId, transaction) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.email) return;

    const notifSettings = user.notificationSettings || {
      highValueAlert: true,
      highValueLimit: 10000,
      budgetWarning80: true,
      budgetWarning100: true,
      emailChannel: true
    };

    if (!notifSettings.emailChannel) return;

    const txAmount = parseFloat(transaction.amount || 0);
    const txType = transaction.type || 'expense';

    // 1. High-Value Alert Check
    if (txType === 'expense' && notifSettings.highValueAlert && txAmount >= (notifSettings.highValueLimit || 10000)) {
      sendHighValueAlertEmail(
        user.email,
        user.name || 'Valued Member',
        transaction.description || transaction.category || 'Expense',
        txAmount,
        notifSettings.highValueLimit || 10000
      ).catch(err => console.error('Error sending high-value email:', err));
    }

    // 2. Budget Threshold Checks (80% / 100%)
    if (txType === 'expense' && (notifSettings.budgetWarning80 || notifSettings.budgetWarning100)) {
      const now = new Date(transaction.date || Date.now());
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Find user budget for this month/year
      const userBudget = await Budget.findOne({ user: userId, year: currentYear, month: currentMonth }).lean();
      if (!userBudget) return;

      // Find all transactions for this month/year
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const monthTxList = await Transaction.find({
        user: userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean();

      // Calculate category spending
      let categorySpent = 0;
      let totalSpent = 0;

      monthTxList.forEach(tx => {
        const amt = parseFloat(tx.amount || 0);
        totalSpent += amt;
        if (transaction.category && tx.category && tx.category.toLowerCase() === transaction.category.toLowerCase()) {
          categorySpent += amt;
        }
      });

      // Check category budget
      const targetCategoryBudget = (userBudget.categories || []).find(
        c => c.name.toLowerCase() === (transaction.category || '').toLowerCase()
      );

      if (targetCategoryBudget && targetCategoryBudget.limit > 0) {
        const pct = Math.round((categorySpent / targetCategoryBudget.limit) * 100);
        checkAndDispatchBudgetAlert(
          userId,
          user.email,
          user.name,
          transaction.category,
          categorySpent,
          targetCategoryBudget.limit,
          pct,
          currentYear,
          currentMonth,
          notifSettings
        );
      }

      // Check total monthly budget
      if (userBudget.totalLimit && userBudget.totalLimit > 0) {
        const pct = Math.round((totalSpent / userBudget.totalLimit) * 100);
        checkAndDispatchBudgetAlert(
          userId,
          user.email,
          user.name,
          'Total Monthly Budget',
          totalSpent,
          userBudget.totalLimit,
          pct,
          currentYear,
          currentMonth,
          notifSettings
        );
      }
    }
  } catch (err) {
    console.error('Error evaluating transaction alerts:', err);
  }
};

/**
 * Dispatch budget alert with deduplication cooldown
 */
const checkAndDispatchBudgetAlert = (userId, email, name, categoryName, spent, limit, percentage, year, month, notifSettings) => {
  if (percentage < 80) return;

  const tier = percentage >= 100 ? '100' : '80';
  if (tier === '80' && !notifSettings.budgetWarning80) return;
  if (tier === '100' && !notifSettings.budgetWarning100) return;

  const cacheKey = `${userId}-${categoryName}-${year}-${month}-${tier}`;
  if (alertHistoryCache.has(cacheKey)) return;

  alertHistoryCache.set(cacheKey, Date.now());

  sendBudgetAlertEmail(
    email,
    name || 'Valued Member',
    categoryName,
    spent,
    limit,
    percentage >= 100 ? 100 : 80
  ).catch(err => console.error('Error dispatching budget email alert:', err));
};

/**
 * Evaluate goal progress for Milestone alerts (25%, 50%, 75%, 100%)
 */
export const evaluateGoalMilestoneAlerts = async (userId, goal, previousAmount = 0) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.email) return;

    const notifSettings = user.notificationSettings || { goalMilestone: true, emailChannel: true };
    if (!notifSettings.emailChannel || !notifSettings.goalMilestone) return;

    const target = parseFloat(goal.targetAmount || 0);
    const curr = parseFloat(goal.currentAmount || 0);
    const prev = parseFloat(previousAmount || 0);

    if (target <= 0) return;

    const prevPct = (prev / target) * 100;
    const currPct = (curr / target) * 100;

    const milestones = [25, 50, 75, 100];
    const hitMilestone = milestones.find(m => prevPct < m && currPct >= m);

    if (hitMilestone) {
      sendGoalMilestoneEmail(
        user.email,
        user.name || 'Saver',
        goal.name || 'Savings Goal',
        curr,
        target,
        hitMilestone
      ).catch(err => console.error('Error sending goal milestone email:', err));
    }
  } catch (err) {
    console.error('Error evaluating goal milestone alerts:', err);
  }
};
