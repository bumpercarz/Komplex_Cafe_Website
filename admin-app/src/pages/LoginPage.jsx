import React, { useState } from "react";
import "../css/LoginPage.css";
import bg from "../assets/login-bg.png";
import { validateCredentials } from "../services/authService";
import { useNavigate } from "react-router-dom";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

            <input
              type="password"
              placeholder="Password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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