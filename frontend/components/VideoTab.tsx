/**
 * VideoTab Component - Laboratoire Vidéo spécialisé
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import type { AIModel } from '../types/domain';
import { mapRegistryToAIModel, useModelRegistry } from '../services/modelRegistry';
import { backendService } from '../services/backend';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import { ModelLogo } from './ModelLogo';

// Specialized Brand Card for Video Studio
const BrandCardIcon = ({ type, active, size = '32px' }: { type: string, active?: boolean, size?: string }) => {
    return <ModelLogo modelId={type} size={size} />;
};

export function VideoTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtable = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);

    const { models: registryModels, loading: registryLoading } = useModelRegistry({
        orgId: base.id,
        capability: 'video',
        billingMode: 'platform',
        providerConnectedOnly: false
    });

    const videoModels = useMemo(() => registryModels.map(mapRegistryToAIModel), [registryModels]);
    const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [duration, setDuration] = useState('10s');
    const [provider, setProvider] = useState('fal');
    
    // New Studio UI State
    const [selectedProduct, setSelectedProduct] = useState<'seedance' | 'seedance2' | 'grok' | 'luma' | 'runway' | 'hailuo' | 'veo' | 'kling' | 'wan' | 'ltx'>('seedance2');
    const [modelVersion, setModelVersion] = useState<'standard' | 'fast'>('standard');
    const [generationMode, setGenerationMode] = useState<'omni' | 'two-frame' | 'lipsync' | 'lipsync-video' | 'extend'>('two-frame');
    const [enableAudio, setEnableAudio] = useState(false);
    const [numOutputs, setNumOutputs] = useState(1);
    const [enhancingPrompt, setEnhancingPrompt] = useState(false);
    const [motionScale, setMotionScale] = useState(5);
    const [autoUpscale, setAutoUpscale] = useState(false);
    const [autoPostThreads, setAutoPostThreads] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [lipSyncModel, setLipSyncModel] = useState<'lipsync-wav2lip' | 'lipsync-muapi' | 'lipsync-sadtalker' | 'lipsync-latentsync'>('lipsync-muapi');
    const [lipSyncVideoModel, setLipSyncVideoModel] = useState<'lipsync-video-wav2lip' | 'lipsync-video-sadtalker' | 'lipsync-video-latentsync'>('lipsync-video-wav2lip');
    const [lipSyncVideoUrl, setLipSyncVideoUrl] = useState<string>('');
    
    // Influencer Selection
    const [influencers, setInfluencers] = useState<InfluencerProfileRecord[]>([]);
    const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfileRecord | null>(null);
    const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
    const [showPortfolioModal, setShowPortfolioModal] = useState<'first' | 'last' | null>(null);

    // Reference Images
    const [firstImageUrl, setFirstImageUrl] = useState<string>('');
    const [lastImageUrl, setLastImageUrl] = useState<string>('');
    
    const [modelSchema, setModelSchema] = useState<any>(null);
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [extraParams, setExtraParams] = useState<Record<string, any>>({});
    const [fieldUploads, setFieldUploads] = useState<Record<string, { uploading: boolean; filename?: string; url?: string }>>({});
    const [previewResults, setPreviewResults] = useState<{ prompt: string; media_url: string; provider: string; model: string; media_type: string }[]>([]);

    // Platform specific defaults
    useEffect(() => {
        if (selectedProduct === 'veo') {
            setDuration('6s');
        } else {
            setDuration('10s');
        }
    }, [selectedProduct]);

    useEffect(() => {
        if (selectedProduct === 'veo') {
            setDuration('6s');
        } else {
            setDuration('10s');
        }
    }, [selectedProduct]);

    useEffect(() => {
        const load = async () => {
             const data = await airtable.getInfluencerProfiles();
             setInfluencers(data || []);
             if (data && data.length > 0) setSelectedInfluencer(data[0]);
        };
        load();
    }, [airtable]);

    useEffect(() => {
        if (selectedInfluencer) {
            const loadPortfolio = async () => {
                try {
                    const contents = await airtable.getContentRecords(50);
                    const filtered = contents
                        .filter(c => c.influencerIds?.includes(selectedInfluencer.id))
                        .map(c => c.mediaUrl || c.storageUrl)
                        .filter(Boolean) as string[];
                    setPortfolioImages(filtered);
                } catch (e) {
                    console.error('Portfolio load failed:', e);
                }
            };
            loadPortfolio();
        }
    }, [selectedInfluencer, airtable]);

    const normalizeProviderKey = (value: string) => {
        const v = (value || '').toLowerCase();
        if (v === 'luma') return 'replicate';
        if (v === 'wan' || v === 'flux' || v === 'fal' || v === 'ltx') return 'fal';
        if (v === 'gemini' || v === 'google') return 'gemini';
        return v || 'replicate';
    };

    const providerKey = normalizeProviderKey(provider);
    const availableModels = useMemo(() => {
        const search = selectedProduct.toLowerCase();

        // LipSync portrait — multi-model
        if (generationMode === 'lipsync') {
            return videoModels.filter(m => ['lipsync-wav2lip','lipsync-muapi','lipsync-sadtalker','lipsync-latentsync'].includes(m.id));
        }
        // LipSync video dubbing
        if (generationMode === 'lipsync-video') {
            return videoModels.filter(m => ['lipsync-video-wav2lip','lipsync-video-sadtalker','lipsync-video-latentsync'].includes(m.id));
        }
        // Seedance 2.0 Extend
        if (generationMode === 'extend') {
            return videoModels.filter(m => m.id === 'seedance-2-0-extend');
        }

        // Map UI product ID → registry search term
        const productMap: Record<string, string> = {
            'seedance2': 'seedance-2-0',
            'seedance': 'seedance-1-5',
            'grok': 'grok-imagine',
            'kling': 'kling',
            'wan': 'wan-2-1',
            'luma': 'luma',
            'runway': 'runway',
            'hailuo': 'minimax',
            'veo': 'veo',
            'ltx': 'ltx-video',
        };
        const term = productMap[search] || search;

        // I2V: if a start frame is uploaded, prefer I2V models
        const isI2V = !!(firstImageUrl || lastImageUrl);
        const typeFilter = isI2V ? 'video-i2v' : 'video';

        let filtered = videoModels.filter(m =>
            m.type === typeFilter &&
            (m.name.toLowerCase().includes(term) ||
             m.apiId?.toLowerCase().includes(term) ||
             m.id.toLowerCase().includes(term))
        );

        // Fallback: ignore type filter
        if (!filtered.length) {
            filtered = videoModels.filter(m =>
                m.name.toLowerCase().includes(term) ||
                m.apiId?.toLowerCase().includes(term) ||
                m.id.toLowerCase().includes(term)
            );
        }

        return filtered.length ? filtered : videoModels.filter(m => m.type === 'video').slice(0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoModels, selectedProduct, generationMode, firstImageUrl, lastImageUrl]);

    useEffect(() => {
        if (availableModels.length > 0) {
            const bestModel = availableModels[0];
            setSelectedModel(bestModel);
            setProvider(bestModel.provider.toLowerCase());
        }
    }, [availableModels]);

    const handleDynamicUpload = async (fieldName: string, file: File, kind: 'image' | 'video' | 'audio', type: 'first' | 'last' | 'other' = 'other') => {
        setFieldUploads((prev) => ({ ...prev, [fieldName]: { ...(prev[fieldName] || {}), uploading: true } }));
        try {
            let url = '';
            if (kind === 'video') url = await backendService.uploadReferenceVideo(file, base.id);
            else if (kind === 'audio') url = await backendService.uploadReferenceAudio(file, base.id);
            else url = await backendService.uploadReferenceImage(file, base.id);
            
            if (type === 'first') setFirstImageUrl(url);
            if (type === 'last') setLastImageUrl(url);
            if (kind === 'audio') setAudioUrl(url);
            // For lipsync-video & extend: video goes to lipSyncVideoUrl
            if (kind === 'video' && (fieldName === 'lipsync_video')) setLipSyncVideoUrl(url);
            
            setFieldUploads((prev) => ({ ...prev, [fieldName]: { uploading: false, filename: file.name, url } }));
        } catch {
            setFieldUploads((prev) => ({ ...prev, [fieldName]: { ...(prev[fieldName] || {}), uploading: false } }));
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt) return;
        setEnhancingPrompt(true);
        try {
            const response = await backendService.previewPromptBatch({
                baseId: base.id,
                promptsTableName: 'Prompts',
                influencerId: selectedInfluencer?.id || '',
                influencerName: selectedInfluencer?.name || 'Test',
                influencerAge: Number(selectedInfluencer?.age) || 25,
                influencerGender: selectedInfluencer?.gender || 'female',
                influencerNiche: selectedInfluencer?.niche || 'fashion',
                influencerStyle: selectedInfluencer?.style || 'glamour',
                style: 'cinematic',
                platform: 'instagram',
                count: 1,
                llmProvider: 'openrouter',
                customPrompt: `Enhance this prompt for ultra-realistic AI video generation: ${prompt}`
            });
            if (response.prompts && response.prompts.length > 0) {
                setPrompt(response.prompts[0]);
            }
        } catch (err) {
            console.error('Enhance failed:', err);
        } finally {
            setEnhancingPrompt(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!selectedModel || !selectedInfluencer) {
             alert("Please select an influencer and a model.");
             return;
        }
        setGenerating(true);
        let finalModel = selectedModel.apiId || selectedModel.id;
        
        // Handle Fast/Pro variants for specific providers
        if (provider === 'gemini') {
            if (modelVersion === 'fast') {
                finalModel = 'veo-fast';
            } else {
                finalModel = 'veo-pro';
            }
        }
        
        try {
            const data = await backendService.previewGenerateBatch({
                influencer: {
                    name: selectedInfluencer.name,
                    age: Number(selectedInfluencer.age) || 25,
                    gender: selectedInfluencer.gender,
                    niche: selectedInfluencer.niche,
                    style: selectedInfluencer.style
                },
                provider: (generationMode === 'lipsync' || generationMode === 'lipsync-video') ? 'replicate' : provider,
                model: generationMode === 'lipsync' ? lipSyncModel : generationMode === 'lipsync-video' ? lipSyncVideoModel : finalModel,
                mediaType: generationMode === 'lipsync' ? 'lipsync' : generationMode === 'lipsync-video' ? 'lipsync-video' : 'video',
                customPrompt: prompt || undefined,
                count: numOutputs,
                referenceImageUrl: firstImageUrl || undefined,
                videoUrl: undefined,
                extraParams: {
                    ...extraParams,
                    duration,
                    enable_audio: enableAudio,
                    end_image_url: lastImageUrl || undefined,
                    motion_bucket_id: motionScale * 12,
                    motion: motionScale,
                    auto_upscale: autoUpscale,
                    auto_post_threads: autoPostThreads,
                    audio_url: audioUrl || undefined,
                    video_url: lipSyncVideoUrl || undefined
                }
            });
            setPreviewResults(data.results || []);
            if (data.results?.length > 0) {
                 alert(`Production complete: ${data.results.length} video(s) ready.`);
            } else {
                 alert("Production complete but no video was returned.");
            }
        } catch (err) {
            alert("Error: " + String(err));
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div style={{ maxWidth: '850px', margin: '0 auto', padding: '24px 0', position: 'relative' }}>
            
            {/* Model Selector Header */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundImage: `url(${selectedInfluencer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'})`, backgroundSize: 'cover', border: '2px solid #10B981' }} />
                    <div>
                        <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>Active Studio</div>
                        <select 
                            className="dark-select" 
                            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}
                            value={selectedInfluencer?.id || ''}
                            onChange={(e) => setSelectedInfluencer(influencers.find(i => i.id === e.target.value) || null)}
                        >
                            {influencers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="tag active" style={{ fontSize: '12px', padding: '6px 14px' }}>{selectedInfluencer?.niche || 'General'}</div>
                </div>
            </div>

            {/* Provider Tabs */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px', letterSpacing: '-0.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🎬</span> Professional Video Platforms
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {[
                        { id: 'seedance2', name: 'Seedance 2.0', badge: 'NEW ✦', color: '#10B981' },
                        { id: 'grok', name: 'Grok Imagine', badge: 'xAI', color: '#00E5FF' },
                        { id: 'kling', name: 'Kling 2.0', badge: 'REALISM', color: '#F43F5E' },
                        { id: 'wan', name: 'WAN 2.1', badge: 'UNIFIED', color: '#8B5CF6' },
                        { id: 'luma', name: 'Luma Dream', badge: 'OFFICIAL', color: '#6200EA' },
                        { id: 'runway', name: 'Runway Gen-3', badge: 'PRO', color: '#E040FB' },
                        { id: 'veo', name: 'Google Veo', badge: 'DIALOGUE', color: '#FBBC05' },
                        { id: 'ltx', name: 'LTX Video', badge: 'DIRECT-GPU', color: '#FF5722' },
                        { id: 'seedance', name: 'Seedance 1.5', badge: 'LEGACY', color: '#64748B' },
                    ].map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setSelectedProduct(p.id as any)}
                            style={{ 
                                padding: '16px', borderRadius: '18px', cursor: 'pointer',
                                background: selectedProduct === p.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.01)',
                                border: selectedProduct === p.id ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                minHeight: '130px',
                                boxShadow: selectedProduct === p.id ? `0 0 20px ${p.color}22` : 'none',
                                transform: selectedProduct === p.id ? 'translateY(-2px)' : 'none'
                            }}
                            onMouseEnter={e => { if (selectedProduct !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { if (selectedProduct !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ 
                                    opacity: selectedProduct === p.id ? 1 : 0.7,
                                    filter: selectedProduct === p.id ? 'none' : 'grayscale(0.5)',
                                    transition: 'all 0.3s'
                                }}>
                                    <BrandCardIcon type={p.id} active={selectedProduct === p.id} size="42px" />
                                </div>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: selectedProduct === p.id ? p.color : 'var(--text-muted)', 
                                    fontWeight: 900, 
                                    letterSpacing: '0.8px',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>
                                    {p.badge}
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: selectedProduct === p.id ? '#fff' : 'var(--text-soft)', transition: 'all 0.3s' }}>{p.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Version & Mode Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-muted)', letterSpacing: '1px' }}>MODEL VERSION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div onClick={() => setModelVersion('standard')} style={{ padding: '14px', borderRadius: '12px', background: modelVersion === 'standard' ? 'var(--sidebar-active-bg)' : 'var(--card-bg)', border: modelVersion === 'standard' ? '1px solid var(--primary)' : '1px solid var(--card-border)', cursor: 'pointer' }}>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>Production / Pro</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Finished cinematic quality.</div>
                        </div>
                        <div onClick={() => setModelVersion('fast')} style={{ padding: '14px', borderRadius: '12px', background: modelVersion === 'fast' ? 'var(--sidebar-active-bg)' : 'var(--card-bg)', border: modelVersion === 'fast' ? '1px solid var(--primary)' : '1px solid var(--card-border)', cursor: 'pointer' }}>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>Speed / ⚡</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Ultra-fast prototyping.</div>
                        </div>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-muted)', letterSpacing: '1px' }}>GENERATION MODE</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '6px' }}>
                         {[
                             { id: 'two-frame', label: 'Keyframe', emoji: '🖼️' },
                             { id: 'omni', label: 'Omni', emoji: '🔮' },
                             { id: 'extend', label: 'Extend', emoji: '⏩' },
                             { id: 'lipsync', label: 'Lip-Sync', emoji: '🎙️' },
                             { id: 'lipsync-video', label: 'Dubbing', emoji: '🎬' },
                         ].map(m => (
                             <button key={m.id} onClick={() => setGenerationMode(m.id as any)} style={{ padding: '8px 4px', borderRadius: '8px', border: 'none', background: generationMode === m.id ? (m.id.includes('lipsync') ? '#10B981' : 'var(--text-main)') : 'transparent', color: generationMode === m.id ? (m.id.includes('lipsync') ? '#000' : 'var(--bg-main)') : 'var(--text-main)', fontWeight: 800, cursor: 'pointer', fontSize: '10px', textAlign: 'center' }}>{m.emoji}<br/>{m.label}</button>
                         ))}
                    </div>
                </div>
            </div>

            {/* Assets Selection */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Reference Visuals (Portfolio)</div>
                <div style={{ display: 'grid', gridTemplateColumns: generationMode === 'two-frame' ? '1fr 1fr' : '1fr', gap: '20px' }}>
                    <div style={{ position: 'relative', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '2px dashed rgba(255,255,255,0.1)', background: firstImageUrl ? `url(${firstImageUrl}) center/cover` : 'rgba(0,0,0,0.2)' }}>
                        {!firstImageUrl && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><span style={{ fontSize: '32px' }}>🖼️</span><span style={{ fontSize: '13px', fontWeight: 600 }}>First Frame</span></div>}
                        {firstImageUrl && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFirstImageUrl(''); }}
                                style={{ position: 'absolute', top: 12, right: 12, width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                            >
                                ✕
                            </button>
                        )}
                        <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', gap: '8px' }}>
                             <button onClick={() => setShowPortfolioModal('first')} style={{ flex: 1, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>PORTFOLIO</button>
                             <label style={{ flex: 1, background: 'var(--text-main)', color: 'var(--bg-main)', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>
                                 IMPORT <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleDynamicUpload('first_image', e.target.files[0], 'image', 'first')} />
                             </label>
                        </div>
                    </div>
                    {generationMode === 'two-frame' && (
                        <div style={{ position: 'relative', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '2px dashed rgba(255,255,255,0.1)', background: lastImageUrl ? `url(${lastImageUrl}) center/cover` : 'rgba(0,0,0,0.2)' }}>
                            {!lastImageUrl && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><span style={{ fontSize: '32px' }}>🏁</span><span style={{ fontSize: '13px', fontWeight: 600 }}>End Frame</span></div>}
                            {lastImageUrl && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setLastImageUrl(''); }}
                                    style={{ position: 'absolute', top: 12, right: 12, width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                                >
                                    ✕
                                </button>
                            )}
                            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', gap: '8px' }}>
                                 <button onClick={() => setShowPortfolioModal('last')} style={{ flex: 1, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>PORTFOLIO</button>
                                  <label style={{ flex: 1, background: 'var(--text-main)', color: 'var(--bg-main)', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>
                                      IMPORT <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleDynamicUpload('last_image', e.target.files[0], 'image', 'last')} />
                                  </label>
                            </div>
                        </div>
                    )}
                    {/* LIPSYNC PORTRAIT – Audio Upload */}
                    {generationMode === 'lipsync' && (
                        <div style={{ borderRadius: '16px', border: '1px solid #10B98133', background: 'rgba(16,185,129,0.04)', padding: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>🎙️ Portrait Lip-Sync — Select Model</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                {[
                                    { id: 'lipsync-muapi', label: 'Muapi Neural', badge: 'FAST' },
                                    { id: 'lipsync-wav2lip', label: 'Wav2Lip', badge: 'CLASSIC' },
                                    { id: 'lipsync-sadtalker', label: 'SadTalker', badge: 'EXPRESSIVE' },
                                    { id: 'lipsync-latentsync', label: 'LatentSync', badge: 'PREMIUM' },
                                ].map(m => (
                                    <div key={m.id} onClick={() => setLipSyncModel(m.id as any)} style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', border: lipSyncModel === m.id ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.07)', background: lipSyncModel === m.id ? 'rgba(16,185,129,0.1)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: lipSyncModel === m.id ? '#10B981' : 'var(--text-main)' }}>{m.label}</span>
                                        <span style={{ fontSize: '9px', color: lipSyncModel === m.id ? '#10B981' : 'var(--text-muted)', fontWeight: 800 }}>{m.badge}</span>
                                    </div>
                                ))}
                            </div>
                            <label style={{ display: 'block', background: audioUrl ? 'rgba(16,185,129,0.15)' : 'var(--text-main)', color: audioUrl ? '#10B981' : 'var(--bg-main)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textAlign: 'center', cursor: 'pointer', border: audioUrl ? '1px solid #10B981' : 'none' }}>
                                {fieldUploads['audio']?.uploading ? 'UPLOADING...' : audioUrl ? '✅ AUDIO READY — REPLACE' : '🎵 SELECT VOICE AUDIO (MP3)'}
                                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleDynamicUpload('audio', e.target.files[0], 'audio')} />
                            </label>
                        </div>
                    )}
                    {/* LIPSYNC VIDEO DUBBING – Video + Audio Upload */}
                    {generationMode === 'lipsync-video' && (
                        <div style={{ borderRadius: '16px', border: '1px solid #8B5CF633', background: 'rgba(139,92,246,0.04)', padding: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8B5CF6', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>🎬 Video Dubbing — Select Model</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                {[
                                    { id: 'lipsync-video-wav2lip', label: 'Wav2Lip', badge: 'DUBBING' },
                                    { id: 'lipsync-video-sadtalker', label: 'SadTalker', badge: 'EXPRESSIVE' },
                                    { id: 'lipsync-video-latentsync', label: 'LatentSync', badge: 'PREMIUM' },
                                ].map(m => (
                                    <div key={m.id} onClick={() => setLipSyncVideoModel(m.id as any)} style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer', border: lipSyncVideoModel === m.id ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.07)', background: lipSyncVideoModel === m.id ? 'rgba(139,92,246,0.1)' : 'transparent', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: lipSyncVideoModel === m.id ? '#8B5CF6' : 'var(--text-main)' }}>{m.label}</div>
                                        <div style={{ fontSize: '9px', color: lipSyncVideoModel === m.id ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 800, marginTop: '2px' }}>{m.badge}</div>
                                    </div>
                                ))}
                            </div>
                            <label style={{ display: 'block', background: lipSyncVideoUrl ? 'rgba(139,92,246,0.15)' : 'var(--text-main)', color: lipSyncVideoUrl ? '#8B5CF6' : 'var(--bg-main)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textAlign: 'center', cursor: 'pointer', border: lipSyncVideoUrl ? '1px solid #8B5CF6' : 'none', marginBottom: '10px' }}>
                                {fieldUploads['lipsync_video']?.uploading ? 'UPLOADING VIDEO...' : lipSyncVideoUrl ? '✅ VIDEO READY — REPLACE' : '🎬 SELECT SOURCE VIDEO'}
                                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { if(e.target.files?.[0]) { handleDynamicUpload('lipsync_video', e.target.files[0], 'video'); } }} />
                            </label>
                            <label style={{ display: 'block', background: audioUrl ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)', color: audioUrl ? '#8B5CF6' : 'var(--text-main)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textAlign: 'center', cursor: 'pointer', border: audioUrl ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)' }}>
                                {fieldUploads['audio']?.uploading ? 'UPLOADING AUDIO...' : audioUrl ? '✅ AUDIO READY — REPLACE' : '🎵 SELECT NEW VOICE (MP3)'}
                                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleDynamicUpload('audio', e.target.files[0], 'audio')} />
                            </label>
                        </div>
                    )}
                    {/* EXTEND MODE – Video upload */}
                    {generationMode === 'extend' && (
                        <div style={{ borderRadius: '16px', border: '1px solid #FBBC0533', background: 'rgba(251,188,5,0.04)', padding: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#FBBC05', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>⏩ Seedance 2.0 Extend</div>
                            <label style={{ display: 'block', background: lipSyncVideoUrl ? 'rgba(251,188,5,0.15)' : 'var(--text-main)', color: lipSyncVideoUrl ? '#FBBC05' : 'var(--bg-main)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textAlign: 'center', cursor: 'pointer', border: lipSyncVideoUrl ? '1px solid #FBBC05' : 'none' }}>
                                {fieldUploads['lipsync_video']?.uploading ? 'UPLOADING...' : lipSyncVideoUrl ? '✅ VIDEO READY — REPLACE' : '🎬 SELECT SEEDANCE 2.0 VIDEO'}
                                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { if(e.target.files?.[0]) handleDynamicUpload('lipsync_video', e.target.files[0], 'video'); }} />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Prompt Section */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>Cinematic Scene Prompt</div>
                    <button onClick={handleEnhancePrompt} disabled={enhancingPrompt || !prompt} style={{ background: 'transparent', border: 'none', color: '#10B981', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>
                        {enhancingPrompt ? 'ENHANCING...' : '✨ AI ENHANCE'}
                    </button>
                </div>
                <textarea
                    className="dark-textarea"
                    placeholder="Action, atmosphere, camera style..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{ minHeight: '130px', borderRadius: '18px', padding: '20px', fontSize: '15px', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
                />
            </div>

            {/* Audio Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>GENERATIVE AUDIO</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automated cinematic sound effects production.</div>
                </div>
                <button 
                    onClick={() => setEnableAudio(!enableAudio)}
                    style={{ background: enableAudio ? '#10B981' : 'rgba(255,255,255,0.1)', width: '60px', height: '32px', borderRadius: '16px', position: 'relative', border: 'none', cursor: 'pointer' }}
                >
                    <div style={{ position: 'absolute', top: '4px', left: enableAudio ? '32px' : '4px', width: '24px', height: '24px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }} />
                </button>
            </div>

            {/* Final Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>DURATION</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(selectedProduct === 'veo' ? ['4s', '6s', '8s'] : ['5s', '10s', '20s']).map(d => (
                             <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: duration === d ? 'var(--text-main)' : 'var(--card-bg)', color: duration === d ? 'var(--bg-main)' : 'var(--text-main)', fontWeight: 800, cursor: 'pointer' }}>{d}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>OUTPUTS</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4].map(n => (
                             <button key={n} onClick={() => setNumOutputs(n)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: numOutputs === n ? 'var(--text-main)' : 'var(--card-bg)', color: numOutputs === n ? 'var(--bg-main)' : 'var(--text-main)', fontWeight: 800, cursor: 'pointer' }}>{n}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>MOTION INTENSITY</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--primary)' }}>{motionScale}</div>
                </div>
                <input 
                    type="range" min="1" max="10" step="1" 
                    value={motionScale} 
                    onChange={(e) => setMotionScale(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }} 
                />
            </div>

            {/* Chaining Options */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autoUpscale} onChange={e => setAutoUpscale(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: autoUpscale ? '#10B981' : 'var(--text-main)' }}>ULTRA QUALITY (4K UPSCALE)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autoPostThreads} onChange={e => setAutoPostThreads(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: autoPostThreads ? '#10B981' : 'var(--text-main)' }}>🚀 AUTO-POST TO THREADS</span>
                </label>
            </div>

            <button
                onClick={handleGenerateVideo}
                disabled={generating}
                style={{ 
                    width: '100%', padding: '20px', borderRadius: '20px', border: 'none',
                    background: 'var(--primary-gradient)', color: '#000', 
                    fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                    cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.3s'
                }}
            >
                {generating ? 'Production in Progress...' : 'Launch Studio Production'}
            </button>

            {/* Portfolio Modal */}
            {showPortfolioModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
                    <div style={{ background: '#111', width: '100%', maxWidth: '700px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800 }}>Portfolio de {selectedInfluencer?.name}</div>
                            <button onClick={() => setShowPortfolioModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {portfolioImages.map((u, i) => (
                                <img key={i} src={u} onClick={() => { if(showPortfolioModal==='first') setFirstImageUrl(u); else setLastImageUrl(u); setShowPortfolioModal(null); }} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderColor = '#10B981'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Results Section */}
            {previewResults.length > 0 && (
                <div style={{ marginTop: '48px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 900 }}>Production Preview ✨</div>
                        <button onClick={() => setPreviewResults([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>CLEAR ALL</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: previewResults.length > 1 ? '1fr 1fr' : '1fr', gap: '24px' }}>
                        {previewResults.map((res, i) => (
                            <div key={i} className="glass-card" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <video 
                                    src={res.media_url} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    playsInline
                                    style={{ width: '100%', display: 'block' }} 
                                />
                                <div style={{ padding: '20px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '8px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        "{res.prompt}"
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="tag" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{res.model}</div>
                                        <a href={res.media_url} download target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#10B981', fontWeight: 800, textDecoration: 'none' }}>DOWNLOAD</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
