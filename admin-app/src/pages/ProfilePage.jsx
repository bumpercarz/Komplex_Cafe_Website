import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/AdminProfilePage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import StaffTopbar from "../components/StaffTopbar";

import { getCurrentUser, updateCurrentUserProfile, logoutUser } from "../services/authService";
import { getAllUsersLive } from "../services/adminUserData";

function toRoleLabel(role) {
  const normalized = String(role || "").toUpperCase();
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

export default function ProfilePage({ role = "STAFF", showMenu = false }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    contactNumber: "",
    password: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      contactNumber: user.contactNumber || "",
      password: "",
    });
  }, [navigate]);

  const roleLabel = useMemo(() => currentUser?.role || role, [currentUser, role]);

  function handleChange(e) {
    const { name, value } = e.target;
    let newValue = value;

    // Contact number validation: digits only, start with 09, max 11
    if (name === "contactNumber") {
      newValue = newValue.replace(/\D/g, "");
      if (!newValue.startsWith("09")) newValue = "09" + newValue.slice(2);
      if (newValue.length > 11) newValue = newValue.slice(0, 11);
    }

    // Password validation: max 16 characters
    if (name === "password" && newValue.length > 16) newValue = newValue.slice(0, 16);

    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  function handleReset() {
    if (!currentUser) return;
    setForm({
      name: currentUser.name || "",
      email: currentUser.email || "",
      contactNumber: currentUser.contactNumber || "",
      password: "",
    });
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const allUsers = await getAllUsersLive();
      const duplicate = allUsers.find(
        (u) => u.contactNumber === form.contactNumber && u.id !== currentUser.id
      );
      if (duplicate) {
        setMessage("This contact number is already in use by another user.");
        setSaving(false);
        return;
      }

      if (form.password && (form.password.length < 8 || form.password.length > 16)) {
        setMessage("Password must be 8–16 characters long.");
        setSaving(false);
        return;
      }

      const result = await updateCurrentUserProfile(form);
      if (!result.ok) {
        setMessage(result.message);
        setSaving(false);
        return;
      }

      setCurrentUser(getCurrentUser());
      setForm((prev) => ({ ...prev, password: "" }));
      setMessage(result.message);
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage(error?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logoutUser();
    navigate("/");
  }

  if (!currentUser) return null;

  return (
    <div className="ad-root">
      {showMenu ? (
        <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      ) : (
        <StaffTopbar roleLabel={roleLabel} />
      )}
      {showMenu && <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />}

      <main className="apf-main">
        <div className="apf-backBtnWrapper">
          <button type="button" className="apf-backBtn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        <h1 className="apf-title">Profile</h1>

        <div className="apf-grid">
          <section className="apf-summaryCard">
            <div className="apf-avatarLarge" />
            <h2 className="apf-name">{currentUser.name}</h2>
            <p className="apf-email">{currentUser.email}</p>
            <div className="apf-roleBadge">{toRoleLabel(currentUser.role)}</div>

            <div className="apf-infoList">
              <div className="apf-infoRow">
                <span>Role</span>
                <strong>{toRoleLabel(currentUser.role)}</strong>
              </div>
              <div className="apf-infoRow">
                <span>Contact Number</span>
                <strong>{currentUser.contactNumber || "N/A"}</strong>
              </div>
              <div className="apf-infoRow">
                <span>Date Registered</span>
                <strong>{currentUser.dateRegistered || "N/A"}</strong>
              </div>
            </div>

            <button type="button" className="apf-logoutBtn" onClick={handleLogout}>
              Log Out
            </button>
          </section>

          <section className="apf-formCard">
            <div className="apf-cardTitle">Edit Profile</div>

            <form className="apf-form" onSubmit={handleSubmit}>
              <div className="apf-formGrid">
                <div className="apf-formGroup">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Firstname Lastname"
                  />
                </div>

                <div className="apf-formGroup">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@gmail.com"
                  />
                </div>

                <div className="apf-formGroup">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                  />
                </div>

                <div className="apf-formGroup apf-formGroupFull">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>

              {message && <div className="apf-message">{message}</div>}

              <div className="apf-formActions">
                <button type="button" className="apf-resetBtn" onClick={handleReset}>
                  Reset
                </button>
                <button type="submit" className="apf-saveBtn" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}