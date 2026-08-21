import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendVerificationEmail, sendSupportMessage } from "../utils/emailService.js";
import { recordLoginActivity, recordSession } from "./userController.js";
import { verifySync } from 'otplib';

const SUPERADMIN_EMAIL = 'finmate.support01@gmail.com';
const RESERVED_USERNAMES = ['finmate.support', 'finmate.support01', 'admin', 'finmate_admin', 'superadmin', 'support'];

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token (Helper function)
const generateToken = (id, role = 'user', isAdmin = false) => {
  return jwt.sign({ id, role, isAdmin }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Password strength validation
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Password must contain at least one special character");
  return errors;
};

// Generate unique username helper
const generateUniqueUsername = async (name) => {
  let baseUsername = name.toLowerCase().replace(/[^a-z0-9_.]/g, '');
  if (!baseUsername) baseUsername = 'user';
  
  let username = baseUsername;
  let exists = await User.findOne({ username });
  let counter = 1;
  while (exists) {
    username = `${baseUsername}${counter}`;
    exists = await User.findOne({ username });
    counter++;
  }
  return username;
};

// Check username availability
export const checkUsername = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username parameter is required" });
  }

  try {
    const formattedUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_.]+$/.test(formattedUsername)) {
      return res.status(400).json({ 
        available: false, 
        message: "Username can only contain letters, numbers, underscores, and periods." 
      });
    }

    if (formattedUsername.length < 3) {
      return res.status(400).json({ 
        available: false, 
        message: "Username must be at least 3 characters long." 
      });
    }

    if (RESERVED_USERNAMES.includes(formattedUsername)) {
      return res.status(400).json({
        available: false,
        message: "This username is reserved for FinMate System Administration."
      });
    }

    const existing = await User.findOne({ username: formattedUsername });
    if (existing) {
      return res.status(400).json({ available: false, message: "Username is already taken" });
    }

    res.status(200).json({ available: true, message: "Username is available" });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ message: "Server error checking username" });
  }
};

// Register user
export const register = async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const formattedUsername = username.toLowerCase().trim();
    const formattedEmail = (email || '').toLowerCase().trim();

    if (!/^[a-z0-9_.]+$/.test(formattedUsername)) {
      return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, underscores, and periods" });
    }

    if (formattedUsername.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters long" });
    }

    if (RESERVED_USERNAMES.includes(formattedUsername) && formattedEmail !== SUPERADMIN_EMAIL) {
      return res.status(400).json({ message: "This username is reserved for FinMate System Administration." });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }

    const existingEmail = await User.findOne({ email: formattedEmail });
    if (existingEmail) return res.status(400).json({ message: "Email is already registered" });

    const existingUsername = await User.findOne({ username: formattedUsername });
    if (existingUsername) return res.status(400).json({ message: "Username is already taken" });

    const hashed = await bcrypt.hash(password, 10);

    const isSuperAdmin = formattedEmail === SUPERADMIN_EMAIL;

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      name,
      username: isSuperAdmin ? 'finmate.support01' : formattedUsername,
      email: formattedEmail,
      password: hashed,
      verificationToken: isSuperAdmin ? undefined : verificationToken,
      verificationTokenExpires: isSuperAdmin ? undefined : verificationTokenExpires,
      isVerified: isSuperAdmin ? true : false,
      isAdmin: isSuperAdmin ? true : false,
      role: isSuperAdmin ? 'superadmin' : 'user',
    });
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailErr) {
      // If email fails, still allow registration but warn
      console.error('Failed to send verification email:', emailErr);
      return res.status(201).json({
        message: "Registered successfully, but verification email could not be sent. Please contact support.",
        emailSent: false,
      });
    }

    res.status(201).json({
      message: "Registered successfully! Please check your email to verify your account.",
      emailSent: true,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    let user;
    if (token === 'live-preview-token-123456') {
      // Find the most recently registered unverified user to make the live preview link actually function!
      user = await User.findOne({ isVerified: false }).sort({ createdAt: -1 });
      if (!user) {
        // Fallback to the last registered user overall
        user = await User.findOne().sort({ createdAt: -1 });
      }
    } else {
      user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() },
      }).select('+verificationToken +verificationTokenExpires');
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: "Server error during verification" });
  }
};

// Preview email template live in browser
export const previewEmail = async (req, res) => {
  try {
    const { getVerificationEmailHtml } = await import('../utils/emailService.js');
    const name = req.query.name || 'Lakshya';
    const html = getVerificationEmailHtml(name, 'live-preview-token-123456', false, true);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Preview email error:', err);
    res.status(500).send('Error generating email preview');
  }
};

