import { useEffect } from "react";
import { useAppSelector } from "../app/hooks";
import { persistTheme, selectTheme } from "../features/ui/uiSlice";

/** Applies the theme preference to <html data-theme> and follows the OS when set to "system". */
export function useThemeEffect() {
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    persistTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0e0e13" : "#f4f4f7");
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
