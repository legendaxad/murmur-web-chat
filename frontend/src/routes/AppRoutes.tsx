import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layouts/AppShell";
import { Spinner } from "../components/ui";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import ChatPage from "../features/messaging/components/ChatPage";
import { ProtectedRoute, PublicOnlyRoute } from "./guards";

// Less-used pages load on demand, which keeps the first load small.
const ContactsPage = lazy(() => import("../features/contacts/ContactsPage"));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage"));

const PageFallback = () => (
  <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
    <Spinner />
  </div>
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:channelUrl" element={<ChatPage />} />
          <Route
            path="/contacts"
            element={
              <Suspense fallback={<PageFallback />}>
                <ContactsPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<PageFallback />}>
                <ProfilePage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
