import React, { useState } from 'react';
import { supabase } from "../../supabase";


const pipValueTable = {
  "EURUSD": 10,
  "GBPUSD": 10,
  "AUDUSD": 10,
  "NZDUSD": 10,

  "USDJPY": 0.091, // 1 pip = 0.01, so value ≈ $0.091 per micro lot
  "EURJPY": 0.091,
  "GBPJPY": 0.091,

  "USDCAD": 7.5,
  "USDCHF": 9.5,

  "XAUUSD": 1,   // 1 pip = 1 cent, 0.01 move = $1 for 1 lot
  "XAGUSD": 0.5,
  "BTCUSD": 1,   // simplified: $1 per 0.01 unit
  "ETHUSD": 1
};

export default function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);


  

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    accountName: "",
    capital: 0,
    password: "",
    confirmPassword: ""
  });

  // ---------------------------
  // Store user in localStorage
  // ---------------------------
  const storeUserInLocalStorage = (user) => {
    localStorage.setItem("zipha_user", JSON.stringify(user));
    localStorage.setItem("zipha_user_id", user.id);
  };

  // ---------------------------
  // Input change handler
  // ---------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: name === "capital" ? Number(value) : value
    });
  };

  // ---------------------------
  // SIGNUP
  // ---------------------------
  const handleSignup = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    // 1. Create user in zipha-tracker-users (NO capital, NO account name)
    const { data: user, error } = await supabase
      .from("zipha-tracker-users")
      .insert([
        {
          name: formData.name,
          email: formData.email,
          password: formData.password
        }
      ])
      .select()
      .single();

    if (error) {
      setLoading(false);
      alert("Signup error: " + error.message);
      return;
    }

    // 2. Create account in zipha-accounts
    const { error: accountError } = await supabase
      .from("zipha-accounts")
      .insert([
        {
          account_name: formData.accountName,
          user_id: user.id,
          capital: Number(formData.capital)
        }
      ]);

    if (accountError) {
      setLoading(false);
      alert("Account creation error: " + accountError.message);
      return;
    }

    // 3. Save extended data to localStorage
    storeUserInLocalStorage({
      ...user,
      accountName: formData.accountName,
      capital: formData.capital
    });

    console.log("🔐 SIGNUP SUCCESS — User & Account Created");
    console.log(user);

    setLoading(false);
    if (onLoginSuccess) onLoginSuccess();
  };

  // ---------------------------
  // LOGIN
  // ---------------------------
  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("zipha-tracker-users")
      .select("*")
      .eq("email", formData.email)
      .eq("password", formData.password)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Invalid email or password.");
      return;
    }

    // Store user info (account will be loaded later)
    storeUserInLocalStorage(data);

    console.log("🔑 LOGIN SUCCESS — User Info:");
    console.log(data);

    alert("Login successful!");

    if (onLoginSuccess) onLoginSuccess();
  };

  // ---------------------------
  // SUBMIT
  // ---------------------------
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) handleLogin();
    else handleSignup();
  };

  // ---------------------------
  // Toggle login/signup form
  // ---------------------------
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: "",
      email: "",
      accountName: "",
      capital: 0,
      password: "",
      confirmPassword: ""
    });
  };

  // ---------------------------
  // UI RENDER
  // ---------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1F2937  0%, #374151 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '440px',
        padding: '30px',
        animation: 'slideUp 0.5s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '23px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '8px'
          }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#718096'
          }}>
            {isLogin ? 'Enter your credentials to continue' : 'Sign up to get started'}
          </p>
        </div>

        <div>

          {/* NAME FIELD */}
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* ACCOUNT NAME FIELD */}
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Account Name
              </label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleInputChange}
                placeholder="My Trading Account"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* EMAIL FIELD */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CAPITAL FIELD */}
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Capital ($)
              </label>
              <input
                type="number"
                name="capital"
                value={formData.capital}
                onChange={handleInputChange}
                placeholder="300"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* PASSWORD */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CONFIRM PASSWORD */}
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* LOGIN OPTIONS */}
          {isLogin && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" style={{ marginRight: '8px' }} />
                <span style={{ color: '#4a5568' }}>Remember me</span>
              </label>
              <a href="#" style={{ color: '#667eea', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              background: loading
                ? '#4B5563'
                : 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              marginBottom: '20px',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {loading ? (
              <div className="spinner" style={{
                width: "18px",
                height: "18px",
                border: "3px solid rgba(255,255,255,0.3)",
                borderTop: "3px solid white",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite"
              }}></div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </div>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#4a5568' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={toggleForm}
              style={{
                marginLeft: '6px',
                color: '#EF4444',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
