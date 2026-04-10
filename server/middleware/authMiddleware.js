import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  // 1. Check for session first
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password');
      if (user) {
        req.user = user; // Attach user to request
        return next(); // User authenticated via session, proceed
      } else {
        // User ID in session doesn't match a user in DB (maybe deleted?), destroy session
        req.session.destroy((err) => {
          if (err) console.error('Error destroying invalid session:', err);
          res.clearCookie('connect.sid');
          return res.status(401).json({ message: 'Not authorized, invalid session user' });
        });
        return; // Stop further processing
      }
    } catch (error) {
        console.error('Error verifying session user:', error);
         // Fall through to JWT check in case of DB error during session check?
         // Or return error? Let's fall through for now.
    }
  }

  // 2. If no session, check for JWT Bearer token (existing logic)
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
          // If JWT user not found, maybe they were deleted? Deny access.
          return res.status(401).json({ message: 'Not authorized, token user not found' });
      }
       // If user found via JWT, also establish session for subsequent requests
      req.session.userId = req.user._id;
      console.log('Session established via JWT for user:', req.session.userId);
      
      return next(); // User authenticated via JWT, proceed
    } catch (error) {
      console.error('Token verification failed:', error);
      // If token verification fails, explicitly deny access
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // 3. If no session and no token (or token check failed earlier)
  if (!req.user) { // Check if user was attached either by session or JWT
      res.status(401).json({ message: 'Not authorized, no session or token' });
  }
  // Note: removed the redundant 'if (!token)' check from the original logic as it's covered above
};

export { protect };