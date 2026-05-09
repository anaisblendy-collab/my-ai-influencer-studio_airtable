import { useEffect, useMemo, useState } from 'react';
import { backendService } from './backend';

export type BillingMode = 'platform' | 'byok' | 'both';
export type Capability = 'preview-image' | 'image' | 'video' | 'edit';

export interface RegistryModel {
    id: string;
    label: string;
    provider: string;
    model_id: string;
    type: Capability;
    capability?: Capability;
    tier: string;
    tags: string[];
    features?: string[];
    speed?: string;
    price?: string;
    billing_mode?: BillingMode;
}

export function mapRegistryToAIModel(model: RegistryModel) {
    return {
        id: model.id,
        name: model.label,
        description: model.tags?.join(', ') || '',
        apiId: model.model_id,
        tags: [model.capability || model.type, model.tier, ...(model.tags || [])],
        features: model.features || [],
        speed: model.speed || '',
        price: model.price || '',
        provider: model.provider
    };
}

interface RegistryCache {
    ts: number;
    models: RegistryModel[];
}

let registryCache: RegistryCache | null = null;
const TTL_MS = 10 * 60 * 1000;

const normalizeProvider = (value: string) => value.toLowerCase();

export async function fetchRegistryModels(force = false): Promise<RegistryModel[]> {
    const now = Date.now();
    if (!force && registryCache && now - registryCache.ts < TTL_MS) {
        return registryCache.models;
    }
    const result = await backendService.getModelRegistry();
    const models = (result.models || []) as RegistryModel[];
    registryCache = { ts: now, models };
    return models;
}

export function useModelRegistry(opts: {
    orgId?: string;
    capability?: Capability;
    billingMode?: BillingMode;
    providerConnectedOnly?: boolean;
}) {
    const { orgId, capability, billingMode, providerConnectedOnly } = opts;
    const [models, setModels] = useState<RegistryModel[]>([]);
    const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchRegistryModels();
                if (!active) return;
                setModels(data);
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const loadConnections = async () => {
            if (!orgId || !providerConnectedOnly) return;
            try {
                const status = await backendService.getConnectionsStatus(orgId);
                const connected = new Set(
                    (status.connections || [])
                        .filter((item) => item.has_key)
                        .map((item) => normalizeProvider(item.provider))
                );
                if (active) setConnectedProviders(connected);
            } catch {
                if (active) setConnectedProviders(new Set());
            }
        };
        loadConnections();
        return () => {
            active = false;
        };
    }, [orgId, providerConnectedOnly]);

    const filtered = useMemo(() => {
        return models.filter((model) => {
            if (capability) {
                const effectiveCapability = model.capability || model.type;
                if (effectiveCapability !== capability) return false;
            }
            if (billingMode && model.billing_mode && model.billing_mode !== 'both' && model.billing_mode !== billingMode) {
                return false;
            }
            if (providerConnectedOnly && connectedProviders.size > 0) {
                return connectedProviders.has(normalizeProvider(model.provider));
            }
            return true;
        });
    }, [models, capability, billingMode, providerConnectedOnly, connectedProviders]);

    return { models: filtered, loading };
}
