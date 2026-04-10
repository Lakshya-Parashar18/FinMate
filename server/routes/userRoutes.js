import express from 'express';
import {
  getUserProfile,
  updateUserProfile
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All profile routes should be protected
router.use(protect);

// Define profile routes
router.route('/profile')
  .get(getUserProfile)    // GET /api/users/profile
  .put(updateUserProfile); // PUT /api/users/profile

// Add other user-related routes here if needed (e.g., change password)

export default router; 