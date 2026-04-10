import React, { useState, useEffect, useCallback } from 'react';
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
  FaCalendarAlt
} from 'react-icons/fa';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';
import dayjs from 'dayjs'; // For date formatting and manipulation
import utc from 'dayjs/plugin/utc';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext'; // Use auth context
import './Analytics.css';

dayjs.extend(utc);

const Analytics = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State for fetched data
  const [analyticsData, setAnalyticsData] = useState({
    startDate: '',
    endDate: '',
    spendingByCategory: [],
    spendingOverTime: [],
    incomeVsExpense: { income: 0, expenses: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // State for date range selection
  // Initialize with default range (e.g., last 30 days)
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startDate, setStartDate] = useState(dayjs().subtract(29, 'day').format('YYYY-MM-DD'));

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

  // Initial fetch and refetch when dates change
  useEffect(() => {
    if (user) {
      fetchAnalyticsData(startDate, endDate);
    }
  }, [user, startDate, endDate, fetchAnalyticsData]);

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
  
  // --- Chart Config --- 
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9F7AEA', '#F6E05E', '#ED8936'];

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          {payload.map((entry, index) => (
              <p key={`item-${index}`} style={{ color: entry.color }}>
                 {`${entry.name} : ₹${entry.value.toLocaleString()}`}
              </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Main Analytics Content */}
      <div className="analytics-header">
        <div className="header-banner">
          <h2>Analytics</h2>
          <div className="date-range-selector">
            <div className="date-input-group">
              <label htmlFor="startDate">Start Date</label>
              <input 
                type="date" 
                id="startDate"
                name="startDate"
                value={startDate}
                onChange={handleDateChange} 
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="endDate">End Date</label>
              <input 
                type="date" 
                id="endDate"
                name="endDate"
                value={endDate}
                onChange={handleDateChange} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-content">

        {loading && <p className="loading-message">Loading analytics data...</p>}
        {apiError && <p className="error-message">Error: {apiError}</p>}

        {!loading && !apiError && (
          <>
            {/* Overview Cards */}
            <div className="analytics-overview">
              <div className="overview-card">
                <h3>Total Income</h3>
                <p className="amount positive">
                  <FaArrowUp /> <FaRupeeSign /> {analyticsData.incomeVsExpense.income.toLocaleString()}
                </p>
                {/* Trend calculation requires previous period data - omit for now */}
                {/* <span className="trend positive"> ... </span> */}
              </div>
              <div className="overview-card">
                <h3>Total Expenses</h3>
                <p className="amount negative">
                  <FaArrowDown /> <FaRupeeSign /> {analyticsData.incomeVsExpense.expenses.toLocaleString()}
                </p>
                 {/* <span className="trend negative"> ... </span> */}
              </div>
              <div className="overview-card">
                <h3>Net Savings</h3>
                <p className={`amount ${analyticsData.incomeVsExpense.income - analyticsData.incomeVsExpense.expenses >= 0 ? 'positive' : 'negative'}`}>
                   <FaRupeeSign /> {(analyticsData.incomeVsExpense.income - analyticsData.incomeVsExpense.expenses).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
              {/* Spending Over Time Chart */} 
              <div className="analytics-card chart-card">
                <h3>Spending Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.spendingOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(dateStr) => dayjs(dateStr).format('MMM D')} fontSize={12} />
                    <YAxis tickFormatter={(value) => `₹${value/1000}k`} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Line type="monotone" dataKey="value" name="Expenses" stroke="#f56565" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Spending by Category Chart */} 
              <div className="analytics-card chart-card">
                <h3>Spending by Category</h3>
                 {analyticsData.spendingByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                        <Pie
                            data={analyticsData.spendingByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            fontSize={12}
                        >
                            {analyticsData.spendingByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`₹${value.toLocaleString()}`, name]} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '14px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                 ) : (
                     <p className="no-data-message">No spending data available for this period.</p>
                 )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Analytics; 