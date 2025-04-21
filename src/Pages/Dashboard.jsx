import React, { useState, useEffect } from 'react';
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
  FaEllipsisH
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './dashboard.css';
import axios from 'axios';
import { API_URL } from '../config';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState('INR');
  const [totalBalance] = useState(50000);
  const [budgetLeft] = useState(12500);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const conversionRate = 0.012;
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    category: '',
    amount: ''
  });
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

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
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        navigate('/login');
      }
    }
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'INR' ? 'USD' : 'INR');
  };

  const convertCurrency = (amount, targetCurrency) => {
    return targetCurrency === 'INR'
      ? amount / conversionRate
      : amount * conversionRate;
  };

  const barData = [
    { name: 'January', Income: 40000, Expenses: 15000 },
    { name: 'February', Income: 42000, Expenses: 16000 },
    { name: 'March', Income: 45000, Expenses: 18000 },
  ];

  const pieData = [
    { name: 'Rent', value: 4000 },
    { name: 'Food', value: 3000 },
    { name: 'Entertainment', value: 1500 },
    { name: 'Utilities', value: 2000 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const recentTransactions = [
    { date: '2025-04-15', description: 'Grocery shopping', category: 'Food', amount: -1200 },
    { date: '2025-04-14', description: 'Salary', category: 'Income', amount: 40000 },
    { date: '2025-04-13', description: 'Movie Night', category: 'Entertainment', amount: -500 },
    { date: '2025-04-12', description: 'Electricity Bill', category: 'Utilities', amount: -2200 },
  ];

  const filteredTransactions = recentTransactions.filter(tx => {
    return (
      (filterCategory ? tx.category === filterCategory : true) &&
      (filterDate ? tx.date === filterDate : true)
    );
  });

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
    setShowAddModal(true);
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewTransaction({
      date: '',
      description: '',
      category: '',
      amount: ''
    });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Add your filter logic here
    closeFilterModal();
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    // Add your add transaction logic here
    const updatedTransactions = [
      {
        date: newTransaction.date,
        description: newTransaction.description,
        category: newTransaction.category,
        amount: parseFloat(newTransaction.amount)
      },
      ...recentTransactions
    ];
    // Update your transactions state here
    closeAddModal();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({
      ...prev,
      [name]: value
    }));
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
    }, 300); // 300ms delay
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

      {/* Main Dashboard Content */}
      <main className="dashboard-content">
        <div className="dashboard-header">Dashboard</div>

        {/* Cards Section (4 Cards) */}
        <div className="dashboard-grid">
          {/* Total Balance Card */}
          <div className="dashboard-card-section">
            <h2>
              Total Balance{' '}
              {currency === 'INR'
                ? <FaRupeeSign onClick={toggleCurrency} className="currency-icon" />
                : <FaDollarSign onClick={toggleCurrency} className="currency-icon" />}
            </h2>
            <p>
              {currency === 'INR'
                ? `₹ ${totalBalance.toFixed(2)}`
                : `$ ${convertCurrency(totalBalance, currency).toFixed(2)}`}
            </p>
            <span>+20.1% from last month</span>
          </div>

          {/* Income Card */}
          <div className="dashboard-card-section">
            <h2>Income</h2>
            <p>₹ 40,000.00</p>
            <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaArrowUp /> +5.6% from last month
            </span>
          </div>

          {/* Expenses Card */}
          <div className="dashboard-card-section">
            <h2>Expenses</h2>
            <p>₹ 15,000.00</p>
            <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaArrowDown /> -10.2% from last month
            </span>
          </div>

          {/* Budget Left Card */}
          <div className="dashboard-card-section">
            <h2>
              Budget Left{' '}
              {currency === 'INR'
                ? <FaRupeeSign onClick={toggleCurrency} className="currency-icon" />
                : <FaDollarSign onClick={toggleCurrency} className="currency-icon" />}
            </h2>
            <p>
              {currency === 'INR'
                ? `₹ ${budgetLeft.toFixed(2)}`
                : `$ ${convertCurrency(budgetLeft, currency).toFixed(2)}`}
            </p>
            <span>+15.3% from last month</span>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section" style={{ display: 'flex', marginTop: '30px', gap: '20px' }}>
          {/* Income vs Expenses Chart */}
          <div className="chart-left" style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <h2 style={{ textAlign: 'left', marginBottom: '4px' }}>Income vs Expenses</h2>
            <p style={{ textAlign: 'left', fontSize: '14px', color: '#777', marginBottom: '16px' }}>Monthly comparison for the current year</p>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Income" fill="#4c51bf" barSize={40} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f56565" barSize={40} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown Pie Chart */}
          <div className="chart-right" style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <h2 style={{ textAlign: 'left', marginBottom: '4px' }}>Expense Breakdown</h2>
            <p style={{ textAlign: 'left', fontSize: '14px', color: '#777', marginBottom: '16px' }}>Category-wise spending</p>
            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="transactions-section" style={{
          marginTop: '30px',
          background: '#fff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div>
              <h2 style={{ marginBottom: '4px' }}>Recent Transactions</h2>
              <p style={{ fontSize: '14px', color: '#777', textAlign: 'left'}}>Your Recent Financial Activities</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="filter-btn" onClick={handleFilterClick}>
                <FaFilter /> Filter
              </button>
              <button className="add-btn" onClick={handleAddClick}>
                <FaPlus /> Add
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <table className="transactions-table">
            <thead>
              <tr>
                <th className="table-column">
                  <div className="column-container">
                    <span style={{ fontWeight: 'bold' }}>Date</span>
                  </div>
                </th>
                <th className="table-column">
                  <div className="column-container">
                    <span style={{ fontWeight: 'bold' }}>Description</span>
                  </div>
                </th>
                <th className="table-column">
                  <div className="column-container">
                    <span style={{ fontWeight: 'bold' }}>Category</span>
                  </div>
                </th>
                <th className="table-column">
                  <div className="column-container">
                    <span style={{ fontWeight: 'bold' }}>Amount</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => (
                <tr key={index}>
                  <td className="table-column">
                    <div className="column-container">
                      <span>{transaction.date}</span>
                    </div>
                  </td>
                  <td className="table-column">
                    <div className="column-container">
                      <span>{transaction.description}</span>
                    </div>
                  </td>
                  <td className="table-column">
                    <div className="column-container">
                      <span>{transaction.category}</span>
                    </div>
                  </td>
                  <td className="table-column">
                    <div className="column-container">
                      <span style={{
                        color: transaction.amount > 0 ? 'green' : 'red',
                        fontWeight: 'normal',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {transaction.amount > 0 ? (
                          <>
                            <FaArrowUp style={{ color: 'green', marginRight: '8px' }} />
                            <FaRupeeSign style={{ marginRight: '4px', fontSize: '0.9em' }} />
                            {Math.abs(transaction.amount).toLocaleString()}
                            <span 
                              className="breakdown-dots"
                              onClick={() => handleBreakdownClick(transaction)}
                            >
                              ...
                            </span>
                          </>
                        ) : (
                          <>
                            <FaArrowDown style={{ color: 'red', marginRight: '8px' }} />
                            <FaRupeeSign style={{ marginRight: '4px', fontSize: '0.9em' }} />
                            {Math.abs(transaction.amount).toLocaleString()}
                            <span 
                              className="breakdown-dots"
                              onClick={() => handleBreakdownClick(transaction)}
                            >
                              ...
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Breakdown Popup */}
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Filter Transactions</h3>
              <button onClick={closeFilterModal} className="close-btn">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleFilterSubmit} className="modal-form">
              <div className="form-group">
                <label>Category</label>
                <select 
                  name="category" 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Income">Income</option>
                  <option value="Food">Food</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                </select>
              </div>
              <button type="submit" className="submit-btn">Apply Filter</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button onClick={closeAddModal} className="close-btn">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={newTransaction.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={newTransaction.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={newTransaction.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Income">Income</option>
                  <option value="Food">Food</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">Add Transaction</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