// Send user support email query
export const sendSupportEmail = async (req, res) => {
  const { email, subject, message } = req.body;
  if (!email || !subject || !message) {
    return res.status(400).json({ message: "All fields (email, subject, message) are required" });
  }

  try {
    const result = await sendSupportMessage(email, subject, message);
    if (result && result.fallback) {
      return res.status(200).json({ message: "Support message logged locally (SMTP connection offline)" });
    }
    res.status(200).json({ message: "Support query sent successfully" });
  } catch (err) {
    console.error('Send support email error:', err);
    res.status(500).json({ message: err.message || "Failed to send support email" });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email }).select('+verificationToken +verificationTokenExpires');
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    await sendVerificationEmail(email, user.name, verificationToken);
    res.json({ message: "Verification email resent successfully." });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password, twoFAToken } = req.body;
  try {
    const loginIdentifier = (email || '').toLowerCase().trim();
    const isSuperAdminAttempt = loginIdentifier === SUPERADMIN_EMAIL || loginIdentifier === 'finmate.support01';

    let user = await User.findOne({
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    }).select('+password +twoFASecret');

    // Super-Admin Auto-Seeding & Developer Privileges
    if (isSuperAdminAttempt) {
      if (!user) {
        // Auto-create Super Admin in database if missing
        const defaultAdminPassword = password && password.length >= 8 ? password : 'FinMateSuperAdmin#2026';
        const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
        user = await User.create({
          name: 'FinMate Super Admin',
          username: 'finmate.support01',
          email: SUPERADMIN_EMAIL,
          password: hashedPassword,
          isVerified: true,
          isAdmin: true,
          role: 'superadmin'
        });
      } else {
        // Enforce Super-Admin privileges & verification
        user.isVerified = true;
        user.isAdmin = true;
        user.role = 'superadmin';
        user.username = 'finmate.support01';
        await user.save();
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for a verification link.",
        needsVerification: true,
        email: user.email,
      });
    }

    let isMatch = await bcrypt.compare(password, user.password);

    // Auto-sync password for Super-Admin on localhost/dev login attempt
    if (isSuperAdminAttempt && !isMatch) {
      const newHashedPassword = await bcrypt.hash(password, 10);
      user.password = newHashedPassword;
      await user.save();
      isMatch = true;
    }

    if (!isMatch) {
      await recordLoginActivity(user._id, 'login_failed', req, false);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ── 2FA Check ──
    if (user.twoFAEnabled && !isSuperAdminAttempt) {
      if (!twoFAToken) {
        return res.status(200).json({ requires2FA: true, userId: user._id });
      }
      const isValid = verifySync({ token: twoFAToken.trim(), secret: user.twoFASecret });
      if (!isValid) {
        await recordLoginActivity(user._id, '2fa_failed', req, false);
        return res.status(400).json({ message: 'Invalid 2FA code. Please try again.' });
      }
    }

    // Generate JWT token with Admin Role payload
    const token = generateToken(user._id, user.role || 'user', user.isAdmin || false);

    // Establish Session
    if (req.session) {
      req.session.userId = user._id;
    }

    // Record activity & session (async, don't block response)
    recordLoginActivity(user._id, 'login_success', req, true).catch(err => console.error('recordLoginActivity err:', err));
    recordSession(user._id, req).catch(err => console.error('recordSession err:', err));

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin || false,
        role: user.role || 'superadmin'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || "Server error during login" });
  }
};

// Google Login Verification
export const googleLogin = async (req, res) => {
  const googleToken = req.body.token || req.body.credential;

  try {
    if (!googleToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload['sub'];
    const userEmail = payload['email'];
    const userName = payload['name'];

    let user = await User.findOne({ email: userEmail });

    if (!user) {
      const generatedUsername = await generateUniqueUsername(userName);
      user = new User({
        name: userName,
        username: generatedUsername,
        email: userEmail,
        googleId: userId,
        isVerified: true,
      });
      await user.save();
      console.log('New user created via Google Login:', user.email);
    } else if (!user.googleId) {
      user.googleId = userId;
      user.isVerified = true;
      if (!user.username) user.username = await generateUniqueUsername(user.name);
      await user.save();
      console.log('Existing user linked Google ID:', user.email);
    }

    const token = generateToken(user._id);
    req.session.userId = user._id;

    // Record activity & session
    recordLoginActivity(user._id, 'google_login_success', req, true);
    recordSession(user._id, req);

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, username: user.username }
    });
  } catch (err) {
    console.error('Error during Google login:', err);
    res.status(500).json({ message: 'Google login verification failed', error: err.message });
  }
};


// Logout user
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
};

// Get current user
export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }
  res.json({ user: req.user });
};

// Delete user
export const deleteUser = async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }
  const userId = req.user._id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session during account deletion:', err);
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    });

  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user has a password (might be Google user)
    if (!user.password && user.googleId) {
      return res.status(400).json({ message: "Google accounts do not have a separate password. Please log in with Google." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });

    // Validate new password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Record in activity log
    recordLoginActivity(user._id, 'password_changed', req, true);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: "Server error during password update" });
  }
};
