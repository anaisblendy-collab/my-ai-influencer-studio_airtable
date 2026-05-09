
/**
 * Studio Playground - Direct batch generation
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import type { AIModel } from '../types/domain';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { mapRegistryToAIModel, useModelRegistry } from '../services/modelRegistry';
import { getSchemaIssues } from '../utils/schemaGuard';
import { ModelLogo } from './ModelLogo';

interface PreviewItem {
    id: string;
    mediaUrl: string;
    prompt: string;
    provider: string;
    model: string;
    mediaType: 'image' | 'video';
}

interface ContentItem {
    id: string;
    name: string;
    status: string;
    prompt: string;
    mediaUrl?: string;
    cost?: string;
    duration?: string;
}

export function PlaygroundTab({ selectedModel, setSelectedModel, onEditImage }: { 
    selectedModel: AIModel | undefined, 
    setSelectedModel: (m: AIModel) => void,
    onEditImage?: (url: string) => void
}) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
    const schemaIssues = getSchemaIssues(base, globalConfig);
    const schemaValid = schemaIssues.length === 0;
    const airtable = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);

    const [influencers, setInfluencers] = useState<InfluencerProfileRecord[]>([]);
    const [selectedInfluencerId, setSelectedInfluencerId] = useState<string>('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [promptTone, setPromptTone] = useState('lifestyle');
    const [promptLength, setPromptLength] = useState('medium');
    const [promptFocus, setPromptFocus] = useState<string[]>([]);
    const [seed, setSeed] = useState<number | ''>('');
    const [provider, setProvider] = useState('huggingface');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [batchCount, setBatchCount] = useState(4);
    const [showAdvanced] = useState(true);
    const [scheduleAt, setScheduleAt] = useState('');
    const [results, setResults] = useState<PreviewItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [historyItems, setHistoryItems] = useState<ContentItem[]>([]);
    const [generating, setGenerating] = useState(false);
    const [promptIdeas, setPromptIdeas] = useState<string[]>([]);
    const [promptLoading, setPromptLoading] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);
    const [promptStyle, setPromptStyle] = useState('instagram');
    const [useAllPromptIdeas, setUseAllPromptIdeas] = useState(false);
    const [saving, setSaving] = useState(false);
    const [queueing, setQueueing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [autoUpscale, setAutoUpscale] = useState(false);
    const [autoPostThreads, setAutoPostThreads] = useState(false);
    const [referenceImageUrl, setReferenceImageUrl] = useState('');
    const [referenceUploadName, setReferenceUploadName] = useState('');
    const [referenceUploading, setReferenceUploading] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoUploadName, setVideoUploadName] = useState('');
    const [videoUploading, setVideoUploading] = useState(false);
    const [modelSchema, setModelSchema] = useState<any>(null);
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [extraParams, setExtraParams] = useState<Record<string, any>>({});
    const [fieldUploads, setFieldUploads] = useState<Record<string, { uploading: boolean; filename?: string; url?: string }>>({});
    const [availableAssets, setAvailableAssets] = useState<{ id: string, name: string, trigger?: string, active: boolean, strength: number }[]>([]);

    const { models: imageRegistry, loading: imageLoading } = useModelRegistry({
        orgId: base.id,
        capability: 'image',
        billingMode: 'platform',
        providerConnectedOnly: false
    });
    const { models: videoRegistry, loading: videoLoading } = useModelRegistry({
        orgId: base.id,
        capability: 'video',
        billingMode: 'platform',
        providerConnectedOnly: false
    });
    const { models: editRegistry, loading: editLoading } = useModelRegistry({
        orgId: base.id,
        capability: 'edit',
        billingMode: 'platform',
        providerConnectedOnly: false
    });

    useEffect(() => {
        if (!imageLoading && !editLoading) {
            console.log('[PlaygroundTab] Image Registry:', imageRegistry.length);
            console.log('[PlaygroundTab] Edit Registry:', editRegistry.length);
            const nanoMatches = editRegistry.filter(m => m.provider === 'nanobanana');
            console.log('[PlaygroundTab] Nano Banana Matches in Edit:', nanoMatches.length, nanoMatches);
        }
    }, [imageLoading, editLoading, imageRegistry, editRegistry]);

    const imageModels = useMemo(() => {
        const baseImg = imageRegistry.map(mapRegistryToAIModel);
        const editImg = editRegistry
            .filter(m => (m.provider === 'nanobanana' || m.provider === 'gemini'))
            .map(mapRegistryToAIModel);
        
        console.log('[PlaygroundTab] Total image models:', baseImg.length + editImg.length);
        return [...baseImg, ...editImg];
    }, [imageRegistry, editRegistry]);

    const videoModels = useMemo(() => videoRegistry.map(mapRegistryToAIModel), [videoRegistry]);
    const allModels = useMemo(() => [...imageModels, ...videoModels], [imageModels, videoModels]);

    useEffect(() => {
        const loadInfluencers = async () => {
            const data = await airtable.getInfluencerProfiles();
            setInfluencers(data);
            if (data.length && !selectedInfluencerId) {
                setSelectedInfluencerId(data[0].id);
            }
        };
        loadInfluencers();
    }, []);

    const normalizeProviderKey = (value: string) => {
        const v = (value || '').toLowerCase();
        if (v === 'luma') return 'replicate';
        if (v === 'wan' || v === 'flux' || v === 'fal') return 'fal';
        if (v === 'ltx') return 'ltx';
        return v || 'huggingface';
    };

    const providerKey = normalizeProviderKey(provider);
    const providerMatches = (modelProvider?: string) => {
        const p = (modelProvider || '').toLowerCase();
        if (!p) return false;
        if (providerKey === 'huggingface') {
            return p === 'huggingface' || p === 'bytedance';
        }
        return p === providerKey;
    };

    const availableModels = useMemo(() => {
        const list = mediaType === 'video' ? videoModels : imageModels;
        const filtered = list.filter((m) => providerMatches(m.provider));
        return filtered.length ? filtered : list;
    }, [mediaType, imageModels, videoModels, providerKey]);

    useEffect(() => {
        const defaultImage = (globalConfig.get('defaultImage') as string) || 'replicate';
        const defaultVideo = (globalConfig.get('defaultVideo') as string) || 'luma';
        setProvider(mediaType === 'video' ? defaultVideo : defaultImage);
    }, [globalConfig, mediaType]);

    useEffect(() => {
        if (availableModels.length && (!selectedModel || !availableModels.some((m) => m.id === selectedModel.id))) {
            setSelectedModel(availableModels[0]);
        }
    }, [availableModels, selectedModel, setSelectedModel]);

    useEffect(() => {
        let isMounted = true;
        const loadSchema = async () => {
            if (!selectedModel) {
                setModelSchema(null);
                setExtraParams({});
                return;
            }
            setSchemaLoading(true);
            setSchemaError(null);
            try {
                const schema = await backendService.getModelSchema(selectedModel.apiId || selectedModel.id);
                if (!isMounted) return;
                if (schema) {
                    setModelSchema(schema);
                } else if (selectedModel.provider === 'nanobanana') {
                    setModelSchema({
                        properties: {
                            negative_prompt: { type: 'string', title: 'Negative Prompt' },
                            seed: { type: 'integer', title: 'Seed' },
                            num_inference_steps: { type: 'integer', title: 'Steps', default: 50 },
                            guidance_scale: { type: 'number', title: 'Guidance', default: 7.5 }
                        }
                    });
                } else {
                    setModelSchema(null);
                }
                setExtraParams({});
            } catch (err) {
                if (isMounted) setSchemaError(String(err));
                if (isMounted) setModelSchema(null);
            } finally {
                if (isMounted) setSchemaLoading(false);
            }
        };
        loadSchema();
        return () => { isMounted = false; };
    }, [selectedModel]);

    const loadHistory = async () => {
        const items = await airtable.getContentRecords(10);
        setHistoryItems(items.map(item => ({
            id: item.id,
            name: item.name || 'Untitled',
            status: item.status || 'Pending',
            prompt: item.prompt || '',
            mediaUrl: item.storageUrl || item.mediaUrl,
            cost: item.cost,
            duration: item.duration
        })) as any);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    
    const mapProviderForModel = (modelId: string, fallback: string) => {
        const id = (modelId || '').toLowerCase();
        if (id.includes('flux') || id.includes('wan')) return 'replicate';
        return fallback || 'huggingface';
    };

const selectedInfluencer = influencers.find((item) => item.id === selectedInfluencerId);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(results.map((item) => item.id)));
    };

    const clearSelection = () => setSelectedIds(new Set());

    const generateBatch = async () => {
        setError(null);
        setSuccess(null);
        if (!schemaValid) {
            setError('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedInfluencer) {
            setError('Select an influencer first.');
            return;
        }
        if (!selectedModel) {
            setError('Select a model first.');
            return;
        }
        setGenerating(true);
        try {
            try {
                const amount = useAllPromptIdeas && promptIdeas.length > 0 ? promptIdeas.length : batchCount;
                await backendService.consumeCredit(base.id, amount);
            } catch (e: any) {
                setGenerating(false);
                setError('Insufficient Runs. Please Upgrade to Premium or purchase more runs.');
                return;
            }
            const isReframePreset = (selectedModel.apiId || selectedModel.id).includes('reframe-video');
            
            // Simultaneous Upload Logic
            let finalReferenceImageUrl = referenceImageUrl;
            if (typeof referenceImageUrl === 'object' && (referenceImageUrl as any).file) {
                finalReferenceImageUrl = await backendService.uploadReferenceImage((referenceImageUrl as any).file, base.id);
            }

            let finalVideoUrl = videoUrl;
            if (typeof videoUrl === 'object' && (videoUrl as any).file) {
                finalVideoUrl = await backendService.uploadReferenceVideo((videoUrl as any).file, base.id);
            }

            const finalExtraParams = { ...extraParams };
            for (const key in finalExtraParams) {
                const value = finalExtraParams[key];
                if (Array.isArray(value) && value.length > 0 && value[0].file) {
                    const uploadedUrls = await Promise.all(
                        value.map((img: any) => backendService.uploadReferenceImage(img.file, base.id))
                    );
                    finalExtraParams[key] = uploadedUrls;
                } else if (value && typeof value === 'object' && value.file) {
                    if (key.includes('video')) {
                        finalExtraParams[key] = await backendService.uploadReferenceVideo(value.file, base.id);
                    } else if (key.includes('audio')) {
                        finalExtraParams[key] = await backendService.uploadReferenceAudio(value.file, base.id);
                    } else {
                        finalExtraParams[key] = await backendService.uploadReferenceImage(value.file, base.id);
                    }
                }
            }

            const basePayload = {
                influencer: {
                    name: selectedInfluencer.name,
                    age: Number(selectedInfluencer.age || 25),
                    gender: String(selectedInfluencer.gender || 'female').toLowerCase(),
                    niche: selectedInfluencer.niche || 'fashion',
                    style: selectedInfluencer.style || 'glamour'
                },
                orgId: base.id,
                provider,
                model: selectedModel.apiId || selectedModel.id,
                mediaType,
                billingMode: (globalConfig.get('connectionsBillingMode') as any) || 'platform',

                referenceImageUrl: finalReferenceImageUrl || undefined,
                videoUrl: mediaType === 'video' && isReframePreset ? (finalVideoUrl || undefined) : undefined,
                extraParams: {
                    ...(finalExtraParams || {}),
                    loras: availableAssets
                        .filter(a => a.active)
                        .map(a => ({ name: a.name, trigger: a.trigger, strength: a.strength })),
                    negative_prompt: negativePrompt || undefined,
                    seed: seed === '' ? undefined : Number(seed),
                    ...(promptFocus?.length ? { prompt_focus: promptFocus } : {}),
                    prompt_tone: promptTone || undefined,
                    prompt_length: promptLength || undefined,
                    auto_upscale: autoUpscale,
                    auto_post_threads: autoPostThreads
                }
            };

            if (useAllPromptIdeas && promptIdeas.length > 0) {
                const allResults: PreviewItem[] = [];
                for (const idea of promptIdeas) {
                    const response = await backendService.previewGenerateBatch({
                        ...basePayload,
                        customPrompt: idea,
                        count: 1
                    });
                    response.results.forEach((item, index) => {
                        allResults.push({
                            id: `${Date.now()}_${index}_${Math.random()}`,
                            mediaUrl: item.media_url,
                            prompt: item.prompt,
                            provider: mapProviderForModel(item.model, item.provider),
                            model: item.model,
                            mediaType: item.media_type as 'image' | 'video'
                        });
                    });
                }
                setResults(allResults);
                setUseAllPromptIdeas(false);
            } else {
                const response = await backendService.previewGenerateBatch({
                    ...basePayload,
                    customPrompt: customPrompt || undefined,
                    count: batchCount
                });

                const items = response.results.map((item, index) => ({
                    id: `${Date.now()}_${index}`,
                    mediaUrl: item.media_url,
                    prompt: item.prompt,
                    provider: mapProviderForModel(item.model, item.provider),
                    model: item.model,
                    mediaType: item.media_type as 'image' | 'video'
                }));
                setResults(items);
            }
            clearSelection();
        } catch (err) {
            setError(String(err));
        } finally {
            setGenerating(false);
        }
    };

    const handleReferenceUpload = async (file: File) => {
        const url = URL.createObjectURL(file);
        setReferenceImageUrl({ url, file } as any);
        setReferenceUploadName(file.name);
    };

    const handleVideoUpload = async (file: File) => {
        const url = URL.createObjectURL(file);
        setVideoUrl({ url, file } as any);
        setVideoUploadName(file.name);
    };

    const extractInputSchema = (schema: any) => {
        if (!schema) return null;
        if (schema.components?.schemas?.Input) return schema.components.schemas.Input;
        if (schema.components?.schemas?.InputSchema) return schema.components.schemas.InputSchema;
        if (schema.input_schema) return schema.input_schema;
        if (schema.schema?.properties) return schema.schema;
        if (schema.properties) return schema;
        return null;
    };

    const inputSchema = useMemo(() => extractInputSchema(modelSchema), [modelSchema]);
    const inputProperties = inputSchema?.properties || {};
    const inputRequired = new Set<string>(inputSchema?.required || []);

    const setExtraParam = (key: string, value: any) => {
        setExtraParams((prev) => ({ ...prev, [key]: value }));
    };

    const handleDynamicUpload = async (fieldName: string, file: File, kind: 'image' | 'video' | 'audio') => {
        const url = URL.createObjectURL(file);
        setExtraParam(fieldName, { url, file });
        setFieldUploads((prev) => ({ ...prev, [fieldName]: { uploading: false, filename: file.name, url } }));
    };

    const renderDynamicField = (fieldName: string, fieldSchema: any) => {
        if (fieldName === 'prompt' || fieldName === 'negative_prompt' || fieldName === 'seed') return null;
        const title = fieldSchema?.title || fieldName;
        const type = fieldSchema?.type || 'string';
        const format = fieldSchema?.format;
        const isRequired = inputRequired.has(fieldName);
        const enumValues = fieldSchema?.enum || fieldSchema?.oneOf?.map((item: any) => item.const).filter(Boolean);
        const uploadState = fieldUploads[fieldName];
        const mediaKind = fieldName.includes('audio')
            ? 'audio'
            : fieldName.includes('video') ? 'video' : (fieldName.includes('image') || fieldName.includes('mask')) ? 'image' : null;

        if (type === 'image_upload_multiple') {
            const currentImages = extraParams[fieldName] || [];
            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                        {currentImages.map((img: any, i: number) => (
                            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button 
                                    onClick={() => {
                                        const next = currentImages.filter((_: any, idx: number) => idx !== i);
                                        setExtraParam(fieldName, next);
                                    }}
                                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', color: '#fff', fontSize: '8px', cursor: 'pointer' }}
                                >✕</button>
                            </div>
                        ))}
                    </div>
                    <label className="ghost-btn" style={{ width: '100%', textAlign: 'center', cursor: 'pointer' }}>
                        + Add Reference Image (Up to 14)
                        <input 
                            type="file" multiple accept="image/*" style={{ display: 'none' }}
                            onChange={(e) => {
                                if (!e.target.files) return;
                                const files = Array.from(e.target.files);
                                const newFiles = files.map(file => ({ url: URL.createObjectURL(file), file }));
                                setExtraParam(fieldName, [...currentImages, ...newFiles].slice(0, 14));
                            }}
                        />
                    </label>
                </div>
            )
        }

        if (mediaKind) {
            const accept = mediaKind === 'video' ? 'video/*' : mediaKind === 'audio' ? 'audio/*' : 'image/*';
            const currentVal = extraParams[fieldName];
            const displayUrl = typeof currentVal === 'object' ? currentVal.url : currentVal;

            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <div
                        style={{
                            border: '1px dashed var(--card-border)',
                            borderRadius: '12px',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.02)'
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleDynamicUpload(fieldName, file, mediaKind);
                        }}
                    >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <input
                                className="dark-input"
                                type="text"
                                placeholder="https://... (optional)"
                                value={typeof extraParams[fieldName] === 'string' ? extraParams[fieldName] : ''}
                                onChange={(e) => setExtraParam(fieldName, e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                Upload
                                <input
                                    type="file"
                                    accept={accept}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleDynamicUpload(fieldName, file, mediaKind);
                                    }}
                                />
                            </label>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Drag & drop or click Upload.
                        </div>
                        {displayUrl && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {mediaKind === 'image' && (
                                    <img
                                        src={displayUrl}
                                        alt={fieldName}
                                        style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                                    />
                                )}
                                {mediaKind === 'video' && (
                                    <video
                                        src={displayUrl}
                                        style={{ width: '96px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                                        muted
                                        playsInline
                                    />
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {typeof currentVal === 'object' ? (currentVal.file?.name || 'Local file') : 'Remote URL'}
                                </div>
                                <button
                                    className="ghost-btn"
                                    onClick={() => {
                                        setExtraParam(fieldName, '');
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (enumValues && enumValues.length) {
            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <select
                        className="dark-select"
                        value={extraParams[fieldName] ?? fieldSchema?.default ?? ''}
                        onChange={(e) => setExtraParam(fieldName, e.target.value)}
                    >
                        <option value="">Select</option>
                        {enumValues.map((value: any) => (
                            <option key={`${fieldName}-${value}`} value={value}>{String(value)}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (type === 'boolean') {
            return (
                <div key={fieldName} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={Boolean(extraParams[fieldName] ?? fieldSchema?.default)}
                        onChange={(e) => setExtraParam(fieldName, e.target.checked)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <input type="checkbox" checked={autoUpscale} onChange={e => setAutoUpscale(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: autoUpscale ? '#10B981' : 'var(--text-main)', textTransform: 'uppercase' }}>Ultra Quality (4K)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <input type="checkbox" checked={autoPostThreads} onChange={e => setAutoPostThreads(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: autoPostThreads ? '#10B981' : 'var(--text-main)', textTransform: 'uppercase' }}>🚀 Auto-Post Threads</span>
                        </label>
                    </div>

                    <label className="form-label" style={{ margin: 0 }}>{title}</label>
                </div>
            );
        }

        if (type === 'number' || type === 'integer') {
            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <input
                        className="dark-input"
                        type="number"
                        value={extraParams[fieldName] ?? fieldSchema?.default ?? ''}
                        onChange={(e) => setExtraParam(fieldName, type === 'integer' ? Number.parseInt(e.target.value, 10) : Number(e.target.value))}
                    />
                </div>
            );
        }

        if (type === 'array' || type === 'object') {
            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <textarea
                        className="dark-textarea"
                        value={extraParams[fieldName] ? JSON.stringify(extraParams[fieldName]) : ''}
                        onChange={(e) => {
                            try {
                                setExtraParam(fieldName, JSON.parse(e.target.value));
                            } catch {
                                setExtraParam(fieldName, e.target.value);
                            }
                        }}
                        placeholder="JSON value"
                        style={{ minHeight: '80px' }}
                    />
                </div>
            );
        }

        if (format === 'uri') {
            return (
                <div key={fieldName} className="form-group">
                    <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                    <input
                        className="dark-input"
                        type="text"
                        value={extraParams[fieldName] ?? fieldSchema?.default ?? ''}
                        onChange={(e) => setExtraParam(fieldName, e.target.value)}
                    />
                </div>
            );
        }

        return (
            <div key={fieldName} className="form-group">
                <label className="form-label">{title}{isRequired ? ' *' : ''}</label>
                <input
                    className="dark-input"
                    type="text"
                    value={extraParams[fieldName] ?? fieldSchema?.default ?? ''}
                    onChange={(e) => setExtraParam(fieldName, e.target.value)}
                />
            </div>
        );
    };

    const generatePromptIdeas = async () => {
        setPromptError(null);
        if (!selectedInfluencer) {
            setPromptError('Select an influencer first.');
            return;
        }
        setPromptLoading(true);
        try {
            const defaultLlm = (globalConfig.get('defaultLlm') as string) || 'openrouter';
            const response = await backendService.previewPromptBatch({
                baseId: base.id,
                promptsTableName: 'Prompts',
                influencerId: selectedInfluencer.id,
                influencerName: selectedInfluencer.name,
                influencerAge: Number(selectedInfluencer.age || 25),
                influencerGender: String(selectedInfluencer.gender || 'female'),
                influencerNiche: selectedInfluencer.niche || 'fashion',
                influencerStyle: selectedInfluencer.style || 'glamour',
                style: promptStyle,
                platform: 'instagram',
                count: 5,
                llmProvider: defaultLlm,
                negativePrompt: negativePrompt || undefined,
                promptTone: promptTone || undefined,
                promptFocus: promptFocus.length ? promptFocus : undefined,
                promptLength: promptLength || undefined,
                seed: seed === '' ? undefined : Number(seed),
                customPrompt: customPrompt || undefined
            });
            setPromptIdeas(response.prompts || []);
        } catch (err) {
            setPromptError(String(err));
        } finally {
            setPromptLoading(false);
        }
    };

    const useAllIdeasInBatch = async () => {
        if (!promptIdeas.length) return;
        setUseAllPromptIdeas(true);
        await generateBatch();
    };

    const approveSelected = async () => {
        setError(null);
        setSuccess(null);
        if (!selectedInfluencer) {
            setError('Select an influencer first.');
            return;
        }
        if (!selectedIds.size) {
            setError('Select at least one output.');
            return;
        }
        setSaving(true);
        try {
            let saved = 0;
            for (const item of results) {
                if (!selectedIds.has(item.id)) continue;
                const recordId = await airtable.saveContentRecord({
                    influencerId: selectedInfluencer.id,
                    name: selectedInfluencer.name,
                    age: Number(selectedInfluencer.age || 25),
                    niche: selectedInfluencer.niche,
                    style: selectedInfluencer.style,
                    status: 'Approved',
                    prompt: item.prompt,
                    model: item.model,
                    provider: mapProviderForModel(item.model, item.provider),
                    type: item.mediaType,
                    mediaUrl: item.mediaUrl
                });
                if (recordId) saved += 1;
            }
            setSuccess(`Saved ${saved} outputs to Contenu.`);
            clearSelection();
            await loadHistory();
        } catch (err) {
            setError(String(err));
        } finally {
            setSaving(false);
        }
    };

    const sendToQueue = async () => {
        setError(null);
        setSuccess(null);
        if (!schemaValid) {
            setError('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedInfluencer) {
            setError('Select an influencer first.');
            return;
        }
        if (!selectedIds.size) {
            setError('Select at least one output.');
            return;
        }
        setQueueing(true);
        try {
            let queued = 0;
            for (const item of results) {
                if (!selectedIds.has(item.id)) continue;
                await backendService.createQueueJob({
                    baseId: base.id,
                    queueTableName: queueTableName,
                    queueTableId: queueTableId,
                    promptRecordId: '',
                    promptText: item.prompt,
                    influencerId: selectedInfluencer.id,
                    mediaType: item.mediaType,
                    provider: mapProviderForModel(item.model, item.provider),
                    model: item.model,
                    scheduledAt: scheduleAt || undefined
                });
                queued += 1;
            }
            setSuccess(`Queued ${queued} outputs.`);
            clearSelection();
        } catch (err) {
            setError(String(err));
        } finally {
            setQueueing(false);
        }
    };

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {!schemaValid && (
                <div className="glass-card" style={{ color: '#F87171', fontSize: '12px' }}>
                    Fix setup in Setup tab to unlock actions.
                </div>
            )}
            <div
                className="glass-card"
                style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    borderRadius: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Influencer</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {selectedInfluencer?.avatar && selectedInfluencer.avatar.length > 0 ? (
                            <img src={selectedInfluencer.avatar[0].url} alt="Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '14px' }}>🧑‍🎤</span>
                        )}
                        <select
                            className="dark-select"
                            value={selectedInfluencerId}
                            onChange={(e) => setSelectedInfluencerId(e.target.value)}
                            style={{ padding: '0', minWidth: '120px', border: 'none', background: 'transparent', fontWeight: 700 }}
                        >
                            {influencers.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Provider</span>
                    <select
                        className="dark-select"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        style={{ padding: '6px 10px', minWidth: '140px' }}
                    >
                        <option value="replicate">Replicate</option>
                        <option value="nanobanana">Nano Banana</option>
                        <option value="fal">Fal</option>
                        <option value="huggingface">Hugging Face</option>
                        <option value="civitai">Civitai</option>
                        <option value="kling">Kling</option>
                        <option value="runway">Runway</option>
                        <option value="luma">Luma</option>
                        <option value="veo">Veo</option>
                        <option value="wan">Wan</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Model</span>
                    <select
                        className="dark-select"
                        value={selectedModel?.id || ''}
                        onChange={(e) => {
                            const next = availableModels.find((m) => m.id === e.target.value);
                            if (next) setSelectedModel(next);
                        }}
                        disabled={!availableModels.length}
                        style={{ padding: '6px 10px', minWidth: '200px' }}
                    >
                        {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div className="stat-item" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div className="stat-label" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Model</div>
                        {selectedModel && <ModelLogo modelId={selectedModel.id} provider={selectedModel.provider} size="32px" />}
                    </div>
                    <div className="stat-value" style={{ color: 'var(--accent-neon)', fontSize: '24px', fontWeight: 800 }}>
                        {selectedModel ? selectedModel.name : 'No model'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Provider: {providerKey || '—'}
                    </div>
                </div>
                <div className="stat-item" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)' }}>
                    <div className="stat-label" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Batch Size</div>
                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800 }}>{batchCount}</div>
                </div>
                <div className="stat-item" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)' }}>
                    <div className="stat-label" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Selected Outputs</div>
                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800 }}>{selectedIds.size}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '24px' }}>
                <div className="space-y-4">
                    <div className="glass-card" style={{ padding: '16px' }}>
                    <div className="card-title">Studio Inputs</div>
                        <div className="form-group">
                            <label className="form-label">Mode</label>
                            <select className="dark-select" value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}>
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="form-label">Custom Prompt</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="ghost-btn" onClick={generatePromptIdeas} disabled={promptLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {promptLoading ? (
                                            <>
                                                <div className="spinner-small" />
                                                <span>Thinking...</span>
                                            </>
                                        ) : (
                                            <span>Generate Prompt</span>
                                        )}
                                    </button>
                                    <button className="ghost-btn" onClick={generatePromptIdeas} disabled={promptLoading}>
                                        Regenerate
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
                                        <button className="ghost-btn" type="button" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>
                                            Randomize
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
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
                            <textarea
                                className="dark-textarea"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Extra direction or scene details"
                                style={{ minHeight: '120px' }}
                            />
                            {mediaType === 'image' && (
                                <div style={{ marginTop: '10px' }}>
                                    <label className="form-label">Reference Image URL (Image-to-Image)</label>
                                    <div
                                        style={{
                                            border: '1px dashed var(--card-border)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleReferenceUpload(file);
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                            <input
                                                className="dark-input"
                                                type="text"
                                                placeholder="https://... (optional)"
                                                value={referenceImageUrl}
                                                onChange={(e) => setReferenceImageUrl(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                                Upload
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleReferenceUpload(file);
                                                    }}
                                                />
                                            </label>
                                            <button 
                                                className="ghost-btn" 
                                                type="button"
                                                onClick={() => {
                                                    const picker = document.getElementById('base-ref-picker');
                                                    if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
                                                }}
                                            >
                                                📂 Library
                                            </button>
                                        </div>

                                        {/* Visual Asset Picker for Reference Image */}
                                        <div id="base-ref-picker" className="custom-scrollbar" style={{ display: 'none', marginTop: '12px', maxHeight: '160px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                                {historyItems.map((item: any) => (
                                                    <div 
                                                        key={item.id} 
                                                        onClick={() => {
                                                            setReferenceImageUrl(item.mediaUrl);
                                                            setReferenceUploadName(item.name);
                                                            const picker = document.getElementById('base-ref-picker');
                                                            if (picker) picker.style.display = 'none';
                                                        }}
                                                        style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: referenceImageUrl === item.mediaUrl ? '2px solid var(--text-accent)' : '1px solid rgba(255,255,255,0.1)' }}
                                                    >
                                                        <img src={item.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            Upload or pick from your library.
                                        </div>
                                        {referenceUploading && (
                                            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                Uploading...
                                            </div>
                                        )}
                                        {referenceImageUrl && (
                                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <img
                                                    src={typeof referenceImageUrl === 'string' ? referenceImageUrl : (referenceImageUrl as any).url}
                                                    alt={referenceUploadName || 'Reference'}
                                                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                                                />
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>
                                                    {referenceUploadName || 'Reference image ready'}
                                                </div>
                                                <button className="ghost-btn" onClick={() => { setReferenceImageUrl(''); setReferenceUploadName(''); }} style={{ padding: '2px 8px', fontSize: '10px' }}>Remove</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {mediaType === 'video' && (
                                <div style={{ marginTop: '10px' }}>
                                    <label className="form-label">Video URL (for Reframe)</label>
                                    <div
                                        style={{
                                            border: '1px dashed var(--card-border)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleVideoUpload(file);
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                            <input
                                                className="dark-input"
                                                type="text"
                                                placeholder="https://... (required for reframe)"
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                                Upload
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleVideoUpload(file);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            Drag & drop a video or click Upload.
                                        </div>
                                        {videoUploading && (
                                            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                Uploading...
                                            </div>
                                        )}
                                        {videoUrl && (
                                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <video
                                                    src={typeof videoUrl === 'string' ? videoUrl : (videoUrl as any).url}
                                                    style={{ width: '96px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                                                    muted
                                                    playsInline
                                                />
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {videoUploadName || 'Reference video ready'}
                                                </div>
                                                <button
                                                    className="ghost-btn"
                                                    onClick={() => {
                                                        setVideoUrl('');
                                                        setVideoUploadName('');
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {(selectedModel?.id || selectedModel?.apiId || '').includes('reframe-video') && !videoUrl && (
                                        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                            This preset requires a source video URL.
                                        </div>
                                    )}
                                </div>
                            )}
                            {mediaType === 'video' && (
                                <div style={{ marginTop: '10px' }}>
                                    <label className="form-label">Reference Image (Image-to-Video)</label>
                                    <div
                                        style={{
                                            border: '1px dashed var(--card-border)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleReferenceUpload(file);
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                            <input
                                                className="dark-input"
                                                type="text"
                                                placeholder="https://... (optional)"
                                                value={referenceImageUrl}
                                                onChange={(e) => setReferenceImageUrl(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                                Upload
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleReferenceUpload(file);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            Drag & drop an image or click Upload.
                                        </div>
                                        {referenceUploading && (
                                            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                Uploading...
                                            </div>
                                        )}
                                        {referenceImageUrl && (
                                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <img
                                                    src={typeof referenceImageUrl === 'string' ? referenceImageUrl : (referenceImageUrl as any).url}
                                                    alt={referenceUploadName || 'Reference'}
                                                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                                                />
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {referenceUploadName || 'Reference image ready'}
                                                </div>
                                                <button
                                                    className="ghost-btn"
                                                    onClick={() => {
                                                        setReferenceImageUrl('');
                                                        setReferenceUploadName('');
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: '10px' }}>
                                <label className="form-label">Prompt Style</label>
                                <select className="dark-select" value={promptStyle} onChange={(e) => setPromptStyle(e.target.value)}>
                                    <option value="instagram">IG Lifestyle</option>
                                    <option value="glamour">Glam</option>
                                    <option value="fitness">Fitness</option>
                                    <option value="onlyfans">OF</option>
                                </select>
                            </div>
                            {promptError && (
                                <div style={{ marginTop: '8px', color: '#F87171', fontSize: '11px' }}>{promptError}</div>
                            )}
                            {promptIdeas.length > 0 && (
                                <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Preview prompts (not saved)</div>
                                    {promptIdeas.map((idea, index) => (
                                        <button
                                            key={`${index}-${idea.slice(0, 12)}`}
                                            className="ghost-btn"
                                            style={{ textAlign: 'left' }}
                                            onClick={() => setCustomPrompt(idea)}
                                        >
                                            {idea}
                                        </button>
                                    ))}
                                    <button className="ghost-btn" onClick={useAllIdeasInBatch}>
                                        Use all in batch
                                    </button>
                                </div>
                            )}
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Model Inputs (Auto)
                                </div>
                                {!schemaLoading && inputSchema && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        Mode detected: {(() => {
                                            const hasVideoRequired = inputRequired.has('video_url');
                                            const hasImageRequired = inputRequired.has('image') || inputRequired.has('image_url');
                                            const hasImageField = Object.keys(inputProperties).some((key) => key.includes('image'));
                                            if (mediaType === 'video') {
                                                if (hasVideoRequired) return 'Video-to-Video (Reframe)';
                                                if (hasImageRequired || hasImageField) return 'Image-to-Video';
                                                return 'Text-to-Video';
                                            }
                                            if (hasImageRequired || hasImageField) return 'Image-to-Image';
                                            return 'Text-to-Image';
                                        })()}
                                    </div>
                                )}
                                {schemaLoading && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading model schema…</div>
                                )}
                                {schemaError && (
                                    <div style={{ fontSize: '11px', color: '#F87171' }}>{schemaError}</div>
                                )}
                                {!schemaLoading && inputSchema && Object.keys(inputProperties).length > 0 && (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {Object.entries(inputProperties).map(([fieldName, fieldSchema]) =>
                                            renderDynamicField(fieldName, fieldSchema)
                                        )}
                                    </div>
                                )}
                                {!schemaLoading && !inputSchema && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        No schema available for this model.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Batch Count</label>
                            <input
                                className="dark-input"
                                type="number"
                                min={1}
                                max={12}
                                value={batchCount}
                                onChange={(e) => setBatchCount(Number(e.target.value) || 1)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Schedule</label>
                            <input
                                className="dark-input"
                                type="datetime-local"
                                value={scheduleAt}
                                onChange={(e) => setScheduleAt(e.target.value)}
                            />
                        </div>
                        {(imageLoading || videoLoading) && (
                            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                Loading registry...
                            </div>
                        )}
                        {/* Chaining Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', marginTop: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <input type="checkbox" checked={autoUpscale} onChange={e => setAutoUpscale(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                                <span style={{ fontSize: '10px', fontWeight: 800, color: autoUpscale ? '#10B981' : 'var(--text-main)', textTransform: 'uppercase' }}>Ultra Quality (4K)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <input type="checkbox" checked={autoPostThreads} onChange={e => setAutoPostThreads(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                                <span style={{ fontSize: '10px', fontWeight: 800, color: autoPostThreads ? '#10B981' : 'var(--text-main)', textTransform: 'uppercase' }}>🚀 Auto-Post</span>
                            </label>
                        </div>

                        <button className="gradient-btn" style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={generateBatch} disabled={generating}>
                            {generating ? (
                                <>
                                    <div className="spinner-small" style={{ borderTopColor: '#000' }} />
                                    <span>GENERATING...</span>
                                </>
                            ) : (
                                <span>GENERATE BATCH</span>
                            )}
                        </button>

                        {error && <div style={{ marginTop: '12px', color: '#F87171', fontSize: '12px' }}>{error}</div>}
                        {success && <div style={{ marginTop: '12px', color: '#34D399', fontSize: '12px' }}>{success}</div>}
                    </div>

                    {availableAssets.length > 0 && (
                        <div className="glass-card" style={{ padding: '16px' }}>
                            <div className="card-title">Influencer Assets (LoRAs)</div>
                            <div className="space-y-3">
                                {availableAssets.map((asset, idx) => (
                                    <div key={asset.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700 }}>{asset.name}</span>
                                            <input 
                                                type="checkbox" 
                                                checked={asset.active} 
                                                onChange={(e) => {
                                                    const newAssets = [...availableAssets];
                                                    newAssets[idx].active = e.target.checked;
                                                    setAvailableAssets(newAssets);
                                                }}
                                            />
                                        </div>
                                        {asset.active && (
                                            <div className="space-y-1">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                    <span>Strength</span>
                                                    <span>{asset.strength}</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="1" step="0.1" 
                                                    style={{ width: '100%', height: '4px' }}
                                                    value={asset.strength}
                                                    onChange={(e) => {
                                                        const newAssets = [...availableAssets];
                                                        newAssets[idx].strength = parseFloat(e.target.value);
                                                        setAvailableAssets(newAssets);
                                                    }}
                                                />
                                                {asset.trigger && (
                                                    <div style={{ fontSize: '9px', color: 'var(--primary)', marginTop: '4px', opacity: 0.8 }}>
                                                        Trigger: {asset.trigger}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    <div className="glass-card" style={{ padding: '16px' }}>
                        <div className="card-title">Actions</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="ghost-btn" onClick={selectAll} disabled={!results.length}>Select All</button>
                            <button className="ghost-btn" onClick={clearSelection} disabled={!selectedIds.size}>Clear</button>
                             <button className="ghost-btn" onClick={approveSelected} disabled={saving || !selectedIds.size}>
                                 {saving ? 'SAVING...' : 'Approve to Contenu'}
                             </button>
                             <button className="ghost-btn" onClick={sendToQueue} disabled={queueing || !selectedIds.size}>
                                 {queueing ? 'QUEUING...' : 'Send to Queue'}
                             </button>
                         </div>
                     </div>
 
                     <div className="glass-card" style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                         <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span>History (Contenu)</span>
                             <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Last 10 items</span>
                         </div>
                         {historyItems.length === 0 && (
                             <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No saved content yet.</div>
                         )}
                         {historyItems.length > 0 && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                 {historyItems.map((item) => (
                                     <div 
                                         key={item.id} 
                                         style={{ 
                                             display: 'grid', 
                                             gridTemplateColumns: '40px 1fr 80px', 
                                             gap: '12px', 
                                             alignItems: 'center',
                                             padding: '8px',
                                             borderRadius: '8px',
                                             background: 'rgba(255,255,255,0.02)',
                                             border: '1px solid rgba(255,255,255,0.05)'
                                         }}
                                     >
                                         <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                             {item.mediaUrl ? (
                                                 <img src={item.mediaUrl} alt={item.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                             ) : (
                                                 <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.08)' }} />
                                             )}
                                         </div>
                                         <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                             <div style={{ fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                 {item.name || 'Untitled'}
                                             </div>
                                             <div 
                                                 style={{ 
                                                     fontSize: '10px', 
                                                     color: 'var(--text-muted)', 
                                                     display: '-webkit-box',
                                                     WebkitLineClamp: 1,
                                                     WebkitBoxOrient: 'vertical',
                                                     overflow: 'hidden',
                                                     lineHeight: '1.2'
                                                 }}
                                                 title={item.prompt}
                                             >
                                                 {item.prompt}
                                             </div>
                                         </div>
                                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                             <div style={{ fontSize: '9px', color: item.status === 'Approved' ? '#34D399' : '#FBBF24', fontWeight: 700 }}>
                                                 {item.status || 'Pending'}
                                             </div>
                                             {item.mediaUrl && (
                                                 <a 
                                                     className="ghost-btn" 
                                                     href={item.mediaUrl} 
                                                     target="_blank" 
                                                     rel="noreferrer"
                                                     style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '4px' }}
                                                 >
                                                     View
                                                 </a>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', position: 'sticky', top: '24px', alignSelf: 'start', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                    <div className="card-title">Outputs</div>
                    {generating && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '24px' }}>
                            <div className="spinner" style={{ width: '64px', height: '64px', borderWidth: '5px' }} />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Creating Artificial Beauty</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generating {batchCount} variations with {selectedModel?.name}</div>
                            </div>
                        </div>
                    )}
                    {!results.length && !generating && (
                        <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Run a batch to see outputs.</div>
                    )}
                    {results.length > 0 && !generating && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(294px, 1fr))', gap: '20px' }}>
                            {results.map((item) => (
                                <div key={item.id} className="glass-card" style={{ padding: '12px', borderRadius: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select</span>
                                        </label>
                                        <ModelLogo modelId={item.model} provider={item.provider} size="18px" />
                                    </div>
                                    {item.mediaType === 'video' ? (
                                        <video src={item.mediaUrl} controls style={{ width: '100%', height: '231px', borderRadius: '10px', objectFit: 'cover', background: 'rgba(255,255,255,0.04)' }} />
                                    ) : (
                                        <img src={item.mediaUrl} alt={item.prompt} style={{ width: '100%', height: '231px', borderRadius: '10px', objectFit: 'cover', background: 'rgba(255,255,255,0.04)' }} />
                                    )}
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1, fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4', fontStyle: 'italic' }}>{item.prompt}</div>
                                        {onEditImage && item.mediaType === 'image' && (
                                            <button 
                                                className="gradient-btn" 
                                                onClick={() => onEditImage(item.mediaUrl)}
                                                style={{ padding: '6px 10px', fontSize: '10px', height: '32px', whiteSpace: 'nowrap' }}
                                            >
                                                🎨 Edit in Studio
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
