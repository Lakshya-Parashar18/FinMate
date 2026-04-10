import Testimonial from '../models/Testimonial.js';

// @desc    Add a new testimonial
// @route   POST /api/testimonials
export const addTestimonial = async (req, res) => {
  try {
    const { name, role, text, rating, avatar } = req.body;
    const newTestimonial = new Testimonial({
      name,
      role,
      text,
      rating,
      avatar
    });
    const testimonial = await newTestimonial.save();
    res.status(201).json(testimonial);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all testimonials (sorted by rating and recency)
// @route   GET /api/testimonials
export const getTestimonials = async (req, res) => {
  try {
    // Preference to positive ones (Rating DESC) then Recency (Date DESC)
    const testimonials = await Testimonial.find().sort({ rating: -1, createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
