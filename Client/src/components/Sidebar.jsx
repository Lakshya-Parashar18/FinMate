import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaWallet,
  FaExchangeAlt,
  FaTachometerAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Get user and logout function
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  // Simplified user profile state based on AuthContext
  const userProfile = {
    name: user ? user.name : 'Loading...',
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

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <div className="sidebar">
      <h2>FinMate</h2>
      {/* Use NavLink for automatic active class */}
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaTachometerAlt className="icon" /> Dashboard
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaExchangeAlt className="icon" /> Transactions
      </NavLink>
      <NavLink to="/budget" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaWallet className="icon" /> Budget
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaChartBar className="icon" /> Analytics
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaCog className="icon" /> Settings
      </NavLink>

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
  );
};

export default Sidebar; // Ensure default export is present