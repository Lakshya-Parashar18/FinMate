import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaWallet,
  FaExchangeAlt,
  FaTachometerAlt,
  FaCamera,
  FaTimes,
  FaCheck,
  FaUsers,
  FaSun,
  FaMoon,
  FaDesktop
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import './Sidebar.css';

const AVATAR_PRESETS = [
  { id: 'p1', path: '/avatars/avatar-1.svg' },
  { id: 'p2', path: '/avatars/avatar-2.svg' },
  { id: 'p3', path: '/avatars/avatar-3.svg' },
  { id: 'p4', path: '/avatars/avatar-4.svg' },
  { id: 'p5', path: '/avatars/avatar-5.svg' },
  { id: 'p6', path: '/avatars/avatar-6.svg' },
  { id: 'p7', path: '/avatars/avatar-7.svg' },
  { id: 'p8', path: '/avatars/avatar-8.svg' },
  { id: 'p9', path: '/avatars/avatar-9.svg' },
  { id: 'p10', path: '/avatars/avatar-10.svg' },
  { id: 'p11', path: '/avatars/avatar-11.svg' },
  { id: 'p12', path: '/avatars/avatar-12.svg' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Get user and logout function
  const { formatCurrencyRaw, currency, displaySettings, updateDisplaySettings } = useDisplaySettings();
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef(null);
  const [avatarConfig, setAvatarConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finmate_avatar') || 'null'); } catch { return null; }
  });

  /* ── Crop Feature States ── */
  const [rawImage, setRawImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Listen to external triggers (e.g. from Settings profile card)
  useEffect(() => {
    const handleOpen = () => {
      console.log('Sidebar: Received open picker trigger');
      setShowAvatarPicker(true);
    };
    const onAvatarChange = (e) => {
      console.log('Sidebar: Received avatar config update', e.detail);
      setAvatarConfig(e.detail);
    };

    window.addEventListener('open_avatar_picker_direct', handleOpen);
    document.addEventListener('open_avatar_picker_direct', handleOpen);
    window.addEventListener('finmate_avatar_change', onAvatarChange);

    return () => {
      window.removeEventListener('open_avatar_picker_direct', handleOpen);
      document.removeEventListener('open_avatar_picker_direct', handleOpen);
      window.removeEventListener('finmate_avatar_change', onAvatarChange);
    };
  }, []);

  const getActiveTheme = () => {
    if (displaySettings?.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return displaySettings?.theme || 'light';
  };

  const handleThemeToggle = () => {
    const activeTheme = getActiveTheme();
    const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
    updateDisplaySettings({ theme: nextTheme });
  };

  // ── Global Keyboard Shortcuts ──────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if Alt key is pressed (and not Ctrl/Meta/Shift)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        let path = '';

        switch (key) {
          case 'd':
            path = '/dashboard';
            break;
          case 't':
            path = '/transactions';
            break;
          case 'a':
            path = '/analytics';
            break;
          case 'b':
            path = '/budget';
            break;
          case 'c':
            path = '/circles';
            break;
          case 's':
            path = '/settings';
            break;
          case 'p':
            path = '/profile';
            break;
          case 'l':
            e.preventDefault();
            handleLogout();
            return;
          case 'n':
            e.preventDefault();
            if (window.location.pathname === '/transactions') {
              window.dispatchEvent(new CustomEvent('open_add_transaction_modal'));
            } else {
              navigate('/transactions', { state: { openAddModal: true } });
            }
            return;
          case 'f':
            e.preventDefault();
            if (window.location.pathname === '/transactions') {
              window.dispatchEvent(new CustomEvent('open_filter_transactions_modal'));
            } else {
              navigate('/transactions', { state: { openFilterModal: true } });
            }
            return;
          default:
            return;
        }

        if (path) {
          e.preventDefault();
          navigate(path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);


  const [metrics, setMetrics] = useState({
    budgetHealth: 100,
    insightsCount: 0,
    spendingChange: 0,
    analysisStatus: 'Optimal',
    budgetLimit: 0,
    expenses: 0,
    income: 0,
    topCategory: null
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchWidgetData = async () => {
      try {
        const summaryRes = await axios.get(`${API_URL}/dashboard/summary`, { withCredentials: true });
        const summary = summaryRes.data;

        const insightsRes = await axios.get(`${API_URL}/insights`, { withCredentials: true });
        const insightsData = insightsRes.data || [];

        if (isMounted) {
          const limit = summary.budgetLimit || 0;
          const spent = summary.expenses || 0;
          let health = 100;
          if (limit > 0) {
            health = Math.max(0, Math.round(((limit - spent) / limit) * 100));
          } else if (spent > 0) {
            health = 0;
          }

          let change = 0;
          const comparison = summary.monthlyComparison || [];
          if (comparison.length >= 2) {
            const currentMonthExpenses = comparison[comparison.length - 1]?.Expenses || 0;
            const prevMonthExpenses = comparison[comparison.length - 2]?.Expenses || 0;
            if (prevMonthExpenses > 0) {
              change = ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
            }
          }

          let status = 'Optimal';
          if (health < 15) {
            status = 'Critical';
          } else if (health < 45) {
            status = 'Warning';
          } else if (health < 75) {
            status = 'Moderate';
          }

          setMetrics({
            budgetHealth: health,
            insightsCount: insightsData.length,
            spendingChange: change,
            analysisStatus: status,
            budgetLimit: Number(summary.budgetLimit) || 0,
            expenses: Number(summary.expenses) || 0,
            income: Number(summary.income) || 0,
            topCategory: summary.topCategory || null
          });
        }
      } catch (err) {
        console.error('Error fetching sidebar AI widget metrics:', err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    };

    fetchWidgetData();
    const interval = setInterval(fetchWidgetData, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Simplified user profile state based on AuthContext
  const userProfile = {
    name: user ? (user.name || '').split(' ')[0] : 'Loading...',
    username: user ? user.username : '',
    email: user ? user.email : '',
    avatar: user ? (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase() : ''
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

  // Use logout from AuthContext
  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect after logout
  };

  const handleProfileSectionClick = () => {
    navigate('/settings', { state: { openEdit: true } });
    window.dispatchEvent(new CustomEvent('finmate_trigger_edit_profile'));
  };

  const handleSelectPreset = (preset) => {
    const config = { type: 'preset', id: preset.id, path: preset.path };
    setAvatarConfig(config);
    localStorage.setItem('finmate_avatar', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('finmate_avatar_change', { detail: config }));
    setShowAvatarPicker(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target.result);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
  };

  /* ── Panning Gesture Handlers ── */
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanX(e.touches[0].clientX - dragStart.x);
    setPanY(e.touches[0].clientY - dragStart.y);
  };

  /* ── Canvas Crop Math & Export ── */
  const handleCropApply = () => {
    if (!rawImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const scaleRatio = 300 / 240; // canvas pixel scale
      ctx.clearRect(0, 0, 300, 300);

      // Center transformations
      ctx.translate(150, 150);
      ctx.translate(panX * scaleRatio, panY * scaleRatio);
      ctx.scale(zoom, zoom);

      // Math for CSS object-fit: cover emulation
      const containerAspect = 1;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let renderWidth, renderHeight;

      if (imgAspect > containerAspect) {
        renderHeight = 240;
        renderWidth = 240 * imgAspect;
      } else {
        renderWidth = 240;
        renderHeight = 240 / imgAspect;
      }

      ctx.drawImage(
        img,
        -renderWidth * scaleRatio / 2,
        -renderHeight * scaleRatio / 2,
        renderWidth * scaleRatio,
        renderHeight * scaleRatio
      );

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const config = { type: 'image', url: croppedDataUrl };

      setAvatarConfig(config);
      localStorage.setItem('finmate_avatar', JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('finmate_avatar_change', { detail: config }));

      setRawImage(null);
      setShowAvatarPicker(false);
    };
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Derive context-aware nav hints from live metrics
  const net = (Number(metrics.income) || 0) - (Number(metrics.expenses) || 0);
  const netConverted = formatCurrencyRaw(Math.abs(net));
  const netFormatted = currency === 'INR'
    ? `₹${Math.round(netConverted).toLocaleString('en-IN')}`
    : `$${Math.round(netConverted).toLocaleString('en-US')}`;

  const dashboardHint = (metrics.income === 0 && metrics.expenses === 0) || isNaN(net)
    ? 'No activity this month'
    : net >= 0
      ? `Net +${netFormatted} this month`
      : `Net -${netFormatted} this month`;

  const budgetHint = metrics.topCategory
    ? `Top: ${metrics.topCategory}`
    : 'No spending yet';

  const transactionsHint = metrics.spendingChange < 0
    ? `↓ ${Math.abs(metrics.spendingChange).toFixed(1)}% vs last month`
    : metrics.spendingChange > 0
      ? `↑ ${metrics.spendingChange.toFixed(1)}% vs last month`
      : 'Stable vs last month';

  const analyticsHint = 'Synced today';

  const settingsHint = 'Preferences & security';

  return (
    <div className={`sidebar ${displaySettings?.sidebarLayout === 'condensed' ? 'sidebar--condensed' : ''}`}>
      <h2>{displaySettings?.sidebarLayout === 'condensed' ? 'F' : 'FinMate'}</h2>
      <button
        className="sidebar-theme-toggle-btn"
        onClick={handleThemeToggle}
        title={`Current theme: ${getActiveTheme()}. Click to change.`}
      >
        {getActiveTheme() === 'light' ? (
          <FaSun className="icon" />
        ) : (
          <FaMoon className="icon" />
        )}
      </button>
      {/* Context-aware NavLinks */}
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaTachometerAlt className="icon" />
        <span className="nav-content">
          <span className="nav-label">Dashboard</span>
          {!loadingMetrics && <span className="nav-hint">{dashboardHint}</span>}
        </span>
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaExchangeAlt className="icon" />
        <span className="nav-content">
          <span className="nav-label">Transactions</span>
          {!loadingMetrics && <span className="nav-hint">{transactionsHint}</span>}
        </span>
      </NavLink>
      <NavLink to="/budget" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaWallet className="icon" />
        <span className="nav-content">
          <span className="nav-label">Budget</span>
          {!loadingMetrics && <span className="nav-hint">{budgetHint}</span>}
        </span>
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaChartBar className="icon" />
        <span className="nav-content">
          <span className="nav-label">Analytics</span>
          <span className="nav-hint">{analyticsHint}</span>
        </span>
      </NavLink>
      <NavLink
        to="/circles"
        state={{ resetCircle: true }}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        <FaUsers className="icon" />
        <span className="nav-content">
          <span className="nav-label">Circles</span>
          <span className="nav-hint">Collaborative finance</span>
        </span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaCog className="icon" />
        <span className="nav-content">
          <span className="nav-label">Settings</span>
          {!loadingMetrics && <span className="nav-hint">{settingsHint}</span>}
        </span>
      </NavLink>
      {/* FinSense AI Widget */}
      <div className="sidebar-status-card ai-widget">
        <div className="status-header">
          <div className="status-dot"></div>
          <span className="status-label">FINSENSE AI</span>
          <span className="status-tag">ACTIVE</span>
        </div>
        <div className="ai-widget-grid">
          <div className="ai-metric-item">
            <span className="metric-label">Health</span>
            <span className={`metric-value ${metrics.budgetHealth > 75 ? 'green-text' : metrics.budgetHealth > 45 ? 'yellow-text' : 'red-text'}`}>
              {metrics.budgetHealth}%
            </span>
          </div>
          <div className="ai-metric-item">
            <span className="metric-label">Insights</span>
            <span className="metric-value pulse-blue">
              {metrics.insightsCount} Ready
            </span>
          </div>
          <div className="ai-metric-item">
            <span className="metric-label">Spending</span>
            {metrics.spendingChange < 0 ? (
              <span className="metric-value green-text">
                ↓ {Math.abs(metrics.spendingChange).toFixed(1)}%
              </span>
            ) : metrics.spendingChange > 0 ? (
              <span className="metric-value red-text">
                ↑ {metrics.spendingChange.toFixed(1)}%
              </span>
            ) : (
              <span className="metric-value">Stable</span>
            )}
          </div>
          <div className="ai-metric-item">
            <span className="metric-label">Analysis</span>
            <span className={`metric-value ${metrics.analysisStatus === 'Optimal' ? 'green-text' : metrics.analysisStatus === 'Moderate' ? 'yellow-text' : 'red-text'}`}>
              {metrics.analysisStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div
        className="profile-section"
        onClick={handleProfileSectionClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Avatar with gradient ring + online badge */}
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-ring">
            <div
              className="profile-avatar"
            >
              {avatarConfig?.type === 'image' ? (
                <img
                  src={avatarConfig.url}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : avatarConfig?.type === 'preset' ? (
                <img
                  src={avatarConfig.path}
                  alt="preset avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                userProfile.avatar
              )}
            </div>
          </div>
          <span className="profile-online-dot" title="Online" />
        </div>

        {/* Name + username */}
        <div className="profile-info">
          <span className="profile-name">{userProfile.name}</span>
          <span className="profile-email">
            {userProfile.username ? `@${userProfile.username}` : userProfile.email}
          </span>
        </div>

        {/* Dropdown */}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* ── Avatar Picker Modal (Rendered outside Sidebar container using Portals) ── */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              className="avatar-picker-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
            >
              <motion.div
                className="avatar-picker-modal"
                initial={{ scale: 0.93, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="avatar-picker-header">
                  <span>{rawImage ? 'Crop & Position' : 'Choose Your Avatar'}</span>
                  <button className="avatar-picker-close" onClick={() => { setShowAvatarPicker(false); setRawImage(null); }}>
                    <FaTimes />
                  </button>
                </div>

                {rawImage ? (
                  /* ── Crop Interactive View (Magnifying Lens Pattern) ── */
                  <div className="avatar-crop-container">
                    <div
                      className="avatar-crop-viewport"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleMouseUp}
                    >
                      {/* Blurred Background */}
                      <div className="crop-blur-bg-wrap">
                        <img
                          src={rawImage}
                          alt="Crop background"
                          className="crop-image-blur"
                          style={{
                            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                          }}
                        />
                      </div>

                      {/* Dark overlay sheet */}
                      <div className="crop-dark-overlay"></div>

                      {/* Clear Circular Lens focus area */}
                      <div className="crop-lens-circle">
                        <div className="crop-front-image-wrap">
                          <img
                            src={rawImage}
                            alt="Crop front"
                            className="crop-image-front"
                            style={{
                              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="crop-controls">
                      <div className="crop-control-row">
                        <span>Zoom</span>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.02"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="crop-zoom-slider"
                        />
                      </div>
                      <p className="crop-tip">Drag the image to adjust its position</p>
                    </div>

                    <div className="crop-actions">
                      <button
                        type="button"
                        className="crop-action-btn crop-btn-cancel"
                        onClick={() => setRawImage(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="crop-action-btn crop-btn-apply"
                        onClick={handleCropApply}
                      >
                        Apply Crop
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Standard Picker View ── */
                  <>
                    {/* Preset grid */}
                    <p className="avatar-picker-label">Preset Avatars</p>
                    <div className="avatar-preset-grid">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          className={`avatar-preset-item ${avatarConfig?.type === 'preset' && avatarConfig.id === preset.id ? 'selected' : ''}`}
                          onClick={() => handleSelectPreset(preset)}
                          title={`Preset ${preset.id}`}
                        >
                          <img
                            src={preset.path}
                            alt={`Preset ${preset.id}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {avatarConfig?.type === 'preset' && avatarConfig.id === preset.id && (
                            <span className="preset-check"><FaCheck /></span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="avatar-picker-divider">
                      <span>or</span>
                    </div>

                    {/* Upload */}
                    <button
                      className="avatar-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaCamera />
                      <span>Upload from Gallery</span>
                    </button>

                    {/* Current custom image preview */}
                    {avatarConfig?.type === 'image' && (
                      <div className="avatar-current-preview">
                        <img src={avatarConfig.url} alt="Current" />
                        <span>Current custom photo</span>
                        <button className="avatar-remove-btn" onClick={() => {
                          setAvatarConfig(null);
                          localStorage.removeItem('finmate_avatar');
                          window.dispatchEvent(new CustomEvent('finmate_avatar_change', { detail: null }));
                        }}>Remove</button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>

  );
};

export default Sidebar; // Ensure default export is present