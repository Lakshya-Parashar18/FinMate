import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaExchangeAlt,
  FaWallet,
  FaChartBar,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaLock,
  FaBell,
  FaDesktop,
  FaCamera,
  FaTimes,
  FaExclamationTriangle,
} from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { displaySettings, updateDisplaySettings } = useDisplaySettings();
  const { user, checkAuthStatus, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setApiError('');
    setSuccessMessage('');
    try {
      const response = await axios.get(`${API_URL}/users/profile`, { withCredentials: true });
      if (response.data) {
        setProfileData({
          name: response.data.name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          bio: response.data.bio || '',
        });
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setApiError(err.response?.data?.message || 'Failed to load profile data.');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    setSuccessMessage('');
    try {
      const response = await axios.put(`${API_URL}/users/profile`, profileData, { withCredentials: true });
      setSuccessMessage('Profile updated successfully!');
      checkAuthStatus();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setApiError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setApiError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${API_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, { withCredentials: true });

      setSuccessMessage('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setApiError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const executeDelete = async () => {
    setLoading(true);
    setApiError('');
    try {
      await axios.delete(`${API_URL}/auth/delete`, { withCredentials: true });
      logout();
      navigate('/', { state: { accountDeleted: true }, replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      const errorMsg = err.response?.data?.message || 'Failed to delete account.';
      setApiError(errorMsg);
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleDisplaySettingChange = (e) => {
    const { name, value } = e.target;
    updateDisplaySettings({ [name]: value });
  };

  const renderProfileSettings = () => (
    <form onSubmit={handleSaveChanges} className="settings-section">
      <h3>Profile Information</h3>
      <p className="section-subtitle">Update your personal information</p>
      
      {apiError && <p className="error-message">{apiError}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      
      {loading ? <p>Loading profile...</p> : (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={profileData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>
             <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange} 
                    placeholder="Enter your email"
                />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={profileData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>
           <button type="submit" className="save-changes-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
           </button>
        </>
      )}
    </form>
  );

  const renderAccountSettings = () => (
    <div className="settings-section">
      <h3>Account Management</h3>
       <p className="section-subtitle">Manage security and account actions</p>
       <div className="form-group">
            <label>Password</label>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setShowPasswordModal(true)}
            >
              <FaLock size={14} /> Change Password
            </button>
       </div>
       
      <div className="danger-zone">
        <h4>Danger Zone</h4>
        <p>Deleting your account is permanent and cannot be undone.</p>
        <button 
          className="delete-account-btn" 
          onClick={() => setShowDeleteModal(true)} 
          disabled={loading}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Notifications</h3>
      <p className="section-subtitle">Choose how you receive notifications</p>
      <div className="form-group">
          <label>
            <input type="checkbox" name="emailNotifications" disabled /> Email Notifications (Coming Soon)
          </label>
      </div>
       <div className="form-group">
           <label>
             <input type="checkbox" name="pushNotifications" disabled /> Push Notifications (Coming Soon)
            </label>
       </div>
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="settings-section">
      <h3>Display Preferences</h3>
      <p className="section-subtitle">Customize the look and feel</p>
      <div className="form-group">
        <label htmlFor="theme">Theme</label>
        <select 
          id="theme" 
          name="theme" 
          value={displaySettings.theme}
          onChange={handleDisplaySettingChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
       <div className="form-group">
        <label htmlFor="currency">Default Currency</label>
        <select 
          id="currency" 
          name="currency" 
          value={displaySettings.currency}
          onChange={handleDisplaySettingChange}
        >
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
    </div>
  );

  return (
    <>
      <main className="settings-content">

        <div className="settings-header">
          <h2>Settings</h2>
        </div>
        <div className="settings-container">
          <div className="settings-tabs">
            <button 
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <FaUser /> Profile
            </button>
            <button 
              className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <FaLock /> Account
            </button>
            <button 
              className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <FaBell /> Notifications
            </button>
            <button 
              className={`tab-button ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              <FaDesktop /> Display
            </button>
          </div>

          <div className="settings-tab-content">
            {activeTab === 'profile' && renderProfileSettings()}
            {activeTab === 'account' && renderAccountSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'display' && renderDisplaySettings()}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            className="premium-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div 
              className="premium-modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="premium-modal-header" style={{ marginBottom: '10px' }}>
                <div className="warning-icon-container" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <FaLock />
                </div>
                <h3 className="premium-modal-title">Change Password</h3>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '8px' }}>
                  <button 
                    type="button"
                    className="premium-btn premium-btn-cancel" 
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="premium-btn" 
                    style={{ background: '#3b82f6', color: 'white' }}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div 
            className="premium-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div 
              className="premium-modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <div className="premium-modal-header">
                <div className="warning-icon-container">
                  <FaExclamationTriangle />
                </div>
                <h3 className="premium-modal-title">Delete Account</h3>
              </div>
              
              <div className="premium-modal-body">
                <p>
                  Are you absolutely sure you want to delete your FinMate account? 
                  <br /><br />
                  This action is <strong>permanent</strong> and cannot be undone. All your financial data, transactions, and budgets will be permanently wiped from our servers.
                </p>
              </div>

              <div className="premium-modal-actions">
                <button 
                  className="premium-btn premium-btn-cancel" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="premium-btn premium-btn-delete" 
                  onClick={executeDelete}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Settings; 