/**
 * Prompt Producer - Batch prompt generation with reference image
 */

import React, { useEffect, useState, useRef } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { STYLES } from '../data/lookups';
import { getSchemaIssues } from '../utils/schemaGuard';

const PLATFORMS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'onlyfans', label: 'OnlyFans' }
];

export function PromptProducerTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = new AirtableService(base, globalConfig);
    const schemaValid = getSchemaIssues(base, globalConfig).length === 0;
    const [profiles, setProfiles] = useState<InfluencerProfileRecord[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [style, setStyle] = useState('lifestyle');
    const [platform, setPlatform] = useState('instagram');
    const [count, setCount] = useState(10);
    const [referenceUrl, setReferenceUrl] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [promptTone, setPromptTone] = useState('lifestyle');
    const [promptLength, setPromptLength] = useState('medium');
    const [promptFocus, setPromptFocus] = useState<string[]>([]);
    const [seed, setSeed] = useState<number | ''>('');
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState<{ id: string; prompt: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await airtableService.getInfluencerProfiles();
            setProfiles(data);
            if (data[0]) setSelectedId(data[0].id);
        };
        load();
    }, []);

    const selectedProfile = profiles.find(p => p.id === selectedId);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await backendService.uploadReferenceImage(file);
            setReferenceUrl(url);
        } catch (error) {
            alert(`Upload failed: ${String(error)}`);
        } finally {
            setUploading(false);
        }
    };

    const handleGenerate = async () => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedProfile) {
            alert('Select an influencer');
            return;
        }
        setGenerating(true);
        try {
            const promptsTableId = globalConfig.get('promptsTableId') as string | undefined;
            const promptsTableName = promptsTableId ? base.getTableByIdIfExists(promptsTableId)?.name || 'Prompts' : 'Prompts';
            const response = await backendService.generatePromptBatch({
                baseId: base.id,
                promptsTableName: promptsTableName,
                influencerId: selectedProfile.id,
                influencerName: selectedProfile.name,
                influencerAge: Number(selectedProfile.age),
                influencerGender: selectedProfile.gender,
                influencerNiche: selectedProfile.niche,
                influencerStyle: selectedProfile.style,
                style,
                platform,
                count,
                referenceImageUrl: referenceUrl || undefined,
                negativePrompt: negativePrompt || undefined,
                promptTone: promptTone || undefined,
                promptFocus: promptFocus.length ? promptFocus : undefined,
                promptLength: promptLength || undefined,
                seed: seed === '' ? undefined : Number(seed),
                llmProvider: globalConfig.get('defaultLlm') as string || undefined,
                llmModel: globalConfig.get('defaultLlmModel') as string || undefined
            });
            setResults(response.records || []);
        } catch (error) {
            alert(`Prompt generation failed: ${String(error)}`);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="glass-card">
                <div className="card-title">Prompt Lab</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Advanced prompt drafting for manual control. Use Content Studio for the main create-to-production flow.
                </div>
                {!schemaValid && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#F87171' }}>
                        Fix setup in Setup tab to unlock actions.
                    </div>
                )}
            </div>

            <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                    <label className="form-label">Influencer</label>
                    <select
                        className="dark-select"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Style</label>
                    <select
                        className="dark-select"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                    >
                        <option value="lifestyle">Lifestyle</option>
                        {STYLES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select
                        className="dark-select"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        {PLATFORMS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Count</label>
                    <input
                        type="number"
                        className="dark-input"
                        value={count}
                        min={1}
                        max={50}
                        onChange={(e) => setCount(Number(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Reference Image URL</label>
                    <input
                        type="text"
                        className="dark-input"
                        placeholder="https://..."
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Upload Reference</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            className="ghost-btn"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Browse
                        </button>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {uploading ? 'Uploading...' : 'PNG/JPG accepted'}
                        </span>
                    </div>
                    {referenceUrl && (
                        <div style={{ marginTop: 10 }}>
                            <img
                                src={referenceUrl}
                                alt="Reference preview"
                                style={{
                                    width: 120,
                                    height: 120,
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                    border: '1px solid rgba(148,163,184,0.2)'
                                }}
                            />
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                        }}
                    />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                    <label className="form-label">Prompt Controls</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="form-label">Prompt Tone</label>
                            <select className="dark-select" value={promptTone} onChange={(e) => setPromptTone(e.target.value)}>
                                <option value="fashion">Fashion</option>
                                <option value="lifestyle">Lifestyle</option>
                                <option value="editorial">Editorial</option>
                                <option value="casual">Casual</option>
                                <option value="luxury">Luxury</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Prompt Length</label>
                            <select className="dark-select" value={promptLength} onChange={(e) => setPromptLength(e.target.value)}>
                                <option value="short">Short</option>
                                <option value="medium">Medium</option>
                                <option value="long">Long</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Negative Prompt</label>
                            <input
                                type="text"
                                className="dark-input"
                                placeholder="Things to avoid"
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="form-label">Seed</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="dark-input"
                                    placeholder="Optional"
                                    value={seed}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSeed(value === '' ? '' : Number(value));
                                    }}
                                />
                                <button
                                    className="ghost-btn"
                                    type="button"
                                    onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
                                >
                                    Randomize
                                </button>
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / span 2' }}>
                            <label className="form-label">Focus</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['Face', 'Outfit', 'Background', 'Lighting', 'Pose'].map((item) => {
                                    const key = item.toLowerCase();
                                    const active = promptFocus.includes(key);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            className={active ? 'gradient-btn' : 'ghost-btn'}
                                            style={{ padding: '6px 10px', fontSize: '11px' }}
                                            onClick={() => {
                                                setPromptFocus((prev) => (
                                                    prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
                                                ));
                                            }}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Generates draft prompts in the `Prompts` table. Queue and production stay in Content Studio / Production Queue.
                </div>
                <button
                    className="gradient-btn"
                    style={{ padding: '16px' }}
                    onClick={handleGenerate}
                    disabled={generating || !selectedProfile}
                >
                    {generating ? 'Generating...' : 'Generate Draft Prompts'}
                </button>
            </div>

            {results.length > 0 && (
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div className="card-title" style={{ marginBottom: 0 }}>Generated Draft Prompts</div>
                        <span className="tag active">{results.length} saved</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {results.map((r) => (
                            <div key={r.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>
                                    {r.prompt}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Next step: review these drafts in Content Studio, then send approved items to Production Queue.
                    </div>
                </div>
            )}
        </div>
    );
}
