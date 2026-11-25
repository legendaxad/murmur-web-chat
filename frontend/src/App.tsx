import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAppSelector } from "./app/hooks";
import { AuthBootstrap } from "./features/auth/AuthBootstrap";
import { selectTheme } from "./features/ui/uiSlice";
import { AppRoutes } from "./routes/AppRoutes";
import { useThemeEffect } from "./theme/useThemeEffect";

export default function App() {
  useThemeEffect();
  const theme = useAppSelector(selectTheme);
  return (
    <>
      <AuthBootstrap>
        <AppRoutes />
      </AuthBootstrap>
      <ToastContainer position="bottom-right" autoClose={3500} hideProgressBar newestOnTop theme={theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme} />
    </>
  );
}
