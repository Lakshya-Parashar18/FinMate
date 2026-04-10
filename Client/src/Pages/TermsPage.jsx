import React from 'react';
import { motion } from 'framer-motion';
import CustomCursor from '../components/CustomCursor';
import Footer from '../components/Footer';
import './LegalPage.css';

const TermsPage = () => {
  return (
    <div className="legal-page">
      <CustomCursor />
      <div className="legal-header">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Terms of Service
        </motion.h1>
        <p className="last-updated">Effective Date: April 2024</p>
      </div>

      <div className="legal-content glass">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing FinMate, you agree to follow these terms. If you don't agree, please stop using the app. We're here to help you save, not make things difficult!</p>
        </section>

        <section>
          <h2>2. User Responsibilities</h2>
          <p>You are responsible for keeping your account secure. Don't share your login details, and please enter accurate data to get the best AI insights.</p>
        </section>

        <section>
          <h2>3. Intellectual Property</h2>
          <p>All designs, code, and the FinMate name are our property. You can use the app for personal use, but please don't replicate it for commercial purposes.</p>
        </section>

        <section>
          <h2>4. Termination</h2>
          <p>You can delete your account at any time. We reserve the right to suspend accounts that violate our community standards or attempt to hack the platform.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default TermsPage;
