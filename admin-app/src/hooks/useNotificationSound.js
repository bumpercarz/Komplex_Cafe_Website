import { useEffect, useRef } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Web Audio alert tone generators ─────────────────────────────────────────

// 1. Loud, 3-tone alarm for new orders (Continuous)
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

  return oscillator;
}

// 2. Soft, quick up-chime for menu/system updates (Plays Once)
function createSinglePingSound(audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode   = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
  oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.3);

  return oscillator;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotificationSound() {
  const audioCtxRef         = useRef(null);
  const loopIntervalRef     = useRef(null);
  const isLoopingRef        = useRef(false);
  const permissionRef       = useRef("default"); // "default" | "granted" | "denied"
  
  // Track IDs separately so we know what type triggered
  const prevUnreadOrdersRef = useRef(new Set());
  const prevUnreadOthersRef = useRef(new Set());

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

  function playAlarmTone() {
    try {
      const ctx = getOrCreateAudioCtx();
      createAlertSound(ctx);
    } catch (err) {
      console.warn("[useNotificationSound] Alarm playback failed:", err);
    }
  }

  function playSinglePing() {
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
    playAlarmTone(); // immediate first beep
    loopIntervalRef.current = setInterval(() => {
      if (isLoopingRef.current) playAlarmTone();
    }, 4000); // repeat every 4 seconds
  }

  function stopLoop() {
    isLoopingRef.current = false;
    clearInterval(loopIntervalRef.current);
    loopIntervalRef.current = null;
  }

  // Generalized Browser Push Function
  function sendBrowserPush(title, body, notificationId, isPersistent) {
    if (permissionRef.current !== "granted") return;
    try {
      const notif = new Notification(title, {
        body,
        icon: "/favicon.ico", 
        tag: isPersistent ? "new-order-alert" : `system-alert-${notificationId}`, 
        requireInteraction: isPersistent, // Only wait for click if it's an order
      });

      notif.onclick = async () => {
        window.focus(); 
        
        if (isPersistent) {
          stopLoop(); 
        }
        
        notif.close(); 

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
        id:      d.id,
        type:    d.data().type    ?? "order_new",
        read:    d.data().read    ?? false,
        title:   d.data().title   ?? "New Notification",
        message: d.data().message ?? "",
      }));

      // 1. Separate Unread Notifications by Type
      const unreadOrders = docs.filter((d) => d.type === "order_new" && !d.read);
      const unreadOthers = docs.filter((d) => d.type !== "order_new" && !d.read);

      const unreadOrderIds = new Set(unreadOrders.map((d) => d.id));
      const unreadOtherIds = new Set(unreadOthers.map((d) => d.id));

      // 2. Find newly arrived IDs (not in previous snapshot)
      const newlyArrivedOrders = unreadOrders.filter(
        (d) => !prevUnreadOrdersRef.current.has(d.id)
      );
      
      const newlyArrivedOthers = unreadOthers.filter(
        (d) => !prevUnreadOthersRef.current.has(d.id)
      );

      // 3. Handle New Orders (Loop + Persistent Popup)
      if (newlyArrivedOrders.length > 0) {
        const newest = newlyArrivedOrders[0];
        sendBrowserPush(
          newest?.title   ?? "New Order!",
          newest?.message ?? "A table placed a new order.",
          newest?.id,
          true // isPersistent = true
        );
        startLoop();
      }

      // 4. Handle Menu/System Updates (Play Once + Auto-dismiss Popup)
      if (newlyArrivedOthers.length > 0) {
        // Trigger a single notification for the newest system update
        const newest = newlyArrivedOthers[0];
        sendBrowserPush(
          newest?.title   ?? "System Update",
          newest?.message ?? "A new update occurred.",
          newest?.id,
          false // isPersistent = false
        );
        playSinglePing();
      }

      // 5. Stop looping if ALL new orders have been marked as read
      if (unreadOrderIds.size === 0) {
        stopLoop();
      }

      // 6. Update Refs for the next snapshot
      prevUnreadOrdersRef.current = unreadOrderIds;
      prevUnreadOthersRef.current = unreadOtherIds;
    });

    return () => {
      unsub();
      stopLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}