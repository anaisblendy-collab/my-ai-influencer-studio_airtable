/**
 * Create Tab Component - AI Studio Generation Form
 * Business Flow v2: Influencer -> Preset -> Production
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import type { AIModel, InfluencerProfile, BusinessPreset } from '../types/domain';
import { NICHES } from '../data/lookups';
import { mapRegistryToAIModel, useModelRegistry } from '../services/modelRegistry';
import { mapRegistryToPreset, usePresetRegistry } from '../services/presetRegistry';
import { backendService } from '../services/backend';
import { useWorkspaceStore } from '../workspace/workspaceStore';

interface CreateTabProps {
    apiKey: string | undefined;
    selectedModel: AIModel | undefined;
    setSelectedModel: (model: AIModel) => void;
    prefilledProfile: any | null;
}

export function CreateTab({ apiKey, selectedModel, setSelectedModel, prefilledProfile }: CreateTabProps) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const contentTableId = globalConfig.get('contentTableId') as string | undefined;
    const {
        selectedPreset,
        setSelectedPreset,
        contentType,
        setContentType,
        selectedProfile,
        setSelectedProfile
    } = useWorkspaceStore();

    const [influencer, setInfluencer] = useState<InfluencerProfile>({
        name: prefilledProfile?.name || '',
        age: prefilledProfile?.age || '25',
        gender: prefilledProfile?.gender || 'female',
        origin: prefilledProfile?.origin || 'Europe',
        niche: prefilledProfile?.niche || 'fashion',
        style: prefilledProfile?.style || 'glamour'
    });

    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (prefilledProfile) {
            setSelectedProfile(prefilledProfile);
        }
    }, [prefilledProfile, setSelectedProfile]);

    useEffect(() => {
        if (selectedProfile) {
            setInfluencer({
                name: selectedProfile.name || '',
                age: selectedProfile.age || '25',
                gender: selectedProfile.gender || 'female',
                origin: selectedProfile.origin || 'Europe',
                niche: selectedProfile.niche || 'fashion',
                style: selectedProfile.style || 'glamour',
                avatarUrl: selectedProfile.avatarUrl,
                mainCharacterLora: selectedProfile.mainCharacterLora,
                secondaryLoras: selectedProfile.secondaryLoras,
                preferredModelId: selectedProfile.preferredModelId,
                presets: selectedProfile.presets
            });
        }
    }, [selectedProfile]);

    const { models: registryModels } = useModelRegistry({ capability: 'image', billingMode: 'platform', providerConnectedOnly: false });
    const { presets: registryPresets, loading: presetsLoading } = usePresetRegistry({ capability: contentType });
    const businessPresets = useMemo(() => registryPresets.map(mapRegistryToPreset), [registryPresets]);

    useEffect(() => {
        if (!selectedPreset && businessPresets.length > 0) {
            handlePresetSelect(businessPresets[0]);
        }
    }, [selectedPreset, businessPresets]);

    const handlePresetSelect = (preset: BusinessPreset) => {
        setSelectedPreset(preset);
        const model = registryModels.find(m => m.id === preset.baseModelId);
        if (model) setSelectedModel(mapRegistryToAIModel(model));
        if (!prompt) setPrompt(preset.promptTemplate.replace('{prompt}', ''));
    };

    const updateInfluencer = (next: InfluencerProfile) => {
        setInfluencer(next);
        setSelectedProfile(next);
    };

    const handleGenerate = async () => {
        if (!selectedModel) return;
        setGenerating(true);
        try {
            const basePrompt = prompt || selectedPreset?.promptTemplate || '';
            const finalPrompt = basePrompt.replace('{prompt}', `of ${influencer.name}, ${influencer.age}yo ${influencer.gender}, ${influencer.niche} style`);

            const request = {
                model: selectedModel,
                prompt: finalPrompt,
                influencerProfile: influencer,
                baseId: base.id,
                tableId: contentTableId,
                options: selectedPreset?.defaultParams || { steps: 25, guidance: 7.5 },
                billingMode: (globalConfig.get('connectionsBillingMode') as any) || 'platform'
            };

            const response = contentType === 'image'
                ? await backendService.generateImage(request)
                : await backendService.generateVideo(request);

            if (response.success) {
                alert("Generation Initiated! Check Airtable records.");
            } else {
                alert("Error: " + response.message);
            }
        } catch (error) {
            console.error(error);
            alert("System Error during production.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div className="tab-navigation" style={{ background: 'var(--card-bg)', padding: '4px' }}>
                    <button
                        className={`tab-btn ${contentType === 'image' ? 'active' : ''}`}
                        onClick={() => setContentType('image')}
                    >ÐY"÷ START SHOOTING</button>
                    <button
                        className={`tab-btn ${contentType === 'video' ? 'active' : ''}`}
                        onClick={() => setContentType('video')}
                    >ÐYZª RECORD SCENE</button>
                </div>
            </div>

            {/* Creative Energy Header */}
            <div style={{ 
                height: '80px', 
                borderRadius: '16px', 
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%), url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '10px'
            }}>
                <div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Creator Studio</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Talent Generation Pipeline</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '20px' }}>
                <div className="space-y-4">
                    <div className="glass-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
                        <div className="card-title" style={{ color: '#8B5CF6' }}>1. TALENT IDENTITY</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">NAME</label>
                                <input className="dark-input" placeholder="e.g. Luna Martinez" value={influencer.name} onChange={e => updateInfluencer({ ...influencer, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">AGE</label>
                                <input className="dark-input" type="number" value={influencer.age} onChange={e => updateInfluencer({ ...influencer, age: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">NICHE</label>
                                <select className="dark-select" value={influencer.niche} onChange={e => updateInfluencer({ ...influencer, niche: e.target.value })}>
                                    {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#F59E0B' }}>✨</span> 2. SELECT AESTHETIC & STYLE
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px',
                            overflowX: 'auto',
                            paddingBottom: '10px',
                            scrollbarWidth: 'none'
                        }}>
                            {[
                                { id: 'cyber', name: 'Cyberpunk', img: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=200', prompt: 'Neon lights, futuristic city background' },
                                { id: 'vogue', name: 'Editorial', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', prompt: 'High fashion magazine style, studio lighting' },
                                { id: 'vintage', name: 'Vintage', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=200', prompt: '35mm film grain, nostalgic colors' },
                                { id: 'anime', name: 'Anime', img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=200', prompt: 'Pixar style 3d render, vibrant colors' },
                                { id: 'noir', name: 'Noir', img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=200', prompt: 'B&W, high contrast, hollywood lighting' },
                                { id: 'street', name: 'Street', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=200', prompt: 'Urban street photography' },
                                { id: 'glam', name: 'Glamour', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200', prompt: 'Gold accents, elegant pose' },
                                { id: 'art', name: 'Art', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=200', prompt: 'Digital painting style, ethereal glow' }
                            ].map((style) => (
                                <div
                                    key={style.id}
                                    onClick={() => setPrompt(p => style.prompt + (p ? ', ' + p : ''))}
                                    style={{
                                        minWidth: '85px',
                                        height: '85px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0
                                    }}
                                    className="style-mini-card"
                                >
                                    <img src={style.img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        padding: '6px'
                                    }}>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>{style.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <style>{`
                            .style-mini-card:hover {
                                transform: scale(1.08);
                                border-color: #F59E0B !important;
                                z-index: 10;
                            }
                        `}</style>

                        <div className="card-title" style={{ marginTop: '20px', fontSize: '11px', opacity: 0.6 }}>BUSINESS PRESETS (ADVANCED)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {businessPresets.map((preset: BusinessPreset) => (
                                <div
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: selectedPreset?.id === preset.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: selectedPreset?.id === preset.id ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>{preset.name}</div>
                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.2' }}>{preset.description.slice(0, 40)}...</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="card-title">3. SCENE DESCRIPTION</div>
                        <textarea
                            className="dark-textarea"
                            style={{ minHeight: '120px', fontSize: '16px', lineHeight: '1.5' }}
                            placeholder={selectedPreset ? `Add details to: ${selectedPreset.name}...` : "Describe the scene..."}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="card-title">PRODUCTION PIPELINE</div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ENGINE PROFILE</div>
                            <div className="tag premium" style={{ width: '100%', textAlign: 'center' }}>
                                Auto-selected for {selectedPreset?.name || 'this preset'}
                            </div>
                        </div>

                        {selectedPreset?.loras && selectedPreset.loras.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ACTIVE LORAS</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedPreset.loras.map(lora => (
                                        <div key={lora.id} style={{ fontSize: '12px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                            ÐY"- {lora.name} ({lora.strength})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '24px', fontSize: '11px', color: '#10B981', fontStyle: 'italic' }}>
                            Auto-optimized for {selectedPreset?.name || 'quality'}.
                        </div>

                        <button
                            className="gradient-btn"
                            style={{ width: '100%', padding: '24px', fontSize: '16px' }}
                            onClick={handleGenerate}
                            disabled={generating || !influencer.name}
                        >
                            {generating ? 'ÐYõª RENDERING...' : 'RUN GENERATION'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                        Est. Cost: $0.003 / image
                    </div>
                </div>
            </div>
        </div>
    );
}
