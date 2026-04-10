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
  FaPlus,
  FaPencilAlt,
  FaRupeeSign,
  FaTimes,
  FaCalendar,
  FaTrash,
  FaExclamationTriangle,
  FaRocket,
  FaMagic
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';
import groceryIcon from '../assets/grocery.png';
import foodIcon from '../assets/food.png';
import entertainmentIcon from '../assets/entertainment.png';
import healthcareIcon from '../assets/healthcare.png';
import housingIcon from '../assets/housing.png';
import investmentIcon from '../assets/investment.png';
import shoppingIcon from '../assets/shopping.png';
import transportationIcon from '../assets/transportation.png';
import utilitiesIcon from '../assets/utilities.png';
import educationIcon from '../assets/education.png';
import miscIcon from '../assets/miscellaneous.png';
import vacationIcon from '../assets/vacation.png';
import { useAuth } from '../context/AuthContext';
import './Budget.css';

const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase().trim();
  
  const iconStyle = { width: '28px', height: '28px', objectFit: 'contain' };
  
  if (cat.includes('food') || cat.includes('eat') || cat.includes('din')) 
    return <img src={foodIcon} alt="🍕" style={iconStyle} />;
  
  if (cat.includes('groc')) 
    return <img src={groceryIcon} alt="🛒" style={iconStyle} />;
  
  if (cat.includes('rent') || cat.includes('hous') || cat.includes('home')) 
    return <img src={housingIcon} alt="🏠" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />;
  
  if (cat.includes('health') || cat.includes('med') || cat.includes('doc')) 
    return <img src={healthcareIcon} alt="🏥" style={iconStyle} />;
    
  if (cat.includes('travel') || cat.includes('bus') || cat.includes('car') || cat.includes('trans')) 
    return <img src={transportationIcon} alt="🚗" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />;
  
  if (cat.includes('entert') || cat.includes('movi') || cat.includes('show') || cat.includes('fun')) 
    return <img src={entertainmentIcon} alt="🎬" style={iconStyle} />;
  
  if (cat.includes('bill') || cat.includes('elect') || cat.includes('util')) 
    return <img src={utilitiesIcon} alt="⚡" style={iconStyle} />;
  
  if (cat.includes('edu') || cat.includes('school') || cat.includes('fees')) 
    return <img src={educationIcon} alt="🎓" style={iconStyle} />;
  
  if (cat.includes('shop') || cat.includes('clothe') || cat.includes('fashion')) 
    return <img src={shoppingIcon} alt="🛍️" style={iconStyle} />;
  
  if (cat.includes('invest') || cat.includes('save') || cat.includes('stock')) 
    return <img src={investmentIcon} alt="📈" style={iconStyle} />;
  
  if (cat.includes('vacat') || cat.includes('trip') || cat.includes('tour') || cat.includes('holid')) 
    return <img src={vacationIcon} alt="🏖️" style={iconStyle} />;

  if (cat.includes('misc') || cat.includes('other')) 
    return <img src={miscIcon} alt="📦" style={iconStyle} />;
  
  return <span>💸</span>; 
};

const getColorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 50%)`;
  return color;
};

const Budget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [showSetBudgetModal, setShowSetBudgetModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [budgetFormData, setBudgetFormData] = useState({
    total: '',
    categories: {}
  });
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    total: '',
    color: '#4299E1'
  });
  const [showBudgetExceededModal, setShowBudgetExceededModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [exceededAmount, setExceededAmount] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.name,
        email: user.email,
        avatar: (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase()
      });
    }
  }, [user]);

  const fetchBudgetData = useCallback(async () => {
    setLoading(true);
    setApiError('');
    const [year, monthNum] = selectedMonth.split('-');
    const monthIndex = parseInt(monthNum) - 1;

    try {
      const response = await axios.get(`${API_URL}/budgets`, {
        params: { year: parseInt(year), month: monthIndex },
        withCredentials: true,
      });
      const fetchedData = response.data;
      if (fetchedData && fetchedData.categories) {
        setBudgetData({
          ...fetchedData,
          categories: fetchedData.categories.map(cat => ({
            ...cat,
            color: getColorForCategory(cat.name)
          }))
        });
      } else {
        setBudgetData({
          year: parseInt(year),
          month: monthIndex,
          totalLimit: null,
          categories: [],
          totalSpent: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching budget data:', err);
      setApiError(err.response?.data?.message || 'Failed to fetch budget data.');
      setBudgetData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  useEffect(() => {
    if (budgetData && budgetData.totalLimit !== null && budgetData.totalSpent > budgetData.totalLimit) {
      setExceededAmount(budgetData.totalSpent - budgetData.totalLimit);
      setShowBudgetExceededModal(true);
    } else {
      setShowBudgetExceededModal(false);
    }
  }, [budgetData]);

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
    navigate('/settings');
  };

  const openSetBudgetModal = () => {
    const currentCats = budgetData?.categories?.reduce((acc, cat) => {
      acc[cat.name] = cat.limit.toString();
      return acc;
    }, {}) || {};
    setBudgetFormData({
      total: budgetData?.totalLimit?.toString() || '',
      categories: currentCats
    });
    setShowSetBudgetModal(true);
  };

  const handleBudgetInputChange = (e, categoryName = null) => {
    const { name, value } = e.target;
    if (categoryName) {
      setBudgetFormData(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [categoryName]: value
        }
      }));
    } else {
      setBudgetFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSetBudgetSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const [year, monthNum] = selectedMonth.split('-');
    const monthIndex = parseInt(monthNum) - 1;

    const categoriesPayload = Object.entries(budgetFormData.categories)
      .map(([name, limitStr]) => ({ name, limit: parseFloat(limitStr) || 0 }));
    
    const totalLimitValue = budgetFormData.total ? parseFloat(budgetFormData.total) : null;

    if (totalLimitValue !== null && isNaN(totalLimitValue)) {
      setApiError('Total budget must be a number.');
      return;
    }
    if (categoriesPayload.some(cat => isNaN(cat.limit))) {
      setApiError('All category limits must be numbers.');
      return;
    }
    
    const payload = {
      year: parseInt(year),
      month: monthIndex,
      totalLimit: totalLimitValue,
      categories: categoriesPayload.filter(c => c.name.toLowerCase() !== 'miscellaneous'),
    };

    try {
      setSubmitting(true);
      console.log('Sending budget payload:', payload);
      const response = await axios.post(`${API_URL}/budgets`, payload, { withCredentials: true });
      console.log('Budget save response:', response.data);
      closeModal();
      fetchBudgetData();
    } catch (err) {
      console.error('Error setting budget:', err);
      setApiError(err.response?.data?.message || 'Failed to set budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddCategoryModal = () => {
    setNewCategoryData({ name: '', total: '' });
    setShowAddCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    setSelectedCategory(category);
    setNewCategoryData({ name: category.name, total: category.limit.toString() });
    setShowEditCategoryModal(true);
  };

  const closeModal = () => {
    setShowSetBudgetModal(false);
    setShowAddCategoryModal(false);
    setShowEditCategoryModal(false);
    setShowBudgetExceededModal(false);
    setShowDeleteModal(false);
    setItemToDelete(null);
    setSelectedCategory(null);
    setApiError('');
  };

  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    const limit = parseFloat(newCategoryData.total);
    if (!newCategoryData.name || isNaN(limit)) {
      alert('Please enter a valid category name and limit.');
      return;
    }
    const currentCategories = budgetData?.categories || [];
    if (currentCategories.some(cat => cat.name.toLowerCase() === newCategoryData.name.toLowerCase())) {
      alert('Category name already exists.');
      return;
    }

    const totalAllocated = currentCategories.reduce((sum, cat) => sum + cat.limit, 0);
    const overallLimit = budgetData.totalLimit || 0;

    if (overallLimit > 0 && (totalAllocated + limit) > overallLimit) {
      setExceededAmount((totalAllocated + limit) - overallLimit);
      setShowAddCategoryModal(false);
      setShowBudgetExceededModal(true);
      return;
    }

    const updatedCategories = [
      ...currentCategories,
      { name: newCategoryData.name, limit, spent: 0, color: getColorForCategory(newCategoryData.name) }
    ];
    saveUpdatedCategories(updatedCategories);
    closeModal();
  };

  const handleEditCategorySubmit = (e) => {
    e.preventDefault();
    const limit = parseFloat(newCategoryData.total);
    if (!selectedCategory || !newCategoryData.name || isNaN(limit)) {
      alert('Please enter a valid category name and limit.');
      return;
    }
    const currentCategories = budgetData?.categories || [];
    if (newCategoryData.name.toLowerCase() !== selectedCategory.name.toLowerCase() && 
      currentCategories.some(cat => cat.name.toLowerCase() === newCategoryData.name.toLowerCase())) {
      alert('Another category with this name already exists.');
      return;
    }

    const totalAllocatedExceptThis = currentCategories
      .filter(cat => cat.name !== selectedCategory.name)
      .reduce((sum, cat) => sum + cat.limit, 0);
    const overallLimit = budgetData.totalLimit || 0;

    if (overallLimit > 0 && (totalAllocatedExceptThis + limit) > overallLimit) {
      setExceededAmount((totalAllocatedExceptThis + limit) - overallLimit);
      setShowEditCategoryModal(false);
      setShowBudgetExceededModal(true);
      return;
    }

    const updatedCategories = currentCategories.map(cat => 
      cat.name === selectedCategory.name 
        ? { ...cat, name: newCategoryData.name, limit, color: getColorForCategory(newCategoryData.name) } 
        : cat
    );
    saveUpdatedCategories(updatedCategories);
    closeModal();
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (!categoryToDelete) return;
    setItemToDelete({ type: 'category', data: categoryToDelete });
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!itemToDelete || !itemToDelete.data) return;
    const categoryToDelete = itemToDelete.data;
    const currentCategories = budgetData?.categories || [];
    const updatedCategories = currentCategories.filter(cat => cat.name !== categoryToDelete.name);
    await saveUpdatedCategories(updatedCategories);
    closeModal();
  };

  const saveUpdatedCategories = async (updatedCategories) => {
    setApiError('');
    const [year, monthNum] = selectedMonth.split('-');
    const monthIndex = parseInt(monthNum) - 1;
    const payload = {
      year: parseInt(year),
      month: monthIndex,
      totalLimit: budgetData?.totalLimit,
      categories: updatedCategories
        .filter(cat => !cat.isMisc && cat.name.toLowerCase() !== 'miscellaneous')
        .map(({ name, limit }) => ({ name, limit }))
    };
    try {
      await axios.post(`${API_URL}/budgets`, payload, { withCredentials: true });
      setBudgetData(prev => ({
        ...prev,
        categories: updatedCategories,
      }));
    } catch (err) {
      console.error('Error saving category changes:', err);
      setApiError(err.response?.data?.message || 'Failed to save category changes.');
    }
  };

  const pieChartData = budgetData?.categories?.map(cat => ({ name: cat.name, value: cat.spent, color: cat.color })) || [];
  const budgetStatus = budgetData ? (budgetData.totalLimit === null ? 'Not Set' : budgetData.totalSpent > budgetData.totalLimit ? 'Exceeded' : 'On Track') : 'Loading';
  const remainingAmount = budgetData && budgetData.totalLimit !== null ? budgetData.totalLimit - budgetData.totalSpent : null;

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleAddCategoryClick = () => {
    setNewCategoryData({
      name: '',
      total: '',
      color: '#4299E1'
    });
    setShowAddCategoryModal(true);
  };

  const handleEditCategoryClick = (category) => {
    setSelectedCategory(category);
    setNewCategoryData({
      name: category.name,
      total: category.limit.toString(),
      color: category.color
    });
    setShowEditCategoryModal(true);
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategoryData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateBudget = (categories) => {
    const totalCategoryBudget = categories.reduce((sum, cat) => sum + Number(cat.limit), 0);
    const overallBudget = budgetData.totalLimit;
    
    if (totalCategoryBudget > overallBudget) {
      setExceededAmount(totalCategoryBudget - overallBudget);
      setShowAddCategoryModal(false);
      setShowEditCategoryModal(false);
      setShowBudgetExceededModal(true);
      return false;
    }
    return true;
  };

  const handleAdjustOverallBudget = () => {
    const updatedTotal = (budgetData.totalLimit || 0) + exceededAmount;
    const limit = parseFloat(newCategoryData.total);
    
    let updatedCategories = [...budgetData.categories];
    if (selectedCategory) {
      updatedCategories = updatedCategories.map(cat => 
        cat.name === selectedCategory.name ? { ...cat, name: newCategoryData.name, limit, color: getColorForCategory(newCategoryData.name) } : cat
      );
    } else {
      updatedCategories.push({ name: newCategoryData.name, limit, spent: 0, color: getColorForCategory(newCategoryData.name) });
    }

    const [year, monthNum] = selectedMonth.split('-');
    const payload = {
      year: parseInt(year),
      month: parseInt(monthNum) - 1,
      totalLimit: updatedTotal,
      categories: updatedCategories.map(({ name, limit }) => ({ name, limit }))
    };

    savePayload(payload);
  };

  const handleCapToAvailable = () => {
    const totalOthers = budgetData.categories
      .filter(cat => selectedCategory ? cat.name !== selectedCategory.name : true)
      .reduce((sum, cat) => sum + cat.limit, 0);
    
    const maxAllowed = Math.max(0, (budgetData.totalLimit || 0) - totalOthers);
    
    let updatedCategories = [...budgetData.categories];
    if (selectedCategory) {
      updatedCategories = updatedCategories.map(cat => 
        cat.name === selectedCategory.name ? { ...cat, name: newCategoryData.name, limit: maxAllowed, color: getColorForCategory(newCategoryData.name) } : cat
      );
    } else {
      updatedCategories.push({ name: newCategoryData.name, limit: maxAllowed, spent: 0, color: getColorForCategory(newCategoryData.name) });
    }

    const [year, monthNum] = selectedMonth.split('-');
    const payload = {
      year: parseInt(year),
      month: parseInt(monthNum) - 1,
      totalLimit: budgetData.totalLimit,
      categories: updatedCategories.map(({ name, limit }) => ({ name, limit }))
    };

    savePayload(payload);
  };

  const savePayload = async (payload) => {
    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/budgets`, payload, { withCredentials: true });
      fetchBudgetData();
      closeModal();
    } catch (err) {
      console.error('Error auto-syncing budget:', err);
      setApiError(err.response?.data?.message || 'Failed to sync budget.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="monthly-budget-header">
        <h2>Monthly Budget</h2>
      </div>

      <div className="budget-content">
        <div className="budget-controls">
          <div className="month-selector-group">
            <FaCalendar className="calendar-icon" />
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="month-input"
            />
          </div>
          <button className="set-budget-btn" onClick={openSetBudgetModal}>
            <FaPlus /> Set Budget
          </button>
        </div>

        <div className="budget-grid">
          <div className="budget-card">
            <h2>Overall Budget</h2>
            <p className="budget-amount">
              <FaRupeeSign />{budgetData?.totalSpent?.toFixed(2) || '0.00'} spent of <FaRupeeSign />{budgetData?.totalLimit?.toFixed(2) || 'Not Set'}
            </p>
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${budgetData?.totalSpent ? ((budgetData.totalSpent / budgetData.totalLimit) * 100).toFixed(0) : '0'}%` }}
              ></div>
            </div>
            <p className="budget-stats">
              <span>{budgetData?.totalSpent ? ((budgetData.totalSpent / budgetData.totalLimit) * 100).toFixed(0) : '0'}% used</span>
              <span><FaRupeeSign />{remainingAmount !== null ? Math.abs(remainingAmount).toFixed(2) : 'N/A'} remaining</span>
            </p>
          </div>

          <div className="budget-card">
            <h2>Budget Allocation</h2>
            <p className="subtitle">How your budget is distributed</p>
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [
                      `₹${value.toLocaleString()}`, 
                      `${budgetData?.totalLimit ? ((value / budgetData.totalLimit) * 100).toFixed(1) : 0}% of budget`
                    ]} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieChartData.map((entry, index) => (
                  <div key={index} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: entry.color }}></span>
                    <span className="legend-label">
                      {entry.name}: {budgetData?.totalLimit ? ((entry.value / budgetData.totalLimit) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="category-budgets">
          <h2>Category Budgets</h2>
          <p className="subtitle">Track spending by category</p>
          
          <div className="categories-list">
            {budgetData?.categories.length === 0 && <p>No budget categories defined for this month. Click 'Add Category'.</p>}
            {budgetData?.categories.map((category, index) => {
              const percentage = category.isMisc ? 100 : (category.limit > 0 ? Math.min((category.spent / category.limit) * 100, 100) : 0);
              const overspent = !category.isMisc && category.spent > category.limit;
              return (
                <div key={index} className={`category-item ${category.isMisc ? 'misc-item' : ''}`}>
                  <div className="category-header">
                    <div className="category-info">
                      <span className="category-emoji">{getCategoryIcon(category.name)}</span>
                      <span className="category-name">{category.name}</span>
                    </div>
                    <div className="category-amount">
                      <FaRupeeSign />{category.spent.toFixed(2)} {category.limit > 0 ? `/ ₹${category.limit.toFixed(2)}` : ''}
                      {!category.isMisc && (
                        <button 
                          className="edit-category-btn"
                          onClick={() => openEditCategoryModal(category)}
                        >
                          <FaPencilAlt />
                        </button>
                      )}
                      {category.isMisc && (
                        <span className="misc-tag" title="Spent on categories not in your budget">Misc</span>
                      )}
                    </div>
                  </div>
                  <div className="category-progress-container">
                    <div 
                      className={`category-progress-bar ${overspent ? 'overspent' : ''}`}
                      style={{ 
                        width: `${overspent ? 100 : percentage}%`,
                        backgroundColor: overspent ? '#e53e3e' : category.color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <button className="add-category-btn" onClick={openAddCategoryModal}>
            <FaPlus /> Add New Category
          </button>
        </div>

        {showSetBudgetModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Set Monthly Budget</h3>
                <button onClick={closeModal} className="close-btn">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleSetBudgetSubmit} className="modal-form">
                {apiError && <p className="error-message">{apiError}</p>} 
                <div className="form-group">
                  <label>Total Budget</label>
                  <div className="input-with-icon">
                    <FaRupeeSign className="input-icon" />
                    <input
                      type="number"
                      name="total"
                      value={budgetFormData.total}
                      onChange={handleBudgetInputChange}
                      placeholder="Enter total budget"
                      required
                    />
                  </div>
                </div>

                <h4 className="category-allocation-header">Category Allocation</h4>
                {Object.entries(budgetFormData.categories).map(([category, value]) => (
                  <div className="form-group" key={category}>
                    <label>{category}</label>
                    <div className="input-with-icon">
                      <FaRupeeSign className="input-icon" />
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleBudgetInputChange(e, category)}
                        placeholder={`Enter ${category.toLowerCase()} budget`}
                        required
                      />
                    </div>
                  </div>
                ))}

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn btn-secondary" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBudgetExceededModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 style={{ color: '#e53e3e' }}>
                  <FaExclamationTriangle style={{ marginRight: '8px' }} />
                  Budget Exceeded
                </h3>
                <button onClick={closeModal} className="close-btn">
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body" style={{ padding: '0 20px 20px' }}>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  This new allocation pushes you ₹<span style={{ color: '#e53e3e', fontWeight: '800' }}>{exceededAmount.toFixed(2)}</span> past your current limit. How should we handle this?
                </p>
                <div className="allocation-conflict-options">
                    <div className="conflict-option-card premium" onClick={handleAdjustOverallBudget}>
                        <div className="option-header">
                            <FaRocket className="option-icon rocket" />
                            <h4>Grow Your Boundaries</h4>
                        </div>
                        <p>Automatically upgrade your total budget to ₹{((budgetData?.totalLimit || 0) + exceededAmount).toFixed(2)} to accommodate this new plan.</p>
                        <button className="btn btn-primary btn-sm">Expand Monthly Limit</button>
                    </div>

                    {((budgetData?.totalLimit || 0) - (budgetData?.categories.filter(c => selectedCategory ? c.name !== selectedCategory.name : true).reduce((s,c) => s+c.limit,0))) > 0 && (
                      <div className="conflict-option-card secondary" onClick={handleCapToAvailable}>
                          <div className="option-header">
                              <FaMagic className="option-icon magic" />
                              <h4>Smart Fit</h4>
                          </div>
                          <p>Stay within your current ₹{budgetData?.totalLimit?.toFixed(2)} limit by capping this category to exactly what's left.</p>
                          <button className="btn btn-secondary btn-sm">Apply Smart Cap</button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(showAddCategoryModal || showEditCategoryModal) && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{showEditCategoryModal ? 'Edit Category' : 'Add New Category'}</h3>
                <button onClick={closeModal} className="close-btn">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={showEditCategoryModal ? handleEditCategorySubmit : handleAddCategorySubmit} className="modal-form">
                {apiError && <p className="error-message">{apiError}</p>} 
                <div className="form-group">
                  <label>Category Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={newCategoryData.name} 
                    onChange={handleCategoryInputChange} 
                    placeholder="e.g., Groceries" 
                    required
                    readOnly={showEditCategoryModal && selectedCategory?.name === 'Uncategorized'}
                  />
                  
                  {!showEditCategoryModal && (
                    <div className="category-suggestions">
                      {[
                        'Food & Dining', 'Groceries', 'Transportation', 
                        'Rent & Housing', 'Entertainment', 'Healthcare', 
                        'Education', 'Shopping', 'Utilities', 'Investments',
                        'Vacation'
                      ].map(cat => (
                        <button 
                          key={cat}
                          type="button" 
                          className="suggestion-btn"
                          onClick={() => setNewCategoryData(prev => ({ ...prev, name: cat }))}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Monthly Limit *
                    {(() => {
                      const totalOthers = budgetData?.categories
                        .filter(c => selectedCategory ? c.name !== selectedCategory.name : true)
                        .reduce((s, c) => s + c.limit, 0) || 0;
                      const headroom = Math.max(0, (budgetData?.totalLimit || 0) - totalOthers);
                      const currentVal = parseFloat(newCategoryData.total) || 0;
                      
                      return (
                        <span style={{ fontSize: '0.8rem', color: currentVal > headroom ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                          Available: ₹{headroom.toFixed(2)}
                        </span>
                      );
                    })()}
                  </label>
                  <input 
                    type="number" 
                    name="total" 
                    value={newCategoryData.total} 
                    onChange={handleCategoryInputChange} 
                    placeholder="e.g., 300" 
                    step="1"
                    min="0" 
                    required 
                  />
                  {parseFloat(newCategoryData.total) > (() => {
                      const totalOthers = budgetData?.categories
                        .filter(c => selectedCategory ? c.name !== selectedCategory.name : true)
                        .reduce((s, c) => s + c.limit, 0) || 0;
                      return Math.max(0, (budgetData?.totalLimit || 0) - totalOthers);
                  })() && (
                    <p style={{ fontSize: '0.75rem', color: '#718096', marginTop: '4px', fontStyle: 'italic' }}>
                      <FaMagic style={{ marginRight: '5px', color: '#38b2ac' }} />
                      Heads up! Saving this will prompt you to expand your total budget.
                    </p>
                  )}
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                  {showEditCategoryModal && (
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => handleDeleteCategory(selectedCategory)} 
                      disabled={selectedCategory?.name === 'Uncategorized'}
                      title={selectedCategory?.name === 'Uncategorized' ? 'Cannot delete default category' : 'Delete Category'}
                    >
                      <FaTrash style={{ marginRight: '8px' }} /> Delete
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary">
                    {showEditCategoryModal ? 'Save Changes' : 'Add Category'}
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
                <button onClick={closeModal} className="close-btn"><FaTimes /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete the category <strong>"{itemToDelete?.data?.name}"</strong>?</p>
                <p className="delete-warning">This action is permanent and cannot be undone.</p>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={confirmDeleteCategory} className="btn btn-danger">Confirm Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Budget; 