import { useState } from "react";
import "../css/ConfirmationPage.css";

export default function FeedbackModal({ onClose }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [mobile,   setMobile]   = useState("");
  const [feedback, setFeedback] = useState("");
  const [sent,     setSent]     = useState(false);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSend = () => {
    const subject = encodeURIComponent(
      (name.trim() ? name.trim() + " - Submitted a Feedback" : "Customer Feedback")
    );
    const body = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\nMobile: ${mobile.trim() || "N/A"}\n\nFeedback:\n${feedback.trim()}`
    );
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=komplexcafe.feedback@gmail.com` +
      `&su=${subject}` +
      `&body=${body}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  const canSend = name.trim() && email.trim() && feedback.trim();

  return (
    <div className="fb-overlay" onClick={handleOverlayClick}>
      <div className="fb-modal">
        <button className="fb-close" onClick={onClose} aria-label="Close">✕</button>

        {sent ? (
          <div className="fb-sent">
            <span className="fb-sent-icon">💌</span>
            <p className="fb-sent-text">Gmail should have opened with your feedback ready to send. Thank you!</p>
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

            <button
              className="fb-btn-send"
              onClick={handleSend}
              disabled={!canSend}
            >
              Send Feedback
            </button>
          </>
        )}
      </div>
    </div>
  );
}