import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables IMMEDIATELY
dotenv.config();

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

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Middleware
app.use(cors({
  origin: true, 
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
      sameSite: 'lax'
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

app.get("/", (req, res) => {
  res.send("✅ FinMate API is alive and kicking (MJS Mode)!");
});

// Export for Vercel
export default app;

// Connect to DB for serverless
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
      .then(() => console.log("✅ MongoDB connected (MJS Serverless API)"))
      .catch(err => console.error("❌ MongoDB connection error:", err));
}
