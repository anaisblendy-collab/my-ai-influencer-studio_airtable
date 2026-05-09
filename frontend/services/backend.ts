/**
 * Backend Service - FastAPI / Hugging Face / Replicate API calls
 */

import type { AIModel } from '../types/domain';

export interface GenerationRequest {
    model: AIModel;
    prompt: string;
    influencerId?: string;
    influencerProfile?: {
        name: string;
        age: string;
        gender: string;
        niche: string;
        style: string;
    };
    baseId?: string;
    tableId?: string;
    options?: {
        steps?: number;
        guidance?: number;
        seed?: number;
        ratio?: string;
    };
    billingMode?: 'platform' | 'byok' | 'both';
}

export interface GenerationResponse {
    success: boolean;
    record_id: string;
    image_url: string;
    message: string;
    generation_time: number;
    metadata: any;
}

export interface BatchGenerationRequest {
    base_request: GenerationRequest;
    count: number;
    auto_variations: boolean;
}

export interface BatchGenerationResponse {
    success: boolean;
    count: number;
    total_time: number;
    results: GenerationResponse[];
}

export interface StatsResponse {
    total_generations: number;
    total_cost: number;
    recent_generations: number;
    popular_models: { [key: string]: number };
}

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    provider: string;
    speed: string;
    price: string;
    tags: string[];
}

export interface ContentItem {
    id: string;
    name: string;
    age: number;
    niche: string;
    style: string;
    model: string;
    image_url: string;
    created_at: string;
    cost?: number;
}

export interface ConnectionStatusItem {
    provider: string;
    mode: string;
    has_key: boolean;
}

export interface StorageStatusItem {
    success: boolean;
    provider: string;
    bucket_name?: string | null;
    region?: string | null;
    has_access_key: boolean;
    has_secret_key: boolean;
}

export interface FanvueStatusItem {
    success: boolean;
    connected: boolean;
    account_id?: string | null;
    username?: string | null;
    display_name?: string | null;
    scopes: string[];
    expires_at?: string | null;
    has_refresh_token: boolean;
    auth_configured: boolean;
    accounts?: Array<{
        account_id?: string | null;
        username?: string | null;
        display_name?: string | null;
        scopes?: string[];
        expires_at?: string | null;
        has_refresh_token?: boolean;
    }>;
}

export interface ConnectorTestResponse {
    success: boolean;
    status_code: number;
    url: string;
    content_type?: string;
    preview?: any;
    preview_keys: string[];
    message: string;
}

// LoRA Types
export interface LoraCatalogItem {
    id: string;
    name: string;
    description?: string;
    model_id: string;
    version_id?: string;
    base_model?: string;
    type?: string;
    trigger_words: string[];
    example_images: string[];
    nsfw: boolean;
    tags: string[];
    provider: string;
    urn?: string;
    strength_default?: number;
    compatibility?: string[];
}

export interface CreditStatus {
    success: boolean;
    org_id: string;
    total_credits: number;
    used_credits: number;
    remaining_credits: number;
}

export interface LoraCatalogResponse {
    success: boolean;
    total: number;
    page: number;
    page_size: number;
    items: LoraCatalogItem[];
}

export interface LoraTestRequest {
    lora_urn: string;
    prompt: string;
    provider: string;
    model: string;
    strength?: number;
    negative_prompt?: string;
    civitai_api_key?: string;
    huggingface_api_key?: string;
    base_id?: string;
    billing_mode?: string;
}

export interface LoraTestResponse {
    success: boolean;
    media_url: string;
    generation_time: number;
    cost_estimate?: string;
}

export interface LoraSaveRequest {
    base_id: string;
    table_name?: string;
    name: string;
    urn: string;
    provider: string;
    trigger_words?: string[];
    strength?: number;
    notes?: string;
}

export interface LoraAirtableItem {
    record_id: string;
    name: string;
    type: string;
    provider: string;
    urn: string;
    trigger_words: string[];
    strength: number;
    notes?: string;
}

export class BackendService {
    private apiBaseUrl = 'https://backend-fastapi1.onrender.com';
    private authKeys: Record<string, string> = {};
    private globalConfig: any = null;

    setGlobalConfig(config: any) {
        this.globalConfig = config;
    }

    setBaseUrl(url?: string) {
        if (url) {
            this.apiBaseUrl = this.normalizeBaseUrl(url);
        }
    }

