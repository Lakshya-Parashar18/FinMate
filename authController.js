import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

// Initialize Google OAuth client with your Google Client ID
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Load from environment variables for security

// Register user
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    // Hash password before saving
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });

    // Save user to DB
    await user.save();

    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Respond with token and user info (without password)
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Google Login Verification
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Replace with your actual client ID
    });

    const payload = ticket.getPayload();
    const userId = payload['sub']; // Unique Google user ID
    const userEmail = payload['email'];

    // Check if user already exists
    let user = await User.findOne({ email: userEmail });

    // If user does not exist, create a new one
    if (!user) {
      user = new User({
        name: payload['name'],  // Google's response includes user name
        email: userEmail,
        googleId: userId, // You can store the Google ID for future reference
      });

      await user.save();
    }

    // Generate JWT token for the authenticated user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Respond with token and user info (without password)
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('Error during Google login:', err);
    res.status(500).json({ message: 'Google login verification failed', error: err.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;  // Extract user ID from the URL parameters
  try {
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
