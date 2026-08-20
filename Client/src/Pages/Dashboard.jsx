import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaDollarSign,
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaPlus,
  FaFilter,
  FaTimes,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaWallet,
  FaExchangeAlt,
  FaTachometerAlt,
  FaTrash,
  FaMagic,
  FaStar,
  FaEdit,
  FaEllipsisH,
  FaExclamationTriangle,
  FaChartPie
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import './Dashboard.css';
import axios from 'axios';
import Loading from '../components/Loading';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import lottie from 'lottie-web';
import aiIconAnimation from '../assets/ai-icon.json';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useDisplaySettings } from '../context/DisplaySettingsContext';


const GRADIENTS = [
  { id: 'dash-grad-teal', start: '#06b6d4', end: '#2dd4bf' },
  { id: 'dash-grad-rose', start: '#e11d48', end: '#fb7185' },
  { id: 'dash-grad-pink', start: '#db2777', end: '#fbcfe8' },
  { id: 'dash-grad-amber', start: '#d97706', end: '#fbbf24' },
  { id: 'dash-grad-indigo', start: '#4f46e5', end: '#818cf8' },
  { id: 'dash-grad-blue', start: '#2563eb', end: '#60a5fa' },
  { id: 'dash-grad-fuchsia', start: '#9333ea', end: '#c084fc' }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { displaySettings, currency, updateDisplaySettings, formatCurrency, formatCurrencyRaw, chartStyle } = useDisplaySettings();

  const [activePieIndex, setActivePieIndex] = useState(null);
  const [activeBarIndex, setActiveBarIndex] = useState(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, stroke } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 6}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          style={{
            outline: 'none',
            cursor: 'pointer',
            filter: 'url(#pie-shadow-active)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && activePieIndex !== null) {
      const data = payload[0].payload;
      const value = payload[0].value;
      // Calculate total breakdown sum for percentage
      const total = dashboardData?.expenseBreakdown?.reduce((sum, item) => sum + item.value, 0) || 1;
      const percentage = ((value / total) * 100).toFixed(1);

      const categoryIndex = dashboardData?.expenseBreakdown?.findIndex(c => c.name === data.name) ?? 0;
      const grad = GRADIENTS[categoryIndex % GRADIENTS.length] || GRADIENTS[0];

      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-header">
            <span
              className="tooltip-dot"
              style={{
                background: grad.start,
                boxShadow: `0 0 6px ${grad.start}cc`
              }}
            ></span>
            <span className="tooltip-title">{data.name}</span>
          </div>
          <div className="tooltip-divider"></div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Amount:</span>
              <span className="tooltip-value">{formatCurrency(value)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Share:</span>
              <span className="tooltip-value highlight-percentage">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const income = payload.find(p => p.name === 'Income')?.value || 0;
      const expenses = payload.find(p => p.name === 'Expenses')?.value || 0;
      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-title">{label}</span>
          </div>
          <div className="tooltip-divider"></div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="tooltip-dot" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 6px rgba(99,102,241,0.5)' }}></span>
                <span className="tooltip-label">Income:</span>
              </div>
              <span className="tooltip-value" style={{ color: '#818cf8' }}>{formatCurrency(income)}</span>
            </div>
            <div className="tooltip-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="tooltip-dot" style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}></span>
                <span className="tooltip-label">Expenses:</span>
              </div>
              <span className="tooltip-value" style={{ color: '#f87171' }}>{formatCurrency(expenses)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const [dashboardData, setDashboardData] = useState({
    totalBalance: 0,
    income: 0,
    expenses: 0,
    budgetLeft: 0,
    monthlyComparison: [],
    expenseBreakdown: [],
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState([]);


  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [budgetCategories, setBudgetCategories] = useState([]);

  const allAvailableCategories = useMemo(() => {
    const defaults = [
      'Income',
      'Salary',
      'Investment',
      'Food',
      'Rent',
      'Utilities',
      'Entertainment',
      'Shopping',
      'Transportation',
      'Health & Fitness',
      'Education',
      'Travel',
      'Subscriptions',
      'Miscellaneous',
      'Other'
    ];
    const combined = [...new Set([...(budgetCategories || []), ...defaults])];
    return [
      { value: '', label: 'All Categories' },
      ...combined.map(cat => ({ value: cat, label: cat }))
    ];
  }, [budgetCategories]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    amount: '',
    type: 'expense'
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);


  // Prevent background scrolling when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showFilterModal || showDeleteModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('lenis-stopped');
      document.documentElement.classList.add('lenis-stopped');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('lenis-stopped');
      document.documentElement.classList.remove('lenis-stopped');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('lenis-stopped');
      document.documentElement.classList.remove('lenis-stopped');
    };
  }, [showAddModal, showEditModal, showFilterModal, showDeleteModal]);



  const aiHeaderIconRef = useRef(null);
  const aiChatIconRef = useRef(null);

  useEffect(() => {
    if (!aiHeaderIconRef.current) return;
    const anim = lottie.loadAnimation({
      container: aiHeaderIconRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiIconAnimation,
    });
    return () => {
      anim.destroy();
    };
  }, [loading]);



  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const summaryResponse = await axios.get(`${API_URL}/dashboard/summary`, { withCredentials: true });
      const summary = summaryResponse.data;

      const transactionsResponse = await axios.get(`${API_URL}/transactions?limit=4`, { withCredentials: true });
      const recentTxs = transactionsResponse.data.transactions || [];

      setDashboardData({
        totalBalance: summary.totalBalance || 0,
        income: summary.income || 0,
        expenses: summary.expenses || 0,
        budgetLimit: summary.budgetLimit || 0,
        budgetLeft: summary.budgetLeft || 0,
        monthlyComparison: summary.monthlyComparison || [],
        expenseBreakdown: summary.expenseBreakdown || [],
      });
      setRecentTransactions(recentTxs);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errMsg = err.response?.data?.message || 'Failed to load dashboard data.';
      setApiError(errMsg);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const fetchBudCategories = useCallback(async (dateStr = null) => {
    try {
      const dateObj = dateStr ? new Date(dateStr) : new Date();
      const yr = dateObj.getFullYear();
      const mo = dateObj.getMonth(); // 0-indexed
      const response = await axios.get(`${API_URL}/budgets?year=${yr}&month=${mo}`, { withCredentials: true });
      if (response.data && response.data.categories) {
        setBudgetCategories(response.data.categories.map(c => c.name));
      } else {
        setBudgetCategories([]);
      }
    } catch (err) {
      console.error('Error fetching budget categories:', err);
      setBudgetCategories([]);
    }
  }, []);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchBudCategories(formData.date);
    }
  }, [showAddModal, showEditModal, formData.date, fetchBudCategories]);

  const fetchInsights = useCallback(async () => {
    // Optional: setInsights([]) to show the shimmer during reload
    setInsights([]);
    try {
      const response = await axios.get(`${API_URL}/insights`, { withCredentials: true });
      setInsights(response.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  }, []);





  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchInsights();
      fetchBudCategories();
    }
  }, [user, fetchDashboardData, fetchInsights, fetchBudCategories]);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchBudCategories(formData.date);
    }
  }, [showAddModal, showEditModal, formData.date, fetchBudCategories]);

  const toggleCurrency = () => {
    const newCurrency = currency === 'INR' ? 'USD' : 'INR';
    updateDisplaySettings({ currency: newCurrency });
  };

  const userAvatar = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const handleBreakdownClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowBreakdown(true);
  };

  const closeBreakdown = () => {
    setShowBreakdown(false);
    setSelectedTransaction(null);
  };

  const handleFilterClick = () => {
    setShowFilterModal(true);
  };

  const handleAddClick = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: '',
      amount: '',
      type: 'expense'
    });
    setFormError('');
    setShowAddModal(true);
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormError('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setFormError('');
    setEditingTransaction(null);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    console.log("Applying filters:", { filterCategory, filterDate });
    setShowFilterModal(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFilterCategory(value);
    } else if (name === 'date') {
      setFilterDate(value);
    }
  };

  const filteredTransactions = recentTransactions.filter(tx => {
    const categoryMatch = !filterCategory || tx.category === filterCategory;
    const dateMatch = !filterDate || tx.date.startsWith(filterDate);
    return categoryMatch && dateMatch;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!formData.date || !formData.description || !formData.category || !formData.amount) {
      setFormError('Please fill in all fields');
      setFormLoading(false);
      return;
    }
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid positive amount.');
      setFormLoading(false);
      return;
    }

    try {
      const transactionData = {
        ...formData,
        amount: formData.type === 'expense' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount)),
      };

      await axios.post(`${API_URL}/transactions`, transactionData, { withCredentials: true });

      fetchDashboardData();
      fetchInsights(); // Re-calculate AI insights after new transaction
      closeAddModal();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setFormError(err.response?.data?.message || 'Failed to add transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date.split('T')[0],
      description: transaction.description,
      category: transaction.category,
      amount: Math.abs(transaction.amount).toString(),
      type: transaction.amount >= 0 ? 'income' : 'expense'
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const transactionData = {
        ...formData,
        amount: formData.type === 'expense' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount)),
      };

      await axios.put(`${API_URL}/transactions/${editingTransaction._id}`, transactionData, { withCredentials: true });

      fetchDashboardData();
      fetchInsights(); // Re-calculate AI insights after edit
      closeEditModal();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setFormError(err.response?.data?.message || 'Failed to update transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    try {
      await axios.delete(`${API_URL}/transactions/${transactionToDelete}`, { withCredentials: true });
      fetchDashboardData();
      fetchInsights();
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert(err.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  const handleLogoutClick = () => {
    logout();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading && recentTransactions.length === 0) {
    return (
      <main className="dashboard-content loading-message">
        <Loading message="Loading Dashboard" />
      </main>
    );
  }

  if (apiError) {
    return (
      <main className="dashboard-content error-message">
        <p>Error loading dashboard: {apiError}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </main>
    );
  }

  return (
    <>
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-titles">
            <h2>Dashboard</h2>
            <span className="header-separator">|</span>
            <p className="header-subtitle">Welcome back to your financial control center</p>
          </div>
          <div className="currency-pill-toggle" onClick={toggleCurrency}>
            <span className={`currency-option ${currency === 'INR' ? 'active' : ''}`}>₹ INR</span>
            <span className={`currency-option ${currency === 'USD' ? 'active' : ''}`}>$ USD</span>
          </div>
        </div>

        {loading && <Loading message="Updating data" />}

        {/* Threshold Alerts */}
        {!alertDismissed && dashboardData.budgetLimit > 0 && (dashboardData.expenses / dashboardData.budgetLimit) >= 0.5 && (
          <div className={`urgency-alert ${(dashboardData.expenses / dashboardData.budgetLimit) >= 0.7 ? 'critical' : 'warning'}`}>
            <div className="alert-icon-badge">
              {(dashboardData.expenses / dashboardData.budgetLimit) >= 0.7 ? (
                <img
                  src="https://img.icons8.com/comic/100/error.png"
                  alt="Critical Alert"
                  style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                />
              ) : '⚠️'}
            </div>
            <div className="alert-body">
              <span className="alert-type-label">
                {(dashboardData.expenses / dashboardData.budgetLimit) >= 0.7 ? 'Critical Alert' : 'Budget Warning'}
              </span>
              <span className="alert-message">
                {(dashboardData.expenses / dashboardData.budgetLimit) >= 0.7
                  ? `You have exhausted ${((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of your monthly budget.`
                  : `You have utilised ${((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of your monthly limit.`
                }
              </span>
            </div>
            <Link to="/budget" className="alert-action-btn">Adjust Budget</Link>
            <button
              className="alert-close-btn"
              onClick={() => setAlertDismissed(true)}
              aria-label="Dismiss alert"
              type="button"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="insights-section">
          <div className="insights-header">
            <h3>
              <div ref={aiHeaderIconRef} className="ai-header-lottie-container" />
              <span className="insights-title-text">FinSense</span>
              <span className="ai-badge">ALPHA</span>
            </h3>
          </div>
          <div className={`ai-insights-list ${insights.length === 1 ? 'single-insight' : ''}`}>
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div key={idx} className={`ai-insight-row ${insight.type} priority-${insight.priority || 1}`}>
                  <div className="ai-insight-icon-wrapper">
                    {insight.type === 'critical' ? (
                      <img
                        src="https://img.icons8.com/doodle/48/error.png"
                        alt="Critical Warning"
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                      />
                    ) : insight.type === 'warning' ? (
                      <img
                        src="https://img.icons8.com/pulsar-gradient/48/warning-shield.png"
                        alt="Warning"
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                      />
                    ) : insight.type === 'success' ? (
                      <img
                        src="https://img.icons8.com/deco-color/144/ok.png"
                        alt="Success"
                        className="success-icon-img"
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                      />
                    ) : insight.type === 'info' ? (
                      <img
                        src="https://img.icons8.com/arcade/64/info.png"
                        alt="Info"
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                      />
                    ) : (
                      insight.icon
                    )}
                  </div>
                  <div className="ai-insight-body">
                    <h4>{insight.type.charAt(0).toUpperCase() + insight.type.slice(1)} Insight</h4>
                    <p>{insight.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="ai-insight-row info loading-shimmer">
                <div className="ai-insight-icon-wrapper">🧠</div>
                <div className="ai-insight-body">
                  <h4>Neural Core Activating...</h4>
                  <p>FinSense is analyzing your transactions to find your next money moves.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Card 1: Total Balance */}
          <div className="dashboard-card-section balance-card-glow">
            <div className="card-left-tag blue-tag"></div>
            <div className="card-header-row">
              <h2>Total Balance</h2>
              <div className="card-icon-badge blue-badge">
                <FaWallet />
              </div>
            </div>
            <p className="card-value-display">
              {formatCurrency(dashboardData.totalBalance)}
            </p>
            <div className="card-footer-row">
              <span className="card-footer-status">Available assets</span>
            </div>
          </div>

          {/* Card 2: Income */}
          <div className="dashboard-card-section income-card-glow">
            <div className="card-left-tag purple-tag"></div>
            <div className="card-header-row">
              <h2>Income (This Month)</h2>
              <div className="card-icon-badge purple-badge">
                <FaArrowUp />
              </div>
            </div>
            <p className="card-value-display">
              {formatCurrency(dashboardData.income)}
            </p>
            <div className="card-footer-row">
              <span className="card-footer-status">Deposited this month</span>
            </div>
          </div>

          {/* Card 3: Expenses */}
          <div className="dashboard-card-section expense-card-glow">
            <div className="card-left-tag red-tag"></div>
            <div className="card-header-row">
              <h2>Expenses (This Month)</h2>
              <div className="card-icon-badge red-badge">
                <FaArrowDown />
              </div>
            </div>
            <p className="card-value-display">
              {formatCurrency(dashboardData.expenses)}
            </p>
            <div className="card-footer-row">
              <span className="card-footer-status">Withdrawn this month</span>
            </div>
          </div>

          {/* Card 4: Budget Left */}
          <div className="dashboard-card-section budget-card-glow">
            <div className="card-left-tag green-tag"></div>
            <div className="card-header-row">
              <h2>Budget Left</h2>
              <div className="card-icon-badge green-badge">
                <FaChartBar />
              </div>
            </div>
            <p className="card-value-display" style={{ color: dashboardData.budgetLeft < 0 ? 'var(--error-color)' : 'inherit' }}>
              {formatCurrency(dashboardData.budgetLeft)}
            </p>
            <div className="card-footer-row">
              {dashboardData.budgetLimit > 0 ? (
                <div className="budget-progress-info">
                  <div className="budget-mini-track">
                    <div
                      className="budget-mini-fill"
                      style={{
                        width: `${Math.min((dashboardData.expenses / dashboardData.budgetLimit) * 100, 100)}%`,
                        backgroundColor: (dashboardData.expenses / dashboardData.budgetLimit) >= 0.85 ? '#ef4444' : '#10b981'
                      }}
                    />
                  </div>
                  <span className="budget-percentage">
                    {((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of {formatCurrency(dashboardData.budgetLimit)} used
                  </span>
                </div>
              ) : (
                <Link to="/budget" className="set-budget-link">Set a budget</Link>
              )}
            </div>
          </div>
        </div>

        <div className="charts-section" style={{ display: 'flex', marginTop: '30px', gap: '20px' }}>
          <div className="chart-container">
            <h2>Income vs Expenses</h2>
            <p className="chart-subtitle">Monthly comparison</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.monthlyComparison}
                margin={{ top: 15, right: 0, left: 0, bottom: 5 }}
                onMouseMove={(state) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setActiveBarIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setActiveBarIndex(null)}
              >
                <defs>
                  {/* Income bar gradient */}
                  <linearGradient id="bar-grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                  </linearGradient>
                  {/* Expense bar gradient */}
                  <linearGradient id="bar-grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                  </linearGradient>

                  {/* Glowing shadow filters for hovered bars */}
                  <filter id="bar-shadow-active" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(value) => {
                    const converted = formatCurrencyRaw(value);
                    const symbol = currency === 'INR' ? '₹' : '$';
                    return `${symbol}${(converted / 1000).toFixed(converted / 1000 >= 1 ? 0 : 1)}k`;
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={false} // Disable the white hover background overlay
                  wrapperStyle={{ pointerEvents: 'none' }}
                />

                <Bar dataKey="Income" radius={[6, 6, 0, 0]}>
                  {dashboardData.monthlyComparison.map((entry, index) => {
                    const isHovered = activeBarIndex === index;
                    const isAnyHovered = activeBarIndex !== null;
                    const opacity = isAnyHovered ? (isHovered ? 1.0 : 0.35) : 1.0;
                    const isOutline = chartStyle === 'outline';
                    return (
                      <Cell
                        key={`cell-income-${index}`}
                        fill={isOutline ? 'transparent' : 'url(#bar-grad-income)'}
                        stroke={isOutline ? '#6366f1' : 'none'}
                        strokeWidth={isOutline ? 2 : 0}
                        fillOpacity={isOutline ? 0.08 : opacity}
                        style={{
                          filter: isHovered ? 'url(#bar-shadow-active)' : 'none',
                          transition: 'opacity 0.25s ease, filter 0.25s ease',
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </Bar>

                <Bar dataKey="Expenses" radius={[6, 6, 0, 0]}>
                  {dashboardData.monthlyComparison.map((entry, index) => {
                    const isHovered = activeBarIndex === index;
                    const isAnyHovered = activeBarIndex !== null;
                    const opacity = isAnyHovered ? (isHovered ? 1.0 : 0.35) : 1.0;
                    const isOutline = chartStyle === 'outline';
                    return (
                      <Cell
                        key={`cell-expense-${index}`}
                        fill={isOutline ? 'transparent' : 'url(#bar-grad-expense)'}
                        stroke={isOutline ? '#f87171' : 'none'}
                        strokeWidth={isOutline ? 2 : 0}
                        fillOpacity={isOutline ? 0.08 : opacity}
                        style={{
                          filter: isHovered ? 'url(#bar-shadow-active)' : 'none',
                          transition: 'opacity 0.25s ease, filter 0.25s ease',
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Custom styled legend replacing default Recharts legend */}
            <div className="bar-legend" style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              <div className="legend-item" style={{ background: 'none', border: 'none', padding: 0 }}>
                <span
                  className="legend-color"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                    borderRadius: '4px',
                    width: '14px',
                    height: '14px',
                    display: 'inline-block'
                  }}
                ></span>
                <span className="legend-label" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Income</span>
              </div>
              <div className="legend-item" style={{ background: 'none', border: 'none', padding: 0 }}>
                <span
                  className="legend-color"
                  style={{
                    background: 'linear-gradient(135deg, #f87171, #ef4444)',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                    borderRadius: '4px',
                    width: '14px',
                    height: '14px',
                    display: 'inline-block'
                  }}
                ></span>
                <span className="legend-label" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Expenses</span>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ flex: 1 }}>
            <h2>Expense Breakdown</h2>
            <p className="chart-subtitle">Spending by category</p>
            <div
              className="pie-chart-container"
              style={{ minHeight: '440px', marginTop: '16px' }}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              {dashboardData.expenseBreakdown && dashboardData.expenseBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={440}>
                    <PieChart onMouseLeave={() => setActivePieIndex(null)}>
                      <defs>
                        {GRADIENTS.map((g) => (
                          <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={g.start} stopOpacity={1} />
                            <stop offset="100%" stopColor={g.end} stopOpacity={0.8} />
                          </linearGradient>
                        ))}
                        <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
                        </filter>
                        <filter id="pie-shadow-active" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#000000" floodOpacity="0.65" />
                        </filter>
                      </defs>
                      <Pie
                        data={dashboardData.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={110}
                        outerRadius={148}
                        paddingAngle={4}
                        dataKey="value"
                        activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                        activeShape={renderActiveShape}
                        onMouseEnter={(data, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-out"
                      >
                        {dashboardData.expenseBreakdown.map((entry, index) => {
                          const grad = GRADIENTS[index % GRADIENTS.length];
                          const isHovered = activePieIndex === index;
                          const isAnyHovered = activePieIndex !== null;
                          const opacity = isAnyHovered ? (isHovered ? 1.0 : 0.3) : 1.0;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={grad.start}
                              stroke={grad.start}
                              strokeWidth={1.5}
                              style={{
                                outline: 'none',
                                cursor: 'pointer',
                                opacity,
                                filter: isHovered ? 'url(#pie-shadow-active)' : 'url(#pie-shadow)',
                                transition: 'opacity 0.3s ease, filter 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip />}
                        wrapperStyle={{ pointerEvents: 'none' }}
                        active={activePieIndex !== null}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {dashboardData.expenseBreakdown.map((entry, index) => {
                      const grad = GRADIENTS[index % GRADIENTS.length];
                      const total = dashboardData.expenseBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
                      const percent = ((entry.value / total) * 100).toFixed(1);
                      return (
                        <div key={index} className={`legend-item ${activePieIndex === index ? 'active' : ''}`}>
                          <span
                            className="legend-color"
                            style={{
                              background: grad.start,
                              boxShadow: `0 2px 8px ${grad.start}66`,
                              borderRadius: '4px',
                              width: '14px',
                              height: '14px'
                            }}
                          ></span>
                          <span className="legend-label">
                            {entry.name}: {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-pie-placeholder">
                  <div className="empty-pie-ring">
                    <FaChartPie className="empty-pie-icon" />
                  </div>
                  <h4>No Expense Data</h4>
                  <p>Add transactions to view your category expense breakdown pie chart.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="transactions-section">
          <div className="dashboard-transactions-header">
            <div className="title-group">
              <h2>Recent Transactions</h2>
              <p className="section-subtitle">Your latest financial activities</p>
            </div>
            <div className="action-buttons">
              <button className="btn-filter" onClick={handleFilterClick}>
                <FaFilter /> Filter
              </button>
              <button className="btn-add" onClick={handleAddClick}>
                <FaPlus /> Add Transaction
              </button>
              <Link to="/transactions" className="view-all-link">View All</Link>
            </div>
          </div>

          <table className="transactions-table dashboard-transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <span style={{ color: transaction.amount >= 0 ? 'var(--success-color)' : 'var(--error-color)' }}>
                        {transaction.amount >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn edit-btn" title="Edit" onClick={() => handleEditClick(transaction)}>
                          <FaEdit />
                        </button>
                        <button className="action-btn delete-btn" title="Delete" onClick={() => handleDeleteClick(transaction._id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No recent transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showBreakdown && selectedTransaction && (
        <div className="breakdown-popup">
          <div className="breakdown-content">
            <div className="breakdown-header">
              <h3>Transaction Breakdown</h3>
              <button onClick={closeBreakdown} className="close-btn">
                <FaTimes />
              </button>
            </div>
            <div className="breakdown-details">
              <p><strong>Date:</strong> {selectedTransaction.date}</p>
              <p><strong>Description:</strong> {selectedTransaction.description}</p>
              <p><strong>Category:</strong> {selectedTransaction.category}</p>
              <p><strong>Base Amount:</strong> {formatCurrency(Math.abs(selectedTransaction.amount))}</p>
              <p><strong>Tax (18%):</strong> {formatCurrency(Math.abs(selectedTransaction.amount) * 0.18)}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(Math.abs(selectedTransaction.amount) * 1.18)}</p>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="modal-overlay" onClick={closeFilterModal} data-lenis-prevent>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            <div className="modal-header">
              <h3>Filter Transactions</h3>
              <button onClick={closeFilterModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleFilterSubmit} className="modal-form">
              <div className="form-group">
                <label>Category</label>
                <CustomSelect
                  name="category"
                  value={filterCategory}
                  onChange={handleFilterChange}
                  options={allAvailableCategories}
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <CustomDatePicker
                  value={filterDate}
                  onChange={newVal => setFilterDate(newVal)}
                  placeholder="Select date"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeFilterModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Filter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal} data-lenis-prevent>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button onClick={closeAddModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              {formError && <p className="error-message">{formError}</p>}
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <CustomDatePicker
                    value={formData.date}
                    onChange={newVal => setFormData(prev => ({ ...prev, date: newVal }))}
                    placeholder="Select date"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Type</label>
                  <CustomSelect
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    options={[
                      { value: 'expense', label: 'Expense' },
                      { value: 'income', label: 'Income' }
                    ]}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g., Coffee, Salary" required />
              </div>
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Category *</label>
                  <CustomSelect
                    name="category"
                    value={formData.category}
                    onChange={e => {
                      handleInputChange(e);
                      setFormError('');
                    }}
                    options={
                      formData.type === 'expense'
                        ? [...new Set([...(budgetCategories || []), 'Food', 'Rent', 'Utilities', 'Entertainment', 'Shopping', 'Transportation', 'Health & Fitness', 'Education', 'Travel', 'Subscriptions', 'Miscellaneous', 'Other'])].map(c => ({ value: c, label: c }))
                        : ['Income', 'Salary', 'Investment', 'Freelance', 'Bonus', 'Other Income'].map(c => ({ value: c, label: c }))
                    }
                    placeholder="Select or click a category bubble..."
                  />
                  <div className="category-suggestions" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formData.type === 'expense' ? (
                      [...new Set([...(budgetCategories || []), 'Food', 'Rent', 'Utilities', 'Entertainment', 'Shopping', 'Transportation', 'Health & Fitness', 'Education', 'Travel', 'Subscriptions', 'Miscellaneous', 'Other'])].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: cat }));
                            setFormError('');
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      ['Income', 'Salary', 'Investment', 'Freelance', 'Bonus', 'Other Income'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: cat }));
                            setFormError('');
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Amount</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Enter positive amount" required min="0.01" step="0.01" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal} data-lenis-prevent>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            <div className="modal-header">
              <h3>Edit Transaction</h3>
              <button onClick={closeEditModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              {formError && <p className="error-message">{formError}</p>}
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <CustomDatePicker
                    value={formData.date}
                    onChange={newVal => setFormData(prev => ({ ...prev, date: newVal }))}
                    placeholder="Select date"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Type</label>
                  <CustomSelect
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    options={[
                      { value: 'expense', label: 'Expense' },
                      { value: 'income', label: 'Income' }
                    ]}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g., Coffee, Salary" required />
              </div>
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Category *</label>
                  <CustomSelect
                    name="category"
                    value={formData.category}
                    onChange={e => {
                      handleInputChange(e);
                      setFormError('');
                    }}
                    options={
                      formData.type === 'expense'
                        ? [...new Set([...(budgetCategories || []), 'Food', 'Rent', 'Utilities', 'Entertainment', 'Shopping', 'Transportation', 'Health & Fitness', 'Education', 'Travel', 'Subscriptions', 'Miscellaneous', 'Other'])].map(c => ({ value: c, label: c }))
                        : ['Income', 'Salary', 'Investment', 'Freelance', 'Bonus', 'Other Income'].map(c => ({ value: c, label: c }))
                    }
                    placeholder="Select or click a category bubble..."
                  />
                  <div className="category-suggestions" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formData.type === 'expense' ? (
                      [...new Set([...(budgetCategories || []), 'Food', 'Rent', 'Utilities', 'Entertainment', 'Shopping', 'Transportation', 'Health & Fitness', 'Education', 'Travel', 'Subscriptions', 'Miscellaneous', 'Other'])].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: cat }));
                            setFormError('');
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      ['Income', 'Salary', 'Investment', 'Freelance', 'Bonus', 'Other Income'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category: cat }));
                            setFormError('');
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Amount</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Enter positive amount" required min="0.01" step="0.01" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)} data-lenis-prevent>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="delete-title">
                <FaExclamationTriangle style={{ color: '#e53e3e', marginRight: '10px' }} />
                Confirm Deletion
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this transaction?</p>
              <p className="delete-warning">This action is permanent and cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={confirmDeleteTransaction} className="btn btn-danger">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default Dashboard;
