import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaQuoteLeft, FaPlus, FaCheckCircle, FaTimes, FaUsers } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';
import Lenis from 'lenis';
import './TestimonialsSection.css';

const INITIAL_TESTIMONIALS = [
  { id: 1, name: "Aman Sharma", role: "Software Engineer", text: "FinMate helped me save ₹2000/month just by identifying unnecessary coffee & subscription habits! Absolute lifesaver.", rating: 5, avatar: "A", createdAt: "2024-01-01T10:00:00Z" },
  { id: 2, name: "Riya Singh", role: "Financial Analyst", text: "The AI insights are scarily accurate. It predicted my month-end cash crunch before it happened. Best app for money management!", rating: 5, avatar: "R", createdAt: "2024-01-02T10:00:00Z" },
  { id: 3, name: "Vikram Malhotra", role: "Product Manager", text: "Minimalist, clean, and fast. I've tried every budget app, but this is the only one I actually use every day.", rating: 4, avatar: "V", createdAt: "2024-01-03T10:00:00Z" },
  { id: 4, name: "Sanya Gupta", role: "Marketing Lead", text: "Finally an app that doesn't feel like a chore to use. The UI is addictive.", rating: 5, avatar: "S", createdAt: "2024-01-04T10:00:00Z" },
  { id: 5, name: "Rahul Verma", role: "UX Designer", text: "The real-time transaction tracking is flawless. Highly recommend.", rating: 5, avatar: "R", createdAt: "2024-01-05T10:00:00Z" },
  { id: 6, name: "Priya Das", role: "Freelance Creator", text: "Saved me from several unnecessary impulse purchases this month already!", rating: 4, avatar: "P", createdAt: "2024-01-06T10:00:00Z" }
];

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', text: '', rating: 0 });

  const scrollAreaRef = useRef(null);

  // Initialize a container-based Lenis instance for the modal scroll area
  useEffect(() => {
    if (!showReviewsModal || !scrollAreaRef.current) return;

    const modalLenis = new Lenis({
      wrapper: scrollAreaRef.current,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.8,
      touchMultiplier: 2,
      infinite: false,
    });

    let frameId;
    function raf(time) {
      modalLenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    return () => {
      modalLenis.destroy();
      cancelAnimationFrame(frameId);
    };
  }, [showReviewsModal]);

  // Lock background scroll when modals are open
  useEffect(() => {
    if (showReviewsModal || showForm) {
      window.lenis?.stop();
      document.body.style.overflow = 'hidden';
    } else {
      window.lenis?.start();
      document.body.style.overflow = '';
    }

    return () => {
      window.lenis?.start();
      document.body.style.overflow = '';
    };
  }, [showReviewsModal, showForm]);

  // Reset form data when the feedback modal is closed
  useEffect(() => {
    if (!showForm) {
      setFormData({ name: '', role: '', text: '', rating: 0 });
    }
  }, [showForm]);

  // Fetch from backend and merge with Seeds
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await axios.get(`${API_URL}/testimonials`);
        
        // Merge fetched data with our high-quality seeds
        // Filter out any potential duplicates by text content
        const fetchedData = res.data;
        const combined = [...fetchedData];
        
        // Add seeds that aren't already represented (by unique text)
        INITIAL_TESTIMONIALS.forEach(seed => {
          if (!combined.find(item => item.text === seed.text)) {
            combined.push(seed);
          }
        });

        setTestimonials(combined);
      } catch (err) {
        console.error("Error fetching testimonials", err);
        setTestimonials(INITIAL_TESTIMONIALS);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Sorting: High Rating first, then Newest first
  const sortedTestimonials = [...testimonials].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const recentTestimonials = sortedTestimonials.slice(0, 3);
  
  // Wall of Trust sorting: Purely by Time (Newest First)
  const chronologicalTestimonials = [...testimonials].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.rating === 0) {
      alert("Please select a star rating!");
      return;
    }
    
    try {
      const payload = {
        ...formData,
        avatar: formData.name.charAt(0).toUpperCase()
      };
      
      const res = await axios.post(`${API_URL}/testimonials`, payload);
      
      // Update local state: Sort by rating (5 down to 1), then recency
      const updatedList = [res.data, ...testimonials].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
      });
      
      setTestimonials(updatedList);
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
        setFormData({ name: '', role: '', text: '', rating: 0 });
      }, 2000);
    } catch (err) {
      console.error("Error submitting feedback", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <div className="section-tag">SOCIAL PROOF</div>
          <h2 className="testimonials-title">Trusted by <span className="testimonials-title-gradient">Thousands</span> of Smart Savers</h2>
          <p className="testimonials-description">Join the movement of financially intelligent achievers.</p>
        </div>

        <div className="testimonials-grid">
          {recentTestimonials.map((item, idx) => (
            <motion.div key={item.id} className="testimonial-card glass" whileHover={{ y: -6 }}>
              <div className="quote-icon"><FaQuoteLeft /></div>
              <div className="stars">{[...Array(item.rating)].map((_, i) => <FaStar key={i} />)}</div>
              <p className="testimonial-text">"{item.text}"</p>
              <div className="user-profile">
                <div className="avatar-circle">{item.avatar}</div>
                <div className="user-info"><strong>{item.name}</strong><span>{item.role}</span></div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="testimonials-actions">
          <button className="view-more-btn" onClick={() => setShowReviewsModal(true)}>View More</button>
          <button className="share-feedback-btn" onClick={() => setShowForm(true)}><FaPlus /> Share Feedback</button>
        </div>

        {/* --- ALL REVIEWS MODAL --- */}
        <AnimatePresence>
          {showReviewsModal && (
            <div className="reviews-portal-root">
              <motion.div className="reviews-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReviewsModal(false)} />
              <motion.div 
                className="reviews-window glass"
                data-lenis-prevent
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              >
                <div className="reviews-header">
                  <h3><FaUsers /> Wall of Trust</h3>
                  <button className="close-reviews" onClick={() => setShowReviewsModal(false)}>
                    <FaTimes />
                  </button>
                </div>
                <div className="reviews-scroll-area" data-lenis-prevent ref={scrollAreaRef}>
                  <div className="all-reviews-grid">
                    {chronologicalTestimonials.map((item) => (
                      <div key={item.id} className="mini-review-card glass">
                        <div className="mini-quote-icon"><FaQuoteLeft /></div>
                        <div className="stars-mini">{[...Array(item.rating)].map((_, i) => <FaStar key={i} />)}</div>
                        <p className="mini-review-text">"{item.text}"</p>
                        <div className="mini-user-profile">
                          <div className="mini-avatar-circle">{item.avatar || (item.name ? item.name.charAt(0).toUpperCase() : 'U')}</div>
                          <div className="mini-user-details">
                            <strong>{item.name}</strong>
                            <span>{item.role}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- FEEDBACK FORM MODAL --- */}
        <AnimatePresence>
          {showForm && (
            <div className="feedback-modal-root">
              <motion.div className="feedback-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
              <motion.div 
                className="feedback-card" 
                data-lenis-prevent
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
              >
                {submitted ? (
                  <div className="feedback-success">
                    <FaCheckCircle className="success-icon" />
                    <h3>Thank You!</h3>
                    <p>Your story helps others start their financial growth journey.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-header">
                      <h3>Share Your Experience</h3>
                      <button type="button" className="close-form" onClick={() => setShowForm(false)}>
                        <FaTimes />
                      </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <div className="form-row">
                        <input type="text" placeholder="Your Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                        <input type="text" placeholder="Major/Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required />
                      </div>
                      
                      <div className="star-rating-selector">
                        <label>Your Rating</label>
                        <div className="rating-input-group">
                          <div className="stars-interactive">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar 
                                key={star}
                                className={formData.rating >= star ? 'active' : ''}
                                onClick={() => setFormData({...formData, rating: star})}
                              />
                            ))}
                          </div>
                          <span className="rating-label">
                            {formData.rating === 0 && "Select Rating"}
                            {formData.rating === 5 && "Amazing!!"}
                            {formData.rating === 4 && "Great!"}
                            {formData.rating === 3 && "Good"}
                            {formData.rating === 2 && "Average"}
                            {formData.rating === 1 && "Poor"}
                          </span>
                        </div>
                      </div>

                      <textarea placeholder="How did FinMate help you?" value={formData.text} onChange={(e) => setFormData({...formData, text: e.target.value})} required />
                      <button type="submit" className="submit-feedback-btn">Publish Feedback</button>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default TestimonialsSection;
