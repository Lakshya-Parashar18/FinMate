import SupportTicket from '../models/SupportTicket.js';

// @desc    Create a new support ticket
// @route   POST /api/support
export const createTicket = async (req, res) => {
  try {
    const { name, email, category, message } = req.body;

    if (!name || !email || !category || !message) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const ticket = new SupportTicket({
      name,
      email,
      category,
      message
    });

    await ticket.save();

    res.status(201).json({ 
      success: true,
      message: 'Support ticket created successfully! Our team will reach out soon.' 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
