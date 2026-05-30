"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { apiGet } from "@/services/api/request";
import type { AdminPublicSettings } from "@/services/api/admin";

export type AiConfig = {
    model: string;
    imageModel: string;
    videoModel: string;
    textModel: string;
    videoSeconds: string;
    vquality: string;
    systemPrompt: string;
    models: string[];
    quality: string;
    size: string;
    count: string;
};

export const CONFIG_STORE_KEY = "aivro:ai_config_store";

export const defaultConfig: AiConfig = {
    model: "gpt-image-2",
    imageModel: "gpt-image-2",
    videoModel: "grok-imagine-video",
    textModel: "gpt-5.5",
    videoSeconds: "6",
    vquality: "720",
    systemPrompt: "",
    models: [],
    quality: "auto",
    size: "1:1",
    count: "1",
};

type ConfigStore = {
    config: AiConfig;
    publicSettings: AdminPublicSettings | null;
    isPublicSettingsLoading: boolean;
    updateConfig: <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;
    loadPublicSettings: () => Promise<void>;
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
};

function resolveEffectiveConfig(config: AiConfig, modelChannel: AdminPublicSettings["modelChannel"] | null) {
    const models = modelChannel?.availableModels || [];
    const fallbackModel = defaultAllowedModel(models, modelChannel?.defaultModel);
    const fallbackImageModel = defaultAllowedModel(models, modelChannel?.defaultImageModel) || fallbackModel;
    const fallbackVideoModel = defaultAllowedModel(models, modelChannel?.defaultVideoModel) || fallbackModel;
    const fallbackTextModel = defaultAllowedModel(models, modelChannel?.defaultTextModel) || fallbackModel;
    return {
        ...config,
        models,
        model: models.includes(config.model) ? config.model : fallbackModel,
        imageModel: models.includes(config.imageModel) ? config.imageModel : fallbackImageModel,
        videoModel: models.includes(config.videoModel) ? config.videoModel : fallbackVideoModel,
        textModel: models.includes(config.textModel) ? config.textModel : fallbackTextModel,
        systemPrompt: modelChannel?.systemPrompt || "",
    };
}

function isAiConfigReady(config: AiConfig, model: string) {
    return Boolean(model.trim()) && config.models.includes(model);
}

function defaultAllowedModel(models: string[], model?: string) {
    return model && models.includes(model) ? model : models[0] || "";
}

function normalizeStoredConfig(value: Partial<AiConfig> = {}): AiConfig {
    return {
        ...defaultConfig,
        model: value.model || defaultConfig.model,
        imageModel: value.imageModel || value.model || defaultConfig.imageModel,
        videoModel: value.videoModel || defaultConfig.videoModel,
        textModel: value.textModel || value.model || defaultConfig.textModel,
        videoSeconds: value.videoSeconds || defaultConfig.videoSeconds,
        vquality: value.vquality || defaultConfig.vquality,
        systemPrompt: "",
        models: [],
        quality: value.quality || defaultConfig.quality,
        size: value.size || defaultConfig.size,
        count: value.count || defaultConfig.count,
    };
}

export const useConfigStore = create<ConfigStore>()(
    persist(
        (set, get) => ({
            config: defaultConfig,
            publicSettings: null,
            isPublicSettingsLoading: false,
            updateConfig: (key, value) =>
                set((state) => ({
                    config: {
                        ...state.config,
                        [key]: value,
                    },
                })),
            loadPublicSettings: async () => {
                if (get().isPublicSettingsLoading) return;
                set({ isPublicSettingsLoading: true });
                try {
                    set({ publicSettings: await apiGet<AdminPublicSettings>("/api/settings") });
                } finally {
                    set({ isPublicSettingsLoading: false });
                }
            },
            isAiConfigReady: (config, model) => isAiConfigReady(config, model),
        }),
        {
            name: CONFIG_STORE_KEY,
            partialize: (state) => ({ config: state.config }),
            merge: (persisted, current) => {
                return { ...current, config: normalizeStoredConfig((persisted as Partial<ConfigStore>).config || {}) };
            },
        },
    ),
);

export function useEffectiveConfig() {
    const config = useConfigStore((state) => state.config);
    const modelChannel = useConfigStore((state) => state.publicSettings?.modelChannel || null);
    return useMemo(() => resolveEffectiveConfig(config, modelChannel), [config, modelChannel]);
}
