import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaUser,
  FaLock,
  FaBell,
  FaDesktop,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCheck,
  FaSignOutAlt,
  FaCamera,
  FaTimes,
  FaEnvelope,
  FaPhone,
  FaAt,
  FaCalendarAlt,
  FaCheckCircle,
  FaPen,
  FaSearchPlus,
  FaExclamationCircle,
  FaMobile,
  FaGlobe,
  FaDownload,
  FaToggleOn,
  FaToggleOff,
  FaHistory,
  FaMapMarkerAlt,
  FaTrashAlt,
  FaFileExport,
  FaEye,
  FaEyeSlash,
  FaQuestionCircle,
  FaLifeRing,
  FaKeyboard,
  FaUserShield,
  FaSlidersH,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaCommentAlt,
  FaBug,
  FaUserSecret,
  FaDatabase,
  FaWifi,
  FaStar,
} from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import { useAuth } from '../context/AuthContext';
import './Settings.css';
import Lenis from 'lenis';
import Loading from '../components/Loading';
import dayjs from 'dayjs';

/* Country Code List */
const COUNTRY_CODES = [
  { code: '+91',  label: '+91 (IN)'  },
  { code: '+1',   label: '+1 (US)'   },
  { code: '+44',  label: '+44 (UK)'  },
  { code: '+971', label: '+971 (AE)' },
  { code: '+61',  label: '+61 (AU)'  },
  { code: '+65',  label: '+65 (SG)'  },
  { code: '+81',  label: '+81 (JP)'  },
  { code: '+49',  label: '+49 (DE)'  },
  { code: '+33',  label: '+33 (FR)'  }
];

const parsePhone = (phoneStr) => {
  if (!phoneStr) return { countryCode: '+91', localPhone: '' };
  // Find matching country code prefix
  const matched = COUNTRY_CODES.find(item => phoneStr.startsWith(item.code));
  if (matched) {
    return {
      countryCode: matched.code,
      localPhone: phoneStr.substring(matched.code.length).trim()
    };
  }
  // Fallback: check if starts with + followed by digits
  const plusMatch = phoneStr.match(/^(\+\d+)/);
  if (plusMatch) {
    const code = plusMatch[1];
    return {
      countryCode: code,
      localPhone: phoneStr.substring(code.length).trim()
    };
  }
  return { countryCode: '+91', localPhone: phoneStr };
};

