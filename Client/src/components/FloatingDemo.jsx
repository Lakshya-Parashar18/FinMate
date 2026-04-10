import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, FaWallet, FaMagic, FaChartLine, FaPlus, FaLock, 
  FaArrowRight, FaRupeeSign, FaTrash, FaEdit, FaBrain
} from 'react-icons/fa';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import './FloatingDemo.css';

const INITIAL_DATA = {
  balance: 92250,
  income: 100000,
  expenses: 7750,
  transactions: [
    { id: 1, description: 'Coffee at Cafe', amount: -150, category: 'Food', date: 'Just now' },
    { id: 2, description: 'Freelance Pay', amount: 15000, category: 'Income', date: 'Today' },
    { id: 3, description: 'Movie Night', amount: -600, category: 'Social', date: 'Yesterday' }
  ]
};

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b'];

const FloatingDemo = ({ isOpen, onClose }) => {
  const [data, setData] = useState(INITIAL_DATA);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'Food' });
  const [showUpsell, setShowUpsell] = useState(false);
  const navigate = useNavigate();

  // Reset demo on every open
  useEffect(() => {
    if (isOpen) {
      setData(JSON.parse(JSON.stringify(INITIAL_DATA)));
      setShowAddForm(false);
      setShowUpsell(false);
    }
  }, [isOpen]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!amount) return;

    const newTx = {
      id: Date.now(),
      description: formData.description || 'Quick Transaction',
      amount: -Math.abs(amount),
      category: formData.category,
      date: 'Just now'
    };

    setData(prev => ({
      ...prev,
      balance: prev.balance - Math.abs(amount),
      expenses: prev.expenses + Math.abs(amount),
      transactions: [newTx, ...prev.transactions]
    }));
    setShowAddForm(false);
    setFormData({ description: '', amount: '', category: 'Food' });
  };

  const handleRestrictedAction = () => {
    setShowUpsell(true);
  };

  // Calculate Pie Data dynamically
  const getPieData = () => {
    const categories = {};
    data.transactions.forEach(tx => {
      if (tx.amount < 0) {
        categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount);
      }
    });
    return Object.keys(categories).map(name => ({ name, value: categories[name] }));
  };

  const pieData = getPieData();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="demo-portal-root">
          <motion.div className="demo-backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          <motion.div 
            className="demo-portal-window"
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <div className="demo-chrome">
              <div className="chrome-dots">
                <span className="c-dot red" onClick={onClose} />
                <span className="c-dot yellow" />
                <span className="c-dot green" />
              </div>
              <div className="chrome-url">finmate.app/demo</div>
              <button className="chrome-close-btn" onClick={onClose}><FaTimes /></button>
            </div>

            <div className="demo-interior">
              <div className="demo-header-section">
                <div className="demo-stat-card main">
                  <label><FaWallet /> Total Balance</label>
                  <h2>₹ {data.balance.toLocaleString()}</h2>
                </div>
                <div className="demo-stat-card secondary">
                  <label>Income</label>
                  <h3 className="txt-green">₹ {data.income.toLocaleString()}</h3>
                </div>
                <div className="demo-stat-card secondary">
                  <label>Expenses</label>
                  <h3 className="txt-rose">₹ {data.expenses.toLocaleString()}</h3>
                </div>
              </div>

              <div className="demo-ai-teaser glass">
                <FaBrain className="brain-pulse" />
                <div className="ai-teaser-text">
                  <strong>FinMate AI:</strong> "I've detected a new expense pattern. Want a breakdown?"
                  <span className="teaser-link" onClick={handleRestrictedAction}>View Insights</span>
                </div>
              </div>

              {/* Dynamic Pie Chart Section */}
              <div className="demo-mini-analytics glass">
                <div className="chart-info">
                  <h4>Spending Breakdown</h4>
                  <span className="txt-green">Live Analysis</span>
                </div>
                <div className="demo-chart-container pie">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend-mini">
                    {pieData.map((entry, index) => (
                      <div key={index} className="legend-item">
                        <span className="dot" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="demo-transactions-area">
                <div className="tx-area-header">
                  <h3>Recent Ledger</h3>
                  <button className="add-tx-btn-demo" onClick={() => setShowAddForm(true)}>
                    <FaPlus /> New Transaction
                  </button>
                </div>

                <div className="tx-list-demo">
                  {data.transactions.map(tx => (
                    <div key={tx.id} className="tx-row-demo">
                      <div className="tx-meta">
                        <strong>{tx.description}</strong>
                        <span>{tx.category} • {tx.date}</span>
                      </div>
                      <div className={`tx-amount-v ${tx.amount > 0 ? 'txt-green' : 'txt-rose'}`}>
                        {tx.amount > 0 ? '+' : '-'} ₹{Math.abs(tx.amount).toLocaleString()}
                      </div>
                      <div className="tx-actions-mini">
                        <FaEdit onClick={handleRestrictedAction} />
                        <FaTrash onClick={handleRestrictedAction} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="demo-bottom-tabs">
                <div className="tab-item active"><FaChartLine /> Dashboard</div>
                <div className="tab-item" onClick={handleRestrictedAction}><FaMagic /> AI Help</div>
                <div className="tab-item" onClick={handleRestrictedAction}><FaLock /> Advanced</div>
              </div>
            </div>

            <AnimatePresence>
              {showAddForm && (
                <motion.div className="demo-overlay-card glass" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <div className="card-header"><h4>Add Quick Expense</h4><FaTimes onClick={() => setShowAddForm(false)} /></div>
                  <form onSubmit={handleAddSubmit}>
                    <input type="text" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                    <div className="input-group-demo">
                      <input type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="Food">Food</option>
                        <option value="Social">Social</option>
                        <option value="Transit">Transit</option>
                        <option value="Utilities">Utilities</option>
                      </select>
                    </div>
                    <button type="submit" className="demo-submit-btn">Add to Ledger</button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showUpsell && (
                <motion.div className="demo-upsell-modal glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <div className="upsell-badge">PREMIUM FEATURE</div>
                  <h3>Ready for the real thing?</h3>
                  <p>In-depth analytics, recurring budgets, and export features require a full account.</p>
                  <div className="upsell-actions">
                    <button className="upsell-primary" onClick={() => navigate('/signup')}>Get Full Access <FaArrowRight /></button>
                    <button className="upsell-secondary" onClick={() => setShowUpsell(false)}>Keep exploring</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FloatingDemo;
