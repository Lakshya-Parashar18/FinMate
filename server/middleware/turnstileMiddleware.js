export const verifyTurnstile = async (req, res, next) => {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x000000000000000000000000000000AA';

  const token = req.body.turnstileToken || req.body['cf-turnstile-response'];

  if (!token) {
    return res.status(400).json({ 
      message: 'Security verification is required. Please complete the captcha verification.' 
    });
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: req.ip,
        }).toString(),
      }
    );

    const data = await response.json();

    if (data && data.success) {
      return next();
    } else {
      console.error('Turnstile verification failed:', data);
      return res.status(400).json({ 
        message: 'Security verification failed. Please try again.' 
      });
    }
  } catch (error) {
    console.error('Error verifying Turnstile response:', error);
    return res.status(500).json({ 
      message: 'An error occurred during security verification. Please try again later.' 
    });
  }
};
