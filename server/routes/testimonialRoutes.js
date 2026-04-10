import express from 'express';
import { addTestimonial, getTestimonials } from '../controllers/testimonialController.js';

const router = express.Router();

router.post('/', addTestimonial);
router.get('/', getTestimonials);

export default router;
