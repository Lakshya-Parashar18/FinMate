import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Double-ensure environment is loaded for this module
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialization Helpers
const getGroq = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;
    return new Groq({ apiKey });
};

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

/** Matches dashboard: category limits sum, with optional totalLimit override */
const getBudgetLimit = (b) =>
  b ? (b.totalLimit ?? b.categories?.reduce((s, c) => s + c.limit, 0) ?? 0) : 0;

const getInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentMonth = now.getMonth(); // 0–11, matches Budget schema
    const currentYear = now.getFullYear();

    // Gather context (currentMonth is 0–11, same as Date constructor)
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const transactions = await Transaction.find({ user: userId, date: { $gte: startOfMonth } });
    const budget = await Budget.findOne({ user: userId, month: currentMonth, year: currentYear });

    // 1. Calculate Data Context & Velocity
    const insights = [];
    const spentThisMonth = Math.abs(transactions.reduce((acc, tx) => acc + (tx.amount < 0 ? tx.amount : 0), 0));
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const recentSpend = Math.abs(transactions.filter(t => t.date >= sevenDaysAgo).reduce((s, t) => s + (t.amount < 0 ? t.amount : 0), 0));
    const burstSpend = Math.abs(transactions.filter(t => t.date >= last3Days).reduce((s, t) => s + (t.amount < 0 ? t.amount : 0), 0));
    const velocity = recentSpend > 0 ? (burstSpend / recentSpend) * 100 : 0;

    const catSums = {};
    transactions.forEach(t => { if(t.amount < 0) catSums[t.category] = (catSums[t.category] || 0) + Math.abs(t.amount); });
    const topCat = Object.entries(catSums).sort((a,b) => b[1]-a[1])[0];

    const groq = getGroq();
    const genAI = getGenAI();

    if (groq || genAI) {
        try {
            let aiRawText = "";
            let method = "";

            if (groq) {
                console.log("System - Prompting Groq (Llama-3.3-70b) for Smart Insights...");
                method = "Groq";
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Act as a senior wealth analyst. Use actual data. Return ONLY a JSON array.`
                        },
                        {
                            role: "user",
                            content: `CONTEXT:
                            - Monthly Budget: ₹${getBudgetLimit(budget)}
                            - Total Spent: ₹${spentThisMonth}
                            - Spend Velocity: ${velocity.toFixed(0)}%
                            - Top Category: ${topCat ? `${topCat[0]} (₹${topCat[1]})` : 'None'}
                            - Recent Data: ${JSON.stringify(transactions.slice(0, 30).map(t => ({ c: t.category, a: t.amount, d: t.description })))}

                            TASK: Return 3 UNIQUE insights.
                            1. PRIORITY 5: If Budget > 80% or Velocity > 70%.
                            2. PRIORITY 4: Specific spikes.
                            3. PRIORITY 3: Positive habits.

                            FORMAT: [{"type": "critical|warning|info|success", "priority": 1-5, "message": "string", "icon": "emoji"}]`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    max_tokens: 500,
                    response_format: { type: "json_object" }
                });
                aiRawText = chatCompletion.choices[0].message.content;
            } else if (genAI) {
                console.log("System - Prompting Gemini-2.5-flash for Smart Insights...");
                method = "Gemini";
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
                const prompt = `Act as a senior wealth analyst. 
                CONTEXT: Budget ₹${getBudgetLimit(budget)}, Spent ₹${spentThisMonth}.
                Top Category: ${topCat ? `${topCat[0]} (₹${topCat[1]})` : 'None'}
                Data: ${JSON.stringify(transactions.slice(0, 15).map(t => ({ c: t.category, a: t.amount, d: t.description })))}
                TASK: Return 3 UNIQUE JSON insights.
                FORMAT: [{"type": "critical|warning|info|success", "priority": 1-5, "message": "string", "icon": "emoji"}]`;
                const result = await model.generateContent(prompt);
                aiRawText = result.response.text();
            }

            console.log(`System - AI Raw Output from ${method} received`);

            // Robust JSON extraction
            const jsonMatch = aiRawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const aiInsights = JSON.parse(jsonMatch[0]);
                insights.push(...aiInsights);
                console.log(`System - AI Insights Extracted:`, aiInsights.length);
            } else if (aiRawText.includes('{') && aiRawText.includes('insights')) {
                // Handle cases where LLM wraps array in an object
                const parsed = JSON.parse(aiRawText);
                const array = Array.isArray(parsed) ? parsed : (parsed.insights || []);
                insights.push(...array);
            } else {
                throw new Error("No valid JSON array found in AI response");
            }
        } catch (e) {
            console.error("System - AI Insight Failure:", e.message);
        }
    }

    // Sort by priority
    const sortedInsights = insights.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Safety Fallback: Ensure at least 2 insights always exist
    if (sortedInsights.length < 2) {
        // 1. Budget Pacing Insight
        const limit = getBudgetLimit(budget);
        if (limit > 0) {
            const percent = (spentThisMonth / limit) * 100;
            if (percent < 50) {
                sortedInsights.push({ type: 'success', priority: 1, message: `Great job! You've only used ${percent.toFixed(0)}% of your budget so far.`, icon: '💰' });
            } else if (percent > 90) {
                sortedInsights.push({ type: 'critical', priority: 5, message: `Urgent: Budget nearly exhausted (${percent.toFixed(0)}%). Lock down all extra spending.`, icon: '🛑' });
            }
        }

        // 2. Specific Habit Insights
        const swiggySpent = Math.abs(transactions.filter(tx => tx.description.toLowerCase().includes('swiggy')).reduce((acc, tx) => acc + tx.amount, 0));
        if (swiggySpent > 1000) {
            sortedInsights.push({ type: 'warning', priority: 3, message: `Convenience check: ₹${swiggySpent.toLocaleString()} spent on Swiggy. Batch your orders to save on delivery.`, icon: '🛵' });
        }

        // 3. General Wisdom (Always as final resort)
        if (sortedInsights.length < 2) {
            sortedInsights.push({ type: 'info', priority: 1, message: "Tracking every rupee is the first step to financial freedom.", icon: '📈' });
            sortedInsights.push({ type: 'info', priority: 1, message: "Consider setting aside 20% of your income for auto-investments.", icon: '💡' });
        }
    }

    res.status(200).json(sortedInsights.slice(0, 4)); // Show top 4
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ message: 'Error generating smart insights' });
  }
};

const getChatResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id;
        const now = new Date();

        // Gather relevant data
        const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).limit(30);
        const budget = await Budget.findOne({
            user: userId,
            month: now.getMonth(),
            year: now.getFullYear(),
        });
        const spentThisMonth = Math.abs(transactions.filter(t => new Date(t.date).getMonth() === now.getMonth()).reduce((acc, t) => acc + (t.amount < 0 ? t.amount : 0), 0));

        const groq = getGroq();
        const genAI = getGenAI();

        if (groq || genAI) {
            try {
                const limit = getBudgetLimit(budget);
                const financialContext = `
                Total Monthly Budget: ₹${limit || '0 (not set)'}
                Total Spent This Month: ₹${spentThisMonth}
                Remaining: ₹${limit ? limit - spentThisMonth : '0'}
                Recent Transactions: ${transactions.map(t => `${t.date.toDateString()}: ${t.description} (${t.category}) ₹${t.amount}`).join(', ')}`;

                if (groq) {
                    console.log("System - Prompting Groq (Llama-3.3-70b) for Chat...");
                    const chatCompletion = await groq.chat.completions.create({
                        messages: [
                            { 
                                role: "system", 
                                content: "You are FinMate AI, a helpful finance expert. Answer briefly (under 2 sentences). Use ₹ for currency. Be professional." 
                            },
                            { 
                                role: "user", 
                                content: `CONTEXT: ${financialContext}\n\nQUESTION: ${message}` 
                            }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0.5,
                        max_tokens: 200
                    });
                    return res.status(200).json({ response: chatCompletion.choices[0].message.content });
                } else if (genAI) {
                    console.log("System - Prompting Gemini-2.5-flash for Chat...");
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
                    const prompt = `You are FinMate AI. Use this data: ${financialContext}\nUser Question: "${message}"\nRules: Brief, use ₹, 2 sentences max.`;
                    const result = await model.generateContent(prompt);
                    return res.status(200).json({ response: result.response.text() });
                }
            } catch (aiErr) {
                console.error("System - AI Bridge Failure:", aiErr.message);
            }
        } else {
            console.log("No AI API Keys found - Falling back to local brain.");
        }

        // --- HEURISTIC FALLBACK (no key, API error, or offline) ---
        const msg = (message || "").toLowerCase();
        let response = "";
        const noKeyHint = "Add GROQ_API_KEY (primary) or GEMINI_API_KEY (secondary) in server/.env for full AI replies.";
        // When key exists but Gemini threw: avoid scary copy for casual chat; details stay in server logs.
        const aiUnavailableUserHint =
            "I couldn't reach the AI just now — try again in a moment. You can still use the suggestions below, or ask about your balance or spending.";

        if (msg.includes('overspend') || msg.includes('most spent') || msg.includes('where')) {
             const categories = {};
             transactions.forEach(tx => { if (tx.amount < 0) categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount); });
             const top = Object.entries(categories).sort((a,b) => b[1]-a[1])[0];
             response = top ? `You've spent most on **${top[0]}** (₹${top[1].toLocaleString()}) recently. (Local Engine)` : "Not enough data yet.";
        } else if (msg.includes('balance') || msg.includes('left')) {
            const limit = getBudgetLimit(budget);
            response = limit > 0
                ? `Remaining: ₹${(limit - spentThisMonth).toLocaleString()} of ₹${limit.toLocaleString()}. (Local Engine)`
                : "Budget not set.";
        } else if (msg.match(/^(hi|hello|hey)\b/) || msg.length < 20) {
            if (!groq && !genAI) {
                response = `Hello! I'm FinMate AI in local mode — I answer best on overspending and how much you have left. ${noKeyHint}`;
            } else {
                const warm = msg.match(/^(hi|hello|hey)\b/)
                    ? "Hello! I'm FinMate AI."
                    : "I'm FinMate AI — good to hear from you!";
                response = `${warm} ${aiUnavailableUserHint}`;
            }
        } else if (msg.includes('saving') || msg.includes('tips') || msg.includes('reduce') || msg.includes('spent')) {
             const categories = {};
             transactions.forEach(tx => { if (tx.amount < 0) categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount); });
             const sorted = Object.entries(categories).sort((a,b) => b[1]-a[1]);
             if (sorted.length > 0) {
                 response = `You've spent ₹${sorted[0][1].toLocaleString()} on **${sorted[0][0]}** recently. Reducing this by 10% would instantly save you ₹${(sorted[0][1]*0.1).toFixed(0)}. (Local Engine)`;
             } else {
                 response = "Start adding transactions to get specific saving tips! (Local Engine)";
             }
        } else {
            response = (groq || genAI)
                ? aiUnavailableUserHint
                : `I'm in local mode and only handle a few question types. ${noKeyHint} Try: where did I overspend, or how much is left.`;
        }

        res.status(200).json({ response });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ message: "Chat error" });
    }
};

export { getInsights, getChatResponse };
