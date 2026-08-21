import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema({
  event: { type: String, required: true },   // 'login_success' | 'login_failed' | 'password_changed'
  device: { type: String, default: 'Unknown device' },
  browser: { type: String, default: 'Unknown browser' },
  os: { type: String, default: 'Unknown OS' },
  ip: { type: String, default: '' },
  location: { type: String, default: 'Unknown location' },
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const activeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  device: { type: String, default: 'Unknown device' },
  browser: { type: String, default: 'Unknown browser' },
  os: { type: String, default: 'Unknown OS' },
  ip: { type: String, default: '' },
  location: { type: String, default: 'Unknown location' },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      sparse: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      minlength: 8,
      select: false
    },
    googleId: { type: String, unique: true, sparse: true },
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    phone: { type: String, trim: true, default: '' },
    isPhoneVerified: { type: Boolean, default: false },
    phoneOtp: { type: String, select: false },
    phoneOtpExpires: { type: Date, select: false },
    bio: { type: String, trim: true, default: '' },

    // ── 2FA (TOTP / Google Authenticator) ──
    twoFAEnabled: { type: Boolean, default: false },
    twoFASecret: { type: String, select: false },      // TOTP secret (base32)
    twoFAPending: { type: Boolean, default: false },   // true while setup not yet confirmed

    // ── Login Activity (last 20) ──
    loginActivity: {
      type: [loginActivitySchema],
      default: [],
      select: false,
    },

    // ── Active Sessions ──
    activeSessions: {
      type: [activeSessionSchema],
      default: [],
      select: false,
    },

    // ── Notification Settings ──
    notificationSettings: {
      highValueAlert: { type: Boolean, default: true },
      highValueLimit: { type: Number, default: 10000 },
      dailySummary: { type: Boolean, default: false },
      weeklyDigest: { type: Boolean, default: true },
      budgetWarning80: { type: Boolean, default: true },
      budgetWarning100: { type: Boolean, default: true },
      goalMilestone: { type: Boolean, default: true },
      goalDeadline: { type: Boolean, default: true },
      sessionAlert: { type: Boolean, default: true },
      emailChannel: { type: Boolean, default: true },
      pushChannel: { type: Boolean, default: false },
      smsChannel: { type: Boolean, default: false }
    },

    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'friends',
      },
      activityVisible: { type: Boolean, default: true },
      dataCollection: { type: Boolean, default: true },
      personalization: { type: Boolean, default: true },
      analyticsOptOut: { type: Boolean, default: false },
      adPersonalization: { type: Boolean, default: false },
      thirdPartySharing: { type: Boolean, default: false },
      dataRetention: { type: String, default: '12months' },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
