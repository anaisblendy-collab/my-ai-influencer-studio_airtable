/**
 * Provider definitions for AI services
 */

export type ProviderId =
    | 'openrouter'
    | 'openai'
    | 'gemini'
    | 'replicate'
    | 'fal'
    | 'huggingface'
    | 'civitai'
    | 'kling'
    | 'runway'
    | 'luma'
    | 'veo'
    | 'wan'
    | 'muapi'
    | 'xai'
    | 'google'
    | 'together';

export type StorageMode = 'standard' | 'pro' | 'cloudinary_custom';

export type ProviderDefinition = {
    id: ProviderId;
    label: string;
    modelPlaceholder: string;
    description: string;
};

export const LLM_PROVIDERS: ProviderDefinition[] = [
    { id: 'openrouter', label: 'OpenRouter / Claude', modelPlaceholder: 'openai/gpt-4o-mini', description: 'Central routing for GPT-4o, Claude 3.5, and thousands of LLMs.' },
    { id: 'openai', label: 'OpenAI Direct', modelPlaceholder: 'gpt-4o-mini', description: 'Standard LLM engine for creative text and assistants.' },
    { id: 'gemini', label: 'Google Gemini (Nanobanana)', modelPlaceholder: 'nanobanana', description: 'High-speed multimodal engine. Powers Nanobanana Image Gen.' },
    { id: 'huggingface', label: 'Hugging Face Hub', modelPlaceholder: 'mistralai/Mistral-7B-v0.1', description: 'Open-weight models and specialized inference endpoints.' }
];

export const IMAGE_PROVIDERS: ProviderDefinition[] = [
    { id: 'google', label: 'Google Direct', modelPlaceholder: 'gemini-3.1-flash-image-preview', description: 'Direct Gemini API access for Nano Banana models.' },
    { id: 'replicate', label: 'Replicate', modelPlaceholder: 'stability-ai/sdxl', description: 'Image generation and model hosting.' },
    { id: 'fal', label: 'Fal', modelPlaceholder: 'fal-ai/flux/dev', description: 'Fast image generation APIs.' },
    { id: 'huggingface', label: 'Hugging Face', modelPlaceholder: 'black-forest-labs/FLUX.1-schnell', description: 'Model hub and inference APIs.' },
    { id: 'civitai', label: 'Civitai', modelPlaceholder: 'urn:air:sdxl:model:checkpoint:12345', description: 'Community model endpoints and checkpoints.' },
    { id: 'muapi', label: 'Muapi.ai', modelPlaceholder: 'nano-banana', description: 'Unified AI endpoint for NanoBanana and Flux.' },
    { id: 'xai', label: 'xAI (Grok)', modelPlaceholder: 'grok-imagine', description: 'xAI original models like Grok Imagine.' },
    { id: 'together', label: 'Together AI', modelPlaceholder: 'black-forest-labs/FLUX.1-schnell', description: 'High-speed open-source model inference.' }
];

export const VIDEO_PROVIDERS: ProviderDefinition[] = [
    { id: 'kling', label: 'Kling', modelPlaceholder: 'kling-1.5-pro', description: 'Video generation provider.' },
    { id: 'runway', label: 'Runway', modelPlaceholder: 'gen-3', description: 'Creative generation and video tools.' },
    { id: 'luma', label: 'Luma', modelPlaceholder: 'luma-reframe', description: 'Video and motion content generation.' },
    { id: 'veo', label: 'Veo', modelPlaceholder: 'veo-3', description: 'Google video generation family.' },
    { id: 'wan', label: 'Wan', modelPlaceholder: 'wan-2.1', description: 'Alternative video generation provider.' },
    { id: 'muapi', label: 'Muapi.ai Video (Seedance/Wan)', modelPlaceholder: 'seedance-pro', description: 'Unified API for Seedance, Wan, Kling, etc.' },
    { id: 'xai', label: 'xAI Video', modelPlaceholder: 'grok-imagine-t2v', description: 'T2V and I2V models by xAI.' }
];

export const ALL_PROVIDERS: ProviderDefinition[] = [...LLM_PROVIDERS, ...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS];
