import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "ui.theme";

/** Theme choice is a per-device setting, so localStorage is the right place for it. */
const readTheme = (): ThemePreference => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
};

export const persistTheme = (theme: ThemePreference) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable: keep the choice in memory only */
  }
};

interface UiState {
  theme: ThemePreference;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: (): UiState => ({ theme: readTheme() }),
  reducers: {
    themeChanged(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
  },
});

export const { themeChanged } = uiSlice.actions;
export default uiSlice.reducer;
export const selectTheme = (s: { ui: UiState }) => s.ui.theme;
