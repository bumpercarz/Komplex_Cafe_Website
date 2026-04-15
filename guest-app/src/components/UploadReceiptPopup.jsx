import { useRef, useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase.js";
import "../css/PopUp.css";
import "../css/UploadReceiptPopup.css";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%23aaa'%3E%3Crect width='64' height='64' fill='none'/%3E%3Crect x='8' y='14' width='48' height='36' rx='4' stroke='%23aaa' stroke-width='3' fill='none'/%3E%3Ccircle cx='22' cy='26' r='5' fill='%23aaa'/%3E%3Cpath d='M8 40l14-12 10 10 8-8 14 12' stroke='%23aaa' stroke-width='3' fill='none' stroke-linejoin='round'/%3E%3C/svg%3E";

/* ═══════════════════════════════════════════════════════════════════
   UPLOAD RECEIPT POPUP
   Props:
     onClose   — () => void
     onSubmit  — (receiptUrl: string) => Promise<void>
                 Called with the Firebase Storage download URL.
                 The parent is responsible for writing the order.
═══════════════════════════════════════════════════════════════════ */
export default function UploadReceiptPopup({ onClose, onSubmit }) {
  const [preview,  setPreview]  = useState(null);
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState(null);

  const fileInputRef = useRef();
  const overlayRef   = useRef();

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* click outside to close */
  const handleOverlayClick = (e) => {
    if (!uploading && e.target === overlayRef.current) onClose();
  };

  const loadFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleFileChange = (e) => loadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  /* ── Upload to Firebase Storage, then hand URL to parent ── */
  const handleSubmit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const ext        = file.name.split(".").pop();
      const storageRef = ref(storage, `receipt_image/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const receiptUrl = await getDownloadURL(storageRef);

      await onSubmit(receiptUrl); // parent writes order & navigates
    } catch (err) {
      console.error("Receipt upload failed:", err);
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div
      className="popup-overlay upload-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="popup upload-popup">

        {/* ── Drop zone ── */}
        <div
          className={`upload-dropzone${dragging ? " upload-dropzone--drag" : ""}${preview ? " upload-dropzone--has-preview" : ""}`}
          onClick={() => !uploading && fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <img src={preview} alt="Receipt preview" className="upload-preview-img" />
          ) : (
            <div className="upload-placeholder">
              <img src={PLACEHOLDER_IMG} alt="" className="upload-placeholder-icon" />
              <span className="upload-placeholder-text">Upload Image Here</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {error && <p className="upload-error">{error}</p>}

        {/* ── Buttons ── */}
        <div className="upload-footer">
          <button
            className="upload-btn-submit"
            onClick={handleSubmit}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading…" : "Submit Receipt"}
          </button>
          <button
            className="upload-btn-back"
            onClick={onClose}
            disabled={uploading}
          >
            Back
          </button>
        </div>

      </div>
    </div>
  );
}