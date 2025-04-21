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
  FaPlus,
  FaPencilAlt,
  FaRupeeSign
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';
import './Budget.css';

const Budget = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: ''
  });

  useEffect(() => {
    const loadUserData = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
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
        console.log('No token found, redirecting to login');
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

  const budgetData = {
    total: 2000.00,
    spent: 1450.00,
    remaining: 550.00,
    percentageUsed: 73,
    categories: [
      { name: 'Food', spent: 350.00, total: 500.00, color: '#4299E1' },
      { name: 'Rent', spent: 800.00, total: 800.00, color: '#48BB78' },
      { name: 'Transport', spent: 150.00, total: 200.00, color: '#ECC94B' },
      { name: 'Entertainment', spent: 100.00, total: 200.00, color: '#F56565' },
      { name: 'Others', spent: 50.00, total: 300.00, color: '#9F7AEA' }
    ]
  };

  const pieData = budgetData.categories.map(category => ({
    name: category.name,
    value: (category.total / budgetData.total) * 100,
    color: category.color
  }));

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

      {/* Main Budget Content */}
      <main className="dashboard-content">
        <div className="budget-header">
          <div>
            <h1>Budget</h1>
            <h2>Monthly Budget</h2>
          </div>
          <button className="set-budget-btn">
            <FaPlus /> Set Budget
          </button>
        </div>

        <div className="budget-grid">
          {/* Overall Budget Card */}
          <div className="budget-card">
            <h2>Overall Budget</h2>
            <p className="budget-amount">
              <FaRupeeSign />{budgetData.spent.toFixed(2)} spent of <FaRupeeSign />{budgetData.total.toFixed(2)}
            </p>
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${budgetData.percentageUsed}%` }}
              ></div>
            </div>
            <p className="budget-stats">
              <span>{budgetData.percentageUsed}% used</span>
              <span><FaRupeeSign />{budgetData.remaining.toFixed(2)} remaining</span>
            </p>
          </div>

          {/* Budget Allocation Card */}
          <div className="budget-card">
            <h2>Budget Allocation</h2>
            <p className="subtitle">How your budget is distributed</p>
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((entry, index) => (
                  <div key={index} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: entry.color }}></span>
                    <span className="legend-label">{entry.name} {entry.value.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Budgets */}
        <div className="category-budgets">
          <h2>Category Budgets</h2>
          <p className="subtitle">Track spending by category</p>
          
          <div className="categories-list">
            {budgetData.categories.map((category, index) => (
              <div key={index} className="category-item">
                <div className="category-header">
                  <div className="category-info">
                    <span className="category-color" style={{ backgroundColor: category.color }}></span>
                    <span className="category-name">{category.name}</span>
                  </div>
                  <div className="category-amount">
                    <FaRupeeSign />{category.spent.toFixed(2)} / <FaRupeeSign />{category.total.toFixed(2)}
                    <button className="edit-category-btn">
                      <FaPencilAlt />
                    </button>
                  </div>
                </div>
                <div className="category-progress-container">
                  <div 
                    className="category-progress-bar"
                    style={{ 
                      width: `${(category.spent / category.total) * 100}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="add-category-btn">
            <FaPlus /> Add New Category
          </button>
        </div>
      </main>
    </div>
  );
};

export default Budget; 