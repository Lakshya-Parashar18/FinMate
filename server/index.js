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
dotenv.config({ path: path.join(__dirname, ".env") });

import session from "express-session";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import subscriberRoutes from "./routes/subscriberRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
console.log("Server loaded Google Client ID:", process.env.GOOGLE_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!MONGO_URI || !SESSION_SECRET) {
  console.error("❌ Fatal Error: MONGO_URI or SESSION_SECRET is not defined in .env file");
  process.exit(1); // Exit if essential variables are missing
}

// Middleware
app.use(cors({ // Configure CORS if your frontend is on a different origin
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Allow frontend origin
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser()); // Parse cookies

// Session Middleware Configuration
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions', // Optional: specify collection name
      ttl: 14 * 24 * 60 * 60 // Session TTL = 14 days
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // Cookie max age = 14 days
      httpOnly: true, // Prevent client-side JS from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Adjust as needed for cross-site requests
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

// Test Route
app.get("/", (req, res) => {
  res.send("✅ FinMate Backend is running!");
});

// Export the app for Vercel
export default app;

// Start the server ONLY if not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected (Local/Standard Mode)");
      app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
      console.error("❌ MongoDB connection error:", err);
      process.exit(1);
    });
} else {
    // In Vercel, we connect to DB but don't call app.listen()
    mongoose.connect(MONGO_URI)
      .then(() => console.log("✅ MongoDB connected (Serverless Mode)"))
      .catch(err => console.error("❌ MongoDB serverless connection error:", err));
}
