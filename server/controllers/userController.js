import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Budget from '../models/Budget.js';
import Circle from '../models/Circle.js';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';
import { UAParser } from 'ua-parser-js';
import { generateSecret, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ── Helper: parse User-Agent into readable strings ──
const parseUserAgent = (req) => {
  const uaString = req?.headers?.['user-agent'] || '';
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.major || ''}`.trim()
    : 'Unknown browser';
  
  let os = result.os.name
    ? `${result.os.name} ${result.os.version || ''}`.trim()
    : 'Unknown OS';

  // ── Detect Windows 11 using Client Hints ──
  if (result.os.name === 'Windows') {
    const platformVersionHeader = req?.headers?.['sec-ch-ua-platform-version'] || req?.headers?.['sec-ch-ua-platform-version'.toLowerCase()];
    if (platformVersionHeader) {
      const cleanVer = platformVersionHeader.replace(/"/g, '').trim();
      const parts = cleanVer.split('.');
      const major = parseInt(parts[0], 10);
      if (major >= 13) {
        os = 'Windows 11';
      } else {
        os = 'Windows 10';
      }
    } else {
      // Fallback: If user agent is NT 10.0 and we are in year 2026, most PCs are Windows 11
      // We can check if it says NT 10.0
      if (uaString.includes('Windows NT 10.0')) {
        os = 'Windows 11'; // Default modern fallback to Windows 11
      }
    }
  }

  const deviceType = result.device.type || 'desktop'; // 'mobile' | 'tablet' | 'desktop'
  const deviceVendor = result.device.vendor || '';
  const deviceModel = result.device.model || '';
  let device;
  if (deviceVendor && deviceModel) {
    device = `${deviceVendor} ${deviceModel}`;
  } else if (result.os.name) {
    device = os;
  } else {
    device = 'Unknown device';
  }
  return { browser, os, device, deviceType };
};

// ── Helper: get client IP ──
const getClientIp = (req) => {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'Unknown'
  );
};

// ── Helper: record login activity ──
export const recordLoginActivity = async (userId, event, req, success = true) => {
  try {
    const { browser, os, device } = parseUserAgent(req);
    const ip = getClientIp(req);
    const entry = { event, device, browser, os, ip, location: 'Unknown', success, timestamp: new Date() };
    await User.findByIdAndUpdate(userId, {
      $push: {
        loginActivity: {
          $each: [entry],
          $sort: { timestamp: -1 },
          $slice: 20,   // keep only last 20
        },
      },
    });
  } catch (err) {
    console.error('Failed to record login activity:', err.message);
  }
};

// ── Helper: record / refresh active session ──
export const recordSession = async (userId, req) => {
  try {
    const { browser, os, device } = parseUserAgent(req);
    const ip = getClientIp(req);
    const sessionId = req.session?.id || crypto.randomBytes(16).toString('hex');

    // Upsert: update if same sessionId already stored, else add
    const user = await User.findById(userId).select('+activeSessions');
    if (!user) return sessionId;

    const idx = user.activeSessions.findIndex(s => s.sessionId === sessionId);
    if (idx >= 0) {
      user.activeSessions[idx].lastActive = new Date();
      // Ensure OS updates if resolved differently later
      user.activeSessions[idx].os = os;
      user.activeSessions[idx].device = device;
    } else {
      // Cap at 10 active sessions
      if (user.activeSessions.length >= 10) {
        user.activeSessions.sort((a, b) => a.lastActive - b.lastActive);
        user.activeSessions.shift();
      }
      user.activeSessions.push({ sessionId, device, browser, os, ip, location: 'Unknown', createdAt: new Date(), lastActive: new Date() });
    }
    await user.save();
    return sessionId;
  } catch (err) {
    console.error('Failed to record session:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      bio: req.user.bio,
      isVerified: req.user.isVerified || false,
      isPhoneVerified: req.user.isPhoneVerified || false,
      googleId: req.user.googleId,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
      twoFAEnabled: req.user.twoFAEnabled || false,
      privacySettings: req.user.privacySettings || { profileVisibility: 'friends', activityVisible: true },
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.username && req.body.username !== user.username) {
      const formattedUsername = req.body.username.toLowerCase().trim();
      if (!/^[a-z0-9_.]+$/.test(formattedUsername))
        return res.status(400).json({ message: "Username can only contain letters, numbers, underscores, and periods" });
      if (formattedUsername.length < 3)
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      const existingUsername = await User.findOne({ username: formattedUsername });
      if (existingUsername && existingUsername._id.toString() !== user._id.toString())
        return res.status(400).json({ message: 'Username is already taken' });
      user.username = formattedUsername;
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.phone !== undefined && req.body.phone !== user.phone) {
      user.phone = req.body.phone;
      user.isPhoneVerified = false;
    }
    user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      isVerified: updatedUser.isVerified || false,
      isPhoneVerified: updatedUser.isPhoneVerified || false,
      googleId: updatedUser.googleId,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      twoFAEnabled: updatedUser.twoFAEnabled || false,
      privacySettings: updatedUser.privacySettings,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.code === 11000) {
      if (error.keyPattern?.email) return res.status(400).json({ message: 'Email already in use' });
      if (error.keyPattern?.username) return res.status(400).json({ message: 'Username already in use' });
    }
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Send phone verification OTP
// @route   POST /api/users/send-phone-otp
// @access  Private
// ─────────────────────────────────────────────────────────
const sendPhoneOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const phone = req.body.phone || user.phone;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    if (phone !== user.phone) { user.phone = phone; user.isPhoneVerified = false; }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneOtp = otp;
    user.phoneOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    let methodUsed = 'Console Log (Fallback)';

    if (twilioSid && twilioAuthToken && twilioPhone) {
      try {
        const client = twilio(twilioSid, twilioAuthToken);
        await client.messages.create({
          body: `[FinMate] Your verification code is: ${otp}. Valid for 5 minutes.`,
          from: twilioPhone,
          to: phone,
        });
        methodUsed = 'Twilio SMS Gateway';
      } catch (twilioErr) {
        console.error('Twilio SMS delivery failed:', twilioErr.message);
      }
    }

    console.log(`\n==================================================\n[SMS GATEWAY] Verification Code: ${otp}\nSent to: ${phone}\nMethod: ${methodUsed}\n==================================================\n`);
    res.json({ message: `Verification OTP code sent successfully via ${methodUsed}` });
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Verify phone verification OTP
// @route   POST /api/users/verify-phone-otp
// @access  Private
// ─────────────────────────────────────────────────────────
const verifyPhoneOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'Verification OTP is required' });
    const user = await User.findById(req.user._id).select('+phoneOtp +phoneOtpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.phoneOtp || !user.phoneOtpExpires)
      return res.status(400).json({ message: 'No OTP requested. Please send OTP first.' });
    if (new Date() > user.phoneOtpExpires)
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    if (user.phoneOtp !== otp.trim())
      return res.status(400).json({ message: 'Invalid verification code.' });
    user.isPhoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();
    res.json({ message: 'Phone number verified successfully', isPhoneVerified: true });
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Generate 2FA TOTP secret + QR code
// @route   POST /api/users/2fa/setup
// @access  Private
// ─────────────────────────────────────────────────────────
const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFASecret');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.twoFAEnabled) return res.status(400).json({ message: '2FA is already enabled' });

    // Generate a new secret
    const secret = generateSecret();
    user.twoFASecret = secret;
    user.twoFAPending = true;
    await user.save();

    const appName = 'FinMate';
    const otpAuthUrl = generateURI({ label: user.email, issuer: appName, secret });
    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);

    res.json({
      secret,           // shown only once so user can manually enter if QR fails
      qrCode: qrDataUrl, // base64 PNG data URL
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ message: 'Failed to generate 2FA setup' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Verify TOTP code and enable 2FA
// @route   POST /api/users/2fa/verify
// @access  Private
// ─────────────────────────────────────────────────────────
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'TOTP token is required' });

    const user = await User.findById(req.user._id).select('+twoFASecret');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFASecret || !user.twoFAPending)
      return res.status(400).json({ message: 'No 2FA setup in progress. Call /setup first.' });

    const isValid = verifySync({ token: token.trim(), secret: user.twoFASecret });
    if (!isValid) return res.status(400).json({ message: 'Invalid or expired TOTP code. Please try again.' });

    user.twoFAEnabled = true;
    user.twoFAPending = false;
    await user.save();

    res.json({ message: '2FA enabled successfully', twoFAEnabled: true });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ message: 'Failed to verify 2FA code' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Disable 2FA (requires valid TOTP to confirm)
// @route   POST /api/users/2fa/disable
// @access  Private
// ─────────────────────────────────────────────────────────
const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'TOTP token required to disable 2FA' });

    const user = await User.findById(req.user._id).select('+twoFASecret');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFAEnabled) return res.status(400).json({ message: '2FA is not enabled' });

    const isValid = verifySync({ token: token.trim(), secret: user.twoFASecret });
    if (!isValid) return res.status(400).json({ message: 'Invalid TOTP code. 2FA not disabled.' });

    user.twoFAEnabled = false;
    user.twoFASecret = undefined;
    user.twoFAPending = false;
    await user.save();

    res.json({ message: '2FA disabled successfully', twoFAEnabled: false });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get active sessions
// @route   GET /api/users/sessions
// @access  Private
// ─────────────────────────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+activeSessions');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentSessionId = req.session?.id;
    const sessions = (user.activeSessions || [])
      .sort((a, b) => b.lastActive - a.lastActive)
      .map(s => ({
        id: s._id,
        sessionId: s.sessionId,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ip: s.ip,
        location: s.location,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
        current: s.sessionId === currentSessionId,
      }));

    res.json({ sessions, currentSessionId });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ message: 'Failed to retrieve sessions' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Revoke a specific session
// @route   DELETE /api/users/sessions/:sessionId
// @access  Private
// ─────────────────────────────────────────────────────────
const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const currentSessionId = req.session?.id;
    if (sessionId === currentSessionId)
      return res.status(400).json({ message: 'Cannot revoke your current session. Log out instead.' });

    const user = await User.findById(req.user._id).select('+activeSessions');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const before = user.activeSessions.length;
    user.activeSessions = user.activeSessions.filter(s => s.sessionId !== sessionId);
    if (user.activeSessions.length === before)
      return res.status(404).json({ message: 'Session not found' });

    await user.save();
    res.json({ message: 'Session revoked successfully' });
  } catch (err) {
    console.error('revokeSession error:', err);
    res.status(500).json({ message: 'Failed to revoke session' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get login activity (last 20)
// @route   GET /api/users/login-activity
// @access  Private
// ─────────────────────────────────────────────────────────
const getLoginActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+loginActivity');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const activity = [...(user.loginActivity || [])].sort((a, b) => b.timestamp - a.timestamp);
    res.json({ activity });
  } catch (err) {
    console.error('getLoginActivity error:', err);
    res.status(500).json({ message: 'Failed to retrieve login activity' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get privacy settings
// @route   GET /api/users/privacy
// @access  Private
// ─────────────────────────────────────────────────────────
const getPrivacySettings = async (req, res) => {
  const defaults = {
    profileVisibility: 'friends',
    activityVisible: true,
    dataCollection: true,
    personalization: true,
    analyticsOptOut: false,
    adPersonalization: false,
    thirdPartySharing: false,
    dataRetention: '12months'
  };
  res.json({ privacySettings: req.user.privacySettings || defaults });
};

// ─────────────────────────────────────────────────────────
// @desc    Get notification settings
// @route   GET /api/users/notifications
// @access  Private
// ─────────────────────────────────────────────────────────
const getNotificationSettings = async (req, res) => {
  const defaults = {
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
  };
  res.json({ notificationSettings: req.user.notificationSettings || defaults });
};

// ─────────────────────────────────────────────────────────
// @desc    Update notification settings
// @route   PUT /api/users/notifications
// @access  Private
// ─────────────────────────────────────────────────────────
const updateNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.notificationSettings) user.notificationSettings = {};
    
    const fields = [
      'highValueAlert', 'highValueLimit', 'dailySummary', 'weeklyDigest',
      'budgetWarning80', 'budgetWarning100', 'goalMilestone', 'goalDeadline',
      'sessionAlert', 'emailChannel', 'pushChannel', 'smsChannel'
    ];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        user.notificationSettings[f] = req.body[f];
      }
    });

    user.markModified('notificationSettings');
    await user.save();

    res.json({ notificationSettings: user.notificationSettings });
  } catch (err) {
    console.error('updateNotificationSettings error:', err);
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
};


// ─────────────────────────────────────────────────────────
// @desc    Update privacy settings
// @route   PUT /api/users/privacy
// @access  Private
// ─────────────────────────────────────────────────────────
const updatePrivacySettings = async (req, res) => {
  try {
    const {
      profileVisibility,
      activityVisible,
      dataCollection,
      personalization,
      analyticsOptOut,
      adPersonalization,
      thirdPartySharing,
      dataRetention
    } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.privacySettings) user.privacySettings = {};
    if (profileVisibility !== undefined) user.privacySettings.profileVisibility = profileVisibility;
    if (activityVisible !== undefined) user.privacySettings.activityVisible = activityVisible;
    if (dataCollection !== undefined) user.privacySettings.dataCollection = dataCollection;
    if (personalization !== undefined) user.privacySettings.personalization = personalization;
    if (analyticsOptOut !== undefined) user.privacySettings.analyticsOptOut = analyticsOptOut;
    if (adPersonalization !== undefined) user.privacySettings.adPersonalization = adPersonalization;
    if (thirdPartySharing !== undefined) user.privacySettings.thirdPartySharing = thirdPartySharing;
    if (dataRetention !== undefined) user.privacySettings.dataRetention = dataRetention;

    user.markModified('privacySettings');
    await user.save();

    res.json({ privacySettings: user.privacySettings });
  } catch (err) {
    console.error('updatePrivacySettings error:', err);
    res.status(500).json({ message: 'Failed to update privacy settings' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Export all user data as Detailed Financial Statement
// @route   GET /api/users/export
// @access  Private
// ─────────────────────────────────────────────────────────
const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).lean();
    
    let goals = [];
    try {
      goals = await Goal.find({ user: userId }).lean();
    } catch (_) {}

    let budgets = [];
    try {
      budgets = await Budget.find({ user: userId }).lean();
    } catch (_) {}

    let circles = [];
    try {
      circles = await Circle.find({ $or: [{ owner: userId }, { members: userId }] }).populate('owner', 'name email').lean();
    } catch (_) {}

    // Load and base64-encode logo.png for self-contained HTML display
    let logoBase64 = '';
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logoPath = path.resolve(__dirname, '../../Client/public/logo.png');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (e) {
      console.error("Logo file read error:", e);
    }

    // Math calculations
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      const amt = Math.abs(t.amount || 0);
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

    // Format top categories
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Date formatting helper
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FinMate - Personal Financial Statement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.5;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .brand-section h1 {
      margin: 0;
      font-size: 2.2rem;
      font-weight: 800;
      color: #10b981;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    
    .brand-section p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }
    
    .user-section {
      text-align: right;
    }
    
    .user-section h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    
    .user-section p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 0.85rem;
    }

    .grid-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 35px;
    }
    
    .card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }
    
    .card-title {
      font-size: 0.82rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    
    .card-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #f1f5f9;
    }
    
    .card-value.income { color: #10b981; }
    .card-value.expense { color: #ef4444; }
    .card-value.savings { color: #3b82f6; }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 40px 0 20px;
      border-left: 4px solid #10b981;
      padding-left: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 30px;
    }
    
    th, td {
      padding: 14px 16px;
      text-align: left;
      font-size: 0.88rem;
    }
    
    th {
      background: rgba(255, 255, 255, 0.03);
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      color: #cbd5e1;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .badge.income {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
    }
    
    .badge.expense {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
    }
    
    .progress-bar-container {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      height: 8px;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 6px;
    }
    
    .progress-bar-fill {
      height: 100%;
      background-color: #10b981;
      border-radius: 10px;
    }

    .flex-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .meta-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .meta-list li {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-size: 0.88rem;
    }

    .meta-list li:last-child {
      border-bottom: none;
    }

    .meta-label {
      color: #64748b;
      font-weight: 500;
    }

    .meta-value {
      color: #e2e8f0;
      font-weight: 600;
    }

    @media print {
      body {
        background-color: #ffffff;
        color: #0f172a;
        padding: 0;
      }
      
      .card, table {
        border: 1px solid #e2e8f0;
        background: none;
        box-shadow: none;
      }

      th {
        background-color: #f1f5f9;
        color: #475569;
        border-bottom: 1px solid #cbd5e1;
      }

      td {
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }

      .badge.income { background: #d1fae5; color: #065f46; }
      .badge.expense { background: #fee2e2; color: #991b1b; }
      .card-value { color: #0f172a !important; }
      .brand-section h1 {
        color: #0f172a;
      }
      .progress-bar-container { background: #e2e8f0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-section">
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="FinMate Logo" style="height: 42px; width: auto;" />` : ''}
        <div>
          <h1>FinMate</h1>
          <p style="margin: 2px 0 0; color: #64748b; font-size: 0.82rem; font-weight: 500;">Personal Wealth & Spend Analysis Statement</p>
        </div>
      </div>
      <div class="user-section">
        <h2>${user.name || 'Wealth Builder'}</h2>
        <p>@${user.username || 'user'}</p>
        <p>${user.email}</p>
        <p style="font-size: 0.78rem; margin-top: 4px;">Statement Date: ${fmtDate(new Date())}</p>
      </div>
    </header>

    <div class="grid-overview">
      <div class="card">
        <div class="card-title">Total Inflow</div>
        <div class="card-value income">₹${totalIncome.toLocaleString('en-IN')}</div>
      </div>
      <div class="card">
        <div class="card-title">Total Outflow</div>
        <div class="card-value expense">₹${totalExpense.toLocaleString('en-IN')}</div>
      </div>
      <div class="card">
        <div class="card-title">Net Savings</div>
        <div class="card-value savings">₹${netSavings.toLocaleString('en-IN')}</div>
      </div>
      <div class="card">
        <div class="card-title">Savings Rate</div>
        <div class="card-value">${savingsRate}%</div>
      </div>
    </div>

    <div class="flex-grid">
      <div class="card" style="flex: 1.2;">
        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; color: #f1f5f9;">Top Expense Categories</h3>
        <ul class="meta-list">
          ${topCategories.map(([cat, val]) => `
            <li>
              <span class="meta-label">${cat}</span>
              <span class="meta-value">₹${val.toLocaleString('en-IN')}</span>
            </li>
          `).join('') || '<li><span class="meta-label">No expenses logged yet</span></li>'}
        </ul>
      </div>

      <div class="card" style="flex: 1;">
        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; color: #f1f5f9;">Security & Profile Metadata</h3>
        <ul class="meta-list">
          <li>
            <span class="meta-label">Email Verified</span>
            <span class="meta-value" style="color: ${user.isVerified ? '#34d399' : '#f87171'}">${user.isVerified ? 'Yes' : 'No'}</span>
          </li>
          <li>
            <span class="meta-label">2FA Protected</span>
            <span class="meta-value" style="color: ${user.twoFAEnabled ? '#34d399' : '#f87171'}">${user.twoFAEnabled ? 'Yes' : 'No'}</span>
          </li>
          <li>
            <span class="meta-label">Total Logs</span>
            <span class="meta-value">${transactions.length} Transactions</span>
          </li>
          <li>
            <span class="meta-label">Circles Count</span>
            <span class="meta-value">${circles.length} Active Group(s)</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Goals Progress -->
    <div class="section-title">Active Savings Goals</div>
    ${goals.length > 0 ? `
      <div class="flex-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        ${goals.map(g => {
          const pct = Math.min(100, Math.round(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
          return `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #f1f5f9; font-size: 0.95rem;">${g.name || g.title}</span>
                <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #60a5fa; font-size: 0.65rem;">${pct}%</span>
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">
                Saved ₹${(g.currentAmount || 0).toLocaleString('en-IN')} of ₹${g.targetAmount.toLocaleString('en-IN')}
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : '<p style="color: #64748b; font-size: 0.88rem;">No active savings goals found.</p>'}

    <!-- Budget Limits -->
    <div class="section-title">Category Budgets Overview</div>
    ${budgets.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Budget Category</th>
            <th>Monthly Limit</th>
            <th>Creation Date</th>
          </tr>
        </thead>
        <tbody>
          ${budgets.map(b => (b.categories || []).map(cat => `
            <tr>
              <td style="font-weight: 600;">${cat.name}</td>
              <td style="font-weight: 700;">₹${cat.limit.toLocaleString('en-IN')}</td>
              <td>${fmtDate(b.createdAt)}</td>
            </tr>
          `).join('')).join('')}
        </tbody>
      </table>
    ` : '<p style="color: #64748b; font-size: 0.88rem;">No budget plans set up.</p>'}

    <!-- Transactions List -->
    <div class="section-title">Historical Inflow & Outflow Details</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(t => `
          <tr>
            <td>${fmtDate(t.date)}</td>
            <td style="font-weight: 500; color: #f1f5f9;">${t.description}</td>
            <td>${t.category}</td>
            <td><span class="badge ${t.type}">${t.type}</span></td>
            <td style="font-weight: 700; color: ${t.type === 'income' ? '#34d399' : '#f1f5f9'}">
              ${t.type === 'income' ? '+' : '-'} ₹${t.amount.toLocaleString('en-IN')}
            </td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align: center; color: #64748b;">No transaction data logged yet</td></tr>'}
      </tbody>
    </table>

    <footer style="margin-top: 60px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
      <p style="color: #475569; font-size: 0.78rem; margin: 0;">FinMate Wealth Management Platform &copy; ${new Date().getFullYear()}. All Rights Reserved.</p>
    </footer>
  </div>
</body>
</html>
    `;

    const filename = `FinMate_Financial_Statement_${user.username || user._id}_${Date.now()}.html`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);
  } catch (err) {
    console.error('exportUserData error:', err);
    res.status(500).json({ message: 'Failed to generate financial statement report' });
  }
};

export {
  getUserProfile,
  updateUserProfile,
  sendPhoneOtp,
  verifyPhoneOtp,
  setup2FA,
  verify2FA,
  disable2FA,
  getSessions,
  revokeSession,
  getLoginActivity,
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  exportUserData,
};