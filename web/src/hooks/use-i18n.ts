"use client";

import { messages, type Locale } from "@/i18n/messages";
import { useLocaleStore } from "@/stores/use-locale-store";

export function useI18n() {
    const locale = useLocaleStore((state) => state.locale);
    const setLocale = useLocaleStore((state) => state.setLocale);
    const t = (key: keyof (typeof messages)["zh-CN"]) => messages[locale][key] || messages["zh-CN"][key] || key;
    return { locale, setLocale, t };
}

export type { Locale };
