import express from 'express';
import { register, login, getMe, deleteUser, googleLogin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST - Register User
router.post('/register', register);

// POST - Login User
router.post('/login', login);

// POST - Google Login
router.post('/google', googleLogin); // This is the new route for Google login

// GET - Get current user
router.get('/me', protect, getMe);

// DELETE - Delete user
router.delete('/delete/:id', protect, deleteUser);

export default router;
