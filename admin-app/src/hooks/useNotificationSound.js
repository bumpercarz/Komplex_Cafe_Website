import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Web Audio alert tone generators ─────────────────────────────────────────

function createAlertSound(audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode   = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
  oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.15);
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.30);

  gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.6);

  return oscillator;
}

function createSinglePingSound(audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode   = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.3);

  return oscillator;
}

// ─── Service Worker registration + push subscription ─────────────────────────
//
// IMPORTANT: This uses the Service Worker Push API so that notifications
// work on Android Chrome and iOS Safari 16.4+ (PWA / Add to Home Screen).
//
// You must supply your own VAPID public key below.
// Generate one at: https://web-push-codelab.glitch.me
// or via: npx web-push generate-vapid-keys
//
const VAPID_PUBLIC_KEY = "qAM7nOvzlnbAxCG6Xbeqr6yLNdVd7_HEFcS-tgUWMZw"; // <-- Replace this

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerServiceWorkerPush() {
  // Service workers + PushManager are required
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[useNotificationSound] Service Worker / PushManager not supported.");
    return null;
  }

  try {
    // Register sw.js — place this file in your /public folder
    const registration = await navigator.serviceWorker.register("/sw.js");

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[useNotificationSound] Notification permission not granted.");
      return null;
    }

    // Subscribe to push (reuses existing subscription if already subscribed)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription;
  } catch (err) {
    console.warn("[useNotificationSound] SW push registration failed:", err);
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotificationSound() {
  const [toast, setToast] = useState(null);

  const audioCtxRef         = useRef(null);
  const audioUnlockedRef    = useRef(false);  // tracks if AudioContext was unlocked by a user gesture
  const loopIntervalRef     = useRef(null);
  const isLoopingRef        = useRef(false);
  const swSubscriptionRef   = useRef(null);   // holds the PushSubscription object

  const prevUnreadOrdersRef = useRef(new Set());
  const prevUnreadOthersRef = useRef(new Set());

  // ── 1. Register SW push on mount ──────────────────────────────────────────
  useEffect(() => {
    registerServiceWorkerPush().then((sub) => {
      swSubscriptionRef.current = sub;
    });
  }, []);

  // ── 2. Unlock AudioContext on first user interaction ───────────────────────
  //
  // Mobile browsers block AudioContext until a user gesture (tap/click).
  // We listen globally for the first pointerdown and unlock then.
  //
  useEffect(() => {
    function unlock() {
      if (audioUnlockedRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().then(() => {
          audioUnlockedRef.current = true;
          audioCtxRef.current = ctx; // reuse this context going forward
        });
      } catch (err) {
        console.warn("[useNotificationSound] AudioContext unlock failed:", err);
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart",  unlock);
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart",  unlock, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart",  unlock);
    };
  }, []);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  function getOrCreateAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function playAlarmTone() {
    if (!audioUnlockedRef.current) return; // silently skip if not yet unlocked
    try {
      const ctx = getOrCreateAudioCtx();
      createAlertSound(ctx);
    } catch (err) {
      console.warn("[useNotificationSound] Alarm playback failed:", err);
    }
  }

  function playSinglePing() {
    if (!audioUnlockedRef.current) return; // silently skip if not yet unlocked
    try {
      const ctx = getOrCreateAudioCtx();
      createSinglePingSound(ctx);
    } catch (err) {
      console.warn("[useNotificationSound] Ping playback failed:", err);
    }
  }

  function startLoop() {
    if (isLoopingRef.current) return;
    isLoopingRef.current = true;
    playAlarmTone();
    loopIntervalRef.current = setInterval(() => {
      if (isLoopingRef.current) playAlarmTone();
    }, 4000);
  }

  function stopLoop() {
    isLoopingRef.current = false;
    clearInterval(loopIntervalRef.current);
    loopIntervalRef.current = null;
  }

  // ── Push notification via Service Worker ──────────────────────────────────
  //
  // Instead of `new Notification()` (desktop-only), we show the notification
  // through the Service Worker registration, which works on Android and iOS PWA.
  //
  async function sendBrowserPush(title, body, notificationId, isPersistent) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try {
      // Prefer Service Worker showNotification (works on mobile)
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: isPersistent ? "new-order-alert" : `system-alert-${notificationId}`,
          requireInteraction: isPersistent,
          data: { notificationId, isPersistent },
        });
        return;
      }
    } catch (err) {
      console.warn("[useNotificationSound] SW showNotification failed, falling back:", err);
    }

    // Fallback for desktop browsers without SW support
    try {
      const notif = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: isPersistent ? "new-order-alert" : `system-alert-${notificationId}`,
        requireInteraction: isPersistent,
      });

      notif.onclick = async () => {
        window.focus();
        if (isPersistent) stopLoop();
        notif.close();
        await dismissToast(notificationId);
      };
    } catch (err) {
      console.warn("[useNotificationSound] Fallback push notification failed:", err);
    }
  }

  // ── Dismiss toast + mark as read ──────────────────────────────────────────

  async function dismissToast(idToDismiss = toast?.id) {
    setToast(null);
    stopLoop();
    if (idToDismiss) {
      try {
        await updateDoc(doc(db, "tbl_notifs", String(idToDismiss)), { read: true });
      } catch (err) {
        console.error("[useNotificationSound] Failed to mark as read:", err);
      }
    }
  }

  // ── Firestore real-time listener ──────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, "tbl_notifs"), orderBy("n_timestamp", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id:      d.id,
        type:    d.data().type    ?? "order_new",
        read:    d.data().read    ?? false,
        title:   d.data().title   ?? "New Notification",
        message: d.data().message ?? "",
      }));

      // Only order_new is urgent — status updates use a single ping
      const urgentTypes = ["order_new"];

      const unreadOrders = docs.filter((d) =>  urgentTypes.includes(d.type) && !d.read);
      const unreadOthers = docs.filter((d) => !urgentTypes.includes(d.type) && !d.read);

      const unreadOrderIds = new Set(unreadOrders.map((d) => d.id));
      const unreadOtherIds = new Set(unreadOthers.map((d) => d.id));

      const newlyArrivedOrders = unreadOrders.filter((d) => !prevUnreadOrdersRef.current.has(d.id));
      const newlyArrivedOthers = unreadOthers.filter((d) => !prevUnreadOthersRef.current.has(d.id));

      // ── New urgent order ────────────────────────────────────────────────────
      if (newlyArrivedOrders.length > 0) {
        const newest = newlyArrivedOrders[0];

        sendBrowserPush(
          newest?.title   ?? "New Order!",
          newest?.message ?? "A new order has been placed.",
          newest?.id,
          true
        );

        setToast({
          id:           newest.id,
          title:        newest.title   ?? "New Order!",
          message:      newest.message ?? "A new order has been placed.",
          isPersistent: true,
        });

        startLoop();
      }

      // ── New status / other update ───────────────────────────────────────────
      if (newlyArrivedOthers.length > 0) {
        const newest = newlyArrivedOthers[0];

        sendBrowserPush(
          newest?.title   ?? "System Update",
          newest?.message ?? "A new update occurred.",
          newest?.id,
          false
        );

        setToast({
          id:           newest.id,
          title:        newest.title   ?? "System Update",
          message:      newest.message ?? "A new update occurred.",
          isPersistent: false,
        });

        playSinglePing();

        setTimeout(() => {
          setToast(null);
        }, 5000);
      }

      // Stop looping alarm if all urgent orders are now read
      if (unreadOrderIds.size === 0) {
        stopLoop();
        setToast((prev) => (prev?.isPersistent ? null : prev));
      }

      prevUnreadOrdersRef.current = unreadOrderIds;
      prevUnreadOthersRef.current = unreadOtherIds;
    });

    return () => {
      unsub();
      stopLoop();
    };
  }, []);

  return { toast, dismissToast };
}