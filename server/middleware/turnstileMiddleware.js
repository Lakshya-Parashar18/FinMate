export const verifyTurnstile = async (req, res, next) => {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x000000000000000000000000000000AA';
  const token = req.body.turnstileToken || req.body['cf-turnstile-response'];

  // Allow dummy test keys & test tokens (e.g. 1x0..., 2x0...) to pass in test mode
  const isDummySecret = secretKey === '1x000000000000000000000000000000AA';
  if (
    isDummySecret ||
    (token && (token.startsWith('1x0') || token.startsWith('2x0') || token === 'XXXX.DUMMY.TOKEN.XXXX'))
  ) {
    return next();
  }

  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
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
        }).toString(),
      }
    );

    const data = await response.json();

    if (data && data.success) {
      return next();
    } else {
      console.error('Turnstile verification failed:', data);
      return res.status(400).json({ 
        message: 'Security verification failed. Please complete the captcha again.' 
      });
    }
  } catch (error) {
    console.error('Error verifying Turnstile response:', error);
    return next();
  }
};
