// AdminUsersPage.js
import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminMenuPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";

import {
  USER_ROLE_OPTIONS,
  getAllUsersLive,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  transferOwnership,
} from "../services/adminUserData";

import { getCurrentUser, setCurrentUser } from "../services/authService";

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
  return (
    <ModalShell onClose={onClose}>
      <form className="amp-formModal" onSubmit={onSubmit}>
        <button type="button" className="amp-closeBtn" onClick={onClose}>
          X
        </button>

        <div className="amp-modalGrid">
          <div className="amp-modalLeft">
            <div className="amp-formGroup">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={onChange} required />
            </div>

            <div className="amp-formGroup">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={onChange} required />
            </div>

            <div className="amp-formGroup">
              <label>{mode === "edit" ? "New Password" : "Password"}</label>
              <input type="password" name="password" value={form.password} onChange={onChange} />
              <small>{mode === "edit" ? "Leave blank to keep current password" : "Minimum 8 characters"}</small>
            </div>
          </div>

          <div className="amp-modalRight">
            <div className="amp-formGroup">
              <label>Role</label>
              <select name="role" value={form.role} onChange={onChange}>
                {USER_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="amp-formGroup">
              <label>Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                value={form.contactNumber}
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
          <button className="au-confirmBtn" onClick={() => onConfirm(user.id)} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Confirm"}
          </button>
          <button className="au-cancelBtn" onClick={onClose}>
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
          <button className="au-confirmBtn" onClick={() => onConfirm(user.id)} disabled={isTransferring}>
            {isTransferring ? "Transferring..." : "Confirm"}
          </button>
          <button className="au-cancelBtn" onClick={onClose}>
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
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      contactNumber: user.contactNumber,
    });
    setModal({ type: "edit", userId: user.id });
  }

  function handleDelete(id) {
    setModal({ type: "delete", userId: id });
  }

  async function confirmDelete(id) {
    setIsDeleting(true);
    try {
      const result = await deleteUserAccount(id);
      if (!result?.ok) {
        alert(result?.message || "Delete failed.");
        return;
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
      const result = await transferOwnership(currentUser.id, newOwnerId);

      if (!result?.ok) {
        alert(result?.message || "Transfer failed.");
        return;
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
      newValue = newValue.replace(/\D/g, "");
      if (!newValue.startsWith("09")) {
        newValue = "09" + newValue.slice(2);
      }
      if (newValue.length > 11) newValue = newValue.slice(0, 11);
    }

    if (name === "password") {
      if (newValue.length > 16) newValue = newValue.slice(0, 16);
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (modal.type === "add" && form.password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    if (modal.type === "edit" && form.password.length > 0 && form.password.length < 8) {
      alert("New password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (modal.type === "add") {
        result = await createUserAccount(form);
      } else {
        result = await updateUserAccount(modal.userId, form);
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
      <AdminTopbar roleLabel="ADMIN" onMenuClick={() => setMenuOpen(true)} />
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

        <div className="amp-tableWrap">
          <table className="amp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
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
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.roleLabel}</td>
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
                          🗑
                        </button>
                      )}
                      {showTransfer && (
                        <button
                          className="amp-transferBtn"
                          onClick={() => handleTransfer(user)}
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