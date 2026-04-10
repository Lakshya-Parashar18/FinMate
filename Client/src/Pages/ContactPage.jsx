import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaHeadset, FaQuestionCircle, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config';
import CustomCursor from '../components/CustomCursor';
import Footer from '../components/Footer';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'Transactions / Tracking',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/support`, formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', category: 'Transactions / Tracking', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <CustomCursor />
      <div className="contact-hero">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          We're Here to <span className="text-gradient">Help</span>
        </motion.h1>
        <p>Have a question or need technical support? Our team of student financial experts is ready.</p>
      </div>

      <div className="contact-container">
        <div className="contact-form-side glass">
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Name</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Your Name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>University Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="student@university.edu" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>Issue Category</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option>Transactions / Tracking</option>
                  <option>AI Insights</option>
                  <option>Budgeting Tools</option>
                  <option>Account Sync</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Message</label>
                <textarea 
                  name="message"
                  placeholder="Describe your issue..." 
                  rows="5" 
                  value={formData.message}
                  onChange={handleChange}
                  required 
                  disabled={loading}
                ></textarea>
              </div>
              
              {error && <div className="contact-error">{error}</div>}
              
              <button type="submit" className="contact-submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'} <FaPaperPlane />
              </button>
            </form>
          ) : (
            <div className="success-state">
              <FaHeadset className="success-icon" />
              <h2>Message Received!</h2>
              <p>One of our mates will get back to you within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} className="btn-retry">Send another</button>
            </div>
          )}
        </div>

        <div className="contact-info-side">
          <div className="faq-mini glass">
            <h3><FaQuestionCircle /> Quick FAQs</h3>
            <div className="faq-item">
              <h4>Is my bank data safe?</h4>
              <p>Yes, we use bank-grade AES-256 encryption. We never see your password.</p>
            </div>
            <div className="faq-item">
              <h4>Is FinMate free?</h4>
              <p>The core tracking and AI insights are free for all university students.</p>
            </div>
            <div className="faq-item">
              <h4>How do I reset my password?</h4>
              <p>Go to the Login page and click "Forgot Password" to receive a reset link.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
