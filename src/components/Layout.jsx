import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaWallet,
  FaExchangeAlt,
  FaTachometerAlt
} from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';

const Layout = ({ children }) => {
  const navigate = useNavigate();
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
    <div className="layout-container">
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
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 