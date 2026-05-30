"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Locale } from "@/i18n/messages";

const LOCALE_STORE_KEY = "aivro:locale";

type LocaleStore = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
};

function detectLocale(): Locale {
    if (typeof window === "undefined") return "zh-CN";
    try {
        const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
        const language = languages.find(Boolean)?.toLowerCase() || "";
        if (!language) return "zh-CN";
        return language.startsWith("zh") ? "zh-CN" : "en-US";
    } catch {
        return "zh-CN";
    }
}

export const useLocaleStore = create<LocaleStore>()(
    persist(
        (set) => ({
            locale: detectLocale(),
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: LOCALE_STORE_KEY,
            partialize: (state) => ({ locale: state.locale }),
            merge: (persisted, current) => ({ ...current, ...((persisted as Partial<LocaleStore>) || {}) }),
        },
    ),
);
