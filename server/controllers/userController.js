import User from '../models/User.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  // We already have the user attached by the protect middleware
  // Just need to make sure it exists
  if (req.user) {
    // Send back relevant profile data (excluding sensitive fields like password hash)
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone, // Include new fields
      bio: req.user.bio,     // Include new fields
      googleId: req.user.googleId, // Useful for frontend to know if linked
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt
      // Add other fields as needed
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update only allowed fields
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email; // Be careful allowing email changes, might need verification
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone; // Allow setting empty string
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      // Add other updatable fields here

      // Note: Password changes should be handled in a separate, dedicated route/controller

      const updatedUser = await user.save();

      // Respond with updated user profile (excluding sensitive data)
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        googleId: updatedUser.googleId,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    // Handle potential duplicate email error if email is changed
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export { getUserProfile, updateUserProfile }; 