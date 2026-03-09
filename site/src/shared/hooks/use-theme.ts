import { create } from "zustand";
import type { ThemeKey } from "@/shared/types";

interface ThemeState {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem("site-theme") as ThemeKey) || "A",
  setTheme: (theme) => {
    localStorage.setItem("site-theme", theme);
    set({ theme });
  },
  darkMode: false,
  setDarkMode: (darkMode) => set({ darkMode }),
}));
