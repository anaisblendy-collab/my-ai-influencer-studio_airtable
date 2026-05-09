
/**
 * Workspace Tab - Main production flow
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord, PresetRecord, PromptRecord, JobRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { loraService } from '../services/lora';
import type { LoraAirtableItem } from '../services/backend';
import { getSchemaIssues } from '../utils/schemaGuard';
import { DashboardTab } from './DashboardTab';
import { ModelLogo } from './ModelLogo';
import { useWorkspaceStore } from '../workspace/workspaceStore';

const ASSISTANT_MODELS = [
    { provider: 'openrouter', model: 'x-ai/grok-4-fast', label: 'Grok 4 Fast' },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
    { provider: 'openrouter', model: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
];

export function WorkspaceTab() {
    const { setActiveTab } = useWorkspaceStore();
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const promptsTableId = globalConfig.get('promptsTableId') as string | undefined;
    const promptsTableName = promptsTableId ? base.getTableByIdIfExists(promptsTableId)?.name || 'Prompts' : 'Prompts';
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
    const schemaIssues = getSchemaIssues(base, globalConfig);
    const schemaValid = schemaIssues.length === 0;
    const airtableService = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);
    const [profiles, setProfiles] = useState<InfluencerProfileRecord[]>([]);
    const [presets, setPresets] = useState<PresetRecord[]>([]);
    const [prompts, setPrompts] = useState<PromptRecord[]>([]);
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const [selectedPresetId, setSelectedPresetId] = useState('');
    const [platform, setPlatform] = useState('instagram');
    const [count, setCount] = useState(5);
    const [referenceImages, setReferenceImages] = useState<{ url: string; name?: string }[]>([]);
    const [referenceInput, setReferenceInput] = useState('');
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [promptStyle, setPromptStyle] = useState('instagram');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [promptTone, setPromptTone] = useState('lifestyle');
    const [promptLength, setPromptLength] = useState('medium');
    const [promptFocus, setPromptFocus] = useState<string[]>([]);
    const [seed, setSeed] = useState<number | ''>('');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [uploadingRef, setUploadingRef] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [queueing, setQueueing] = useState<string | null>(null);
    const [results, setResults] = useState<{ id: string; prompt: string; source?: 'idea' | 'airtable'; model?: string; provider?: string }[]>([]);
    const [assistantMessages, setAssistantMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantBusy, setAssistantBusy] = useState(false);
    const [assistantLog, setAssistantLog] = useState<{ title: string; detail: string; at: string }[]>([]);
    
    // LoRA state
    const [availableLoras, setAvailableLoras] = useState<LoraAirtableItem[]>([]);
    const [selectedLoras, setSelectedLoras] = useState<string[]>([]);
    const [loraLoading, setLoraLoading] = useState(false);
    const [showLoraQuickAccess, setShowLoraQuickAccess] = useState(false);
    const defaultLlm = (globalConfig.get('defaultLlm') as string) || 'openrouter';
    const defaultLlmModel = (globalConfig.get('defaultLlmModel') as string) || 'x-ai/grok-4-fast';
    const defaultAssistantModel = (globalConfig.get('defaultDashboardLlm') as string) || 'x-ai/grok-4-fast';
    const defaultImage = (globalConfig.get('defaultImage') as string) || 'replicate';
    const [llmModel, setLlmModel] = useState(defaultLlmModel);
    const [assistantModel, setAssistantModel] = useState(defaultAssistantModel);
    const [promptIdeas, setPromptIdeas] = useState<string[]>([]);
    const [promptLoading, setPromptLoading] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);
    const [imagePromptLoading, setImagePromptLoading] = useState(false);
    const [imagePromptError, setImagePromptError] = useState<string | null>(null);
    const [showDashboard, setShowDashboard] = useState(true);
    const [autoQueue, setAutoQueue] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const referenceInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [profilesData, presetData, promptRows, jobRows] = await Promise.all([
                    airtableService.getInfluencerProfiles(),
                    airtableService.getPresets(),
                    airtableService.getPrompts(),
                    airtableService.getJobs()
                ]);
                if (!active) return;
                setProfiles(profilesData);
                if (profilesData[0] && !selectedProfileId) setSelectedProfileId(profilesData[0].id);
                setPresets(presetData);
                setPrompts(promptRows);
                setJobs(jobRows);
                
                const storedPresetId = globalConfig.get('workspacePresetId') as string | undefined;
                if (storedPresetId && presetData.some((preset) => preset.id === storedPresetId)) {
                    setSelectedPresetId(storedPresetId);
                } else if (presetData[0] && !selectedPresetId) {
                    setSelectedPresetId(presetData[0].id);
                }
            } catch (err) {
                console.error('Failed to load workspace data:', err);
            }
        };

        const loadLoras = async () => {
            setLoraLoading(true);
            try {
                const loraData = await loraService.listLorasFromAirtable(base.id, 'Assets', 'LoRA');
                if (!active) return;
                setAvailableLoras(loraData.items || []);
            } catch (error) {
                console.error('Failed to load LoRAs:', error);
            } finally {
                if (active) setLoraLoading(false);
            }
        };

        load();
        loadLoras();

        // 10s auto-refresh for dynamic data
        const interval = setInterval(load, 10000);
        
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [airtableService, globalConfig, base.id]);

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const selectedPreset = presets.find(p => p.id === selectedPresetId);
    const providerUsed = selectedPreset?.defaults?.provider || defaultImage;

    const applyPreset = () => {
        if (!selectedPreset?.defaults) return;
        if (selectedPreset.defaults.platform) {
            setPlatform(selectedPreset.defaults.platform);
        }
        if (selectedPreset.defaults.promptTemplate) {
            setCustomPrompt(selectedPreset.defaults.promptTemplate);
        }
    };

    useEffect(() => {
        applyPreset();
    }, [selectedPreset?.id]);

    useEffect(() => {
        if (llmModel && llmModel !== defaultLlmModel) {
            globalConfig.setAsync('defaultLlmModel', llmModel);
        }
    }, [llmModel, defaultLlmModel, globalConfig]);

    useEffect(() => {
        if (assistantModel) {
            globalConfig.setAsync('defaultDashboardLlm', assistantModel);
        }
    }, [assistantModel, globalConfig]);

    const addReferenceImage = (url: string, name?: string) => {
        let normalized = url.trim();
        if (normalized.startsWith('http://')) {
            normalized = normalized.replace('http://', 'https://');
        }
        if (!normalized) return;
        setReferenceImages((prev) => {
            if (prev.some((item) => item.url === normalized)) {
                return prev;
            }
            return [...prev, { url: normalized, name }];
        });
    };

    const handleUploadReference = async (files: FileList | File[]) => {
        setUploadingRef(true);
        try {
            const list = Array.isArray(files) ? files : Array.from(files);
            for (const file of list) {
                const url = await backendService.uploadReferenceImage(file);
                addReferenceImage(url, file.name);
            }
        } catch (error) {
            alert(`Upload failed: ${String(error)}`);
        } finally {
            setUploadingRef(false);
        }
    };

    const reorderReferenceImages = (fromIndex: number, toIndex: number) => {
        setReferenceImages((prev) => {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const handleGeneratePromptIdeas = async () => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        setPromptError(null);
        if (!selectedProfile) return;
        setPromptLoading(true);
        try {
            const style = promptStyle;
            
            // Auto-add LoRA trigger words to custom prompt
            let finalCustomPrompt = customPrompt || undefined;
            const selectedLoraMatches = availableLoras.filter(l => selectedLoras.includes(l.urn));
            if (selectedLoraMatches.length > 0) {
                const combinedTriggers = selectedLoraMatches.flatMap(l => l.trigger_words).slice(0, 5).join(', ');
                if (combinedTriggers) {
                    finalCustomPrompt = finalCustomPrompt 
                        ? `${combinedTriggers}, ${finalCustomPrompt}`
                        : combinedTriggers;
                }
            }
            
            const response = await backendService.previewPromptBatch({
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
                count: 5,
                referenceImageUrl: referenceImages[0]?.url || undefined,
                referenceImageUrls: referenceImages.map((item) => item.url),
                negativePrompt: negativePrompt || undefined,
                promptTone: promptTone || undefined,
                promptFocus: promptFocus.length ? promptFocus : undefined,
                promptLength: promptLength || undefined,
                seed: seed === '' ? undefined : Number(seed),
                llmProvider: defaultLlm,
                llmModel: llmModel,
                customPrompt: finalCustomPrompt
            });
            setPromptIdeas(response.prompts || []);
        } catch (error) {
            setPromptError(String(error));
        } finally {
            setPromptLoading(false);
        }
    };

    

    const handleSavePromptIdeas = async () => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedProfile || !promptIdeas.length) return;
        setPromptLoading(true);
        try {
            const response = await backendService.savePromptList({
                baseId: base.id,
                promptsTableName: promptsTableName,
                influencerId: selectedProfile.id,
                prompts: promptIdeas,
                style: promptStyle,
                platform,
                status: 'draft',
                referenceImageUrl: referenceImages[0]?.url || undefined,
                referenceImageUrls: referenceImages.map((item) => item.url)
            });
            const records = (response.records || []).map((item) => ({
                ...item,
                source: 'airtable' as const
            }));
            setResults(records);
            setPromptIdeas([]);
        } catch (error) {
            setPromptError(String(error));
        } finally {
            setPromptLoading(false);
        }
    };
const handleUseAllIdeas = () => {
        if (!promptIdeas.length) return;
        const items = promptIdeas.map((prompt, index) => ({
            id: `idea_${index}`,
            prompt,
            source: 'idea' as const
        }));
        setResults(items);
    };

    const handleGenerateBatch = async () => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedProfile) return;
        setGenerating(true);
        try {
            const style = promptStyle;
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
                referenceImageUrl: referenceImages[0]?.url || undefined,
                referenceImageUrls: referenceImages.map((item) => item.url),
                negativePrompt: negativePrompt || undefined,
                promptTone: promptTone || undefined,
                promptFocus: promptFocus.length ? promptFocus : undefined,
                promptLength: promptLength || undefined,
                seed: seed === '' ? undefined : Number(seed),
                llmProvider: defaultLlm,
                llmModel: llmModel,
                customPrompt: customPrompt || undefined
            });
            const records = (response.records || []).map((item) => ({
                ...item,
                source: 'airtable' as const,
                model: presets.find(p => p.id === selectedPresetId)?.defaults?.model || '',
                provider: presets.find(p => p.id === selectedPresetId)?.defaults?.provider || defaultImage
            }));
            setResults(records);
            
            // Auto-queue feature
            if (autoQueue && records.length > 0) {
                for (const r of records) {
                    handleQueue(r.id, r.prompt, r.id);
                }
            }
        } catch (error) {
            alert(`Prompt generation failed: ${String(error)}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleQueue = async (recordId: string, promptText?: string, displayId?: string) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedProfile) return;
        setQueueing(displayId || recordId);
        try {
            await backendService.createQueueJob({
                baseId: base.id,
                queueTableName: queueTableName,
                queueTableId: queueTableId,
                promptRecordId: promptText ? '' : recordId,
                influencerId: selectedProfile.id,
                mediaType: 'image',
                provider: selectedPreset?.defaults?.provider || defaultImage,
                model: selectedPreset?.defaults?.model,
                promptText: promptText,
                loras: selectedLoras,
                scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined
            });
            // Don't alert if autoQueue is on to avoid popups
            if (!autoQueue) alert('Queued for production');
        } catch (error) {
            alert(`Queue failed: ${String(error)}`);
        } finally {
            setQueueing(null);
        }
    };

    const handleImageToPrompt = async () => {
        if (!schemaValid) {
            setImagePromptError('Fix setup first (Schema invalid).');
            return;
        }
        if (!referenceImages.length) {
            setImagePromptError('Add at least one reference image first.');
            return;
        }
        setImagePromptError(null);
        setImagePromptLoading(true);
        try {
            const response = await backendService.promptsFromImage({
                baseId: base.id,
                imageUrls: referenceImages.map((item) => item.url),
                count: 5,
                negativePrompt: negativePrompt || undefined,
                promptTone: promptTone || undefined,
                promptFocus: promptFocus.length ? promptFocus : undefined,
                promptLength: promptLength || undefined,
                seed: seed === '' ? undefined : Number(seed),
                llmProvider: defaultLlm,
                llmModel: llmModel,
                customPrompt: customPrompt || undefined
            });
            setPromptIdeas(response.prompts || []);
        } catch (error) {
            setImagePromptError(String(error));
        } finally {
            setImagePromptLoading(false);
        }
    };

    const topInfluencers = useMemo(() => {
        const counts = prompts.reduce<Record<string, number>>((acc, item) => {
            const key = item.influencerName || item.influencerIds[0] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value]) => ({ label, value }));
    }, [prompts]);

    const topPlatforms = useMemo(() => {
        const counts = prompts.reduce<Record<string, number>>((acc, item) => {
            const platformName = (item.platform || 'unknown').toLowerCase();
            acc[platformName] = (acc[platformName] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value]) => ({ label, value }));
    }, [prompts]);

    const nextBestActions = useMemo(() => {
        const actions: { title: string; detail: string; prompt?: string }[] = [];
        if (!profiles.length) {
            actions.push({ title: 'Create your first influencer', detail: 'Use Creator Wizard to add a profile.', prompt: 'Create a new influencer' });
        } else if (!prompts.length) {
            actions.push({ title: 'Generate prompt batch', detail: 'Run a first batch for your selected influencer.', prompt: `Generate 10 prompts for ${selectedProfile?.name || 'my influencer'}` });
        } else {
            actions.push({ title: 'Queue prompts for production', detail: 'Select prompts and send them to Production Queue.' });
        }
        if (!jobs.length) {
            actions.push({ title: 'Preview prompt ideas', detail: 'Generate a short preview before saving.', prompt: `Preview prompts for ${selectedProfile?.name || 'my influencer'}` });
        }
        return actions.slice(0, 3);
    }, [profiles.length, prompts.length, jobs.length, selectedProfile?.name]);
    const hasInsightData = topInfluencers.length > 0 || topPlatforms.length > 0;
    const hasAssistantActivity = assistantMessages.length > 0 || assistantLog.length > 0;

    const parseAssistantCommand = (text: string) => {
        const lower = text.toLowerCase();
        const countMatch = lower.match(/(\d+)/);
        const countValue = countMatch ? Number(countMatch[1]) : 5;
        const forMatch = lower.match(/for\s+([a-z0-9 _-]+)/i);
        const nameValue = forMatch ? forMatch[1].trim() : selectedProfile?.name || '';
        const mode = lower.includes('preview') ? 'preview' : 'generate';
        return { count: countValue, name: nameValue, mode };
    };

    const runAssistant = async (text: string) => {
        if (!schemaValid) {
            setAssistantMessages((prev) => [...prev, { role: 'assistant', text: 'Fix setup first (Schema invalid).' }]);
            return;
        }
        const { count: countValue, name: nameValue, mode } = parseAssistantCommand(text);
        const influencer = profiles.find((item) => item.name.toLowerCase() === nameValue.toLowerCase()) || selectedProfile;
        if (!influencer) {
            setAssistantMessages((prev) => [...prev, { role: 'assistant', text: `I couldn't find influencer "${nameValue}".` }]);
            return;
        }
        const now = new Date();
        if (mode === 'preview') {
            const response = await backendService.previewPromptBatch({
                baseId: base.id,
                promptsTableName: promptsTableName,
                influencerId: influencer.id,
                influencerName: influencer.name,
                influencerAge: Number(influencer.age),
                influencerGender: influencer.gender,
                influencerNiche: influencer.niche,
                influencerStyle: influencer.style,
                style: promptStyle,
                platform,
                count: countValue,
                llmProvider: 'openrouter',
                llmModel: assistantModel
            });
            const preview = response.prompts?.slice(0, 5).join('\n') || 'No prompts returned.';
            setAssistantMessages((prev) => [...prev, { role: 'assistant', text: `Preview prompts:\n${preview}` }]);
            setAssistantLog((prev) => [{ title: 'Preview prompts', detail: `${countValue} prompts for ${influencer.name}`, at: now.toLocaleTimeString() }, ...prev].slice(0, 5));
            return;
        }

        const response = await backendService.generatePromptBatch({
            baseId: base.id,
            promptsTableName: promptsTableName,
            influencerId: influencer.id,
            influencerName: influencer.name,
            influencerAge: Number(influencer.age),
            influencerGender: influencer.gender,
            influencerNiche: influencer.niche,
            influencerStyle: influencer.style,
            style: promptStyle,
            platform,
            count: countValue,
            llmProvider: 'openrouter',
            llmModel: assistantModel
        });
        const countCreated = response.records?.length || countValue;
        setAssistantMessages((prev) => [...prev, { role: 'assistant', text: `Generated ${countCreated} prompts for ${influencer.name}.` }]);
        setAssistantLog((prev) => [{ title: 'Generate prompts', detail: `${countCreated} prompts for ${influencer.name}`, at: now.toLocaleTimeString() }, ...prev].slice(0, 5));
    };

    const handleAssistantSend = async () => {
        const text = assistantInput.trim();
        if (!text) return;
        setAssistantInput('');
        setAssistantMessages((prev) => [...prev, { role: 'user', text }]);
        setAssistantBusy(true);
        try {
            await runAssistant(text);
        } catch (error) {
            setAssistantMessages((prev) => [...prev, { role: 'assistant', text: `Assistant error: ${String(error)}` }]);
        } finally {
            setAssistantBusy(false);
        }
    };

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out', width: '100%' }}>
            {/* Studio Header (Sticky) */}
            <div className="glass-card" style={{ position: 'sticky', top: '10px', zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(var(--bg-elevated-rgb), 0.8)', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }}></div>
                        <div>
                            <div className="card-title" style={{ marginBottom: '2px', letterSpacing: '2px' }}>Studio Grade</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>Content Workshop</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '16px', borderRight: '1px solid var(--card-border)', marginRight: '8px' }}>
                             <span className="tag" style={{ background: 'rgba(var(--primary-rgb), 0.1)', borderColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                                {count} Outputs
                             </span>
                             <span className="tag">{platform.toUpperCase()}</span>
                        </div>
                        <button className="ghost-btn" onClick={handleGeneratePromptIdeas} disabled={promptLoading || !selectedProfile} style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {promptLoading ? (
                                <>
                                    <div className="spinner-small" />
                                    <span>Thinking...</span>
                                </>
                            ) : (
                                <>
                                    <span>Preview Ideas</span>
                                </>
                            )}
                        </button>
                        <button className="gradient-btn" onClick={handleGenerateBatch} disabled={generating || !selectedProfile} style={{ borderRadius: '12px', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {generating ? (
                                <>
                                    <div className="spinner-small" style={{ borderTopColor: '#000' }} />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Launch Batch</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Workspace Operations Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Automation & Controls Header */}
                    <div className="glass-card" style={{ padding: '16px 24px', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>AUTOMATION</div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={autoQueue} onChange={(e) => setAutoQueue(e.target.checked)} />
                                    <span style={{ fontSize: '12px', fontWeight: 700 }}>Auto-send to Production</span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>STATUS</div>
                                <div className="tag active" style={{ margin: 0 }}>MISSION READY</div>
                            </div>
                        </div>
                    </div>

                    {/* Step-by-step collapsed view */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                         {/* 01. & 02. combined */}
                         <div className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div className="card-title" style={{ marginBottom: 0 }}>Influencer & Platform</div>
                                {selectedProfile?.avatar && (
                                    <img src={selectedProfile.avatar[0].url} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--card-border)' }} />
                                )}
                            </div>
                            <select className="dark-select" value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)} style={{ marginBottom: '12px' }}>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {['instagram', 'tiktok', 'onlyfans'].map(p => (
                                    <button key={p} onClick={() => setPlatform(p)} className={platform === p ? 'tag active' : 'tag'} style={{ flex: 1 }}>{p}</button>
                                ))}
                            </div>
                         </div>
                         {/* 03. Production */}
                         <div className="glass-card">
                            <div className="card-title">Production Volume</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button onClick={() => setCount(Math.max(1, count - 1))} className="ghost-btn" style={{ padding: '4px 12px' }}>-</button>
                                <span style={{ fontSize: '18px', fontWeight: 800 }}>{count}</span>
                                <button onClick={() => setCount(count + 1)} className="ghost-btn" style={{ padding: '4px 12px' }}>+</button>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Outputs</span>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Mini Queue Monitor (Real-time side panel) */}
                <div className="glass-card" style={{ height: '100%', borderTop: '4px solid #F59E0B' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="card-title">Production Monitor</div>
                        <div style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: '4px' }}>LIVE</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {jobs.slice(0, 5).map((job) => (
                            <div key={job.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                <div style={{ 
                                    width: '6px', 
                                    height: '6px', 
                                    borderRadius: '50%', 
                                    background: job.status === 'completed' ? '#10B981' : job.status === 'failed' ? '#EF4444' : '#F59E0B' 
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{job.presetName || 'Task'}</div>
                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{job.status?.toUpperCase()}</div>
                                </div>
                                {job.resultUrl && <div style={{ fontSize: '12px' }}>🖼️</div>}
                            </div>
                        ))}
                        {jobs.length === 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                No active production tasks
                            </div>
                        )}
                        <button className="ghost-btn" style={{ width: '100%', fontSize: '10px', marginTop: '10px' }} onClick={() => setActiveTab('production')}>
                            View Full Queue →
                        </button>
                    </div>
                </div>
            </div>

            {/* Artistic Direction Block (always expanded) */}
            <div className="glass-card" style={{ borderTop: '4px solid var(--primary-alt)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div className="card-title">04. Artistic Direction</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Contextual engine for brand consistency</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '24px' }}>
                    {/* Prompt Input Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                className="dark-textarea"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Enter your scene description or core artistic direction..."
                                style={{ minHeight: '180px', fontSize: '15px', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px' }}
                            />
                            <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                                 <button className="tag" style={{ cursor: 'pointer', background: 'var(--card-bg)' }} onClick={handleGeneratePromptIdeas}>✨ Enhance AI</button>
                                 <button className="tag" style={{ cursor: 'pointer', background: 'var(--card-bg)' }} onClick={handleImageToPrompt}>🖼️ From Ref</button>
                            </div>
                        </div>
                    </div>

                    {/* Quality & Schedule Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px' }}>
                            <div className="card-title" style={{ fontSize: '10px' }}>⚡ Performance</div>
                            <select className="dark-select" value={llmModel} onChange={(e) => setLlmModel(e.target.value)} style={{ fontSize: '12px' }}>
                                {ASSISTANT_MODELS.map(m => <option key={m.model} value={m.model}>{m.label}</option>)}
                            </select>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px' }}>
                            <div className="card-title" style={{ fontSize: '10px' }}>📅 Content Schedule</div>
                            <input type="datetime-local" className="dark-input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={{ fontSize: '11px', padding: '6px 10px', minHeight: '34px' }} />
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px' }}>Leave empty for immediate production</div>
                        </div>
                    </div>
                </div>

                {promptLoading && (
                    <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '32px', border: '1px dashed var(--card-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div className="spinner" style={{ width: '32px', height: '32px' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>AI is brainstorming directions...</div>
                    </div>
                )}

                {/* Results Prompt Preview */}
                {promptIdeas.length > 0 && !promptLoading && (
                    <div style={{ marginTop: '12px', background: 'rgba(var(--primary-rgb), 0.03)', borderRadius: '16px', padding: '16px', border: '1px solid var(--primary-glow)' }}>
                        <div className="card-title" style={{ fontSize: '10px', color: 'var(--primary)' }}>Suggested Directions</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {promptIdeas.map((idea, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer' }} onClick={() => setCustomPrompt(idea)}>
                                <span style={{ fontSize: '11px', color: 'var(--text-soft)', flex: 1 }}>{idea}</span>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>USE →</span>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderTop: '4px solid var(--blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📊</span> PRODUCTION ANALYTICS
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>REAL-TIME DATA</div>
                </div>
                
                <div style={{ padding: '24px' }}>
                    <div style={{ transform: 'scale(0.98)', transformOrigin: 'top center', width: '102%', marginLeft: '-1%' }}>
                        <DashboardTab />
                    </div>
                </div>
            </div>



            {results.length > 0 && (
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div className="card-title" style={{ marginBottom: 0 }}>Generated Prompts</div>
                        <span className="tag active">{results.length} ready</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {results.map((r) => (
                            <div key={r.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                    <ModelLogo size="16px" modelId={r.model} provider={r.provider} />
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {r.prompt}
                                    </div>
                                </div>
                                <button
                                    className="gradient-btn"
                                    style={{ padding: '6px 10px', fontSize: '10px' }}
                                    onClick={() => handleQueue(r.source === 'idea' ? '' : r.id, r.prompt, r.id)}
                                    disabled={queueing === r.id}
                                >
                                    {queueing === r.id ? 'Queueing...' : 'Send to Production'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
