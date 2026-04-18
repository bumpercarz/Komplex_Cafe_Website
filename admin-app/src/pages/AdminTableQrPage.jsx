import React, { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "../css/AdminTableQrPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";

import {
  TABLE_STATUS_OPTIONS,
  getAllTables,
  normalizeTableId,
  createTableRecord,
  updateTableRecord,
  deleteTableRecord,
} from "../services/adminTableQrData";

function getCustomerBaseUrl() {
  // Using the specific domain as requested
  return import.meta.env.VITE_APP_URL || "http://localhost:5173";
}

function getRawTableNumber(tableOrValue) {
  if (typeof tableOrValue === "string" || typeof tableOrValue === "number") {
    return String(tableOrValue).replace(/^table_/i, "").replace(/_/g, " ").trim();
  }

  const raw =
    tableOrValue?.tableNumber ??
    tableOrValue?.table_id ??
    tableOrValue?.tableId ??
    "";

  return String(raw).replace(/^table_/i, "").replace(/_/g, " ").trim();
}

function getTableQrUrl(table) {
  if (table?.qrCodeUrl) return table.qrCodeUrl;

  const tableNumber = getRawTableNumber(table) || "new";
  return `${getCustomerBaseUrl()}/customer?table_id=${encodeURIComponent(
    tableNumber
  )}`;
}

function ModalShell({ children, onClose, className = "" }) {
  return (
    <div className="atq-modalBackdrop" onClick={onClose}>
      <div
        className={`atq-modal ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function TableFormModal({
  mode,
  table,
  existingTables,
  onClose,
  onSubmit,
}) {
  const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? "");
  const [status, setStatus] = useState(table?.status ?? "Active");

  const isEdit = mode === "edit";

  const normalizedId = normalizeTableId(
    tableNumber || table?.tableNumber || "new"
  );

  const previewQrUrl = `${getCustomerBaseUrl()}/customer?table_id=${encodeURIComponent(
    getRawTableNumber(tableNumber || table?.tableNumber || "new")
  )}`;

  function handleSubmit(e) {
    e.preventDefault();

    const trimmed = tableNumber.trim();
    if (!trimmed) {
      alert("Please enter a table number.");
      return;
    }

    const nextTableId = normalizeTableId(trimmed);

    const hasDuplicate = existingTables.some(
      (item) =>
        item.tableId.toLowerCase() === nextTableId.toLowerCase() &&
        item.id !== table?.id
    );

    if (hasDuplicate) {
      alert("That table already exists.");
      return;
    }

    onSubmit({
      tableNumber: trimmed,
      status,
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="atq-formModal" onSubmit={handleSubmit}>
        <h2 className="atq-modalTitle">
          {isEdit ? "Edit Table:" : "Add Table:"}
        </h2>

        <div className="atq-modalQr atq-qrPreviewBox">
          <QRCodeCanvas value={previewQrUrl} size={220} includeMargin />
        </div>

        <div className="atq-linkText">{normalizedId}</div>

        <input
          className="atq-input"
          type="text"
          placeholder="Table number:"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />

        <label className="atq-fieldLabel">Status</label>

        <div className="atq-selectShell">
          <select
            className="atq-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {TABLE_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="atq-modalActions">
          <button
            type="button"
            className="atq-btn atq-btnGhost"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="atq-btn atq-btnPrimary">
            {isEdit ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function QrDetailsModal({
  table,
  onClose,
  onDownloadQr,
  onPrintQr,
}) {
  if (!table) return null;

  const qrUrl = getTableQrUrl(table);

  return (
    <ModalShell onClose={onClose} className="atq-qrModal">
      <div className="atq-qrModalContent">
        <h2 className="atq-modalTitle atq-centerTitle">
          QR Code for Table
        </h2>

        <div className="atq-modalQr atq-qrLarge atq-qrPreviewBox">
          <QRCodeCanvas
            id="selected-table-qr-canvas"
            value={qrUrl}
            size={260}
            includeMargin
          />
        </div>

        <div className="atq-linkText">{qrUrl}</div>

        <div className="atq-qrBottomActions">
          <button
            type="button"
            className="atq-inlineAction"
            onClick={onDownloadQr}
          >
            <span className="atq-inlineIcon">↓</span>
            <span>Download Image (PNG)</span>
          </button>

          <button
            type="button"
            className="atq-inlineAction"
            onClick={onPrintQr}
          >
            <span className="atq-inlineIcon">🖨</span>
            <span>Print</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function AdminTableQrPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tables, setTables] = useState([]);
  const [modal, setModal] = useState({ type: null, tableId: null });

  const filteredTables = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return tables;

    return tables.filter((table) => {
      return (
        String(table.tableId || "").toLowerCase().includes(keyword) ||
        String(table.status || "").toLowerCase().includes(keyword) ||
        String(table.tableNumber || "").toLowerCase().includes(keyword)
      );
    });
  }, [tables, search]);

  const selectedTable = useMemo(() => {
    return tables.find((table) => table.id === modal.tableId) || null;
  }, [tables, modal.tableId]);

  function closeModal() {
    setModal({ type: null, tableId: null });
  }

  async function reloadTables() {
    const data = await getAllTables();
    setTables(data);
  }

  useEffect(() => {
    reloadTables();
  }, []);

  async function handleAddTable(formValues) {
    await createTableRecord(tables, formValues);
    await reloadTables();
    closeModal();
  }

  async function handleEditTable(formValues) {
    if (!selectedTable) return;

    await updateTableRecord(selectedTable, formValues);
    await reloadTables();
    closeModal();
  }

  async function handleDeleteTable(tableId) {
    const target = tables.find((table) => table.id === tableId);
    if (!target) return;

    const confirmed = window.confirm(`Delete ${target.tableId}?`);
    if (!confirmed) return;

    await deleteTableRecord(tableId);
    await reloadTables();
    closeModal();
  }

  function handleDownloadQr() {
    if (!selectedTable) return;

    const canvas = document.getElementById("selected-table-qr-canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${selectedTable.tableId}.png`;
    link.click();
  }

  function handlePrintQr() {
    if (!selectedTable) return;

    const qrUrl = getTableQrUrl(selectedTable);
    const canvas = document.getElementById("selected-table-qr-canvas");
    if (!canvas) return;

    const imageSrc = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedTable.tableId}</title>
        </head>
        <body style="text-align:center;font-family:Arial;padding:30px;">
          <h1>${selectedTable.tableId}</h1>
          <img src="${imageSrc}" style="width:300px;height:300px;" />
          <p>${qrUrl}</p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }
  useNotificationSound();
  return (
    <div className="ad-root">
      <AdminTopbar roleLabel="ADMIN" onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="atq-main">
        <AdminPageToolbar
          title="Table & QR Codes"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
          addLabel="+ Add"
          onAdd={() => setModal({ type: "add", tableId: null })}
        />

        <div className="atq-tableWrap">
          <table className="atq-table">
            <thead>
              <tr>
                <th>Table ID</th>
                <th>QR Code</th>
                <th>Status</th>
                <th>View/Print QR</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTables.map((table) => (
                <tr key={table.id}>
                  <td>{table.tableId}</td>

                  <td className="atq-qrCell">
                    <QRCodeCanvas
                      value={getTableQrUrl(table)}
                      size={88}
                      includeMargin
                    />
                  </td>

                  <td>{table.status}</td>

                  <td className="atq-viewCell">
                    <button
                      className="atq-viewBtn"
                      onClick={() =>
                        setModal({ type: "qr", tableId: table.id })
                      }
                    >
                      View Details
                    </button>
                  </td>

                  <td className="atq-actionsCell">
                    <button
                      className="atq-editBtn"
                      onClick={() =>
                        setModal({ type: "edit", tableId: table.id })
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="atq-deleteBtn"
                      onClick={() => handleDeleteTable(table.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTables.length === 0 && (
                <tr>
                  <td colSpan="5" className="atq-empty">
                    No tables found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {modal.type === "add" && (
        <TableFormModal
          mode="add"
          existingTables={tables}
          onClose={closeModal}
          onSubmit={handleAddTable}
        />
      )}

      {modal.type === "edit" && selectedTable && (
        <TableFormModal
          mode="edit"
          table={selectedTable}
          existingTables={tables}
          onClose={closeModal}
          onSubmit={handleEditTable}
        />
      )}

      {modal.type === "qr" && selectedTable && (
        <QrDetailsModal
          table={selectedTable}
          onClose={closeModal}
          onDownloadQr={handleDownloadQr}
          onPrintQr={handlePrintQr}
        />
      )}
    </div>
  );
}