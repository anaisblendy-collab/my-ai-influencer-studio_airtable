
/**
 * Presets Tab - Business Presets Library
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, PresetRecord } from '../services/airtable';

export function PresetsTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);
    const [presets, setPresets] = useState<PresetRecord[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const loadPresets = async () => {
        const data = await airtableService.getPresets();
        setPresets(data);
        if (!selectedPresetId && data[0]) {
            setSelectedPresetId(data[0].id);
        }
    };

    useEffect(() => {
        loadPresets();
    }, []);

    const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);

    const updatePresetField = (field: string, value: string) => {
        if (!selectedPreset) return;
        setPresets((prev) => prev.map((preset) => {
            if (preset.id !== selectedPreset.id) return preset;
            return {
                ...preset,
                [field]: value,
                defaults: {
                    ...preset.defaults,
                    provider: field === 'defaultProvider' ? value : preset.defaults?.provider,
                    model: field === 'defaultModel' ? value : preset.defaults?.model,
                    platform: field === 'platform' ? value : preset.defaults?.platform,
                    promptTemplate: field === 'promptTemplate' ? value : preset.defaults?.promptTemplate
                }
            } as PresetRecord;
        }));
    };

    const handleSave = async () => {
        if (!selectedPreset) return;
        setSaving(true);
        try {
            const table = base.getTableByNameIfExists('Presets');
            if (!table) return;
            await table.updateRecordAsync(selectedPreset.id, {
                'Name': selectedPreset.name,
                'Goal': selectedPreset.goal || '',
                'Platform': selectedPreset.platform || '',
                'Prompt Template': selectedPreset.promptTemplate || '',
                'Default Provider': selectedPreset.defaultProvider || '',
                'Default Model': selectedPreset.defaultModel || '',
                'Active': selectedPreset.active || 'true'
            });
            await loadPresets();
        } finally {
            setSaving(false);
        }
    };

    const applyToWorkspace = () => {
        if (!selectedPreset) return;
        globalConfig.setAsync('workspacePresetId', selectedPreset.id);
    };

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="glass-card">
                <div className="card-title">Business Presets</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Presets align production with business outcomes and brand consistency.
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                <div className="model-grid">
                    {presets.map((preset) => (
                        <div
                            key={preset.id}
                            className="model-card"
                            style={{
                                border: selectedPresetId === preset.id ? '1px solid var(--primary)' : '1px solid var(--card-border)'
                            }}
                            onClick={() => setSelectedPresetId(preset.id)}
                        >
                            <div className="model-card-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div className="model-card-title">{preset.name}</div>
                                    <div className="tag premium">Preset</div>
                                </div>
                                <div className="model-card-desc">{preset.goal || 'Business preset'}</div>
                                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Platform: {preset.platform || 'platform'}
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Provider: {preset.defaultProvider || 'provider'}
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Model: {preset.defaultModel || 'model'}
                                </div>
                                <button
                                    className="gradient-btn"
                                    style={{ marginTop: '12px', padding: '6px 10px', fontSize: '10px' }}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedPresetId(preset.id);
                                        applyToWorkspace();
                                    }}
                                >
                                    Apply to Workspace
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                    <div className="card-title">Preset Editor</div>
                    {!selectedPreset && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select a preset to edit.</div>
                    )}
                    {selectedPreset && (
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.name}
                                    onChange={(e) => updatePresetField('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Goal</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.goal || ''}
                                    onChange={(e) => updatePresetField('goal', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Platform</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.platform || ''}
                                    onChange={(e) => updatePresetField('platform', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prompt Template</label>
                                <textarea
                                    className="dark-textarea"
                                    value={selectedPreset.promptTemplate || ''}
                                    onChange={(e) => updatePresetField('promptTemplate', e.target.value)}
                                    style={{ minHeight: '140px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Default Provider</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.defaultProvider || ''}
                                    onChange={(e) => updatePresetField('defaultProvider', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Default Model</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.defaultModel || ''}
                                    onChange={(e) => updatePresetField('defaultModel', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Active</label>
                                <input
                                    className="dark-input"
                                    value={selectedPreset.active || 'true'}
                                    onChange={(e) => updatePresetField('active', e.target.value)}
                                />
                            </div>
                            <button
                                className="gradient-btn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Preset'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
