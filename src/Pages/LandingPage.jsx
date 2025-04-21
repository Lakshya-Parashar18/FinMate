import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import "./LandingPage.css";

export default function LandingPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const responseGoogle = async (response) => {
    if (!response.credential) {
      setError('Google login failed. Please try again.');
      return;
    }

    try {
      const res = await fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const data = await res.json();
      console.log('User authenticated:', data);
      // Redirect to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Error authenticating user:', error);
      setError('Failed to authenticate. Please try again.');
    }
  };

  return (
    <div className="landing-page">
      <div className="overlay" />
      <header className="navbar glass">
        <div className="logo-container">
          <img src="/logo.png" alt="FinMate Logo" className="logo-icon" />
          <div className="logo-text">
            <div className="brand-name">FinMate</div>
            <div className="slogan">Let the SAVINGS Begin!!</div>
          </div>
        </div>

        <div className="nav-group">
          <Link to="/signup" className="get-started-button">
            Get Started ➪
          </Link>
          <div className="google-login-container">
            <GoogleLogin
              onSuccess={responseGoogle}
              onError={() => setError('Google login failed. Please try again.')}
              useOneTap
              theme="filled_blue"
              shape="pill"
              text="signin_with"
              size="large"
            />
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </header>

      <main className="main-content glass">
        <h1>Smarter Spending Starts Here</h1>
        <p>Your intelligent expense companion built for student life.</p>
        
        <div className="auth-boxes">
          <div className="auth-box signup-box">
            <h2>New to FinMate?</h2>
            <p>Create an account and start managing your finances today.</p>
            <Link to="/signup" className="cta-button signup">Sign Up</Link>
          </div>
          
          <div className="auth-box login-box">
            <h2>Already a Member?</h2>
            <p>Welcome back! Sign in to continue your financial journey.</p>
            <Link to="/login" className="cta-button login">Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