    setAuthKeys(keys: Record<string, string>) {
        this.authKeys = { ...this.authKeys, ...keys };
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Whop Authentication Support - Only add if token exists to avoid unnecessary CORS preflight
        if (this.globalConfig) {
            const whopToken = this.globalConfig.get('whop_token') as string;
            if (whopToken) {
                headers['Authorization'] = `Bearer ${whopToken}`;
            }
        }
        
        return headers;
    }

    async checkSubscriptionStatus(): Promise<{
        isValid: boolean;
        planName?: string;
        creditsRemaining: number;
        reason?: string;
    }> {
        const baseUrl = this.getBaseUrl();
        if (!baseUrl) return { isValid: false, creditsRemaining: 0, reason: 'Backend not configured' };
        
        try {
            const response = await fetch(`${baseUrl}/api/v1/credits/status`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to verify subscription');
            const data = await response.json();
            return {
                isValid: data.is_active || false,
                planName: data.plan_name,
                creditsRemaining: data.credits || 0
            };
        } catch (error) {
            console.error('Subscription check failed:', error);
            return { isValid: false, creditsRemaining: 0, reason: (error as Error).message };
        }
    }

    private normalizeBaseUrl(url?: string): string {
        let trimmed = (url || '').trim();
        if (!trimmed) return '';
        trimmed = trimmed.replace(/\/+$/, '');
        trimmed = trimmed.replace(/\/api\/v1$/i, '');
        return trimmed;
    }

    public getBaseUrl(): string {
        if (this.globalConfig) {
            const customUrl = this.globalConfig.get('backendUrl') as string;
            if (customUrl) return this.normalizeBaseUrl(customUrl);
        }
        return this.apiBaseUrl || '';
    }

    async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
        try {
            if (!request.influencerProfile) {
                throw new Error('Influencer profile is required');
            }

            const response = await fetch(`${this.getBaseUrl()}/api/v1/generate`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    name: request.influencerProfile.name,
                    age: parseInt(request.influencerProfile.age),
                    gender: request.influencerProfile.gender,
                    ethnicity: 'caucasian',
                    niche: request.influencerProfile.niche,
                    style: request.influencerProfile.style,
                    provider: request.model.tags.includes('custom') ? 'civitai' : 'huggingface',
                    model: request.model.apiId || request.model.id,
                    base_id: request.baseId || null,
                    table_id: request.tableId || null,
                    content_table_id: request.tableId || null,
                    influencer_id: request.influencerId || null,
                    billing_mode: request.billingMode || (window as any).AirtableMode || 'platform',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Backend API error: ${response.statusText} - ${errorData.detail || ''}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Image generation error:', error);
            throw error;
        }
    }

    async batchGenerate(request: BatchGenerationRequest): Promise<BatchGenerationResponse> {
        try {
            const body = {
                base_request: {
                    name: request.base_request.influencerProfile?.name,
                    age: parseInt(request.base_request.influencerProfile?.age || '25'),
                    gender: request.base_request.influencerProfile?.gender,
                    ethnicity: 'caucasian',
                    niche: request.base_request.influencerProfile?.niche,
                    style: request.base_request.influencerProfile?.style,
                    provider: request.base_request.model.tags.includes('custom') ? 'civitai' : 'huggingface',
                    model: request.base_request.model.apiId || request.base_request.model.id,
                    base_id: request.base_request.baseId || null,
                    table_id: request.base_request.tableId || null,
                    content_table_id: request.base_request.tableId || null,
                    influencer_id: request.base_request.influencerId || null,
                    billing_mode: request.base_request.billingMode || (window as any).AirtableMode || 'platform',
                },
                count: request.count,
                auto_variations: request.auto_variations
            };

            const response = await fetch(`${this.getBaseUrl()}/api/v1/generate/batch`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Batch API error: ${response.statusText} - ${errorData.detail || ''}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Batch generation error:', error);
            throw error;
        }
    }

    async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
        try {
            console.log('Video generation requested:', request);
            return {
                success: true,
                record_id: 'mock_video_id',
                image_url: 'https://example.com/mock-video.mp4',
                message: 'Mock video generated successfully',
                generation_time: 60,
                metadata: { cost: 0.05 }
            };
        } catch (error) {
            console.error('Video generation error:', error);
            throw error;
        }
    }

    private calculateCost(model: AIModel): number {
        if (model.price === 'Gratuit') return 0;
        if (model.price.startsWith('$')) {
            return parseFloat(model.price.replace('$', ''));
        }
        return 0;
    }

    buildInfluencerPrompt(profile: GenerationRequest['influencerProfile']): string {
        if (!profile) return '';
        return `A beautiful ${profile.age} year old ${profile.gender} ${profile.niche} influencer named ${profile.name}, ${profile.style} style, professional photography, high detail`;
    }

    private normalizeProvider(value?: string): string {
        const normalized = (value || '').toLowerCase();
        if (normalized === 'luma') return 'replicate';
        const allowed = new Set(['huggingface', 'replicate', 'fal', 'flux', 'wan', 'nanobanana', 'civitai', 'gemini', 'openrouter']);
        return allowed.has(normalized) ? normalized : 'huggingface';
    }

    async previewGenerateBatch(payload: {
        influencer: {
            name: string;
            age: number;
            gender: string;
            niche: string;
            style: string;
        };
        provider: string;
        model: string;
        mediaType: 'image' | 'video';
        customPrompt?: string;
        referenceImageUrl?: string;
        videoUrl?: string;
        extraParams?: Record<string, any>;
        count: number;
        qualityMode?: 'fast' | 'balanced' | 'quality';
        llmModel?: string;
        llmPrompt?: string;
        orgId?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; count: number; results: { prompt: string; media_url: string; provider: string; model: string; media_type: string }[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/generate/preview/batch`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                base_request: {
                    base_id: payload.orgId || '',
                    name: payload.influencer.name,
                    age: payload.influencer.age,
                    gender: payload.influencer.gender,
                    ethnicity: 'caucasian',
                    niche: payload.influencer.niche,
                    style: payload.influencer.style,
                    provider: this.normalizeProvider(payload.provider),
                    model: payload.model,
                    media_type: payload.mediaType,
                    custom_prompt: payload.customPrompt,
                    reference_image_url: payload.referenceImageUrl,
                    video_url: payload.videoUrl,
                    extra_params: payload.extraParams,
                    quality_mode: payload.qualityMode || 'balanced',
                    llm_model: payload.llmModel,
                    llm_prompt: payload.llmPrompt,
                    billing_mode: payload.billingMode || (window as any).AirtableMode || 'platform'
                },
                count: payload.count,
                auto_variations: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail || errorData));
        }

        return await response.json();
    }

    async previewEdit(payload: {
        provider: string;
        model: string;
        imageUrl: string;
        maskUrl: string;
        prompt: string;
        strength?: number;
        numInferenceSteps?: number;
        guidanceScale?: number;
        outputQuality?: number;
        orgId?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; output_url: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/edit/preview`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                provider: payload.provider,
                model: payload.model,
                image_url: payload.imageUrl,
                mask_url: payload.maskUrl,
                prompt: payload.prompt,
                strength: payload.strength,
                num_inference_steps: payload.numInferenceSteps,
                guidance_scale: payload.guidanceScale,
                output_quality: payload.outputQuality,
                org_id: payload.orgId,
                billing_mode: payload.billingMode
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Edit preview failed');
        }

        return await response.json();
    }

    async previewPromptEdit(payload: {
        provider: string;
        model: string;
        prompt: string;
        imageInputs: string[];
        numOutputs?: number;
        aspectRatio?: string;
        resolution?: string;
        outputFormat?: string;
        safetyFilterLevel?: string;
        crispUpscale?: boolean;
        presetTags?: string[];
        orgId?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; output_url?: string; output_urls?: string[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/edit/prompt`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                provider: payload.provider,
                model: payload.model,
                prompt: payload.prompt,
                image_inputs: payload.imageInputs,
                num_outputs: payload.numOutputs || 1,
                aspect_ratio: payload.aspectRatio,
                resolution: payload.resolution,
                output_format: payload.outputFormat,
                safety_filter_level: payload.safetyFilterLevel,
                crisp_upscale: payload.crispUpscale,
                preset_tags: payload.presetTags,
                org_id: payload.orgId,
                billing_mode: payload.billingMode
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Prompt edit failed');
        }

        return await response.json();
    }

    async renderCollage(payload: {
        imageUrls: string[];
        layout: 'grid_2x2' | 'vertical' | 'before_after' | 'blend';
    }): Promise<{ success: boolean; output_url: string; width: number; height: number; count: number }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/collage/render`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                image_urls: payload.imageUrls,
                layout: payload.layout
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Collage render failed');
        }

        return await response.json();
    }

    async autoMask(payload: {
        provider: string;
        model: string;
        imageUrl: string;
        orgId?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; mask_url: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/edit/automask`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                provider: payload.provider,
                model: payload.model,
                image_url: payload.imageUrl,
                org_id: payload.orgId,
                billing_mode: payload.billingMode
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Auto-mask failed');
        }

        return await response.json();
    }

    async encodeMask(payload: {
        imageUrl: string;
    }): Promise<{ success: boolean; session_id: string; width: number; height: number }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/mask/encode`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                image_url: payload.imageUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Mask encode failed');
        }

        return await response.json();
    }

    async hoverMask(payload: {
        sessionId: string;
        x: number;
        y: number;
    }): Promise<{ success: boolean; mask_base64: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/mask/hover`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                session_id: payload.sessionId,
                x: payload.x,
                y: payload.y
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Mask hover failed');
        }

        return await response.json();
    }

    async getStats(): Promise<StatsResponse | null> {
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/v1/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return null;
        }
    }

    async getModels(): Promise<ModelInfo[]> {
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/v1/models`);
            if (!response.ok) throw new Error('Failed to fetch models');
            return await response.json();
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }

    async getModelRegistry(): Promise<{ success: boolean; models: any[] }> {
        const baseUrl = this.getBaseUrl();
        if (!baseUrl) return { success: true, models: [] };

        const response = await fetch(`${baseUrl}/api/v1/models/registry`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch model registry');
        }
        return await response.json();
    }

    async getPresetRegistry(): Promise<{ presets: any[] }> {
        const baseUrl = this.getBaseUrl();
        if (!baseUrl) return { presets: [] };

        const response = await fetch(`${baseUrl}/api/v1/presets/registry`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch preset registry');
        }
        return await response.json();
    }

    async getContents(limit: number = 50): Promise<ContentItem[]> {
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/v1/contents?limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch contents');
            return await response.json();
        } catch (error) {
            console.error('Error fetching contents:', error);
            return [];
        }
    }

    async inspectModel(url: string): Promise<{ model_id: string; provider: string; parameters: any[] }> {
        const baseUrl = this.getBaseUrl();
        if (!baseUrl) throw new Error('Backend URL not configured');

        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`${baseUrl}/api/v1/models/inspect?url=${encodedUrl}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Model inspection failed');
        }
        return await response.json();
    }

    async getModelSchema(modelId: string): Promise<any> {
        try {
            const encodedId = encodeURIComponent(modelId);
            const response = await fetch(`${this.getBaseUrl()}/api/v1/models/${encodedId}/schema`);
            if (response.status === 404) return null;
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || 'Failed to fetch model schema');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching model schema:', error);
            return null;
        }
    }

    async uploadAvatar(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.getBaseUrl()}/api/v1/uploads/avatar`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Avatar upload failed');
        }

        const result = await response.json();
        return result.url;
    }

