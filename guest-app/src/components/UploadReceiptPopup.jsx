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
const MAX_RAW_BYTES = 20 * 1024 * 1024; // 20 MB raw — beyond this the canvas will likely crash

/* ── Compress any image (including HEIC on iOS) to a JPEG Blob ──────────────
   Draws into a canvas → toBlob("image/jpeg").
   This converts HEIC → JPEG automatically since the browser decodes HEIC
   natively but canvas always outputs standard formats.
   Max dimension 1600px keeps receipts readable while staying under 500 KB.
────────────────────────────────────────────────────────────────────────── */
function compressToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_DIM = 1600;
      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round((h / w) * MAX_DIM); w = MAX_DIM; }
        else       { w = Math.round((w / h) * MAX_DIM); h = MAX_DIM; }
      }

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };

    img.src = url;
  });
}

export default function UploadReceiptPopup({ onClose, onSubmit }) {
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);

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
    if (!f) return;

    // Accept image/* AND also HEIC/HEIF which some browsers report as "" or "image/heic"
    const isImage = f.type.startsWith("image/") ||
                    /\.(heic|heif)$/i.test(f.name);
    if (!isImage) {
      setError("Please select an image file (JPG, PNG, HEIC, etc.).");
      return;
    }

    if (f.size > MAX_RAW_BYTES) {
      setError("Image is too large (max 20 MB). Please use a smaller photo.");
      return;
    }

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

  /* ── Compress → upload → hand URL to parent ── */
  const handleSubmit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    try {
      // Always compress + convert to JPEG — fixes HEIC, huge camera shots, and bad extensions
      const blob        = await compressToJpeg(file);
      const storageRef  = ref(storage, `receipt_image/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const receiptUrl  = await getDownloadURL(storageRef);

      await onSubmit(receiptUrl);
    } catch (err) {
      console.error("Receipt upload failed:", err);

      // Give a specific message where possible
      if (err.message?.includes("decode") || err.message?.includes("toBlob")) {
        setError("This image format isn't supported. Please take a screenshot and upload that instead.");
      } else if (err.code === "storage/unauthorized") {
        setError("Upload not allowed. Please contact staff.");
      } else if (err.code === "storage/retry-limit-exceeded" || err.message?.includes("network")) {
        setError("Network error. Check your connection and try again.");
      } else {
        setError("Upload failed. Please try a different image or take a screenshot.");
      }

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