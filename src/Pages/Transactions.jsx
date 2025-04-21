import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import {
  FaFilter,
  FaPlus,
  FaTimes,
  FaSearch,
  FaEllipsisH,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaWallet,
  FaExchangeAlt,
  FaTachometerAlt,
  FaArrowUp,
  FaArrowDown,
  FaRupeeSign
} from 'react-icons/fa';
import './Transactions.css';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    date: '',
    type: ''
  });
  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    category: '',
    amount: '',
    type: 'expense'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchTransactions();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data && response.data.transactions) {
        setTransactions(response.data.transactions);
        setFilteredTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = transactions.filter(tx => 
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [searchQuery, transactions]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const formatAmount = (amount) => {
    return Math.abs(amount).toFixed(2);
  };

  // Mock data for testing
  const mockTransactions = [
    { date: '2023-04-15', description: 'Grocery Shopping', category: 'Food', amount: -85.50 },
    { date: '2023-04-14', description: 'Monthly Salary', category: 'Salary', amount: 1500.00 },
    { date: '2023-04-13', description: 'Coffee Shop', category: 'Food', amount: -4.50 },
    { date: '2023-04-12', description: 'Uber Ride', category: 'Transport', amount: -12.75 },
    { date: '2023-04-10', description: 'Movie Tickets', category: 'Entertainment', amount: -24.00 }
  ];

  const handleBreakdownClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowBreakdown(true);
  };

  const closeBreakdown = () => {
    setShowBreakdown(false);
    setSelectedTransaction(null);
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

      {/* Main Content */}
      <main className="dashboard-content">
        <div className="dashboard-header">Transactions</div>
        
        <div className="transactions-section">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="action-buttons">
              <button className="filter-btn" onClick={() => setShowFilterModal(true)}>
                <FaFilter /> Filter
              </button>
              <button className="add-btn" onClick={() => setShowAddModal(true)}>
                + Add Transaction
              </button>
            </div>
          </div>

          <div className="section-header">
            <h2>All Transactions</h2>
            <p>View and manage all your transactions</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading">Loading transactions...</div>
          ) : (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <div className={`amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount > 0 ? (
                          <FaArrowUp style={{ color: 'green', marginRight: '8px' }} />
                        ) : (
                          <FaArrowDown style={{ color: 'red', marginRight: '8px' }} />
                        )}
                        <FaRupeeSign style={{ marginRight: '4px', fontSize: '0.9em' }} />
                        {formatAmount(transaction.amount)}
                      </div>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => handleBreakdownClick(transaction)}>
                        <FaEllipsisH />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
              <button onClick={() => setShowFilterModal(false)} className="close-btn">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowFilterModal(false); }}>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowFilterModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Filters
                </button>
              </div>
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
              <button onClick={() => setShowAddModal(false)} className="close-btn">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  placeholder="Enter description"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions; 