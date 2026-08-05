import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import lottie from 'lottie-web';
import { FaTimes } from 'react-icons/fa';
import aiButtonAnimation from '../assets/ai-button.json';
import aiIconAnimation from '../assets/ai-icon.json';
import { API_URL } from '../config';

const getPageSpecificSuggestions = (path) => {
  if (path.includes('/transactions')) {
    return [
      { text: "Largest transactions?", prompt: "Show my largest transactions this month" },
      { text: "High-value expenses?", prompt: "Did I have any high-value expenses?" },
      { text: "Analyze Swiggy?", prompt: "Analyze my Swiggy orders" },
      { text: "Recurring items?", prompt: "Show recurring expenses" }
    ];
  }
  if (path.includes('/analytics')) {
    return [
      { text: "Month comparison?", prompt: "Compare this month's spending vs last month" },
      { text: "Fastest growing category?", prompt: "What category is growing the fastest?" },
      { text: "Income vs Expense trend?", prompt: "Show my income vs expense trend" },
      { text: "Expense predictions?", prompt: "Predict next month's total expenses" }
    ];
  }
  if (path.includes('/budget')) {
    return [
      { text: "Near limit budgets?", prompt: "Which budgets are close to limit?" },
      { text: "Remaining fund allocation?", prompt: "How can I allocate my remaining funds?" },
      { text: "Swiggy budget status?", prompt: "Show status of Swiggy budget" },
      { text: "Recommend limits?", prompt: "Recommend budget limits for next month" }
    ];
  }
  if (path.includes('/circles')) {
    return [
      { text: "Who owes me?", prompt: "Who owes me money?" },
      { text: "Group split details?", prompt: "Show split details" },
      { text: "Dinner group spending?", prompt: "How much did my group spend on dinner?" },
      { text: "Settle dues?", prompt: "Settle up pending dues" }
    ];
  }
  if (path.includes('/settings') || path.includes('/profile')) {
    return [
      { text: "Data security?", prompt: "How is my account data secured?" },
      { text: "Export data?", prompt: "How do I export my data?" },
      { text: "Toggle 2FA?", prompt: "How do I toggle 2FA?" },
      { text: "Delete account?", prompt: "How do I delete my account?" }
    ];
  }
  
  // Default (Dashboard / generic)
  return [
    { text: "Where did I overspend?", prompt: "Where did I overspend?" },
    { text: "How much is left?", prompt: "How much is left?" },
    { text: "Top category?", prompt: "What is my top spending category?" },
    { text: "Saving tips", prompt: "Reduce Swiggy spending" },
    { text: "Budget plan?", prompt: "Suggest a budget plan to save money" }
  ];
};

export default function AskFinSenseChatbot() {
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', message: 'Hello! I am FinSense. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const aiButtonRef = useRef(null);
  const aiChatIconRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isChatOpen]);

  // Load floating button animation
  useEffect(() => {
    if (!aiButtonRef.current) return;
    const anim = lottie.loadAnimation({
      container: aiButtonRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiButtonAnimation,
    });
    return () => {
      anim.destroy();
    };
  }, [isChatOpen]);

  // Load chat header animation when chat is open
  useEffect(() => {
    if (!aiChatIconRef.current) return;
    const anim = lottie.loadAnimation({
      container: aiChatIconRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiIconAnimation,
    });
    return () => {
      anim.destroy();
    };
  }, [isChatOpen]);

  const handleChat = async (e, suggestedMessage = null) => {
    if (e) e.preventDefault();
    const msg = suggestedMessage || chatInput;
    if (!msg.trim()) return;

    const userMsg = { role: 'user', message: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/insights/chat`, { message: msg }, { withCredentials: true });
      setChatHistory(prev => [...prev, { role: 'assistant', message: response.data.response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', message: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = getPageSpecificSuggestions(location.pathname);

  return (
    <>
      {/* Floating Launcher Button */}
      <button className="chat-launcher" onClick={() => setIsChatOpen(!isChatOpen)} style={{ zIndex: 1002 }}>
        <div ref={aiButtonRef} className="ai-button-animation-container" />
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="floating-chat-window">
          <div className="chat-window-header">
            <h3>
              <div ref={aiChatIconRef} className="ai-chat-header-lottie-container" />
              <span className="chat-title-light">Ask</span>
              <span className="chat-title-bold">FinSense</span>
            </h3>
            <button onClick={() => setIsChatOpen(false)} className="close-chat-btn">
              <FaTimes />
            </button>
          </div>
          <div className="ai-chat-container">
            <div className="chat-history" data-lenis-prevent>
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={`chat-bubble ${chat.role}`}>
                  <p>{chat.message}</p>
                </div>
              ))}
              {isTyping && <div className="chat-bubble assistant typing">Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            
            {/* Page-Specific Suggestion Pills */}
            <div className="chat-suggestions">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChat(null, sug.prompt)}
                  className="suggestion-pill"
                >
                  {sug.text}
                </button>
              ))}
            </div>

            {/* Chat Input Field */}
            <form onSubmit={handleChat} className="chat-input-row">
              <input
                type="text"
                placeholder="Ask your Finance GPT..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="chat-send-btn">Send</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
