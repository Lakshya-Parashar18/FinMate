import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendVerificationEmail } from "../utils/emailService.js";

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token (Helper function)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
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

// Register user
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      name,
      email,
      password: hashed,
      verificationToken,
      verificationTokenExpires,
      isVerified: false,
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
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpires');

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
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for a verification link.",
        needsVerification: true,
        email: user.email,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = generateToken(user._id);

    // *** Establish Session ***
    req.session.userId = user._id; 
    console.log('Session created for user:', req.session.userId);

    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Google Login Verification
export const googleLogin = async (req, res) => {
  const { token: googleToken } = req.body;

  try {
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
      // Google-authenticated users are auto-verified
      user = new User({
        name: userName,
        email: userEmail,
        googleId: userId,
        isVerified: true,  // Auto-verify Google users
      });
      await user.save();
      console.log('New user created via Google Login:', user.email);
    } else if (!user.googleId) {
        user.googleId = userId;
        user.isVerified = true; // Also verify existing users linking Google
        await user.save();
        console.log('Existing user linked Google ID:', user.email);
    }

    // Generate our app's JWT token
    const token = generateToken(user._id);

    // *** Establish Session ***
    req.session.userId = user._id;
    console.log('Session created for Google user:', req.session.userId);

    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
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

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: "Server error during password update" });
  }
};
