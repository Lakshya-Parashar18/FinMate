import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, FaWallet, FaMagic, FaChartLine, FaPlus, FaLock, 
  FaArrowRight, FaTrash, FaEdit, FaBrain
} from 'react-icons/fa';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
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

const DemoCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        color: '#fff',
        fontSize: '0.78rem',
        textAlign: 'left'
      }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.payload.fill || data.color || '#4f46e5' }} />
          <span>{data.name}</span>
        </div>
        <div style={{ color: '#34d399', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem' }}>
          ₹{Math.abs(data.value).toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b'];

const FloatingDemo = ({ isOpen, onClose }) => {
  const [data, setData] = useState(INITIAL_DATA);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [editingTxId, setEditingTxId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'ai'
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'Food', type: 'expense' });
  const [showUpsell, setShowUpsell] = useState(false);
  const [aiInsightIndex, setAiInsightIndex] = useState(0);
  const navigate = useNavigate();

  const aiInsights = [
    "I've detected a new expense pattern. Want a breakdown?",
    "Smart Tip: Food & Dining is 12% lower than your monthly average!",
    "Great savings streak! You're on track to save ₹12,000 this month."
  ];

  const demoScrollRef = useRef(null);

  // Initialize custom Lenis smooth scroll for the interactive demo content
  useEffect(() => {
    if (!isOpen || !demoScrollRef.current) return;

    const demoLenis = new Lenis({
      wrapper: demoScrollRef.current,
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
      demoLenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    return () => {
      demoLenis.destroy();
      cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  // Reset demo on every open
  useEffect(() => {
    if (isOpen) {
      setData(JSON.parse(JSON.stringify(INITIAL_DATA)));
      setShowAddForm(false);
      setShowBalanceModal(false);
      setEditingTxId(null);
      setShowUpsell(false);
      setActiveTab('dashboard');
      setTxFilter('all');
    }
  }, [isOpen]);

  const handleOpenAddForm = (type = 'expense') => {
    setEditingTxId(null);
    setFormData({ description: '', amount: '', category: 'Food', type });
    setShowAddForm(true);
  };

  const handleOpenEditForm = (tx) => {
    setEditingTxId(tx.id);
    setFormData({
      description: tx.description,
      amount: Math.abs(tx.amount).toString(),
      category: tx.category === 'Income' ? 'Food' : tx.category,
      type: tx.amount > 0 ? 'income' : 'expense'
    });
    setShowAddForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const rawAmount = parseFloat(formData.amount);
    if (!rawAmount || isNaN(rawAmount)) return;

    const isExpense = formData.type === 'expense';
    const finalAmount = isExpense ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    if (editingTxId) {
      // Edit existing transaction
      setData(prev => {
        const oldTx = prev.transactions.find(t => t.id === editingTxId);
        if (!oldTx) return prev;

        const oldIsExpense = oldTx.amount < 0;
        const oldAbs = Math.abs(oldTx.amount);
        const newAbs = Math.abs(finalAmount);

        let newBalance = prev.balance;
        let newIncome = prev.income;
        let newExpenses = prev.expenses;

        // Revert old transaction effect
        if (oldIsExpense) {
          newBalance += oldAbs;
          newExpenses -= oldAbs;
        } else {
          newBalance -= oldAbs;
          newIncome -= oldAbs;
        }

        // Apply new transaction effect
        if (isExpense) {
          newBalance -= newAbs;
          newExpenses += newAbs;
        } else {
          newBalance += newAbs;
          newIncome += newAbs;
        }

        const updatedTxList = prev.transactions.map(t => {
          if (t.id === editingTxId) {
            return {
              ...t,
              description: formData.description || 'Transaction',
              amount: finalAmount,
              category: isExpense ? formData.category : 'Income',
            };
          }
          return t;
        });

        return {
          ...prev,
          balance: newBalance,
          income: Math.max(0, newIncome),
          expenses: Math.max(0, newExpenses),
          transactions: updatedTxList
        };
      });
    } else {
      // Add new transaction
      const newTx = {
        id: Date.now(),
        description: formData.description || (isExpense ? 'Quick Expense' : 'Quick Income'),
        amount: finalAmount,
        category: isExpense ? formData.category : 'Income',
        date: 'Just now'
      };

      setData(prev => ({
        ...prev,
        balance: isExpense ? prev.balance - Math.abs(rawAmount) : prev.balance + Math.abs(rawAmount),
        expenses: isExpense ? prev.expenses + Math.abs(rawAmount) : prev.expenses,
        income: !isExpense ? prev.income + Math.abs(rawAmount) : prev.income,
        transactions: [newTx, ...prev.transactions]
      }));
    }

    setShowAddForm(false);
    setEditingTxId(null);
    setFormData({ description: '', amount: '', category: 'Food', type: 'expense' });
  };

  const handleBalanceSubmit = (e) => {
    e.preventDefault();
    const newBal = parseFloat(balanceInput);
    if (!isNaN(newBal)) {
      setData(prev => ({ ...prev, balance: newBal }));
    }
    setShowBalanceModal(false);
  };

  const handleDeleteTx = (id) => {
    setData(prev => {
      const txToDelete = prev.transactions.find(t => t.id === id);
      if (!txToDelete) return prev;

      const isExpense = txToDelete.amount < 0;
      const absAmount = Math.abs(txToDelete.amount);

      return {
        ...prev,
        balance: isExpense ? prev.balance + absAmount : prev.balance - absAmount,
        expenses: isExpense ? Math.max(0, prev.expenses - absAmount) : prev.expenses,
        income: !isExpense ? Math.max(0, prev.income - absAmount) : prev.income,
        transactions: prev.transactions.filter(t => t.id !== id)
      };
    });
  };

  // Calculate Pie Data dynamically
  const getPieData = () => {
    const categories = {};
    data.transactions.forEach(tx => {
      if (tx.amount < 0) {
        categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount);
      }
    });
    const result = Object.keys(categories).map(name => ({ name, value: categories[name] }));
    return result.length > 0 ? result : [{ name: 'No Expenses', value: 1 }];
  };

  const pieData = getPieData();

  const filteredTransactions = data.transactions.filter(tx => {
    if (txFilter === 'income') return tx.amount > 0;
    if (txFilter === 'expense') return tx.amount < 0;
    return true;
  });

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
              <div className="demo-windows-tab-info">
                <img src="/logo.png" className="demo-tab-logo-icon" alt="Logo" />
                <span>FinMate - Interactive Demo</span>
              </div>
              <div className="chrome-url">finmate.app/demo</div>
              <div className="demo-windows-controls">
                <button type="button" className="demo-win-btn demo-win-min" title="Minimize">
                  <span className="demo-win-icon-min" />
                </button>
                <button type="button" className="demo-win-btn demo-win-max" title="Maximize">
                  <span className="demo-win-icon-max" />
                </button>
                <button type="button" className="demo-win-btn demo-win-close" onClick={onClose} title="Close">
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="demo-interior" data-lenis-prevent ref={demoScrollRef}>
              {/* Interactive Header Stat Cards */}
              <div className="demo-header-section">
                <div 
                  className="demo-stat-card main" 
                  onClick={() => {
                    setBalanceInput(data.balance.toString());
                    setShowBalanceModal(true);
                    setTxFilter('all');
                  }}
                  title="Click to edit starting balance"
                >
                  <label><FaWallet /> Total Balance</label>
                  <h2>₹ {data.balance.toLocaleString()}</h2>
                  <span className="stat-card-hint">✎ Edit balance</span>
                </div>

                <div 
                  className="demo-stat-card secondary income-card"
                  onClick={() => {
                    handleOpenAddForm('income');
                    setTxFilter('income');
                  }}
                  title="Click to add income transaction"
                >
                  <label>Income</label>
                  <h3 className="txt-green">₹ {data.income.toLocaleString()}</h3>
                  <span className="stat-card-hint" style={{ color: '#10b981' }}>+ Add Income</span>
                </div>

                <div 
                  className="demo-stat-card secondary expense-card"
                  onClick={() => {
                    handleOpenAddForm('expense');
                    setTxFilter('expense');
                  }}
                  title="Click to add expense transaction"
                >
                  <label>Expenses</label>
                  <h3 className="txt-rose">₹ {data.expenses.toLocaleString()}</h3>
                  <span className="stat-card-hint" style={{ color: '#f43f5e' }}>- Add Expense</span>
                </div>
              </div>

              {/* Interactive AI Insights Teaser */}
              <div className="demo-ai-teaser">
                <FaBrain className="brain-pulse" />
                <div className="ai-teaser-text">
                  <strong>FinMate AI:</strong> "{aiInsights[aiInsightIndex]}"
                  <span 
                    className="teaser-link" 
                    onClick={() => {
                      setAiInsightIndex((prev) => (prev + 1) % aiInsights.length);
                      setActiveTab('ai');
                    }}
                  >
                    Next Insight
                  </span>
                </div>
              </div>

              {activeTab === 'dashboard' && (
                <>
                  {/* Dynamic Pie Chart Section */}
                  <div className="demo-mini-analytics">
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
                          <Tooltip content={<DemoCustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pie-legend-mini">
                        {pieData.map((entry, index) => (
                          <div key={index} className="demo-legend-item">
                            <span className="demo-dot" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                            {entry.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fully Functional Transactions Area */}
                  <div className="demo-transactions-area">
                    <div className="tx-area-header">
                      <div>
                        <h3>Recent Ledger</h3>
                        <div className="tx-filter-pills" style={{ marginTop: '0.4rem' }}>
                          <button className={`filter-pill ${txFilter === 'all' ? 'active' : ''}`} onClick={() => setTxFilter('all')}>
                            All ({data.transactions.length})
                          </button>
                          <button className={`filter-pill ${txFilter === 'expense' ? 'active' : ''}`} onClick={() => setTxFilter('expense')}>
                            Expenses
                          </button>
                          <button className={`filter-pill ${txFilter === 'income' ? 'active' : ''}`} onClick={() => setTxFilter('income')}>
                            Income
                          </button>
                        </div>
                      </div>
                      <button className="add-tx-btn-demo" onClick={() => handleOpenAddForm('expense')}>
                        <FaPlus /> New Transaction
                      </button>
                    </div>

                    <div className="tx-list-demo">
                      {filteredTransactions.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                          No {txFilter !== 'all' ? txFilter : ''} transactions found. Click <strong>+ New Transaction</strong> to add one!
                        </div>
                      ) : (
                        filteredTransactions.map(tx => (
                          <div key={tx.id} className="tx-row-demo">
                            <div className="tx-meta">
                              <strong>{tx.description}</strong>
                              <span>{tx.category} • {tx.date}</span>
                            </div>
                            <div className={`tx-amount-v ${tx.amount > 0 ? 'txt-green' : 'txt-rose'}`}>
                              {tx.amount > 0 ? '+' : '-'} ₹{Math.abs(tx.amount).toLocaleString()}
                            </div>
                            <div className="tx-actions-mini">
                              <button 
                                type="button" 
                                className="tx-action-btn edit" 
                                onClick={() => handleOpenEditForm(tx)} 
                                title="Edit transaction"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button 
                                type="button" 
                                className="tx-action-btn delete" 
                                onClick={() => handleDeleteTx(tx.id)} 
                                title="Delete transaction"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Working AI Help Tab */}
              {activeTab === 'ai' && (
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#4f46e5' }}>
                    <FaBrain size={24} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>FinMate AI Intelligence Hub</h3>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                    FinMate analyzes your spending in real time. Here are your live automated recommendations:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #10b981', fontSize: '0.85rem' }}>
                      💡 <strong>Category Alert:</strong> Food & Dining makes up 62% of your monthly expenses. Consider setting a cap of ₹5,000 next month.
                    </div>
                    <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #4f46e5', fontSize: '0.85rem' }}>
                      🚀 <strong>Savings Target:</strong> If you maintain your current ₹15,000 freelance income, you can reach your Laptop Fund Goal in 3 months!
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    style={{ marginTop: '1.5rem', padding: '0.6rem 1.25rem', borderRadius: '10px', background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ← Return to Dashboard
                  </button>
                </div>
              )}

              <div className="demo-bottom-tabs">
                <div className={`tab-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <FaChartLine /> Dashboard
                </div>
                <div className={`tab-item ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                  <FaMagic /> AI Help
                </div>
                <div className="tab-item" onClick={() => setShowUpsell(true)}>
                  <FaLock /> Advanced Sync
                </div>
              </div>
            </div>

            {/* Quick Balance Edit Modal */}
            <AnimatePresence>
              {showBalanceModal && (
                <div className="demo-overlay-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowBalanceModal(false); }}>
                  <motion.div 
                    className="demo-overlay-card" 
                    initial={{ opacity: 0, scale: 0.92, y: 15 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.92, y: 15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-header">
                      <h4>Edit Starting Balance</h4>
                      <button type="button" className="card-header-close" onClick={() => setShowBalanceModal(false)}>
                        <FaTimes />
                      </button>
                    </div>
                    <form onSubmit={handleBalanceSubmit}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                        Current Balance (₹)
                      </label>
                      <input 
                        type="number" 
                        placeholder="Enter starting balance" 
                        value={balanceInput} 
                        onChange={e => setBalanceInput(e.target.value)} 
                        required 
                      />
                      <button type="submit" className="demo-submit-btn">
                        Update Balance
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Add / Edit Transaction Modal */}
            <AnimatePresence>
              {showAddForm && (
                <div className="demo-overlay-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
                  <motion.div 
                    className="demo-overlay-card" 
                    initial={{ opacity: 0, scale: 0.92, y: 15 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.92, y: 15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-header">
                      <h4>{editingTxId ? 'Edit Transaction' : 'Add New Transaction'}</h4>
                      <button type="button" className="card-header-close" onClick={() => setShowAddForm(false)}>
                        <FaTimes />
                      </button>
                    </div>
                    <form onSubmit={handleFormSubmit}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'expense' })}
                          style={{
                            flex: 1,
                            padding: '0.6rem',
                            borderRadius: '10px',
                            border: formData.type === 'expense' ? 'none' : '1px solid #cbd5e1',
                            background: formData.type === 'expense' ? '#f43f5e' : '#f8fafc',
                            color: formData.type === 'expense' ? '#ffffff' : '#64748b',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Expense (-)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'income' })}
                          style={{
                            flex: 1,
                            padding: '0.6rem',
                            borderRadius: '10px',
                            border: formData.type === 'income' ? 'none' : '1px solid #cbd5e1',
                            background: formData.type === 'income' ? '#10b981' : '#f8fafc',
                            color: formData.type === 'income' ? '#ffffff' : '#64748b',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Income (+)
                        </button>
                      </div>

                      <input 
                        type="text" 
                        placeholder="Description (e.g. Groceries)" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        required 
                      />

                      <div className="input-group-demo">
                        <input 
                          type="number" 
                          placeholder="Amount (₹)" 
                          value={formData.amount} 
                          onChange={e => setFormData({...formData, amount: e.target.value})} 
                          required 
                        />
                        {formData.type === 'expense' && (
                          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                            <option value="Food">Food</option>
                            <option value="Social">Social</option>
                            <option value="Transit">Transit</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Shopping">Shopping</option>
                          </select>
                        )}
                      </div>
                      <button type="submit" className="demo-submit-btn">
                        {editingTxId ? 'Save Changes' : 'Add to Ledger'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showUpsell && (
                <motion.div className="demo-upsell-modal glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <div className="upsell-badge">PREMIUM FEATURE</div>
                  <h3>Ready for the real thing?</h3>
                  <p>In-depth analytics, recurring budgets, bank sync, and export features require a full account.</p>
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
