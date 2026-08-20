import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaExchangeAlt,
  FaWallet,
  FaChartBar,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaFilter,
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaHeartbeat,
  FaSync,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTrophy,
  FaShieldAlt,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import axios from 'axios';
import lottie from 'lottie-web';
import dayjs from 'dayjs'; // For date formatting and manipulation
import utc from 'dayjs/plugin/utc';
import aiIconData from '../assets/ai-icon.json';
import { API_URL } from '../config';
import Loading from '../components/Loading';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext'; // Use auth context
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import './Analytics.css';

dayjs.extend(utc);

const Analytics = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { formatCurrency, formatCurrencyRaw, currency, chartStyle, insightDensity, displaySettings } = useDisplaySettings();
  const firstDayOfWeek = displaySettings?.firstDayOfWeek || 'monday';

  // State for fetched data
  const [analyticsData, setAnalyticsData] = useState({
    startDate: '',
    endDate: '',
    spendingByCategory: [],
    prevSpendingByCategory: [],
    spendingOverTime: [],
    incomeVsExpense: { income: 0, expenses: 0 },
    budgetLimit: 0
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // State for date range selection
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startDate, setStartDate] = useState(dayjs().subtract(29, 'day').format('YYYY-MM-DD'));
  const [activePreset, setActivePreset] = useState('30d');

  const setQuickRange = (rangeType) => {
    setActivePreset(rangeType);
    const today = dayjs();
    let start, end;

    if (rangeType === '1m') {
      start = today.startOf('month').format('YYYY-MM-DD');
      end = today.format('YYYY-MM-DD');
    } else if (rangeType === '30d') {
      start = today.subtract(29, 'day').format('YYYY-MM-DD');
      end = today.format('YYYY-MM-DD');
    } else if (rangeType === '3m') {
      const quarterMonth = Math.floor(today.month() / 3) * 3;
      start = dayjs().month(quarterMonth).startOf('month').format('YYYY-MM-DD');
      end = today.format('YYYY-MM-DD');
    } else if (rangeType === '1y') {
      start = today.startOf('year').format('YYYY-MM-DD');
      end = today.format('YYYY-MM-DD');
    }

    if (start && end) {
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Forecast Widget State
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredChart, setHoveredChart] = useState(null);

  // Financial Goals States
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Anomaly Risk Summary State
  const [anomalySummary, setAnomalySummary] = useState([]);
  const [anomalySummaryLoading, setAnomalySummaryLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalCategory, setGoalCategory] = useState('General');

  // AI Monthly Summary State
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Lottie AI icon ref
  const aiIconRef = useRef(null);
  const copilotAiIconRef = useRef(null);

  // Redesigned Money Flow States
  const [hoveredSankeyNode, setHoveredSankeyNode] = useState(null);
  const [selectedSankeyNode, setSelectedSankeyNode] = useState(null);
  const [cardCoords, setCardCoords] = useState({});
  const [resizeToggle, setResizeToggle] = useState(false);

  const containerRef = useRef(null);




  // ResizeObserver to calculate element positions for dynamic bezier vectors
  useEffect(() => {
    if (!containerRef.current) return;

    const measureCoords = () => {
      if (!containerRef.current) return;
      const parentRect = containerRef.current.getBoundingClientRect();
      const zoomFactor = window.innerWidth > 768 ? 0.9 : 1.0;
      const coordsMap = {};
      const cards = containerRef.current.querySelectorAll('[data-flow-id]');
      cards.forEach(card => {
        const id = card.getAttribute('data-flow-id');
        const rect = card.getBoundingClientRect();
        coordsMap[id] = {
          x: (rect.left - parentRect.left) / zoomFactor,
          y: (rect.top - parentRect.top) / zoomFactor,
          width: rect.width / zoomFactor,
          height: rect.height / zoomFactor
        };
      });
      setCardCoords(coordsMap);
    };

    measureCoords();

    const handleResize = () => {
      measureCoords();
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        measureCoords();
      });
      resizeObserver.observe(containerRef.current);
    }

    const timeoutId = setTimeout(measureCoords, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [analyticsData, resizeToggle, selectedSankeyNode]);

  useEffect(() => {
    let anim1, anim2;
    if (aiIconRef.current) {
      anim1 = lottie.loadAnimation({
        container: aiIconRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: aiIconData,
      });
    }
    if (copilotAiIconRef.current) {
      anim2 = lottie.loadAnimation({
        container: copilotAiIconRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: aiIconData,
      });
    }
    return () => {
      if (anim1) anim1.destroy();
      if (anim2) anim2.destroy();
    };
  }, [loading, apiError]); // re-run once the conditional div is in the DOM

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async (start, end) => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.get(`${API_URL}/analytics`, {
        params: { startDate: start, endDate: end },
        withCredentials: true
      });
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setApiError(err.response?.data?.message || 'Failed to load analytics data.');
      if (err.response?.status === 401) {
        logout(); // Use context logout
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const fetchForecastData = useCallback(async () => {
    setForecastLoading(true);
    setForecastError('');
    try {
      const response = await axios.get(`${API_URL}/analytics/forecast`, {
        withCredentials: true
      });
      setForecast(response.data);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setForecastError('Failed to generate spending forecast.');
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const fetchAnomalySummary = useCallback(async () => {
    setAnomalySummaryLoading(true);
    try {
      // Fetch recent transactions with their embedded anomaly data
      const response = await axios.get(`${API_URL}/transactions`, { withCredentials: true });
      const txs = response.data.transactions || [];
      const flagged = txs.filter(t => t.anomaly?.isAnomaly);
      setAnomalySummary(flagged.slice(0, 5)); // Show up to 5 flagged transactions
    } catch (err) {
      setAnomalySummary([]);
    } finally {
      setAnomalySummaryLoading(false);
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError('');
    try {
      const response = await axios.get(`${API_URL}/goals`, { withCredentials: true });
      setGoals(response.data);
    } catch (err) {
      console.error('Error fetching savings goals:', err);
      setGoalsError('Failed to load savings goals.');
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  const fetchMonthlySummary = useCallback(async (start, end) => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const response = await axios.get(`${API_URL}/analytics/summary`, {
        params: { startDate: start, endDate: end },
        withCredentials: true
      });
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching AI summary:', err);
      setSummaryError('Could not generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalName(goal.name);
      setGoalTargetAmount(goal.targetAmount);
      setGoalCurrentAmount(goal.currentAmount);
      setGoalTargetDate(dayjs(goal.targetDate).format('YYYY-MM-DD'));
      setGoalCategory(goal.category || 'General');
    } else {
      setEditingGoal(null);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalCurrentAmount('');
      setGoalTargetDate('');
      setGoalCategory('General');
    }
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTargetAmount || !goalTargetDate) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = {
      name: goalName,
      targetAmount: Number(goalTargetAmount),
      currentAmount: Number(goalCurrentAmount) || 0,
      targetDate: goalTargetDate,
      category: goalCategory
    };

    try {
      if (editingGoal) {
        await axios.put(`${API_URL}/goals/${editingGoal._id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/goals`, payload, { withCredentials: true });
      }
      setShowGoalModal(false);
      fetchGoals();
    } catch (err) {
      console.error('Error saving goal:', err);
      alert(err.response?.data?.message || 'Error saving goal.');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await axios.delete(`${API_URL}/goals/${id}`, { withCredentials: true });
      fetchGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal.');
    }
  };

  // Initial fetch and refetch when dates change
  useEffect(() => {
    if (user) {
      fetchAnalyticsData(startDate, endDate);
      fetchForecastData();
      fetchAnomalySummary();
      fetchGoals();
      fetchMonthlySummary(startDate, endDate);
    }
  }, [user, startDate, endDate, fetchAnalyticsData, fetchForecastData, fetchGoals, fetchMonthlySummary]);

  // Handle date changes and trigger refetch
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
    // Fetch is triggered by useEffect dependency change
  };

  // --- Remove old user profile fetching logic & state ---
  // const [userProfile, setUserProfile] = useState(...);
  // useEffect(() => { loadUserData(); }, ...);
  // const fetchUserData = async () => { ... };
  // const handleMouseEnter = () => { ... };
  // const handleMouseLeave = () => { ... };
  // const [showDropdown, setShowDropdown] = useState(false);
  // const [timeoutId, setTimeoutId] = useState(null);

  const userAvatar = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  const handleLogoutClick = () => {
    logout();
  };

  // Compute dynamically Calculated Financial Health Score index
  const calculateFinancialHealth = () => {
    const income = analyticsData.incomeVsExpense.income || 0;
    const expenses = analyticsData.incomeVsExpense.expenses || 0;
    const items = analyticsData.spendingOverTime || [];

    // 1. Savings Rate Score (Max 20 pts)
    // Savings Rate = (Income - Expenses) / Income * 100
    // Ideal: > 20% savings rate (100% score). Negatives rate score 0
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    let savingsScore = 0;
    if (savingsRate > 20) savingsScore = 20;
    else if (savingsRate > 0) savingsScore = (savingsRate / 20) * 20;

    // 2. Budget Adherence Score (Max 20 pts)
    // Compare total expenses against budgetLimit
    let budgetScore = 15; // default neutral if budget not set
    const bLimit = analyticsData.budgetLimit || 0;
    if (bLimit > 0) {
      if (expenses <= bLimit) {
        budgetScore = 20;
      } else {
        const excessRatio = (expenses - bLimit) / bLimit;
        budgetScore = Math.max(0, 20 - (excessRatio * 20));
      }
    }

    // 3. Income Stability Score (Max 20 pts)
    // Validate regular flow. Check if salary deposits are detected in the active period
    const hasSalaryEvent = items.some(day => (day.events || []).some(e => e.type === 'salary'));
    const stabilityScore = hasSalaryEvent ? 20 : 12;

    // 4. Spending Consistency Score (Max 20 pts)
    // Analyze coefficient of variation (CV = stdDev / avgDaily)
    const dailyValues = items.map(d => d.value || 0).filter(v => v > 0);
    let consistencyScore = 15;
    if (dailyValues.length > 1) {
      const avgDaily = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
      const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) / dailyValues.length;
      const stdDev = Math.sqrt(variance);
      const cv = avgDaily > 0 ? stdDev / avgDaily : 0;
      if (cv <= 0.5) consistencyScore = 20;
      else if (cv >= 1.5) consistencyScore = 5;
      else consistencyScore = 20 - ((cv - 0.5) * 15);
    }

    // 5. Expense-to-Income Ratio Score (Max 20 pts)
    // Ideal: <= 50% (50/30/20 standard)
    const expenseRatio = income > 0 ? expenses / income : 1;
    let ratioScore = 0;
    if (expenseRatio <= 0.5) ratioScore = 20;
    else if (expenseRatio >= 1.0) ratioScore = 0;
    else ratioScore = 20 - ((expenseRatio - 0.5) * 40);

    const totalScore = Math.round(savingsScore + budgetScore + stabilityScore + consistencyScore + ratioScore);

    // Dynamic factor insights explanation
    const getHealthInsight = (total, rawScores) => {
      if (total >= 80) {
        return `Outstanding! All 5 factors are strong. You scored ${total}/100 — keep your savings above 20% and expenses under 50% of income to stay here.`;
      }

      // Find the single weakest factor by raw score
      const scoreMap = {
        'Savings Rate': savingsScore,
        'Budget Compliance': budgetScore,
        'Income Stability': stabilityScore,
        'Spending Patterns': consistencyScore,
        'Expense-to-Income': ratioScore
      };
      const weakest = Object.entries(scoreMap).reduce((a, b) => b[1] < a[1] ? b : a);
      const [weakName, weakScore] = weakest;
      const missing = (20 - weakScore).toFixed(1);

      const tips = {
        'Savings Rate': `Your savings rate is ${savingsRate.toFixed(1)}% — target >20% to score full marks here. Try reducing discretionary expenses by ₹${Math.max(0, Math.ceil((0.2 * (income || 0)) - savings)).toLocaleString('en-IN')} this month.`,
        'Budget Compliance': bLimit > 0
          ? `Your expenses exceeded your budget — you lost ${missing} pts. Stay within your set budget limit to recover them.`
          : `No budget is set, costing you ${missing} pts. Set a monthly budget in the Budget section to unlock full marks.`,
        'Income Stability': `No salary event was detected this period, costing you ${missing} pts. Log your salary as an income transaction so FinMate can recognise regular income.`,
        'Spending Patterns': `Your daily spending is inconsistent (high variance), costing you ${missing} pts. Spread large purchases over multiple days or weeks to reduce the variability score.`,
        'Expense-to-Income': `Your expense-to-income ratio is ${(expenseRatio * 100).toFixed(1)}% — target below 50% to score full marks. You need to cut expenses or grow income to close the gap.`
      };

      return `Weakest factor: ${weakName} (${Math.round(weakScore)}/20 pts). ${tips[weakName]}`;
    };

    const normalizedBreakdown = {
      savingsRate: Math.round(savingsScore * 5),
      budgetAdherence: Math.round(budgetScore * 5),
      incomeStability: Math.round(stabilityScore * 5),
      spendingConsistency: Math.round(consistencyScore * 5),
      expenseToIncome: Math.round(ratioScore * 5)
    };

    return {
      total: totalScore,
      breakdown: normalizedBreakdown,
      insight: getHealthInsight(totalScore),
      details: {
        savingsRateVal: savingsRate.toFixed(1),
        expenseRatioVal: (expenseRatio * 100).toFixed(1),
        budgetLimit: bLimit,
        rawScores: {
          savingsScore: Math.round(savingsScore),
          budgetScore: Math.round(budgetScore),
          stabilityScore: Math.round(stabilityScore),
          consistencyScore: Math.round(consistencyScore),
          ratioScore: Math.round(ratioScore)
        }
      }
    };
  };

  // --- Chart Config --- 
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9F7AEA', '#F6E05E', '#ED8936'];

  // Render custom event annotations dots directly on the chart line
  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    const events = payload.events || [];
    if (events.length === 0) return null;

    let strokeColor = '#f43f5e'; // Default rose
    const hasSalary = events.some(e => e.type === 'salary');
    const hasCrossing = events.some(e => e.type === 'budget_crossing');
    const hasRecurring = events.some(e => e.type === 'recurring');

    if (hasSalary) {
      strokeColor = '#10b981'; // Green for salary
    } else if (hasRecurring && !hasCrossing) {
      strokeColor = '#3b82f6'; // Blue for recurring
    }

    return (
      <g key={`dot-${payload.date}-${cx}-${cy}`} style={{ pointerEvents: 'none' }}>
        {/* Pulse ring animation wrapper */}
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={1.5}
          className="chart-dot-pulse"
        />
        {/* Inner solid node */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={strokeColor}
          stroke="#0b0f1a"
          strokeWidth={1.5}
        />
      </g>
    );
  };

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Validate that the hovered payload corresponds to the active hovered index
      const hoveredItem = hoveredIndex !== null ? analyticsData.spendingOverTime[hoveredIndex] : null;
      if (!hoveredItem || payload[0]?.payload?.date !== hoveredItem.date) {
        return null;
      }

      // Check if the label is a valid date string (e.g., spending over time dates)
      const isDate = dayjs(label).isValid() && isNaN(Number(label)) && String(label).includes('-');
      const formattedLabel = isDate ? dayjs(label).format('MMM DD, YYYY') : label;
      const themeColor = payload[0]?.color || payload[0]?.payload?.fill || '#f43f5e';
      const events = payload[0]?.payload?.events || [];
      if (events.length === 0) return null;

      return (
        <div className="custom-tooltip-premium">
          <div className="tooltip-header">
            <span
              className="tooltip-dot"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 0 8px ${themeColor}`
              }}
            ></span>
            <span className="tooltip-date">{formattedLabel}</span>
          </div>
          <div className="tooltip-body">
            {payload.map((entry, index) => (
              <div key={`item-${index}`} className="tooltip-row">
                <span className="tooltip-label">{entry.name}</span>
                <span
                  className="tooltip-value"
                  style={{
                    color: themeColor,
                    textShadow: `0 0 12px ${themeColor}40`
                  }}
                >
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}

            {/* Event annotations timeline */}
            {events.length > 0 && (
              <div className="tooltip-events-section">
                {events.map((evt, idx) => {
                  let evtIcon = <span className="event-icon">💡</span>;
                  let evtColorClass = 'event-general';
                  if (evt.type === 'salary') {
                    evtIcon = <img src="https://img.icons8.com/dotty/80/receive-change.png" className="event-icon-img" alt="salary" />;
                    evtColorClass = 'event-salary';
                  } else if (evt.type === 'high_expense') {
                    evtIcon = <span className="event-icon">⚠️</span>;
                    evtColorClass = 'event-high';
                  } else if (evt.type === 'recurring') {
                    evtIcon = <img src="https://img.icons8.com/fluency/48/recurring-appointment-exception.png" className="event-icon-img-recurring" alt="recurring" />;
                    evtColorClass = 'event-recurring';
                  } else if (evt.type === 'budget_crossing') {
                    evtIcon = <img src="https://img.icons8.com/ios/50/money-bag.png" className="event-icon-img-budget" alt="budget" />;
                    evtColorClass = 'event-budget';
                  } else if (evt.type === 'category_spike') {
                    evtIcon = <span className="event-icon">📈</span>;
                    evtColorClass = 'event-spike';
                  }

                  return (
                    <div key={`evt-${idx}`} className={`tooltip-event-row ${evtColorClass}`}>
                      <div className="event-row-header">
                        {evtIcon}
                        <span className="event-label">{evt.label}</span>
                      </div>
                      <p className="event-desc">{evt.description}</p>
                      {evt.amount !== undefined && (
                        <span className="event-amount">
                          {evt.amount > 0 ? '+' : ''}{formatCurrency(evt.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Category Charts (Donut + Radar)
  const CategoryTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.value;
      const name = data.name || data.subject;

      // Map color gradient URL references back to high-fidelity solid color codes
      const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
      const catIndex = analyticsData.spendingByCategory.findIndex(c => c.name === name || c.subject === name);
      const themeColor = catIndex !== -1 ? colorPalette[catIndex % colorPalette.length] : '#10b981';

      const total = analyticsData.spendingByCategory.reduce((s, c) => s + c.value, 0);
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

      return (
        <div className="custom-tooltip-premium">
          <div className="tooltip-header">
            <span
              className="tooltip-dot"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 0 8px ${themeColor}`
              }}
            ></span>
            <span className="tooltip-date">{name}</span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Spent</span>
              <span
                className="tooltip-value"
                style={{
                  color: themeColor,
                  textShadow: `0 0 12px ${themeColor}40`
                }}
              >
                {formatCurrency(value)}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Share</span>
              <span className="tooltip-value tooltip-share-value" style={{ textShadow: 'none' }}>
                {pct}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const generateHeatmapData = () => {
    const items = analyticsData.spendingOverTime || [];
    if (items.length === 0) return { weeks: [], maxSpend: 0 };

    const spentMap = new Map();
    items.forEach(item => {
      spentMap.set(dayjs(item.date).format('YYYY-MM-DD'), item.value || 0);
    });

    const start = dayjs(analyticsData.startDate);
    const end = dayjs(analyticsData.endDate);
    const totalDays = end.diff(start, 'day') + 1;

    const dayList = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDay = start.add(i, 'day');
      const dateStr = currentDay.format('YYYY-MM-DD');
      dayList.push({
        date: dateStr,
        dayLabel: currentDay.format('ddd'),
        dateObj: currentDay,
        value: spentMap.get(dateStr) || 0
      });
    }

    const maxSpend = Math.max(...dayList.map(d => d.value), 0);
    const weeks = [];
    let currentWeek = Array(7).fill(null);

    // firstDayOfWeek: 'monday' → Mon=0…Sun=6; 'sunday' → Sun=0…Sat=6
    const isSundayFirst = firstDayOfWeek === 'sunday';

    dayList.forEach(day => {
      // day() returns 0=Sun, 1=Mon ... 6=Sat
      let rawDay = day.dateObj.day();
      // Map to column index based on preferred first day
      let weekday;
      if (isSundayFirst) {
        weekday = rawDay; // Sun=0, Mon=1 ... Sat=6
      } else {
        weekday = rawDay === 0 ? 6 : rawDay - 1; // Mon=0 ... Sun=6
      }

      currentWeek[weekday] = {
        ...day,
        intensity: maxSpend > 0 ? day.value / maxSpend : 0
      };

      if (weekday === 6) {
        weeks.push(currentWeek);
        currentWeek = Array(7).fill(null);
      }
    });

    if (currentWeek.some(d => d !== null)) {
      weeks.push(currentWeek);
    }

    return { weeks, maxSpend };
  };

  const financialHealthMemo = useMemo(() => calculateFinancialHealth(), [analyticsData]);
  const heatmapDataMemo = useMemo(() => generateHeatmapData(), [analyticsData, firstDayOfWeek]);

  const RadarHoverSpokes = ({ cx, cy, outerRadius }) => {
    const categories = analyticsData.spendingByCategory || [];
    const N = categories.length;
    if (N === 0) return null;

    return (
      <g>
        {categories.map((cat, i) => {
          const angle = -90 + (i * 360) / N;
          const angleRad = (angle * Math.PI) / 180;

          // Coordinates for the spoke line
          const x2 = cx + outerRadius * Math.cos(angleRad);
          const y2 = cy + outerRadius * Math.sin(angleRad);

          const isHovered = hoveredCategory === cat.name;

          return (
            <g key={`spoke-${cat.name}`}>
              {/* Visual highlight line when hovered */}
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="#10b981"
                strokeWidth={isHovered ? 2.5 : 1}
                strokeOpacity={isHovered ? 0.45 : 0.08}
                style={{ transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease', pointerEvents: 'none' }}
              />
              {/* Transparent fat hover target line */}
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={16}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHoveredCategory(cat.name);
                  setHoveredChart('radar');
                }}
                onMouseLeave={() => {
                  setHoveredCategory(null);
                  setHoveredChart(null);
                }}
              />
            </g>
          );
        })}
      </g>
    );
  };

  const getCurvePath = (source, target, sourceIndex = 0, totalSources = 1) => {
    if (!source || !target) return '';

    let y1 = source.y + source.height / 2;
    if (totalSources > 1) {
      const padding = 16;
      const usableHeight = Math.max(20, source.height - (padding * 2));
      const step = usableHeight / (totalSources - 1 || 1);
      y1 = source.y + padding + (sourceIndex * step);
    }

    const x1 = source.x + source.width;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;

    const deltaX = Math.abs(x2 - x1);
    const cpOffset = Math.min(deltaX * 0.55, 120);

    const cpx1 = x1 + cpOffset;
    const cpy1 = y1;
    const cpx2 = x2 - cpOffset;
    const cpy2 = y2;

    return `M ${x1} ${y1} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x2} ${y2}`;
  };

  const getCategoryColor = (name, index) => {
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#f43f5e', // Rose
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#14b8a6'  // Teal
    ];
    return colors[index % colors.length];
  };

  // ─── Category icon helper ────────────────────────────────────────
  const getCategoryIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('grocery')) return '🍽️';
    if (n.includes('transport') || n.includes('travel') || n.includes('fuel') || n.includes('uber') || n.includes('ola') || n.includes('cab')) return '🚗';
    if (n.includes('entertainment') || n.includes('movie') || n.includes('netflix') || n.includes('streaming') || n.includes('gaming')) return '🎬';
    if (n.includes('shopping') || n.includes('clothes') || n.includes('amazon') || n.includes('fashion')) return '🛍️';
    if (n.includes('health') || n.includes('medical') || n.includes('gym') || n.includes('fitness') || n.includes('pharmacy')) return '🏥';
    if (n.includes('utilities') || n.includes('electricity') || n.includes('water') || n.includes('internet') || n.includes('bill')) return '⚡';
    if (n.includes('rent') || n.includes('housing') || n.includes('mortgage') || n.includes('house')) return '🏠';
    if (n.includes('education') || n.includes('books') || n.includes('course') || n.includes('school') || n.includes('tuition')) return '📚';
    if (n.includes('insurance')) return '🛡️';
    if (n.includes('savings') || n.includes('investment') || n.includes('mutual') || n.includes('sip')) return '💰';
    if (n.includes('misc') || n.includes('other') || n.includes('general')) return '📦';
    if (n.includes('personal') || n.includes('care') || n.includes('beauty')) return '✨';
    if (n.includes('subscri')) return '📱';
    return '💳';
  };

  // ─── Category trend comparator ────────────────────────────────────
  const getCategoryTrend = (catName, currentValue) => {
    const prevCat = (analyticsData.prevSpendingByCategory || []).find(
      c => c.name.toLowerCase() === catName.toLowerCase()
    );
    if (!prevCat || prevCat.value === 0) return null;
    const changePct = ((currentValue - prevCat.value) / prevCat.value) * 100;
    return {
      percentage: Math.abs(changePct).toFixed(0),
      direction: changePct >= 0 ? 'up' : 'down',
      text: `${changePct >= 0 ? '↑' : '↓'}${Math.abs(changePct).toFixed(0)}%`
    };
  };

  // ─── Proportional category budget allocator ────────────────────────
  const getCategoryBudgetStatus = (catName, value) => {
    const globalLimit = analyticsData.budgetLimit || 0;
    if (globalLimit === 0) return { status: 'No target set', class: 'neutral' };

    const allocations = {
      food: 0.15, dining: 0.15, grocery: 0.15, shopping: 0.10,
      entertainment: 0.10, housing: 0.30, rent: 0.30, utilities: 0.08,
      transport: 0.10, travel: 0.10, healthcare: 0.10, education: 0.15,
      investment: 0.20, savings: 0.20
    };

    const key = catName.toLowerCase();
    const matchedKey = Object.keys(allocations).find(k => key.includes(k));
    const targetPct = matchedKey ? allocations[matchedKey] : 0.10;
    const categoryLimit = globalLimit * targetPct;

    const ratio = value / categoryLimit;
    if (ratio > 1.1) return { status: 'Over Limit', class: 'danger', limit: categoryLimit };
    if (ratio > 0.85) return { status: 'Near Limit', class: 'warning', limit: categoryLimit };
    return { status: 'On Track', class: 'success', limit: categoryLimit };
  };

  // ─── Node insights generator ──────────────────────────────────────
  const getSelectedNodeDetails = (nodeId) => {
    if (!nodeId) return null;
    const income = analyticsData.incomeVsExpense?.income || 0;
    const expenses = analyticsData.incomeVsExpense?.expenses || 0;
    const savings = Math.max(0, income - expenses);

    if (nodeId === 'income') {
      const trend = income >= expenses ? 'Steady Active Inflow' : 'Deficit Active Inflow';
      return {
        id: 'income',
        label: 'Total Income',
        value: income,
        icon: '💰',
        color: '#10b981',
        subtitle: 'Primary active cash inflow',
        trend: trend,
        trendClass: 'success',
        headline: 'Active Cash Inflow Audit',
        description: `Your recorded active income for this period is ${formatCurrency(income)}. Distributing this effectively across dynamic outlays and wealth builders builds your financial security.`,
        recommendation: 'Direct a steady 20% block of income directly to savings on payday before setting weekly discretionary thresholds.',
        health: income >= expenses ? 'healthy' : 'warning',
        healthText: income >= expenses ? 'Active Surplus' : 'Deficit Running',
        risk: income >= expenses ? 'Low' : 'High',
        riskClass: income >= expenses ? 'success' : 'danger'
      };
    }

    if (nodeId === 'savings') {
      const savPct = income > 0 ? (savings / income) * 100 : 0;
      let health = 'Critical';
      let healthClass = 'danger';
      let rec = 'Your active savings rate is very low. Plan a strict weekly limit on restaurant meals and impulse checkouts to build an active emergency reserve.';

      if (savPct >= 20) {
        health = 'Excellent';
        healthClass = 'success';
        rec = 'Exceptional job! You are hitting the target 20% savings margin. Route this excess cash into liquid mutual funds or high-yield savings to beat inflation.';
      } else if (savPct >= 10) {
        health = 'Moderate';
        healthClass = 'warning';
        rec = 'Your savings rate is positive but below the optimum 20% margin. Audit active streaming platforms and auto-renewals to free up an extra 5% of income.';
      }

      return {
        id: 'savings',
        label: 'Net Savings',
        value: savings,
        icon: '🏦',
        color: '#06b6d4',
        subtitle: `${savPct.toFixed(1)}% savings rate`,
        trend: `${health} Savings`,
        trendClass: healthClass,
        headline: 'Savings & Surplus Analytics',
        description: `You accumulated ${formatCurrency(savings)} in net savings this month, representing a realized ${savPct.toFixed(1)}% savings rate.`,
        recommendation: rec,
        health: healthClass === 'success' ? 'healthy' : 'warning',
        healthText: `${savPct.toFixed(0)}% Savings Rate`,
        risk: savPct >= 15 ? 'Low' : (savPct >= 8 ? 'Medium' : 'High'),
        riskClass: savPct >= 15 ? 'success' : (savPct >= 8 ? 'warning' : 'danger')
      };
    }

    if (nodeId === 'expenses') {
      const expPct = income > 0 ? (expenses / income) * 100 : 0;
      let health = 'Optimized';
      let healthClass = 'success';
      let rec = 'Outstanding cash flow management. Your monthly active spending is low, leaving massive margins to compound capital.';

      if (expPct > 80) {
        health = 'Over-Extended';
        healthClass = 'danger';
        rec = 'Total outflows eat up a massive portion of your monthly earnings. Review your top 3 categories and delay discretionary items for 15 days.';
      } else if (expPct > 60) {
        health = 'Normal Outflow';
        healthClass = 'warning';
        rec = 'Expenses are within target parameters. Optimize further by checking if utility accounts can be set on dynamic energy plans or bundle deals.';
      }

      return {
        id: 'expenses',
        label: 'Total Spent',
        value: expenses,
        icon: '💸',
        color: '#f43f5e',
        subtitle: `${expPct.toFixed(1)}% expense ratio`,
        trend: health,
        trendClass: healthClass,
        headline: 'Total Cash Outflow Audit',
        description: `Active spending totals ${formatCurrency(expenses)}, consuming ${expPct.toFixed(1)}% of your active income flows.`,
        recommendation: rec,
        health: healthClass === 'success' ? 'healthy' : 'warning',
        healthText: `${expPct.toFixed(0)}% Expense Ratio`,
        risk: expPct <= 70 ? 'Low' : (expPct <= 85 ? 'Medium' : 'High'),
        riskClass: expPct <= 70 ? 'success' : (expPct <= 85 ? 'warning' : 'danger')
      };
    }

    if (nodeId.startsWith('cat-')) {
      const catName = nodeId.replace('cat-', '');
      const categoriesList = analyticsData.spendingByCategory || [];
      const cat = categoriesList.find(c => c.name === catName);
      if (!cat) return null;

      const pctOfExp = expenses > 0 ? (cat.value / expenses) * 100 : 0;
      const trendInfo = getCategoryTrend(catName, cat.value);
      const budgetInfo = getCategoryBudgetStatus(catName, cat.value);

      let rec = `Track this category dynamically. Trimming minor outlays in ${cat.name} by just ${formatCurrency(150)} daily accumulates ${formatCurrency(4500)} in monthly savings.`;
      const nameLower = catName.toLowerCase();
      if (nameLower.includes('food') || nameLower.includes('dining') || nameLower.includes('grocer')) {
        rec = 'Establish meal preps and set grocery orders weekly. Impulsive restaurant checkouts or ordering deliveries carry a heavy premium.';
      } else if (nameLower.includes('shop') || nameLower.includes('fashion') || nameLower.includes('clot')) {
        rec = 'Implement a strict 48-hour cooling-off rule on shopping carts. Deferring impulse purchases filters out discretionary regrets.';
      } else if (nameLower.includes('enter') || nameLower.includes('movie') || nameLower.includes('stream')) {
        rec = 'Audit active digital and media subscriptions. Canceling even a single underutilized channel provides immediate, hands-free monthly savings.';
      } else if (nameLower.includes('rent') || nameLower.includes('house') || nameLower.includes('home')) {
        rec = 'Housing is typically a fixed outlay. Optimize dynamic utility spending (water, AC, power timers) to trim margins by 10%.';
      } else if (nameLower.includes('trans') || nameLower.includes('car') || nameLower.includes('fuel') || nameLower.includes('travel')) {
        rec = 'Look into fuel loyalty schemes, ride-share pools, or transit passes. Setting off-peak commute patterns can cut commuting fees by 15%.';
      }

      return {
        id: nodeId,
        label: cat.name,
        value: cat.value,
        icon: getCategoryIcon(cat.name),
        subtitle: `${pctOfExp.toFixed(1)}% of total spent`,
        trend: trendInfo ? trendInfo.text + ' vs last month' : 'No change data',
        trendClass: trendInfo ? (trendInfo.direction === 'up' ? 'danger' : 'success') : 'neutral',
        headline: `${cat.name} Outflow Details`,
        description: `Outlays in ${cat.name} amount to ${formatCurrency(cat.value)} this month, taking up ${pctOfExp.toFixed(1)}% of your active spending budget.`,
        recommendation: rec,
        health: budgetInfo.class === 'success' ? 'healthy' : (budgetInfo.class === 'warning' ? 'warning' : 'danger'),
        healthText: budgetInfo.status,
        risk: budgetInfo.class === 'danger' ? 'High' : (budgetInfo.class === 'warning' ? 'Medium' : 'Low'),
        riskClass: budgetInfo.class
      };
    }

    return null;
  };

  // ─── Default AI overview insights ─────────────────────────────────
  const getOverviewInsights = () => {
    const income = analyticsData.incomeVsExpense?.income || 0;
    const expenses = analyticsData.incomeVsExpense?.expenses || 0;
    const savings = Math.max(0, income - expenses);
    const savPct = income > 0 ? (savings / income) * 100 : 0;

    const categoriesList = (analyticsData.spendingByCategory || [])
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
    const topCat = categoriesList[0];

    let healthHeadline = 'Healthy Financial Margin';
    let healthDesc = 'Your monthly inflows comfortably exceed outflows, creating a reliable surplus buffer to build savings.';
    let healthClass = 'success';

    if (savPct >= 20) {
      healthHeadline = 'Excellent Savings Rate';
      healthDesc = `Outstanding discipline. You are saving ${savPct.toFixed(1)}% of income, well above target benchmarks.`;
      healthClass = 'success';
    } else if (savPct >= 10) {
      healthHeadline = 'Fair Margin Balance';
      healthDesc = `You saved ${savPct.toFixed(1)}% of active earnings. Minor optimization of shopping/dining could easily push you above 20%.`;
      healthClass = 'warning';
    } else {
      healthHeadline = 'Outflows Under Strain';
      healthDesc = `Savings rate is currently at ${savPct.toFixed(1)}%. Discretionary outlays may be consuming too much active cash.`;
      healthClass = 'danger';
    }

    return {
      headline: healthHeadline,
      description: healthDesc,
      recommendation: topCat
        ? `Your largest active expense is ${topCat.name} (${formatCurrency(topCat.value)}). Streamlining outlays in this category is your most immediate path to lock in higher margins.`
        : 'Set micro-savings transfers on payday to build assets automatedly before spending begins.',
      healthText: savPct >= 20 ? 'Optimal' : (savPct >= 10 ? 'Needs Attention' : 'Critical Balance'),
      health: healthClass === 'success' ? 'healthy' : 'warning',
      risk: savPct >= 15 ? 'Low' : (savPct >= 8 ? 'Medium' : 'High'),
      riskClass: healthClass
    };
  };

  const handleSankeyMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSankeyTooltipPos({ x, y });
  };

  return (
    <>
      {/* Main Analytics Content */}
      <div className="analytics-header">
        <div className="header-banner">
          <div className="header-titles">
            <h2>Analytics</h2>
            <span className="header-separator">|</span>
            <p className="header-subtitle">Visualize spending trends and financial insights</p>
          </div>
          <div className="date-range-selector">
            <div className="quick-range-pills">
              <button
                type="button"
                className={`range-pill ${activePreset === '30d' ? 'active' : ''}`}
                onClick={() => setQuickRange('30d')}
              >
                30D
              </button>
              <button
                type="button"
                className={`range-pill ${activePreset === '1m' ? 'active' : ''}`}
                onClick={() => setQuickRange('1m')}
              >
                1M
              </button>
              <button
                type="button"
                className={`range-pill ${activePreset === '3m' ? 'active' : ''}`}
                onClick={() => setQuickRange('3m')}
              >
                3M
              </button>
              <button
                type="button"
                className={`range-pill ${activePreset === '1y' ? 'active' : ''}`}
                onClick={() => setQuickRange('1y')}
              >
                1Y
              </button>
            </div>
            <div className="date-inputs-wrapper">
              <CustomDatePicker
                label="From"
                value={startDate}
                onChange={(newVal) => {
                  setActivePreset('custom');
                  setStartDate(newVal);
                }}
              />
              <CustomDatePicker
                label="To"
                value={endDate}
                onChange={(newVal) => {
                  setActivePreset('custom');
                  setEndDate(newVal);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-content">

        {loading && <Loading message="Loading analytics data" />}
        {apiError && <p className="error-message">Error: {apiError}</p>}

        {!loading && !apiError && (
          <>
            {/* ── AI Monthly Financial Summary Card ── */}
            <div className="ai-summary-card">
              <div className="ai-summary-header">
                <div className="ai-summary-title-group">
                  <div className="ai-summary-icon-wrap">
                    <div ref={aiIconRef} className="ai-lottie-icon" />
                  </div>
                  <div>
                    <h3 className="ai-summary-title">FinSense Summary</h3>
                    <p className="ai-summary-subtitle">
                      {startDate && endDate
                        ? `${dayjs(startDate).format('MMM D')} – ${dayjs(endDate).format('MMM D, YYYY')}`
                        : 'Selected period'}
                    </p>
                  </div>
                </div>
                <div className="ai-summary-actions">
                  <button
                    className="ai-summary-refresh-btn"
                    onClick={() => fetchMonthlySummary(startDate, endDate)}
                    disabled={summaryLoading}
                    title="Regenerate summary"
                  >
                    <FaSync className={summaryLoading ? 'spin' : ''} />
                  </button>
                </div>
              </div>

              {summaryLoading ? (
                <div className="ai-summary-skeleton">
                  <div className="skeleton-line wide" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line narrow" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line narrow" />
                </div>
              ) : summaryError ? (
                <p className="ai-summary-error">{summaryError}</p>
              ) : summary ? (
                <div className="ai-summary-body">
                  {/* Headline */}
                  <div className="summary-headline">
                    <span className="summary-headline-bar" />
                    <p className="summary-headline-text">{summary.headline}</p>
                  </div>

                  {/* Sections grid */}
                  <div className="summary-sections-grid">
                    {/* Trends */}
                    {summary.trends && (
                      <div className="summary-section trends-section">
                        <div className="section-label">
                          <span className="section-icon">📈</span>
                          <span>Key Trends</span>
                        </div>
                        <p className="section-text">{summary.trends}</p>
                      </div>
                    )}

                    {/* Achievements */}
                    {summary.achievements && (
                      <div className="summary-section achievements-section">
                        <div className="section-label">
                          <span className="section-icon">🏆</span>
                          <span>Achievement</span>
                        </div>
                        <p className="section-text">{summary.achievements}</p>
                      </div>
                    )}

                    {/* Risks */}
                    {summary.risks && (
                      <div className="summary-section risks-section">
                        <div className="section-label">
                          <span className="section-icon">⚠️</span>
                          <span>Risk Watch</span>
                        </div>
                        <p className="section-text">{summary.risks}</p>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {summary.recommendations && summary.recommendations.length > 0 && (
                    <div className="summary-recommendations">
                      <div className="section-label">
                        <span className="section-icon">💡</span>
                        <span>Recommendations</span>
                      </div>
                      <ul className="recommendations-list">
                        {summary.recommendations.map((tip, i) => (
                          <li key={i} className="recommendation-item">
                            <span className="rec-bullet">{i + 1}</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Overview Cards */}
            <div className="analytics-overview">
              <div className="overview-card">
                <div className="card-info">
                  <h3>Total Income</h3>
                  <p className="amount positive">
                    {formatCurrency(analyticsData.incomeVsExpense.income)}
                  </p>
                </div>
                <div className="card-icon-wrapper income-icon">
                  <FaArrowUp />
                </div>
              </div>
              <div className="overview-card">
                <div className="card-info">
                  <h3>Total Expenses</h3>
                  <p className="amount negative">
                    {formatCurrency(analyticsData.incomeVsExpense.expenses)}
                  </p>
                </div>
                <div className="card-icon-wrapper expenses-icon">
                  <FaArrowDown />
                </div>
              </div>
              <div className="overview-card">
                <div className="card-info">
                  <h3>Net Savings</h3>
                  <p className={`amount ${analyticsData.incomeVsExpense.income - analyticsData.incomeVsExpense.expenses >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(analyticsData.incomeVsExpense.income - analyticsData.incomeVsExpense.expenses)}
                  </p>
                </div>
                <div className="card-icon-wrapper savings-icon">
                  <FaWallet />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
              {/* Spending Over Time Chart */}
              <div className="analytics-card chart-card" style={{ gridColumn: '1 / -1' }}>
                <div className="chart-card-header">
                  <div className="chart-card-title-group">
                    <span className="chart-title-icon"><FaChartBar /></span>
                    <div className="category-header-title-text">
                      <h3>Spending Over Time</h3>
                      <p className="category-subtitle-text">Interactive timeline of daily spending outlays</p>
                    </div>
                  </div>
                  <div className="chart-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="chart-helper-pill">
                      <span className="helper-pulse-dot" />
                      <span>Hover points for details</span>
                    </div>
                    <div className="chart-stats-badge">
                      <span className="stats-label">Total Spent:</span>
                      <span className="stats-value">
                        {formatCurrency(analyticsData.spendingOverTime.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  {chartStyle === 'bars' ? (
                    <BarChart
                      data={analyticsData.spendingOverTime}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(dateStr) => dayjs(dateStr).format('MMM D')} fontSize={12} />
                      <YAxis tickFormatter={(value) => { const converted = formatCurrencyRaw(value); const symbol = currency === 'INR' ? '₹' : '$'; return `${symbol}${(converted / 1000).toFixed(converted / 1000 >= 1 ? 0 : 1)}k`; }} fontSize={12} />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Legend wrapperStyle={{ fontSize: '14px' }} />
                      <Bar dataKey="value" name="Expenses" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : chartStyle === 'outline' ? (
                    <LineChart
                      data={analyticsData.spendingOverTime}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                      onMouseMove={(e) => { if (e?.activeCoordinate) { setHoveredIndex(Math.abs(e.chartX - e.activeCoordinate.x) < 15 ? e.activeTooltipIndex : null); } else { setHoveredIndex(null); } }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(dateStr) => dayjs(dateStr).format('MMM D')} fontSize={12} />
                      <YAxis tickFormatter={(value) => { const converted = formatCurrencyRaw(value); const symbol = currency === 'INR' ? '₹' : '$'; return `${symbol}${(converted / 1000).toFixed(converted / 1000 >= 1 ? 0 : 1)}k`; }} fontSize={12} />
                      <Tooltip content={<CustomTooltip />} active={hoveredIndex !== null} cursor={false} />
                      <Legend wrapperStyle={{ fontSize: '14px' }} />
                      <Line type="monotone" dataKey="value" name="Expenses" stroke="#f43f5e" strokeWidth={2.5} dot={renderCustomDot} activeDot={{ r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  ) : (
                    /* default: gradient AreaChart */
                    <AreaChart
                      data={analyticsData.spendingOverTime}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                      onMouseMove={(e) => { if (e?.activeCoordinate) { setHoveredIndex(Math.abs(e.chartX - e.activeCoordinate.x) < 15 ? e.activeTooltipIndex : null); } else { setHoveredIndex(null); } }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <defs>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#f43f5e" floodOpacity={0.25} />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(dateStr) => dayjs(dateStr).format('MMM D')} fontSize={12} />
                      <YAxis tickFormatter={(value) => { const converted = formatCurrencyRaw(value); const symbol = currency === 'INR' ? '₹' : '$'; return `${symbol}${(converted / 1000).toFixed(converted / 1000 >= 1 ? 0 : 1)}k`; }} fontSize={12} />
                      <Tooltip content={<CustomTooltip />} active={hoveredIndex !== null} cursor={false} />
                      <Legend wrapperStyle={{ fontSize: '14px' }} />
                      <Area type="monotone" dataKey="value" name="Expenses" stroke="#f43f5e" strokeWidth={3} fill="url(#colorExpenses)" filter="url(#lineGlow)" dot={renderCustomDot} activeDot={{ r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Proportional & Comparative Category Analysis (Donut + Radar) */}
              {analyticsData.spendingByCategory && analyticsData.spendingByCategory.length > 0 && (
                <div className="analytics-card chart-card category-comparison-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="chart-card-header">
                    <div className="chart-card-title-group">
                      <span className="chart-title-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.15)' }}><FaWallet /></span>
                      <div className="category-header-title-text">
                        <h3>Expense Distribution & Comparison</h3>
                        <p className="category-subtitle-text">Proportional (Donut) vs. Comparative (Radar) view of category spending</p>
                      </div>
                    </div>
                    {(() => {
                      const largestCat = analyticsData.spendingByCategory.reduce(
                        (max, cat) => cat.value > max.value ? cat : max,
                        { name: 'None', value: 0 }
                      );
                      return largestCat.value > 0 ? (
                        <div className="chart-stats-badge largest-category-badge" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                          <span className="stats-label" style={{ color: '#10b981' }}>Largest Expense:</span>
                          <span className="stats-value highlight-val" style={{ color: '#10b981', fontWeight: 700 }}>{largestCat.name} ({formatCurrency(largestCat.value)})</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div className="category-charts-wrapper">
                    {/* Donut Chart (Left) */}
                    <div className="category-chart-box">
                      <h4 className="chart-box-title">Expense Proportions</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart onMouseEnter={() => setHoveredChart('donut')} onMouseLeave={() => { setHoveredCategory(null); setHoveredChart(null); }}>
                          <defs>
                            <linearGradient id="pieGrad-0" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#1e3a8a" />
                            </linearGradient>
                            <linearGradient id="pieGrad-1" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#064e3b" />
                            </linearGradient>
                            <linearGradient id="pieGrad-2" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#78350f" />
                            </linearGradient>
                            <linearGradient id="pieGrad-3" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" />
                              <stop offset="100%" stopColor="#881337" />
                            </linearGradient>
                            <linearGradient id="pieGrad-4" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#4c1d95" />
                            </linearGradient>
                            <linearGradient id="pieGrad-5" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#164e63" />
                            </linearGradient>
                            <linearGradient id="pieGrad-6" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#ec4899" />
                              <stop offset="100%" stopColor="#831843" />
                            </linearGradient>
                            <linearGradient id="pieGrad-7" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#14b8a6" />
                              <stop offset="100%" stopColor="#0f766e" />
                            </linearGradient>
                            <filter id="pieSliceShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity={0.5} />
                            </filter>
                          </defs>
                          <Pie
                            data={analyticsData.spendingByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            onMouseEnter={(data) => {
                              if (data && data.name) {
                                setHoveredCategory(data.name);
                                setHoveredChart('donut');
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredCategory(null);
                              setHoveredChart(null);
                            }}
                          >
                            {analyticsData.spendingByCategory.map((entry, index) => {
                              const isHovered = hoveredCategory === entry.name;
                              const isLargest = entry.name === analyticsData.spendingByCategory.reduce((m, c) => c.value > m.value ? c : m, { name: '', value: -1 }).name;

                              let fillOpacity = 0.8;
                              if (hoveredCategory !== null) {
                                fillOpacity = isHovered ? 1.0 : 0.25;
                              } else if (isLargest) {
                                fillOpacity = 0.95;
                              }

                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={`url(#pieGrad-${index % 8})`}
                                  fillOpacity={fillOpacity}
                                  stroke={isHovered || (hoveredCategory === null && isLargest) ? '#ffffff' : 'rgba(255,255,255,0.05)'}
                                  strokeWidth={isHovered ? 2.5 : 1}
                                  filter="url(#pieSliceShadow)"
                                  style={{ outline: 'none', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                />
                              );
                            })}
                          </Pie>
                          {/* Center Text inside Donut Hole */}
                          <text x="50%" y="46%" className="donut-hole-label" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize={11} fontFamily="Outfit" fontWeight={600} letterSpacing="0.05em">
                            {hoveredCategory ? (hoveredCategory.length > 20 ? hoveredCategory.slice(0, 20).toUpperCase() + '…' : hoveredCategory.toUpperCase()) : 'TOTAL SPENT'}
                          </text>
                          <text x="50%" y="56%" className="donut-hole-value" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={hoveredCategory ? 16 : 18} fontFamily="JetBrains Mono" fontWeight={700}>
                            {hoveredCategory
                              ? formatCurrency(analyticsData.spendingByCategory.find(c => c.name === hoveredCategory)?.value || 0)
                              : formatCurrency(analyticsData.spendingByCategory.reduce((acc, c) => acc + c.value, 0))
                            }
                          </text>
                          <Tooltip
                            content={<CategoryTooltip />}
                            active={hoveredCategory !== null && hoveredChart === 'donut'}
                            wrapperStyle={{ outline: 'none', border: 'none', background: 'transparent' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Radar Chart (Right) */}
                    <div className="category-chart-box">
                      <h4 className="chart-box-title">Comparative Intensity</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="75%"
                          data={analyticsData.spendingByCategory.map(cat => ({
                            subject: cat.name,
                            value: cat.value
                          }))}
                          onMouseEnter={() => setHoveredChart('radar')}
                          onMouseLeave={() => {
                            setHoveredCategory(null);
                            setHoveredChart(null);
                          }}
                        >
                          <defs>
                            <linearGradient id="radarAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.08} />
                            </linearGradient>
                            <filter id="radarLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#10b981" floodOpacity={0.35} />
                            </filter>
                          </defs>
                          <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="circle" />
                          <RadarHoverSpokes />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={({ x, y, payload }) => {
                              const isHovered = hoveredCategory === payload.value;
                              const isLargest = payload.value === analyticsData.spendingByCategory.reduce((m, c) => c.value > m.value ? c : m, { name: '', value: -1 }).name;

                              let fill = 'rgba(255, 255, 255, 0.4)';
                              let fontWeight = 400;
                              let fontSize = 10;
                              if (isHovered) {
                                fill = '#10b981';
                                fontWeight = 700;
                                fontSize = 11;
                              } else if (isLargest) {
                                fill = '#ffffff';
                                fontWeight = 600;
                              }

                              return (
                                <g
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => {
                                    setHoveredCategory(payload.value);
                                    setHoveredChart('radar');
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredCategory(null);
                                    setHoveredChart(null);
                                  }}
                                >
                                  <text
                                    x={x}
                                    y={y}
                                    dy={4}
                                    className={`radar-angle-tick ${isLargest ? 'is-largest' : ''} ${isHovered ? 'is-hovered' : ''}`}
                                    textAnchor="middle"
                                    fill={fill}
                                    fontSize={fontSize}
                                    fontWeight={fontWeight}
                                    fontFamily="Outfit"
                                    style={{ transition: 'all 0.15s ease' }}
                                  >
                                    {payload.value}
                                  </text>
                                </g>
                              );
                            }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 'auto']}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Spending"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fill="url(#radarAreaGrad)"
                            filter="url(#radarLineGlow)"
                            dot={({ cx, cy, payload }) => {
                              const isHovered = hoveredCategory === payload.subject;
                              const isLargest = payload.subject === analyticsData.spendingByCategory.reduce((m, c) => c.value > m.value ? c : m, { name: '', value: -1 }).name;

                              if (!isHovered && !isLargest) return null;

                              return (
                                <circle
                                  key={`dot-${payload.subject}`}
                                  cx={cx}
                                  cy={cy}
                                  r={isHovered ? 6 : 4}
                                  fill={isHovered ? '#10b981' : '#ffffff'}
                                  stroke="#0b0f1a"
                                  strokeWidth={1.5}
                                />
                              );
                            }}
                          />
                          <Tooltip
                            content={<CategoryTooltip />}
                            active={hoveredCategory !== null && hoveredChart === 'radar'}
                            wrapperStyle={{ outline: 'none', border: 'none', background: 'transparent' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Intelligent Spending Analysis Panel */}
              {(() => {
                const curr = analyticsData.spendingByCategory;
                const prev = analyticsData.prevSpendingByCategory;

                if (curr.length === 0) {
                  return (
                    <div className="analytics-card chart-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="chart-card-header">
                        <div className="chart-card-title-group">
                          <span className="chart-title-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.15)' }}><FaChartBar /></span>
                          <h3>Intelligent Spending Analysis</h3>
                        </div>
                      </div>
                      <div className="analytics-empty-state-box">
                        <div className="empty-state-badge">
                          <FaChartBar />
                        </div>
                        <h4 className="empty-state-title">No Spending Data Available</h4>
                        <p className="empty-state-desc">
                          There are no recorded expenses for this period. Add transactions or adjust your date range to unlock AI category analysis and spending insights.
                        </p>
                        <Link to="/transactions" className="empty-state-btn">
                          <FaPlus /> Add Expense
                        </Link>
                      </div>
                    </div>
                  );
                }

                // Build comparison map
                const prevMap = {};
                (prev || []).forEach(p => { prevMap[p.name] = p.value; });
                const totalCurr = curr.reduce((s, c) => s + c.value, 0);
                const hasPrevData = (prev || []).length > 0;

                const enriched = curr.map(c => {
                  const prevVal = prevMap[c.name] || 0;
                  const pctChange = prevVal > 0
                    ? ((c.value - prevVal) / prevVal) * 100
                    : null; // null = new category
                  const share = totalCurr > 0 ? (c.value / totalCurr) * 100 : 0;
                  return { ...c, prevVal, pctChange, share };
                });

                // Find biggest mover (only among categories that existed in prev)
                const compared = enriched.filter(e => e.pctChange !== null);
                const biggestIncrease = compared.length > 0
                  ? compared.reduce((a, b) => b.pctChange > a.pctChange ? b : a)
                  : null;
                const biggestDecrease = compared.length > 0
                  ? compared.reduce((a, b) => b.pctChange < a.pctChange ? b : a)
                  : null;

                // Per-category recommendation
                const getRecommendation = (cat) => {
                  if (cat.pctChange === null)
                    return `New category this period. Log consistently to build a baseline for ${cat.name}.`;
                  const p = cat.pctChange;
                  const isBiggestUp = biggestIncrease && cat.name === biggestIncrease.name;
                  const isBiggestDown = biggestDecrease && cat.name === biggestDecrease.name;
                  if (p > 50)
                    return `${isBiggestUp ? '⚠️ Largest jump — ' : ''}${cat.name} surged ${p.toFixed(0)}% vs last period. Audit recent transactions to identify the spike.`;
                  if (p > 20)
                    return `${cat.name} is trending up ${p.toFixed(0)}%. Monitor closely — if recurring, consider reducing ${cat.name} spending.`;
                  if (p > 0)
                    return `${cat.name} is slightly higher (+${p.toFixed(0)}%). Within normal variation, no action needed.`;
                  if (p < -30)
                    return `${isBiggestDown ? '✅ Largest saving — ' : ''}Great discipline! ${cat.name} dropped ${Math.abs(p).toFixed(0)}% vs last period. Keep it up.`;
                  if (p < -10)
                    return `Good progress on ${cat.name} (${p.toFixed(0)}%). Continue the trend to free up more savings.`;
                  return `${cat.name} is roughly stable (${p > 0 ? '+' : ''}${p.toFixed(0)}%). Consistent spending — consider if there is room to optimise.`;
                };

                // Chart data for horizontal bar
                const chartData = enriched.map(e => ({
                  name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
                  fullName: e.name,
                  Current: Math.round(e.value),
                  Previous: Math.round(e.prevVal)
                }));

                const CAT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

                return (
                  <div className="analytics-card chart-card spend-analysis-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="chart-card-header">
                      <div className="chart-card-title-group">
                        <span className="chart-title-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.15)' }}><FaChartBar /></span>
                        <h3>Intelligent Spending Analysis</h3>
                      </div>
                      <div className="chart-stats-badge" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.15)' }}>
                        <span className="stats-label">vs Previous Period:</span>
                        <span className="stats-value" style={{ color: '#6366f1' }}>{curr.length} Categories</span>
                      </div>
                    </div>

                    {/* No previous data notice banner */}
                    {!hasPrevData && (
                      <div className="spend-baseline-notice">
                        <FaCalendarAlt className="notice-icon" />
                        <span>No previous period data — showing current breakdown. Comparisons will appear once you have transactions in the prior period.</span>
                      </div>
                    )}

                    <div className="spend-analysis-body">
                      {/* Left: Horizontal bar chart */}
                      <div className="spend-chart-wrap">
                        <div className="spend-chart-legend">
                          <span className="scl-dot" style={{ background: '#6366f1' }} />Current
                          <span className="scl-dot" style={{ background: 'rgba(99,102,241,0.22)' }} />Previous
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 52)}>
                          <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barCategoryGap="28%" barGap={3}>
                            <defs>
                              <linearGradient id="barCurrGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              type="number"
                              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                              tickLine={false}
                              tickFormatter={v => formatCurrencyRaw ? `${Math.round(v / 1000)}k` : v}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={80}
                              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: "'Inter', sans-serif" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="spend-tooltip">
                                    <p className="st-label">{payload[0]?.payload?.fullName || label}</p>
                                    {payload.map((p, i) => {
                                      const textCol = p.name === 'Current' ? '#a5b4fc' : '#94a3b8';
                                      return (
                                        <p key={i} style={{ color: textCol }}>
                                          {p.name}: {formatCurrency ? formatCurrency(p.value) : p.value}
                                        </p>
                                      );
                                    })}
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="Previous" fill="rgba(99,102,241,0.18)" radius={[0, 3, 3, 0]} />
                            <Bar dataKey="Current" fill="url(#barCurrGrad)" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Right: Insights panel */}
                      <div className="spend-insights-panel">
                        {/* Summary pills */}
                        {biggestIncrease && biggestIncrease.pctChange > 0 && (
                          <div className="spend-alert-pill pill-up">
                            <FaArrowUp className="pill-icon" />
                            <div>
                              <span className="pill-title">Biggest Increase</span>
                              <span className="pill-cat">{biggestIncrease.name}</span>
                              <span className="pill-pct">+{biggestIncrease.pctChange.toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                        {biggestDecrease && biggestDecrease.pctChange < 0 && (
                          <div className="spend-alert-pill pill-down">
                            <FaArrowDown className="pill-icon" />
                            <div>
                              <span className="pill-title">Biggest Saving</span>
                              <span className="pill-cat">{biggestDecrease.name}</span>
                              <span className="pill-pct">{biggestDecrease.pctChange.toFixed(1)}%</span>
                            </div>
                          </div>
                        )}

                        <div className="spend-insights-divider" />

                        {/* Per-category rows — sliced by insightDensity setting */}
                        <div className="spend-insights-list">
                          {(() => {
                            const densityLimit = insightDensity === 'compact' ? 1 : insightDensity === 'brief' ? 3 : enriched.length;
                            const visibleInsights = enriched.slice(0, densityLimit);
                            return visibleInsights.map((cat, idx) => {
                              const p = cat.pctChange;
                              const isNew = p === null;
                              const isUp = !isNew && p > 0;
                              const pColor = isNew ? '#a78bfa' : isUp ? '#f43f5e' : '#10b981';
                              const catColor = CAT_COLORS[idx % CAT_COLORS.length];
                              return (
                                <div key={cat.name} className="spend-insight-row">
                                  <div className="sir-header">
                                    <span className="sir-dot" style={{ background: catColor }} />
                                    <span className="sir-name">{cat.name}</span>
                                    <span className="sir-amount">{formatCurrency ? formatCurrency(cat.value) : cat.value}</span>
                                    <span className="sir-pct" style={{ color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}30` }}>
                                      {isNew ? 'New' : `${isUp ? '+' : ''}${p.toFixed(1)}%`}
                                    </span>
                                  </div>
                                  <p className="sir-rec">{getRecommendation(cat)}</p>
                                </div>
                              );
                            });
                          })()}
                          {enriched.length > (insightDensity === 'compact' ? 1 : insightDensity === 'brief' ? 3 : enriched.length) && (
                            <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                              +{enriched.length - (insightDensity === 'compact' ? 1 : 3)} more categories hidden — switch to Rich density in Display Settings
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Health Score Widget */}
              {(() => {
                const health = financialHealthMemo;
                const radius = 46;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (health.total / 100) * circumference;

                // Determine tier labels & color metrics
                let scoreColor = '#10b981'; // Green (Excellent)
                let scoreTier = 'Excellent';
                let tierClass = 'tier-excellent';

                if (health.total < 50) {
                  scoreColor = '#f43f5e'; // Red (Critical)
                  scoreTier = 'Critical';
                  tierClass = 'tier-critical';
                } else if (health.total < 75) {
                  scoreColor = '#f59e0b'; // Amber (Fair)
                  scoreTier = 'Fair';
                  tierClass = 'tier-fair';
                } else if (health.total < 85) {
                  scoreColor = '#3b82f6'; // Blue (Good)
                  scoreTier = 'Good';
                  tierClass = 'tier-good';
                }

                const rs = health.details.rawScores;
                const factors = [
                  {
                    name: 'Savings Rate',
                    val: health.breakdown.savingsRate,
                    desc: `${health.details.savingsRateVal}% · ${rs.savingsScore}/20 pts`,
                    info: `Your savings rate is ${health.details.savingsRateVal}% this period — you earned ${rs.savingsScore}/20 pts. Formula: (Income − Expenses) ÷ Income × 100. Target >20% for full marks. Below 0% (spending more than earning) scores 0.`
                  },
                  {
                    name: 'Budget Compliance',
                    val: health.breakdown.budgetAdherence,
                    desc: health.details.budgetLimit > 0
                      ? (rs.budgetScore === 20 ? `Within Budget · 20/20 pts` : `Over Budget · ${rs.budgetScore}/20 pts`)
                      : `No Budget · 15/20 pts`,
                    info: health.details.budgetLimit > 0
                      ? `You earned ${rs.budgetScore}/20 pts. Score: 20/20 if total expenses ≤ budget; reduced proportionally per rupee over limit. Every 5% overspend costs ~1 pt. Stay within budget to hold full marks.`
                      : `No budget set — defaulted to 15/20 pts (neutral). Set a monthly budget in the Budget section to be eligible for the full 20/20 pts.`
                  },
                  {
                    name: 'Income Flow Stability',
                    val: health.breakdown.incomeStability,
                    desc: rs.stabilityScore === 20 ? `Salary Detected · 20/20 pts` : `No Salary · 12/20 pts`,
                    info: rs.stabilityScore === 20
                      ? `Salary event detected this period — full 20/20 pts. FinMate checks for a tagged salary transaction. Keep logging your income to maintain this.`
                      : `No salary transaction found this period — only 12/20 pts scored. Log your salary under Transactions (tag it as income) to earn the full 20/20 pts.`
                  },
                  {
                    name: 'Spending Patterns',
                    val: health.breakdown.spendingConsistency,
                    desc: (() => {
                      const s = rs.consistencyScore;
                      if (s >= 20) return `Very Consistent · 20/20 pts`;
                      if (s >= 15) return `Consistent · ${s}/20 pts`;
                      if (s >= 10) return `Moderate · ${s}/20 pts`;
                      return `Volatile · ${s}/20 pts`;
                    })(),
                    info: `Scored ${rs.consistencyScore}/20 pts. Uses Coefficient of Variation (CV = daily spend std deviation ÷ average daily spend). CV ≤ 0.5 → 20/20; CV ≥ 1.5 → 5/20; linear in between. Avoid large one-off spikes to keep spending variance low.`
                  },
                  {
                    name: 'Expense-to-Income',
                    val: health.breakdown.expenseToIncome,
                    desc: `${health.details.expenseRatioVal}% · ${rs.ratioScore}/20 pts`,
                    info: `Your expenses are ${health.details.expenseRatioVal}% of income — you earned ${rs.ratioScore}/20 pts. Formula: Expenses ÷ Income × 100. ≤50% → 20/20; ≥100% → 0/20; linearly scaled between. The 50/30/20 rule recommends spending no more than 50% of income on needs.`
                  }
                ];

                return (
                  <div className="analytics-card chart-card health-score-card">
                    <div className="chart-card-header">
                      <div className="chart-card-title-group">
                        <span className="chart-title-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                          <FaHeartbeat />
                        </span>
                        <h3>Financial Health Score</h3>
                      </div>
                      <div className="chart-stats-badge" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                        <span className="stats-label">Status:</span>
                        <span className="stats-value" style={{ color: '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.25)' }}>
                          Calculated Realtime
                        </span>
                      </div>
                    </div>

                    <div className="health-score-body">
                      {/* Circular Progress Ring */}
                      <div className="health-score-ring-wrapper">
                        {/* Ambient Glow behind the ring */}
                        <div
                          className="health-ring-ambient-glow"
                          style={{
                            background: `radial-gradient(circle, ${scoreColor}1d 0%, transparent 70%)`
                          }}
                        />
                        <svg width="110" height="110" className="health-score-svg">
                          <defs>
                            <linearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={scoreColor} />
                              <stop offset="100%" stopColor={scoreColor} stopOpacity={0.6} />
                            </linearGradient>
                            <filter id="healthScoreGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={scoreColor} floodOpacity={0.65} />
                            </filter>
                          </defs>
                          {/* Thin background track */}
                          <circle cx="55" cy="55" r={radius} className="score-ring-bg" strokeWidth="4" />
                          {/* Glowing active progress fill */}
                          <circle
                            cx="55"
                            cy="55"
                            r={radius}
                            className="score-ring-fill"
                            stroke="url(#scoreRingGrad)"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            strokeWidth="8"
                            filter="url(#healthScoreGlow)"
                          />
                          {/* Outer thin spinning orbital ring */}
                          <circle
                            cx="55"
                            cy="55"
                            r="52"
                            fill="none"
                            stroke={scoreColor}
                            strokeWidth="1"
                            strokeDasharray="5 10"
                            opacity="0.25"
                            className="health-score-orbit-outer"
                          />
                          {/* Inner thin spinning orbital ring */}
                          <circle
                            cx="55"
                            cy="55"
                            r="38"
                            fill="none"
                            stroke={scoreColor}
                            strokeWidth="1"
                            strokeDasharray="4 8"
                            opacity="0.2"
                            className="health-score-orbit-inner"
                          />
                        </svg>
                        <div className="health-score-center-text">
                          <span className="health-score-num" style={{ color: scoreColor, textShadow: `0 0 15px ${scoreColor}50` }}>{health.total}</span>
                          <span className={`health-score-tier ${tierClass}`} style={{ color: scoreColor }}>{scoreTier}</span>
                        </div>
                      </div>

                      {/* Factor Breakdowns */}
                      <div className="health-factors-list">
                        {factors.map((f, idx) => {
                          const factorColor = f.val >= 80 ? '#10b981' : f.val >= 60 ? '#3b82f6' : f.val >= 40 ? '#f59e0b' : '#f43f5e';

                          return (
                            <div key={idx} className="health-factor-row">
                              <div className="health-factor-info">
                                <div className="health-factor-label-group">
                                  <span className="health-factor-label">{f.name}</span>
                                  <span className="factor-info-btn">
                                    <img src="https://img.icons8.com/arcade/64/i-key.png" alt="info" className="factor-info-icon" />
                                    <span className="factor-info-tooltip">{f.info}</span>
                                  </span>
                                </div>
                                <span
                                  className="health-factor-badge"
                                  style={{
                                    backgroundColor: `${factorColor}12`,
                                    color: factorColor,
                                    border: `1px solid ${factorColor}25`
                                  }}
                                >
                                  {f.desc}
                                </span>
                              </div>
                              <div className="health-factor-bar-bg">
                                <div
                                  className="health-factor-bar-fill"
                                  style={{
                                    width: `${f.val}%`,
                                    backgroundColor: factorColor,
                                    boxShadow: `0 0 8px ${factorColor}40`
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanatory AI statement */}
                    <div className="health-insight-pill" style={{ borderLeftColor: scoreColor }}>
                      <span className="insight-icon">
                        <img src="https://img.icons8.com/external-filled-color-icons-papa-vector/78/external-Award-Badge-education-filled-color-icons-papa-vector.png" alt="Award Badge" style={{ width: '38px', height: '38px', verticalAlign: 'middle', display: 'block' }} />
                      </span>
                      <span>{health.insight.replace('__AWARD__ ', '')}</span>
                    </div>
                  </div>
                );
              })()}

              {/* FinSense Spending Forecast Widget */}
              {(() => {
                if (forecastLoading) {
                  return (
                    <div className="analytics-card chart-card forecast-card">
                      <div className="chart-card-header">
                        <div className="chart-card-title-group">
                          <span className="chart-title-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}><FaChartBar /></span>
                          <h3>FinSense Spending Forecast</h3>
                        </div>
                        <button className="forecast-refresh-btn spinning" disabled>
                          <FaSync />
                        </button>
                      </div>
                      <div className="forecast-loading">
                        <div className="mini-spinner" />
                        <p>Generating forward-looking insights...</p>
                      </div>
                    </div>
                  );
                }

                if (forecastError || !forecast) {
                  return (
                    <div className="analytics-card chart-card forecast-card">
                      <div className="chart-card-header">
                        <div className="chart-card-title-group">
                          <span className="chart-title-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.15)' }}><FaChartBar /></span>
                          <h3>FinSense Spending Forecast</h3>
                        </div>
                        <button className="forecast-refresh-btn" onClick={fetchForecastData} title="Retry FinSense Forecast">
                          <FaSync />
                        </button>
                      </div>
                      <p className="no-data-message">{forecastError || 'Forecast unavailable.'}</p>
                    </div>
                  );
                }

                const budgetLimit = analyticsData.budgetLimit;
                const currentExpenses = Math.abs(analyticsData.incomeVsExpense.expenses);
                const exceededAmount = forecast.predictedTotal - budgetLimit;
                const isOver = forecast.isLikelyToExceed;

                let confColor = '#10b981'; // Green
                if (forecast.confidenceLabel === 'Medium') confColor = '#3b82f6'; // Blue
                if (forecast.confidenceLabel === 'Low') confColor = '#f59e0b'; // Amber

                return (
                  <div className="analytics-card chart-card forecast-card">
                    <div className="chart-card-header">
                      <div className="chart-card-title-group">
                        <span className="chart-title-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}><FaChartBar /></span>
                        <h3>FinSense Spending Forecast</h3>
                      </div>
                      <div className="forecast-header-right">
                        <button className={`forecast-refresh-btn ${forecastLoading ? 'spinning' : ''}`} onClick={fetchForecastData} title="Recalculate FinSense Forecast">
                          <FaSync />
                        </button>
                        <div className="chart-stats-badge" style={{ background: `${confColor}12`, borderColor: `${confColor}25` }}>
                          <span className="stats-label" style={{ color: confColor }}>Confidence:</span>
                          <span className="stats-value" style={{ color: confColor }}>{forecast.confidenceLabel} ({forecast.confidence}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="forecast-body">
                      {/* Prediction Summary Metrics */}
                      <div className="forecast-metrics">
                        <div className="fm-item">
                          <span className="fm-label">Projected Expenses</span>
                          <span className="fm-val" style={{ color: isOver ? '#f43f5e' : '#ffffff' }}>{formatCurrency(forecast.predictedTotal)}</span>
                        </div>
                        <div className="fm-item">
                          <span className="fm-label">{isOver ? 'Projected Overdraft' : 'Projected Savings'}</span>
                          <span className="fm-val" style={{ color: isOver ? '#f43f5e' : '#10b981' }}>
                            {formatCurrency(Math.abs(forecast.projectedRemainingBudget))}
                          </span>
                        </div>
                      </div>

                      {/* Warning/Status Banner */}
                      <div className={`forecast-alert-banner ${isOver ? 'fab-exceed' : 'fab-track'}`}>
                        <span className="fab-icon">
                          {isOver ? (
                            <img src="https://img.icons8.com/scribby/50/spam.png" alt="Alert" className="forecast-alert-img" />
                          ) : (
                            '✨'
                          )}
                        </span>
                        <p className="fab-message">{forecast.warningMessage}</p>
                      </div>

                      {/* Budget Target Progress Bar */}
                      {budgetLimit > 0 && (
                        <div className="forecast-progress-wrap">
                          <div className="fp-labels">
                            <span>Spent so far: {formatCurrency(Math.round(currentExpenses))}</span>
                            <span>Limit: {formatCurrency(budgetLimit)}</span>
                          </div>
                          <div className="forecast-progress-bar-bg">
                            {/* Current Spent Progress */}
                            <div
                              className="forecast-progress-fill-spent"
                              style={{
                                width: `${Math.min(100, (currentExpenses / budgetLimit) * 100)}%`
                              }}
                            />
                            {/* Projected Spend Progress (dashed/lighter color) */}
                            <div
                              className="forecast-progress-fill-projected"
                              style={{
                                left: `${Math.min(100, (currentExpenses / budgetLimit) * 100)}%`,
                                width: `${Math.max(0, Math.min(100 - (currentExpenses / budgetLimit) * 100, (exceededAmount > 0 ? exceededAmount : (forecast.predictedTotal - currentExpenses)) / budgetLimit * 100))}%`
                              }}
                            />
                          </div>
                          <span className="fp-legend-label">* Dashed bar represents projected remaining expenses.</span>
                        </div>
                      )}

                      {/* Category Forecast List */}
                      {forecast.categoryForecasts && forecast.categoryForecasts.length > 0 && (
                        <div className="forecast-categories">
                          <h4>Category Projections</h4>
                          <div className="fc-list">
                            {forecast.categoryForecasts.slice(0, 4).map((cf) => {
                              const pct = cf.currentSpent > 0 ? ((cf.projected - cf.currentSpent) / cf.currentSpent) * 100 : 0;
                              return (
                                <div key={cf.category} className="fc-row">
                                  <div className="fc-info">
                                    <span className="fc-name">{cf.category}</span>
                                    <div className="fc-vals">
                                      <span className="fc-spent">Spent: {formatCurrency(cf.currentSpent)}</span>
                                      <span className="fc-sep">→</span>
                                      <span className="fc-proj">Proj: {formatCurrency(cf.projected)}</span>
                                    </div>
                                  </div>
                                  <span className={`fc-pct-badge ${pct > 0 ? 'fcp-up' : 'fcp-down'}`}>
                                    {pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* FinSense Risk Watch Card */}
              {(() => {
                if (anomalySummaryLoading) return null;

                const highCount = anomalySummary.filter(t => t.anomaly?.severity === 'high').length;
                const mediumCount = anomalySummary.filter(t => t.anomaly?.severity === 'medium').length;
                const hasRisks = anomalySummary.length > 0;

                return (
                  <div className="analytics-card chart-card anomaly-risk-card">
                    <div className="chart-card-header">
                      <div className="chart-card-title-group">
                        <span className="chart-title-icon" style={{ background: hasRisks ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: hasRisks ? '#ef4444' : '#10b981', borderColor: hasRisks ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }}>
                          {hasRisks ? <FaExclamationTriangle /> : <FaShieldAlt />}
                        </span>
                        <h3>FinSense Risk Watch</h3>
                      </div>
                      <button className="forecast-refresh-btn" onClick={fetchAnomalySummary} title="Refresh anomaly scan">
                        <FaSync />
                      </button>
                    </div>

                    {!hasRisks ? (
                      <div className="anomaly-all-clear">
                        <FaShieldAlt className="aac-icon" />
                        <p>All recent transactions look normal. No unusual spending patterns detected.</p>
                      </div>
                    ) : (
                      <div className="anomaly-risk-body">
                        <div className="anomaly-risk-summary-row">
                          {highCount > 0 && (
                            <span className="anomaly-count-badge acb-high">
                              <FaExclamationTriangle /> {highCount} High Risk
                            </span>
                          )}
                          {mediumCount > 0 && (
                            <span className="anomaly-count-badge acb-medium">
                              <FaShieldAlt /> {mediumCount} Medium Risk
                            </span>
                          )}
                        </div>
                        <div className="anomaly-flagged-list">
                          {anomalySummary.map(tx => (
                            <div key={tx._id} className={`anomaly-flagged-item afi-${tx.anomaly.severity}`}>
                              <div className="afi-left">
                                <span className="afi-severity-dot" />
                                <div className="afi-info">
                                  <span className="afi-desc">{tx.description}</span>
                                  <span className="afi-category">{tx.category}</span>
                                </div>
                              </div>
                              <div className="afi-right">
                                <span className="afi-amount">-{formatCurrency(Math.abs(tx.amount))}</span>
                                <span className="afi-reason">{tx.anomaly.reasons?.[0]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Weekly Spending Heatmap Widget */}
              {(() => {
                const { weeks, maxSpend } = heatmapDataMemo;
                if (weeks.length === 0) return null;

                const weekdays = firstDayOfWeek === 'sunday'
                  ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                return (
                  <div className="analytics-card chart-card heatmap-card heatmap-container-relative" style={{ gridColumn: '1 / -1' }}>
                    <div className="heatmap-ambient-glow" />
                    <div className="chart-card-header">
                      <div className="chart-card-title-group">
                        <span className="chart-title-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.15)' }}><FaCalendarAlt /></span>
                        <h3>Weekly Spending Heatmap</h3>
                      </div>
                      <div className="heatmap-legend">
                        <span className="legend-lbl">Intensity:</span>
                        <span className="legend-scale">
                          <span className="ls-label">Less</span>
                          <span className="ls-box intensity-0" />
                          <span className="ls-box intensity-1" />
                          <span className="ls-box intensity-2" />
                          <span className="ls-box intensity-3" />
                          <span className="ls-box intensity-4" />
                          <span className="ls-label">More</span>
                        </span>
                      </div>
                    </div>

                    <div className="heatmap-body">
                      {/* Grid Headers: Days of the week */}
                      <div className="heatmap-grid-header">
                        <div className="heatmap-row-label-dummy" />
                        {weekdays.map(day => (
                          <div key={day} className="heatmap-col-header">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Grid Rows: Weeks */}
                      <div className="heatmap-grid-rows">
                        {weeks.map((week, weekIdx) => {
                          const validDayIdx = week.findIndex(d => d !== null);
                          const validDay = validDayIdx !== -1 ? week[validDayIdx] : null;
                          const weekLabel = validDay
                            ? dayjs(validDay.date).subtract(validDayIdx, 'day').format('MMM DD')
                            : `Wk ${weekIdx + 1}`;

                          return (
                            <div key={weekIdx} className="heatmap-grid-row">
                              <div className="heatmap-row-label">
                                {weekLabel}
                              </div>
                              {week.map((cell, dayIdx) => {
                                if (!cell) {
                                  return (
                                    <div
                                      key={`empty-${weekIdx}-${dayIdx}`}
                                      className="heatmap-cell empty"
                                    />
                                  );
                                }

                                let intensityClass = 'intensity-0';
                                if (cell.value > 0) {
                                  if (cell.intensity > 0.75) intensityClass = 'intensity-4';
                                  else if (cell.intensity > 0.45) intensityClass = 'intensity-3';
                                  else if (cell.intensity > 0.2) intensityClass = 'intensity-2';
                                  else intensityClass = 'intensity-1';
                                }

                                return (
                                  <div
                                    key={cell.date}
                                    className={`heatmap-cell ${intensityClass} ${cell.value > 0 ? 'active' : ''}`}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const containerRect = e.currentTarget.closest('.heatmap-container-relative').getBoundingClientRect();
                                      setHoveredCell({ ...cell, dayIdx });
                                      setTooltipPos({
                                        x: rect.left - containerRect.left + rect.width / 2,
                                        y: rect.top - containerRect.top - 8
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredCell(null)}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hover Tooltip */}
                    {hoveredCell && (() => {
                      let transform = 'translate(-50%, -100%)';
                      if (hoveredCell.dayIdx === 6) {
                        transform = 'translate(-95%, -100%)';
                      } else if (hoveredCell.dayIdx === 5) {
                        transform = 'translate(-80%, -100%)';
                      } else if (hoveredCell.dayIdx === 0) {
                        transform = 'translate(-5%, -100%)';
                      } else if (hoveredCell.dayIdx === 1) {
                        transform = 'translate(-20%, -100%)';
                      }
                      return (
                        <div
                          className="heatmap-tooltip"
                          style={{
                            left: `${tooltipPos.x}px`,
                            top: `${tooltipPos.y}px`,
                            transform
                          }}
                        >
                          <div className="ht-date">
                            {dayjs(hoveredCell.date).format('dddd, MMMM DD, YYYY')}
                          </div>
                          <div className="ht-amount">
                            Spent: {formatCurrency(hoveredCell.value)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Financial Goals Section */}
            <div className="analytics-card chart-card goals-section-card" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
              <div className="chart-card-header">
                <div className="chart-card-title-group">
                  <span className="chart-title-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.15)' }}><FaTrophy /></span>
                  <div className="category-header-title-text">
                    <h3>Financial Savings Goals</h3>
                    <p className="category-subtitle-text">Define and track your active savings targets against your real savings rate</p>
                  </div>
                </div>
                <button className="add-goal-btn" onClick={() => handleOpenGoalModal()}>
                  <FaPlus style={{ marginRight: '6px' }} /> New Goal
                </button>
              </div>

              {goalsLoading ? (
                <div className="goals-loading" style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loading message="Loading savings goals" />
                </div>
              ) : goalsError ? (
                <p className="error-message">{goalsError}</p>
              ) : goals.length === 0 ? (
                <div className="goals-empty-state">
                  <p className="empty-message">No savings goals defined yet.</p>
                  <p className="empty-subtext">Set savings targets for vacations, emergency funds, or purchases to visualize progress and track timelines.</p>
                  <button className="empty-cta-btn" onClick={() => handleOpenGoalModal()}>
                    Create Your First Goal
                  </button>
                </div>
              ) : (
                <div className="goals-cards-grid">
                  {goals.map(goal => {
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                    const pct = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));

                    // Completion Projection Math
                    const netIncome = Number(analyticsData.incomeVsExpense?.income) || 0;
                    const netExpenses = Number(analyticsData.incomeVsExpense?.expenses) || 0;
                    const monthlySavings = netIncome - netExpenses;
                    const daysInPeriod = dayjs(endDate).diff(dayjs(startDate), 'day') + 1 || 30;
                    const dailySavingsRate = monthlySavings > 0 ? monthlySavings / daysInPeriod : 0;



                    // Schedule Adherence Math (Progressive Path)
                    const goalCreatedAt = dayjs(goal.createdAt);
                    const targetDateObj = dayjs(goal.targetDate);
                    const todayObj = dayjs();
                    const totalDuration = Math.max(1, targetDateObj.diff(goalCreatedAt, 'day'));
                    const elapsedDuration = Math.max(0, todayObj.diff(goalCreatedAt, 'day'));
                    const isOverdue = todayObj.isAfter(targetDateObj);
                    const daysLeft = Math.max(0, targetDateObj.diff(todayObj, 'day'));

                    // Projected completion
                    let projectionText = '';
                    if (remaining === 0) {
                      projectionText = 'Goal Fully Achieved! 🎉';
                    } else if (isOverdue) {
                      projectionText = `Target date passed — update your goal or add more savings`;
                    } else if (dailySavingsRate > 0) {
                      const daysToComplete = Math.ceil(remaining / dailySavingsRate);
                      if (daysToComplete <= daysLeft) {
                        const estimatedDate = todayObj.add(daysToComplete, 'day').format('MMM DD, YYYY');
                        projectionText = `Est. Completion: ${estimatedDate} (${daysToComplete} days at current rate)`;
                      } else {
                        projectionText = `At current rate, you'll miss the deadline by ${daysToComplete - daysLeft} days`;
                      }
                    } else if (monthlySavings <= 0) {
                      projectionText = `No net savings detected — increase income or cut expenses to progress`;
                    } else {
                      projectionText = `${daysLeft} days remaining until target date`;
                    }

                    // Schedule adherence status
                    let adherenceText = '';
                    let adherenceClass = '';
                    if (remaining === 0) {
                      adherenceText = 'Goal Completed 🎉';
                      adherenceClass = 'status-completed';
                    } else if (elapsedDuration === 0 && goal.currentAmount === 0) {
                      // Goal literally just created, no time has elapsed
                      adherenceText = `Just Started — ${daysLeft} days to target`;
                      adherenceClass = 'status-started';
                    } else if (isOverdue) {
                      const shortfall = goal.targetAmount - goal.currentAmount;
                      adherenceText = `Overdue — ${formatCurrency(shortfall)} still remaining`;
                      adherenceClass = 'status-behind';
                    } else {
                      const fraction = Math.min(1, elapsedDuration / totalDuration);
                      const expectedProgress = goal.targetAmount * fraction;
                      const difference = goal.currentAmount - expectedProgress;
                      if (Math.abs(difference) < 1) {
                        // Exactly on track (within ₹1 rounding)
                        adherenceText = `On Track — ${daysLeft} days remaining`;
                        adherenceClass = 'status-ahead';
                      } else if (difference > 0) {
                        adherenceText = `Ahead of Schedule (+${formatCurrency(difference)})`;
                        adherenceClass = 'status-ahead';
                      } else {
                        adherenceText = `Behind Schedule (${formatCurrency(Math.abs(difference))} short)`;
                        adherenceClass = 'status-behind';
                      }
                    }

                    return (
                      <div key={goal._id} className="goal-card-item">
                        <div className="goal-card-header-row">
                          <div className="goal-meta-group">
                            <span className="goal-category-tag">{goal.category}</span>
                            <h4 className="goal-card-name">{goal.name}</h4>
                          </div>
                          <div className="goal-actions-group">
                            <button className="goal-action-icon-btn edit-btn" title="Edit Goal" onClick={() => handleOpenGoalModal(goal)}>
                              <FaEdit />
                            </button>
                            <button className="goal-action-icon-btn delete-btn" title="Delete Goal" onClick={() => handleDeleteGoal(goal._id)}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>

                        <div className="goal-financial-metrics">
                          <div className="metric-row">
                            <span className="m-label">Saved</span>
                            <span className="m-value saved-amount">{formatCurrency(goal.currentAmount)}</span>
                          </div>
                          <div className="metric-row">
                            <span className="m-label">Target</span>
                            <span className="m-value target-amount">{formatCurrency(goal.targetAmount)}</span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="goal-progress-container">
                          <div className="goal-progress-track">
                            <div className="goal-progress-fill" style={{ width: `${pct}%` }}>
                              <span className="goal-progress-node" />
                            </div>
                          </div>
                          <div className="goal-progress-percentage-row">
                            <span className="goal-progress-percentage">{pct.toFixed(0)}% Complete</span>
                            <span className="goal-remaining-label">{remaining > 0 ? `${formatCurrency(remaining)} left` : 'Completed'}</span>
                          </div>
                        </div>

                        <div className="goal-adherence-container">
                          <div className={`goal-adherence-status-badge ${adherenceClass}`}>
                            <span className="adherence-status-icon">
                              {adherenceClass === 'status-ahead' ? '📈' : adherenceClass === 'status-behind' ? '⚠️' : '🎯'}
                            </span>
                            <span className="adherence-status-text">{adherenceText}</span>
                          </div>

                          {projectionText && (
                            <div className="goal-projection-info">
                              <span className="projection-icon">⏳</span>
                              <span className="projection-text">{projectionText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                Money Flow — Premium Fintech Outflow Dashboard
            ═══════════════════════════════════════════════════════════ */}
            <div className="analytics-card chart-card premium-flow-card" style={{ gridColumn: '1 / -1', marginTop: '28px' }}>
              <div className="chart-card-header" style={{ marginBottom: '20px' }}>
                <div className="chart-card-title-group">
                  <span className="chart-title-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.15)' }}><FaExchangeAlt /></span>
                  <div className="category-header-title-text">
                    <h3>Financial Flow</h3>
                    <p className="category-subtitle-text">Visualize how your total income is distributed across savings and spending categories</p>
                  </div>
                </div>
              </div>
              {(() => {
                const income = analyticsData.incomeVsExpense?.income || 0;
                const expenses = analyticsData.incomeVsExpense?.expenses || 0;
                const savings = Math.max(0, income - expenses);
                const savPct = income > 0 ? (savings / income) * 100 : 0;
                const expPct = income > 0 ? (expenses / income) * 100 : 0;
                const categories = (analyticsData.spendingByCategory || [])
                  .filter(c => c.value > 0)
                  .sort((a, b) => b.value - a.value);

                if (income === 0 && expenses === 0) {
                  return (
                    <div className="sankey-empty-state">
                      <p>No transaction flows to analyze for this date range.</p>
                    </div>
                  );
                }

                // AI insight panel state resolution
                const activeNodeId = selectedSankeyNode || hoveredSankeyNode;
                const activeInsight = activeNodeId
                  ? getSelectedNodeDetails(activeNodeId)
                  : getOverviewInsights();

                const catPalette = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

                // Helper to check if paths are active/glowing on hover
                const isFlowActive = (sourceId, targetId) => {
                  const current = hoveredSankeyNode || selectedSankeyNode;
                  if (!current) return false;
                  if (current === 'income') return sourceId === 'income';
                  if (current === 'savings') return sourceId === 'income' && targetId === 'savings';
                  if (current === 'expenses') return (sourceId === 'income' && targetId === 'expenses') || sourceId === 'expenses';
                  if (current.startsWith('cat-')) {
                    const catName = current.replace('cat-', '');
                    return (sourceId === 'income' && targetId === 'expenses') || (sourceId === 'expenses' && targetId === `cat-${catName}`);
                  }
                  return false;
                };

                // Helper to map opacity of cards depending on hover focus
                const getCardOpacity = (cardId) => {
                  const current = hoveredSankeyNode || selectedSankeyNode;
                  if (!current) return 1.0;
                  if (current === cardId) return 1.0;
                  if (current === 'income') return 1.0;
                  if (current === 'savings') return (cardId === 'income' || cardId === 'savings') ? 1.0 : 0.35;
                  if (current === 'expenses') return cardId !== 'savings' ? 1.0 : 0.35;
                  if (current.startsWith('cat-')) {
                    const catName = current.replace('cat-', '');
                    return (cardId === 'income' || cardId === 'expenses' || cardId === `cat-${catName}`) ? 1.0 : 0.35;
                  }
                  return 1.0;
                };

                // Check if layout is horizontal for connectors
                const isHorizontalLayout = cardCoords['income'] && cardCoords['expenses'] && (cardCoords['expenses'].x > cardCoords['income'].x + 50);

                return (
                  <div className="money-flow-section-redesign">
                    {/* LEFT COLUMN: Visual Flow Canvas */}
                    <div className="flow-canvas-wrapper" ref={containerRef}>
                      <div className="canvas-header-badge">
                        <span className="live-badge-dot" />
                        Live Flow Tracking
                      </div>

                      {/* SVG overlay for curves */}
                      {isHorizontalLayout && (
                        <svg className="flow-connectors-svg-overlay">
                          <defs>
                            <linearGradient id="gconn-income-savings" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                            <linearGradient id="gconn-income-expenses" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#f43f5e" />
                            </linearGradient>
                            {categories.map((c, i) => (
                              <linearGradient key={c.name} id={`gconn-exp-${c.name.replace(/[^a-zA-Z0-9]/g, '-')}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#f43f5e" />
                                <stop offset="100%" stopColor={catPalette[i % catPalette.length]} />
                              </linearGradient>
                            ))}
                          </defs>

                          {/* Connections */}
                          {savings > 0 && cardCoords['income'] && cardCoords['savings'] && (() => {
                            const path = getCurvePath(cardCoords['income'], cardCoords['savings'], 0, 2);
                            const active = isFlowActive('income', 'savings');
                            return (
                              <g>
                                <path d={path} className="conn-bg-path" />
                                <path d={path} className={`conn-flow-path ${active ? 'active glow-cyan' : ''}`} stroke="url(#gconn-income-savings)" />
                              </g>
                            );
                          })()}

                          {expenses > 0 && cardCoords['income'] && cardCoords['expenses'] && (() => {
                            const path = getCurvePath(cardCoords['income'], cardCoords['expenses'], 1, 2);
                            const active = isFlowActive('income', 'expenses');
                            return (
                              <g>
                                <path d={path} className="conn-bg-path" />
                                <path d={path} className={`conn-flow-path ${active ? 'active glow-rose' : ''}`} stroke="url(#gconn-income-expenses)" />
                              </g>
                            );
                          })()}

                          {expenses > 0 && categories.map((c, i) => {
                            const targetId = `cat-${c.name}`;
                            if (!cardCoords['expenses'] || !cardCoords[targetId]) return null;
                            const path = getCurvePath(cardCoords['expenses'], cardCoords[targetId], i, categories.length);
                            const active = isFlowActive('expenses', targetId);
                            const currentTheme = catPalette[i % catPalette.length];
                            return (
                              <g key={c.name}>
                                <path d={path} className="conn-bg-path" />
                                <path d={path} className={`conn-flow-path ${active ? 'active' : ''}`} stroke={`url(#gconn-exp-${c.name.replace(/[^a-zA-Z0-9]/g, '-')})`} style={{ '--accent-flow': currentTheme }} />
                              </g>
                            );
                          })}
                        </svg>
                      )}

                      {/* Cards Layout columns */}
                      <div className="flow-columns-layout">
                        {/* Column 1: Source */}
                        <div className="flow-column source-column">
                          <div className="column-label-tag">SOURCE</div>
                          <div
                            data-flow-id="income"
                            className={`redesign-flow-card source-card ${selectedSankeyNode === 'income' ? 'selected' : ''}`}
                            style={{ opacity: getCardOpacity('income'), '--card-accent': '#10b981' }}
                            onMouseEnter={() => setHoveredSankeyNode('income')}
                            onMouseLeave={() => setHoveredSankeyNode(null)}
                            onClick={() => setSelectedSankeyNode(selectedSankeyNode === 'income' ? null : 'income')}
                          >
                            <div className="card-pulse-glow" />
                            <div className="card-top-row">
                              <span className="card-emoji-badge text-emerald" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                                <img src="https://img.icons8.com/dusk/64/receive-cash.png" alt="Income" style={{ width: '22px', height: '22px', display: 'block' }} />
                              </span>
                              <span className="card-budget-status status-success">Active Inflow</span>
                            </div>
                            <div className="card-meta-title">Total Income</div>
                            <div className="card-value-display text-emerald">{formatCurrency(income)}</div>
                            <div className="card-sub-info">Primary cash source</div>
                          </div>
                        </div>

                        {/* Column 2: Allocation */}
                        <div className="flow-column allocation-column">
                          <div className="column-label-tag">ALLOCATION</div>

                          {/* Savings Card */}
                          {savings > 0 && (
                            <div
                              data-flow-id="savings"
                              className={`redesign-flow-card savings-card ${selectedSankeyNode === 'savings' ? 'selected' : ''}`}
                              style={{ opacity: getCardOpacity('savings'), '--card-accent': '#06b6d4' }}
                              onMouseEnter={() => setHoveredSankeyNode('savings')}
                              onMouseLeave={() => setHoveredSankeyNode(null)}
                              onClick={() => setSelectedSankeyNode(selectedSankeyNode === 'savings' ? null : 'savings')}
                            >
                              <div className="card-pulse-glow" />
                              <div className="card-top-row">
                                <span className="card-emoji-badge text-cyan">🏦</span>
                                <span className="card-budget-status status-cyan">{savPct.toFixed(0)}% Savings Rate</span>
                              </div>
                              <div className="card-meta-title">Net Savings</div>
                              <div className="card-value-display text-cyan">{formatCurrency(savings)}</div>
                              <div className="card-sub-info">Capital accumulation</div>
                            </div>
                          )}

                          {/* Spent Card */}
                          {expenses > 0 && (
                            <div
                              data-flow-id="expenses"
                              className={`redesign-flow-card expense-parent-card ${selectedSankeyNode === 'expenses' ? 'selected' : ''}`}
                              style={{ opacity: getCardOpacity('expenses'), '--card-accent': '#f43f5e' }}
                              onMouseEnter={() => setHoveredSankeyNode('expenses')}
                              onMouseLeave={() => setHoveredSankeyNode(null)}
                              onClick={() => setSelectedSankeyNode(selectedSankeyNode === 'expenses' ? null : 'expenses')}
                            >
                              <div className="card-pulse-glow" />
                              <div className="card-top-row">
                                <span className="card-emoji-badge text-rose" style={{ background: 'rgba(244, 63, 94, 0.08)' }}>
                                  <img src="https://img.icons8.com/fluency/48/card-in-use-1.png" alt="Expenses" style={{ width: '22px', height: '22px', display: 'block' }} />
                                </span>
                                <span className="card-budget-status status-rose">{expPct.toFixed(0)}% Spent</span>
                              </div>
                              <div className="card-meta-title">Total Spent</div>
                              <div className="card-value-display text-rose">{formatCurrency(expenses)}</div>
                              <div className="card-sub-info">Monthly consumption</div>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Categories */}
                        <div className="flow-column categories-column">
                          <div className="column-label-tag">SPENDING CATEGORIES</div>
                          <div className="categories-stack">
                            {categories.map((c, idx) => {
                              const targetId = `cat-${c.name}`;
                              const trendInfo = getCategoryTrend(c.name, c.value);
                              const budgetInfo = getCategoryBudgetStatus(c.name, c.value);
                              const currentTheme = catPalette[idx % catPalette.length];

                              return (
                                <div
                                  key={c.name}
                                  data-flow-id={targetId}
                                  className={`redesign-flow-card category-card-redesign ${selectedSankeyNode === targetId ? 'selected' : ''}`}
                                  style={{
                                    opacity: getCardOpacity(targetId),
                                    '--card-accent-border': currentTheme,
                                    '--card-accent': currentTheme
                                  }}
                                  onMouseEnter={() => setHoveredSankeyNode(targetId)}
                                  onMouseLeave={() => setHoveredSankeyNode(null)}
                                  onClick={() => setSelectedSankeyNode(selectedSankeyNode === targetId ? null : targetId)}
                                >
                                  <div className="card-pulse-glow" />
                                  <div className="cat-card-layout">
                                    <span className="cat-emoji-badge" style={{ backgroundColor: `${currentTheme}15` }}>
                                      {getCategoryIcon(c.name)}
                                    </span>
                                    <div className="cat-info-middle">
                                      <div className="cat-title-text-row">
                                        <span className="cat-title-name">{c.name}</span>
                                        {budgetInfo && budgetInfo.class !== 'neutral' && (
                                          <span className={`cat-budget-tag bg-${budgetInfo.class}`}>{budgetInfo.status}</span>
                                        )}
                                      </div>
                                      <div className="cat-details-row">
                                        <span className="cat-pct-share">
                                          {expenses > 0 ? `${((c.value / expenses) * 100).toFixed(0)}% of spent` : '—'}
                                        </span>
                                        {trendInfo && (
                                          <span className={`cat-trend-badge trend-${trendInfo.direction}`}>
                                            {trendInfo.text}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="cat-value-right">
                                      {formatCurrency(c.value)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: AI Copilot Insight Panel */}
                    <div className="flow-insight-side-panel">
                      <div className="insight-panel-card">
                        <div className="panel-top-row">
                          <div className="copilot-ai-icon-wrap">
                            <div ref={copilotAiIconRef} className="copilot-lottie-icon" />
                          </div>
                          <span className="panel-header-title">FinSense AI Copilot</span>
                          <span className="panel-badge-pill">Intelligence Active</span>
                        </div>

                        <div className="panel-main-content">
                          {activeInsight ? (
                            <div key={activeNodeId || 'overview'} className="insight-content-anim-wrapper">
                              {activeNodeId ? (
                                <div className="insight-scope-tag" style={{ color: activeInsight.color || '#fff' }}>
                                  {activeInsight.icon} INSIGHT: {activeInsight.label}
                                </div>
                              ) : (
                                <div className="insight-scope-tag text-purple">
                                  🔮 MONTHLY FLOW SUMMARY
                                </div>
                              )}

                              <h4 className="insight-headline-text">{activeInsight.headline}</h4>
                              <p className="insight-desc-body">{activeInsight.description}</p>

                              <div className="insight-recommendation-box" style={{ borderLeftColor: activeInsight.color || '#8b5cf6' }}>
                                <div className="rec-header">💡 SMART RECOMMENDATION</div>
                                <div className="rec-body">{activeInsight.recommendation}</div>
                              </div>

                              {/* Analytics rating sliders */}
                              <div className="insight-ratings-row">
                                <div className="rating-item">
                                  <span className="r-label">Flow Integrity</span>
                                  <span className={`r-badge bg-${activeInsight.health}`}>
                                    {activeInsight.healthText || 'Optimal'}
                                  </span>
                                </div>
                                <div className="rating-item">
                                  <span className="r-label">Outlay Risk</span>
                                  <span className={`r-badge bg-${activeInsight.riskClass || 'success'}`}>
                                    {activeInsight.risk || 'Low'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="insight-empty-loader">
                              <p>Analyzing outlays...</p>
                            </div>
                          )}
                        </div>

                        <div className="panel-footer-tip">
                          {selectedSankeyNode ? (
                            <span>Selected · Click again to deselect &amp; see overview</span>
                          ) : (
                            <span>Tap any flow card on the left to lock detailed analysis</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>


            {/* Glassmorphic Savings Goal Form Modal */}
            {showGoalModal && (
              <div className="goals-modal-overlay" onClick={() => setShowGoalModal(false)}>
                <div className="goals-modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-row">
                    <h3>{editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</h3>
                    <button className="modal-close-btn" onClick={() => setShowGoalModal(false)}><FaTimes /></button>
                  </div>
                  <form onSubmit={handleSaveGoal} className="goals-modal-form">
                    <div className="form-group-item">
                      <label htmlFor="goalName">Goal Name *</label>
                      <input
                        type="text"
                        id="goalName"
                        value={goalName}
                        onChange={e => setGoalName(e.target.value)}
                        placeholder="e.g. Europe Trip, Emergency Fund"
                        required
                      />
                    </div>
                    <div className="form-row-two-cols">
                      <div className="form-group-item">
                        <label htmlFor="goalTargetAmount">Target Amount *</label>
                        <input
                          type="number"
                          id="goalTargetAmount"
                          value={goalTargetAmount}
                          onChange={e => setGoalTargetAmount(e.target.value)}
                          placeholder="e.g. 50000"
                          min="1"
                          required
                        />
                      </div>
                      <div className="form-group-item">
                        <label htmlFor="goalCurrentAmount">Current Savings</label>
                        <input
                          type="number"
                          id="goalCurrentAmount"
                          value={goalCurrentAmount}
                          onChange={e => setGoalCurrentAmount(e.target.value)}
                          placeholder="e.g. 10000"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="form-row-two-cols">
                      <div className="form-group-item">
                        <label htmlFor="goalTargetDate">Target Date *</label>
                        <CustomDatePicker
                          value={goalTargetDate}
                          onChange={newVal => setGoalTargetDate(newVal)}
                          placeholder="Target date"
                        />
                      </div>
                      <div className="form-group-item">
                        <label htmlFor="goalCategory">Category</label>
                        <input
                          type="text"
                          id="goalCategory"
                          value={goalCategory}
                          onChange={e => setGoalCategory(e.target.value)}
                          placeholder="e.g. Travel, Emergency, House"
                        />
                        <div className="category-suggestions" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['General', 'Emergency Fund', 'Travel', 'Savings', 'Investment', 'Purchase', 'Gadgets', 'Education', 'Vehicle'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              className={`suggestion-btn ${goalCategory === cat ? 'active' : ''}`}
                              onClick={() => setGoalCategory(cat)}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="goals-modal-submit-btn">
                      {editingGoal ? 'Save Changes' : 'Create Goal'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};


export default Analytics;
