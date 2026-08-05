import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TrendingUp, Sparkles, Minus, Square, X, Target } from 'lucide-react';
import lottie from 'lottie-web';
import aiIconData from '../assets/ai-icon.json';

// Demo expense breakdown data
const EXPENSE_DATA = [
  { name: 'Food', value: 4850, color: '#10b981' },
  { name: 'Shopping', value: 2600, color: '#06b6d4' },
  { name: 'Transport', value: 2100, color: '#6366f1' },
  { name: 'Utilities', value: 1950, color: '#f59e0b' },
];

// Demo monthly comparison data (Income vs Expenses)
const CASHFLOW_DATA = [
  { name: 'Jan', Income: 42000, Expenses: 28000 },
  { name: 'Feb', Income: 45000, Expenses: 31000 },
  { name: 'Mar', Income: 48000, Expenses: 29500 },
  { name: 'Apr', Income: 50000, Expenses: 32000 },
  { name: 'May', Income: 52000, Expenses: 30450 },
];

// Rotating AI Insights (4 Believable Insights)
const AI_INSIGHTS = [
  {
    id: 1,
    time: 'Just now',
    text: 'Your food expenses decreased by 12% this month. ₹1,250 has been automatically allocated toward your Laptop Fund.',
    highlight: '₹1,250'
  },
  {
    id: 2,
    time: '2m ago',
    text: 'Utilities spending is 8% lower than average. Projected monthly savings increased to ₹8,420.',
    highlight: '₹8,420'
  },
  {
    id: 3,
    time: '5m ago',
    text: 'Entertainment spending exceeded your monthly average. AI recommended cap: ₹2,500.',
    highlight: '₹2,500'
  },
  {
    id: 4,
    time: '12m ago',
    text: 'Subscription audit complete: 1 inactive service detected. Potential annual saving: ₹3,600.',
    highlight: '₹3,600'
  }
];

