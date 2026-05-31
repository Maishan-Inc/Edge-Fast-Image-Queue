"use client";

import { create } from "zustand";

import type { Locale } from "@/i18n/messages";
import { saveUserPreference } from "@/services/api/preferences";
import { useUserStore } from "@/stores/use-user-store";

type LocaleStore = {
    locale: Locale;
    setLocale: (locale: Locale, sync?: boolean) => void;
};

function detectLocale(): Locale {
    if (typeof window === "undefined") return "zh-CN";
    try {
        const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
        const language = languages.find(Boolean)?.toLowerCase() || "";
        return language.startsWith("zh") ? "zh-CN" : "en-US";
    } catch {
        return "zh-CN";
    }
}

export const useLocaleStore = create<LocaleStore>()((set) => ({
    locale: detectLocale(),
    setLocale: (locale, sync = true) => {
        set({ locale });
        const token = useUserStore.getState().token;
        if (sync && token) void saveUserPreference(token, { locale });
    },
}));
