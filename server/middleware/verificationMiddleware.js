export const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user session' });
  }

  // Allow bypass for demo accounts if needed, but enforce for normal ones
  if (req.user.isDemo) {
    return next();
  }

  // Allow if either email or phone is verified
  if (!req.user.isVerified && !req.user.isPhoneVerified) {
    return res.status(403).json({
      message: 'Account verification is required. Please verify either your email or phone number to use collaborative features.',
      code: 'UNVERIFIED'
    });
  }

  next();
};
