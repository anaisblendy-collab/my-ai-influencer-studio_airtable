import { useEffect, useMemo, useState } from 'react';
import type { BusinessPreset } from '../types/domain';
import { backendService } from './backend';

export interface RegistryPreset {
    id: string;
    label: string;
    description: string;
    base_model_id: string;
    capability?: 'image' | 'video' | 'edit';
    prompt_template: string;
    default_params?: Record<string, any>;
}

interface PresetCache {
    ts: number;
    presets: RegistryPreset[];
}

let presetCache: PresetCache | null = null;
const TTL_MS = 10 * 60 * 1000;

export function mapRegistryToPreset(preset: RegistryPreset): BusinessPreset {
    return {
        id: preset.id,
        name: preset.label,
        description: preset.description,
        baseModelId: preset.base_model_id,
        capability: preset.capability,
        loras: [],
        promptTemplate: preset.prompt_template,
        defaultParams: preset.default_params || {}
    };
}

export async function fetchPresetRegistry(force = false): Promise<RegistryPreset[]> {
    const now = Date.now();
    if (!force && presetCache && now - presetCache.ts < TTL_MS) {
        return presetCache.presets;
    }
    const result = await backendService.getPresetRegistry();
    const presets = (result.presets || []) as RegistryPreset[];
    presetCache = { ts: now, presets };
    return presets;
}

export function usePresetRegistry(opts?: { capability?: 'image' | 'video' | 'edit' }) {
    const capability = opts?.capability;
    const [presets, setPresets] = useState<RegistryPreset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchPresetRegistry();
                if (active) setPresets(data);
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const filtered = useMemo(() => {
        if (!capability) return presets;
        return presets.filter((preset) => !preset.capability || preset.capability === capability);
    }, [presets, capability]);

    return { presets: filtered, loading };
}
