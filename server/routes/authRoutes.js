import express from 'express';
import { register, login, logout, getMe, deleteUser, googleLogin, verifyEmail, resendVerification, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST - Register User
router.post('/register', register);

// POST - Login User
router.post('/login', login);

// POST - Google Login
router.post('/google', googleLogin);

// GET - Verify Email
router.get('/verify/:token', verifyEmail);

// POST - Resend Verification Email
router.post('/resend-verification', resendVerification);

// POST - Logout User
router.post('/logout', logout);

// GET - Get current user
router.get('/me', protect, getMe);

// POST - Change Password
router.post('/change-password', protect, changePassword);

// DELETE - Delete user
router.delete('/delete', protect, deleteUser);

export default router;
