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
  FaMagic,
  FaChartPie
} from 'react-icons/fa';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import axios from 'axios';
import Loading from '../components/Loading';
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
import groomingIcon from '../assets/grooming.png';
import { useAuth } from '../context/AuthContext';
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import './Budget.css';

const GRADIENTS = [
  { id: 'grad-teal', start: '#06b6d4', end: '#2dd4bf' },
  { id: 'grad-rose', start: '#e11d48', end: '#fb7185' },
  { id: 'grad-pink', start: '#db2777', end: '#fbcfe8' },
  { id: 'grad-amber', start: '#d97706', end: '#fbbf24' },
  { id: 'grad-indigo', start: '#4f46e5', end: '#818cf8' },
  { id: 'grad-blue', start: '#2563eb', end: '#60a5fa' },
  { id: 'grad-fuchsia', start: '#9333ea', end: '#c084fc' }
];

// Helper to assign distinct gradients per category, avoiding similar hues.
const getGradientForCategory = (cat) => {
  const lower = cat.toLowerCase();
  if (lower.includes('grocery') || lower.includes('grocer')) return GRADIENTS[0]; // teal
  if (lower.includes('vacat')) return GRADIENTS[2]; // pink (distinct from grocery)
  if (lower.includes('transport') || lower.includes('trans')) return GRADIENTS[4]; // indigo
  if (lower.includes('groom')) return GRADIENTS[6]; // fuchsia (distinct from transport)
  // fallback: cycle based on keyword match
  const idx = GRADIENTS.findIndex(g => lower.includes(g.id.split('-')[1]));
  return GRADIENTS[idx >= 0 ? idx : 0];
};


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

  if (cat.includes('groom'))
    return <img src={groomingIcon} alt="💇" style={iconStyle} />;

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
  const { formatCurrency, formatCurrencyRaw } = useDisplaySettings();
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
  const [activePieIndex, setActivePieIndex] = useState(null);
  const [prevMonthData, setPrevMonthData] = useState(null);



  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, stroke } = props;
    const eventHandlers = {
      onMouseEnter: props.onMouseEnter,
      onMouseLeave: props.onMouseLeave,
      onClick: props.onClick,
      onMouseDown: props.onMouseDown,
      onMouseUp: props.onMouseUp,
      onMouseMove: props.onMouseMove,
      onMouseOver: props.onMouseOver,
      onMouseOut: props.onMouseOut,
    };
    return (
      <g>
        <Sector
          {...eventHandlers}
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
      const percentage = budgetData?.totalLimit ? ((value / budgetData.totalLimit) * 100).toFixed(1) : 0;

      const categoryIndex = budgetData?.categories?.findIndex(c => c.name === data.name) ?? 0;
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
              <span className="tooltip-label">Limit:</span>
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




  const isAnyModalOpen = showAddCategoryModal || showEditCategoryModal || showBudgetExceededModal || showSetBudgetModal || showDeleteModal;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('lenis-stopped');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('lenis-stopped');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('lenis-stopped');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAnyModalOpen]);

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
        const categories = fetchedData.categories.map(cat => ({
          ...cat,
          color: getColorForCategory(cat.name)
        }));

        // Compute miscellaneous limit = totalLimit minus all specifically allocated limits
        const totalLimit = fetchedData.totalLimit || 0;
        const allocatedLimit = categories
          .filter(cat => !cat.isMisc && cat.name.toLowerCase() !== 'miscellaneous')
          .reduce((sum, cat) => sum + (cat.limit || 0), 0);
        const miscLimit = Math.max(0, totalLimit - allocatedLimit);

        const updatedCategories = categories.map(cat =>
          (cat.isMisc || cat.name.toLowerCase() === 'miscellaneous')
            ? { ...cat, limit: miscLimit }
            : cat
        );

        setBudgetData({
          ...fetchedData,
          categories: updatedCategories,
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

  // Fetch previous month's data for comparison
  useEffect(() => {
    const fetchPrevMonthData = async () => {
      const [year, monthNum] = selectedMonth.split('-');
      let prevYear = parseInt(year);
      let prevMonthIndex = parseInt(monthNum) - 2; // -1 for 0-based, -1 more for prev month
      if (prevMonthIndex < 0) { prevMonthIndex = 11; prevYear -= 1; }
      try {
        const res = await axios.get(`${API_URL}/budgets`, {
          params: { year: prevYear, month: prevMonthIndex },
          withCredentials: true,
        });
        setPrevMonthData(res.data || null);
      } catch {
        setPrevMonthData(null);
      }
    };
    fetchPrevMonthData();
  }, [selectedMonth]);

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

  // Pie chart data — misc limit is always totalLimit minus all specifically allocated limits
  const pieChartData = (() => {
    const cats = budgetData?.categories || [];
    const totalLimit = budgetData?.totalLimit || 0;
    const allocatedLimit = cats
      .filter(cat => !cat.isMisc && cat.name.toLowerCase() !== 'miscellaneous')
      .reduce((sum, cat) => sum + (cat.limit || 0), 0);
    const miscLimit = Math.max(0, totalLimit - allocatedLimit);
    return cats.map(cat => ({
      name: cat.name,
      value: (cat.isMisc || cat.name.toLowerCase() === 'miscellaneous') ? miscLimit : cat.limit,
      color: cat.color
    }));
  })();
  const budgetStatus = budgetData ? (budgetData.totalLimit === null ? 'Not Set' : budgetData.totalSpent > budgetData.totalLimit ? 'Exceeded' : 'On Track') : 'Loading';
  const remainingAmount = budgetData && budgetData.totalLimit !== null ? budgetData.totalLimit - budgetData.totalSpent : null;

  const getDaysRemaining = () => {
    const today = new Date();
    const [year, month] = selectedMonth.split('-');
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (parseInt(year) > currentYear || (parseInt(year) === currentYear && parseInt(month) > currentMonth)) {
      return lastDayOfMonth;
    }
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      return 0;
    }

    return Math.max(0, lastDayOfMonth - today.getDate());
  };
  const daysRemaining = getDaysRemaining();
  const dailyLimit = remainingAmount !== null && remainingAmount > 0 && daysRemaining > 0
    ? (remainingAmount / daysRemaining)
    : 0;

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
    const explicitCategories = categories.filter(c => !c.isMisc && c.name.toLowerCase() !== 'miscellaneous');
    const totalCategoryBudget = explicitCategories.reduce((sum, cat) => sum + Number(cat.limit), 0);
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
    const limit = parseFloat(newCategoryData.total);
    let updatedCategories = (budgetData?.categories || []).filter(c => !c.isMisc && c.name.toLowerCase() !== 'miscellaneous');
    if (selectedCategory) {
      updatedCategories = updatedCategories.map(cat =>
        cat.name === selectedCategory.name ? { ...cat, name: newCategoryData.name, limit, color: getColorForCategory(newCategoryData.name) } : cat
      );
    } else {
      updatedCategories.push({ name: newCategoryData.name, limit, spent: 0, color: getColorForCategory(newCategoryData.name) });
    }

    const newTotalLimit = Math.max((budgetData?.totalLimit || 0) + exceededAmount, updatedCategories.reduce((s, c) => s + c.limit, 0));

    const [year, monthNum] = selectedMonth.split('-');
    const payload = {
      year: parseInt(year),
      month: parseInt(monthNum) - 1,
      totalLimit: newTotalLimit,
      categories: updatedCategories.map(({ name, limit }) => ({ name, limit }))
    };

    savePayload(payload);
  };

  const handleCapToAvailable = () => {
    const totalOthers = (budgetData?.categories || [])
      .filter(cat => !cat.isMisc && cat.name.toLowerCase() !== 'miscellaneous')
      .filter(cat => selectedCategory ? cat.name !== selectedCategory.name : true)
      .reduce((sum, cat) => sum + Number(cat.limit || 0), 0);

    const miscRemaining = Math.max(0, (budgetData?.totalLimit || 0) - totalOthers);

    let updatedCategories = (budgetData?.categories || []).filter(c => !c.isMisc && c.name.toLowerCase() !== 'miscellaneous');
    if (selectedCategory) {
      updatedCategories = updatedCategories.map(cat =>
        cat.name === selectedCategory.name ? { ...cat, name: newCategoryData.name, limit: miscRemaining, color: getColorForCategory(newCategoryData.name) } : cat
      );
    } else {
      updatedCategories.push({ name: newCategoryData.name, limit: miscRemaining, spent: 0, color: getColorForCategory(newCategoryData.name) });
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
        <div className="header-banner">
          <div className="header-titles">
            <h2>Budget</h2>
            <span className="header-separator">|</span>
            <p className="header-subtitle">Manage your monthly budgets and limits</p>
          </div>
        </div>
      </div>

      <div className="budget-content">
        {loading && !budgetData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
            <Loading message="Loading Budget" />
          </div>
        ) : (
          <>
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
              <button className="budget-page-set-btn" onClick={openSetBudgetModal}>
                <FaPlus /> Set Budget
              </button>
            </div>

            <div className="budget-grid">
              <div className="budget-card">
                <h2><span>Overall Budget</span></h2>
                <p className="budget-amount">
                  {formatCurrency(budgetData?.totalSpent || 0)} spent of {budgetData?.totalLimit ? formatCurrency(budgetData.totalLimit) : 'Not Set'}
                </p>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${budgetData?.totalSpent ? Math.min(((budgetData.totalSpent / budgetData.totalLimit) * 100), 100).toFixed(0) : '0'}%` }}
                  >
                    {/* 3 white wave layers — very opaque for maximum visibility on dark base */}
                    <svg className="liquid-wave" viewBox="0 0 800 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Bottom fill - solid bright green upper surface */}
                      <path
                        className="wave-path-1"
                        fill="rgba(255, 255, 255, 0.85)"
                        d="M0,14 C50,3 100,24 150,14 C200,3 250,24 300,14 C350,3 400,24 450,14 C500,3 550,24 600,14 C650,3 700,24 750,14 C775,8 790,11 800,14 L800,28 L0,28 Z"
                      />
                      <path
                        className="wave-path-2"
                        fill="rgba(255, 255, 255, 0.4)"
                        d="M0,18 C40,7 90,26 130,18 C170,9 220,26 260,18 C300,9 350,26 390,18 C430,9 480,26 520,18 C560,9 610,24 650,18 C690,10 740,23 800,18 L800,28 L0,28 Z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="budget-stats">
                  <span>{budgetData?.totalSpent ? ((budgetData.totalSpent / budgetData.totalLimit) * 100).toFixed(0) : '0'}% used</span>
                  <span>{remainingAmount !== null ? `${formatCurrency(Math.abs(remainingAmount))} remaining` : 'N/A remaining'}</span>
                </p>

                {budgetData?.totalLimit !== null && budgetData?.totalLimit > 0 ? (
                  <div className="budget-insights-section">
                    <h3 className="insight-title"><span>Budget Insights</span></h3>
                    <div className="insight-grid">
                      <div className="insight-card">
                        <span className="insight-label">Suggested Daily Pace</span>
                        <span className="insight-value">
                          {formatCurrency(dailyLimit > 0 ? Math.floor(dailyLimit) : 0)} / day
                        </span>
                      </div>
                      <div className="insight-card">
                        <span className="insight-label">Days Remaining</span>
                        <span className="insight-value">{daysRemaining} days</span>
                      </div>
                      <div className="insight-card">
                        <span className="insight-label">Status</span>
                        <span className={`insight-badge ${remainingAmount < 0 ? 'overspent' :
                          ((budgetData?.totalSpent / budgetData?.totalLimit) > 0.85 ? 'warning' : 'healthy')
                          }`}>
                          {remainingAmount < 0 ? 'Exceeded' :
                            ((budgetData?.totalSpent / budgetData?.totalLimit) > 0.85 ? 'Warning' : 'On Track')}
                        </span>
                      </div>
                      <div className="insight-card">
                        <span className="insight-label">Burn Pace</span>
                        <span className="insight-value">
                          {remainingAmount < 0 ? 'Over Limit' : 'Within Budget'}
                        </span>
                      </div>
                    </div>

                    {/* Month-over-Month Comparison */}
                    {prevMonthData && prevMonthData.totalSpent !== undefined && (
                      <div className="mom-comparison">
                        <h4 className="mom-title">Month-over-Month</h4>

                        <div className="mom-cards-wrapper">
                          {/* Left: Previous Month Card */}
                          <div className="mom-card prev-card">
                            <div className="mom-card-header">
                              <span className="mom-dot prev-dot"></span>
                              <span className="mom-card-month">
                                {(() => {
                                  const [y, m] = selectedMonth.split('-');
                                  const d = new Date(parseInt(y), parseInt(m) - 2, 1);
                                  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
                                })()}
                              </span>
                            </div>
                            <div className="mom-card-body">
                              <div className="mom-card-value">
                                {formatCurrency(prevMonthData.totalSpent ?? 0)}
                              </div>
                              <div className="mom-card-sub">
                                {prevMonthData.totalLimit > 0 ? (
                                  <span>Limit: {formatCurrency(prevMonthData.totalLimit)}</span>
                                ) : (
                                  <span>No limit set</span>
                                )}
                              </div>
                            </div>
                            {prevMonthData.totalLimit > 0 && (
                              <div className="mom-mini-progress">
                                <div
                                  className="mom-mini-fill prev"
                                  style={{ width: `${Math.min((prevMonthData.totalSpent / prevMonthData.totalLimit) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Right: Current Month Card */}
                          <div className="mom-card curr-card">
                            <div className="mom-card-header">
                              <span className="mom-dot curr-dot"></span>
                              <span className="mom-card-month">
                                {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                              </span>
                            </div>
                            <div className="mom-card-body">
                              <div className="mom-card-value">
                                {formatCurrency(budgetData?.totalSpent ?? 0)}
                              </div>
                              <div className="mom-card-sub">
                                {budgetData?.totalLimit > 0 ? (
                                  <span>Limit: {formatCurrency(budgetData.totalLimit)}</span>
                                ) : (
                                  <span>No limit set</span>
                                )}
                              </div>
                            </div>
                            {budgetData?.totalLimit > 0 && (
                              <div className="mom-mini-progress">
                                <div
                                  className="mom-mini-fill curr"
                                  style={{ width: `${Math.min((budgetData.totalSpent / budgetData.totalLimit) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Change / Delta Status Footer */}
                        {(() => {
                          const curr = budgetData?.totalSpent ?? 0;
                          const prev = prevMonthData.totalSpent ?? 0;
                          if (prev === 0) {
                            return (
                              <div className="mom-status-footer new-data">
                                <img
                                  src="https://img.icons8.com/pastel-glyph/64/information--v1.png"
                                  alt="Info"
                                  className="mom-status-info-icon"
                                />
                                <span>Initial tracking period started. No spend recorded in previous month.</span>
                              </div>
                            );
                          }
                          const diff = curr - prev;
                          const pct = ((diff / prev) * 100).toFixed(1);
                          const up = diff > 0;
                          return (
                            <div className={`mom-status-footer ${up ? 'up' : 'down'}`}>
                              <span className="mom-status-icon">{up ? '📈' : '📉'}</span>
                              <span>
                                Spending is <strong>{Math.abs(parseFloat(pct))}% {up ? 'higher' : 'lower'}</strong> than last month.
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="budget-empty-placeholder">
                    <div className="empty-placeholder-badge">💡 Quick Hint</div>
                    <p className="empty-placeholder-title">No Monthly Limit Configured</p>
                    <p className="empty-placeholder-text">
                      Set up category budget limits in the section below to automatically calculate your monthly spending cap and unlock pace insights.
                    </p>
                  </div>
                )}
              </div>

              <div className="budget-card">
                <h2><span>Budget Allocation</span></h2>
                <p className="subtitle">How your budget is distributed</p>
                <div
                  className="pie-chart-container"
                  style={{ minHeight: '440px' }}
                  onMouseLeave={() => setActivePieIndex(null)}
                >
                  {pieChartData && pieChartData.length > 0 ? (
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
                            data={pieChartData}
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
                            {pieChartData.map((entry, index) => {
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
                        {pieChartData.map((entry, index) => {
                          const grad = GRADIENTS[index % GRADIENTS.length];
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
                                {entry.name}: {budgetData?.totalLimit ? ((entry.value / budgetData.totalLimit) * 100).toFixed(1) : 0}%
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
                      <h4>No Budget Allocation</h4>
                      <p>Add category budgets below to view your monthly spending distribution pie chart.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="category-budgets">
              <h2><span>Category Budgets</span></h2>
              <p className="subtitle">Track spending by category</p>

              <div className="categories-list">
                {budgetData?.categories.length === 0 && <p className="no-categories-message">No budget categories defined for this month. Click 'Add Category'.</p>}
                {budgetData?.categories.map((category, index) => {
                  const grad = GRADIENTS[index % GRADIENTS.length];
                  const percentage = category.isMisc ? 100 : (category.limit > 0 ? Math.min((category.spent / category.limit) * 100, 100) : 0);
                  const overspent = !category.isMisc && category.spent > category.limit;
                  return (
                    <div key={index} className={`category-item ${category.isMisc ? 'misc-item' : ''}`}>
                      <div className="category-header">
                        <div className="category-info">
                          <span
                            className="category-emoji"
                            style={{
                              '--emoji-bg': `${grad.start}15`,
                              '--emoji-border': `${grad.start}44`
                            }}
                          >{getCategoryIcon(category.name)}</span>
                          <span className="category-name">{category.name}</span>
                        </div>
                        <div className="category-amount">
                          <span className="amount-nowrap">
                            {formatCurrency(category.spent)}
                            {category.limit > 0 && <> &nbsp;/&nbsp; {formatCurrency(category.limit)}</>}
                          </span>
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
                            '--bar-color-start': grad.start,
                            '--bar-color-end': grad.end
                          }}
                        >
                          <svg className="liquid-wave" viewBox="0 0 800 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              className="wave-path-1"
                              d="M0,14 C50,3 100,24 150,14 C200,3 250,24 300,14 C350,3 400,24 450,14 C500,3 550,24 600,14 C650,3 700,24 750,14 C775,8 790,11 800,14 L800,28 L0,28 Z"
                            />
                            <path
                              className="wave-path-2"
                              d="M0,18 C40,7 90,26 130,18 C170,9 220,26 260,18 C300,9 350,26 390,18 C430,9 480,26 520,18 C560,9 610,24 650,18 C690,10 740,23 800,18 L800,28 L0,28 Z"
                            />
                          </svg>
                        </div>
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
              <div className="modal-overlay" data-lenis-prevent>
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
              <div className="modal-overlay" data-lenis-prevent>
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

                      {(() => {
                        const totalOthers = (budgetData?.categories || [])
                          .filter(c => !c.isMisc && c.name.toLowerCase() !== 'miscellaneous')
                          .filter(c => selectedCategory ? c.name !== selectedCategory.name : true)
                          .reduce((s, c) => s + (c.limit || 0), 0);
                        const miscRemaining = Math.max(0, (budgetData?.totalLimit || 0) - totalOthers);

                        if (miscRemaining <= 0) return null;

                        return (
                          <div className="conflict-option-card secondary" onClick={handleCapToAvailable}>
                            <div className="option-header">
                              <FaMagic className="option-icon magic" />
                              <h4>Smart Fit</h4>
                            </div>
                            <p>
                              Use the remaining <strong>₹{miscRemaining.toFixed(2)}</strong> from your Miscellaneous budget to cap this category without exceeding your overall ₹{budgetData?.totalLimit?.toFixed(2)} limit.
                            </p>
                            <button className="btn btn-secondary btn-sm">Apply Smart Cap</button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(showAddCategoryModal || showEditCategoryModal) && (
              <div className="modal-overlay" data-lenis-prevent>
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
                            'Vacation', 'Grooming'
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
                          const totalOthers = (budgetData?.categories || [])
                            .filter(c => !c.isMisc && c.name.toLowerCase() !== 'miscellaneous')
                            .filter(c => selectedCategory ? c.name !== selectedCategory.name : true)
                            .reduce((s, c) => s + (c.limit || 0), 0);
                          const headroom = Math.max(0, (budgetData?.totalLimit || 0) - totalOthers);
                          const currentVal = parseFloat(newCategoryData.total) || 0;

                          return (
                            <span style={{ fontSize: '0.8rem', color: currentVal > headroom ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                              Available in Misc: ₹{headroom.toFixed(2)}
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
              <div className="modal-overlay" data-lenis-prevent>
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
          </>
        )}
      </div>
    </>
  );
};

export default Budget; 