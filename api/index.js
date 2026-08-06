import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables IMMEDIATELY
dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });

import session from "express-session";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";

// Imports from the original server folder
import authRoutes from "../server/routes/authRoutes.js";
import transactionRoutes from "../server/routes/transactionRoutes.js";
import budgetRoutes from "../server/routes/budgetRoutes.js";
import userRoutes from "../server/routes/userRoutes.js";
import dashboardRoutes from "../server/routes/dashboardRoutes.js";
import analyticsRoutes from "../server/routes/analyticsRoutes.js";
import insightRoutes from "../server/routes/insightRoutes.js";
import testimonialRoutes from "../server/routes/testimonialRoutes.js";
import subscriberRoutes from "../server/routes/subscriberRoutes.js";
import supportRoutes from "../server/routes/supportRoutes.js";
import goalRoutes from "../server/routes/goalRoutes.js";
import circleRoutes from "../server/routes/circleRoutes.js";
import aiRoutes from "../server/routes/aiRoutes.js";
import anomalyRoutes from "../server/routes/anomalyRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!MONGO_URI || !SESSION_SECRET) {
  console.error("❌ Fatal Error: MONGO_URI or SESSION_SECRET is not defined");
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session Middleware
app.use(
  session({
    secret: SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/circles", circleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/anomaly", anomalyRoutes);

app.get("/api/health", async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  let aiStatus = "NOT_CONFIGURED";
  let aiHealthDetails = null;

  if (process.env.AI_SERVICE_URL) {
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL}/api/ai/health`);
      if (response.ok) {
        aiHealthDetails = await response.json();
        aiStatus = aiHealthDetails.status === "healthy" ? "CONNECTED" : "DEGRADED";
      } else {
        aiStatus = "UNHEALTHY";
      }
    } catch (err) {
      aiStatus = "ERROR";
    }
  }

  res.json({
    status: (dbConnected && (aiStatus === "CONNECTED" || aiStatus === "NOT_CONFIGURED")) ? "healthy" : "unhealthy",
    uptime: process.uptime(),
    database: dbConnected ? "CONNECTED" : "DISCONNECTED",
    aiService: {
      status: aiStatus,
      details: aiHealthDetails
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.send("✅ FinMate API is alive and kicking!");
});

// Export for Vercel
export default app;

// Connect to DB for serverless
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected (Serverless API)"))
  .catch(err => console.error("❌ MongoDB connection error:", err));
