import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/AdminMenuPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";

import {
  MENU_CATEGORY_OPTIONS,
  MENU_AVAILABLE_OPTIONS,
  getAllMenuItemsLive,
  createMenuItemRecord,
  updateMenuItemRecord,
  deleteMenuItemRecord,
  formatMoney,
} from "../services/adminMenuData";

function ModalShell({ children, onClose }) {
  return (
    <div className="amp-modalBackdrop" onClick={onClose}>
      <div className="amp-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MenuFormModal({
  mode,
  item,
  existingItems,
  onClose,
  onSubmit,
  saving,
}) {
  const fileInputRef = useRef(null);

  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? "Drink");
  const [available, setAvailable] = useState(item?.available ?? "Yes");
  const [image, setImage] = useState(item?.image ?? "");
  const [imageFile, setImageFile] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      alert("Please enter the item name.");
      return;
    }

    if (!trimmedDescription) {
      alert("Please enter the description.");
      return;
    }

    if (!price || Number.isNaN(numericPrice) || numericPrice < 0) {
      alert("Please enter a valid price.");
      return;
    }

    const hasDuplicate = existingItems.some(
      (menuItem) =>
        menuItem.name.toLowerCase() === trimmedName.toLowerCase() &&
        menuItem.id !== item?.id
    );

    if (hasDuplicate) {
      alert("That menu item already exists.");
      return;
    }

    await onSubmit({
      name: trimmedName,
      price: numericPrice,
      description: trimmedDescription,
      category,
      available,
      image,
      imageFile,
    });
  }

  return (
    <ModalShell onClose={saving ? undefined : onClose}>
      <form className="amp-formModal" onSubmit={handleSubmit}>
        <button
          type="button"
          className="amp-closeBtn"
          onClick={onClose}
          aria-label="Close"
          disabled={saving}
        >
          X
        </button>

        <div className="amp-modalGrid">
          <div className="amp-modalLeft">
            <div className="amp-formGroup">
              <label>Name</label>
              <input
                type="text"
                placeholder="Iced Matcha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="amp-formGroup amp-formGroupWide">
              <label>Description</label>
              <input
                type="text"
                placeholder="Yummy"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="amp-formGroup">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
              >
                {MENU_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="amp-formGroup">
              <label>Available</label>
              <select
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                disabled={saving}
              >
                {MENU_AVAILABLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="amp-modalRight">
            <div className="amp-formGroup">
              <label>Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="120"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="amp-formGroup amp-imageGroup">
              <label>Image</label>

              <button
                type="button"
                className="amp-uploadBox"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                {image ? (
                  <img src={image} alt={name || "Preview"} />
                ) : (
                  <div className="amp-uploadInner">
                    <div className="amp-uploadIcon">🖼</div>
                    <span>Upload Photo</span>
                  </div>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleImageChange}
              />
            </div>
          </div>
        </div>

        <div className="amp-modalActions">
          <button type="submit" className="amp-saveBtn" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            className="amp-exitBtn"
            onClick={onClose}
            disabled={saving}
          >
            Exit
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function AdminMenuPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [modal, setModal] = useState({ type: null, itemId: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMenuItems() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getAllMenuItemsLive();
      setMenuItems(data);
    } catch (error) {
      console.error("Load menu items error:", error);
      setMessage(error?.message || "Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenuItems();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return menuItems;

    return menuItems.filter((item) => {
      return (
        item.codeName.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.available.toLowerCase().includes(keyword) ||
        String(item.price).includes(keyword)
      );
    });
  }, [menuItems, search]);

  const selectedItem = useMemo(() => {
    return menuItems.find((item) => item.id === modal.itemId) || null;
  }, [menuItems, modal.itemId]);

  function closeModal() {
    if (saving) return;
    setModal({ type: null, itemId: null });
  }

  async function handleAddItem(formValues) {
    setSaving(true);
    setMessage("");

    try {
      const result = await createMenuItemRecord(formValues);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      await loadMenuItems();
      closeModal();
    } catch (error) {
      console.error("Add menu item error:", error);
      setMessage(error?.message || "Failed to add menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditItem(formValues) {
    if (!selectedItem) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await updateMenuItemRecord(selectedItem, formValues);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      await loadMenuItems();
      closeModal();
    } catch (error) {
      console.error("Edit menu item error:", error);
      setMessage(error?.message || "Failed to update menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemDocId) {
    const target = menuItems.find((item) => item.docId === itemDocId);
    if (!target) return;

    const confirmed = window.confirm(`Delete ${target.name}?`);
    if (!confirmed) return;

    setMessage("");

    try {
      const result = await deleteMenuItemRecord(itemDocId);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      await loadMenuItems();
    } catch (error) {
      console.error("Delete menu item error:", error);
      setMessage(error?.message || "Failed to delete menu item.");
    }
  }

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel="ADMIN" onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="amp-main">
        <AdminPageToolbar
          title="Menu"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
          addLabel="+ Add"
          onAdd={() => setModal({ type: "add", itemId: null })}
        />

        {message ? <div className="amp-empty">{message}</div> : null}
        {loading ? (
          <div className="amp-empty">Loading menu items...</div>
        ) : (
          <div className="amp-tableWrap">
            <table className="amp-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Code Name</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Available?</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="amp-imageCell">
                      <img className="amp-itemImage" src={item.image} alt={item.name} />
                    </td>

                    <td>{item.codeName}</td>
                    <td>{item.name}</td>
                    <td>{item.description}</td>
                    <td>{item.category}</td>
                    <td>{item.available}</td>
                    <td>{formatMoney(item.price)}</td>

                    <td className="amp-actionsCell">
                      <button
                        className="amp-editBtn"
                        onClick={() => setModal({ type: "edit", itemId: item.id })}
                      >
                        Edit
                      </button>

                      <button
                        className="amp-deleteBtn"
                        onClick={() => handleDeleteItem(item.docId)}
                        aria-label={`Delete ${item.name}`}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="8" className="amp-empty">
                      No menu items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal.type === "add" && (
        <MenuFormModal
          mode="add"
          existingItems={menuItems}
          onClose={closeModal}
          onSubmit={handleAddItem}
          saving={saving}
        />
      )}

      {modal.type === "edit" && selectedItem && (
        <MenuFormModal
          mode="edit"
          item={selectedItem}
          existingItems={menuItems}
          onClose={closeModal}
          onSubmit={handleEditItem}
          saving={saving}
        />
      )}
    </div>
  );
}