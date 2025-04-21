import React, { useState, useEffect } from 'react';
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
  FaArrowDown
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('This Year');
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: ''
  });

  // Sample data for charts
  const monthlyData = [
    { name: 'Jan', income: 600, expense: 400 },
    { name: 'Feb', income: 550, expense: 450 },
    { name: 'Mar', income: 600, expense: 380 },
    { name: 'Apr', income: 580, expense: 420 },
    { name: 'May', income: 620, expense: 450 },
    { name: 'Jun', income: 590, expense: 380 },
    { name: 'Jul', income: 600, expense: 400 },
    { name: 'Aug', income: 580, expense: 390 },
    { name: 'Sep', income: 620, expense: 410 },
    { name: 'Oct', income: 590, expense: 380 },
    { name: 'Nov', income: 610, expense: 400 },
    { name: 'Dec', income: 580, expense: 390 }
  ];

  const weeklySpending = [
    { day: 'Mon', amount: 45 },
    { day: 'Tue', amount: 65 },
    { day: 'Wed', amount: 35 },
    { day: 'Thu', amount: 50 },
    { day: 'Fri', amount: 80 },
    { day: 'Sat', amount: 120 },
    { day: 'Sun', amount: 90 }
  ];

  const expenseBreakdown = [
    { name: 'Food', value: 28, color: '#4299E1' },
    { name: 'Rent', value: 35, color: '#48BB78' },
    { name: 'Transport', value: 14, color: '#ECC94B' },
    { name: 'Entertainment', value: 10, color: '#F56565' },
    { name: 'Others', value: 13, color: '#9F7AEA' }
  ];

  useEffect(() => {
    const loadUserData = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setUserProfile({
            name: parsedData.name,
            email: parsedData.email,
            avatar: parsedData.name.split(' ').map(n => n[0]).join('').toUpperCase()
          });
        } catch (error) {
          console.error('Error parsing user data:', error);
          fetchUserData();
        }
      } else {
        fetchUserData();
      }
    };

    loadUserData();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.user) {
        const userData = response.data.user;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        setUserProfile({
          name: userData.name,
          email: userData.email,
          avatar: userData.name.split(' ').map(n => n[0]).join('').toUpperCase()
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        navigate('/login');
      }
    }
  };

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setShowDropdown(false);
    }, 300);
    setTimeoutId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/account-settings');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>FinMate</h2>
        <Link to="/dashboard" className={window.location.pathname === '/dashboard' ? 'active' : ''}>
          <FaTachometerAlt className="icon" /> Dashboard
        </Link>
        <Link to="/transactions" className={window.location.pathname === '/transactions' ? 'active' : ''}>
          <FaExchangeAlt className="icon" /> Transactions
        </Link>
        <Link to="/budget" className={window.location.pathname === '/budget' ? 'active' : ''}>
          <FaWallet className="icon" /> Budget
        </Link>
        <Link to="/analytics" className={window.location.pathname === '/analytics' ? 'active' : ''}>
          <FaChartBar className="icon" /> Analytics
        </Link>
        <Link to="/account-settings" className={window.location.pathname === '/account-settings' ? 'active' : ''}>
          <FaCog className="icon" /> Settings
        </Link>

        {/* Profile Section */}
        <div className="profile-section">
          <div
            className="profile-avatar"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {userProfile.avatar}
            {showDropdown && (
              <div
                className="profile-dropdown"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="dropdown-header">
                  <h3>My Account</h3>
                </div>
                <div className="dropdown-options">
                  <div className="dropdown-option" onClick={handleProfileClick}>
                    <FaUser className="option-icon" />
                    <span>Profile</span>
                  </div>
                  <div className="dropdown-option" onClick={handleSettingsClick}>
                    <FaCog className="option-icon" />
                    <span>Settings</span>
                  </div>
                  <div className="dropdown-option logout" onClick={handleLogout}>
                    <FaSignOutAlt className="option-icon" />
                    <span>Log Out</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="profile-info">
            <span className="profile-name">{userProfile.name}</span>
            <span className="profile-email">{userProfile.email}</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Content */}
      <main className="dashboard-content">
        <div className="analytics-header">
          <div>
            <h1>Analytics</h1>
          </div>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="This Year">This Year</option>
            <option value="Last Year">Last Year</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="Last 3 Months">Last 3 Months</option>
          </select>
        </div>

        {/* Overview Cards */}
        <div className="analytics-overview">
          <div className="overview-card">
            <h3>Total Income</h3>
            <p className="amount">
              <FaRupeeSign /> 21,000.00
            </p>
            <span className="trend positive">
              <FaArrowUp /> +15% from previous period
            </span>
          </div>
          <div className="overview-card">
            <h3>Total Expenses</h3>
            <p className="amount">
              <FaRupeeSign /> 15,450.00
            </p>
            <span className="trend negative">
              <FaArrowDown /> +8% from previous period
            </span>
          </div>
          <div className="overview-card">
            <h3>Net Savings</h3>
            <p className="amount">
              <FaRupeeSign /> 5,550.00
            </p>
            <span className="trend positive">
              <FaArrowUp /> +35% from previous period
            </span>
          </div>
        </div>

        {/* Charts Section */}
        <div className="analytics-charts">
          {/* Income vs Expenses Chart */}
          <div className="chart-container income-expenses">
            <h2>Income vs Expenses</h2>
            <p className="chart-subtitle">Monthly comparison for the current year</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#4C51BF" />
                <Bar dataKey="expense" fill="#F56565" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Spending Pattern */}
          <div className="chart-container weekly-spending">
            <h2>Weekly Spending Pattern</h2>
            <p className="chart-subtitle">Daily expenses for the current week</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#4299E1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown */}
          <div className="chart-container expense-breakdown">
            <h2>Expense Breakdown</h2>
            <p className="chart-subtitle">Category-wise spending</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics; 