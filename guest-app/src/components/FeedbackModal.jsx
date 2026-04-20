import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import "../css/ConfirmationPage.css";

export default function FeedbackModal({ onClose }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [mobile,   setMobile]   = useState("");
  const [feedback, setFeedback] = useState("");
  const [status,   setStatus]   = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSend = async () => {
    setStatus("sending");
    setErrorMsg("");
    try {
      const functions = getFunctions();
      const sendFeedbackEmail = httpsCallable(functions, "sendFeedbackEmail");
      await sendFeedbackEmail({
        name:     name.trim(),
        email:    email.trim(),
        mobile:   mobile.trim(),
        feedback: feedback.trim(),
      });
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const canSend = name.trim() && email.trim() && feedback.trim();

  return (
    <div className="fb-overlay" onClick={handleOverlayClick}>
      <div className="fb-modal">
        <button className="fb-close" onClick={onClose} aria-label="Close">✕</button>

        {status === "sent" ? (
          <div className="fb-sent">
            <span className="fb-sent-icon">💌</span>
            <p className="fb-sent-text">Your feedback has been sent. Thank you!</p>
            <button className="fb-btn-done" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h3 className="fb-title">Share Your Experience</h3>
            <p className="fb-subtitle">We'd love to hear from you!</p>

            <div className="fb-field">
              <label className="fb-label">Name <span className="fb-required">*</span></label>
              <input
                className="fb-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="fb-field">
              <label className="fb-label">Email <span className="fb-required">*</span></label>
              <input
                className="fb-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="fb-field">
              <label className="fb-label">Mobile Number</label>
              <input
                className="fb-input"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="fb-field">
              <label className="fb-label">Feedback <span className="fb-required">*</span></label>
              <textarea
                className="fb-textarea"
                placeholder="Tell us about your experience…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <span className="fb-charcount">{feedback.length}/500</span>
            </div>

            {status === "error" && (
              <p className="fb-error">{errorMsg}</p>
            )}

            <button
              className="fb-btn-send"
              onClick={handleSend}
              disabled={!canSend || status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send Feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
