import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaQuoteLeft, FaPlus, FaCheckCircle, FaTimes, FaUsers } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';
import './TestimonialsSection.css';

const INITIAL_TESTIMONIALS = [
  { id: 1, name: "Aman Sharma", role: "Engineering Student", text: "FinMate helped me save ₹2000/month just by identifying my bad coffee habits! Absolute lifesaver for hostel students.", rating: 5, avatar: "A", createdAt: "2024-01-01T10:00:00Z" },
  { id: 2, name: "Riya Singh", role: "Medical Intern", text: "The AI AI insights are scarily accurate. It predicted my month-end cash crunch before it happened. Best app for students!", rating: 5, avatar: "R", createdAt: "2024-01-02T10:00:00Z" },
  { id: 3, name: "Vikram Malhotra", role: "B.Com Final Year", text: "Minimalist, clean, and fast. I've tried every budget app, but this is the only one I actually use every day.", rating: 4, avatar: "V", createdAt: "2024-01-03T10:00:00Z" },
  { id: 4, name: "Sanya Gupta", role: "MBA Aspirant", text: "Finally an app that doesn't feel like a chore to use. The UI is addictive.", rating: 5, avatar: "S", createdAt: "2024-01-04T10:00:00Z" },
  { id: 5, name: "Rahul Verma", role: "CS Sophomore", text: "The real-time transaction tracking is flawless. Highly recommend.", rating: 5, avatar: "R", createdAt: "2024-01-05T10:00:00Z" },
  { id: 6, name: "Priya Das", role: "Arts Student", text: "Saved me from several unnecessary purchases this month already!", rating: 4, avatar: "P", createdAt: "2024-01-06T10:00:00Z" }
];

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', text: '', rating: 0 });

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
        <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="section-tag">SOCIAL PROOF</div>
          <h2>Trusted by <span className="text-gradient">Thousands</span> of Students</h2>
          <p>Join the movement of financially intelligent young achievers.</p>
        </motion.div>

        <div className="testimonials-grid">
          {recentTestimonials.map((item, idx) => (
            <motion.div key={item.id} className="testimonial-card glass" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: idx * 0.1 }}>
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
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              >
                <div className="reviews-header">
                  <h3><FaUsers /> Wall of Trust</h3>
                  <FaTimes className="close-reviews" onClick={() => setShowReviewsModal(false)} />
                </div>
                <div className="reviews-scroll-area">
                  <div className="all-reviews-grid">
                    {chronologicalTestimonials.map((item) => (
                      <div key={item.id} className="mini-review-card">
                        <div className="stars-mini">{[...Array(item.rating)].map((_, i) => <FaStar key={i} />)}</div>
                        <p>"{item.text}"</p>
                        <div className="mini-user-info"><strong>{item.name}</strong> • <span>{item.role}</span></div>
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
              <motion.div className="feedback-card" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}>
                {submitted ? (
                  <div className="submission-success">
                    <FaCheckCircle className="success-icon" />
                    <h3>Thank You!</h3>
                    <p>Your story helps other students start their journey.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-header">
                      <h3>Share Your Experience</h3>
                      <FaTimes className="close-form" onClick={() => setShowForm(false)} />
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
