import { useEffect, useRef } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Web Audio alert tone generator ──────────────────────────────────────────
function createAlertSound(audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode   = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type      = "sine";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);          // A5
  oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.15);   // E5
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.30);

  gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.6);

  return oscillator; // caller can listen to `onended`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotificationSound() {
  const audioCtxRef       = useRef(null);
  const loopIntervalRef   = useRef(null);
  const isLoopingRef      = useRef(false);
  const permissionRef     = useRef("default"); // "default" | "granted" | "denied"
  const prevUnreadIdsRef  = useRef(new Set());

  // Request browser notification permission once on mount
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    } else {
      permissionRef.current = "denied";
    }
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getOrCreateAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function playOnce() {
    try {
      const ctx = getOrCreateAudioCtx();
      createAlertSound(ctx);
    } catch (err) {
      console.warn("[useNotificationSound] Audio playback failed:", err);
    }
  }

  function startLoop() {
    if (isLoopingRef.current) return;
    isLoopingRef.current = true;
    playOnce(); // immediate first beep
    loopIntervalRef.current = setInterval(() => {
      if (isLoopingRef.current) playOnce();
    }, 4000); // repeat every 4 seconds
  }

  function stopLoop() {
    isLoopingRef.current = false;
    clearInterval(loopIntervalRef.current);
    loopIntervalRef.current = null;
  }

  // NEW: Accept notificationId to mark it as read on click
  function sendBrowserPush(title, body, notificationId) {
    if (permissionRef.current !== "granted") return;
    try {
      const notif = new Notification(title, {
        body,
        icon: "/favicon.ico",     // update path to your logo if needed
        tag:  "new-order-alert",  // replaces previous notif so they don't stack
        requireInteraction: true, // stays until admin clicks it
      });

      // NEW: Handle what happens when the admin clicks the popup
      notif.onclick = async () => {
        window.focus(); // Bring the browser tab to the front
        stopLoop();     // Stop the ringing immediately
        notif.close();  // Dismiss the browser notification

        // Mark this specific notification as read in Firebase
        if (notificationId) {
          try {
            await updateDoc(doc(db, "tbl_notifs", String(notificationId)), {
              read: true,
            });
          } catch (err) {
            console.error("[useNotificationSound] Failed to mark as read:", err);
          }
        }
      };

    } catch (err) {
      console.warn("[useNotificationSound] Push notification failed:", err);
    }
  }

  // ── Firestore listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "tbl_notifs"),
      orderBy("n_timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id:     d.id,
        type:   d.data().type   ?? "order_new",
        read:   d.data().read   ?? false,
        title:  d.data().title  ?? "New Notification",
        message: d.data().message ?? "",
      }));

      // Unread new-order notifications
      const unreadOrderNewIds = new Set(
        docs
          .filter((d) => d.type === "order_new" && !d.read)
          .map((d) => d.id)
      );

      // Find brand-new IDs (not in previous snapshot)
      const newlyArrivedIds = [...unreadOrderNewIds].filter(
        (id) => !prevUnreadIdsRef.current.has(id)
      );

      // If there are newly arrived unread order_new notifs → alert
      if (newlyArrivedIds.length > 0) {
        const newest = docs.find((d) => d.id === newlyArrivedIds[0]);
        // NEW: Pass the newest notification ID into the push function
        sendBrowserPush(
          newest?.title   ?? "New Order!",
          newest?.message ?? "A table placed a new order.",
          newest?.id 
        );
        startLoop();
      }

      // If there are NO more unread order_new notifs → stop loop
      if (unreadOrderNewIds.size === 0) {
        stopLoop();
      }

      prevUnreadIdsRef.current = unreadOrderNewIds;
    });

    return () => {
      unsub();
      stopLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}