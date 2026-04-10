import Subscriber from '../models/Subscriber.js';

// @desc    Subscribe to newsletter
// @route   POST /api/subscribers
export const subscribeToNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if already subscribed
    let subscriber = await Subscriber.findOne({ email });
    if (subscriber) {
      return res.status(400).json({ message: 'You are already subscribed!' });
    }

    subscriber = new Subscriber({ email });
    await subscriber.save();
    
    res.status(201).json({ message: 'Welcome to the future of finance!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
