import React, { useEffect, useMemo, useState } from "react";
// RESTORED: This must be AdminMenuPage.css so the amp- modal classes work!
import "../css/AdminMenuPage.css"; 

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { FaTrash } from "react-icons/fa";

import {
  USER_ROLE_OPTIONS,
  getAllUsersLive,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  transferOwnership,
} from "../services/adminUserData";

import { getCurrentUser, setCurrentUser } from "../services/authService";

// NEW: Import the user notification functions
import {
  notifyUserAdd,
  notifyUserUpdate,
  notifyUserDelete
} from "../services/adminNotificationData";

/* Modal Shell */
function ModalShell({ children, onClose }) {
  return (
    <div className="amp-modalBackdrop" onClick={onClose}>
      <div className="amp-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* User Form Modal */
function UserFormModal({ mode, form, editingUser, onChange, onSubmit, onClose, isSubmitting }) {
  const isEditingOwner = mode === "edit" && form.role === "OWNER";

  return (
    <ModalShell onClose={onClose}>
      <form className="amp-formModal" onSubmit={onSubmit}>
        <button type="button" className="amp-closeBtn" onClick={onClose}>
          X
        </button>

        <div className="amp-modalGrid">
          <div className="amp-modalLeft">
            
            <div className="amp-formGroup">
              <div className="amp-labelRow">
                <label>Full Name</label>
                <span className={`amp-charCount ${(form.name || "").length >= 50 ? "amp-charCountMax" : ""}`}>
                  {(form.name || "").length}/50
                </span>
              </div>
              <input 
                type="text" 
                name="name" 
                value={form.name || ""} 
                onChange={onChange} 
                maxLength={50}
                required 
              />
            </div>

            <div className="amp-formGroup">
              <div className="amp-labelRow">
                <label>Email</label>
                <span className={`amp-charCount ${(form.email || "").length >= 100 ? "amp-charCountMax" : ""}`}>
                  {(form.email || "").length}/100
                </span>
              </div>
              <input 
                type="email" 
                name="email" 
                value={form.email || ""} 
                onChange={onChange} 
                maxLength={100}
                required 
              />
            </div>

            <div className="amp-formGroup">
              <div className="amp-labelRow">
                <label>{mode === "edit" ? "New Password" : "Password"}</label>
                <span className={`amp-charCount ${(form.password || "").length >= 16 ? "amp-charCountMax" : ""}`}>
                  {(form.password || "").length}/16
                </span>
              </div>
              <input 
                type="password" 
                name="password" 
                value={form.password || ""} 
                onChange={onChange} 
                maxLength={16}
              />
              <small style={{ marginTop: "-6px", color: "#666" }}>
                {mode === "edit" ? "Leave blank to keep current. (8-16 chars)" : "Must be 8-16 characters"}
              </small>
            </div>
          </div>

          <div className="amp-modalRight">
            
            <div className="amp-formGroup">
              <label>Role</label>
              <select 
                name="role" 
                value={form.role || "STAFF"} 
                onChange={onChange}
                disabled={isEditingOwner} 
                style={isEditingOwner ? { background: "#dddddd", color: "#666", cursor: "not-allowed" } : {}}
              >
                {isEditingOwner ? (
                  <option value="OWNER">Owner</option>
                ) : (
                  USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="amp-formGroup">
              <div className="amp-labelRow">
                <label>Contact Number</label>
                <span className={`amp-charCount ${(form.contactNumber || "").length >= 11 ? "amp-charCountMax" : ""}`}>
                  {(form.contactNumber || "").length}/11
                </span>
              </div>
              <input
                type="text"
                name="contactNumber"
                value={form.contactNumber || ""}
                onChange={onChange}
                placeholder="Numbers only (max 11)"
                maxLength={11}
                required
              />
            </div>

            <div className="amp-formGroup">
              <label>Date Registered</label>
              <input
                type="text"
                value={mode === "edit" && editingUser ? editingUser.dateRegistered : "Auto-generated"}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="amp-modalActions">
          <button type="submit" className="amp-saveBtn" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button type="button" className="amp-exitBtn" onClick={onClose}>
            Exit
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* Delete Confirmation Modal */
function DeleteConfirmModal({ user, onConfirm, onClose, isDeleting }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="amp-formModal">
        <button type="button" className="amp-closeBtn" onClick={onClose}>
          X
        </button>

        <h3>Confirm Delete</h3>
        <p>
          Are you sure you want to remove <strong>{user?.name}</strong>?
        </p>

        <div className="amp-modalActions">
          <button className="amp-saveBtn" onClick={() => onConfirm(user.id)} disabled={isDeleting} style={{ background: "#df4735", color: "#fff" }}>
            {isDeleting ? "Deleting..." : "Confirm"}
          </button>
          <button className="amp-exitBtn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* Transfer Ownership Confirmation Modal */
function TransferOwnershipModal({ user, onConfirm, onClose, isTransferring }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="amp-formModal">
        <button type="button" className="amp-closeBtn" onClick={onClose}>
          X
        </button>

        <h3>Transfer Ownership</h3>
        <p>
          Transfer ownership to <strong>{user?.name}</strong>? You will become
          an Admin.
        </p>

        <div className="amp-modalActions">
          <button className="amp-saveBtn" onClick={() => onConfirm(user.id)} disabled={isTransferring} style={{ background: "#df4735", color: "#fff" }}>
            {isTransferring ? "Transferring..." : "Confirm"}
          </button>
          <button className="amp-exitBtn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* MAIN PAGE */
export default function AdminUsersPage() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const isOwner = currentUser?.role === "OWNER";

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ type: null, userId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
    contactNumber: "",
  });

  async function loadUsers() {
    const data = await getAllUsersLive();
    setUsers(data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();
    return users.filter((u) =>
      Object.values(u).join(" ").toLowerCase().includes(keyword)
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === modal.userId) || null,
    [users, modal.userId]
  );

  function closeModal() {
    setModal({ type: null, userId: null });
  }

  function openAdd() {
    setForm({ name: "", email: "", password: "", role: "STAFF", contactNumber: "" });
    setModal({ type: "add", userId: null });
  }

  function openEdit(user) {
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "STAFF",
      contactNumber: user.contactNumber || "",
    });
    setModal({ type: "edit", userId: user.id });
  }

  function handleDelete(id) {
    setModal({ type: "delete", userId: id });
  }

  async function confirmDelete(id) {
    setIsDeleting(true);
    try {
      // Find the user data before deleting for the notification
      const userToDelete = users.find(u => u.id === id);

      const result = await deleteUserAccount(id);
      if (!result?.ok) {
        alert(result?.message || "Delete failed.");
        return;
      }

      // NEW: Trigger Notification
      if (userToDelete) {
        await notifyUserDelete({
          userName: userToDelete.name,
          actor: currentUser?.name || roleLabel
        });
      }

      await loadUsers();
      closeModal();
    } catch (error) {
      alert(error.message || "An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleTransfer(user) {
    setModal({ type: "transfer", userId: user.id });
  }

  async function confirmTransfer(newOwnerId) {
    setIsTransferring(true);
    try {
      const userToTransferTo = users.find(u => u.id === newOwnerId);
      const result = await transferOwnership(currentUser.id, newOwnerId);

      if (!result?.ok) {
        alert(result?.message || "Transfer failed.");
        return;
      }

      // NEW: Trigger Notification
      if (userToTransferTo) {
        await notifyUserUpdate({
          userName: userToTransferTo.name,
          changes: `Ownership transferred by ${currentUser.name || "Owner"}`,
          actor: currentUser?.name || roleLabel
        });
      }

      const updatedUser = { ...currentUser, role: "ADMIN" };
      setCurrentUser(updatedUser);
      setCurrentUserState(updatedUser);

      await loadUsers();
      closeModal();
    } catch (error) {
      alert(error.message || "An error occurred during transfer.");
    } finally {
      setIsTransferring(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "contactNumber") {
      newValue = newValue.replace(/\D/g, ""); // Allow only digits
      if (newValue.length > 11) newValue = newValue.slice(0, 11);
    }

    if (name === "name" && newValue.length > 50) newValue = newValue.slice(0, 50);
    if (name === "email" && newValue.length > 100) newValue = newValue.slice(0, 100);
    if (name === "password" && newValue.length > 16) newValue = newValue.slice(0, 16);

    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const { name, email, password, role, contactNumber } = form;

    if (name.trim().length > 50) return alert("Name cannot exceed 50 characters.");
    if (email.trim().length > 100) return alert("Email cannot exceed 100 characters.");
    if (contactNumber.trim().length > 11) return alert("Contact number cannot exceed 11 characters.");
    if (!['ADMIN', 'STAFF', 'OWNER'].includes(role)) return alert("Invalid role selected.");

    if (modal.type === "add" && (password.length < 8 || password.length > 16)) {
      return alert("Password must be between 8 and 16 characters.");
    }
    if (modal.type === "edit" && password.length > 0 && (password.length < 8 || password.length > 16)) {
      return alert("New password must be between 8 and 16 characters.");
    }

    setIsSubmitting(true);
    try {
      let result;
      if (modal.type === "add") {
        result = await createUserAccount(form);

        // NEW: Trigger Add Notification
        if (result?.ok) {
          await notifyUserAdd({
            userName: form.name,
            role: form.role,
            actor: currentUser?.name || roleLabel
          });
        }
      } else {
        result = await updateUserAccount(modal.userId, form);

        // NEW: Figure out what changed for the notification
        if (result?.ok && selectedUser) {
          let changes = [];
          if (selectedUser.role !== form.role) changes.push(`role to ${form.role}`);
          if (selectedUser.email !== form.email) changes.push(`email to ${form.email}`);
          if (form.password) changes.push(`password`);
          if (selectedUser.contactNumber !== form.contactNumber) changes.push(`contact number`);
          let changesStr = changes.length > 0 ? `Changed ${changes.join(", ")}.` : "Details updated.";

          await notifyUserUpdate({
            userName: form.name,
            changes: changesStr,
            actor: currentUser?.name || roleLabel
          });
        }
      }

      if (!result?.ok) {
        alert(result?.message || "Operation failed.");
        return;
      }

      await loadUsers();
      closeModal();
    } catch (error) {
      alert(error.message || "An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  useNotificationSound();
  
  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="amp-main">
        <AdminPageToolbar
          title="Users"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
          addLabel="+ Add"
          onAdd={openAdd}
        />

        <div className="amp-tableOuter">
          <div className="amp-tableWrap">
            <table className="amp-table">
              <thead>
                <tr>
                  <th className="amp-nameCell">Name</th>
                  <th className="amp-descCell">Email</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Date Registered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const targetIsOwner = user.role === "OWNER";
                  const isSelf = user.id === currentUser?.id;

                  const showEdit = isOwner || !targetIsOwner;
                  const showDelete = (isOwner && !isSelf) || (!isOwner && !targetIsOwner);
                  const showTransfer = isOwner && !isSelf;

                  return (
                    <tr key={user.id}>
                      <td className="amp-nameCell">
                        <div className="amp-wrapText amp-nameWrap">{user.name}</div>
                      </td>
                      <td className="amp-descCell">
                        <div className="amp-wrapText amp-descWrap">{user.email}</div>
                      </td>
                      <td>{user.roleLabel || user.role}</td>
                      <td>{user.contactNumber}</td>
                      <td>{user.dateRegistered}</td>
                      <td className="amp-actionsCell">
                        {showEdit && (
                          <button
                            className="amp-editBtn"
                            onClick={() => openEdit(user)}
                          >
                            Edit
                          </button>
                        )}
                        {showDelete && (
                          <button
                            className="amp-deleteBtn"
                            onClick={() => handleDelete(user.id)}
                          >
                            <FaTrash /> 
                          </button>
                        )}
                        {showTransfer && (
                          <button
                            className="amp-transferBtn"
                            onClick={() => handleTransfer(user)}
                            style={{
                              border: "none", background: "#333", color: "#fff",
                              fontSize: "15px", fontWeight: "700", padding: "10px 18px",
                              borderRadius: "12px", cursor: "pointer", marginLeft: "10px"
                            }}
                          >
                            Transfer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="amp-empty">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {(modal.type === "add" || modal.type === "edit") && (
        <UserFormModal
          mode={modal.type}
          form={form}
          editingUser={selectedUser}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isSubmitting={isSubmitting}
        />
      )}

      {modal.type === "delete" && (
        <DeleteConfirmModal
          user={selectedUser}
          onConfirm={confirmDelete}
          onClose={closeModal}
          isDeleting={isDeleting}
        />
      )}

      {modal.type === "transfer" && (
        <TransferOwnershipModal
          user={selectedUser}
          onConfirm={confirmTransfer}
          onClose={closeModal}
          isTransferring={isTransferring}
        />
      )}
    </div>
  );
}