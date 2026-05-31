"use client";

import { create } from "zustand";

import { saveUserPreference } from "@/services/api/preferences";
import { useUserStore } from "@/stores/use-user-store";

export type ThemeName = "light" | "dark";

type ThemeStore = {
    theme: ThemeName;
    setTheme: (theme: ThemeName, sync?: boolean) => void;
};

export const useThemeStore = create<ThemeStore>()((set) => ({
    theme: "dark",
    setTheme: (theme, sync = true) => {
        set({ theme });
        const token = useUserStore.getState().token;
        if (sync && token) void saveUserPreference(token, { theme });
    },
}));
