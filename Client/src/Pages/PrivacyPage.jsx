import React from 'react';
import { motion } from 'framer-motion';
import CustomCursor from '../components/CustomCursor';
import Footer from '../components/Footer';
import './LegalPage.css';

const PrivacyPage = () => {
  return (
    <div className="legal-page">
      <CustomCursor />
      <div className="legal-header">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Privacy Policy
        </motion.h1>
        <p className="last-updated">Last Updated: April 2024</p>
      </div>

      <div className="legal-content glass">
        <section>
          <h2>1. Data We Collect</h2>
          <p>We collect information necessary to provide the service: transaction data, budget settings, and account details. We do not store sensitive bank credentials; we only process what you manually enter or sync via secure providers.</p>
        </section>

        <section>
          <h2>2. AI Processing</h2>
          <p>Our AI analyzes spending patterns to give you insights. This data is anonymized and used exclusively to improve your individual financial recommendations. We never train public models on your private data.</p>
        </section>

        <section>
          <h2>3. Data Security</h2>
          <p>Your data is encrypted using military-grade AES-256 standards. We use secure cloud infrastructure to ensure your financial ledger is accessible only by you.</p>
        </section>

        <section>
          <h2>4. Third-Party Sharing</h2>
          <p><strong>We never sell your data.</strong> Period. We only share information with critical service providers (like database hosting) under strict confidentiality agreements.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
