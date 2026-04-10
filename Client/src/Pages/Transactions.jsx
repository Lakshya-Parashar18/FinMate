import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import {
  FaFilter,
  FaPlus,
  FaTimes,
  FaSearch,
  FaEllipsisH,
  FaEdit,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaRupeeSign,
  FaExclamationTriangle,
  FaSortAmountDown
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Transactions.css';

const Transactions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({ category: '', date: '', type: '' });
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    amount: '',
    type: 'expense',
  });
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.get(`${API_URL}/transactions`, {
        withCredentials: true,
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setApiError(err.response?.data?.message || 'Failed to fetch transactions.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchBudCategories(formData.date);
    }
  }, [showAddModal, showEditModal, formData.date, fetchBudCategories]);

  useEffect(() => {
    let filtered = [...transactions];
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filters.category) {
      filtered = filtered.filter(tx => tx.category === filters.category);
    }
    if (filters.date) {
      filtered = filtered.filter(tx => tx.date.startsWith(filters.date));
    }
    if (filters.type) {
        filtered = filtered.filter(tx => tx.type === filters.type);
    }

    // Sort Logic
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'date') {
        valA = new Date(a.date);
        valB = new Date(b.date);
        
        // Secondary sort by createdAt for same-day precision
        if (valA.getTime() === valB.getTime()) {
          const createdA = new Date(a.createdAt || a._id);
          const createdB = new Date(b.createdAt || b._id);
          if (createdA < createdB) return sortOrder === 'asc' ? -1 : 1;
          if (createdA > createdB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        }
      } else if (sortBy === 'amount') {
        valA = Math.abs(a.amount);
        valB = Math.abs(b.amount);
      } else if (sortBy === 'category') {
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(filtered);
  }, [searchQuery, filters, transactions, sortBy, sortOrder]);

  const openAddModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: '',
      amount: '',
      type: 'expense',
    });
    setCurrentTransaction(null);
    setShowAddModal(true);
    setShowEditModal(false);
  };

  const openEditModal = (transaction) => {
    setCurrentTransaction(transaction);
    setFormData({
      date: transaction.date.split('T')[0],
      description: transaction.description,
      category: transaction.category,
      amount: Math.abs(transaction.amount).toString(),
      type: transaction.type,
    });
    setShowAddModal(false);
    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setCurrentTransaction(null);
    setApiError('');
  };

  const openFilterModal = () => setShowFilterModal(true);
  const closeFilterModal = () => setShowFilterModal(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    closeFilterModal();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!formData.description || !formData.category || !formData.amount || !formData.type) {
      setApiError('Please fill in all required fields.');
      return;
    }

    try {
      const amountValue = formData.type === 'expense' 
                          ? -Math.abs(parseFloat(formData.amount))
                          : Math.abs(parseFloat(formData.amount)); 
                          
      const payload = {
          date: formData.date,
          description: formData.description,
          category: formData.category,
          amount: amountValue,
          type: formData.type,
      };

      await axios.post(`${API_URL}/transactions`, payload, { withCredentials: true });
      closeModal();
      fetchTransactions();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setApiError(err.response?.data?.message || 'Failed to add transaction.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentTransaction) return;
    setApiError('');
    if (!formData.description || !formData.category || !formData.amount || !formData.type) {
      setApiError('Please fill in all required fields.');
      return;
    }

    try {
       const amountValue = formData.type === 'expense' 
                          ? -Math.abs(parseFloat(formData.amount))
                          : Math.abs(parseFloat(formData.amount)); 
                          
       const payload = {
          date: formData.date,
          description: formData.description,
          category: formData.category,
          amount: amountValue,
          type: formData.type,
      };
      
      await axios.put(`${API_URL}/transactions/${currentTransaction._id}`, payload, { withCredentials: true });
      closeModal();
      fetchTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setApiError(err.response?.data?.message || 'Failed to update transaction.');
    }
  };

  const handleDelete = (transactionId) => {
    setTransactionToDelete(transactionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setApiError('');
    try {
      await axios.delete(`${API_URL}/transactions/${transactionToDelete}`, { withCredentials: true });
      setShowDeleteModal(false);
      setTransactionToDelete(null);
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setApiError(err.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <>
      <div className="transactions-header">
        <div className="header-banner">
          <h2>Transactions</h2>
          <button className="header-add-btn" onClick={openAddModal}>
            <FaPlus /> Add Transaction
          </button>
        </div>
      </div>

      <div className="transactions-content">
        <div className="transactions-controls">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="action-buttons">
            <div className="sort-container">
              <FaSortAmountDown className="sort-icon" />
              <select 
                className="sort-select"
                value={`${sortBy}-${sortOrder}`} 
                onChange={(e) => {
                  const [type, order] = e.target.value.split('-');
                  setSortBy(type);
                  setSortOrder(order);
                }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="category-asc">Category (A-Z)</option>
              </select>
            </div>
            <button className="filter-btn" onClick={openFilterModal}>
              <FaFilter /> Filter
            </button>
          </div>
        </div>

        {loading && <p>Loading transactions...</p>}
        {!loading && apiError && !transactions.length && <p className="error-message">{apiError}</p>} 
        {!loading && !apiError && !transactions.length && <p>No transactions found.</p>}

        {!loading && transactions.length > 0 && (
          <div className="transactions-table-container">
            <table className="transactions-table">
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
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id}> 
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <span className={`amount ${transaction.type === 'income' ? 'positive' : 'negative'}`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        <FaRupeeSign size=".8em"/>
                        {Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button className="action-btn edit" onClick={() => openEditModal(transaction)} title="Edit">
                        <FaEdit />
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(transaction._id)} title="Delete">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Filter Transactions</h3>
              <button onClick={closeFilterModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={handleFilterSubmit} className="modal-form">
                {apiError && <p className="error-message">{apiError}</p>} 
              <div className="form-group">
                <label>Category</label>
                <input type="text" name="category" value={filters.category} onChange={handleFilterChange} placeholder="e.g., Food" />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                  <label>Type</label>
                  <select name="type" value={filters.type} onChange={handleFilterChange}>
                      <option value="">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                  </select>
              </div>
              <div className="form-actions">
                 <button type="button" className="btn btn-secondary" onClick={closeFilterModal}>Cancel</button>
                 <button type="submit" className="btn btn-primary">Apply Filters</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{showEditModal ? 'Edit Transaction' : 'Add New Transaction'}</h3>
              <button onClick={closeModal} className="close-btn"><FaTimes /></button>
            </div>
            <form onSubmit={showEditModal ? handleEditSubmit : handleAddSubmit} className="modal-form">
              {apiError && <p className="error-message">{apiError}</p>} 
              <div className="form-group">
                <label>Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g., Coffee" required />
              </div>
              <div className="form-group">
                  <label>Type *</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} required>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                  </select>
              </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input 
                    type="text" 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Food, Salary" 
                    required 
                  />
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
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="e.g., 5.00" step="0.01" min="0" required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{showEditModal ? 'Save Changes' : 'Add Transaction'}</button>
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
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={confirmDelete} className="btn btn-danger">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Transactions;