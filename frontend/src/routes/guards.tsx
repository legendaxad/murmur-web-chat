import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { selectAuthStatus } from "../features/auth/authSlice";

/** Authenticated area. Unknown users go to /login, which sends them back afterwards. */
export function ProtectedRoute() {
  const status = useAppSelector(selectAuthStatus);
  const location = useLocation();
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login/register: signed-in users skip straight to the app. */
export function PublicOnlyRoute() {
  const status = useAppSelector(selectAuthStatus);
  if (status === "authenticated") return <Navigate to="/chat" replace />;
  return <Outlet />;
}