    async validateApiKey(): Promise<boolean> {
        if (!this.authKeys.huggingface) return false;
        try {
            const response = await fetch('https://huggingface.co/api/whoami-v2', {
                headers: { 'Authorization': `Bearer ${this.authKeys.huggingface}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async uploadMedia(file: File, orgId?: string): Promise<string> {
        if (file.type.startsWith('video/')) {
            return this.uploadReferenceVideo(file, orgId);
        }
        return this.uploadReferenceImage(file, orgId);
    }

    async uploadReferenceImage(file: File, orgId?: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        if (orgId) formData.append('org_id', orgId);

        const response = await fetch(`${this.getBaseUrl()}/api/v1/uploads/reference`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Reference upload failed');
        }

        const result = await response.json();
        return result.url;
    }

    async uploadReferenceVideo(file: File, orgId?: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        if (orgId) formData.append('org_id', orgId);

        const response = await fetch(`${this.getBaseUrl()}/api/v1/uploads/video`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Video upload failed');
        }

        const result = await response.json();
        return result.url;
    }

    async uploadReferenceAudio(file: File, orgId?: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        if (orgId) formData.append('org_id', orgId);

        const response = await fetch(`${this.getBaseUrl()}/api/v1/uploads/audio`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Audio upload failed');
        }

        const result = await response.json();
        return result.url;
    }

    async generatePromptBatch(payload: {
        baseId: string;
        promptsTableName: string;
        influencerId: string;
        influencerName: string;
        influencerAge: number;
        influencerGender: string;
        influencerNiche: string;
        influencerStyle: string;
        style: string;
        platform: string;
        count: number;
        referenceImageUrl?: string;
        referenceImageUrls?: string[];
        negativePrompt?: string;
        promptTone?: string;
        promptFocus?: string[];
        promptLength?: string;
        seed?: number | null;
        llmProvider?: string;
        llmModel?: string;
        customPrompt?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; count: number; records: { id: string; prompt: string }[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/prompts/generate`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                base_id: payload.baseId,
                prompts_table_name: payload.promptsTableName,
                influencer_id: payload.influencerId,
                influencer_name: payload.influencerName,
                influencer_age: payload.influencerAge,
                influencer_gender: payload.influencerGender,
                influencer_niche: payload.influencerNiche,
                influencer_style: payload.influencerStyle,
                style: payload.style,
                platform: payload.platform,
                count: payload.count,
                reference_image_url: payload.referenceImageUrl,
                reference_image_urls: payload.referenceImageUrls,
                negative_prompt: payload.negativePrompt,
                prompt_tone: payload.promptTone,
                prompt_focus: payload.promptFocus,
                prompt_length: payload.promptLength,
                seed: payload.seed ?? undefined,
                llm_provider: payload.llmProvider,
                llm_model: payload.llmModel,
                custom_prompt: payload.customPrompt
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Prompt generation failed');
        }

        return await response.json();
    }

    async createQueueJob(payload: {
        baseId: string;
        queueTableName: string;
        queueTableId?: string;
        promptRecordId?: string;
        influencerId: string;
        mediaType: 'image' | 'video';
        provider?: string;
        model?: string;
        orgId?: string;
        referenceImageUrl?: string;
        maskImageUrl?: string;
        scheduledAt?: string;
        promptText?: string;
        outputMediaUrl?: string;
        loras?: string[];
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; record_id: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/queue/create`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                base_id: payload.baseId,
                queue_table_name: payload.queueTableName,
                queue_table_id: payload.queueTableId,
                prompt_record_id: payload.promptRecordId,
                influencer_id: payload.influencerId,
                media_type: payload.mediaType,
                provider: this.normalizeProvider(payload.provider),
                model: payload.model,
                org_id: payload.orgId,
                reference_image_url: payload.referenceImageUrl,
                mask_image_url: payload.maskImageUrl,
                scheduled_at: payload.scheduledAt,
                prompt_text: payload.promptText,
                output_media_url: payload.outputMediaUrl,
                loras: payload.loras,
                billing_mode: payload.billingMode
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Queue create failed');
        }

        return await response.json();
    }

    async savePromptList(payload: {
        baseId: string;
        promptsTableName: string;
        influencerId: string;
        prompts: string[];
        style?: string;
        platform?: string;
        status?: string;
        referenceImageUrl?: string;
        referenceImageUrls?: string[];
    }): Promise<{ success: boolean; count: number; records: { id: string; prompt: string }[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/prompts/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base_id: payload.baseId,
                prompts_table_name: payload.promptsTableName,
                influencer_id: payload.influencerId,
                prompts: payload.prompts,
                style: payload.style,
                platform: payload.platform,
                status: payload.status,
                reference_image_url: payload.referenceImageUrl,
                reference_image_urls: payload.referenceImageUrls
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Prompt save failed');
        }

        return await response.json();
    }

    async getQueueSummary(baseId: string, queueTableName: string, queueTableId?: string): Promise<{ success: boolean; counts: Record<string, number> }> {
        const params = new URLSearchParams({ base_id: baseId, queue_table_name: queueTableName });
        if (queueTableId) params.set('queue_table_id', queueTableId);
        const response = await fetch(`${this.getBaseUrl()}/api/v1/queue/summary?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Queue summary failed');
        }
        return await response.json();
    }

    async previewPromptBatch(payload: {
        baseId: string;
        promptsTableName: string;
        influencerId: string;
        influencerName: string;
        influencerAge: number;
        influencerGender: string;
        influencerNiche: string;
        influencerStyle: string;
        style: string;
        platform: string;
        count: number;
        referenceImageUrl?: string;
        referenceImageUrls?: string[];
        negativePrompt?: string;
        promptTone?: string;
        promptFocus?: string[];
        promptLength?: string;
        seed?: number | null;
        llmProvider?: string;
        llmModel?: string;
        customPrompt?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; count: number; prompts: string[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/prompts/preview`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                base_id: payload.baseId,
                prompts_table_name: payload.promptsTableName,
                influencer_id: payload.influencerId,
                influencer_name: payload.influencerName,
                influencer_age: payload.influencerAge,
                influencer_gender: payload.influencerGender,
                influencer_niche: payload.influencerNiche,
                influencer_style: payload.influencerStyle,
                style: payload.style,
                platform: payload.platform,
                count: payload.count,
                reference_image_url: payload.referenceImageUrl,
                reference_image_urls: payload.referenceImageUrls,
                negative_prompt: payload.negativePrompt,
                prompt_tone: payload.promptTone,
                prompt_focus: payload.promptFocus,
                prompt_length: payload.promptLength,
                seed: payload.seed ?? undefined,
                llm_provider: payload.llmProvider,
                llm_model: payload.llmModel,
                custom_prompt: payload.customPrompt
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Prompt preview failed');
        }

        return await response.json();
    }

    async promptsFromImage(payload: {
        baseId: string;
        imageUrl?: string;
        imageUrls?: string[];
        count: number;
        negativePrompt?: string;
        promptTone?: string;
        promptFocus?: string[];
        promptLength?: string;
        seed?: number | null;
        llmProvider?: string;
        llmModel?: string;
        customPrompt?: string;
        billingMode?: 'platform' | 'byok' | 'both';
    }): Promise<{ success: boolean; count: number; prompts: string[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/prompts/from-image`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                base_id: payload.baseId,
                image_url: payload.imageUrl,
                image_urls: payload.imageUrls,
                count: payload.count,
                negative_prompt: payload.negativePrompt,
                prompt_tone: payload.promptTone,
                prompt_focus: payload.promptFocus,
                prompt_length: payload.promptLength,
                seed: payload.seed ?? undefined,
                llm_provider: payload.llmProvider,
                llm_model: payload.llmModel,
                custom_prompt: payload.customPrompt,
                billing_mode: payload.billingMode || (window as any).AirtableMode || 'platform'
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Image prompt failed');
        }
        return await response.json();
    }

    async saveConnection(payload: {
        orgId: string;
        provider: string;
        mode: 'platform' | 'byok';
        apiKey?: string;
    }): Promise<{ success: boolean; connections: ConnectionStatusItem[] }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/connections/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                provider: payload.provider,
                mode: payload.mode,
                api_key: payload.apiKey || null
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Connections save failed');
        }
        return await response.json();
    }

    async getConnectionsStatus(orgId: string): Promise<{ success: boolean; connections: ConnectionStatusItem[] }> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/connections/status?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Connections status failed');
        }
        return await response.json();
    }

