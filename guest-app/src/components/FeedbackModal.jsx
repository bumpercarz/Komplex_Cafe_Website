import { useState } from "react";
import emailjs from '@emailjs/browser';
import "../css/ConfirmationPage.css";

export default function FeedbackModal({ onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // 1. Restrict input to numbers only
  const handleMobileChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setMobile(numericValue);
  };

  const handleSend = async () => {
    setStatus("sending");
    setErrorMsg("");
    
    try {
      // 🔴 REPLACE THESE WITH YOUR ACTUAL EMAILJS KEYS 🔴
      const serviceId = "service_q1glt0o"; 
      const templateId = "template_85cpp7w";
      const publicKey = "N0JSU43_LIisNJ4Yb";

      const templateParams = {
        user_name: name.trim() || "Guest",
        user_email: email.trim() || "No email provided",
        user_mobile: mobile.trim() || "No mobile provided",
        user_message: feedback.trim(),
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      
      setStatus("sent");
    } catch (err) {
      console.error("EmailJS Error:", err);
      setErrorMsg(err?.text || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  // 2. Validation Logic: It is valid if it's empty OR (starts with 09 AND is 11 digits)
  const isMobileValid = mobile === "" || (mobile.startsWith("09") && mobile.length === 11);
  const canSend = name.trim() && email.trim() && feedback.trim() && isMobileValid;

  return (
    <div className="fb-overlay" onClick={handleOverlayClick}>
      <div className="fb-modal">
        {status === "sent" ? (
          <div className="fb-success-view" style={{ textAlign: "center", padding: "20px 0" }}>
            <h3>Thank You! ☕</h3>
            <p>Your feedback has been sent successfully.</p>
            <button 
              className="fb-btn-send" 
              style={{ marginTop: "15px" }} 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="fb-field">
              <label className="fb-label">Name <span className="fb-required">*</span></label>
              <input
                className="fb-input"
                type="text"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="fb-field">
              <label className="fb-label">Email <span className="fb-required">*</span></label>
              <input
                className="fb-input"
                type="email"
                placeholder="juan@example.com"
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
                onChange={handleMobileChange}
                maxLength={11} // 3. Enforce max length HTML constraint
              />
              
              {/* 4. Display warning if user starts typing an invalid number */}
              {mobile.length > 0 && (!mobile.startsWith("09") || mobile.length !== 11) && (
                <span style={{ color: "#d9534f", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Must start with 09 and be exactly 11 digits.
                </span>
              )}
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