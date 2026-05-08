import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "../css/FeedbackModal.css";

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="fb-stars" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`fb-star ${star <= (hovered || value) ? "fb-star--filled" : ""}`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Rating Row Component ─────────────────────────────────────────────────────
function RatingRow({ question, value, onChange }) {
  return (
    <div className="fb-rating-row">
      <span className="fb-rating-question">{question}</span>
      <StarRating value={value} onChange={onChange} />
    </div>
  );
}

// ─── Category Section Component ───────────────────────────────────────────────
function CategorySection({ title, icon, questions, ratings, onRate }) {
  const allRated = Object.values(ratings).every((v) => v > 0);
  const avgRating =
    Object.values(ratings).reduce((a, b) => a + b, 0) /
    Object.values(ratings).length;

  return (
    <div className="fb-category">
      <div className="fb-category-header">
        <span className="fb-category-icon">{icon}</span>
        <span className="fb-category-title">{title}</span>
        {allRated && (
          <span className="fb-category-avg">{avgRating.toFixed(1)} / 5</span>
        )}
      </div>
      <div className="fb-category-body">
        {questions.map(({ key, label }) => (
          <RatingRow
            key={key}
            question={label}
            value={ratings[key]}
            onChange={(val) => onRate(key, val)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main FeedbackModal ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "food",
    title: "Food",
    icon: "🍽️",
    questions: [
      { key: "taste_and_flavor", label: "How satisfied are you with the taste and flavor of the food?" },
      { key: "presentation",     label: "How would you rate the presentation of the food?" },
      { key: "overall_quality",  label: "How would you rate the overall quality of the food?" },
    ],
  },
  {
    key: "customer_service",
    title: "Customer Service",
    icon: "🤝",
    questions: [
      { key: "friendliness",    label: "How would you rate the friendliness and courtesy of the staff?" },
      { key: "attentiveness",   label: "How satisfied are you with the attentiveness of the staff?" },
      { key: "overall_service", label: "How would you rate your overall service experience?" },
    ],
  },
  {
    key: "serving_time",
    title: "Serving Time",
    icon: "⏱️",
    questions: [
      { key: "waiting_time",     label: "How would you rate the waiting time for your order?" },
      { key: "speed_of_service", label: "How satisfied are you with the speed of service?" },
    ],
  },
  {
    key: "cleanliness",
    title: "Cleanliness",
    icon: "✨",
    questions: [
      { key: "dining_area", label: "How would you rate the cleanliness of the dining area?" },
      { key: "hygiene",     label: "How satisfied are you with the overall hygiene of the establishment?" },
    ],
  },
  {
    key: "ambiance",
    title: "Ambiance",
    icon: "🌿",
    questions: [
      { key: "atmosphere",              label: "How would you rate the overall atmosphere of the place?" },
      { key: "comfort_and_environment", label: "How satisfied are you with the comfort and environment?" },
    ],
  },
];

function buildInitialRatings() {
  const state = {};
  CATEGORIES.forEach(({ key, questions }) => {
    state[key] = {};
    questions.forEach(({ key: qKey }) => {
      state[key][qKey] = 0;
    });
  });
  return state;
}

export default function FeedbackModal({ onClose }) {
  const [name, setName]         = useState("");
  const [ratings, setRatings]   = useState(buildInitialRatings);
  const [comments, setComments] = useState("");
  const [status, setStatus]     = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleRate = (categoryKey, questionKey, value) => {
    setRatings((prev) => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], [questionKey]: value },
    }));
  };

  const allRated = CATEGORIES.every(({ key, questions }) =>
    questions.every(({ key: qKey }) => ratings[key][qKey] > 0)
  );

  const handleSubmit = async () => {
    if (!allRated) return;
    setStatus("sending");
    setErrorMsg("");

    const rawGuestId = sessionStorage.getItem("guest_id");
    const guestId = rawGuestId ? Number(rawGuestId) : null;

    try {
      await addDoc(collection(db, "tbl_feedback"), {
        ...(guestId !== null ? { guest_id: guestId } : {}),
        name:             name.trim() || "Anonymous",
        food:             ratings.food,
        customer_service: ratings.customer_service,
        serving_time:     ratings.serving_time,
        cleanliness:      ratings.cleanliness,
        ambiance:         ratings.ambiance,
        comments:         comments.trim(),
        f_timestamp:      serverTimestamp(),
      });
      setStatus("sent");
    } catch (err) {
      console.error("Feedback submit error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="fb-overlay" onClick={handleOverlayClick}>
        <div className="fb-modal">
          <div className="fb-success">
            <div className="fb-success-icon">☕</div>
            <h3 className="fb-success-title">Thank you!</h3>
            <p className="fb-success-text">
              Your feedback has been submitted. We appreciate you taking the time to help us improve.
            </p>
            <button className="fb-btn-submit" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-overlay" onClick={handleOverlayClick}>
      <div className="fb-modal">
        <div className="fb-header">
          <h2 className="fb-title">Share Your Experience</h2>
          <p className="fb-subtitle">Rate each area from 1 (poor) to 5 (excellent)</p>
          <button className="fb-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="fb-body">
          {/* Name */}
          <div className="fb-field">
            <label className="fb-label">
              Name <span className="fb-optional">(optional)</span>
            </label>
            <input
              className="fb-input"
              type="text"
              placeholder="Juan Dela Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Rating Categories */}
          {CATEGORIES.map((cat) => (
            <CategorySection
              key={cat.key}
              title={cat.title}
              icon={cat.icon}
              questions={cat.questions}
              ratings={ratings[cat.key]}
              onRate={(qKey, val) => handleRate(cat.key, qKey, val)}
            />
          ))}

          {/* Comments */}
          <div className="fb-field">
            <label className="fb-label">Comments and Suggestions</label>
            <p className="fb-field-hint">
              Please share any additional feedback, comments, or suggestions to help us improve:
            </p>
            <textarea
              className="fb-textarea"
              placeholder="Tell us about your experience…"
              value={comments}
              onChange={(e) => {
                if (e.target.value.length <= 255) setComments(e.target.value);
              }}
              rows={4}
              maxLength={255}
            />
            <span className="fb-charcount">{comments.length}/255</span>
          </div>

          {status === "error" && <p className="fb-error">{errorMsg}</p>}

          {!allRated && (
            <p className="fb-validation-hint">Please rate all categories before submitting.</p>
          )}

          <button
            className="fb-btn-submit"
            onClick={handleSubmit}
            disabled={!allRated || status === "sending"}
          >
            {status === "sending" ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}