import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FaExclamationTriangle
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './dashboard.css';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useDisplaySettings } from '../context/DisplaySettingsContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { displaySettings, updateDisplaySettings } = useDisplaySettings();

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
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', message: 'Hello! I am your FinMate AI. How can I help you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [currency, setCurrency] = useState(displaySettings.currency || 'INR');
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
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    amount: '',
    type: 'expense'
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef(null);

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
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isChatOpen]);

  const handleChat = async (e, suggestedMessage = null) => {
    if (e) e.preventDefault();
    const msg = suggestedMessage || chatInput;
    if (!msg.trim()) return;

    // Add user message to history
    const userMsg = { role: 'user', message: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/insights/chat`, { message: msg }, { withCredentials: true });
      setChatHistory(prev => [...prev, { role: 'assistant', message: response.data.response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', message: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    setCurrency(displaySettings.currency || 'INR');
  }, [displaySettings.currency]);

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
    setCurrency(newCurrency);
    updateDisplaySettings({ currency: newCurrency });
  };

  const userAvatar = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  const conversionRate = 0.012;
  const convertCurrency = (amount, targetCurrency) => {
    return targetCurrency === 'INR'
      ? amount / conversionRate
      : amount * conversionRate;
  };

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
        <p>Loading Dashboard...</p>
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
        <h2>Dashboard</h2>
      </div>

        {loading && <p>Updating data...</p>}

        {/* Threshold Alerts */}
        {dashboardData.budgetLimit > 0 && (dashboardData.expenses / dashboardData.budgetLimit) >= 0.5 && (
          <div className={`urgency-alert ${(dashboardData.expenses / dashboardData.budgetLimit) >= 0.7 ? 'critical' : 'warning'}`}>
             <FaMagic /> 
             <span>
               { (dashboardData.expenses / dashboardData.budgetLimit) >= 0.7 
                 ? `CRITICAL ALERT: You have exhausted ${((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of your budget!` 
                 : `Warning: You have utilized ${((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of your monthly limit.`
               }
             </span>
             <Link to="/budget" className="alert-action-btn">Adjust Budget</Link>
          </div>
        )}
        
        <div className="insights-section">
          <div className="insights-header">
            <h3><FaMagic className="ai-sparkle" /> FinMate AI Assistant <span className="ai-badge">ALPHA</span></h3>
          </div>
          <div className={`insights-grid ${insights.length === 1 ? 'single-insight' : ''}`}>
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div key={idx} className={`insight-card ${insight.type} priority-${insight.priority || 1}`}>
                  <div className="insight-icon-container">
                    {insight.icon}
                  </div>
                  <div className="insight-content">
                    <h4>{insight.type.charAt(0).toUpperCase() + insight.type.slice(1)} Insight</h4>
                    <p>{insight.message}</p>
                  </div>
                </div>
              ))
            ) : (
                <div className="insight-card info loading-shimmer">
                  <div className="insight-icon-container">🧠</div>
                  <div className="insight-content">
                    <h4>Neural Core Activating...</h4>
                    <p>FinMate AI is analyzing your transactions to find your next money moves.</p>
                  </div>
                </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card-section">
            <h2>
              Total Balance {' '}
              {currency === 'INR'
                ? <FaRupeeSign onClick={toggleCurrency} className="currency-icon" />
                : <FaDollarSign onClick={toggleCurrency} className="currency-icon" />}
            </h2>
            <p>
              {currency === 'INR'
                ? `₹ ${dashboardData.totalBalance.toLocaleString()}`
                : `$ ${convertCurrency(dashboardData.totalBalance, 'USD').toLocaleString()}`}
            </p>
          </div>

          <div className="dashboard-card-section">
            <h2>Income (This Month)</h2>
            <p>₹ {dashboardData.income.toLocaleString()}</p>
          </div>

          <div className="dashboard-card-section">
            <h2>Expenses (This Month)</h2>
            <p>₹ {dashboardData.expenses.toLocaleString()}</p>
          </div>

          <div className="dashboard-card-section">
            <h2>
              Budget Left {' '}
              {currency === 'INR'
                ? <FaRupeeSign className="currency-icon static" />
                : <FaDollarSign className="currency-icon static" />}
            </h2>
            <p style={{ color: dashboardData.budgetLeft < 0 ? 'var(--error-color)' : 'inherit' }}>
              ₹ {dashboardData.budgetLeft.toLocaleString()}
              {dashboardData.budgetLimit > 0 ? (
                  <small style={{ display: 'block', fontSize: '0.8em', marginTop: '4px'}}>
                      ({((dashboardData.expenses / dashboardData.budgetLimit) * 100).toFixed(0)}% of ₹{dashboardData.budgetLimit.toLocaleString()} used)
                  </small>
              ) : (
                <Link to="/budget" className="set-budget-link">Set a budget</Link>
              )}
            </p>
          </div>
        </div>

        <div className="charts-section" style={{ display: 'flex', marginTop: '30px', gap: '20px' }}>
          <div className="chart-container">
            <h2>Income vs Expenses</h2>
            <p className="chart-subtitle">Monthly comparison</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.monthlyComparison} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12}/>
                <YAxis fontSize={12} tickFormatter={(value) => `₹${value/1000}k`}/>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '14px' }}/>
                <Bar dataKey="Income" fill="#4c51bf" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f56565" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container" style={{ flex: 1 }}>
            <h2>Expense Breakdown</h2>
            <p className="chart-subtitle">Spending by category</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  fontSize={12}
                >
                  {dashboardData.expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
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
                        ₹{Math.abs(transaction.amount).toLocaleString()}
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
              <p><strong>Base Amount:</strong> ₹{Math.abs(selectedTransaction.amount).toLocaleString()}</p>
              <p><strong>Tax:</strong> ₹{(Math.abs(selectedTransaction.amount) * 0.18).toLocaleString()}</p>
              <p><strong>Total Amount:</strong> ₹{(Math.abs(selectedTransaction.amount) * 1.18).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Filter Transactions</h3>
              <button onClick={closeFilterModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleFilterSubmit} className="modal-form">
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={filterCategory} onChange={handleFilterChange}>
                  <option value="">All Categories</option>
                  <option value="Income">Income</option>
                  <option value="Food">Food</option>
                  <option value="Rent">Rent</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={filterDate} onChange={handleFilterChange} />
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button onClick={closeAddModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              {formError && <p className="error-message">{formError}</p>}
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} required>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g., Coffee, Salary" required />
              </div>
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="e.g., Food, Income" required />
                  <div className="category-suggestions" style={{ marginTop: '8px' }}>
                    {formData.type === 'expense' ? (
                      [...new Set([...budgetCategories, 'Miscellaneous'])].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      ['Income', 'Salary', 'Investment', 'Other Income'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                        >
                          {cat}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Amount</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Enter positive amount" required min="0.01" step="0.01"/>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Transaction</h3>
              <button onClick={closeEditModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              {formError && <p className="error-message">{formError}</p>}
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} required>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g., Coffee, Salary" required />
              </div>
              <div className="form-group form-row">
                <div style={{ flex: 1 }}>
                  <label>Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="e.g., Food, Income" required />
                  <div className="category-suggestions" style={{ marginTop: '8px' }}>
                    {[...new Set([...budgetCategories, 'Miscellaneous', 'Income', 'Salary', 'Investment'])].map(cat => (
                       <button
                         key={cat}
                         type="button"
                         className={`suggestion-btn ${formData.category === cat ? 'active' : ''}`}
                         onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                       >
                         {cat}
                       </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Amount</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Enter positive amount" required min="0.01" step="0.01"/>
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
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
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

      {/* Modern Floating AI Chat */}
      <button className="chat-launcher" onClick={() => setIsChatOpen(!isChatOpen)}>
        <FaMagic /> AI help
      </button>

      {isChatOpen && (
        <div className="floating-chat-window">
          <div className="chat-window-header">
            <h3><FaMagic /> FinMate AI</h3>
            <button onClick={() => setIsChatOpen(false)} className="close-chat-btn"><FaTimes /></button>
          </div>
          <div className="ai-chat-container">
            <div className="chat-history">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={`chat-bubble ${chat.role}`}>
                  <p>{chat.message}</p>
                </div>
              ))}
              {isTyping && <div className="chat-bubble assistant typing">Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-suggestions">
                <button onClick={() => handleChat(null, "Where did I overspend?")} className="suggestion-pill">Where did I overspend?</button>
                <button onClick={() => handleChat(null, "How much budget is left?")} className="suggestion-pill">How much is left?</button>
                <button onClick={() => handleChat(null, "Reduce Swiggy spending")} className="suggestion-pill">Saving tips</button>
            </div>
            <form onSubmit={handleChat} className="chat-input-row">
              <input 
                type="text" 
                placeholder="Ask your Finance GPT..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="chat-send-btn">Send</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