    async getHealth(): Promise<{ status: string; timestamp: string; services: Record<string, string> }> {
        try {
            const response = await fetch(`${this.getBaseUrl()}/health`);
            if (!response.ok) return { status: 'error', timestamp: '', services: {} };
            return await response.json();
        } catch (error) {
            console.error('Health check failed', error);
            return { status: 'error', timestamp: '', services: {} };
        }
    }

    async testConnection(payload: {
        orgId: string;
        provider: string;
        model?: string;
        prompt?: string;
    }): Promise<{ success: boolean; provider: string; model?: string; message: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/connections/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                provider: payload.provider,
                model: payload.model,
                prompt: payload.prompt
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Connection test failed');
        }
        return await response.json();
    }

    async saveStorageConfig(payload: {
        orgId: string;
        provider: string;
        bucketName: string;
        region: string;
        accessKey: string;
        secretKey: string;
    }): Promise<StorageStatusItem> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/storage/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                provider: payload.provider,
                bucket_name: payload.bucketName,
                region: payload.region,
                access_key: payload.accessKey,
                secret_key: payload.secretKey
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Storage save failed');
        }
        return await response.json();
    }

    async getStorageStatus(orgId: string): Promise<StorageStatusItem> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/storage/status?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Storage status failed');
        }
        return await response.json();
    }

    async testStorageConfig(orgId: string): Promise<{ success: boolean; provider: string; bucket_name?: string; region?: string; message: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/storage/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Storage test failed');
        }
        return await response.json();
    }

    async getFanvueConnectUrl(orgId: string): Promise<{ success: boolean; authorize_url: string; state: string }> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/oauth/start?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Fanvue connect failed');
        }
        return await response.json();
    }

    async getFanvueStatus(orgId: string): Promise<FanvueStatusItem> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/status?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Fanvue status failed');
        }
        return await response.json();
    }

    async getAirtableConnectUrl(orgId: string): Promise<{ success: boolean; authorize_url: string; state: string }> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/airtable/oauth/start?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Airtable connect failed');
        }
        return await response.json();
    }

    async getAirtableStatus(orgId: string): Promise<{ connected: boolean; provider: string; email?: string; expires_at?: number; scopes?: string[] }> {
        const params = new URLSearchParams({ org_id: orgId });
        const response = await fetch(`${this.getBaseUrl()}/api/v1/airtable/status?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Airtable status failed');
        }
        return await response.json();
    }

    async disconnectAirtable(orgId: string): Promise<{ success: boolean; disconnected: boolean }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/connections/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId, provider: 'airtable', mode: 'platform', api_key: null })
        });
        if (!response.ok) {
            throw new Error('Airtable disconnect failed');
        }
        return { success: true, disconnected: true };
    }

    async disconnectFanvue(orgId: string, accountId?: string): Promise<{ success: boolean; disconnected: boolean }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId, account_id: accountId })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Fanvue disconnect failed');
        }
        return await response.json();
    }

    async publishToFanvue(payload: {
        orgId: string;
        caption: string;
        mediaUrl?: string;
        mediaUrls?: string[];
        mediaType?: 'image' | 'video';
        name?: string;
        contentRecordId?: string;
        influencerId?: string;
        fanvueAccountId?: string;
        creatorUserUuid?: string;
        priceCents?: number;
        scheduledFor?: string;
    }): Promise<{ success: boolean; post_id: string; status?: string; message: string }> {
        if (!payload.mediaUrl && !(payload.mediaUrls && payload.mediaUrls.length)) {
            throw new Error('Missing media URL. Save the item to Content with an attachment first.');
        }
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/posts/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                caption: payload.caption,
                media_url: payload.mediaUrl,
                media_urls: payload.mediaUrls,
                media_type: payload.mediaType || 'image',
                name: payload.name,
                content_record_id: payload.contentRecordId,
                influencer_id: payload.influencerId,
                fanvue_account_id: payload.fanvueAccountId,
                creator_user_uuid: payload.creatorUserUuid,
                price_cents: payload.priceCents,
                scheduled_for: payload.scheduledFor
            })
        });
        const rawText = await response.text().catch(() => '');
        const json = rawText ? (() => { try { return JSON.parse(rawText); } catch { return null; } })() : null;
        if (!response.ok) {
            const detail = (json as any)?.detail;
            throw new Error(detail || rawText || 'Fanvue publish failed');
        }
        if (!json) {
            throw new Error('Fanvue publish returned a non-JSON response. Check backend logs.');
        }
        return json as any;
    }

    async syncFanvueMetrics(payload: {
        orgId: string;
        influencerId?: string;
        fanvueAccountId?: string;
        postIds?: string[];
    }): Promise<{ success: boolean; synced: number; failed: number; message: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/posts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                influencer_id: payload.influencerId,
                fanvue_account_id: payload.fanvueAccountId,
                post_ids: payload.postIds || []
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Fanvue sync failed');
        }
        return await response.json();
    }

    async runFanvueAutopublish(payload: {
        orgId: string;
        contentRecordId?: string;
        dryRun?: boolean;
        maxItems?: number;
    }): Promise<{ success: boolean; scanned: number; eligible: number; published: number; skipped: number; failed: number; items: any[]; message: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/fanvue/autopublish/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                content_record_id: payload.contentRecordId,
                dry_run: !!payload.dryRun,
                max_items: payload.maxItems || 25
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Auto publish failed');
        }
        return await response.json();
    }

    async testCustomConnector(payload: {
        orgId: string;
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        url: string;
        headers?: Record<string, string>;
        queryParams?: Record<string, string>;
        body?: Record<string, any>;
        authMode?: 'none' | 'bearer' | 'header';
        authToken?: string;
        authHeaderName?: string;
        resultPath?: string;
        name?: string;
    }): Promise<ConnectorTestResponse> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/connectors/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: payload.orgId,
                name: payload.name,
                method: payload.method,
                url: payload.url,
                headers: payload.headers || {},
                query_params: payload.queryParams || {},
                body: payload.body,
                auth_mode: payload.authMode || 'none',
                auth_token: payload.authToken,
                auth_header_name: payload.authHeaderName,
                result_path: payload.resultPath
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Connector test failed');
        }
        return await response.json();
    }

    async assistantPlan(payload: {
        baseId: string;
        message: string;
        llmProvider?: string;
        llmModel?: string;
        influencers?: { id: string; name: string }[];
        presets?: { id: string; name: string }[];
    }): Promise<{ success: boolean; reply: string; action: string; params?: Record<string, any> }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/assistant/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base_id: payload.baseId,
                message: payload.message,
                llm_provider: payload.llmProvider,
                llm_model: payload.llmModel,
                influencers: payload.influencers,
                presets: payload.presets
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Assistant request failed');
        }
        return await response.json();
    }

    async getLoraCatalog(params?: {
        query?: string;
        types?: string;
        base_models?: string;
        sort?: string;
        page?: number;
        limit?: number;
        nsfw?: boolean;
    }): Promise<LoraCatalogResponse> {
        const queryParams = new URLSearchParams();
        if (params?.query) queryParams.append('query', params.query);
        if (params?.types) queryParams.append('types', params.types);
        if (params?.base_models) queryParams.append('base_models', params.base_models);
        if (params?.sort) queryParams.append('sort', params.sort);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.nsfw !== undefined) queryParams.append('nsfw', params.nsfw.toString());

        const response = await fetch(`${this.getBaseUrl()}/api/v1/lora/catalog?${queryParams.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch LoRA catalog');
        }
        return await response.json();
    }

    async getLoraDetails(modelId: number): Promise<LoraCatalogItem> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/lora/${modelId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch LoRA details');
        }
        return await response.json();
    }

    async testLora(request: LoraTestRequest): Promise<LoraTestResponse> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/lora/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to test LoRA');
        }
        return await response.json();
    }

    async saveLoraToAirtable(request: LoraSaveRequest): Promise<{ success: boolean; record_id: string; message: string }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/lora/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to save LoRA');
        }
        return await response.json();
    }

    async deleteLoraFromAirtable(recordId: string, baseId: string, tableName?: string): Promise<{ success: boolean; message: string }> {
        const queryParams = new URLSearchParams({ base_id: baseId });
        if (tableName) queryParams.append('table_name', tableName);

        const response = await fetch(`${this.getBaseUrl()}/api/v1/lora/${recordId}?${queryParams.toString()}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to delete LoRA');
        }
        return await response.json();
    }

    async listLorasFromAirtable(baseId: string, tableName?: string, typeFilter?: string): Promise<{ success: boolean; total: number; items: LoraAirtableItem[] }> {
        const queryParams = new URLSearchParams({ base_id: baseId });
        if (tableName) queryParams.append('table_name', tableName);
        if (typeFilter) queryParams.append('type_filter', typeFilter);

        const url = `${this.getBaseUrl()}/api/v1/lora/airtable/list?${queryParams.toString()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to list LoRAs (${response.status} at ${url})`);
            }
            return await response.json();
        } catch (err: any) {
            throw new Error(`Connection error to ${url}: ${err.message}`);
        }
    }

    async getCreditsStatus(orgId: string): Promise<CreditStatus> {
        const url = `${this.getBaseUrl()}/api/v1/credits/status?org_id=${orgId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to fetch credits status (${response.status} at ${url})`);
            }
            return await response.json();
        } catch (err: any) {
            throw new Error(`Connection error to ${url}: ${err.message}`);
        }
    }

    async consumeCredit(orgId: string, amount: number = 1): Promise<{ success: boolean; remaining_credits: number }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/credits/consume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: orgId, amount })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to consume credit');
        }
        return await response.json();
    }

    async getBillingStatus(orgId: string): Promise<{ org_id: string; credits: number; is_premium: boolean }> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/billing/status?org_id=${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch billing status');
        return await response.json();
    }

    async listInstagramCFJobs(): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/instagram/close-friends/jobs`, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Failed to list Instagram CF jobs');
        return await response.json();
    }

    async getInstagramCFStats(): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/instagram/close-friends/stats`, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Failed to get Instagram CF stats');
        return await response.json();
    }

    async createInstagramCFJob(data: any): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/instagram/close-friends/jobs`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                usernames: data.usernames,
                mode: data.mode,
                source: data.source,
                meta: data.meta,
                target_bot: data.targetBot // On envoie l'ID du Bot cible
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create CF job');
        }
        return await response.json();
    }

    async deleteInstagramCFJob(jobId: string): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/instagram/close-friends/jobs/${jobId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete CF job');
        return await response.json();
    }

    /**
     * Threads Jobs
     */
    async listThreadsJobs(tenantId?: string): Promise<any[]> {
        const url = tenantId 
            ? `${this.getBaseUrl()}/api/v1/threads/jobs?tenant_id=${tenantId}`
            : `${this.getBaseUrl()}/api/v1/threads/jobs`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Failed to list Threads jobs');
        return await response.json();
    }

    async getThreadsStats(tenantId?: string): Promise<any> {
        const url = tenantId 
            ? `${this.getBaseUrl()}/api/v1/threads/jobs/stats?tenant_id=${tenantId}`
            : `${this.getBaseUrl()}/api/v1/threads/jobs/stats`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Failed to get Threads stats');
        return await response.json();
    }

    async createThreadsJob(data: { message: string, images?: string[], tenant_id?: string, targetBot?: string }): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/threads/jobs`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                message: data.message,
                images: data.images || [],
                target_bot: data.targetBot,
                meta: { tenant_id: data.tenant_id }
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create Threads job');
        }
        return await response.json();
    }

    async deleteThreadsJob(jobId: string): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/api/v1/threads/jobs/${jobId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete Threads job');
        return await response.json();
    }
}

export const backendService = new BackendService();
