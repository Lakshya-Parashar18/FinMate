import React from 'react';
import { motion } from 'framer-motion';
import { FaWallet, FaBrain, FaChartLine, FaPiggyBank, FaSync, FaShieldAlt } from 'react-icons/fa';
import './FeaturesSection.css';

const features = [
  {
    icon: <FaWallet />,
    title: "Expense Tracking",
    description: "Effortlessly log and categorize your daily spending with our intuitive interface. Your wallet, digitized.",
    color: "#10b981"
  },
  {
    icon: <FaBrain />,
    title: "AI Insights",
    description: "Personalized financial advice and spending anomaly detection powered by advanced neural engines.",
    color: "#4f46e5"
  },
  {
    icon: <FaChartLine />,
    title: "Analytics Dashboard",
    description: "Beautiful, interactive charts that turn raw spending data into actionable financial clarity.",
    color: "#0ea5e9"
  },
  {
    icon: <FaPiggyBank />,
    title: "Budget Planner",
    description: "Set smart limits and reach your savings goals faster with our automated planning tools.",
    color: "#8b5cf6"
  },
  {
    icon: <FaSync />,
    title: "Recurring Transactions",
    description: "Subscriptions and bills tracked automatically, ensuring you never miss a payment again.",
    color: "#f43f5e"
  },
  {
    icon: <FaShieldAlt />,
    title: "Secure & Private",
    description: "Military-grade encryption for your financial footprint. Your data belongs to you.",
    color: "#f59e0b"
  }
];

const FeaturesSection = () => {
  return (
    <section className="features-section">
      <div className="section-header">
        <motion.div 
          className="feature-tag"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          POWERED BY AI
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Designed for the <span className="text-gradient">Financial Future</span>
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="section-description"
        >
          Ditch the spreadsheets. FinMate brings enterprise-grade financial management 
          to your pocket with a design that's as intelligent as it is beautiful.
        </motion.p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <motion.div 
            key={index}
            className="feature-card"
            style={{ '--accent-color': feature.color }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ 
              y: -12,
              scale: 1.02,
              transition: { type: 'spring', stiffness: 300, damping: 20 }
            }}
          >
            <div className="card-glass-effect" />
            <div className="feature-icon-wrapper" style={{ '--icon-color': feature.color }}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="status-indicator" style={{ backgroundColor: feature.color }} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
