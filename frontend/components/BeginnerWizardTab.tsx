/**
 * Beginner Wizard Tab - Guided influencer creation flow
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService } from '../services/airtable';
import { backendService } from '../services/backend';

const DEFAULT_NICHES = [
    'Fashion', 'Fitness', 'Beauty', 'Travel', 'Food', 'Tech', 'Lifestyle',
    'Wellness', 'Interior Design', 'Gaming', 'Luxury', 'Minimalist', 'Vintage', 'Artistic'
];
const DEFAULT_STYLES = [
    'Glamour', 'Minimal', 'Editorial', 'Street', 'Sporty', 'Cinematic',
    'Avant-garde', 'Bohemian', 'Cyberpunk', 'High Fashion', 'Polaroid', 'Candid'
];
const DEFAULT_ORIGINS = [
    'European', 'Latina', 'African', 'East Asian', 'Middle Eastern', 'Indian', 'Mixed',
    'Scandinavian', 'Mediterranean', 'Polynesian', 'Indigenous', 'Central Asian'
];

const FALLBACK_POWER_MODELS = ['Nano Banana 2', 'Nano Banana Pro', 'Ideogram V3 Turbo', 'Flux.1 Schnell'];
const PREVIEW_COUNT_OPTIONS = [1, 2, 3, 4, 6];
const ASPECT_RATIO_OPTIONS = ['1:1', '4:5', '9:16', '16:9'];
const FALLBACK_PREVIEW_MODELS: Record<string, { provider: string; model: string; label: string }> = {
    'Nano Banana 2': { provider: 'google', model: 'gemini-3.1-flash-image-preview', label: 'Nano Banana' },
    'Nano Banana Pro': { provider: 'google', model: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
    'Nano Banana Classic': { provider: 'google', model: 'gemini-2.5-flash-image', label: 'Nano Banana Classic' },
    'Ideogram V3 Turbo': { provider: 'replicate', model: 'ideogram-ai/ideogram-v3-turbo', label: 'Ideogram V3' },
    'Flux.1 Schnell': { provider: 'huggingface', model: 'black-forest-labs/FLUX.1-schnell', label: 'Flux.1 Schnell' },
    'Auto-select': { provider: 'google', model: 'gemini-3.1-flash-image-preview', label: 'Auto' }
};

const STEP_META = [
    { id: 1, label: 'Design & Preview', hint: 'Define persona and generate visual test', icon: '✨' },
    { id: 2, label: 'Finalize', hint: 'Save to repository', icon: '💾' }
] as const;

const normalizeGender = (value: string) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'female' || normalized === 'non-binary') return normalized;
    return 'female';
};

const stepCardStyle = { padding: '16px' } as const;
const summaryCardStyle = {
    padding: '16px',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)'
} as const;


const NICHE_ICONS: Record<string, string> = {
    'Fashion': '👗', 'Fitness': '💪', 'Beauty': '💄', 'Travel': '✈️', 'Food': '🍜',
    'Tech': '💻', 'Lifestyle': '🌿', 'Wellness': '🧘', 'Interior Design': '🏠',
    'Gaming': '🎮', 'Luxury': '💎', 'Minimalist': '◻️', 'Vintage': '📷', 'Artistic': '🎨'
};
const STYLE_ICONS: Record<string, string> = {
    'Glamour': '✨', 'Minimal': '⬜', 'Editorial': '📸', 'Street': '🏙️', 'Sporty': '⚡',
    'Cinematic': '🎬', 'Avant-garde': '🔮', 'Bohemian': '🌸', 'Cyberpunk': '🤖',
    'High Fashion': '👑', 'Polaroid': '📷', 'Candid': '🎞️'
};
const ORIGIN_ICONS: Record<string, string> = {
    'European': '🇪🇺', 'Latina': '🌺', 'African': '🌍', 'East Asian': '🏯',
    'Middle Eastern': '🌙', 'Indian': '🪷', 'Mixed': '🌈', 'Scandinavian': '❄️',
    'Mediterranean': '🌊', 'Polynesian': '🌴', 'Indigenous': '🪶', 'Central Asian': '🏔️'
};

function IdentityChipSelector({
    niche, setNiche, style, setStyle, origin, setOrigin
}: {
    niche: string; setNiche: (v: string) => void;
    style: string; setStyle: (v: string) => void;
    origin: string; setOrigin: (v: string) => void;
}) {
    const [activeTab, setActiveTab] = useState<'niche' | 'style' | 'origin'>('niche');
    const tabs = [
        { id: 'niche' as const, label: 'Niche', emoji: '🎯', current: niche },
        { id: 'style' as const, label: 'Style', emoji: '🎨', current: style },
        { id: 'origin' as const, label: 'Origin', emoji: '🌍', current: origin },
    ];
    const items = activeTab === 'niche' ? DEFAULT_NICHES : activeTab === 'style' ? DEFAULT_STYLES : DEFAULT_ORIGINS;
    const icons = activeTab === 'niche' ? NICHE_ICONS : activeTab === 'style' ? STYLE_ICONS : ORIGIN_ICONS;
    const current = activeTab === 'niche' ? niche : activeTab === 'style' ? style : origin;
    const setter = activeTab === 'niche' ? setNiche : activeTab === 'style' ? setStyle : setOrigin;

    return (
        <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '4px' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px',
                            background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                            color: activeTab === tab.id ? '#000' : 'var(--text-main)',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                        {tab.current && <span style={{ opacity: 0.8, fontSize: '10px' }}>· {tab.current.split(' ')[0]}</span>}
                    </button>
                ))}
            </div>

            {/* Chip grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {items.map((item) => {
                    const isActive = current === item;
                    return (
                        <button
                            key={item}
                            onClick={() => setter(item)}
                            style={{
                                padding: '8px 14px', borderRadius: '100px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: isActive ? 800 : 600,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: isActive
                                    ? 'linear-gradient(135deg, var(--primary), #7c3aed)'
                                    : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#fff' : 'var(--text-muted)',
                                border: isActive ? '1px solid transparent' : '1px solid var(--card-border)',
                                boxShadow: isActive ? '0 4px 16px rgba(var(--primary-rgb),0.35)' : 'none',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            {icons[item] && <span style={{ fontSize: '14px' }}>{icons[item]}</span>}
                            {item}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function BeginnerWizardTab({

    onNavigateLibrary,
    onNavigateWorkspace,
    onNavigatePrompts,
    onNavigateEditPro,
    onNavigateVideoStudio
}: {
    onNavigateLibrary?: () => void;
    onNavigateWorkspace?: () => void;
    onNavigatePrompts?: () => void;
    onNavigateEditPro?: () => void;
    onNavigateVideoStudio?: () => void;
}) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtable = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);
    const [step, setStep] = useState(1);
    const [name, setName] = useState('Aurora');
    const [age, setAge] = useState('25');
    const [gender, setGender] = useState('female');
    const [niche, setNiche] = useState('Fashion');
    const [style, setStyle] = useState('Glamour');
    const [origin, setOrigin] = useState('European');
    const [modelChoice, setModelChoice] = useState('Auto-select');
    const [prompt, setPrompt] = useState('');
    const [registryModels, setRegistryModels] = useState<{ label: string; provider: string; model: string; type?: string; capability?: string }[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
    const [previewCount, setPreviewCount] = useState(3);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageInputs, setImageInputs] = useState<string[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [savedOnce, setSavedOnce] = useState(false);
    const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral');

    const suggestedPrompt = useMemo(() => {
        return `A stunning ${origin} ${niche.toLowerCase()} influencer in ${style.toLowerCase()} style, cinematic lighting, ultra-realistic, 8k, professional photography`;
    }, [niche, style, origin]);

    const imageRegistryModels = useMemo(
        () => registryModels.filter((item) => {
            const cap = (item.capability || item.type || 'image');
            return cap === 'preview-image' || (cap === 'edit' && item.provider === 'nanobanana');
        }),
        [registryModels]
    );
    const videoRegistryModels = useMemo(
        () => registryModels.filter((item) => (item.capability || item.type) === 'video'),
        [registryModels]
    );

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setStatus('Uploading reference...');
            const url = await backendService.uploadReferenceImage(file, base.id);
            setImageInputs(prev => [...prev, url]);
            setStatus('Reference uploaded.');
        } catch (e) {
            setStatus(`Upload failed: ${String(e)}`);
            setStatusTone('error');
        }
    };

    const removeImageInput = (index: number) => {
        setImageInputs(prev => prev.filter((_, i) => i !== index));
    };

    const canContinue = useMemo(() => {
        if (step === 1) return Boolean(name.trim()) && Boolean(age.trim()) && Boolean((prompt || suggestedPrompt).trim());
        return true;
    }, [age, name, prompt, step, suggestedPrompt]);

    useEffect(() => {
        let active = true;
        const loadRegistry = async () => {
            try {
                const registry = await backendService.getModelRegistry();
                const mapped = (registry.models || [])
                    .map((item) => ({
                        label: item.label,
                        provider: item.provider,
                        model: item.model_id,
                        type: item.type,
                        capability: item.capability
                    }));
                if (active && mapped.length) {
                    setRegistryModels(mapped);
                }
            } catch {
                if (active) setRegistryModels([]);
            }
        };
        loadRegistry();
        return () => {
            active = false;
        };
    }, []);

    const generatePreview = async () => {
        setPreviewLoading(true);
        setStatus('');
        setStatusTone('neutral');
        try {
            try {
                await backendService.consumeCredit(base.id, previewCount);
            } catch (e: any) {
                setPreviewLoading(false);
                setStatus('Insufficient Runs. Paywall reached. Upgrade to Premium!');
                setStatusTone('error');
                return;
            }
            
            // Unify model selection
            let config: { provider: string; model: string; label: string };
            const nanobananaMatch = modelChoice.startsWith('nanobanana-');
            
            if (nanobananaMatch) {
                config = {
                    provider: 'nanobanana',
                    model: modelChoice,
                    label: modelChoice === 'nanobanana-v2' ? 'Nano Banana 2' 
                         : modelChoice === 'nanobanana-pro' ? 'Nano Banana Pro' 
                         : 'Nano Banana Classic'
                };
            } else if (modelChoice === 'Auto-select') {
                config = FALLBACK_PREVIEW_MODELS['Auto-select'];
            } else {
                const regModel = imageRegistryModels.find(m => m.label === modelChoice);
                if (regModel) {
                    config = { provider: regModel.provider, model: regModel.model, label: regModel.label };
                } else {
                    config = FALLBACK_PREVIEW_MODELS[modelChoice] || FALLBACK_PREVIEW_MODELS['Auto-select'];
                }
            }

            const result = await backendService.previewGenerateBatch({
                influencer: {
                    name: name || 'Influencer',
                    age: Number(age) || 25,
                    gender: normalizeGender(gender),
                    niche,
                    style
                },
                provider: config.provider,
                model: config.model,
                mediaType: 'image',
                customPrompt: prompt || suggestedPrompt,
                extraParams: { 
                    aspect_ratio: aspectRatio,
                    image_inputs: imageInputs // Pass reference images
                },
                count: previewCount,
                qualityMode: 'fast',
                orgId: base.id,
                billingMode: (globalConfig.get('connectionsBillingMode') as any) || 'platform'
            });

            const urls = (result.results || [])
                .map((item) => item.media_url)
                .filter(Boolean);
            if (urls.length) {
                setPreviewUrls(urls as string[]);
                setSelectedPreview(0);
                setStatus('Preview ready. Pick the image you want to keep.');
                setStatusTone('success');
            } else {
                setStatus('Preview failed. No image returned.');
                setStatusTone('error');
            }
        } catch (error) {
            setStatus(`Preview failed: ${String(error)}`);
            setStatusTone('error');
        } finally {
            setPreviewLoading(false);
        }
    };

    const clearPreview = () => {
        setPreviewUrls([]);
        setSelectedPreview(null);
        setStatus('');
        setStatusTone('neutral');
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus('');
        setStatusTone('neutral');
        try {
            const createdId = await airtable.saveInfluencerProfile({
                name: name || 'New Influencer',
                age,
                gender,
                origin,
                niche,
                style,
                avatarUrl: previewUrls[selectedPreview ?? 0] || undefined
            });
            if (createdId) {
                setSavedOnce(true);
                setStatus('Saved to Library.');
                setStatusTone('success');
            } else {
                setStatus('Could not save to Library. Check permissions.');
                setStatusTone('error');
            }
        } catch (error) {
            setStatus(`Save failed: ${String(error)}`);
            setStatusTone('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderTop: '4px solid var(--primary)' }}>
            {/* Progress Stepper Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
                {STEP_META.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => setStep(item.id)}
                        style={{ 
                            flex: 1, padding: '16px', textAlign: 'center', cursor: 'pointer',
                            background: step === item.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                            borderBottom: step === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                            opacity: step >= item.id ? 1 : 0.4, transition: 'all 0.3s'
                        }}
                    >
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{item.icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: step === item.id ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Creator Wizard</h2>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Design your digital persona. {STEP_META[step - 1].hint}.
                        </div>
                    </div>
                </div>

            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* ── IDENTITY SECTION ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>

                        {/* LEFT: ID Card */}
                        <div className="glass-card" style={{ padding: '28px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Avatar initials */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                                    background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px', fontWeight: 900, color: '#fff',
                                    boxShadow: '0 0 24px rgba(var(--primary-rgb),0.4)'
                                }}>
                                    {(name || 'A')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>{name || 'Your Influencer'}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{age ? `${age} yr · ` : ''}{gender} · {origin}</div>
                                </div>
                            </div>

                            {/* Name input */}
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Name</label>
                                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aurora Mist" style={{ fontSize: '16px', fontWeight: 700 }} />
                            </div>

                            {/* Age + Gender */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Age</label>
                                    <input className="form-input" type="number" min={18} max={99} value={age} onChange={(e) => setAge(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Gender</label>
                                    <select className="form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                                        <option value="female">♀ Female</option>
                                        <option value="male">♂ Male</option>
                                        <option value="non-binary">⚧ Non-binary</option>
                                    </select>
                                </div>
                            </div>

                            {/* Live profile pill summary */}
                            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.06)', border: '1px solid rgba(var(--primary-rgb), 0.15)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {[niche, style, origin].map((tag) => (
                                    <span key={tag} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)' }}>{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Tabbed Niche / Style / Origin chip selector */}
                        <IdentityChipSelector
                            niche={niche} setNiche={setNiche}
                            style={style} setStyle={setStyle}
                            origin={origin} setOrigin={setOrigin}
                        />
                    </div>

                    {/* ── PREVIEW SECTION ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div className="glass-card" style={stepCardStyle}>
                        <div className="card-title">Preview Model</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            This model is used only for the quick preview inside Creator Wizard.
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', marginBottom: '16px' }}>
                            <div style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', letterSpacing: '0.5px', marginBottom: '4px' }}>🍌 GOOGLE NANOBANANA</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                <button className={`tag ${modelChoice === 'nanobanana-v2' ? 'active' : ''}`} onClick={() => setModelChoice('nanobanana-v2')}>Nano Banana 2 (Fast)</button>
                                <button className={`tag ${modelChoice === 'nanobanana-pro' ? 'active' : ''}`} onClick={() => setModelChoice('nanobanana-pro')}>Nano Banana Pro</button>
                                <button className={`tag ${modelChoice === 'nanobanana-classic' ? 'active' : ''}`} onClick={() => setModelChoice('nanobanana-classic')}>Nano Banana Classic</button>
                            </div>
                            
                            <div style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>── OTHERS</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button className={`tag ${modelChoice === 'Auto-select' ? 'active' : ''}`} onClick={() => setModelChoice('Auto-select')}>Auto-select</button>
                                {(imageRegistryModels.length ? imageRegistryModels.filter(m => !m.label.includes('Banana')).map((item) => item.label) : FALLBACK_POWER_MODELS.filter(m => !m.includes('Banana'))).map((item) => (
                                    <button key={item} className={`tag ${modelChoice === item ? 'active' : ''}`} onClick={() => setModelChoice(item)}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card-title">Reference Photos (Optional)</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            Upload up to 14 photos to guide the character creation.
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {imageInputs.map((url, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                                    <img src={url} alt="Ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                        onClick={() => removeImageInput(idx)}
                                        style={{ position: 'absolute', top: 0, right: 0, padding: '2px 4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: '10px', cursor: 'pointer' }}
                                    >✕</button>
                                </div>
                            ))}
                            <label style={{ 
                                width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--card-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                fontSize: '20px', color: 'var(--text-muted)'
                            }}>
                                +
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                            <div style={summaryCardStyle}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>Preview Count</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {PREVIEW_COUNT_OPTIONS.map((value) => (
                                        <button key={value} className={`tag ${previewCount === value ? 'active' : ''}`} onClick={() => setPreviewCount(value)}>
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={summaryCardStyle}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>Aspect Ratio</div>
                                <select className="form-input" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                                    {ASPECT_RATIO_OPTIONS.map((ratio) => (
                                        <option key={ratio} value={ratio}>{ratio}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="card-title">Prompt Builder</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Start from the suggested prompt, then adjust only if needed.
                        </div>
                        <textarea className="form-textarea" rows={5} value={prompt || suggestedPrompt} onChange={(event) => setPrompt(event.target.value)} />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                            <button className="ghost-btn" onClick={() => setPrompt(suggestedPrompt)}>
                                Use suggested prompt
                            </button>
                            <span className="tag">{modelChoice}</span>
                        </div>
                        <div style={{ marginTop: '16px', ...summaryCardStyle }}>
                            <div className="card-title">What this preview checks</div>
                            <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <div>Identity fit: {origin} · {niche} · {style}</div>
                                <div>Visual quality: fast preview only, not final production quality.</div>
                                <div>Output: {previewCount} preview(s) · {aspectRatio}</div>
                                <div>Goal: choose one image to use as the starting avatar.</div>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card" style={stepCardStyle}>
                        <div className="card-title">Mini Studio</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            Generate multiple fast previews and keep the best one.
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div
                                style={{
                                    width: '100%',
                                    minHeight: '220px',
                                    borderRadius: '16px',
                                    background: previewUrls.length ? 'transparent' : 'linear-gradient(160deg, rgba(59,130,246,0.25), rgba(14,116,144,0.2))',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    overflow: 'hidden'
                                }}
                            >
                                {previewLoading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Casting Character...</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Using {modelChoice}</div>
                                    </div>
                                ) : previewUrls.length && selectedPreview !== null ? (
                                    <img src={previewUrls[selectedPreview]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ fontSize: '12px' }}>No preview yet</div>
                                )}
                            </div>
                            {previewUrls.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {previewUrls.map((url, idx) => (
                                        <button key={url} className={`tag ${selectedPreview === idx ? 'active' : ''}`} onClick={() => setSelectedPreview(idx)}>
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <button className="gradient-btn" onClick={generatePreview} disabled={previewLoading}>
                                    {previewLoading ? 'Generating...' : 'Generate Preview'}
                                </button>
                                <button className="ghost-btn" onClick={clearPreview} disabled={!previewUrls.length}>
                                    Clear Preview
                                </button>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fast model used for preview.</div>
                                {videoRegistryModels.length > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Video preview models are available in the Video flow, not in Creator Wizard.
                                    </div>
                                )}
                            </div>
                        </div>
                        {status && (
                            <div style={{ marginTop: '12px', fontSize: '12px', color: statusTone === 'error' ? '#f87171' : statusTone === 'success' ? '#4ade80' : 'var(--text-muted)' }}>
                                {status}
                            </div>
                        )}
                    </div>
                </div>
                </div>
            )}

            {step === 2 && (
                <div className="glass-card" style={stepCardStyle}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>✅</span> CONFIRM & DEPLOY
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', alignItems: 'start' }}>
                        <div style={{ display: 'grid', placeItems: 'center' }}>
                            <div
                                style={{
                                    width: '180px',
                                    height: '220px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(160deg, rgba(59,130,246,0.45), rgba(14,116,144,0.25))',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    padding: '10px',
                                    color: 'var(--text-main)',
                                    fontWeight: 700
                                }}
                            >
                                {previewUrls.length && selectedPreview !== null ? (
                                    <img src={previewUrls[selectedPreview]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                                ) : (
                                    name
                                )}
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                                <div style={summaryCardStyle}><strong>Name:</strong> {name || '—'}</div>
                                <div style={summaryCardStyle}><strong>Profile:</strong> {origin} · {niche}</div>
                                <div style={summaryCardStyle}><strong>Style:</strong> {style}</div>
                                <div style={summaryCardStyle}><strong>Preview model:</strong> {modelChoice}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                Save this influencer to Airtable, then continue to Content Studio or Prompt Lab.
                            </div>
                            <button className="gradient-btn" style={{ padding: '10px 18px' }} disabled={saving || !name.trim()} onClick={handleSave}>
                                {saving ? 'Saving...' : 'Save to Library'}
                            </button>
                            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button className="ghost-btn" onClick={generatePreview} disabled={previewLoading}>
                                    Refresh preview
                                </button>
                                <button className="ghost-btn" onClick={clearPreview} disabled={!previewUrls.length}>
                                    Clear preview
                                </button>
                                {previewUrls.length > 1 && selectedPreview !== null && (
                                    <button className="ghost-btn" onClick={() => setSelectedPreview((selectedPreview + 1) % previewUrls.length)}>
                                        Next preview
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {status && (
                        <div style={{ 
                            marginTop: '24px', padding: '16px', borderRadius: '12px', textAlign: 'center',
                            background: statusTone === 'success' ? 'rgba(74,222,128,0.1)' : statusTone === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                            color: statusTone === 'error' ? '#f87171' : statusTone === 'success' ? '#4ade80' : 'var(--text-muted)',
                            border: `1px solid ${statusTone === 'success' ? '#4ade8033' : statusTone === 'error' ? '#f8717133' : 'var(--card-border)'}`,
                            fontWeight: 600
                        }}>
                            {status}
                        </div>
                    )}
                    {savedOnce && (
                        <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ gridColumn: '1 / -1', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>🚀 Launching Operations</div>
                            <button className="gradient-btn" style={{ padding: '14px' }} onClick={() => onNavigateWorkspace?.()}>
                                Create Content
                            </button>
                            <button className="gradient-btn" style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)' }} onClick={() => onNavigateEditPro?.()}>
                                Edit Pro
                            </button>
                            <button className="gradient-btn" style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)' }} onClick={() => onNavigateVideoStudio?.()}>
                                Video Studio
                            </button>
                            <button className="gradient-btn" style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)' }} onClick={() => onNavigateLibrary?.()}>
                                Influencer Library
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button className="ghost-btn" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
                    Back
                </button>
                {step < STEP_META.length ? (
                    <button className="gradient-btn" onClick={() => setStep(Math.min(STEP_META.length, step + 1))} disabled={!canContinue}>
                        Next
                    </button>
                ) : (
                    <button className="gradient-btn" onClick={() => savedOnce ? onNavigateLibrary?.() : handleSave()} disabled={saving || (!savedOnce && !name.trim())}>
                        {savedOnce ? 'Open Library' : 'Finish'}
                    </button>
                )}
            </div>
            </div>
        </div>
    );
}
