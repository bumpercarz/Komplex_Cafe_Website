import React, { useState } from "react";
import "../css/LoginPage.css";
import bg from "../assets/login-bg.png";
import { validateCredentials } from "../services/authService";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const result = await validateCredentials(email, password);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      navigate(result.redirectTo);
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong while logging in.");
    }
  }

  return (
    <div className="login-container" style={{ backgroundImage: `url(${bg})` }}>
      <div className="overlay">
        <div className="login-card">
          <div className="logo-circle" />

          <h1 className="title">Komplex Cafe</h1>
          <p className="subtitle">ADMIN / STAFF</p>

          <form className="form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="input password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            {error && <p className="form-msg error">{error}</p>}
            {success && <p className="form-msg success">{success}</p>}

            <button className="login-btn" type="submit">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}