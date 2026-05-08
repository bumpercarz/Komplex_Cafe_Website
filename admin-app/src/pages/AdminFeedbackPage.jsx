import React, { useState, useEffect, useMemo } from "react";
import "../css/AdminFeedbackPage.css"; // Keep your existing CSS file for the table/cards

// Layout & Auth Components
import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { getCurrentUser } from "../services/authService";

// Service Layer
import { subscribeToFeedbackItems } from "../services/adminFeedbackData";

export default function AdminFeedbackPage() {
  // Standard Admin Layout State
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Feedback Specific State
  const [feedbacks, setFeedbacks] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Setup Auth / Role
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Fetch Data using Service
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFeedbackItems(
      (data) => {
        setFeedbacks(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError("Failed to load feedback.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle Search Filtering (Optional, but hooks up to your Toolbar)
  const filteredFeedbacks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return feedbacks;

    return feedbacks.filter((fb) => {
      return (
        (fb.name || "anonymous").toLowerCase().includes(keyword) ||
        (fb.comments || "").toLowerCase().includes(keyword)
      );
    });
  }, [feedbacks, search]);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Math Helper
  const getAverage = (categoryObj) => {
    if (!categoryObj) return "0.0";
    const values = Object.values(categoryObj);
    if (values.length === 0) return "0.0";
    const sum = values.reduce((acc, val) => acc + val, 0);
    return (sum / values.length).toFixed(1);
  };

  // Label Helper
  const formatLabel = (str) => {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="amp-main">
        {/* We reuse your toolbar, but hide the + Add button since guests add feedback */}
        <AdminPageToolbar
          title="Feedback"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search feedback..."
        />

        {error && <div className="amp-empty" style={{color: 'red'}}>{error}</div>}
        
        {loading ? (
          <div className="amp-empty">Loading feedback...</div>
        ) : (
          <div className="admin-feedback-container">
            <p className="subtitle" style={{marginBottom: '15px', color: '#666'}}>
              Click on a row to expand and see detailed ratings.
            </p>

            <div className="table-wrapper">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Food</th>
                    <th>Customer service</th>
                    <th>Serving time</th>
                    <th>Cleanliness</th>
                    <th>Ambiance</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((fb) => (
                    <React.Fragment key={fb.id}>
                      {/* MAIN ROW */}
                      <tr 
                        className={`main-row ${expandedRow === fb.id ? "active" : ""}`} 
                        onClick={() => toggleRow(fb.id)}
                      >
                        <td className="guest-name">
                          {fb.name || "Anonymous"} 
                          <span className="chevron">{expandedRow === fb.id ? "∧" : "∨"}</span>
                        </td>
                        <td><span className="rating-badge">{getAverage(fb.food)}</span></td>
                        <td><span className="rating-badge">{getAverage(fb.customer_service)}</span></td>
                        <td><span className="rating-badge">{getAverage(fb.serving_time)}</span></td>
                        <td><span className="rating-badge">{getAverage(fb.cleanliness)}</span></td>
                        <td><span className="rating-badge">{getAverage(fb.ambiance)}</span></td>
                        <td className="comment-preview">
                          {fb.comments?.length > 40 ? `${fb.comments.substring(0, 40)}...` : fb.comments}
                        </td>
                      </tr>

                      {/* EXPANDED DETAILS ROW */}
                      {expandedRow === fb.id && (
                        <tr className="expanded-row">
                          <td colSpan="7">
                            <div className="expanded-content">
                              <div className="cards-grid">
                                
                                {/* Reusable Card Renderer */}
                                {[
                                  { title: "FOOD", data: fb.food },
                                  { title: "CUSTOMER SERVICE", data: fb.customer_service },
                                  { title: "SERVING TIME", data: fb.serving_time },
                                  { title: "CLEANLINESS", data: fb.cleanliness },
                                  { title: "AMBIANCE", data: fb.ambiance }
                                ].map((category, idx) => (
                                  <div className="detail-card" key={idx}>
                                    <h4>{category.title}</h4>
                                    <ul className="rating-list">
                                      {category.data && Object.entries(category.data).map(([key, value]) => (
                                        <li key={key}>
                                          <span>{formatLabel(key)}</span>
                                          <span className="rating-badge sm">{value}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="card-footer">
                                      <span>Avg: <strong>{getAverage(category.data)}</strong> / 5</span>
                                    </div>
                                  </div>
                                ))}

                              </div>

                              <div className="comment-card">
                                <h4>COMMENTS & SUGGESTIONS</h4>
                                <div className="comment-box">
                                  {fb.comments || "No comments provided."}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {filteredFeedbacks.length === 0 && (
                    <tr>
                      <td colSpan="7" className="amp-empty">No feedback found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}