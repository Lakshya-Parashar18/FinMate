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
        transactions.forEach(t => { if (t.amount < 0) catSums[t.category] = (catSums[t.category] || 0) + Math.abs(t.amount); });
        const topCat = Object.entries(catSums).sort((a, b) => b[1] - a[1])[0];

        const groq = getGroq();
        const genAI = getGenAI();

        const insightUserContent = `CONTEXT:
                            - Monthly Budget: ₹${getBudgetLimit(budget)}
                            - Total Spent: ₹${spentThisMonth}
                            - Spend Velocity: ${velocity.toFixed(0)}%
                            - Top Category: ${topCat ? `${topCat[0]} (₹${topCat[1]})` : 'None'}
                            - Recent Data: ${JSON.stringify(transactions.slice(0, 30).map(t => ({ c: t.category, a: t.amount, d: t.description })))}

                            TASK: Return 1 to 3 UNIQUE insights based ONLY on the context.
                            1. CRITICAL: If Budget > 80% or Velocity > 70% or overspent categories.
                            2. WARNING: Specific category spikes.
                            3. SUCCESS: Positive habits (steady salary/income, high savings).

                            FORMAT: [{"type": "critical|warning|info|success", "priority": 1-5, "message": "string", "icon": "emoji"}]`;

        const fetchGroqInsights = async () => {
            console.log("System - Prompting Groq (Llama-3.3-70b) for Smart Insights...");
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Act as a senior wealth analyst. Use actual data. 
                                Return a JSON array containing ONLY insights that are highly relevant, mathematically accurate, and important based on the data.
                                Do not generate filler financial quotes or general definitions. Every insight must refer to the actual numbers.
                                Do not force a fixed count of 3 insights; return between 1 and 3 insights depending on what is noteworthy.`
                    },
                    { role: "user", content: insightUserContent }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });
            return chatCompletion.choices[0].message.content;
        };

        const fetchGeminiInsights = async () => {
            console.log("System - Prompting Gemini-1.5-flash for Smart Insights...");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Act as a senior wealth analyst. Use actual data.
                ${insightUserContent}`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        };

        if (genAI || groq) {
            try {
                let aiRawText = "";
                let method = "";

                // Insights/sidebar: Gemini primary → Groq fallback
                if (genAI) {
                    try {
                        aiRawText = await fetchGeminiInsights();
                        method = "Gemini";
                    } catch (geminiErr) {
                        console.error("System - Gemini Insight Failure, falling back to Groq:", geminiErr.message);
                        if (!groq) throw geminiErr;
                        aiRawText = await fetchGroqInsights();
                        method = "Groq (fallback)";
                    }
                } else {
                    aiRawText = await fetchGroqInsights();
                    method = "Groq";
                }

                console.log(`System - AI Raw Output from ${method} received`);

                const jsonMatch = aiRawText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const aiInsights = JSON.parse(jsonMatch[0]);
                    insights.push(...aiInsights);
                    console.log(`System - AI Insights Extracted:`, aiInsights.length);
                } else if (aiRawText.includes('{') && aiRawText.includes('insights')) {
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

        // Safety Heuristic Audit: Run programmatic calculations if AI failed/offline
        if (sortedInsights.length === 0) {
            const limit = getBudgetLimit(budget);
            if (limit > 0) {
                const percent = (spentThisMonth / limit) * 100;
                if (percent >= 90) {
                    sortedInsights.push({ 
                        type: 'critical', 
                        priority: 5, 
                        message: `Critical Alert: You have used ${percent.toFixed(0)}% of your monthly budget. Lock down all extra spending.`, 
                        icon: '🚨' 
                    });
                } else if (percent >= 75) {
                    sortedInsights.push({ 
                        type: 'warning', 
                        priority: 4, 
                        message: `Warning: You have used ${percent.toFixed(0)}% of your monthly budget. Revising remaining expenses is recommended.`, 
                        icon: '⚠️' 
                    });
                } else if (percent < 45) {
                    sortedInsights.push({ 
                        type: 'success', 
                        priority: 2, 
                        message: `Budget Health Optimal: You've only used ${percent.toFixed(0)}% of your monthly budget so far.`, 
                        icon: '✅' 
                    });
                }
            }

            // Top Category Spike Detection
            if (topCat && topCat[1] > 3000) {
                sortedInsights.push({
                    type: 'warning',
                    priority: 3,
                    message: `Category Spike: You have spent ₹${topCat[1].toLocaleString()} on ${topCat[0]} this month. Review your recent transactions for reduction.`,
                    icon: '💸'
                });
            }

            // Steady Inflow Detection
            const currentMonthIncome = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
            if (currentMonthIncome > 0) {
                sortedInsights.push({
                    type: 'success',
                    priority: 2,
                    message: `Income Tracked: You earned a total of ₹${currentMonthIncome.toLocaleString()} this month. Great job tracking your inflows!`,
                    icon: '💰'
                });
            }

            // Lockout Fallback (if no data exists)
            if (sortedInsights.length === 0) {
                sortedInsights.push({
                    type: 'info',
                    priority: 1,
                    message: "FinSense AI: Add transactions and configure budgets to view real-time personalized insights.",
                    icon: '🤖'
                });
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
        const msg = (message || "").trim().toLowerCase();

        // 1. INSTANT KEYWORD PRE-CHECK (Lightning-fast responses, zero AI network delay)
        
        // Greetings
        if (msg.match(/^(hi|hello|hey|sup|yo|g'day|good morning|good afternoon|good evening)\b/) || msg === 'hi' || msg === 'hello') {
            return res.status(200).json({ response: "Hello! I am FinSense, your personal finance co-pilot. How can I help you manage your money today?" });
        }
        
        // Appreciations / Gratitude
        if (msg.includes('thank') || msg.includes('thanks') || msg === 'ok' || msg === 'okay' || msg === 'great' || msg === 'awesome') {
            return res.status(200).json({ response: "You're very welcome! Let me know if you want to inspect your budgets, category spending, or need some smart savings tips." });
        }
        
        // Bot Identity / capabilities
        if (msg.includes('who are you') || msg.includes('what can you do') || msg.includes('help') || msg === 'commands') {
            return res.status(200).json({ response: "I am FinSense, your AI financial assistant. I can help you analyze your spending habits, track budgets, and guide you around settings. Try asking: 'Where did I spend the most?' or 'How do I change my theme?'" });
        }

        // Theme and Visual mode
        if (msg.includes('theme') || msg.includes('dark mode') || msg.includes('light mode') || msg.includes('darkmode') || msg.includes('lightmode')) {
            return res.status(200).json({ response: "You can toggle between Dark Mode and Light Mode by navigating to the **Settings** page and selecting the *Visual Theme & Locale* section." });
        }

        // Password change / 2FA Security
        if (msg.includes('password') || msg.includes('change pass') || msg.includes('security') || msg.includes('two factor') || msg.includes('2fa')) {
            return res.status(200).json({ response: "To update your password or configure Two-Factor Authentication (2FA), go to the **Settings** page and select the *Account Security* tab." });
        }

        // Export data
        if (msg.includes('export') || msg.includes('csv') || msg.includes('excel') || msg.includes('download data')) {
            return res.status(200).json({ response: "You can download your entire financial data sheet by clicking the 'Export' button at the top of the **Transactions** page." });
        }

        // Delete account
        if (msg.includes('delete account') || msg.includes('remove account') || msg.includes('delete profile')) {
            return res.status(200).json({ response: "You can permanently delete your profile at the bottom of the *Account Settings* tab on the **Settings** page." });
        }

        // Keyboard shortcuts help
        if (msg.includes('shortcut') || msg.includes('keyboard') || msg.includes('key bind')) {
            return res.status(200).json({ response: "You can use global keyboard shortcuts to navigate quickly, such as `Alt+D` (Dashboard), `Alt+T` (Transactions), or `Alt+S` (Settings). Open the **Settings** page -> *Keyboard Shortcuts* tab to view the full list." });
        }

        // Add transaction
        if (msg.includes('add transaction') || msg.includes('new transaction') || msg.includes('add expense') || msg.includes('new expense')) {
            return res.status(200).json({ response: "To log a new expense or income, click the '+ New' button in the sidebar or press the keyboard shortcut `Alt+N` while on the Transactions page." });
        }

        // Gather relevant data (if we need to fetch insights or call AI)
        const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).limit(30);
        const budget = await Budget.findOne({
            user: userId,
            month: now.getMonth(),
            year: now.getFullYear(),
        });
        const spentThisMonth = Math.abs(transactions.filter(t => new Date(t.date).getMonth() === now.getMonth()).reduce((acc, t) => acc + (t.amount < 0 ? t.amount : 0), 0));

        const groq = getGroq();
        const genAI = getGenAI();

        const fetchGroqChat = async (financialContext) => {
            console.log("System - Prompting Groq (Llama-3.3-70b) for Chat...");
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are FinMate AI, a helpful finance expert. Answer the user's question briefly (under 2 sentences). Use ₹ for currency. Do not use markdown bold formatting like **. If the user greets you (e.g. 'hi', 'hello', 'hey'), reply with a warm, friendly greeting and ask how you can help them, without listing their budget details unless they specifically asked for them."
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
            return chatCompletion.choices[0].message.content;
        };

        const fetchGeminiChat = async (financialContext) => {
            console.log("System - Prompting Gemini-1.5-flash for Chat...");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are FinMate AI, a helpful finance expert.
Financial Data Context: ${financialContext}
User Question: "${message}"
Instructions: Answer the user's question briefly (under 2 sentences). Use ₹ for currency. Do not use markdown bold formatting like **. If the user greets you (e.g. 'hi', 'hello', 'hey'), reply with a warm, friendly greeting and ask how you can help, without listing the budget numbers or details unless asked.`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        };

        if (groq || genAI) {
            try {
                const limit = getBudgetLimit(budget);
                const financialContext = `
                Total Monthly Budget: ₹${limit || '0 (not set)'}
                Total Spent This Month: ₹${spentThisMonth}
                Remaining: ₹${limit ? limit - spentThisMonth : '0'}
                Recent Transactions: ${transactions.map(t => `${t.date.toDateString()}: ${t.description} (${t.category}) ₹${t.amount}`).join(', ')}`;

                // Chat: Groq primary → Gemini fallback
                if (groq) {
                    try {
                        const response = await fetchGroqChat(financialContext);
                        return res.status(200).json({ response });
                    } catch (groqErr) {
                        console.error("System - Groq Chat Failure, falling back to Gemini:", groqErr.message);
                        if (!genAI) throw groqErr;
                        const response = await fetchGeminiChat(financialContext);
                        return res.status(200).json({ response });
                    }
                }

                const response = await fetchGeminiChat(financialContext);
                return res.status(200).json({ response });
            } catch (aiErr) {
                console.error("System - AI Bridge Failure:", aiErr.message);
            }
        } else {
            console.log("No AI API Keys found - Falling back to local brain.");
        }

        // --- LOCAL INSIGHTS FALLBACK ENGINE (if AI fails / is rate-limited) ---
        const limit = getBudgetLimit(budget);
        const remaining = limit ? limit - spentThisMonth : 0;
        
        // Find top category
        const categories = {};
        transactions.forEach(tx => {
            if (tx.amount < 0) {
                categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount);
            }
        });
        const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
        const topCategory = sortedCategories[0]?.[0] || '';
        const topCategoryAmount = sortedCategories[0]?.[1] || 0;

        let fallbackText = "";

        // Budget / Balance / Remaining limit queries
        if (msg.includes('budget') || msg.includes('balance') || msg.includes('left') || msg.includes('remaining') || msg.includes('limit')) {
            if (limit > 0) {
                fallbackText = `Your total budget limit is ₹${limit.toLocaleString()}. You have spent ₹${spentThisMonth.toLocaleString()} this month, leaving you with ₹${remaining.toLocaleString()} to spend safely.`;
            } else {
                fallbackText = `You have spent ₹${spentThisMonth.toLocaleString()} this month. You haven't set a budget limit yet — you can configure one in the Budget tab!`;
            }
        }
        // Category spending / Overspending queries
        else if (msg.includes('overspend') || msg.includes('most spent') || msg.includes('spend most') || msg.includes('where did') || msg.includes('spending category') || msg.includes('top category')) {
            if (topCategory) {
                fallbackText = `Your highest spending category this month is "${topCategory}", with a total of ₹${topCategoryAmount.toLocaleString()} spent across your recent transactions.`;
            } else {
                fallbackText = "You haven't recorded any expenses this month yet. Once you add some transactions, I will analyze your top categories!";
            }
        }
        // Savings / Saving Tips
        else if (msg.includes('save') || msg.includes('saving') || msg.includes('tips') || msg.includes('reduce') || msg.includes('cut')) {
            if (topCategory) {
                const savings = Math.round(topCategoryAmount * 0.15);
                fallbackText = `Your top expense category is "${topCategory}" (₹${topCategoryAmount.toLocaleString()}). If you cut down your spending on ${topCategory} by 15%, you would save ₹${savings.toLocaleString()} this month!`;
            } else {
                fallbackText = "To save more money, try setting tight category budgets and tracking all your daily transactions. Add some transactions to get specific tips!";
            }
        }
        // Swiggy / Food delivery check
        else if (msg.includes('swiggy') || msg.includes('zomato') || msg.includes('food') || msg.includes('restaurant')) {
            const foodTx = transactions.filter(t => 
                t.description.toLowerCase().includes('swiggy') || 
                t.description.toLowerCase().includes('zomato') ||
                t.category.toLowerCase().includes('food')
            );
            const foodTotal = foodTx.reduce((acc, t) => acc + Math.abs(t.amount), 0);
            if (foodTotal > 0) {
                fallbackText = `You spent a total of ₹${foodTotal.toLocaleString()} on food delivery and dining out recently across ${foodTx.length} transactions.`;
            } else {
                fallbackText = "I couldn't find any recent food delivery or restaurant orders in your transactions.";
            }
        }
        // Income vs Expense / Trends / Comparison queries
        else if (msg.includes('income') || msg.includes('trend') || msg.includes('vs') || msg.includes('compare') || msg.includes('last month')) {
            const incomeThisMonth = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
            fallbackText = `This month you have recorded ₹${incomeThisMonth.toLocaleString()} in income and ₹${spentThisMonth.toLocaleString()} in total expenses. Visit the "Analytics" page to explore interactive trends!`;
        }
        // Fastest growing category
        else if (msg.includes('growing') || msg.includes('fastest')) {
            if (topCategory) {
                fallbackText = `Based on your recent transactions, "${topCategory}" is your fastest growing category with ₹${topCategoryAmount.toLocaleString()} spent.`;
            } else {
                fallbackText = "Add more transactions to track category growth and spending velocity!";
            }
        }
        // Predictions / Forecast
        else if (msg.includes('predict') || msg.includes('forecast') || msg.includes('next month')) {
            const estNext = Math.round(spentThisMonth * 1.08);
            fallbackText = `Based on current spending velocity, your estimated total expenses for next month will be approximately ₹${estNext.toLocaleString()}.`;
        }
        // Largest / High-value transactions
        else if (msg.includes('largest') || msg.includes('high-value') || msg.includes('biggest')) {
            const largestTx = transactions.filter(t => t.amount < 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
            if (largestTx) {
                fallbackText = `Your largest recent expense is "${largestTx.description}" (${largestTx.category}) for ₹${Math.abs(largestTx.amount).toLocaleString()}.`;
            } else {
                fallbackText = "No large expenses recorded in your recent transactions.";
            }
        }
        // Recurring expenses
        else if (msg.includes('recurring')) {
            fallbackText = "Your recurring expenses like Rent, Subscriptions, and Bills are tracked automatically in your Analytics & Budget tabs.";
        }
        // Near limit / Budget thresholds (Budget Page)
        else if (msg.includes('close to limit') || msg.includes('near limit') || msg.includes('threshold') || msg.includes('exceed')) {
            if (limit > 0) {
                const pct = Math.round((spentThisMonth / limit) * 100);
                if (pct >= 70) {
                    fallbackText = `⚠️ Budget Warning: You have used ${pct}% of your total monthly budget limit (₹${spentThisMonth.toLocaleString()} / ₹${limit.toLocaleString()}).`;
                } else {
                    fallbackText = `Your overall budget is healthy! You have used ${pct}% of your monthly limit so far (₹${spentThisMonth.toLocaleString()} / ₹${limit.toLocaleString()}).`;
                }
            } else {
                fallbackText = "You haven't configured a monthly budget limit yet. Set one up in the Budget tab to get threshold warnings!";
            }
        }
        // Fund Allocation & Unspent funds (Budget Page)
        else if (msg.includes('allocate') || msg.includes('allocation') || msg.includes('remaining funds')) {
            if (remaining > 0) {
                fallbackText = `You have ₹${remaining.toLocaleString()} remaining in unspent funds this month. Consider allocating a portion to your emergency savings goal!`;
            } else {
                fallbackText = "You have exhausted your budget for this month. Focus on essential spending until next month's reset.";
            }
        }
        // Recommend budget limits (Budget Page)
        else if (msg.includes('recommend') || msg.includes('suggest budget') || msg.includes('budget plan')) {
            const recBudget = Math.round(spentThisMonth * 1.15) || 25000;
            fallbackText = `💡 Recommended Target: Based on your recent spending pace, setting a monthly budget limit of ₹${recBudget.toLocaleString()} will keep your finances balanced.`;
        }
        // Circles & Group splits / dues (Circles Page)
        else if (msg.includes('who owes') || msg.includes('owe') || msg.includes('dues') || msg.includes('settle') || msg.includes('split') || msg.includes('dinner')) {
            fallbackText = "👥 FinMate Circles: Track group splits, shared dinner bills, and settle member dues directly in the Circles tab!";
        }
        // General fallback
        else {
            fallbackText = "I am ready to help you analyze your budget, spending categories, or give saving tips. Try asking me: 'Where did I overspend?' or 'How much budget is left?'";
        }

        res.status(200).json({ response: fallbackText });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ message: "Chat error" });
    }
};

export { getInsights, getChatResponse };
