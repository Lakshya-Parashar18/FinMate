import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import lottie from 'lottie-web';
import aiIconData from '../assets/ai-icon.json';
import {
  FaUsers,
  FaUserPlus,
  FaPlus,
  FaWallet,
  FaTrophy,
  FaSearch,
  FaUser,
  FaLock,
  FaChevronRight,
  FaChartBar,
  FaHistory,
  FaExchangeAlt,
  FaComments,
  FaEdit,
  FaTrash,
  FaUserSlash,
  FaSignOutAlt,
  FaDoorOpen,
  FaAward,
  FaRegBell,
  FaTimesCircle,
  FaCheckCircle,
  FaInfoCircle,
  FaLightbulb,
  FaBullseye,
  FaList,
  FaCog,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaPaperclip,
  FaCoins,
  FaCheck,
  FaTimes,
  FaShieldAlt,
  FaQrcode
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Loading from '../components/Loading';
import './Circles.css';

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return dateInput;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Circles = () => {
  const { user } = useAuth();
  const { formatCurrency: baseFormatCurrency, formatCurrencyRaw: baseFormatCurrencyRaw, currency } = useDisplaySettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset to circles dashboard when sidebar nav link is clicked
  useEffect(() => {
    if (location.state?.resetCircle) {
      setActiveCircleId(null);
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Navigation / Dashboard states
  const [activeCircleId, setActiveCircleId] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('circles'); // 'circles' | 'friends' | 'notifications'
  const [circleTab, setCircleTab] = useState('expenses'); // 'expenses' | 'budgets' | 'savings' | 'challenges' | 'activity' | 'settings'
  const [submitting, setSubmitting] = useState(false);
  const circlesAiIconRef = useRef(null);

  useEffect(() => {
    let anim;
    if (circlesAiIconRef.current) {
      anim = lottie.loadAnimation({
        container: circlesAiIconRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: aiIconData,
      });
    }
    return () => {
      if (anim) anim.destroy();
    };
  }, [circleTab, activeCircleId, submitting]);
  // Data states from real backend
  const [circles, setCircles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modal / overlay states
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // Form states
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  const [newCircleIcon, setNewCircleIcon] = useState('✈');
  const [newCircleTheme, setNewCircleTheme] = useState('#f59e0b');
  const [newCircleMembers, setNewCircleMembers] = useState([]); // selected friend IDs

  // Workspace preferences states
  const [defaultWorkspaceTab, setDefaultWorkspaceTab] = useState('expenses');
  const [budgetWarningPercent, setBudgetWarningPercent] = useState(80);
  const [excludeCategories, setExcludeCategories] = useState({
    Rent: false,
    Stay: false,
    Flights: false,
    Food: false,
  });
  const [enableDailySummary, setEnableDailySummary] = useState(true);
  const [enableSettleReminders, setEnableSettleReminders] = useState(true);
  const [hideCentDecimals, setHideCentDecimals] = useState(false);
  const [minAmountForApproval, setMinAmountForApproval] = useState(0);

  // Custom currency format overrides for hideCentDecimals preference
  const formatCurrency = (value) => {
    let formatted = baseFormatCurrency(value);
    if (hideCentDecimals) {
      formatted = formatted.replace(/\.00$/, '');
    }
    return formatted;
  };

  const formatCurrencyRaw = (value) => {
    let formatted = baseFormatCurrencyRaw(value);
    if (hideCentDecimals) {
      formatted = formatted.replace(/\.00$/, '');
    }
    return formatted;
  };

  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendError, setAddFriendError] = useState('');

  // Add Expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('you');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseSplitType, setExpenseSplitType] = useState('equal'); // 'equal' | 'exact' | 'percentage' | 'shares'
  const [expenseMembers, setExpenseMembers] = useState([]); // list of member IDs in split
  const [expenseSplitsVal, setExpenseSplitsVal] = useState({}); // user id -> share/percentage/value

  // Settle up form state
  const [settleMemberId, setSettleMemberId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  // Contribute savings state
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Add Goal modal state
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');

  // Edit Budget Limit modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  // Delete Confirm modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Circle settings edit state
  const [editCircleName, setEditCircleName] = useState('');
  const [editCircleDesc, setEditCircleDesc] = useState('');
  const [addMemberToCircleId, setAddMemberToCircleId] = useState('');

  // Live user search states in Add Friend modal
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // QR scanner states
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef(null);

  // Global search & notifications
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Phone and email verification blocker states
  const [verificationPhone, setVerificationPhone] = useState(user?.phone || '');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Confetti / Celebration canvas ref
  const canvasRef = useRef(null);
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  // Privacy Settings state (local for "You")
  const [privacySettings, setPrivacySettings] = useState({
    profile: 'friends', // 'public' | 'friends' | 'circles' | 'private'
    budget: 'circles',
    goals: 'circles',
    insights: 'circles',
    savings: 'private',
    spending: 'private',
    activity: 'circles',
    streaks: 'friends'
  });

  // trigger notification toast
  const triggerToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BACKEND API INTEGRATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch all circles, friends, requests
  const fetchAllData = useCallback(async () => {
    try {
      const [circlesRes, friendsRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/circles`),
        axios.get(`${API_URL}/circles/friends`),
        axios.get(`${API_URL}/circles/friends/requests`)
      ]);
      setCircles(circlesRes.data);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error('Error fetching data from API:', err);
      triggerToast('Failed to sync data with server.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    const isAnyModalOpen =
      showCreateCircleModal ||
      showAddFriendModal ||
      showAddGoalModal ||
      showEditBudgetModal ||
      showDeleteConfirmModal ||
      showContributeModal ||
      showSettleModal ||
      showAddExpenseModal ||
      !!selectedFriendProfile;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('lenis-stopped');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('lenis-stopped');
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('lenis-stopped');
    };
  }, [
    showCreateCircleModal,
    showAddFriendModal,
    showAddGoalModal,
    showEditBudgetModal,
    showDeleteConfirmModal,
    showContributeModal,
    showSettleModal,
    showAddExpenseModal,
    selectedFriendProfile
  ]);

  // Fetch single circle details when activeCircleId changes
  const fetchCircleDetails = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`${API_URL}/circles/${id}`);
      setCircles(prev => prev.map(c => c._id === id ? res.data : c));
    } catch (err) {
      console.error('Error fetching circle details:', err);
    }
  }, []);

  // Load workspace preferences from localStorage when activeCircleId changes
  useEffect(() => {
    if (activeCircleId) {
      const stored = localStorage.getItem(`circle_pref_${activeCircleId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setDefaultWorkspaceTab(parsed.defaultTab || 'expenses');
          setBudgetWarningPercent(parsed.warningPercent || 80);
          setExcludeCategories(parsed.excludeCategories || {
            Rent: false,
            Stay: false,
            Flights: false,
            Food: false,
          });
          setEnableDailySummary(parsed.dailySummary !== false);
          setEnableSettleReminders(parsed.settleReminders !== false);
          setHideCentDecimals(!!parsed.hideCentDecimals);
          setMinAmountForApproval(parsed.minAmountForApproval || 0);
        } catch (e) {
          console.error('Error parsing circle settings:', e);
        }
      } else {
        // Reset to defaults
        setDefaultWorkspaceTab('expenses');
        setBudgetWarningPercent(80);
        setExcludeCategories({
          Rent: false,
          Stay: false,
          Flights: false,
          Food: false,
        });
        setEnableDailySummary(true);
        setEnableSettleReminders(true);
        setHideCentDecimals(false);
        setMinAmountForApproval(0);
      }
    }
  }, [activeCircleId]);

  const handleSaveWorkspacePreferences = (e) => {
    if (e) e.preventDefault();
    if (!activeCircleId) return;
    const data = {
      defaultTab: defaultWorkspaceTab,
      warningPercent: budgetWarningPercent,
      excludeCategories,
      dailySummary: enableDailySummary,
      settleReminders: enableSettleReminders,
      hideCentDecimals,
      minAmountForApproval
    };
    localStorage.setItem(`circle_pref_${activeCircleId}`, JSON.stringify(data));
    triggerToast('Workspace preferences updated!');
  };
  // Send OTP to phone
  const handleSendVerificationOtp = async (e) => {
    e.preventDefault();
    if (!verificationPhone.trim()) {
      triggerToast('Phone number is required', 'error');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await axios.post(`${API_URL}/users/send-phone-otp`, {
        phone: verificationPhone
      });
      setIsOtpSent(true);
      triggerToast(res.data.message || 'Verification OTP code sent!');
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Failed to send OTP code', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  // Confirm verification code
  const handleConfirmVerificationOtp = async (e) => {
    e.preventDefault();
    if (!verificationOtp.trim()) {
      triggerToast('OTP code is required', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await axios.post(`${API_URL}/users/verify-phone-otp`, {
        otp: verificationOtp
      });
      triggerToast(res.data.message || 'Phone number verified!');
      setIsOtpSent(false);
      setVerificationOtp('');
      // Refresh Auth Context so that user state is updated (isPhoneVerified: true)
      await checkAuthStatus();
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Invalid OTP code', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Resend email verification
  const handleResendEmailVerification = async () => {
    setResendingEmail(true);
    try {
      const res = await axios.post(`${API_URL}/auth/resend-verification`, {
        email: user?.email
      });
      triggerToast(res.data.message || 'Verification email sent!');
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Failed to resend verification email', 'error');
    } finally {
      setResendingEmail(false);
    }
  };

  const activeCircle = useMemo(() => {
    return circles.find(c => c._id === activeCircleId);
  }, [circles, activeCircleId]);

  // Translate user ID to name (handles 'you')
  const getMemberName = useCallback((id) => {
    if (id === 'you' || id === user?._id) return 'Lakshya (You)';
    const f = friends.find(item => item.id === id || item._id === id);
    if (f) return f.name;
    const circleMember = activeCircle?.members.find(m => m._id === id);
    return circleMember ? circleMember.name : 'Unknown User';
  }, [friends, activeCircle, user]);

  // Translate user ID to short/first name
  const getMemberFirstName = useCallback((id) => {
    if (id === 'you' || id === user?._id) return 'Lakshya';
    const nameStr = getMemberName(id);
    return nameStr.split(' ')[0];
  }, [getMemberName, user]);

  // Translate user ID to Avatar letter
  const getMemberAvatarLetter = useCallback((id) => {
    if (id === 'you' || id === user?._id) return 'L';
    const nameStr = getMemberName(id);
    return nameStr.charAt(0);
  }, [getMemberName, user]);

  // Calculate Net Balances for each member of the active circle
  const memberBalances = useMemo(() => {
    if (!activeCircle) return {};
    const balances = {};
    activeCircle.members.forEach(m => {
      balances[m._id] = 0;
    });

    activeCircle.expenses.forEach(exp => {
      const paidBy = exp.paidById === 'you' ? user?._id : exp.paidById;
      const amount = parseFloat(exp.amount) || 0;

      if (balances[paidBy] !== undefined) {
        balances[paidBy] += amount;
      }

      if (exp.splits) {
        // Handle ES6 Map conversion or standard object keys
        const splitsEntries = exp.splits instanceof Map ? Array.from(exp.splits.entries()) : Object.entries(exp.splits);
        splitsEntries.forEach(([memberId, splitAmt]) => {
          const resolvedMemberId = memberId === 'you' ? user?._id : memberId;
          if (balances[resolvedMemberId] !== undefined) {
            balances[resolvedMemberId] -= parseFloat(splitAmt) || 0;
          }
        });
      }
    });

    return balances;
  }, [activeCircle, user]);

  // Summarize what you owe or are owed in the active circle
  const yourBalanceSummary = useMemo(() => {
    const myId = user?._id;
    const net = memberBalances[myId] || 0;
    let oweTotal = 0;
    let owedTotal = 0;

    if (net < 0) {
      oweTotal = Math.abs(net);
    } else if (net > 0) {
      owedTotal = net;
    }

    return { net, oweTotal, owedTotal };
  }, [memberBalances, user]);

  // Statistics summaries for the dashboard
  const overallStats = useMemo(() => {
    return {
      totalFriends: friends.length,
      activeCircles: circles.length,
      pendingRequests: requests.length,
      sharedGoals: circles.reduce((acc, c) => acc + c.goals.length, 0),
      sharedBudgets: circles.reduce((acc, c) => acc + (c.budget ? 1 : 0), 0)
    };
  }, [friends, circles, requests]);




  // Confetti particles loop
  useEffect(() => {
    if (!isConfettiActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }));

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - index / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      const finished = particles.every(p => p.y > canvas.height);
      if (finished) {
        setIsConfettiActive(false);
      } else {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isConfettiActive]);

  // QR Code Scanner Effect
  useEffect(() => {
    if (isScanning && showAddFriendModal) {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      qrScannerRef.current = html5Qrcode;

      html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          let parsedUsername = decodedText;
          if (decodedText.startsWith('finmate:user:')) {
            parsedUsername = decodedText.split('finmate:user:')[1];
          }
          setAddFriendInput(parsedUsername);
          triggerToast(`Scanned @${parsedUsername}!`);
          stopScanning();
        },
        (errorMessage) => {
          // ignore common scan frame failures
        }
      ).catch(err => {
        console.error('Error starting camera scanner:', err);
        setAddFriendError('Could not access camera. Please check permissions.');
      });
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning, showAddFriendModal]);

  const stopScanning = () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => console.error('Error stopping scanner:', err));
    } else {
      setIsScanning(false);
    }
  };

  // Live user search effect when addFriendInput changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (addFriendInput.trim().length >= 2) {
        setSearchingUsers(true);
        try {
          const res = await axios.get(`${API_URL}/circles/users/search?q=${encodeURIComponent(addFriendInput)}`);
          setUserSearchResults(res.data);
        } catch (err) {
          console.error('Error searching users:', err);
        } finally {
          setSearchingUsers(false);
        }
      } else {
        setUserSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [addFriendInput]);

  // Handle Circle Creation
  const handleCreateCircle = async (e) => {
    e.preventDefault();
    if (!newCircleName.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await axios.post(`${API_URL}/circles`, {
        name: newCircleName,
        description: newCircleDesc,
        icon: newCircleIcon,
        themeColor: newCircleTheme,
        members: newCircleMembers
      });

      setCircles(prev => [res.data, ...prev]);
      setNewCircleName('');
      setNewCircleDesc('');
      setNewCircleMembers([]);
      setShowCreateCircleModal(false);
      triggerToast(`Circle "${res.data.name}" created successfully!`);
    } catch (err) {
      console.error('Error creating circle:', err);
      triggerToast(err.response?.data?.message || 'Failed to create circle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add friend request submission
  const handleAddFriend = async (e) => {
    e.preventDefault();
    setAddFriendError('');
    if (!addFriendInput.trim() || submitting) return;
    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/circles/friends/request`, {
        username: addFriendInput
      });

      triggerToast(`Friend request sent to @${addFriendInput}!`);
      setAddFriendInput('');
      setShowAddFriendModal(false);
      setIsScanning(false);
      fetchAllData();
    } catch (err) {
      console.error('Error sending friend request:', err);
      setAddFriendError(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept/Reject friend request
  const handleRespondRequest = async (requestId, action) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.put(`${API_URL}/circles/friends/request/${requestId}`, { action });
      triggerToast(`Friend request ${action}ed!`);
      fetchAllData();
    } catch (err) {
      console.error('Error responding to request:', err);
      triggerToast('Failed to respond to request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Settle up balances submit
  const handleSettleUpSubmit = async (e) => {
    e.preventDefault();
    if (!settleAmount || parseFloat(settleAmount) <= 0 || !settleMemberId || submitting) return;
    setSubmitting(true);

    const amt = parseFloat(settleAmount);

    try {
      await axios.post(`${API_URL}/circles/${activeCircleId}/expenses`, {
        title: `Settlement to ${getMemberFirstName(settleMemberId)}`,
        amount: amt,
        category: 'Settlement',
        paidById: 'you',
        splitType: 'exact',
        splits: { [settleMemberId]: amt.toFixed(2) },
        members: [user?._id, settleMemberId]
      });

      setShowSettleModal(false);
      setSettleAmount('');
      triggerToast(`Settle up payment of $${amt} recorded!`);
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error settling up:', err);
      triggerToast('Failed to record settlement.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Save collaborative shared expense
  const openExpenseModal = () => {
    if (!activeCircle) return;
    setExpenseTitle('');
    setExpenseAmount('');
    setExpensePaidBy('you');
    setExpenseNotes('');
    setExpenseSplitType('equal');
    setExpenseMembers(activeCircle.members.map(m => m._id));

    const initSplits = {};
    activeCircle.members.forEach(m => {
      initSplits[m._id] = '';
    });
    setExpenseSplitsVal(initSplits);
    setShowAddExpenseModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || expenseMembers.length === 0 || submitting) {
      triggerToast('Please complete all expense fields', 'error');
      return;
    }
    if (excludeCategories[expenseCategory]) {
      triggerToast(`Expenses under "${expenseCategory}" are currently disabled in this workspace settings.`, 'error');
      return;
    }
    setSubmitting(true);

    const total = parseFloat(expenseAmount);
    if (minAmountForApproval > 0 && total > minAmountForApproval) {
      triggerToast(`Notice: This expense exceeds the warning threshold of ${formatCurrency(minAmountForApproval)}.`, 'info');
    }
    let calculatedSplits = {};

    if (expenseSplitType === 'equal') {
      const share = total / expenseMembers.length;
      expenseMembers.forEach(m => {
        calculatedSplits[m] = share.toFixed(2);
      });
    } else if (expenseSplitType === 'exact') {
      let sum = 0;
      expenseMembers.forEach(m => {
        const val = parseFloat(expenseSplitsVal[m]) || 0;
        calculatedSplits[m] = val.toFixed(2);
        sum += val;
      });
      if (Math.abs(sum - total) > 0.05) {
        triggerToast(`Split totals ($${sum.toFixed(2)}) must equal expense amount ($${total.toFixed(2)})`, 'error');
        setSubmitting(false);
        return;
      }
    } else if (expenseSplitType === 'percentage') {
      let sumPct = 0;
      expenseMembers.forEach(m => {
        const pct = parseFloat(expenseSplitsVal[m]) || 0;
        calculatedSplits[m] = ((pct / 100) * total).toFixed(2);
        sumPct += pct;
      });
      if (Math.abs(sumPct - 100) > 0.1) {
        triggerToast('Percentages must total exactly 100%', 'error');
        setSubmitting(false);
        return;
      }
    } else if (expenseSplitType === 'shares') {
      let totalShares = 0;
      expenseMembers.forEach(m => {
        totalShares += parseFloat(expenseSplitsVal[m]) || 0;
      });
      if (totalShares <= 0) {
        triggerToast('Total shares must be greater than zero', 'error');
        setSubmitting(false);
        return;
      }
      expenseMembers.forEach(m => {
        const shares = parseFloat(expenseSplitsVal[m]) || 0;
        calculatedSplits[m] = ((shares / totalShares) * total).toFixed(2);
      });
    }

    try {
      await axios.post(`${API_URL}/circles/${activeCircleId}/expenses`, {
        title: expenseTitle,
        amount: total,
        category: expenseCategory,
        paidById: expensePaidBy,
        splitType: expenseSplitType,
        splits: calculatedSplits,
        members: expenseMembers
      });

      setShowAddExpenseModal(false);
      triggerToast(`Shared expense "${expenseTitle}" recorded!`);
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error saving expense:', err);
      triggerToast('Failed to record shared expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Contribute savings to goal
  const handleSaveContribution = async (e) => {
    e.preventDefault();
    if (!contributeAmount || parseFloat(contributeAmount) <= 0 || submitting) return;
    setSubmitting(true);

    const amt = parseFloat(contributeAmount);
    const targetGoal = activeCircle?.goals.find(g => g.id === selectedGoalId);
    const completedBefore = targetGoal ? targetGoal.current >= targetGoal.target : false;

    try {
      const res = await axios.put(`${API_URL}/circles/${activeCircleId}/goals/${selectedGoalId}`, {
        amount: amt
      });

      setShowContributeModal(false);
      setContributeAmount('');
      triggerToast(`Contributed $${amt} successfully!`);

      // Celebrate if goal is now complete
      const updatedGoal = res.data.goals.find(g => g.id === selectedGoalId);
      if (updatedGoal && updatedGoal.current >= updatedGoal.target && !completedBefore) {
        setIsConfettiActive(true);
      }

      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error contributing to savings:', err);
      triggerToast('Failed to add contribution.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Goal Submit
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalTarget || parseFloat(newGoalTarget) <= 0 || submitting) {
      triggerToast('Please fill in all goal fields', 'error');
      return;
    }
    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/circles/${activeCircleId}/goals`, {
        title: newGoalTitle,
        target: parseFloat(newGoalTarget),
        deadline: newGoalDeadline
      });

      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalDeadline('');
      setShowAddGoalModal(false);
      triggerToast(`Goal "${newGoalTitle}" created!`);
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error creating goal:', err);
      triggerToast('Failed to create savings goal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Budget Limit Submit
  const handleUpdateBudgetLimit = async (e) => {
    e.preventDefault();
    if (!newBudgetLimit || parseFloat(newBudgetLimit) <= 0 || submitting) {
      triggerToast('Please enter a valid budget limit', 'error');
      return;
    }
    setSubmitting(true);
    const limit = parseFloat(newBudgetLimit);

    try {
      await axios.put(`${API_URL}/circles/${activeCircleId}`, {
        themeColor: activeCircle?.themeColor,
        budgetLimit: limit
      });
      setCircles(prev => prev.map(c => {
        if (c._id !== activeCircleId) return c;
        return { ...c, budget: { ...c.budget, limit } };
      }));
      setShowEditBudgetModal(false);
      setNewBudgetLimit('');
      triggerToast(`Budget limit updated to $${limit}!`);
    } catch (err) {
      console.error('Error updating budget:', err);
      triggerToast('Failed to update budget limit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Circle Info
  const handleUpdateCircleInfo = async (e) => {
    e.preventDefault();
    const finalName = editCircleName.trim() !== '' ? editCircleName : activeCircle?.name;
    const finalDesc = editCircleDesc !== '' ? editCircleDesc : (activeCircle?.description || '');

    if (!finalName || !finalName.trim() || submitting) {
      triggerToast('Circle name cannot be empty', 'error');
      return;
    }
    setSubmitting(true);

    try {
      await axios.put(`${API_URL}/circles/${activeCircleId}`, {
        name: finalName.trim(),
        description: finalDesc.trim()
      });
      triggerToast('Circle info updated!');
      setEditCircleName('');
      setEditCircleDesc('');
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error updating circle details:', err);
      triggerToast('Failed to update circle details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Member from Circle
  const handleRemoveMember = async (memberId) => {
    if (memberId === 'you' || memberId === user?._id || submitting) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/circles/${activeCircleId}/members/${memberId}`);
      triggerToast('Member removed from circle.');
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error removing member:', err);
      triggerToast('Failed to remove member.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Member to Circle
  const handleAddMemberToCircle = async () => {
    if (!addMemberToCircleId || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/circles/${activeCircleId}/members`, {
        memberId: addMemberToCircleId
      });
      setAddMemberToCircleId('');
      triggerToast('Friend added to circle!');
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error adding member to circle:', err);
      triggerToast('Failed to add friend to circle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/circles/${activeCircleId}/expenses/${expenseId}`);
      triggerToast('Expense deleted.');
      fetchCircleDetails(activeCircleId);
    } catch (err) {
      console.error('Error deleting expense:', err);
      triggerToast('Failed to delete expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Leave circle
  const handleLeaveCircle = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/circles/${activeCircleId}/leave`);
      setActiveCircleId(null);
      triggerToast('You left the Circle.');
      fetchAllData();
    } catch (err) {
      console.error('Error leaving circle:', err);
      triggerToast('Failed to leave circle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete circle entirely
  const handleDeleteCircle = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/circles/${activeCircleId}`);
      setActiveCircleId(null);
      setShowDeleteConfirmModal(false);
      triggerToast('Circle workspace deleted.');
      fetchAllData();
    } catch (err) {
      console.error('Error deleting circle:', err);
      triggerToast('Failed to delete circle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Friend removal
  const handleRemoveFriend = async (friendId) => {
    try {
      await axios.delete(`${API_URL}/circles/friends/${friendId}`);
      triggerToast('Friend removed.');
      fetchAllData();
    } catch (err) {
      console.error('Error removing friend:', err);
      triggerToast('Failed to remove friend.', 'error');
    }
  };

  // Filtered lists based on search bar queries
  const filteredCircles = useMemo(() => {
    if (!searchQuery.trim()) return circles;
    return circles.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [circles, searchQuery]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    return friends.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  // AI insights generator based on current circle status
  const currentCircleAiInsights = useMemo(() => {
    if (!activeCircle) return [];
    const spentPct = activeCircle.budget ? ((activeCircle.budget.spent / activeCircle.budget.limit) * 100).toFixed(0) : 0;
    const insights = [
      {
        id: 'i1',
        icon: <FaLightbulb />,
        title: 'Spending Cap Warning',
        desc: `Your shared circle budget has reached ${spentPct}% utilization. Monitor upcoming utilities to avoid excess charges.`
      },
      {
        id: 'i2',
        icon: <FaInfoCircle />,
        title: 'Collaboration Rate',
        desc: 'Group members are logging expenses evenly, ensuring standard settling overhead is reduced by 30% this month.'
      }
    ];

    if (activeCircle.budget && activeCircle.budget.spent > activeCircle.budget.limit) {
      insights.unshift({
        id: 'i0',
        icon: <FaTimesCircle style={{ color: '#ef4444' }} />,
        title: 'Budget Breached',
        desc: `The circle budget has exceeded the limit by ${formatCurrency(activeCircle.budget.spent - activeCircle.budget.limit)}. Modify limit inside circle settings.`
      });
    }

    return insights;
  }, [activeCircle]);

  if (loadingData) {
    return <Loading />;
  }

  return (
    <>
      <main className="settings-content circles-container">
        {/* Fixed glass header */}
        <div className="settings-header circles-header">
          <div className="header-banner">
            <div className="header-titles">
              <h2>{activeCircleId ? activeCircle?.name : 'Circles'}</h2>
              <span className="header-separator">|</span>
              <p className="header-subtitle">
                {activeCircleId ? 'Circle workspace & shared insights' : 'Manage shared finances with friends and groups'}
              </p>
            </div>

            <div className="header-actions">
              {activeCircleId ? (
                <button className="circles-header-btn" onClick={() => setActiveCircleId(null)}>
                  <FaArrowLeft style={{ marginRight: 6 }} /> Back to Dashboard
                </button>
              ) : (
                <>
                  <button className="circles-header-btn" onClick={() => setShowCreateCircleModal(true)}>
                    <FaPlus style={{ marginRight: 6 }} /> Create Circle
                  </button>
                  <button
                    className="circles-header-btn info"
                    onClick={() => {
                      setAddFriendInput('');
                      setAddFriendError('');
                      setShowAddFriendModal(true);
                    }}
                  >
                    <FaUserPlus style={{ marginRight: 6 }} /> Add Friend
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inner page content panel */}
        <div className="settings-layout circles-content-wrap">
          {!user?.isVerified && !user?.isPhoneVerified ? (
            /* ──────────────── Strict Verification Lock Screen ──────────────── */
            <div className="balances-summary-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem', transform: 'translateZ(0)' }}>
              <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                  <FaShieldAlt size={32} />
                </div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.5rem 0' }}>Account Verification Required</h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  To ensure community security and prevent spam, collaborative workspaces require verification of either your email or phone number before sending requests, managing budgets, or joining circles.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                {/* Email verification card */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {user?.isVerified ? <FaCheckCircle size={20} style={{ color: '#10b981' }} /> : <FaTimesCircle size={20} style={{ color: '#ef4444' }} />}
                    <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>Email Address</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    Current email: <strong>{user?.email}</strong>
                  </p>
                  {user?.isVerified ? (
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', padding: '8px 12px', borderRadius: 8, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginTop: 'auto' }}>
                      <FaCheck /> Email verified successfully
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                      <button
                        className="verify-action-trigger-btn"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleResendEmailVerification}
                        disabled={resendingEmail}
                      >
                        {resendingEmail ? 'Sending...' : 'Resend Verification Link'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Phone verification card */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {user?.isPhoneVerified ? <FaCheckCircle size={20} style={{ color: '#10b981' }} /> : <FaTimesCircle size={20} style={{ color: '#ef4444' }} />}
                    <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>Phone Number</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    Verify your phone number to receive real-time SMS alerts and notifications.
                  </p>

                  {user?.isPhoneVerified ? (
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', padding: '8px 12px', borderRadius: 8, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginTop: 'auto' }}>
                      <FaCheck /> Phone number verified successfully
                    </div>
                  ) : (
                    <form onSubmit={isOtpSent ? handleConfirmVerificationOtp : handleSendVerificationOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                      {!isOtpSent ? (
                        <div className="settings-field" style={{ margin: 0 }}>
                          <input
                            type="tel"
                            value={verificationPhone}
                            onChange={(e) => setVerificationPhone(e.target.value)}
                            required
                            placeholder="e.g. +919876543210"
                            style={{ background: 'rgba(255,255,255,0.04)', padding: '0.45rem 0.75rem' }}
                          />
                          <button
                            type="submit"
                            className="verify-action-trigger-btn"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                            disabled={sendingOtp}
                          >
                            {sendingOtp ? 'Sending code...' : 'Send Verification Code'}
                          </button>
                        </div>
                      ) : (
                        <div className="settings-field" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Enter 6-digit OTP code sent to phone:</label>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <input
                              type="text"
                              maxLength={6}
                              value={verificationOtp}
                              onChange={(e) => setVerificationOtp(e.target.value)}
                              required
                              placeholder="123456"
                              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', padding: '0.45rem 0.75rem', textAlign: 'center', letterSpacing: 4, fontWeight: 700 }}
                            />
                            <button
                              type="submit"
                              className="verify-action-trigger-btn"
                              disabled={verifyingOtp}
                            >
                              {verifyingOtp ? 'Confirming...' : 'Verify Code'}
                            </button>
                          </div>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}
                            onClick={() => setIsOtpSent(false)}
                          >
                            Change phone number
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : !activeCircleId ? (
            /* ──────────────── Circles Dashboard View ──────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', gridColumn: 'span 2' }}>

              {/* Stats Row */}
              <div className="circles-stats-grid">
                <div className="circles-stat-card">
                  <div className="circles-stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><FaUsers /></div>
                  <span className="circles-stat-val">{overallStats.activeCircles}</span>
                  <span className="circles-stat-lbl">Active Circles</span>
                </div>
                <div className="circles-stat-card">
                  <div className="circles-stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><FaUser /></div>
                  <span className="circles-stat-val">{overallStats.totalFriends}</span>
                  <span className="circles-stat-lbl">Total Friends</span>
                </div>
                <div className="circles-stat-card">
                  <div className="circles-stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><FaRegBell /></div>
                  <span className="circles-stat-val">{overallStats.pendingRequests}</span>
                  <span className="circles-stat-lbl">Friend Requests</span>
                </div>
                <div className="circles-stat-card">
                  <div className="circles-stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><FaBullseye /></div>
                  <span className="circles-stat-val">{overallStats.sharedGoals}</span>
                  <span className="circles-stat-lbl">Shared Goals</span>
                </div>
              </div>

              {/* Navigation Tabs for Dashboard */}
              <div className="circle-tab-nav" style={{ maxWidth: '400px' }}>
                <button className={`circle-tab-btn ${dashboardTab === 'circles' ? 'active' : ''}`} onClick={() => setDashboardTab('circles')}>
                  <FaUsers /> Circles
                </button>
                <button className={`circle-tab-btn ${dashboardTab === 'friends' ? 'active' : ''}`} onClick={() => setDashboardTab('friends')}>
                  <FaUser /> Friends
                </button>
                <button className={`circle-tab-btn ${dashboardTab === 'notifications' ? 'active' : ''}`} onClick={() => setDashboardTab('notifications')}>
                  <FaRegBell /> Notifications {requests.length > 0 && <span style={{ padding: '1px 5px', background: '#ef4444', borderRadius: '4px', fontSize: 10, color: 'white', marginLeft: 4 }}>{requests.length}</span>}
                </button>
              </div>

              {/* Global search */}
              <div className="search-users-bar" style={{ marginBottom: '1rem' }}>
                <div className="search-input-wrap">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    className="search-input-box"
                    placeholder={dashboardTab === 'circles' ? 'Search circles by title...' : 'Search friends by @username...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {dashboardTab === 'circles' && (
                <>
                  <div className="circles-section-header">
                    <h3>👥 My Collaborative Circles</h3>
                  </div>
                  {filteredCircles.length === 0 ? (
                    <div className="circles-empty-state">
                      <div className="circles-empty-icon"><FaUsers /></div>
                      <span className="circles-empty-title">No Circles Created Yet</span>
                      <span className="circles-empty-desc">Form your first collaborative budgeting circle with friends to start splitting bills and saving.</span>
                      <button className="circles-empty-btn" onClick={() => setShowCreateCircleModal(true)}>Create a Circle</button>
                    </div>
                  ) : (
                    <div className="circles-card-grid">
                      {filteredCircles.map(c => {
                        const usagePct = c.budget ? Math.min(((c.budget.spent / c.budget.limit) * 100), 100) : 0;
                        const activeGoal = c.goals[0];
                        return (
                          <div key={c._id} className="circle-card" onClick={() => {
                            setActiveCircleId(c._id);
                            const stored = localStorage.getItem(`circle_pref_${c._id}`);
                            let defaultTab = 'expenses';
                            if (stored) {
                              try { defaultTab = JSON.parse(stored).defaultTab || 'expenses'; } catch (e) {}
                            }
                            setCircleTab(defaultTab);
                          }} style={{ transform: 'translateZ(0)' }}>
                            <div className="circle-card-cover" style={{ background: c.themeColor }} />
                            <div className="circle-card-body">
                              <div className="circle-card-meta">
                                <div className="circle-card-title-wrap">
                                  <span className="circle-card-title">{c.name}</span>
                                  <span className="circle-card-members-badge">{c.members.length} members</span>
                                </div>
                                <div className="circle-card-avatar" style={{ background: `${c.themeColor}1a`, color: c.themeColor }}>
                                  {c.icon}
                                </div>
                              </div>

                              {c.budget && (
                                <div className="circle-card-budget-section">
                                  <div className="circle-card-budget-lbl-row">
                                    <span>Shared Budget</span>
                                    <span className="circle-card-budget-amount">{formatCurrency(c.budget.spent)} / {formatCurrency(c.budget.limit)}</span>
                                  </div>
                                  <div className="circle-card-progress-bar-bg">
                                    <div className="circle-card-progress-bar-fill" style={{ width: `${usagePct}%`, background: c.themeColor }} />
                                  </div>
                                </div>
                              )}

                              {activeGoal && (
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', marginTop: 8 }}>
                                  🎯 Goal: {activeGoal.title} ({Math.round((activeGoal.current / activeGoal.target) * 100)}%)
                                </div>
                              )}

                              <div className="circle-card-recent-activity" style={{ marginTop: 10 }}>
                                <span className="circle-card-activity-dot" style={{ background: c.themeColor }} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {c.activity[0]?.message || 'No recent activity'}
                                </span>
                              </div>
                            </div>
                            <span className="circle-card-last-active">{formatTimeAgo(c.updatedAt || c.lastActive)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {dashboardTab === 'friends' && (
                <>
                  <div className="circles-section-header">
                    <h3>👥 Friends List</h3>
                    <button className="verify-action-trigger-btn" style={{ fontSize: '0.76rem', padding: '4px 10px' }} onClick={() => setShowAddFriendModal(true)}>
                      + Add Friend
                    </button>
                  </div>
                  {filteredFriends.length === 0 ? (
                    <div className="circles-empty-state">
                      <div className="circles-empty-icon"><FaUser /></div>
                      <span className="circles-empty-title">No Friends Added Yet</span>
                      <span className="circles-empty-desc">Search other FinMate users by @username to start collaborating.</span>
                    </div>
                  ) : (
                    <div className="friends-cards-grid">
                      {filteredFriends.map(f => (
                        <div key={f._id} className="friend-card-premium" style={{ transform: 'translateZ(0)' }}>
                          <span className={`friend-card-status-indicator ${f.status}`} />
                          <div className="friend-card-avatar">
                            {f.name.charAt(0)}
                          </div>
                          <div className="friend-card-meta">
                            <span className="friend-card-name">{f.name}</span>
                            <span className="friend-card-uname">@{f.username}</span>
                          </div>
                          <span className="friend-card-mutuals">{f.mutualCircles} mutual circles</span>
                          <div className="friend-card-actions">
                            <button className="friend-action-btn view" onClick={() => setSelectedFriendProfile(f)}>
                              Profile
                            </button>
                            <button className="friend-action-btn remove" onClick={() => handleRemoveFriend(f._id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {dashboardTab === 'notifications' && (
                <>
                  <div className="circles-section-header">
                    <h3>🔔 Friend & Circle Invitations</h3>
                  </div>
                  {requests.length === 0 ? (
                    <div className="circles-empty-state">
                      <div className="circles-empty-icon"><FaRegBell /></div>
                      <span className="circles-empty-title">No New Notifications</span>
                      <span className="circles-empty-desc">Any invitations to circles or friend requests will show up here.</span>
                    </div>
                  ) : (
                    <div className="friend-requests-grid">
                      {requests.map(req => (
                        <div key={req._id} className="friend-request-card" style={{ transform: 'translateZ(0)' }}>
                          <div className="friend-req-info">
                            <div className="friend-req-avatar">{req.name.charAt(0)}</div>
                            <div className="friend-req-names">
                              <span className="friend-req-name">{req.name}</span>
                              <span className="friend-req-uname">@{req.username}</span>
                            </div>
                          </div>
                          <div className="friend-req-actions">
                            <button className="friend-req-btn accept" onClick={() => handleRespondRequest(req._id, 'accept')}>
                              <FaCheckCircle />
                            </button>
                            <button className="friend-req-btn reject" onClick={() => handleRespondRequest(req._id, 'reject')}>
                              <FaTimesCircle />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ──────────────── Circle Detailed Workspace View ──────────────── */
            <div className="circle-detail-container" style={{ gridColumn: 'span 2' }}>
              {/* Circle banner block */}
              <div className="circle-detail-banner" style={{ borderLeft: `5px solid ${activeCircle?.themeColor}` }}>
                <div className="circle-detail-title-block">
                  <div className="circle-detail-avatar" style={{ background: `${activeCircle?.themeColor}1a`, color: activeCircle?.themeColor }}>
                    {activeCircle?.icon}
                  </div>
                  <div className="circle-detail-name-wrap">
                    <h3 className="circle-detail-name">{activeCircle?.name}</h3>
                    <p className="circle-detail-desc">{activeCircle?.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="circles-header-btn" onClick={openExpenseModal}>
                    <FaPlus style={{ marginRight: 6 }} /> Add Expense
                  </button>
                  <button className="circles-header-btn secondary" onClick={() => setShowSettleModal(true)}>
                    <FaExchangeAlt style={{ marginRight: 6 }} /> Settle Up
                  </button>
                </div>
              </div>

              {/* Sub tabs navigation */}
              <div className="circle-tab-nav">
                <button className={`circle-tab-btn ${circleTab === 'expenses' ? 'active' : ''}`} onClick={() => setCircleTab('expenses')}>
                  <FaExchangeAlt /> Expenses & Balances
                </button>
                <button className={`circle-tab-btn ${circleTab === 'budgets' ? 'active' : ''}`} onClick={() => setCircleTab('budgets')}>
                  <FaWallet /> Budgets
                </button>
                <button className={`circle-tab-btn ${circleTab === 'savings' ? 'active' : ''}`} onClick={() => setCircleTab('savings')}>
                  <FaBullseye /> Savings Goals
                </button>
                <button className={`circle-tab-btn ${circleTab === 'challenges' ? 'active' : ''}`} onClick={() => setCircleTab('challenges')}>
                  <FaTrophy /> Group Challenges
                </button>
                <button className={`circle-tab-btn ${circleTab === 'analytics' ? 'active' : ''}`} onClick={() => setCircleTab('analytics')}>
                  <FaChartBar /> Analytics
                </button>
                <button className={`circle-tab-btn ${circleTab === 'activity' ? 'active' : ''}`} onClick={() => setCircleTab('activity')}>
                  <FaHistory /> Activity Log
                </button>
                <button className={`circle-tab-btn ${circleTab === 'settings' ? 'active' : ''}`} onClick={() => setCircleTab('settings')}>
                  <FaCog /> Settings
                </button>
              </div>

              {/* ── Tabs content sections ── */}

              {circleTab === 'expenses' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/external-flaticons-lineal-color-flat-icons/64/external-expenses-accounting-flaticons-lineal-color-flat-icons-10.png"
                        alt="expenses"
                        style={{ width: '22px', height: '22px' }}
                      />
                      Expenses & Balances
                    </h3>
                  </div>
                  <div className="circle-expenses-layout">
                    {/* Left: Expenses log */}
                    <div className="expenses-log-section">
                      {activeCircle?.expenses.length === 0 ? (
                        <div className="circles-empty-state">
                          <div className="circles-empty-icon"><FaExchangeAlt /></div>
                          <span className="circles-empty-title">No Expenses Yet</span>
                          <span className="circles-empty-desc">Split your first bill by clicking on Add Expense. Splits are computed automatically!</span>
                          <button className="circles-empty-btn" onClick={openExpenseModal}>Add First Expense</button>
                        </div>
                      ) : (
                        activeCircle?.expenses.map(exp => {
                          const paidByName = getMemberFirstName(exp.paidById);
                          const isSettlement = exp.category === 'Settlement';

                          // Handle exact split mapping from model
                          const rawSplits = exp.splits instanceof Map ? Object.fromEntries(exp.splits) : exp.splits;
                          const mySplit = parseFloat(rawSplits && (rawSplits['you'] || rawSplits[user?._id])) || 0;
                          const didIPay = exp.paidById === 'you' || exp.paidById === user?._id;

                          let splitTxt = '';
                          let splitClass = 'none';
                          if (didIPay) {
                            const lentAmount = exp.amount - mySplit;
                            if (lentAmount > 0) {
                              splitTxt = `You lent ${formatCurrency(lentAmount)}`;
                              splitClass = 'owed';
                            } else {
                              splitTxt = 'You paid';
                            }
                          } else {
                            if (mySplit > 0) {
                              splitTxt = `You owe ${formatCurrency(mySplit)}`;
                              splitClass = 'owe';
                            } else {
                              splitTxt = 'Not involved';
                            }
                          }

                          return (
                            <div key={exp.id} className="expense-item-row" style={{ transform: 'translateZ(0)' }}>
                              <div className="expense-left-side">
                                <div className="expense-cat-icon">
                                  {isSettlement ? <FaCheckCircle style={{ color: '#10b981' }} /> : <FaCoins />}
                                </div>
                                <div className="expense-title-wrap">
                                  <span className="expense-title">{exp.title}</span>
                                  <span className="expense-meta-info">
                                    Paid by <strong>{paidByName}</strong> on {exp.date} &bull; {exp.splitType}
                                  </span>
                                </div>
                              </div>
                              <div className="expense-right-side">
                                <div className="expense-amount-block">
                                  <span className="expense-total-amount">{formatCurrency(exp.amount)}</span>
                                  <span className="expense-paid-by">Total amount</span>
                                </div>
                                <div className="expense-my-split">
                                  <span className={`expense-split-val ${splitClass}`}>{splitTxt}</span>
                                  <span className="expense-split-lbl">Balance</span>
                                </div>
                                <button
                                  title="Delete expense"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="expense-delete-btn"
                                  disabled={submitting}
                                >
                                  <FaTrash style={{ pointerEvents: 'none' }} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right: Balances summary */}
                    <div className="balances-summary-card" style={{ transform: 'translateZ(0)' }}>
                      <div className="circles-section-header" style={{ marginBottom: 0 }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src="https://img.icons8.com/parakeet/48/weight-care.png"
                            alt="balances"
                            style={{ width: '20px', height: '20px' }}
                          />
                          Balances Summary
                        </h4>
                      </div>

                      <div className="balances-total-row">
                        <div className="balance-item">
                          <span className="balance-item-lbl">You owe</span>
                          <span className="balance-item-val owe">{formatCurrency(yourBalanceSummary.oweTotal)}</span>
                        </div>
                        <div className="balance-item">
                          <span className="balance-item-lbl">You are owed</span>
                          <span className="balance-item-val owed">{formatCurrency(yourBalanceSummary.owedTotal)}</span>
                        </div>
                      </div>

                      <div className="balances-member-list">
                        {activeCircle?.members.map(m => {
                          const bal = memberBalances[m._id] || 0;
                          const avatarVal = getMemberAvatarLetter(m._id);
                          const displayNet = bal.toFixed(2);
                          const isPositive = bal > 0.01;
                          const isNegative = bal < -0.01;

                          return (
                            <div key={m._id} className="balances-member-row">
                              <div className="balances-member-info">
                                <div className="balances-member-avatar">{avatarVal}</div>
                                <span className="balances-member-name">{getMemberName(m._id)}</span>
                              </div>
                              <span className={`balances-member-net ${isPositive ? 'positive' : isNegative ? 'negative' : 'zero'}`}>
                                {isPositive ? `+ ${formatCurrency(bal)}` : isNegative ? `- ${formatCurrency(Math.abs(bal))}` : 'Settle'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <button className="settle-up-btn" onClick={() => setShowSettleModal(true)}>
                        Settle Up Balances
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {circleTab === 'budgets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/ultraviolet/40/budget.png"
                        alt="budget"
                        style={{ width: '22px', height: '22px' }}
                      />
                      Shared Budget & Insights
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="balances-summary-card" style={{ width: '100%', transform: 'translateZ(0)' }}>
                      {activeCircle?.budget ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            {/* Monthly Limit */}
                            <div className="budget-stat-premium-card" style={{ borderTop: `4px solid ${activeCircle?.themeColor || '#f59e0b'}`, transform: 'translateZ(0)' }}>
                              <button
                                onClick={() => { setNewBudgetLimit(String(activeCircle.budget.limit)); setShowEditBudgetModal(true); }}
                                title="Edit budget limit"
                                className="budget-edit-btn-premium"
                              >
                                <FaEdit style={{ marginRight: 3 }} /> Edit
                              </button>
                              <div className="budget-stat-header">
                                <div className="budget-stat-icon-wrap" style={{ color: activeCircle?.themeColor || '#f59e0b', background: `${activeCircle?.themeColor || '#f59e0b'}15` }}>
                                  <FaWallet size={14} />
                                </div>
                                <span className="budget-stat-lbl">Monthly Limit</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '0.75rem' }}>
                                <span className="budget-stat-val">{formatCurrency(activeCircle.budget.limit)}</span>
                              </div>
                            </div>

                            {/* Current Spent */}
                            <div className="budget-stat-premium-card" style={{ borderTop: `4px solid ${activeCircle.budget.spent > activeCircle.budget.limit ? '#ef4444' : '#3b82f6'}`, transform: 'translateZ(0)' }}>
                              <div className="budget-stat-header">
                                <div className="budget-stat-icon-wrap" style={{ color: activeCircle.budget.spent > activeCircle.budget.limit ? '#ef4444' : '#3b82f6', background: activeCircle.budget.spent > activeCircle.budget.limit ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)' }}>
                                  <FaCoins size={14} />
                                </div>
                                <span className="budget-stat-lbl">Current Spent</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '0.75rem' }}>
                                <span className="budget-stat-val" style={{ color: activeCircle.budget.spent > activeCircle.budget.limit ? '#ef4444' : '#f1f5f9' }}>
                                  {formatCurrency(activeCircle.budget.spent)}
                                </span>
                              </div>
                            </div>

                            {/* Remaining Balance */}
                            <div className="budget-stat-premium-card" style={{ borderTop: '4px solid #10b981', transform: 'translateZ(0)' }}>
                              <div className="budget-stat-header">
                                <div className="budget-stat-icon-wrap" style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)' }}>
                                  <FaCheckCircle size={14} />
                                </div>
                                <span className="budget-stat-lbl">Remaining Balance</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '0.75rem' }}>
                                <span className="budget-stat-val" style={{ color: '#10b981' }}>
                                  {formatCurrency(Math.max(activeCircle.budget.limit - activeCircle.budget.spent, 0))}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress utilization */}
                          <div className="budget-premium-progress-box">
                            <div className="budget-progress-meta-row">
                              <span className="budget-progress-meta-lbl">Monthly Budget Utilization</span>
                              <span className="budget-progress-percentage-badge" style={{ color: activeCircle.budget.spent > activeCircle.budget.limit ? '#ef4444' : '#10b981' }}>
                                {Math.round((activeCircle.budget.spent / activeCircle.budget.limit) * 100)}% Used
                              </span>
                            </div>
                            <div className="circle-card-progress-bar-bg" style={{ height: 10, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, overflow: 'hidden' }}>
                              <div
                                className="circle-card-progress-bar-fill"
                                style={{
                                  width: `${Math.min((activeCircle.budget.spent / activeCircle.budget.limit) * 100, 100)}%`,
                                  background: activeCircle.budget.spent > activeCircle.budget.limit ? '#ef4444' : activeCircle.themeColor,
                                  height: 10,
                                  borderRadius: 10,
                                  boxShadow: activeCircle.budget.spent > activeCircle.budget.limit ? '0 0 10px rgba(239,68,68,0.3)' : `0 0 10px ${activeCircle.themeColor}33`
                                }}
                              />
                            </div>
                          </div>

                          {/* Category breakdown */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#f1f5f9', marginBottom: '1rem', fontWeight: 700, letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img
                                src="https://img.icons8.com/pulsar-color/48/category.png"
                                alt="category"
                                style={{ width: '18px', height: '18px' }}
                              />
                              Category Spending Breakdown
                            </h4>
                            {activeCircle.budget.breakdown && activeCircle.budget.breakdown.length > 0 ? (
                              <div className="category-breakdown-list-wrapper">
                                {activeCircle.budget.breakdown.map((item, index) => {
                                  const percent = activeCircle.budget.limit > 0 ? Math.min((item.value / activeCircle.budget.limit) * 100, 100) : 0;
                                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];
                                  const color = colors[index % colors.length];
                                  return (
                                    <div key={item.name} className="category-breakdown-item">
                                      <div className="category-breakdown-top-row">
                                        <div className="category-tag-wrap">
                                          <div className="category-tag-color-indicator" style={{ background: color }} />
                                          <span className="category-name-txt">{item.name}</span>
                                        </div>
                                        <span className="category-value-txt">
                                          {formatCurrency(item.value)}
                                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                                            ({Math.round(percent)}%)
                                          </span>
                                        </span>
                                      </div>
                                      <div className="category-mini-progress-bg">
                                        <div className="category-mini-progress-fill" style={{ background: color, width: `${percent}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="category-breakdown-empty-card">
                                <div className="category-empty-icon-wrap">
                                  <FaCoins size={28} />
                                </div>
                                <h5 className="category-empty-title">No spending logged this month</h5>
                                <p className="category-empty-desc">
                                  Add transactions in the <strong>Expenses & Balances</strong> tab, and they'll automatically populate this category-wise breakdown.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="circles-empty-state">
                          <span className="circles-empty-title">No Budget Set</span>
                          <span className="circles-empty-desc">Create a monthly limit to receive insights.</span>
                        </div>
                      )}
                    </div>

                    <div className="ai-insights-panel">
                      <div className="ai-insights-header" style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'visible' }}>
                        <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'visible', marginLeft: '-6px', marginRight: '-4px' }}>
                          <div ref={circlesAiIconRef} style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                        </div>
                        <h4 style={{ margin: 0 }}>Circles FinSense AI Insights</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {currentCircleAiInsights.map(insight => (
                          <div key={insight.id} className="ai-insight-card">
                            <div className="ai-insight-icon-wrap">{insight.icon}</div>
                            <div className="ai-insight-content">
                              <span className="ai-insight-title">{insight.title}</span>
                              <span className="ai-insight-desc">{insight.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {circleTab === 'savings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/pieces/64/goal.png"
                        alt="goals"
                        style={{ width: '22px', height: '22px' }}
                      />
                      Shared Savings Goals
                    </h3>
                    <button className="verify-action-trigger-btn" onClick={() => { setNewGoalTitle(''); setNewGoalTarget(''); setNewGoalDeadline(''); setShowAddGoalModal(true); }}>
                      <FaPlus style={{ marginRight: 6 }} /> New Goal
                    </button>
                  </div>
                  {activeCircle?.goals.length === 0 ? (
                    <div className="circles-empty-state">
                      <div className="circles-empty-icon"><FaBullseye /></div>
                      <span className="circles-empty-title">No Savings Goals</span>
                      <span className="circles-empty-desc">Set collaborative targets for vacations, assets, or events.</span>
                    </div>
                  ) : (
                    <div className="goals-tab-grid">
                      {activeCircle?.goals.map(goal => {
                        const progressPct = Math.min((goal.current / goal.target) * 100, 100);
                        const isCompleted = goal.current >= goal.target;
                        return (
                          <div key={goal.id} className="goal-card-premium" style={{ borderLeft: `4px solid ${isCompleted ? '#10b981' : activeCircle.themeColor}`, transform: 'translateZ(0)' }}>
                            <div className="goal-header-row">
                              <div className="goal-title-block">
                                <span className="goal-title-txt">{goal.title}</span>
                                <span className="goal-deadline-txt">Target date: {goal.deadline}</span>
                              </div>
                              <span className="goal-emoji-icon">{isCompleted ? '🎉' : '🎯'}</span>
                            </div>

                            <div className="goal-amount-block">
                              <span className="goal-amt-lbl">Raised:</span>
                              <span className="goal-amt-val">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</span>
                            </div>

                            <div className="goal-progress-section">
                              <div className="circle-card-progress-bar-bg">
                                <div className="circle-card-progress-bar-fill" style={{ width: `${progressPct}%`, background: isCompleted ? '#10b981' : activeCircle.themeColor }} />
                              </div>
                              <span className="goal-progress-percentage" style={{ color: isCompleted ? '#10b981' : '#94a3b8' }}>
                                {progressPct.toFixed(0)}% Saved
                              </span>
                            </div>

                            <button
                              className="goal-contribute-btn"
                              onClick={() => {
                                setSelectedGoalId(goal.id);
                                setShowContributeModal(true);
                              }}
                              disabled={isCompleted}
                            >
                              {isCompleted ? 'Target Achieved' : 'Contribute Cash'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {circleTab === 'challenges' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/scribby/50/trophy.png"
                        alt="challenges"
                        style={{ width: '22px', height: '22px' }}
                      />
                      Group Challenges & Badges
                    </h3>
                  </div>
                  <div className="circle-challenges-layout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {activeCircle?.challenges.length === 0 ? (
                        <div className="circles-empty-state">
                          <div className="circles-empty-icon"><FaTrophy /></div>
                          <span className="circles-empty-title">No Active Challenges</span>
                          <span className="circles-empty-desc">Create saving/spending challenges to gamify group finance in settings soon!</span>
                        </div>
                      ) : (
                        activeCircle?.challenges.map(ch => (
                          <div key={ch.id} className="challenge-details-card" style={{ transform: 'translateZ(0)' }}>
                            <div className="challenge-title-row">
                              <div className="challenge-icon"><FaAward /></div>
                              <div className="challenge-title-info">
                                <span className="challenge-title-txt">{ch.title}</span>
                                <span className="challenge-desc-txt">{ch.description}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <h4 style={{ fontSize: '0.82rem', color: '#e2e8f0', margin: 0, fontWeight: 700 }}>Leaderboard Rankings</h4>
                              <div className="challenge-rankings-list">
                                {ch.rankings.map((rank, i) => {
                                  const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                                  return (
                                    <div key={rank.name} className="ranking-member-row">
                                      <div className="ranking-member-left">
                                        <span className={`ranking-position ${posClass}`}>#{rank.position}</span>
                                        <span className="ranking-name">{rank.name}</span>
                                      </div>
                                      <span className="ranking-score">{formatCurrency(rank.score)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="balances-summary-card" style={{ transform: 'translateZ(0)' }}>
                      <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src="https://img.icons8.com/arcade/64/medal.png"
                          alt="achievements"
                          style={{ width: '20px', height: '20px' }}
                        />
                        Group Achievements
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                          Earn badges by hitting saving targets, settling debts early, or reducing monthly shopping.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="achievement-badge-card" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <FaAward style={{ color: '#10b981' }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="achievement-badge-title" style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>Saver</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Top contributors</span>
                            </div>
                          </div>
                          <div className="achievement-badge-card" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <FaAward style={{ color: '#3b82f6' }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="achievement-badge-title" style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>Planner</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Budget trackers</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {circleTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/arcade/64/graph.png"
                        alt="analytics"
                        style={{ width: '24px', height: '24px' }}
                      />
                      Spending Trends & Analytics
                    </h3>
                    <span style={{
                      fontSize: '0.7rem',
                      fontFamily: 'Outfit',
                      fontWeight: 600,
                      color: '#94a3b8',
                      background: 'rgba(148,163,184,0.08)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>This Circle</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                      {/* Monthly Trends */}
                      <div className="balances-summary-card" style={{
                        transform: 'translateZ(0)',
                        borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                        boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <img
                              src="https://img.icons8.com/color-glass/48/graph.png"
                              alt="spending trends"
                              style={{ width: '22px', height: '22px' }}
                            />
                            Shared Spending Trends
                          </h4>
                          <div style={{ width: '40px', height: '2px', borderRadius: '2px', background: `linear-gradient(90deg, transparent, ${activeCircle?.themeColor || '#6366f1'}, transparent)` }} />
                        </div>
                        <div style={{ width: '100%', height: 200, marginTop: '0.5rem' }}>
                          {activeCircle?.budget.history && activeCircle.budget.history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={activeCircle.budget.history}>
                                <defs>
                                  <linearGradient id="spendColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeCircle?.themeColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={activeCircle?.themeColor} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="month" stroke="#475569" fontSize={11} />
                                <YAxis stroke="#475569" fontSize={11} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                      <div style={{
                                        background: 'rgba(15, 23, 42, 0.92)',
                                        backdropFilter: 'blur(12px)',
                                        border: `1px solid rgba(255,255,255,0.08)`,
                                        borderLeft: `3px solid ${activeCircle?.themeColor || '#6366f1'}`,
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontFamily: 'Outfit',
                                        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 12px ${activeCircle?.themeColor || '#6366f1'}33`,
                                        minWidth: '110px'
                                      }}>
                                        <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: activeCircle?.themeColor || '#6366f1' }}>
                                          ₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}
                                        </p>
                                        <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#64748b' }}>total spent</p>
                                      </div>
                                    );
                                  }}
                                />
                                <Area type="monotone" dataKey="spent" stroke={activeCircle?.themeColor} strokeWidth={2} fillOpacity={1} fill="url(#spendColor)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                              <span style={{ fontSize: '1.5rem' }}>📉</span>
                              <span style={{ color: '#475569', fontSize: '0.78rem', fontFamily: 'Outfit' }}>Not enough spending history data.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Category distribution */}
                      <div className="balances-summary-card" style={{
                        transform: 'translateZ(0)',
                        borderTop: '2px solid #f59e0b',
                        boxShadow: '0 0 20px rgba(245,158,11,0.13), 0 4px 24px rgba(0,0,0,0.3)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <img
                              src="https://img.icons8.com/external-kmg-design-flat-kmg-design/32/external-Distribution-supply-chain-kmg-design-flat-kmg-design.png"
                              alt="category distribution"
                              style={{ width: '22px', height: '22px' }}
                            />
                            Category Distribution
                          </h4>
                          <div style={{ width: '40px', height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
                        </div>
                        <div style={{ width: '100%', height: 200, marginTop: '0.5rem' }}>
                          {activeCircle?.budget.breakdown && activeCircle.budget.breakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={activeCircle.budget.breakdown}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {activeCircle.budget.breakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontFamily: 'Outfit' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                              <span style={{ fontSize: '1.5rem' }}>🗂️</span>
                              <span style={{ color: '#475569', fontSize: '0.78rem', fontFamily: 'Outfit' }}>Add expenses to see category details.</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {circleTab === 'activity' && (() => {
                const dotColorMap = { green: '#10b981', blue: '#3b82f6', purple: '#8b5cf6', yellow: '#f59e0b', red: '#ef4444' };
                const typeLabelMap = { expense: 'Expense', goal: 'Goal', budget: 'Alert', member: 'Member', system: 'System' };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                    <div className="circles-section-header">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <img
                          src="https://img.icons8.com/stickers/100/clock--v1.png"
                          alt="activity"
                          style={{ width: '24px', height: '24px' }}
                        />
                        Circle Activity History
                      </h3>
                      <span style={{
                        fontSize: '0.7rem',
                        fontFamily: 'Outfit',
                        fontWeight: 600,
                        color: '#94a3b8',
                        background: 'rgba(148,163,184,0.08)',
                        border: '1px solid rgba(148,163,184,0.15)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>{activeCircle?.activity.length || 0} events</span>
                    </div>
                    <div className="circle-activity-timeline-container" style={{
                      width: '100%',
                      transform: 'translateZ(0)',
                      borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                      boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`,
                      background: 'rgba(15,23,42,0.6)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}>
                      {activeCircle?.activity.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '10px' }}>
                          <span style={{ fontSize: '2rem' }}>📭</span>
                          <span style={{ color: '#475569', fontSize: '0.82rem', fontFamily: 'Outfit' }}>No activity logs yet.</span>
                        </div>
                      ) : (
                        activeCircle?.activity.map(act => {
                          let formattedMsg = act.message.replace(
                            /\$(\d+(?:\.\d+)?)/g,
                            (_, num) => formatCurrencyRaw(parseFloat(num))
                          );
                          formattedMsg = formattedMsg.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️🎉🔔]+\s*/u, '');

                          const dotColor = dotColorMap[act.color] || '#475569';
                          const typeLabel = typeLabelMap[act.type] || 'Info';

                          const typeIcon = act.type === 'expense'
                            ? <img src="https://img.icons8.com/color/48/split-money--v2.png" alt="expense" style={{ width: '18px', height: '18px' }} />
                            : act.type === 'budget'
                            ? <img src="https://img.icons8.com/matisse/100/error.png" alt="alert" style={{ width: '18px', height: '18px' }} />
                            : act.type === 'system'
                            ? <img src="https://img.icons8.com/arcade/64/bell.png" alt="system" style={{ width: '18px', height: '18px' }} />
                            : <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                                {act.type === 'goal' ? '🎯' : act.type === 'member' ? '👤' : '📌'}
                              </span>;

                          return (
                            <div key={act.id} className="circle-activity-item-row" style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '0.75rem 1rem',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderLeft: `3px solid ${dotColor}`,
                              borderRadius: '10px',
                              transition: 'background 0.2s',
                              cursor: 'default',
                              boxShadow: `inset 0 0 20px ${dotColor}08`
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            >
                              {/* Icon badge */}
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: `${dotColor}18`,
                                border: `1px solid ${dotColor}30`,
                                boxShadow: `0 0 10px ${dotColor}22`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {typeIcon}
                              </div>

                              {/* Message */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="circle-activity-msg" style={{ margin: 0, fontFamily: 'Outfit', fontSize: '0.87rem', fontWeight: 500, color: '#e2e8f0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formattedMsg}
                                </p>
                              </div>

                              {/* Type badge */}
                              <span style={{
                                fontSize: '0.65rem',
                                fontFamily: 'Outfit',
                                fontWeight: 700,
                                color: dotColor,
                                background: `${dotColor}18`,
                                border: `1px solid ${dotColor}30`,
                                borderRadius: '20px',
                                padding: '2px 8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                flexShrink: 0
                              }}>{typeLabel}</span>

                              {/* Time chip */}
                              <span className="circle-activity-time-chip" style={{
                                fontSize: '0.7rem',
                                fontFamily: 'Outfit',
                                fontWeight: 500,
                                color: '#94a3b8',
                                background: 'rgba(148,163,184,0.1)',
                                border: '1px solid rgba(148,163,184,0.25)',
                                borderRadius: '20px',
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                letterSpacing: '0.02em'
                              }}>{formatTimeAgo(act.time)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {circleTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div className="circles-section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <img
                        src="https://img.icons8.com/dusk/64/settings.png"
                        alt="settings"
                        style={{ width: '24px', height: '24px' }}
                      />
                      Circle Workspace Settings
                    </h3>
                  </div>

                  <div className="circles-settings-grid-layout" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '1.5rem',
                    width: '100%',
                    alignItems: 'start'
                  }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Name & Description */}
                      <div className="balances-summary-card" style={{
                        width: '100%',
                        transform: 'translateZ(0)',
                        borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                        boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`
                      }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src="https://img.icons8.com/color-glass/48/edit-property.png" alt="info" style={{ width: '20px', height: '20px' }} />
                          Circle Info
                        </h4>
                        <form onSubmit={handleUpdateCircleInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="settings-field">
                            <label style={{ textAlign: 'left', display: 'block' }}>Circle Name</label>
                            <input
                              type="text"
                              value={editCircleName !== '' ? editCircleName : (activeCircle?.name || '')}
                              onChange={(e) => setEditCircleName(e.target.value)}
                              onFocus={() => { if (editCircleName === '') setEditCircleName(activeCircle?.name || ''); }}
                              placeholder="Circle name"
                            />
                          </div>
                          <div className="settings-field">
                            <label style={{ textAlign: 'left', display: 'block' }}>Description</label>
                            <input
                              type="text"
                              value={editCircleDesc !== '' ? editCircleDesc : (activeCircle?.description || '')}
                              onChange={(e) => setEditCircleDesc(e.target.value)}
                              onFocus={() => { if (editCircleDesc === '') setEditCircleDesc(activeCircle?.description || ''); }}
                              placeholder="What is this circle for?"
                            />
                          </div>
                          <button type="submit" className="verify-action-trigger-btn" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
                            {submitting ? 'Saving...' : '💾 Save Changes'}
                          </button>
                        </form>
                      </div>

                      {/* Theme Color */}
                      <div className="balances-summary-card" style={{
                        width: '100%',
                        transform: 'translateZ(0)',
                        borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                        boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`
                      }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src="https://img.icons8.com/color-glass/48/palette.png" alt="theme" style={{ width: '20px', height: '20px' }} />
                          Theme Color
                        </h4>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'].map(color => (
                            <button
                              key={color}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: color,
                                border: activeCircle?.themeColor === color ? '3px solid white' : '3px solid transparent',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: activeCircle?.themeColor === color ? `0 0 12px ${color}80` : 'none',
                                transform: activeCircle?.themeColor === color ? 'scale(1.1)' : 'scale(1)'
                              }}
                              disabled={submitting}
                              onClick={async () => {
                                if (submitting) return;
                                setSubmitting(true);
                                try {
                                  await axios.put(`${API_URL}/circles/${activeCircleId}`, {
                                    name: activeCircle.name,
                                    themeColor: color
                                  });
                                  triggerToast('Theme color updated!');
                                  fetchCircleDetails(activeCircleId);
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Workspace Preferences */}
                      <div className="balances-summary-card" style={{
                        width: '100%',
                        transform: 'translateZ(0)',
                        borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                        boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`
                      }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src="https://img.icons8.com/color-glass/48/toggle-on.png" alt="pref" style={{ width: '20px', height: '20px' }} />
                          Workspace Preferences
                        </h4>
                        <form onSubmit={handleSaveWorkspacePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div className="settings-field">
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', textAlign: 'left' }}>Default Landing View</label>
                            <select
                              value={defaultWorkspaceTab}
                              onChange={(e) => setDefaultWorkspaceTab(e.target.value)}
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'Outfit', textAlign: 'left' }}
                            >
                              <option value="expenses">Expenses (Default)</option>
                              <option value="budgets">Budgets</option>
                              <option value="savings">Savings & Goals</option>
                              <option value="activity">Activity timeline</option>
                            </select>
                          </div>

                          <div className="settings-field">
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', textAlign: 'left' }}>Budget Warning Threshold ({budgetWarningPercent}%)</label>
                            <select
                              value={budgetWarningPercent}
                              onChange={(e) => setBudgetWarningPercent(Number(e.target.value))}
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'Outfit', textAlign: 'left' }}
                            >
                              <option value={50}>50% of budget limit</option>
                              <option value={75}>75% of budget limit</option>
                              <option value={80}>80% of budget limit</option>
                              <option value={90}>90% of budget limit</option>
                              <option value={100}>100% of budget limit</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', alignItems: 'stretch', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', display: 'block' }}>Feature Toggles</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', textAlign: 'left' }}>Daily Summary Reports</span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'left' }}>Send daily summary reports to members</span>
                              </div>
                              <label className="premium-switch">
                                <input type="checkbox" checked={enableDailySummary} onChange={(e) => setEnableDailySummary(e.target.checked)} />
                                <span className="premium-slider" />
                              </label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', textAlign: 'left' }}>Settlement Reminders</span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'left' }}>Remind members weekly about open dues</span>
                              </div>
                              <label className="premium-switch">
                                <input type="checkbox" checked={enableSettleReminders} onChange={(e) => setEnableSettleReminders(e.target.checked)} />
                                <span className="premium-slider" />
                              </label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', textAlign: 'left' }}>Hide Decimal Cents</span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'left' }}>Remove trailing .00 decimals from currency</span>
                              </div>
                              <label className="premium-switch">
                                <input type="checkbox" checked={hideCentDecimals} onChange={(e) => setHideCentDecimals(e.target.checked)} />
                                <span className="premium-slider" />
                              </label>
                            </div>
                          </div>

                          <div className="settings-field" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', textAlign: 'left' }}>Expense Warning Threshold (₹)</label>
                            <input
                              type="number"
                              value={minAmountForApproval > 0 ? minAmountForApproval : ''}
                              onChange={(e) => setMinAmountForApproval(Number(e.target.value))}
                              placeholder="e.g. 5000 (0 for no warning)"
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'Outfit', textAlign: 'left' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', alignItems: 'stretch', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', display: 'block' }}>Block Circle Categories</span>
                            
                            {Object.keys(excludeCategories).map((cat) => (
                              <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', textAlign: 'left' }}>Disable "{cat}" purchases</span>
                                <label className="premium-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={excludeCategories[cat]} 
                                    onChange={(e) => setExcludeCategories(prev => ({ ...prev, [cat]: e.target.checked }))} 
                                  />
                                  <span className="premium-slider" />
                                </label>
                              </div>
                            ))}
                          </div>

                          <button type="submit" className="verify-action-trigger-btn" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                            💾 Save Preferences
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Member Management */}
                      <div className="balances-summary-card" style={{
                        width: '100%',
                        transform: 'translateZ(0)',
                        borderTop: `2px solid ${activeCircle?.themeColor || '#6366f1'}`,
                        boxShadow: `0 0 20px ${activeCircle?.themeColor || '#6366f1'}22, 0 4px 24px rgba(0,0,0,0.3)`
                      }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src="https://img.icons8.com/color-glass/48/conference-call.png" alt="members" style={{ width: '20px', height: '20px' }} />
                          Member Management
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {activeCircle?.members.map(m => (
                            <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', border: `1px solid ${activeCircle?.themeColor}40` }}>
                                  {getMemberAvatarLetter(m._id)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>{getMemberName(m._id)}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{m._id === user?._id ? 'Admin (You)' : 'Member'}</span>
                                </div>
                              </div>
                              {m._id !== user?._id && (
                                <button
                                  onClick={() => handleRemoveMember(m._id)}
                                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', fontSize: '0.72rem', padding: '4px 10px', fontWeight: 600 }}
                                >
                                  <FaUserSlash style={{ marginRight: 4 }} /> Remove
                                </button>
                              )}
                            </div>
                          ))}

                          {friends.filter(f => !activeCircle?.members.some(m => m._id === f._id)).length > 0 && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <select
                                value={addMemberToCircleId}
                                onChange={e => setAddMemberToCircleId(e.target.value)}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'Outfit' }}
                              >
                                <option value="">-- Add a friend to circle --</option>
                                {friends.filter(f => !activeCircle?.members.some(m => m._id === f._id)).map(f => (
                                  <option key={f._id} value={f._id}>{f.name} (@{f.username})</option>
                                ))}
                              </select>
                              <button
                                onClick={handleAddMemberToCircle}
                                className="verify-action-trigger-btn"
                                disabled={!addMemberToCircleId}
                              >
                                <FaUserPlus style={{ marginRight: 4 }} /> Add
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div className="balances-summary-card" style={{
                        width: '100%',
                        borderColor: 'rgba(239,68,68,0.15)',
                        transform: 'translateZ(0)',
                        borderTop: '2px solid #ef4444',
                        boxShadow: '0 0 20px rgba(239,68,68,0.11), 0 4px 24px rgba(0,0,0,0.3)'
                      }}>
                        <h4 style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#ef4444', fontSize: '0.95rem', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src="https://img.icons8.com/color-glass/48/box-important.png" alt="danger" style={{ width: '20px', height: '20px' }} />
                          Danger Zone
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1rem 0' }}>These actions are irreversible. Proceed with caution.</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <button
                            className="settle-up-btn"
                            style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            onClick={handleLeaveCircle}
                          >
                            <FaSignOutAlt style={{ marginRight: 6 }} /> Leave Circle
                          </button>
                          <button
                            className="settle-up-btn"
                            style={{ background: '#ef4444', color: 'white' }}
                            onClick={() => setShowDeleteConfirmModal(true)}
                          >
                            <FaTrash style={{ marginRight: 6 }} /> Delete Circle Workspace
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Overlay Modals ── */}
      <AnimatePresence>

        {/* Create Circle modal */}
        {showCreateCircleModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateCircleModal(false)}>
            <motion.div className="premium-modal-content edit-profile-modal-width" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Create Collaborative Circle</h3>
                <p className="panel-subtitle">Initiate a shared budgeting workspace with your friends</p>
              </div>

              <form onSubmit={handleCreateCircle} className="premium-modal-body modal-scrollable-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="circle-name">Circle Name</label>
                  <input type="text" id="circle-name" value={newCircleName} onChange={(e) => setNewCircleName(e.target.value)} required placeholder="e.g. Goa Trip, Roommates, Family" />
                </div>

                <div className="settings-field">
                  <label htmlFor="circle-desc">Description</label>
                  <input type="text" id="circle-desc" value={newCircleDesc} onChange={(e) => setNewCircleDesc(e.target.value)} placeholder="What is this circle for?" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="settings-field">
                    <label htmlFor="circle-icon">Icon / Emoji</label>
                    <select id="circle-icon" value={newCircleIcon} onChange={(e) => setNewCircleIcon(e.target.value)}>
                      <option value="✈">✈ Trip</option>
                      <option value="🏠">🏠 House</option>
                      <option value="❤️">❤️ Couple</option>
                      <option value="👨‍👩‍👧‍👦">👨‍👩‍👧‍👦 Family</option>
                      <option value="🤝">🤝 Friend</option>
                      <option value="🎉">🎉 Event</option>
                      <option value="🍔">🍔 Food</option>
                    </select>
                  </div>
                  <div className="settings-field">
                    <label htmlFor="circle-theme">Theme Color</label>
                    <select id="circle-theme" value={newCircleTheme} onChange={(e) => setNewCircleTheme(e.target.value)}>
                      <option value="#f59e0b">Amber Gold</option>
                      <option value="#10b981">Emerald Green</option>
                      <option value="#3b82f6">Sapphire Blue</option>
                      <option value="#ec4899">Pink Rose</option>
                      <option value="#8b5cf6">Purple Amethyst</option>
                    </select>
                  </div>
                </div>

                <div className="settings-field">
                  <label>Select Members</label>
                  <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {friends.map(f => (
                      <label key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newCircleMembers.includes(f._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCircleMembers(prev => [...prev, f._id]);
                            } else {
                              setNewCircleMembers(prev => prev.filter(id => id !== f._id));
                            }
                          }}
                        />
                        {f.name} (@{f.username})
                      </label>
                    ))}
                  </div>
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '1rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowCreateCircleModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Add Friend modal */}
        {showAddFriendModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddFriendModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Add Friend</h3>
                <p className="panel-subtitle">Search registered FinMate users by @username or scan a QR code</p>
              </div>

              <form onSubmit={handleAddFriend} className="premium-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {addFriendError && <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: 0 }}>{addFriendError}</p>}

                <div className="settings-field">
                  <label htmlFor="friend-search">Enter Username</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      id="friend-search"
                      value={addFriendInput}
                      onChange={(e) => setAddFriendInput(e.target.value)}
                      required
                      placeholder="e.g. rahul_k"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="verify-action-trigger-btn"
                      style={{ background: isScanning ? '#ef4444' : 'rgba(255,255,255,0.05)', color: isScanning ? 'white' : '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                      onClick={() => {
                        setIsScanning(!isScanning);
                        setAddFriendError('');
                      }}
                    >
                      <FaQrcode style={{ marginRight: 4 }} /> {isScanning ? 'Stop' : 'Scan'}
                    </button>
                  </div>
                </div>

                {/* QR Scanner Live Element */}
                {isScanning && (
                  <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#000', width: '100%', height: 240, position: 'relative' }}>
                    <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
                  </div>
                )}

                {/* Show Search results */}
                {searchingUsers && <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>Searching users...</div>}
                {!searchingUsers && userSearchResults.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Suggested Users:</span>
                    {userSearchResults.map(u => (
                      <div
                        key={u._id}
                        onClick={() => {
                          setAddFriendInput(u.username);
                          setUserSearchResults([]);
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>{u.name} (<strong>@{u.username}</strong>)</span>
                        <FaChevronRight size={10} style={{ color: '#64748b' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Show own QR Code so friends can scan you */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 15, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Your Personal QR Code</span>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=f1f5f9&bgcolor=0f172a&data=${encodeURIComponent(`finmate:user:${user?.username}`)}`}
                    alt="My QR Code"
                    style={{ borderRadius: 8, width: 140, height: 140, border: '4px solid #1e293b' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>@{user?.username}</span>
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowAddFriendModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Add Expense modal */}
        {showAddExpenseModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddExpenseModal(false)}>
            <motion.div className="premium-modal-content edit-profile-modal-width" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Split Shared Bill</h3>
                <p className="panel-subtitle">Select splits types and record transaction</p>
              </div>

              <form onSubmit={handleSaveExpense} className="premium-modal-body modal-scrollable-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="exp-title">Description / Title</label>
                  <input type="text" id="exp-title" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} required placeholder="e.g. Airbnb stay deposit, grocery shopping" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="settings-field">
                    <label htmlFor="exp-amount">Amount ({currency === 'INR' ? '₹' : '$'})</label>
                    <input type="number" step="0.01" id="exp-amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required placeholder="0.00" />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="exp-paid">Paid By</label>
                    <select id="exp-paid" value={expensePaidBy} onChange={(e) => setExpensePaidBy(e.target.value)}>
                      <option value="you">Lakshya (You)</option>
                      {activeCircle?.members.filter(m => m._id !== user?._id).map(m => (
                        <option key={m._id} value={m._id}>{getMemberName(m._id)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="settings-field">
                    <label htmlFor="exp-cat">Category</label>
                    <select id="exp-cat" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                      <option value="Food">Food</option>
                      <option value="Rent">Rent</option>
                      <option value="Stay">Stay</option>
                      <option value="Flights">Flights</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                  <div className="settings-field">
                    <label htmlFor="exp-notes">Notes / Receipt</label>
                    <input type="text" id="exp-notes" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} placeholder="Add note or link" />
                  </div>
                </div>

                <div className="split-config-section">
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Split Configuration</span>

                  <div className="split-type-tabs">
                    {['equal', 'exact', 'percentage', 'shares'].map(t => (
                      <button key={t} type="button" className={`split-type-btn ${expenseSplitType === t ? 'active' : ''}`} onClick={() => setExpenseSplitType(t)}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="split-members-list">
                    {activeCircle?.members.map(m => {
                      const involved = expenseMembers.includes(m._id);
                      return (
                        <div key={m._id} className="split-member-input-row">
                          <label className="split-member-checkbox-label">
                            <input
                              type="checkbox"
                              checked={involved}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExpenseMembers(prev => [...prev, m._id]);
                                } else {
                                  setExpenseMembers(prev => prev.filter(id => id !== m._id));
                                }
                              }}
                            />
                            {getMemberFirstName(m._id)}
                          </label>

                          {involved && expenseSplitType !== 'equal' && (
                            <input
                              type="number"
                              step="any"
                              className="split-member-value-input"
                              placeholder={expenseSplitType === 'exact' ? `${currency === 'INR' ? '₹' : '$'}0` : expenseSplitType === 'percentage' ? '0%' : '1 share'}
                              value={expenseSplitsVal[m._id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExpenseSplitsVal(prev => ({ ...prev, [m._id]: val }));
                              }}
                              required
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowAddExpenseModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Contribute savings modal */}
        {showContributeModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowContributeModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Contribute Savings</h3>
                <p className="panel-subtitle">Deposit money to progress this shared goal</p>
              </div>

              <form onSubmit={handleSaveContribution} className="premium-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="contrib-amount">Amount to contribute ({currency === 'INR' ? '₹' : '$'})</label>
                  <input type="number" step="0.01" id="contrib-amount" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} required placeholder="0.00" />
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowContributeModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Contribution'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Settle Up modal */}
        {showSettleModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettleModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">Settle Balances</h3>
                <p className="panel-subtitle">Record payment to settle outstanding debt</p>
              </div>

              <form onSubmit={handleSettleUpSubmit} className="premium-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="settle-member">Select Member to Settle With</label>
                  <select id="settle-member" value={settleMemberId} onChange={(e) => setSettleMemberId(e.target.value)} required>
                    <option value="">-- Select Member --</option>
                    {activeCircle?.members.filter(m => m._id !== user?._id).map(m => (
                      <option key={m._id} value={m._id}>{getMemberName(m._id)}</option>
                    ))}
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="settle-amount">Amount Settled ({currency === 'INR' ? '₹' : '$'})</label>
                  <input type="number" step="0.01" id="settle-amount" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} required placeholder="0.00" />
                </div>

                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowSettleModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Confirming...' : 'Confirm Settlement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Friend Profile Drawer / Overlay */}
        {selectedFriendProfile && (
          <div className="profile-overlay-panel" data-lenis-prevent onClick={() => setSelectedFriendProfile(null)}>
            <div className="profile-card-premium" onClick={(e) => e.stopPropagation()}>
              <button className="profile-close-btn" onClick={() => setSelectedFriendProfile(null)}><FaTimes /></button>

              <div className="profile-avatar-giant">
                {selectedFriendProfile.name.charAt(0)}
              </div>
              <div className="profile-meta-block">
                <span className="profile-name-txt">{selectedFriendProfile.name}</span>
                <span className="profile-uname-txt">@{selectedFriendProfile.username}</span>
              </div>

              <span className="verified-status-badge verified-status-badge--success" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                FinMate Verified
              </span>

              <p className="profile-bio-txt">{selectedFriendProfile.bio}</p>

              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <span className="profile-detail-lbl">Member since</span>
                  <span className="profile-detail-val">{selectedFriendProfile.dateJoined}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-lbl">Mutual Circles</span>
                  <span className="profile-detail-val">{selectedFriendProfile.mutualCircles} circles</span>
                </div>
              </div>

              <div className="profile-badges-row">
                {selectedFriendProfile.badges?.map(b => (
                  <span key={b} className={`achievement-badge-pill ${b.toLowerCase().split(' ')[0]}`}>
                    <FaAward /> {b}
                  </span>
                ))}
              </div>

              {/* Privacy Controls (displays granular user visibility toggles) */}
              <div className="privacy-controls-box">
                <h5>🔒 My Privacy Settings</h5>
                <select
                  className="privacy-dropdown"
                  value={privacySettings.profile}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, profile: e.target.value }))}
                >
                  <option value="public">Public (Everyone)</option>
                  <option value="friends">Friends Only</option>
                  <option value="circles">Circles Only</option>
                  <option value="private">Private (Only Me)</option>
                </select>
                <div className="privacy-toggles-grid">
                  <label className="privacy-toggle-label">
                    <input
                      type="checkbox"
                      checked={privacySettings.budget !== 'private'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, budget: e.target.checked ? 'circles' : 'private' }))}
                    /> Budget status
                  </label>
                  <label className="privacy-toggle-label">
                    <input
                      type="checkbox"
                      checked={privacySettings.goals !== 'private'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, goals: e.target.checked ? 'circles' : 'private' }))}
                    /> Savings Goals
                  </label>
                  <label className="privacy-toggle-label">
                    <input
                      type="checkbox"
                      checked={privacySettings.spending !== 'private'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, spending: e.target.checked ? 'circles' : 'private' }))}
                    /> Spending Activity
                  </label>
                  <label className="privacy-toggle-label">
                    <input
                      type="checkbox"
                      checked={privacySettings.streaks !== 'private'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, streaks: e.target.checked ? 'friends' : 'private' }))}
                    /> Streaks &amp; Badges
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Savings Goal Modal ── */}
        {showAddGoalModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddGoalModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">🎯 New Savings Goal</h3>
                <p className="panel-subtitle">Set a collaborative target for your circle to work toward</p>
              </div>
              <form onSubmit={handleAddGoal} className="premium-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="goal-title">Goal Title</label>
                  <input type="text" id="goal-title" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} required placeholder="e.g. Smart TV, Vacation Fund, Emergency Reserve" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="settings-field">
                    <label htmlFor="goal-target">Target Amount ({currency === 'INR' ? '₹' : '$'})</label>
                    <input type="number" step="0.01" id="goal-target" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} required placeholder="0.00" min="1" />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="goal-deadline">Target Date</label>
                    <input type="date" id="goal-deadline" value={newGoalDeadline} onChange={(e) => setNewGoalDeadline(e.target.value)} />
                  </div>
                </div>
                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowAddGoalModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#10b981', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── Edit Budget Limit Modal ── */}
        {showEditBudgetModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditBudgetModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title">📊 Update Budget Limit</h3>
                <p className="panel-subtitle">Set a new monthly spending cap for this circle</p>
              </div>
              <form onSubmit={handleUpdateBudgetLimit} className="premium-modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label htmlFor="budget-limit">New Monthly Limit ({currency === 'INR' ? '₹' : '$'})</label>
                  <input type="number" step="0.01" id="budget-limit" value={newBudgetLimit} onChange={(e) => setNewBudgetLimit(e.target.value)} required placeholder="e.g. 1500" min="1" />
                </div>
                <div className="premium-modal-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="premium-btn premium-btn-cancel" onClick={() => setShowEditBudgetModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="premium-btn" style={{ background: '#f59e0b', color: 'white' }} disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Limit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── Delete Circle Confirmation Modal ── */}
        {showDeleteConfirmModal && (
          <motion.div className="premium-modal-overlay" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirmModal(false)}>
            <motion.div className="premium-modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-container">
                <h3 className="premium-modal-title" style={{ color: '#ef4444' }}>⚠️ Delete Circle Workspace</h3>
                <p className="panel-subtitle">This will permanently remove the circle and all its data. This cannot be undone.</p>
              </div>
              <div className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.6 }}>
                    You are about to delete <strong style={{ color: '#f1f5f9' }}>"{activeCircle?.name}"</strong> — including {activeCircle?.expenses.length} expense(s) and {activeCircle?.goals.length} goal(s).
                  </p>
                </div>
                <div className="premium-modal-actions">
                  <button className="premium-btn premium-btn-cancel" onClick={() => setShowDeleteConfirmModal(false)} disabled={submitting}>Cancel</button>
                  <button className="premium-btn" style={{ background: '#ef4444', color: 'white' }} onClick={handleDeleteCircle} disabled={submitting}>
                    {submitting ? 'Deleting...' : 'Yes, Delete Permanently'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Confetti Particles canvas element */}
      {isConfettiActive && (
        <canvas ref={canvasRef} className="confetti-canvas-overlay" />
      )}

      {/* Floating Success/Warning Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="premium-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={{
              borderColor: toastType === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)',
              zIndex: 200000000
            }}
          >
            <span className="toast-icon-check" style={{ color: toastType === 'error' ? '#ef4444' : '#10b981' }}>
              {toastType === 'error' ? <FaTimesCircle size={16} /> : <FaCheckCircle size={16} />}
            </span>
            <div className="toast-content">
              <span className="toast-title">{toastType === 'error' ? 'Error' : 'Success'}</span>
              <span className="toast-msg">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Circles;
