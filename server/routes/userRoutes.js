import express from 'express';
import {
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
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Profile
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

// Phone OTP
router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyPhoneOtp);

// 2FA
router.post('/2fa/setup', setup2FA);
router.post('/2fa/verify', verify2FA);
router.post('/2fa/disable', disable2FA);

// Sessions
router.get('/sessions', getSessions);
router.delete('/sessions/:sessionId', revokeSession);

// Login Activity
router.get('/login-activity', getLoginActivity);

// Privacy Settings
router.route('/privacy')
  .get(getPrivacySettings)
  .put(updatePrivacySettings);

// Notification Settings
router.route('/notifications')
  .get(getNotificationSettings)
  .put(updateNotificationSettings);

// Data Export
router.get('/export', exportUserData);

export default router;