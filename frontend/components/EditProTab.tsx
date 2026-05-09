/**
 * Edit Pro - Prompt-based multi-image editing (Nano Banana Pro)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { backendService } from '../services/backend';
import { AirtableService } from '../services/airtable';
import { mapRegistryToAIModel, useModelRegistry } from '../services/modelRegistry';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import type { InfluencerProfileRecord } from '../services/airtable';

interface EditPreset {
    id: string;
    label: string;
    tags: string[];
}

const PRESETS: EditPreset[] = [
    { id: 'iphone-selfie', label: 'iPhone Selfie', tags: ['iphone selfie', 'handheld', 'close-up', 'natural light', 'candid'] },
    { id: 'mirror-selfie', label: 'Mirror Selfie', tags: ['mirror selfie', 'phone visible', 'bathroom or bedroom', 'realistic'] },
    { id: 'full-body', label: 'Full Body', tags: ['full body shot', 'head-to-toe framing', 'professional photography'] },
    { id: 'top-down', label: 'Top Down View', tags: ['top down view', 'overhead angle', 'flat lay', 'lifestyle'] },
    { id: 'product-shot', label: 'Product Shot', tags: ['product shot', 'centered composition', 'studio lighting', 'high-end'] },
    { id: 'editorial', label: 'Editorial', tags: ['editorial style', 'cinematic lighting', 'high fashion', 'glamour'] },
    { id: 'cyber-night', label: 'Cyber Night', tags: ['neon lights', 'cyberpunk aesthetic', 'city night', 'night photography'] },
    { id: 'workout', label: 'Workout', tags: ['fitness center', 'gym motivation', 'activewear', 'action shot'] },
    { id: 'vintage-film', label: 'Vintage Film', tags: ['35mm film', 'grainy', 'vintage aesthetic', 'nostalgic'] }
];

const RESOLUTIONS = ['0.5K', '1K', '2K', '4K'] as const;
const ASPECTS = ['match_input_image', '9:16', '16:9', '1:1', '4:3', '3:4', '2:3', '3:2'] as const;

export function EditProTab() {
    const { activeTab, setActiveTab, selectedProfile, setSelectedProfile } = useWorkspaceStore();
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);
    const [profiles, setProfiles] = useState<InfluencerProfileRecord[]>([]);
    const [prompt, setPrompt] = useState('');
    const [images, setImages] = useState<{ url: string; name?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [outputUrls, setOutputUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [presetId, setPresetId] = useState('iphone-selfie');
    const [resolution, setResolution] = useState('1K');
    const [aspect, setAspect] = useState('9:16');
    const [numOutputs, setNumOutputs] = useState(1);
    const [crispUpscale, setCrispUpscale] = useState(false);
    const [modelId, setModelId] = useState('gemini-3.1-flash-image-preview');
    const [status, setStatus] = useState<string | null>(null);
    const [savingToContent, setSavingToContent] = useState(false);
    const [postingToFanvue, setPostingToFanvue] = useState(false);
    const [savedContentId, setSavedContentId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [portfolioOpen, setPortfolioOpen] = useState(false);
    const [portfolioImages, setPortfolioImages] = useState<{ id: string, url: string }[]>([]);

    const connectionsBillingMode = (globalConfig.get('connectionsBillingMode') as any | undefined) || 'platform';
    const { models, loading: registryLoading } = useModelRegistry({
        capability: 'edit',
        billingMode: connectionsBillingMode,
        providerConnectedOnly: false
    });
    useEffect(() => {
        console.log('[EditProTab] Models registry loaded:', models.length, 'models total');
        console.log('[EditProTab] Billing mode:', connectionsBillingMode);
    }, [models, connectionsBillingMode]);

    const promptEditModels = useMemo(() => {
        const filtered = models
            .filter((item) => {
                const features = (item.features || []).map((f) => f.toLowerCase());
                return features.includes('prompt_edit') || features.includes('multi_image');
            })
            .map(mapRegistryToAIModel);
        
        console.log('[EditProTab] Filtered edit models:', filtered.map(m => m.name));
        return filtered;
    }, [models]);

    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const results = await airtableService.getInfluencerProfiles();
                setProfiles(results || []);
                // If nothing selected yet, pick first
                if (!selectedProfile && results && results.length > 0) {
                    setSelectedProfile(results[0] as any);
                }

            } catch (err) {
                console.error('Failed to load profiles:', err);
            }
        };
        loadProfiles();
    }, [airtableService, selectedProfile, setSelectedProfile]);

    useEffect(() => {
        if (!portfolioOpen || !selectedProfile?.id) return;
        const loadPortfolio = async () => {
            try {
                const records = await airtableService.getContentRecords(100);
                const currentId = selectedProfile?.id;
                if (!currentId) return;
                const matched = records.filter(r => r.influencerIds?.includes(currentId) && r.mediaUrl);
                setPortfolioImages(matched.map(r => ({ id: r.id, url: r.mediaUrl! })));
            } catch (err) {
                console.error('Failed to load portfolio:', err);
            }
        };
        loadPortfolio();
    }, [portfolioOpen, selectedProfile?.id, airtableService]);


    useEffect(() => {
        if (!promptEditModels.length) return;
        const match = promptEditModels.find((model) => model.id === modelId);
        if (!match) {
            setModelId(promptEditModels[0].id);
        }
    }, [promptEditModels, modelId]);

    const handleUpload = async (files: FileList) => {
        const nextImages: { url: string; name: string; file?: File }[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const localUrl = URL.createObjectURL(file);
            nextImages.push({ url: localUrl, name: file.name, file });
            if (images.length + nextImages.length >= 14) break;
        }
        setImages((prev) => [...prev, ...nextImages].slice(0, 14));
    };

    const handleGenerate = async () => {
        if (!prompt && !images.length) {
            setStatus('Please provide a prompt or images.');
            return;
        }
        setLoading(true);
        setStatus(null);
        setOutputUrls([]);
        try {
            const selectedModel = promptEditModels.find((m) => m.id === modelId);
            const provider = (selectedModel?.provider || 'replicate').toLowerCase();
            const orgId = base.id;
            const presetTags = PRESETS.find((p) => p.id === presetId)?.tags || [];

            const profileOrigin = selectedProfile?.origin || '';
            const enhancedPrompt = profileOrigin ? `${profileOrigin} influencer. ${prompt}` : prompt;

            // Simultaneous Upload Logic
            const uploadedImageUrls = await Promise.all(
                images.map(async (item) => {
                    if (item.file) {
                        return await backendService.uploadReferenceImage(item.file, base.id);
                    }
                    return item.url; // Already a remote URL (from portfolio)
                })
            );

            const payload = {
                provider,
                model: modelId,
                prompt: enhancedPrompt,
                imageInputs: uploadedImageUrls,
                aspectRatio: aspect,
                resolution: resolution,
                numOutputs: numOutputs,
                outputFormat: 'jpg',
                crispUpscale,
                presetTags,
                orgId,
                billingMode: (window as any).AirtableMode || connectionsBillingMode
            };


            // Credits check for Platform mode
            if (connectionsBillingMode === 'platform') {
                const creditStatus = await backendService.getCreditsStatus(orgId);
                if (creditStatus.remaining_credits < numOutputs) {
                    setStatus(`Insufficient credits: ${numOutputs} required, ${creditStatus.remaining_credits} remaining.`);
                    setLoading(false);
                    return;
                }
            }

            const response = await backendService.previewPromptEdit(payload);
            
            if (response && (response.output_urls?.length || response.output_url)) {
                setOutputUrls(response.output_urls?.length ? response.output_urls : [response.output_url!]);
                
                // Consume credits actually used
                if (connectionsBillingMode === 'platform') {
                    await backendService.consumeCredit(orgId, numOutputs);
                    window.dispatchEvent(new CustomEvent('refresh-credits'));
                }
            } else {
                setStatus('Generation failed: no output URL returned.');
            }
        } catch (error) {
            setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveToContent = async (url: string) => {
        if (!selectedProfile?.id) {
            setStatus('Select an influencer first.');
            return;
        }
        setSavingToContent(true);
        setStatus(null);
        try {
            const selectedModel = promptEditModels.find(m => m.id === modelId);
            const provider = selectedModel?.provider || 'replicate';

            let finalUrl = url;
            if (url.startsWith('https://')) {
                // To avoid CORS issues when fetching the generated image to save it,
                // we route it through our backend's image proxy
                const proxiedUrl = `${backendService.getBaseUrl()}/api/v1/image-proxy?url=${encodeURIComponent(url)}`;
                setStatus('Downloading via proxy...');
                const response = await fetch(proxiedUrl);
                if (!response.ok) throw new Error(`Proxy download failed: ${response.statusText}`);
                const blob = await response.blob();
                const file = new File([blob], `edit_pro_${Date.now()}.png`, { type: blob.type || 'image/png' });
                setStatus('Uploading to permanent storage...');
                finalUrl = await backendService.uploadReferenceImage(file, base.id);
                if (!finalUrl) throw new Error('Failed to upload image to storage.');
            } else if (url.startsWith('data:')) {
                setStatus('Uploading raw data to storage...');
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], `edit_pro_${Date.now()}.png`, { type: blob.type || 'image/png' });
                finalUrl = await backendService.uploadReferenceImage(file, base.id);
                if (!finalUrl) throw new Error('Failed to upload image to storage.');
            }

            const recordId = await airtableService.saveContentRecord({
                influencerId: selectedProfile.id,
                name: selectedProfile.name || 'Edited content',
                age: Number(selectedProfile.age || 25),
                niche: selectedProfile.niche,
                style: selectedProfile.style,
                status: 'Approved',
                prompt,
                model: modelId,
                provider: provider,
                type: 'image',
                platform: 'Instagram',
                approved: true,
                source: 'edited',
                createdAt: new Date().toISOString(),
                mediaUrl: finalUrl
            });
            if (!recordId) {
                setStatus('Save to Content failed.');
                return;
            }
            setSavedContentId(recordId);
            setStatus(`Saved as ${recordId}.`);
        } catch (error) {
            setStatus(`Save failed: ${String(error)}`);
        } finally {
            setSavingToContent(false);
        }
    };

    const handleDownload = async (url: string, index: number) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = urlBlob;
            a.download = `edit_pro_${index}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(urlBlob);
        } catch {
            setStatus(`Download failed.`);
        }
    };

    const handleSendToStudio = (url: string) => {
        localStorage.setItem('bonobooh_studio_transfer_url', url);
        setStatus("Redirecting to Studio...");
        setTimeout(() => {
            setActiveTab('editor');
        }, 800);
    };

    return (
        <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--card-bg)' }}>
            
            {/* Header with Prominent Influencer Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Edit Pro</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Multi-reference image editing via prompt.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundImage: `url(${selectedProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'})`, backgroundSize: 'cover' }} />
                    <select
                        className="dark-select"
                        value={selectedProfile?.id || ''}
                        onChange={(e) => {
                            const match = profiles.find(p => p.id === e.target.value);
                            setSelectedProfile((match || null) as any);
                        }}

                        style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '14px', fontWeight: 600, outline: 'none' }}
                    >
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Output Section */}
            {outputUrls.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '18px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#10B981' }}>Generation Results</div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: '20px' }}>
                        {outputUrls.map((url, idx) => (
                            <div key={idx} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
                                <img src={url} alt="Result" style={{ width: '100%', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button 
                                        onClick={() => handleDownload(url, idx)}
                                        style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Download
                                    </button>
                                    <button 
                                        onClick={() => handleSendToStudio(url)}
                                        style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Studio
                                    </button>
                                    <button 
                                        onClick={() => handleSaveToContent(url)} 
                                        disabled={savingToContent}
                                        style={{ background: '#10B981', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        {savingToContent ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }}>
                
                {/* Left Column: Images & Prompt */}
                <div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Reference Images ({images.length}/14)</div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                            {images.map((item, index) => (
                                <div key={item.url} style={{ paddingTop: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={item.url} alt="Ref" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        onClick={() => setImages((prev) => prev.filter((img) => img.url !== item.url))}
                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {images.length < 14 && !uploading && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ paddingTop: '100%', position: 'relative', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '20px', color: 'var(--text-muted)' }}>+</div>
                                </div>
                            )}
                            {uploading && (
                                <div style={{ 
                                    paddingTop: '100%', position: 'relative', borderRadius: '12px', 
                                    border: '1px solid var(--primary)', background: 'rgba(209, 254, 23, 0.05)', 
                                    animation: 'pulseGlow 1.5s infinite ease-in-out',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '9px', color: 'var(--primary)', fontWeight: 900, textAlign: 'center' }}>
                                        UPLOADING...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setPortfolioOpen(!portfolioOpen)}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {portfolioOpen ? 'Hide Portfolio' : '🖼️ Pick from Portfolio'}
                            </button>
                            <input
                                ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = ''; }
                                }}
                            />
                        </div>

                        {portfolioOpen && (
                            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>{selectedProfile?.name}'s Portfolio</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {portfolioImages.length === 0 ? (
                                        <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>No content found.</div>
                                    ) : (
                                        portfolioImages.map(img => (
                                            <div 
                                                key={img.id} 
                                                onClick={() => {
                                                    if (images.find(i => i.url === img.url)) setImages(prev => prev.filter(i => i.url !== img.url));
                                                    else if (images.length < 14) setImages(prev => [...prev, { url: img.url, name: `p-${img.id}` }]);
                                                }}
                                                style={{ paddingTop: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: images.find(i => i.url === img.url) ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)' }}
                                            >
                                                <img src={img.url} alt="Port" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Edit Prompt</div>
                        <textarea
                            className="dark-textarea"
                            placeholder="e.g. 'Change her dress to a sparkling red evening gown, luxury background...'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '14px' }}
                        />
                    </div>
                </div>

                {/* Right Column: Settings */}
                <div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: '20px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Settings</div>
                        
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Base Style</label>
                                <select className="dark-select" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                                    {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>AI Model</label>
                                <select className="dark-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                                    {registryLoading && <option>Loading models...</option>}
                                    {promptEditModels.length === 0 && !registryLoading && <option value="">No models found (registry check)</option>}
                                    {promptEditModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Resolution</label>
                                    <select className="dark-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                                        {RESOLUTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Format</label>
                                    <select className="dark-select" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                                        {ASPECTS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Number of Images</label>
                                <select className="dark-select" value={numOutputs} onChange={(e) => setNumOutputs(Number(e.target.value))}>
                                    {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '13px' }}>Upscaling Net (Crisp)</label>
                                <button
                                    onClick={() => setCrispUpscale(!crispUpscale)}
                                    style={{ width: '44px', height: '24px', background: crispUpscale ? '#10B981' : 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', transition: 'all 0.3s', cursor: 'pointer', border: 'none' }}
                                >
                                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: crispUpscale ? '22px' : '2px', transition: 'all 0.3s' }} />
                                </button>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <button
                                    className="gradient-btn"
                                    onClick={handleGenerate}
                                    disabled={loading || uploading}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 800 }}
                                >
                                    {loading ? 'Generating...' : 'Start Editing'}
                                </button>
                                {status && (
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: status.includes('Error') || status.includes('failed') ? '#F87171' : '#10B981', textAlign: 'center' }}>{status}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
