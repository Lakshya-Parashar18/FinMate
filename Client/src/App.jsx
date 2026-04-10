import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from "./components/Layout";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Dashboard from "./Pages/Dashboard";
import Settings from "./Pages/Settings";
import LandingPage from "./Pages/LandingPage";
import Profile from "./Pages/Profile";
import Transactions from "./Pages/Transactions";
import Budget from "./Pages/Budget";
import Analytics from "./Pages/Analytics";
import VerifyEmail from "./Pages/VerifyEmail";
import AboutPage from "./Pages/AboutPage";
import PrivacyPage from "./Pages/PrivacyPage";
import TermsPage from "./Pages/TermsPage";
import ContactPage from "./Pages/ContactPage";
import ScrollToTop from "./utils/ScrollToTop";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "963989423266-eq5fmh2e0bp0vq88sui3fv59qhg3ldae.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <DisplaySettingsProvider>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify/:token" element={<VerifyEmail />} />
              <Route 
                path="/settings" 
                element={<PrivateRoute><Settings /></PrivateRoute>}
              />
              <Route 
                path="/dashboard" 
                element={<PrivateRoute><Dashboard /></PrivateRoute>}
              />
              <Route 
                path="/profile" 
                element={<PrivateRoute><Profile /></PrivateRoute>}
              />
              <Route 
                path="/transactions" 
                element={<PrivateRoute><Transactions /></PrivateRoute>}
              />
              <Route 
                path="/budget" 
                element={<PrivateRoute><Budget /></PrivateRoute>}
              />
               <Route path="/analytics" 
                 element={<PrivateRoute><Analytics /></PrivateRoute>}
               />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </DisplaySettingsProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