/* NAV ITEMS */
const NAV_ITEMS = [
  { id: 'profile',       icon: FaUser,         label: 'Profile'       },
  { id: 'account',       icon: FaShieldAlt,    label: 'Account'       },
  { id: 'notifications', icon: FaBell,         label: 'Notifications' },
  { id: 'display',       icon: FaDesktop,      label: 'Display'       },
  { id: 'privacy',       icon: FaUserSecret,   label: 'Privacy'       },
  { id: 'help',          icon: FaLifeRing,     label: 'Help & Support'},
];

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { displaySettings, updateDisplaySettings } = useDisplaySettings();
  const { user, checkAuthStatus, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finmate_avatar') || 'null'); } catch { return null; }
  });
  const [profileData, setProfileData] = useState({ name: '', username: '', email: '', phone: '', bio: '', createdAt: null, isVerified: false });
  const [circlesCount, setCirclesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [goalsCount, setGoalsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: '', username: '', email: '', phone: '', bio: '' });
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneLocalNumber, setPhoneLocalNumber] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showZoomedAvatar, setShowZoomedAvatar] = useState(false);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [saveLoading, setSaveLoading]   = useState(false);
  const [apiError, setApiError]         = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [, setTick] = useState(0);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('friends');
  const [activityVisible, setActivityVisible] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  const [showAllLogins, setShowAllLogins] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState({ secret: '', qrCode: '' });
  const [twoFAVerifyToken, setTwoFAVerifyToken] = useState('');
  const [twoFADisableToken, setTwoFADisableToken] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    highValueAlert: true,
    highValueLimit: 10000,
    dailySummary: false,
    weeklyDigest: true,
    budgetWarning80: true,
    budgetWarning100: true,
    goalMilestone: true,
    goalDeadline: true,
    sessionAlert: true,
    emailChannel: true,
    pushChannel: false,
    smsChannel: false
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Privacy Tab State ──────────────────────────────────
  const [privacyPrefs, setPrivacyPrefs] = useState({
    dataCollection: true,
    personalization: true,
    analyticsOptOut: false,
    adPersonalization: false,
    thirdPartySharing: false,
    dataRetention: '12months',
  });
  const [privacyPrefsLoading, setPrivacyPrefsLoading] = useState(false);

  // ── Help & Support Tab State ───────────────────────────
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const lenisRef = useRef(null);
  const supportFormRef = useRef(null);
  const supportMessageInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Phone verification OTP resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const openPhoneVerificationModal = () => {
    setVerifyPhone(profileData.phone || '');
    setVerifyOtp('');
    setVerifyError('');
    setVerificationStep(1);
    setShowPhoneVerifyModal(true);
  };

  const handleSendPhoneOtp = async (e) => {
    e?.preventDefault();
    if (!verifyPhone) {
      setVerifyError('Phone number is required');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      await axios.post(`${API_URL}/users/send-phone-otp`, { phone: verifyPhone }, { withCredentials: true });
      setVerificationStep(2);
      setResendCooldown(60);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e?.preventDefault();
    if (!verifyOtp || verifyOtp.length !== 6) {
      setVerifyError('Please enter a valid 6-digit OTP code');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await axios.post(`${API_URL}/users/verify-phone-otp`, { otp: verifyOtp }, { withCredentials: true });
      if (res.data.isPhoneVerified) {
        setProfileData(prev => ({ ...prev, isPhoneVerified: true, phone: verifyPhone }));
        setShowPhoneVerifyModal(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const formatLastSynced = (updatedAt) => {
    if (!updatedAt) return 'Just now';
    const updatedDate = dayjs(updatedAt);
    const now = dayjs();
    
    const diffInMinutes = now.diff(updatedDate, 'minute');
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (now.isSame(updatedDate, 'day')) {
      return `Today at ${updatedDate.format('h:mm A')}`;
    } else if (now.subtract(1, 'day').isSame(updatedDate, 'day')) {
      return `Yesterday at ${updatedDate.format('h:mm A')}`;
    } else {
      return updatedDate.format('MMM D, YYYY');
    }
  };

  /* ── Lenis smooth scroll ───────────────────────────── */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 2.0,
      touchMultiplier: 2,
      infinite: false,
    });
    lenisRef.current = lenis;
    let frameId;
    function raf(time) { lenis.raf(time); frameId = requestAnimationFrame(raf); }
    frameId = requestAnimationFrame(raf);
    return () => { 
      lenis.destroy(); 
      lenisRef.current = null;
      cancelAnimationFrame(frameId); 
    };
  }, []);

  useEffect(() => {
    const isAnyModalOpen = showEditModal || showDeleteModal || showPhoneVerifyModal || showPasswordModal || showZoomedAvatar || show2FASetupModal || show2FADisableModal;
    if (isAnyModalOpen) {
      if (lenisRef.current) {
        lenisRef.current.stop();
      }
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.classList.add('lenis-stopped');
    } else {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.documentElement.classList.remove('lenis-stopped');
    }
    return () => {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.documentElement.classList.remove('lenis-stopped');
    };
  }, [showEditModal, showDeleteModal, showPhoneVerifyModal, showPasswordModal, showZoomedAvatar, show2FASetupModal, show2FADisableModal]);


  /* ── Sync Avatar configuration updates ──────────────── */
  useEffect(() => {
    const onAvatarChange = (e) => setAvatarConfig(e.detail);
    window.addEventListener('finmate_avatar_change', onAvatarChange);
    return () => {
      window.removeEventListener('finmate_avatar_change', onAvatarChange);
    };
  }, []);

  /* ── Fetch profile ─────────────────────────────────── */
  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await axios.get(`${API_URL}/users/profile`, { withCredentials: true });
      if (res.data) {
        setProfileData({
          name: res.data.name || '',
          username: res.data.username || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          bio: res.data.bio || '',
          createdAt: res.data.createdAt || null,
          isVerified: res.data.isVerified || false,
          isPhoneVerified: res.data.isPhoneVerified || false
        });
        setTwoFAEnabled(res.data.twoFAEnabled || false);
        if (res.data.privacySettings) {
          setProfileVisibility(res.data.privacySettings.profileVisibility || 'friends');
          setActivityVisible(res.data.privacySettings.activityVisible !== false);
        }
        if (res.data.notificationSettings) {
          setNotificationSettings(res.data.notificationSettings);
        }
        setLastSynced(res.data.updatedAt);

        // Fetch dynamic stats in parallel safely
        Promise.allSettled([
          axios.get(`${API_URL}/circles`, { withCredentials: true }),
          axios.get(`${API_URL}/circles/friends`, { withCredentials: true })
        ]).then(([circlesRes, friendsRes]) => {
          if (circlesRes.status === 'fulfilled' && circlesRes.value.data) {
            const list = circlesRes.value.data;
            setCirclesCount(list.length);
            const totalGoals = list.reduce((acc, c) => acc + (c.goals ? c.goals.length : 0), 0);
            setGoalsCount(totalGoals);
          }
          if (friendsRes.status === 'fulfilled' && friendsRes.value.data) {
            setFriendsCount(friendsRes.value.data.length);
          }
        }).catch(err => console.error('Error fetching stats:', err));
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to load profile.');
      if (err.response?.status === 401) navigate('/login');
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);

  const fetchAccountSecurityData = useCallback(async () => {
    setSessionsLoading(true);
    setActivityLoading(true);
    try {
      const [sessRes, actRes, privRes] = await Promise.all([
        axios.get(`${API_URL}/users/sessions`, { withCredentials: true }),
        axios.get(`${API_URL}/users/login-activity`, { withCredentials: true }),
        axios.get(`${API_URL}/users/privacy`, { withCredentials: true })
      ]);
      if (sessRes.data?.sessions) {
        setSessions(sessRes.data.sessions);
      }
      if (actRes.data?.activity) {
        setLoginActivity(actRes.data.activity);
      }
      if (privRes.data?.privacySettings) {
        setProfileVisibility(privRes.data.privacySettings.profileVisibility || 'friends');
        setActivityVisible(privRes.data.privacySettings.activityVisible !== false);
      }
    } catch (err) {
      console.error('Error fetching account security data:', err);
    } finally {
      setSessionsLoading(false);
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'account') {
      fetchAccountSecurityData();
    }
  }, [activeTab, fetchAccountSecurityData]);

  const fetchNotificationSettings = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await axios.get(`${API_URL}/users/notifications`, { withCredentials: true });
      if (res.data?.notificationSettings) {
        setNotificationSettings(res.data.notificationSettings);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotificationSettings();
    }
  }, [activeTab, fetchNotificationSettings]);

  const fetchPrivacySettings = useCallback(async () => {
    setPrivacyPrefsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/users/privacy`, { withCredentials: true });
      if (res.data?.privacySettings) {
        setPrivacyPrefs({
          dataCollection: res.data.privacySettings.dataCollection !== false,
          personalization: res.data.privacySettings.personalization !== false,
          analyticsOptOut: !!res.data.privacySettings.analyticsOptOut,
          adPersonalization: !!res.data.privacySettings.adPersonalization,
          thirdPartySharing: !!res.data.privacySettings.thirdPartySharing,
          dataRetention: res.data.privacySettings.dataRetention || '12months'
        });
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    } finally {
      setPrivacyPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'privacy') {
      fetchPrivacySettings();
    }
  }, [activeTab, fetchPrivacySettings]);

  /* ── Handlers ──────────────────────────────────────── */
  const openEditModal = useCallback(() => {
    const parsed = parsePhone(profileData.phone || '');
    setPhoneCountryCode(parsed.countryCode);
    setPhoneLocalNumber(parsed.localPhone);
    setEditProfileData({
      name: profileData.name || '',
      username: profileData.username || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      bio: profileData.bio || ''
    });
    setApiError('');
    setSuccessMessage('');
    setShowEditModal(true);
  }, [profileData]);

  useEffect(() => {
    if (location.state?.openEdit) {
      // Force Profile tab selection when opening modal via sidebar click
      setActiveTab('profile');
      openEditModal();
      window.history.replaceState({}, document.title);
    }
  }, [location, openEditModal]);

  useEffect(() => {
    const handleTriggerEdit = () => {
      setActiveTab('profile');
      openEditModal();
    };
    window.addEventListener('finmate_trigger_edit_profile', handleTriggerEdit);
    return () => {
      window.removeEventListener('finmate_trigger_edit_profile', handleTriggerEdit);
    };
  }, [openEditModal]);

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setApiError('');
    setSuccessMessage('');
    const fullPhone = phoneLocalNumber ? `${phoneCountryCode}${phoneLocalNumber.trim()}` : '';
    const payload = {
      ...editProfileData,
      phone: fullPhone
    };
    try {
      const res = await axios.put(`${API_URL}/users/profile`, payload, { withCredentials: true });
      if (res.data) {
        setProfileData({
          name: res.data.name || '',
          username: res.data.username || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          bio: res.data.bio || '',
          createdAt: res.data.createdAt || profileData.createdAt,
          isVerified: res.data.isVerified || profileData.isVerified,
          isPhoneVerified: res.data.isPhoneVerified || false
        });
      }
      setLastSynced(new Date().toISOString());
      checkAuthStatus();
      setShowEditModal(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update profile.');
    } finally { setSaveLoading(false); }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) { setApiError('New passwords do not match'); return; }
    setPasswordLoading(true);
    try {
      await axios.post(`${API_URL}/auth/change-password`, { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }, { withCredentials: true });
      setSuccessMessage('Password updated!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update password.');
    } finally { setPasswordLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRevokeSession = async (sessId) => {
    try {
      await axios.delete(`${API_URL}/users/sessions/${sessId}`, { withCredentials: true });
      setSessions(prev => prev.filter(s => s.sessionId !== sessId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke session');
    }
  };

  const handlePrivacyChange = async (newVisibility) => {
    setProfileVisibility(newVisibility);
    try {
      await axios.put(`${API_URL}/users/privacy`, { profileVisibility: newVisibility }, { withCredentials: true });
    } catch (err) {
      console.error('Failed to save visibility:', err);
    }
  };

  const handleActivityStatusChange = async () => {
    const nextVal = !activityVisible;
    setActivityVisible(nextVal);
    try {
      await axios.put(`${API_URL}/users/privacy`, { activityVisible: nextVal }, { withCredentials: true });
    } catch (err) {
      console.error('Failed to save activity status:', err);
    }
  };

  const handleExportData = () => {
    window.open(`${API_URL}/users/export`, '_blank');
  };

  const handle2FASetupStart = async () => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      const res = await axios.post(`${API_URL}/users/2fa/setup`, {}, { withCredentials: true });
      setTwoFASetupData({
        secret: res.data.secret,
        qrCode: res.data.qrCode
      });
      setTwoFAVerifyToken('');
      setShow2FASetupModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initialize 2FA setup.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FASetupVerify = async (e) => {
    e.preventDefault();
    if (!twoFAVerifyToken.trim() || twoFAVerifyToken.length < 6) return;
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await axios.post(`${API_URL}/users/2fa/verify`, { token: twoFAVerifyToken }, { withCredentials: true });
      setTwoFAEnabled(true);
      setShow2FASetupModal(false);
      alert('Google Authenticator 2FA enabled successfully!');
    } catch (err) {
      setTwoFAError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FADisable = async (e) => {
    e.preventDefault();
    if (!twoFADisableToken.trim() || twoFADisableToken.length < 6) return;
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await axios.post(`${API_URL}/users/2fa/disable`, { token: twoFADisableToken }, { withCredentials: true });
      setTwoFAEnabled(false);
      setShow2FADisableModal(false);
      alert('2FA disabled successfully.');
    } catch (err) {
      setTwoFAError(err.response?.data?.message || 'Verification failed. 2FA not disabled.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleNotificationToggle = async (field) => {
    const newVal = !notificationSettings[field];
    setNotificationSettings(prev => ({ ...prev, [field]: newVal }));
    try {
      await axios.put(`${API_URL}/users/notifications`, { [field]: newVal }, { withCredentials: true });
    } catch (err) {
      console.error(`Failed to update notification setting ${field}:`, err);
      // rollback state on failure
      setNotificationSettings(prev => ({ ...prev, [field]: !newVal }));
    }
  };

  const handleNotificationValueChange = async (field, value) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
    try {
      await axios.put(`${API_URL}/users/notifications`, { [field]: value }, { withCredentials: true });
    } catch (err) {
      console.error(`Failed to update notification value ${field}:`, err);
    }
  };

  /* ── Privacy Prefs Toggle ──────────────────────────────── */
  const handlePrivacyPrefToggle = async (field) => {
    const newVal = !privacyPrefs[field];
    setPrivacyPrefs(prev => ({ ...prev, [field]: newVal }));
    try {
      await axios.put(`${API_URL}/users/privacy`, { [field]: newVal }, { withCredentials: true });
    } catch (err) {
      console.error(`Failed to save privacy pref ${field}:`, err);
      setPrivacyPrefs(prev => ({ ...prev, [field]: !newVal })); // rollback
    }
  };

  const handlePrivacyRetentionChange = async (value) => {
    setPrivacyPrefs(prev => ({ ...prev, dataRetention: value }));
    try {
      await axios.put(`${API_URL}/users/privacy`, { dataRetention: value }, { withCredentials: true });
    } catch (err) {
      console.error('Failed to save data retention preference:', err);
    }
  };

  /* ── Help & Support Submit ─────────────────────────────── */
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      setSupportError('Please fill in all fields.');
      return;
    }
    setSupportLoading(true);
    setSupportError('');
    try {
      await axios.post(`${API_URL}/auth/send-support-email`, {
        email: profileData.email || '',
        subject: supportForm.subject,
        message: supportForm.message,
      }, { withCredentials: true });
      setSupportSent(true);
      setSupportForm({ subject: '', message: '' });
      setTimeout(() => setSupportSent(false), 5000);
    } catch (err) {
      setSupportError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSupportShortcutClick = (subjectText) => {
    setSupportSent(false);
    setSupportForm({ subject: subjectText, message: '' });
    setTimeout(() => {
      if (lenisRef.current && supportFormRef.current) {
        lenisRef.current.scrollTo(supportFormRef.current, {
          offset: -150,
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else if (supportFormRef.current) {
        supportFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (supportMessageInputRef.current) {
        supportMessageInputRef.current.focus();
      }
    }, 150);
  };


  const triggerAvatarPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Settings: Dispatching open picker triggers');
    const evt = new CustomEvent('open_avatar_picker_direct');
    window.dispatchEvent(evt);
    document.dispatchEvent(evt);
  };

  /* ── Handlers ──────────────────────────────────────── */

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
  };

  /* ── Avatar display helper ─────────────────────────── */
  const renderAvatarContent = (size = 60) => {
    if (avatarConfig?.type === 'image') {
      return (
        <img
          src={avatarConfig.url}
          alt="Avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      );
    }
    if (avatarConfig?.type === 'preset') {
      return (
        <img
          src={avatarConfig.path}
          alt="Avatar Preset"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      );
    }
    return <span style={{ fontSize: size * 0.3, fontWeight: 700, fontFamily: 'Outfit,sans-serif' }}>{getInitials(user?.name || profileData.name)}</span>;
  };

  const getAvatarBg = () => {
    if (avatarConfig?.type === 'preset') return 'rgba(255, 255, 255, 0.04)';
    return 'linear-gradient(135deg, #10b981, #059669)';
  };

  const executeDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/auth/delete`, { withCredentials: true });
      logout();
      navigate('/', { state: { accountDeleted: true }, replace: true });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to delete account.');
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleDisplaySettingChange = (e) => {
    const { name, value } = e.target;
    updateDisplaySettings({ [name]: value });
  };



  /* ── Section renderers ─────────────────────────────── */
  const renderProfileSettings = () => {
    // Milestones definition system
    const milestonesList = [
      {
        id: 'first_saver',
        title: 'First Saver',
        desc: 'Created at least one savings goal target',
        icon: '🌟',
        color: 'rgba(52, 211, 153, 0.1)',
        borderColor: 'rgba(52, 211, 153, 0.2)',
        shadowColor: 'rgba(52, 211, 153, 0.15)',
        completed: goalsCount >= 1
      },
      {
        id: 'perfect_partner',
        title: 'Perfect Partner',
        desc: 'Joined a shared budgeting Circle workspace',
        icon: 'https://img.icons8.com/scribby/50/handshake.png',
        color: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        shadowColor: 'rgba(59, 130, 246, 0.15)',
        completed: circlesCount >= 1
      },
      {
        id: 'budget_guard',
        title: 'Budget Guard',
        desc: 'Verified both phone number and email address',
        icon: 'https://img.icons8.com/scribby/50/shield.png',
        color: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        shadowColor: 'rgba(245, 158, 11, 0.15)',
        completed: !!(profileData.isVerified && profileData.isPhoneVerified)
      },
      {
        id: 'social_connector',
        title: 'Social Connector',
        desc: 'Added 3 or more friends to your workspace',
        icon: 'https://img.icons8.com/scribby/50/megaphone.png',
        color: 'rgba(139, 92, 246, 0.1)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
        shadowColor: 'rgba(139, 92, 246, 0.15)',
        completed: friendsCount >= 3
      },
      {
        id: 'super_planner',
        title: 'Super Planner',
        desc: 'Joined or created 3 or more Circles',
        icon: 'https://img.icons8.com/arcade/64/lightning-bolt.png',
        color: 'rgba(236, 72, 153, 0.1)',
        borderColor: 'rgba(236, 72, 153, 0.2)',
        shadowColor: 'rgba(236, 72, 153, 0.15)',
        completed: circlesCount >= 3
      },
      {
        id: 'wealth_builder',
        title: 'Wealth Builder',
        desc: 'Set up 3 or more active savings targets',
        icon: 'https://img.icons8.com/color/48/money-bag-euro.png',
        color: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        shadowColor: 'rgba(239, 68, 68, 0.15)',
        completed: goalsCount >= 3
      }
    ];

    const completedCount = milestonesList.filter(m => m.completed).length;
    const totalCount = milestonesList.length;

    // Sort: completed first, so they showcase as top 3!
    const sortedMilestones = [...milestonesList].sort((a, b) => {
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return 0;
    });

    const top3Milestones = sortedMilestones.slice(0, 3);

    // Compute Tier based on completed milestones
    let userTier = 'Novice Saver';
    let tierColor = '#94a3b8';
    let nextTierReq = '';

    if (completedCount >= 5) {
      userTier = 'Finance Legend';
      tierColor = '#10b981';
      nextTierReq = 'Max Tier achieved!';
    } else if (completedCount >= 3) {
      userTier = 'Wealth Builder';
      tierColor = '#f59e0b';
      nextTierReq = 'Next Tier at 5 milestones';
    } else if (completedCount >= 1) {
      userTier = 'Budget Partner';
      tierColor = '#3b82f6';
      nextTierReq = 'Next Tier at 3 milestones';
    } else {
      nextTierReq = 'Next Tier at 1 milestone';
    }

    const renderMilestoneIcon = (iconStr, isCompleted, size = '22px') => {
      if (typeof iconStr === 'string' && iconStr.startsWith('http')) {
        return <img src={iconStr} alt="icon" style={{ width: size, height: size, filter: isCompleted ? 'none' : 'grayscale(100%)', objectFit: 'contain' }} />;
      }
      return iconStr;
    };

    return (
      <div className="settings-panel profile-overview-panel">
        <div className="profile-overview-header-wrap">
          <div className="profile-overview-title-group">
            <h3>Profile Overview</h3>
            <p className="panel-subtitle">View and manage your account credentials</p>
          </div>
          <button type="button" className="settings-outline-btn edit-profile-trigger-btn" onClick={openEditModal}>
            <FaPen style={{ marginRight: 6 }} /> Edit Profile
          </button>
        </div>

        {loading ? <Loading message="Loading profile" /> : (
          <div className="profile-overview-content">
            
            {/* Upper Card: Avatar + Name + Username + Joined Date */}
            <div className="profile-hero-card">
              <button 
                type="button" 
                className="profile-hero-avatar-wrap" 
                onClick={() => setShowZoomedAvatar(true)}
                title="View profile picture"
                style={{ background: getAvatarBg() }}
              >
                {renderAvatarContent(96)}
                <span className="hero-avatar-edit-overlay"><FaSearchPlus size={18} /></span>
              </button>
              <div className="profile-hero-meta">
                <div className="profile-hero-name-row">
                  <h4>{profileData.name}</h4>
                  {profileData.isVerified && (
                    <span className="verified-badge" title="Verified Account">
                      <FaCheckCircle size={12} style={{ marginRight: 4 }} /> Verified
                    </span>
                  )}
                </div>
                <span className="profile-hero-username">@{profileData.username || 'username'}</span>
                <span className="profile-hero-joined">
                  <FaCalendarAlt size={12} style={{ marginRight: 5, verticalAlign: 'middle', opacity: 0.7 }} />
                  Member since {profileData.createdAt ? dayjs(profileData.createdAt).format('MMMM YYYY') : 'July 2026'}
                </span>
              </div>
            </div>

            {/* Account Activity Statistics */}
            <div className="profile-stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              width: '100%',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div className="balances-summary-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem',
                margin: 0,
                transform: 'translateZ(0)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '12px'
              }}>
                <img src="https://img.icons8.com/color-glass/48/conference-call.png" alt="circles" style={{ width: '32px', height: '32px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Outfit' }}>{circlesCount}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Active Circles</span>
                </div>
              </div>

              <div className="balances-summary-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem',
                margin: 0,
                transform: 'translateZ(0)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '12px'
              }}>
                <img src="https://img.icons8.com/color-glass/48/handshake.png" alt="friends" style={{ width: '32px', height: '32px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Outfit' }}>{friendsCount}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Friends Linked</span>
                </div>
              </div>

              <div className="balances-summary-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem',
                margin: 0,
                transform: 'translateZ(0)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '12px'
              }}>
                <img src="https://img.icons8.com/color-glass/48/target.png" alt="goals" style={{ width: '32px', height: '32px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Outfit' }}>{goalsCount}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Savings Goals</span>
                </div>
              </div>

              <div className="balances-summary-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem',
                margin: 0,
                transform: 'translateZ(0)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '12px'
              }}>
                <img src="https://img.icons8.com/color-glass/48/guarantee.png" alt="rank" style={{ width: '32px', height: '32px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: tierColor, fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '4px' }}>
                    {userTier}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'Outfit', fontWeight: 500 }}>{nextTierReq}</span>
                </div>
              </div>
            </div>

            {/* Grid for Personal Information */}
            <div className="profile-details-section">
              <h5>Personal Information</h5>
              <div className="profile-info-grid">
                
                <div className="info-row">
                  <div className="info-row-left">
                    <span className="info-icon"><FaUser size={14} /></span>
                    <span className="info-label">Full Name</span>
                  </div>
                  <span className="info-value">{profileData.name}</span>
                </div>

                <div className="info-row">
                  <div className="info-row-left">
                    <span className="info-icon"><FaAt size={14} /></span>
                    <span className="info-label">Username</span>
                  </div>
                  <span className="info-value">@{profileData.username}</span>
                </div>

                <div className="info-row">
                  <div className="info-row-left">
                    <span className="info-icon"><FaEnvelope size={14} /></span>
                    <span className="info-label">Email Address</span>
                  </div>
                  <div className="info-row-right-group">
                    <span className="info-value">{profileData.email}</span>
                    {profileData.isVerified ? (
                      <span className="verified-status-badge verified-status-badge--success" title="Email Verified">
                        <FaCheckCircle size={12} style={{ marginRight: 4 }} /> Verified
                      </span>
                    ) : (
                      <span className="verified-status-badge verified-status-badge--error" title="Email Unverified">
                        <FaExclamationCircle size={12} style={{ marginRight: 4 }} /> Unverified
                      </span>
                    )}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-row-left">
                    <span className="info-icon"><FaPhone size={14} /></span>
                    <span className="info-label">Phone Number</span>
                  </div>
                  <div className="info-row-right-group">
                    <span className="info-value">{profileData.phone || '—'}</span>
                    {profileData.phone ? (
                      profileData.isPhoneVerified ? (
                        <span className="verified-status-badge verified-status-badge--success" title="Phone Number Verified">
                          <FaCheckCircle size={12} style={{ marginRight: 4 }} /> Verified
                        </span>
                      ) : (
                        <button 
                          type="button" 
                          className="verify-action-trigger-btn"
                          onClick={openPhoneVerificationModal}
                          title="Verify phone number with OTP"
                        >
                          Verify Now
                        </button>
                      )
                    ) : null}
                  </div>
                </div>

              </div>
            </div>

            {/* About / Bio section */}
            <div className="profile-about-section">
              <h5>About</h5>
              <div className="profile-bio-container">
                {profileData.bio ? (
                  <p className="profile-bio-text">{profileData.bio}</p>
                ) : (
                  <div className="profile-bio-empty-state">
                    <span className="bio-empty-icon">✍️</span>
                    <p className="profile-bio-empty">No bio added yet. Tell us about yourself by editing your profile!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Achievements & Milestones section */}
            <div className="profile-about-section" style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h5 style={{ margin: 0 }}>Achievements & Milestones</h5>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)', fontFamily: 'Outfit' }}>
                  Completed: {completedCount} / {totalCount}
                </span>
              </div>
              
              {/* Sleek Progress Bar */}
              <div className="profile-progress-bar-track" style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div className="profile-progress-bar-fill" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
              </div>

              {/* Top 3 Prominent Cards */}
              <div className="profile-achievements-list" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                width: '100%',
                marginTop: '0.8rem'
              }}>
                {top3Milestones.map(m => (
                  <div key={m.id} className="profile-achievement-card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    opacity: m.completed ? 1 : 0.45,
                    filter: m.completed ? 'none' : 'grayscale(100%)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: m.completed ? m.color : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${m.completed ? m.borderColor : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      boxShadow: m.completed ? `0 0 10px ${m.shadowColor}` : 'none'
                    }}>
                      {renderMilestoneIcon(m.icon, m.completed, '22px')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="profile-achievement-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: m.completed ? '#f1f5f9' : '#64748b' }}>
                        {m.title} {!m.completed && '🔒'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{m.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* All Milestones List - Tiny Badges Grid */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.75rem' }}>
                  All Milestone Badges
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {milestonesList.map(m => (
                    <div
                      key={m.id}
                      title={`${m.title}: ${m.desc} (${m.completed ? 'Completed' : 'Locked'})`}
                      className="profile-milestone-badge"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: m.completed ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                        border: `1px solid ${m.completed ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)'}`,
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: m.completed ? '#e2e8f0' : '#475569',
                        transition: 'transform 0.2s',
                        cursor: 'help',
                        filter: m.completed ? 'none' : 'grayscale(100%) opacity(40%)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span>{renderMilestoneIcon(m.icon, m.completed, '14px')}</span>
                      <span>{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  };

  const getFriendlyEventName = (evt) => {
    switch (evt) {
      case 'login_success': return 'Successful login';
      case 'login_failed': return 'Failed login attempt';
      case 'google_login_success': return 'Successful login via Google';
      case 'password_changed': return 'Password updated';
      case '2fa_failed': return 'Failed 2FA verification';
      default: return evt;
    }
  };

  const renderAccountSettings = () => {
    return (
      <div className="settings-panel">
        <div className="panel-header">
          <h3>Account &amp; Security</h3>
          <p className="panel-subtitle">Manage your password, sessions, and account security</p>
        </div>

        {/* ── Password ── */}
        <div className="settings-account-row">
          <div className="account-row-info">
            <span className="account-row-title"><FaLock style={{ marginRight: 8, color: '#10b981' }} />Password</span>
            <span className="account-row-desc">Change your login password. Use a strong, unique password.</span>
          </div>
          <button type="button" className="settings-outline-btn" onClick={() => setShowPasswordModal(true)}>
            <FaLock size={13} /> Change Password
          </button>
        </div>

        {/* ── Two-Factor Authentication ── */}
        <div className="settings-security-card">
          <div className="security-card-left">
            <div className={`security-card-icon-wrap ${twoFAEnabled ? 'security-icon-active' : ''}`}>
              <FaShieldAlt size={18} />
            </div>
            <div>
              <span className="security-card-title">Two-Factor Authentication</span>
              <span className="security-card-desc">
                {twoFAEnabled ? 'Your account is protected with Google Authenticator.' : 'Add an extra layer of security to your account.'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: twoFAEnabled ? '#10b981' : '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {twoFAEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <label className="priv-switch" style={{ cursor: twoFALoading ? 'not-allowed' : 'pointer', opacity: twoFALoading ? 0.5 : 1 }}
              onClick={twoFALoading ? undefined : twoFAEnabled ? () => { setTwoFADisableToken(''); setTwoFAError(''); setShow2FADisableModal(true); } : handle2FASetupStart}
            >
              <input type="checkbox" checked={twoFAEnabled} onChange={() => {}} style={{ display: 'none' }} />
              <span className={`priv-switch-track ${twoFAEnabled ? 'on' : ''}`}>
                <span className="priv-switch-thumb" />
              </span>
            </label>
          </div>
        </div>

        {/* ── Active Sessions ── */}
        <div className="security-section">
          <div className="security-section-header">
            <FaGlobe size={14} /><span>Active Sessions</span>
            <span className="security-section-badge">{sessions.length}</span>
          </div>
          {sessionsLoading ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem 0' }}>Loading sessions...</div>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.sessionId} className={`session-card ${session.current ? 'session-current' : ''}`}>
                  <div className="session-device-icon">
                    {session.device.toLowerCase().includes('phone') || session.device.toLowerCase().includes('ios') || session.device.toLowerCase().includes('android') ? (
                      <FaMobile size={16} />
                    ) : (
                      <FaDesktop size={16} />
                    )}
                  </div>
                  <div className="session-info">
                    <div className="session-device-name">
                      {session.device}
                      {session.current && <span className="session-current-badge">Current</span>}
                    </div>
                    <div className="session-meta">
                      <span><FaGlobe size={10} /> {session.browser}</span>
                      <span><FaMapMarkerAlt size={10} /> {session.ip}</span>
                      <span><FaHistory size={10} /> {dayjs(session.lastActive).format('MMM D, YYYY [at] h:mm A')}</span>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="session-revoke-btn" title="Revoke session" onClick={() => handleRevokeSession(session.sessionId)}>
                      <FaTrashAlt size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Login Activity ── */}
        <div className="security-section">
          <div className="security-section-header">
            <FaHistory size={14} /><span>Recent Login Activity</span>
          </div>
          {activityLoading ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem 0' }}>Loading activity...</div>
          ) : (
            <>
              <div className="activity-timeline">
                {(showAllLogins ? loginActivity : loginActivity.slice(0, 5)).map((entry, i) => {
                  const visibleCount = showAllLogins ? loginActivity.length : Math.min(5, loginActivity.length);
                  return (
                    <div key={entry._id} className="activity-entry">
                      <div className={`activity-dot ${entry.success ? 'activity-dot--success' : 'activity-dot--fail'}`} />
                      {i < visibleCount - 1 && <div className="activity-line" />}
                      <div className="activity-content">
                        <div className="activity-event">
                          {entry.success ? <FaCheckCircle size={12} style={{ color: '#10b981' }} /> : <FaExclamationCircle size={12} style={{ color: '#ef4444' }} />}
                          <span className={entry.success ? '' : 'activity-event--fail'}>{getFriendlyEventName(entry.event)}</span>
                        </div>
                        <div className="activity-meta">
                          <span><FaDesktop size={10} /> {entry.device}</span>
                          <span><FaMapMarkerAlt size={10} /> {entry.ip}</span>
                          <span>{dayjs(entry.timestamp).format('MMM D, YYYY [at] h:mm A')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {loginActivity.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAllLogins(!showAllLogins)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10b981',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'Outfit',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {showAllLogins ? 'View Less' : `View More (${loginActivity.length - 5} more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Privacy Controls ── */}
        <div className="security-section">
          <div className="security-section-header">
            <FaEye size={14} /><span>Privacy Controls</span>
          </div>
          <div className="privacy-controls">
            <div className="privacy-row">
              <div className="privacy-row-info">
                <span className="privacy-row-title">Profile Visibility</span>
                <span className="privacy-row-desc">Control who can see your profile</span>
              </div>
              <select className="privacy-select" value={profileVisibility} onChange={e => handlePrivacyChange(e.target.value)}>
                <option value="public">Everyone</option>
                <option value="friends">Friends Only</option>
                <option value="private">Only Me</option>
              </select>
            </div>
            <div className="privacy-row">
              <div className="privacy-row-info">
                <span className="privacy-row-title">Activity Status</span>
                <span className="privacy-row-desc">Show when you were last active</span>
              </div>
              <label className="priv-switch">
                <input type="checkbox" checked={activityVisible} onChange={handleActivityStatusChange} style={{ display: 'none' }} />
                <span className={`priv-switch-track ${activityVisible ? 'on' : ''}`}>
                  <span className="priv-switch-thumb" />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Data Management ── */}
        <div className="security-section">
          <div className="security-section-header">
            <FaFileExport size={14} /><span>Data Management</span>
          </div>
          <div className="data-management-grid">
            <div className="data-action-card" onClick={handleExportData}>
              <div className="data-action-icon data-action-icon--blue"><FaDownload size={16} /></div>
              <div>
                <span className="data-action-title">Export My Data</span>
                <span className="data-action-desc">Download all your transactions, goals, and activity as CSV</span>
              </div>
            </div>
            <div className="data-action-card data-action-card--danger" onClick={() => setShowDeleteModal(true)}>
              <div className="data-action-icon data-action-icon--red"><FaTrashAlt size={16} /></div>
              <div>
                <span className="data-action-title">Delete Account</span>
                <span className="data-action-desc">Permanently erase all your data. This cannot be undone.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  const renderNotifRow = (title, desc, key, Icon, extra = null, disabled = false) => {
    return (
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.25rem',
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          textAlign: 'left',
          transition: 'all 0.22s ease-in-out',
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'default',
          transform: 'translateZ(0)',
          willChange: 'transform, border-color, background-color'
        }}
        className="notif-row-card"
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flex: 1, textAlign: 'left' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <Icon size={16} />
          </div>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="notif-row-title" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.92rem', fontWeight: 600, color: '#e2e8f0', display: 'block', textAlign: 'left' }}>
              {title}
            </span>
            <span className="notif-row-desc" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', textAlign: 'left', lineHeight: '1.4' }}>
              {desc}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
          {extra}
          <label className="priv-switch" style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
            <input
              type="checkbox"
              checked={!!notificationSettings[key]}
              onChange={() => !disabled && handleNotificationToggle(key)}
              disabled={disabled}
              style={{ display: 'none' }}
            />
            <span className={`priv-switch-track ${notificationSettings[key] ? 'on' : ''}`}>
              <span className="priv-switch-thumb" />
            </span>
          </label>
        </div>
      </div>
    );
  };

  const renderNotificationSettings = () => {
    if (notifLoading) {
      return (
        <div className="settings-panel">
          <div className="panel-header" style={{ textAlign: 'left' }}>
            <h3>Notifications</h3>
            <p className="panel-subtitle">Control how FinMate reaches you</p>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' }}>
            Loading notification settings...
          </div>
        </div>
      );
    }

    const highValueExtra = notificationSettings.highValueAlert && (
      <div className="notif-row-limit-container" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px' }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px', fontWeight: 600 }}>₹</span>
        <input
          type="number"
          className="notif-row-limit-input"
          value={notificationSettings.highValueLimit}
          onChange={(e) => handleNotificationValueChange('highValueLimit', Number(e.target.value))}
          style={{
            background: 'none',
            border: 'none',
            color: '#f1f5f9',
            fontSize: '0.82rem',
            fontWeight: 700,
            width: '75px',
            outline: 'none',
            padding: 0
          }}
        />
      </div>
    );

    return (
      <div className="settings-panel" style={{ textAlign: 'left' }}>
        <div className="panel-header" style={{ textAlign: 'left' }}>
          <h3>Notifications</h3>
          <p className="panel-subtitle">Control how FinMate reaches you</p>
        </div>

        {/* ── Transaction & Activity Alerts ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaBell size={14} /><span>Transaction &amp; Activity Alerts</span>
          </div>
          {renderNotifRow(
            'High-Value Transaction Warning',
            'Notify me when a transaction amount exceeds my threshold limit.',
            'highValueAlert',
            FaBell,
            highValueExtra
          )}
          {renderNotifRow(
            'Daily Summary Report',
            "Get a digest of today's spending at the end of each day.",
            'dailySummary',
            FaCalendarAlt
          )}
          {renderNotifRow(
            'Weekly Spend Digest',
            'Receive a weekly deep dive report detailing budget trends and category insights.',
            'weeklyDigest',
            FaFileExport
          )}
        </div>

        {/* ── Budget Limits & Savings Goals ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaShieldAlt size={14} /><span>Budget Limits &amp; Savings Goals</span>
          </div>
          {renderNotifRow(
            'Budget Threshold Warning (80%)',
            'Notify me when any category monthly budget spend crosses 80% utilization.',
            'budgetWarning80',
            FaExclamationTriangle
          )}
          {renderNotifRow(
            'Budget Limit Exceeded (100%)',
            'Send immediate warning when any monthly budget category is fully spent.',
            'budgetWarning100',
            FaLock
          )}
          {renderNotifRow(
            'Savings Goal Milestones',
            'Celebrate milestone achievements when goal savings reach 25%, 50%, 75%, and 100%.',
            'goalMilestone',
            FaCheckCircle
          )}
          {renderNotifRow(
            'Goal Target Deadline Reminders',
            'Remind me when target completion dates for my savings goals are approaching.',
            'goalDeadline',
            FaCalendarAlt
          )}
        </div>

        {/* ── Security Audit Warnings ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaLock size={14} /><span>Security Audit Warnings</span>
          </div>
          {renderNotifRow(
            'New Device Session Notifications',
            'Send me verification alerts when logins occur from unrecognized browsers or operating systems.',
            'sessionAlert',
            FaDesktop
          )}
        </div>

        {/* ── Delivery Channels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaGlobe size={14} /><span>Delivery Channels</span>
          </div>
          {renderNotifRow(
            'Email Notifications',
            `Send alerts directly to ${profileData.email || 'your email address'}.`,
            'emailChannel',
            FaEnvelope
          )}
          {renderNotifRow(
            'Web Push Notifications',
            'Show real-time alerts in my browser window.',
            'pushChannel',
            FaBell
          )}
          {renderNotifRow(
            'SMS Text Alerts',
            profileData.phone ? `Send critical text reminders to ${profileData.phone}.` : 'Add your mobile phone number in profile settings to enable SMS alerts.',
            'smsChannel',
            FaMobile,
            null,
            !profileData.phone
          )}
        </div>
      </div>
    );
  };

  const renderDisplayRow = (title, desc, Icon, selectNode) => {
    return (
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.25rem',
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          textAlign: 'left',
          transition: 'all 0.22s ease-in-out',
          transform: 'translateZ(0)',
          willChange: 'transform, border-color, background-color'
        }}
        className="display-row-card"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flex: 1, textAlign: 'left' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <Icon size={16} />
          </div>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="display-row-title" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.92rem', fontWeight: 600, color: '#e2e8f0', display: 'block', textAlign: 'left' }}>
              {title}
            </span>
            <span className="display-row-desc" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', textAlign: 'left', lineHeight: '1.4' }}>
              {desc}
            </span>
          </div>
        </div>
        <div style={{ flexShrink: 0, marginLeft: '20px' }}>
          {selectNode}
        </div>
      </div>
    );
  };

  const renderDisplaySettings = () => {
    return (
      <div className="settings-panel" style={{ textAlign: 'left' }}>
        <div className="panel-header" style={{ textAlign: 'left' }}>
          <h3>Display Preferences</h3>
          <p className="panel-subtitle">Customize the look and feel of FinMate</p>
        </div>

        {/* ── Theme & Localization ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaEye size={14} /><span>Visual Theme &amp; Locale</span>
          </div>
          
          {renderDisplayRow(
            'Interface Theme',
            'Switch between light mode, dark mode, or follow your system default.',
            FaEye,
            <select name="theme" value={displaySettings.theme} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="system">System Default</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          )}

          {renderDisplayRow(
            'Default Currency',
            'Choose the default currency symbol and conversion rate for balances.',
            FaGlobe,
            <select name="currency" value={displaySettings.currency} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
            </select>
          )}

          {renderDisplayRow(
            'Numeric System Format',
            'Toggle between Lakhs/Crores (Indian System) or Millions (International System).',
            FaCheck,
            <select name="numberFormat" value={displaySettings.numberFormat || 'indian'} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="indian">Indian (Lakhs)</option>
              <option value="international">International</option>
            </select>
          )}
        </div>

        {/* ── Layout & Chart Controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', textAlign: 'left' }}>
          <div className="security-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: '4px', textAlign: 'left' }}>
            <FaDesktop size={14} /><span>Layout &amp; Dashboard Settings</span>
          </div>

          {renderDisplayRow(
            'Sidebar Navigation Layout',
            'Choose between showing full names or a clean, condensed icons sidebar.',
            FaFileExport,
            <select name="sidebarLayout" value={displaySettings.sidebarLayout || 'expanded'} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="expanded">Expanded Menu</option>
              <option value="condensed">Condensed Icons</option>
            </select>
          )}

          {renderDisplayRow(
            'Calendar First Day of Week',
            'Alters how schedules, weekly digests, and chart points start.',
            FaCalendarAlt,
            <select name="firstDayOfWeek" value={displaySettings.firstDayOfWeek || 'monday'} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          )}

          {renderDisplayRow(
            'Dashboard Graph Style',
            'Choose the stroke and fill style of main budget metrics and charts.',
            FaHistory,
            <select name="chartStyle" value={displaySettings.chartStyle || 'gradient'} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="gradient">Filled Gradients</option>
              <option value="outline">Clean Outline</option>
              <option value="bars">Column Bars</option>
            </select>
          )}

          {renderDisplayRow(
            'AI Insights Density',
            'Customize the amount of smart financial recommendations generated on-screen.',
            FaSearchPlus,
            <select name="insightDensity" value={displaySettings.insightDensity || 'rich'} onChange={handleDisplaySettingChange} className="privacy-select" style={{ minWidth: '160px' }}>
              <option value="rich">Rich Detail</option>
              <option value="standard">Brief Summary</option>
              <option value="compact">Data Only</option>
            </select>
          )}
        </div>
      </div>
    );
  };

  /* ── Privacy Tab ────────────────────────────────────────── */
  const renderPrivacySettings = () => {
    const PrivacyRow = ({ icon: Icon, color, title, desc, field }) => {
      const on = privacyPrefs[field];
      return (
        <div className="privacy-switch-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ color, fontSize: '0.95rem' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="privacy-switch-title" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
              <div className="privacy-switch-desc" style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
          <label className="priv-switch" style={{ flexShrink: 0, marginLeft: 20 }}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => handlePrivacyPrefToggle(field)}
              style={{ display: 'none' }}
            />
            <span className={`priv-switch-track ${on ? 'on' : ''}`}>
              <span className="priv-switch-thumb" />
            </span>
          </label>
        </div>
      );
    };

    return (
      <div className="settings-panel" style={{ textAlign: 'left' }}>
        <div className="panel-header" style={{ textAlign: 'left' }}>
          <h3>Privacy Controls</h3>
          <p className="panel-subtitle">Control how FinMate collects, uses, and shares your data</p>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaDatabase size={12}/><span>Data Usage &amp; Collection</span>
          </div>
          <div className="privacy-section-card-wrapper" style={{ borderRadius:14, padding:'0 18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <PrivacyRow icon={FaDatabase} color="#6366f1" field="dataCollection" title="Usage Data Collection" desc="Allow FinMate to collect anonymous usage patterns to improve features and performance." />
            <PrivacyRow icon={FaSlidersH} color="#10b981" field="personalization" title="Personalized Experience" desc="Use your transaction history to generate tailored insights, smart suggestions and goal recommendations." />
            <PrivacyRow icon={FaWifi} color="#f59e0b" field="analyticsOptOut" title="Opt Out of Analytics" desc="Prevent FinMate from sending anonymized analytics events to improve the platform." />
          </div>
        </div>

        <div style={{ marginTop:'1.5rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaUserSecret size={12}/><span>Sharing &amp; Visibility</span>
          </div>
          <div className="privacy-section-card-wrapper" style={{ borderRadius:14, padding:'0 18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <PrivacyRow icon={FaUserSecret} color="#a78bfa" field="adPersonalization" title="Ad Personalization" desc="Allow personalized in-app promotions based on your spending categories and financial goals." />
            <PrivacyRow icon={FaGlobe} color="#f43f5e" field="thirdPartySharing" title="Third-Party Data Sharing" desc="Allow aggregated, anonymized data to be shared with trusted analytics partners. No personal info is ever shared." />
          </div>
        </div>

        <div style={{ marginTop:'1.5rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaHistory size={12}/><span>Data Retention</span>
          </div>
          <div className="privacy-section-card-wrapper" style={{ borderRadius:14, padding:'18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>Transaction History Retention</div>
              <div className="privacy-switch-desc" style={{ fontSize:'0.78rem', color:'#64748b', lineHeight:1.5 }}>How long FinMate retains your transaction history for analytics and insights.</div>
            </div>
            <select className="privacy-select" value={privacyPrefs.dataRetention} onChange={e => handlePrivacyRetentionChange(e.target.value)}>
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="12months">12 Months (Default)</option>
              <option value="24months">24 Months</option>
              <option value="forever">Keep Forever</option>
            </select>
          </div>
        </div>

        <div className="privacy-info-banner" style={{ marginTop:'1.5rem', padding:'16px 18px', borderRadius:12, background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.18)', display:'flex', gap:12, alignItems:'flex-start' }}>
          <FaInfoCircle style={{ color:'#6366f1', fontSize:'0.95rem', marginTop:2, flexShrink:0 }}/>
          <div className="privacy-info-banner-text" style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:1.6 }}>
            <strong className="privacy-info-banner-highlight" style={{ color:'#a5b4fc' }}>Your data stays private.</strong> FinMate never sells personal financial data. All transactions, budgets, and goals are encrypted in transit and at rest. You can export or delete your account data at any time from the <strong className="privacy-info-banner-highlight" style={{ color:'#a5b4fc' }}>Account</strong> tab.
          </div>
        </div>
      </div>
    );
  };

  /* ── Help & Support Tab ─────────────────────────────────── */
  const renderHelpSupport = () => {
    const FAQ_ITEMS = [
      { q:'How do I add a transaction?', a:'Go to the Transactions page and click "Add Transaction". Fill in the amount, category, date and notes, then click Save. Transactions immediately appear in your dashboard and analytics.' },
      { q:'Why are my analytics not showing data?', a:'Analytics require at least one transaction within the selected date range. Ensure your date range covers periods with transactions. If data was just added, change the date range to force a refresh.' },
      { q:'How does the Budget Warning work?', a:'Budget warnings trigger when you reach 80% or 100% of your monthly budget limit. Set your budget in the Budget section. Notification thresholds can be toggled in the Notifications tab.' },
      { q:'Can I invite friends to a Savings Circle?', a:'Yes! Go to Circles, open a circle, and use Invite Member. Your friend needs a FinMate account. Once they accept, you can track shared goals and compare progress together.' },
      { q:'How do I export my financial data?', a:'Settings → Account tab → Export Data. This generates a comprehensive HTML report including all transactions, goals, budgets, and summary statistics — printable as PDF.' },
      { q:'What is Two-Factor Authentication (2FA)?', a:'2FA adds a second security layer. After enabling it in Account settings, you need both your password and a 6-digit code from an authenticator app (Google Authenticator) to sign in.' },
      { q:'How is my data protected?', a:'All data is encrypted in transit (TLS) and at rest. Passwords use bcrypt hashing. Session tokens are HTTP-only cookies. You can review and revoke active sessions any time in the Account tab.' },
    ];
    const SHORTCUTS = [
      { key:'Alt + D', action:'Go to Dashboard' },
      { key:'Alt + T', action:'Go to Transactions' },
      { key:'Alt + A', action:'Go to Analytics' },
      { key:'Alt + B', action:'Go to Budget' },
      { key:'Alt + C', action:'Go to Circles' },
      { key:'Alt + S', action:'Go to Settings' },
      { key:'Alt + P', action:'Go to Profile' },
      { key:'Alt + N', action:'New Transaction (Modal)' },
      { key:'Alt + F', action:'Filter Transactions (Modal)' },
      { key:'Alt + L', action:'Log Out Securely' },
    ];

    return (
      <div className="settings-panel" style={{ textAlign:'left' }}>
        <div className="panel-header" style={{ textAlign:'left' }}>
          <h3>Help &amp; Support</h3>
          <p className="panel-subtitle">Get help, contact our team, or explore shortcuts</p>
        </div>

        {/* Contact Form */}
        <div ref={supportFormRef} style={{ marginTop:'0.75rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaCommentAlt size={12}/><span>Contact Support</span>
          </div>
          <div style={{ borderRadius:14, padding:'20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            {supportSent ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'20px 0', textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'2px solid rgba(16,185,129,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <FaCheckCircle style={{ color:'#10b981', fontSize:'1.4rem' }}/>
                </div>
                <div>
                  <div style={{ fontSize:'0.95rem', fontWeight:700, color:'#10b981', marginBottom:4 }}>Message Sent!</div>
                  <div style={{ fontSize:'0.82rem', color:'#64748b' }}>We will get back to you at <strong className="support-reply-highlight" style={{ color:'#94a3b8' }}>{profileData.email}</strong> within 24–48 hours.</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ fontSize:'0.8rem', color:'#64748b' }}>Replying to: <strong className="support-reply-highlight" style={{ color:'#94a3b8' }}>{profileData.email || 'your account email'}</strong></div>
                {supportError && <div className="settings-alert settings-alert--error" style={{ margin:0 }}>{supportError}</div>}
                <div className="settings-field">
                  <label htmlFor="support-subject">Subject</label>
                  <div className="settings-input-wrapper">
                    <FaQuestionCircle className="input-leading-icon"/>
                    <input id="support-subject" type="text" placeholder="e.g. Transaction sync issue, Feature request..." value={supportForm.subject} onChange={e => setSupportForm(p=>({...p, subject:e.target.value}))} disabled={supportLoading} maxLength={120}/>
                  </div>
                </div>
                <div className="settings-field">
                  <label htmlFor="support-message">Message</label>
                  <textarea ref={supportMessageInputRef} id="support-message" className="settings-textarea" placeholder="Describe your issue or request in detail..." value={supportForm.message} onChange={e => setSupportForm(p=>({...p, message:e.target.value}))} disabled={supportLoading} rows={5} maxLength={2000}/>
                  <div style={{ textAlign:'right', fontSize:'0.72rem', color:'#475569', marginTop:4 }}>{supportForm.message.length}/2000</div>
                </div>
                <button type="submit" className="premium-btn" style={{ alignSelf:'flex-start', padding:'10px 28px', fontSize:'0.875rem', display:'flex', alignItems:'center', gap:8 }} disabled={supportLoading || !supportForm.subject.trim() || !supportForm.message.trim()}>
                  <FaLifeRing/>{supportLoading ? 'Sending...' : 'Send to Support'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop:'1.75rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaQuestionCircle size={12}/><span>Frequently Asked Questions</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item-card ${isOpen ? 'faq-item-card--open' : ''}`} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${isOpen ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`, background:isOpen ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)', transition:'all 0.2s ease' }}>
                  <button onClick={() => setOpenFaq(isOpen ? null : idx)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12 }}>
                    <span className="faq-item-question" style={{ fontSize:'0.86rem', fontWeight:600, color:isOpen ? '#a5b4fc' : 'var(--text-primary)', lineHeight:1.4 }}>{item.q}</span>
                    <span style={{ color:isOpen ? '#6366f1' : '#475569', flexShrink:0, display:'inline-flex', transition:'transform 0.2s ease', transform:isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <FaChevronDown size={13}/>
                    </span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.22, ease:'easeInOut' }} style={{ overflow:'hidden' }}>
                        <div className="faq-item-answer" style={{ padding:'0 16px 14px', fontSize:'0.82rem', color:'#94a3b8', lineHeight:1.7, borderTop:'1px solid rgba(99,102,241,0.12)' }}>
                          <div style={{ paddingTop:10 }}>{item.a}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div style={{ marginTop:'1.75rem' }}>
          <div className="security-section-header" style={{ display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', fontSize:'0.75rem', fontWeight:700, color:'#64748b', letterSpacing:'0.06em', marginBottom:8 }}>
            <FaKeyboard size={12}/><span>Keyboard Shortcuts</span>
          </div>
          <div className="privacy-section-card-wrapper" style={{ borderRadius:14, padding:'8px 18px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            {SHORTCUTS.map((s,i) => (
              <div key={i} className="shortcut-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:i<SHORTCUTS.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span className="shortcut-action" style={{ fontSize:'0.83rem', color:'#94a3b8' }}>{s.action}</span>
                <kbd className="shortcut-key" style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:7, padding:'3px 10px', fontSize:'0.75rem', fontFamily:'JetBrains Mono,monospace', color:'#a5b4fc', letterSpacing:'0.02em' }}>{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="privacy-section-card-wrapper" style={{ marginTop:'1.75rem', borderRadius:14, padding:'16px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <FaInfoCircle style={{ color:'#6366f1' }}/>
              <span style={{ fontSize:'0.875rem', fontWeight:700, color:'var(--text-primary)' }}>FinMate App Info</span>
            </div>
            <div className="app-info-version" style={{ fontSize:'0.78rem', color:'#475569', marginLeft:22 }}>Version 1.0.0 · Built with love for smarter finances</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(244,63,94,0.15)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSupportShortcutClick('Bug Report: ')}
              className="support-btn-bug"
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:'#f43f5e', background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.25)', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}
            >
              <FaBug size={11}/> Report a Bug
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(16,185,129,0.15)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSupportShortcutClick('Feature Suggestion: ')}
              className="support-btn-feature"
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:'#10b981', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}
            >
              <FaStar size={11}/> Suggest a Feature
            </motion.button>
          </div>
        </div>
      </div>
    );
  };

  const currentFullPhone = phoneLocalNumber ? `${phoneCountryCode}${phoneLocalNumber.trim()}` : '';
  const isProfileUnchanged = 
    editProfileData.name === (profileData.name || '') &&
    editProfileData.username === (profileData.username || '') &&
    editProfileData.email === (profileData.email || '') &&
    currentFullPhone === (profileData.phone || '') &&
    editProfileData.bio === (profileData.bio || '');

  /* ── Render ────────────────────────────────────────── */
  return (
    <>
      <main className="settings-content">

        {/* Fixed frosted-glass header */}
        <div className="settings-header">
          <div className="header-banner">
            <div className="header-titles">
              <h2>Settings</h2>
              <span className="header-separator">|</span>
              <p className="header-subtitle">Manage your account and preferences</p>
            </div>
            <div className="header-sync-status">
              <span className="sync-dot" />
              <span className="sync-text">{lastSynced ? `Synced ${formatLastSynced(lastSynced)}` : 'Syncing...'}</span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="settings-layout">

          {/* ── Sidebar ── */}
          <aside className="settings-sidebar">
            {/* Nav */}
            <nav className="settings-nav">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  className={`settings-nav-item ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="nav-icon-wrap"><Icon /></span>
                  <span>{label}</span>
                  {activeTab === id && <span className="nav-active-dot" />}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <button className="settings-logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Log Out</span>
            </button>
          </aside>

          {/* ── Content panel ── */}
          <div className="settings-main">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'profile'       && renderProfileSettings()}
                {activeTab === 'account'       && renderAccountSettings()}
                {activeTab === 'notifications' && renderNotificationSettings()}
                {activeTab === 'display'       && renderDisplaySettings()}
                {activeTab === 'privacy'       && renderPrivacySettings()}
                {activeTab === 'help'          && renderHelpSupport()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div className="premium-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)}>
            <motion.div 
              className="premium-modal-content edit-profile-modal-width" 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: -10 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Edit Profile</h3>
                <p className="panel-subtitle">Update your personal details and profile preset</p>
              </div>

              <form onSubmit={handleSaveChanges} className="premium-modal-body modal-scrollable-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                
                <AnimatePresence>
                  {apiError && (
                    <motion.div className="settings-alert settings-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 8 }}>
                      {apiError}
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div className="settings-alert settings-alert--success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 8 }}>
                      <FaCheck style={{ marginRight: 6 }} />{successMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Avatar Picker section inside Edit Flow */}
                <div className="modal-avatar-picker-row">
                  <button
                    type="button"
                    className="modal-avatar-btn"
                    onClick={triggerAvatarPicker}
                    title="Change avatar"
                    style={{ background: getAvatarBg() }}
                  >
                    {renderAvatarContent(72)}
                    <span className="avatar-edit-overlay"><FaCamera size={14} /></span>
                  </button>
                  <div className="modal-avatar-labels">
                    <span className="modal-avatar-title">Profile Picture</span>
                    <span className="modal-avatar-desc">Click avatar to select preset characters or upload custom photo.</span>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label htmlFor="edit-name">Full Name</label>
                    <div className="settings-input-row">
                      <span className="settings-input-icon"><FaUser /></span>
                      <input 
                        type="text" 
                        id="edit-name" 
                        name="name" 
                        value={editProfileData.name} 
                        onChange={handleEditInputChange} 
                        required 
                        placeholder="Your full name"
                        className="settings-input-field"
                      />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label htmlFor="edit-username">Username</label>
                    <div className="settings-input-row">
                      <span className="settings-input-icon"><FaAt /></span>
                      <input 
                        type="text" 
                        id="edit-username" 
                        name="username" 
                        value={editProfileData.username} 
                        onChange={handleEditInputChange} 
                        required 
                        placeholder="your_username"
                        className="settings-input-field"
                      />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label htmlFor="edit-email">Email Address</label>
                    <div className="settings-input-row">
                      <span className="settings-input-icon"><FaEnvelope /></span>
                      <input 
                        type="email" 
                        id="edit-email" 
                        name="email" 
                        value={editProfileData.email} 
                        onChange={handleEditInputChange} 
                        required 
                        placeholder="you@example.com"
                        className="settings-input-field"
                      />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label htmlFor="edit-phone">Phone Number</label>
                    <div className="phone-input-split-wrapper">
                      <div className="country-code-select-container">
                        <div className="country-code-mockup">
                          <span className="country-code-value">{phoneCountryCode}</span>
                          <span className="country-code-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </span>
                        </div>
                        <select 
                          id="edit-country-code" 
                          value={phoneCountryCode} 
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="country-code-select-hidden"
                          disabled={saveLoading}
                        >
                          {COUNTRY_CODES.map((item) => (
                            <option key={item.label} value={item.code}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="settings-input-row">
                        <span className="settings-input-icon"><FaPhone /></span>
                        <input 
                          type="tel" 
                          id="edit-phone" 
                          value={phoneLocalNumber} 
                          onChange={(e) => setPhoneLocalNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="00000 00000" 
                          disabled={saveLoading}
                          className="settings-input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-field settings-field--full" style={{ marginTop: '0.4rem' }}>
                  <label htmlFor="edit-bio">Bio</label>
                  <textarea 
                    id="edit-bio" 
                    name="bio" 
                    value={editProfileData.bio} 
                    onChange={handleEditInputChange} 
                    placeholder="Tell us a little about yourself..." 
                    rows="5" 
                  />
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '1.25rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowEditModal(false)} disabled={saveLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={saveLoading || isProfileUnchanged}>
                    {saveLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Password Modal ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div className="premium-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="premium-modal-header" style={{ marginBottom: '10px' }}>
                <div className="warning-icon-container" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><FaLock /></div>
                <h3 className="premium-modal-title">Change Password</h3>
              </div>
              {apiError && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{apiError}</p>}
              <form onSubmit={handlePasswordSubmit} className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                  <div className="settings-field" key={field}>
                    <label htmlFor={field}>{field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}</label>
                    <input type="password" id={field} name={field} value={passwordData[field]} onChange={handlePasswordInputChange} placeholder={field === 'currentPassword' ? 'Enter current password' : field === 'newPassword' ? 'Enter new password' : 'Confirm new password'} required />
                  </div>
                ))}
                <div className="premium-modal-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowPasswordModal(false)} disabled={passwordLoading}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#3b82f6', color: 'white' }} disabled={passwordLoading}>{passwordLoading ? 'Updating…' : 'Update Password'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── Delete Modal ── */}
        {showDeleteModal && (
          <motion.div className="premium-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="premium-modal-header">
                <div className="warning-icon-container"><FaExclamationTriangle /></div>
                <h3 className="premium-modal-title">Delete Account</h3>
              </div>
              <div className="premium-modal-body">
                <p>Are you absolutely sure? This action is <strong>permanent</strong> — all your data, transactions, and budgets will be wiped.</p>
              </div>
              <div className="premium-modal-actions">
                <button className="premium-btn premium-btn-cancel" onClick={() => setShowDeleteModal(false)} disabled={loading}>Cancel</button>
                <button className="premium-btn premium-btn-delete" onClick={executeDelete} disabled={loading}>{loading ? 'Deleting…' : 'Yes, Delete Everything'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zoomed Avatar Modal (Instagram-style) ── */}
      <AnimatePresence>
        {showZoomedAvatar && (
          <motion.div 
            className="premium-modal-overlay zoomed-avatar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowZoomedAvatar(false)}
            style={{ zIndex: 10000000 }}
          >
            <motion.div 
              className="zoomed-avatar-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="zoomed-avatar-frame" style={{ background: getAvatarBg() }}>
                {renderAvatarContent(280)}
              </div>
              <div className="zoomed-avatar-meta">
                <span className="zoomed-avatar-name">{profileData.name}</span>
                <span className="zoomed-avatar-username">@{profileData.username}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phone Verification Modal (SaaS OTP flow) ── */}
      <AnimatePresence>
        {showPhoneVerifyModal && (
          <motion.div 
            className="premium-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !verifyLoading && setShowPhoneVerifyModal(false)}
            style={{ zIndex: 10000001 }}
          >
            <motion.div 
              className="premium-modal-content phone-verify-modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="premium-modal-header" style={{ marginBottom: '10px' }}>
                <div className="warning-icon-container" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                  <FaPhone />
                </div>
                <h3 className="premium-modal-title">Verify Phone Number</h3>
              </div>

              {verifyError && (
                <div className="settings-alert settings-alert--error" style={{ marginBottom: 12 }}>
                  {verifyError}
                </div>
              )}

              {verificationStep === 1 ? (
                /* Step 1: Confirm number and send code */
                <form onSubmit={handleSendPhoneOtp} className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p className="modal-description-text" style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                    We will send a 6-digit verification code (OTP) to your phone number. You can verify it by entering the code in the next step.
                  </p>
                  
                  <div className="settings-field">
                    <label htmlFor="verify-phone-input">Phone Number</label>
                    <div className="settings-input-wrapper">
                      <FaPhone className="input-leading-icon" />
                      <input 
                        type="tel" 
                        id="verify-phone-input" 
                        value={verifyPhone} 
                        onChange={(e) => setVerifyPhone(e.target.value)} 
                        placeholder="+91 00000 00000" 
                        required 
                        disabled={verifyLoading}
                      />
                    </div>
                  </div>

                  <div className="premium-modal-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowPhoneVerifyModal(false)} disabled={verifyLoading}>
                      Cancel
                    </button>
                    <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={verifyLoading}>
                      {verifyLoading ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Input OTP code and verify */
                <form onSubmit={handleVerifyPhoneOtp} className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p className="modal-description-text" style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                    Enter the 6-digit verification code sent to <strong>{verifyPhone}</strong>. Check your server terminal/console for the OTP code in this sandbox environment.
                  </p>
                  
                  <div className="settings-field">
                    <label htmlFor="verify-otp-input">Verification Code</label>
                    <div className="settings-input-wrapper">
                      <FaLock className="input-leading-icon" />
                      <input 
                        type="text" 
                        id="verify-otp-input" 
                        value={verifyOtp} 
                        onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        placeholder="123456" 
                        required 
                        maxLength={6}
                        disabled={verifyLoading}
                        style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div className="resend-cooldown-wrapper" style={{ display: 'flex', justifyContent: 'center', fontSize: '0.78rem', marginTop: -4 }}>
                    {resendCooldown > 0 ? (
                      <span style={{ color: '#64748b' }}>Resend code in {resendCooldown}s</span>
                    ) : (
                      <button type="button" className="resend-code-btn" onClick={handleSendPhoneOtp} disabled={verifyLoading} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        Resend Code
                      </button>
                    )}
                  </div>

                  <div className="premium-modal-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setVerificationStep(1)} disabled={verifyLoading}>
                      Back
                    </button>
                    <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={verifyLoading || verifyOtp.length !== 6}>
                      {verifyLoading ? 'Verifying…' : 'Verify & Confirm'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2FA Setup Modal ── */}
      <AnimatePresence>
        {show2FASetupModal && (
          <motion.div
            className="premium-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow2FASetupModal(false)}
          >
            <motion.div
              className="premium-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440 }}
            >
              <div className="premium-modal-header">
                <h3 className="premium-modal-title">Enable 2FA Protection</h3>
                <button className="premium-close-btn" onClick={() => setShow2FASetupModal(false)}><FaTimes /></button>
              </div>

              <div className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p className="modal-description-text" style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Scan the QR code below using your authenticator app (like Google Authenticator or Microsoft Authenticator).
                </p>

                {twoFAError && (
                  <div className="settings-alert settings-alert--error" style={{ margin: 0 }}>
                    {twoFAError}
                  </div>
                )}

                {twoFASetupData.qrCode && (
                  <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: '12px', borderRadius: '12px', width: 'fit-content', margin: '0 auto' }}>
                    <img src={twoFASetupData.qrCode} alt="2FA QR Code" style={{ width: 160, height: 160 }} />
                  </div>
                )}

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>Manual Entry Secret</span>
                  <span style={{ fontSize: '0.85rem', color: '#34d399', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }}>{twoFASetupData.secret}</span>
                </div>

                <form onSubmit={handle2FASetupVerify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="settings-field">
                    <label htmlFor="twofa-verify-token">Verification Code</label>
                    <div className="settings-input-wrapper">
                      <FaLock className="input-leading-icon" />
                      <input
                        type="text"
                        id="twofa-verify-token"
                        value={twoFAVerifyToken}
                        onChange={e => setTwoFAVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required
                        disabled={twoFALoading}
                        style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.05rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div className="premium-modal-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShow2FASetupModal(false)} disabled={twoFALoading}>
                      Cancel
                    </button>
                    <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={twoFALoading || twoFAVerifyToken.length < 6}>
                      {twoFALoading ? 'Enabling…' : 'Activate 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2FA Disable Modal ── */}
      <AnimatePresence>
        {show2FADisableModal && (
          <motion.div
            className="premium-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow2FADisableModal(false)}
          >
            <motion.div
              className="premium-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 400 }}
            >
              <div className="premium-modal-header">
                <h3 className="premium-modal-title">Disable 2FA Protection</h3>
                <button className="premium-close-btn" onClick={() => setShow2FADisableModal(false)}><FaTimes /></button>
              </div>

              <div className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p className="modal-description-text" style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Enter the 6-digit verification code from your authenticator app to disable 2FA protection.
                </p>

                {twoFAError && (
                  <div className="settings-alert settings-alert--error" style={{ margin: 0 }}>
                    {twoFAError}
                  </div>
                )}

                <form onSubmit={handle2FADisable} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="settings-field">
                    <label htmlFor="twofa-disable-token">Verification Code</label>
                    <div className="settings-input-wrapper">
                      <FaLock className="input-leading-icon" />
                      <input
                        type="text"
                        id="twofa-disable-token"
                        value={twoFADisableToken}
                        onChange={e => setTwoFADisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={twoFALoading}
                        style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.05rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div className="premium-modal-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShow2FADisableModal(false)} disabled={twoFALoading}>
                      Cancel
                    </button>
                    <button type="submit" className="premium-btn" style={{ background: '#ef4444', color: 'white' }} disabled={twoFALoading || twoFADisableToken.length < 6}>
                      {twoFALoading ? 'Disabling…' : 'Disable 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Success Toast ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            className="premium-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <span className="toast-icon-check"><FaCheckCircle size={16} /></span>
            <div className="toast-content">
              <span className="toast-title">Success</span>
              <span className="toast-msg">Profile updated successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Settings;