// Custom Hook for smooth number counting on load
function useCountUp(targetValue, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(easedProgress * targetValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  return count;
}

export default function DashboardPreview() {
  const prefersReducedMotion = useReducedMotion();

  // Number count-ups for all numeric metrics
  const animatedBalance = useCountUp(42680, 1400);
  const animatedSavings = useCountUp(8420, 1200);
  const animatedGoalSaved = useCountUp(45000, 1300);
  const animatedGoalTarget = useCountUp(60000, 1400);

  const animatedFood = useCountUp(4850, 1100);
  const animatedShopping = useCountUp(2600, 1100);
  const animatedTransport = useCountUp(2100, 1100);
  const animatedUtilities = useCountUp(1950, 1100);

  const expenseCounts = [animatedFood, animatedShopping, animatedTransport, animatedUtilities];

  // Health score gentle fluctuation (94% -> 95% -> 94% -> 93% -> 94%)
  const [healthScore, setHealthScore] = useState(94);
  useEffect(() => {
    const scores = [94, 95, 94, 93];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % scores.length;
      setHealthScore(scores[idx]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // AI Insight rotation every 12s
  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setInsightIdx((prev) => (prev + 1) % AI_INSIGHTS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Subtle Mouse Parallax Tilt (max 1.5 deg)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 30 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [1.2, -1.2]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-1.2, 1.2]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX / innerWidth - 0.5);
      mouseY.set(e.clientY / innerHeight - 0.5);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, prefersReducedMotion]);

  const aiIconRef = useRef(null);

  useEffect(() => {
    if (!aiIconRef.current) return;
    const anim = lottie.loadAnimation({
      container: aiIconRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiIconData,
    });
    return () => anim.destroy();
  }, []);

  const currentInsight = AI_INSIGHTS[insightIdx];
  const goalPercentage = Math.round((animatedGoalSaved / 60000) * 100);

  return (
    <motion.div
      style={{ rotateX: prefersReducedMotion ? 0 : rotateX, rotateY: prefersReducedMotion ? 0 : rotateY, perspective: 1000 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="dp-wrapper"
    >
      {/* Glossy Sheen Reflection Sweeping Across Dashboard */}
      <div className="dp-gloss-reflection" />

      {/* Soft Ambient Teal Glows */}
      <div className="dp-ambient-glow-1" />
      <div className="dp-ambient-glow-2" />

      {/* Windows-style Header Row */}
      <div className="dp-header-row">
        <div className="dp-brand-info">
          <div className="dp-brand-icon">
            <img src="/logo.png" alt="FinMate Logo" className="dp-brand-logo-img" />
          </div>
          <span className="dp-brand-title">FinMate Analytics Live</span>
          <span className="dp-pulse-dot" style={{ marginLeft: '-2px', marginRight: '4px' }} />
          <motion.span 
            key={healthScore}
            initial={{ opacity: 0.7, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="dp-health-badge"
          >
            {healthScore}% Health Score
          </motion.span>
        </div>

        {/* Windows Controls */}
        <div className="dp-win-controls">
          <Minus size={12} />
          <Square size={10} />
          <X size={12} />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dp-kpi-grid">
        
        {/* Total Balance */}
        <div className="dp-kpi-card">
          <div className="dp-kpi-accent-emerald" />
          <span className="dp-kpi-label">Total Balance</span>
          <div className="dp-kpi-value-row">
            <div className="dp-skeleton-val" style={{ width: '80px' }} />
          </div>
          <div className="dp-skeleton-sub" style={{ width: '50px' }} />
        </div>

        {/* Monthly Savings */}
        <div className="dp-kpi-card">
          <div className="dp-kpi-accent-teal" />
          <span className="dp-kpi-label">Monthly Savings</span>
          <div className="dp-kpi-value-row">
            <div className="dp-skeleton-val" style={{ width: '65px' }} />
            <div className="dp-skeleton-badge" style={{ width: '38px', height: '14px' }} />
          </div>
          <div className="dp-skeleton-sub" style={{ width: '60px' }} />
        </div>

        {/* Health Score */}
        <div className="dp-kpi-card">
          <div className="dp-kpi-accent-cyan" />
          <span className="dp-kpi-label">Health Score</span>
          <div className="dp-kpi-value-row">
            <div className="dp-skeleton-val" style={{ width: '55px' }} />
            <div className="dp-skeleton-badge" style={{ width: '45px', height: '14px', background: 'rgba(34, 211, 238, 0.15)' }} />
          </div>
          <div className="dp-skeleton-sub" style={{ width: '55px' }} />
        </div>

      </div>

      {/* Charts Grid */}
      <div className="dp-charts-grid">
        
        {/* Expense Breakdown Pie Chart */}
        <div className="dp-chart-card">
          <div className="dp-chart-header">
            <span className="dp-chart-title">Expense Breakdown</span>
            <span className="dp-chart-sub">This Month</span>
          </div>
          
          <div className="dp-pie-container">
            <div className="dp-pie-graphic">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={EXPENSE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={36}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={1300}
                  >
                    {EXPENSE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Side Legend */}
            <div className="dp-pie-legend">
              {EXPENSE_DATA.map((item, idx) => (
                <div key={idx} className="dp-legend-row">
                  <div className="dp-legend-left">
                    <span className="dp-legend-dot" style={{ backgroundColor: item.color }} />
                    <span className="dp-legend-name">{item.name}</span>
                  </div>
                  <div className="dp-skeleton-sub" style={{ width: '32px', height: '10px', margin: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Bar Chart */}
        <div className="dp-chart-card">
          <div className="dp-chart-header">
            <span className="dp-chart-title">Cash Flow Trend</span>
            <div className="dp-legend-item-group">
              <span className="dp-legend-item-row" style={{ color: '#818cf8' }}>
                <span className="dp-legend-dot" style={{ background: '#6366f1' }} /> Income
              </span>
              <span className="dp-legend-item-row" style={{ color: '#fb7185' }}>
                <span className="dp-legend-dot" style={{ background: '#f43f5e' }} /> Spent
              </span>
            </div>
          </div>

          <div className="dp-bar-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CASHFLOW_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={9} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Bar dataKey="Income" fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={1400} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* AI Recommendation Card with Cross-Fading Rotating Insights */}
      <div className="dp-ai-card">
        <div className="dp-ai-icon">
          <div ref={aiIconRef} className="dp-ai-lottie-container" />
        </div>
        <div className="dp-ai-body">
          <div className="dp-ai-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="dp-ai-title">FinSense AI Insight</span>
              <span className="dp-pulse-dot" />
            </div>
            <span className="dp-ai-time">{currentInsight.time}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.45 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0 2px' }}
            >
              <div className="dp-skeleton-line" style={{ width: '100%' }} />
              <div className="dp-skeleton-line" style={{ width: '70%' }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Goal Progress Card */}
      <div className="dp-goal-card">
        <div className="dp-goal-header">
          <div className="dp-goal-title-group">
            <Target size={13} style={{ color: '#2dd4bf' }} />
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Laptop Fund Goal</span>
          </div>
          <div className="dp-skeleton-badge" style={{ width: '90px', height: '10px', background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="dp-goal-track">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goalPercentage}%` }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="dp-goal-fill"
          />
        </div>
      </div>

    </motion.div>
  );
}
