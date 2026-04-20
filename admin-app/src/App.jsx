import { Navigate, Routes, Route } from "react-router-dom";
import { getCurrentUser, logoutUser } from "./services/authService";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminOrderPage from "./pages/AdminOrderPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import AdminTableQrPage from "./pages/AdminTableQrPage";
import AdminMenuPage from "./pages/AdminMenuPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminNotificationsPage from "./pages/AdminNotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import FirestoreSeedPage from "./pages/FirestoreSeedPage";
import GuestTestPage from "./pages/GuestTestPage";
import FirestoreOrderSeedPage from "./pages/FirestoreOrderSeedPage";
import FirestoreMenuSeedPage from "./pages/FirestoreMenuSeedPage";
import FirestoreNotifSeedPage from "./pages/FirestoreNotifSeedPage";
import FirestoreTableSeedPage from "./pages/FirestoreTableSeedPage";
import FirestorePaymentSeedPage from "./pages/FirestorePaymentSeedPage";

function ProtectedRoute({ element, allowedRoles }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === "STAFF" ? "/staff" : "/admin";
    return <Navigate to={home} replace />;
  }

  return element;
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      const hasBooted = sessionStorage.getItem("app_booted");

      // ── Fix: When the app is opened by tapping a push notification, the
      // Service Worker launches a NEW window/tab. That new window has a fresh
      // sessionStorage (empty), so the old logout-on-boot logic would wipe the
      // localStorage session and force the user to log in again.
      //
      // Solution: We only clear the session on a true fresh browser open, NOT
      // when the app is launched from a notification click. We detect a
      // notification launch via a custom URL parameter (?from=notification)
      // that we set in sw.js, OR simply by checking if the user is already
      // logged in — if they are, we never clear the session.
      //
      if (!hasBooted) {
        const user = getCurrentUser(); // check localStorage session first
        const launchedFromNotification =
          new URLSearchParams(window.location.search).get("from") === "notification";

        // Only log out if there is no active session AND this is not a
        // notification-launched window
        if (!user && !launchedFromNotification) {
          await logoutUser();
        }

        sessionStorage.setItem("app_booted", "true");
      }

      setIsBooting(false);
    };

    initializeSession();
  }, []);

  if (isBooting) {
    return null;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* Staff routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute
              element={<StaffDashboard />}
              allowedRoles={["STAFF"]}
            />
          }
        />
        <Route
          path="/staff/profile"
          element={
            <ProtectedRoute
              element={<ProfilePage role="STAFF" showMenu={false} />}
              allowedRoles={["STAFF"]}
            />
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={<AdminDashboard />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute
              element={<AdminOrderPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute
              element={<AdminPaymentsPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/tables"
          element={
            <ProtectedRoute
              element={<AdminTableQrPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute
              element={<AdminMenuPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute
              element={<AdminUsersPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute
              element={<AdminNotificationsPage />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute
              element={<ProfilePage role="ADMIN" showMenu={true} />}
              allowedRoles={["ADMIN", "OWNER"]}
            />
          }
        />

        {/* Dev/seed routes — unprotected */}
        <Route path="/seed-firestore" element={<FirestoreSeedPage />} />
        <Route path="/guest-test" element={<GuestTestPage />} />
        <Route path="/seed-orders" element={<FirestoreOrderSeedPage />} />
        <Route path="/seed-menu" element={<FirestoreMenuSeedPage />} />
        <Route path="/seed-notifs" element={<FirestoreNotifSeedPage />} />
        <Route path="/seed-tables" element={<FirestoreTableSeedPage />} />
        <Route path="/seed-payments" element={<FirestorePaymentSeedPage />} />
      </Routes>
    </>
  );
}
