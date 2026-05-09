/**
 * Model Catalog - Internal catalog grouped by provider families
 */

import React, { useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { useModelRegistry } from '../services/modelRegistry';

export function ModelCatalogTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const isAdmin = Boolean(globalConfig.get('isAdmin'));
    const { models, loading } = useModelRegistry({
        orgId: base.id,
        providerConnectedOnly: false
    });
    const grouped = useMemo(() => {
        const map = new Map<string, typeof models>();
        models.forEach((model) => {
            const key = model.provider || 'Unknown';
            const list = map.get(key) || [];
            list.push(model);
            map.set(key, list);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [models]);
    if (!isAdmin) {
        return (
            <div className="glass-card">
                <div className="card-title">Model Catalog</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Admin only.</div>
            </div>
        );
    }
    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="glass-card">
                <div className="card-title">Model Catalog</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Internal catalog for configuring business presets. Not visible to end clients.
                </div>
            </div>

            <div className="space-y-4">
                {loading && (
                    <div className="glass-card">
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading registry...</div>
                    </div>
                )}
                {!loading && grouped.length === 0 && (
                    <div className="glass-card">
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No models in registry.</div>
                    </div>
                )}
                {grouped.map(([provider, items]) => (
                    <div key={provider} className="glass-card">
                        <div className="card-title">{provider}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            {items.length} model{items.length === 1 ? '' : 's'} available.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                            {items.map(model => (
                                <div key={model.id} className="model-card" style={{ padding: '12px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{model.label}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{model.tags?.join(', ') || '—'}</div>
                                    <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Type: {model.type} | Tier: {model.tier}
                                    </div>
                                    <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Billing: {model.billing_mode || 'platform'}
                                    </div>
                                    <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Speed: {model.speed || '—'} | Price: {model.price || '—'}
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Model ID: {model.model_id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
