/**
 * AI Models Data - FLUX, WAN, LoRA Models
 */

export interface AIModel {
    id: string;
    name: string;
    description: string;
    apiId: string;
    tags: string[];
    speed: string;
    price: string;
    provider?: string;
}

export interface LoraConfig {
    id: string;
    name: string;
    type: 'character' | 'style' | 'outfit' | 'concept';
    source: 'replicate' | 'civitai' | 'huggingface' | 'local';
    path: string; // URL or path
    triggerWord?: string;
    strength: number; // 0.0 to 1.0
}

export interface BusinessPreset {
    id: string;
    name: string;
    description: string;
    baseModelId: string;
    loras: LoraConfig[];
    promptTemplate: string;
    negativePrompt?: string;
    defaultParams?: Record<string, any>;
}

export interface InfluencerProfile {
    id?: string;
    name: string;
    age: string;
    gender: string;
    niche: string;
    style: string;
    // Agency Fields
    mainCharacterLora?: LoraConfig;
    secondaryLoras?: LoraConfig[];
    preferredModelId?: string;
    presets?: BusinessPreset[];
    // Stats
    totalGenerations?: number;
    lastActive?: Date;
    avatarUrl?: string;
}

export const IMAGE_MODELS: AIModel[] = [
    {
        id: 'flux-schnell',
        name: 'FLUX.1 Schnell',
        description: 'Ultra fast, 4 steps, ideal for prototyping',
        apiId: 'black-forest-labs/FLUX.1-schnell',
        tags: ['fast', 'free', 'image'],
        speed: '~10s',
        price: 'Free',
        provider: 'HuggingFace'
    },
    {
        id: 'flux-dev',
        name: 'FLUX.1 Dev',
        description: 'High quality, 28 steps, professional grade',
        apiId: 'black-forest-labs/FLUX.1-dev',
        tags: ['premium', 'quality', 'image'],
        speed: '~45s',
        price: '$0.003',
        provider: 'Replicate'
    },
    {
        id: 'sdxl-base',
        name: 'Stable Diffusion XL',
        description: 'Standard versatile model, well-balanced',
        apiId: 'stabilityai/stable-diffusion-xl-base-1.0',
        tags: ['standard', 'image'],
        speed: '~30s',
        price: 'Free',
        provider: 'HuggingFace'
    },
    {
        id: 'realistic-vision',
        name: 'Realistic Vision V5',
        description: 'Ultra-realistic photos, perfect for influencers',
        apiId: 'SG161222/Realistic_Vision_V5.1_noVAE',
        tags: ['realistic', 'premium', 'image'],
        speed: '~35s',
        price: 'Free',
        provider: 'HuggingFace'
    }
];

export const VIDEO_MODELS: AIModel[] = [
    {
        id: 'wan-2-1',
        name: 'WAN 2.1',
        description: 'High-end Text-to-video (1.3B)',
        apiId: 'Wan-AI/Wan2.1-T2V-1.3B',
        tags: ['video', 'premium'],
        speed: '~60s',
        price: '$0.05',
        provider: 'HuggingFace'
    },
    {
        id: 'fal-svd',
        name: 'FAL SVD',
        description: 'Fast and fluid Image-to-video',
        apiId: 'stabilityai/stable-video-diffusion-img2vid-xt',
        tags: ['video', 'fast'],
        speed: '~30s',
        price: '$0.02',
        provider: 'Fal AI'
    }
];

export interface ModelGroup {
    id: string;
    title: string;
    description: string;
    items: AIModel[];
}

const SEEDANCE_MODELS: AIModel[] = [
    {
        id: 'seedance-1-5-pro',
        name: 'Seedance 1.5 Pro',
        description: 'Professional video generation tools',
        apiId: 'bytedance/seedance-1.5-pro',
        tags: ['video', 'premium'],
        speed: '~70s',
        price: '$0.06',
        provider: 'ByteDance'
    }
];

const WAN_MODELS: AIModel[] = [
    {
        id: 'wan-2-6',
        name: 'WAN 2.6',
        description: 'Unified text, image, and reference video',
        apiId: 'Wan-AI/Wan2.6-T2V',
        tags: ['video', 'premium'],
        speed: '~80s',
        price: '$0.07',
        provider: 'HuggingFace'
    },
    {
        id: 'wan-2-5',
        name: 'WAN 2.5',
        description: 'Audio-video generation in one step',
        apiId: 'Wan-AI/Wan2.5-T2V',
        tags: ['video', 'premium'],
        speed: '~75s',
        price: '$0.06',
        provider: 'HuggingFace'
    },
    {
        id: 'wan-2-2',
        name: 'WAN 2.2',
        description: 'Optimized for speed and quality',
        apiId: 'Wan-AI/Wan2.2-T2V',
        tags: ['video', 'fast'],
        speed: '~55s',
        price: '$0.05',
        provider: 'HuggingFace'
    }
];

const KLING_MODELS: AIModel[] = [
    {
        id: 'kling-o1',
        name: 'Kling O1',
        description: 'Unified audio-video generation',
        apiId: 'kling/Kling-O1',
        tags: ['video', 'premium'],
        speed: '~70s',
        price: '$0.06',
        provider: 'Kuaishou'
    },
    {
        id: 'kling-2',
        name: 'Kling 2',
        description: 'High realism video generation',
        apiId: 'kling/Kling-2',
        tags: ['video', 'premium'],
        speed: '~65s',
        price: '$0.06',
        provider: 'Kuaishou'
    }
];

const OPENAI_MODELS: AIModel[] = [
    {
        id: 'openai-image-1',
        name: 'OpenAI Image',
        description: 'State-of-the-art image generation',
        apiId: 'openai/image-1',
        tags: ['image', 'premium'],
        speed: '~25s',
        price: '$0.03',
        provider: 'OpenAI'
    }
];

const FLUX_MODELS: AIModel[] = [
    {
        id: 'flux-kontext',
        name: 'FLUX.1 Kontext',
        description: 'Context-aware image editing',
        apiId: 'black-forest-labs/FLUX.1-kontext',
        tags: ['image', 'editing'],
        speed: '~20s',
        price: '$0.02',
        provider: 'HuggingFace'
    }
];

const OTHER_MODELS: AIModel[] = [
    {
        id: 'seedream',
        name: 'Seedream',
        description: 'Unified image generation and editing',
        apiId: 'bytedance/seedream',
        tags: ['image', 'premium'],
        speed: '~30s',
        price: '$0.03',
        provider: 'ByteDance'
    },
    {
        id: 'dreamina',
        name: 'Dreamina',
        description: 'Advanced image and video generation',
        apiId: 'bytedance/dreamina',
        tags: ['image', 'video'],
        speed: '~40s',
        price: '$0.04',
        provider: 'ByteDance'
    },
    {
        id: 'minmax-hailuo-2-3',
        name: 'Minmax Hailuo 2.3',
        description: 'Video generation and speech synthesis',
        apiId: 'minmax/hailuo-2.3',
        tags: ['video', 'premium'],
        speed: '~60s',
        price: '$0.05',
        provider: 'Minmax'
    },
    {
        id: 'runwayml-gen',
        name: 'RunwayML',
        description: 'Video from images for stories and social',
        apiId: 'runwayml/gen-video',
        tags: ['video'],
        speed: '~50s',
        price: '$0.05',
        provider: 'RunwayML'
    },
    {
        id: 'hunyuan-video',
        name: 'Hunyuan Video',
        description: '3D aware, temporal consistency',
        apiId: 'tencent/hunyuan-video',
        tags: ['video', 'premium'],
        speed: '~65s',
        price: '$0.06',
        provider: 'Tencent'
    },
    {
        id: 'vidu',
        name: 'Vidu',
        description: 'Multi specialized video generation',
        apiId: 'shengshu/vidu',
        tags: ['video'],
        speed: '~55s',
        price: '$0.05',
        provider: 'Shengshu'
    }
];

export const MODEL_GROUPS: ModelGroup[] = [
    {
        id: 'seedance',
        title: 'Seedance Models',
        description: 'ByteDance Seedance professional video tools',
        items: SEEDANCE_MODELS
    },
    {
        id: 'wan',
        title: 'WAN Models',
        description: 'Unified audio-video generation suite',
        items: WAN_MODELS
    },
    {
        id: 'kling',
        title: 'Kling Models',
        description: 'High realism video generation models',
        items: KLING_MODELS
    },
    {
        id: 'openai',
        title: 'OpenAI Models',
        description: 'State-of-the-art text, image, and multimodal',
        items: OPENAI_MODELS
    },
    {
        id: 'flux',
        title: 'Flux Models',
        description: 'Fast, high-quality image generation and editing',
        items: FLUX_MODELS
    },
    {
        id: 'other',
        title: 'Other Models',
        description: 'Additional image and video engines',
        items: OTHER_MODELS
    }
];

export const LORA_MODELS: AIModel[] = [
    {
        id: 'fashion-portrait',
        name: 'Fashion Portrait LoRA',
        description: 'Elegant portrait lighting style',
        apiId: 'fashion-portrait-lora',
        tags: ['lora', 'fashion'],
        speed: '+5s',
        price: 'Free'
    },
    {
        id: 'cinematic-style',
        name: 'Cinematic Style LoRA',
        description: 'Professional cinema effects',
        apiId: 'cinematic-style-lora',
        tags: ['lora', 'cinematic'],
        speed: '+5s',
        price: 'Free'
    }
];

export const NICHES = [
    { value: 'fashion', label: 'Fashion' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'adult', label: 'Adult' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'beauty', label: 'Beauty' }
];

export const STYLES = [
    { value: 'glamour', label: 'Glamour' },
    { value: 'natural', label: 'Natural' },
    { value: 'athletic', label: 'Athletic' },
    { value: 'casual', label: 'Casual' },
    { value: 'professional', label: 'Professional' }
];

export const GENDERS = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'non-binary', label: 'Non-binary' }
];

export const MOCK_LORAS: LoraConfig[] = [
    { id: '1', name: 'Emma Face V2', type: 'character', source: 'replicate', path: 'emma_v2.safetensors', strength: 1.0 },
    { id: '2', name: 'Cinematic Lighting', type: 'style', source: 'civitai', path: 'cinematic_light', strength: 0.8 },
    { id: '3', name: 'Urban Streetwear', type: 'outfit', source: 'local', path: 'streetwear_collection', strength: 0.7 },
];

export const MOCK_PRESETS: BusinessPreset[] = [
    {
        id: 'insta-lifestyle',
        name: 'Instagram Lifestyle',
        description: 'Natural light, iPhone aesthetic, casual',
        baseModelId: 'flux-dev',
        loras: [],
        promptTemplate: 'posted on instagram, phone photo, {prompt}, natural lighting, high quality',
        defaultParams: { steps: 25, guidance: 3.5 }
    },
    {
        id: 'cinematic-ultra',
        name: 'Cinematic 8K',
        description: 'Movie scene, dramatic lighting, detailed',
        baseModelId: 'flux-dev',
        loras: [MOCK_LORAS[1]],
        promptTemplate: 'cinematic shot, 8k, detailed, dramatic lighting, {prompt}, depth of field',
        defaultParams: { steps: 30, guidance: 6.0 }
    },
    {
        id: 'fashion-editorial',
        name: 'Fashion Editorial',
        description: 'Studio lighting, vogue style, sharp focus',
        baseModelId: 'realistic-vision',
        loras: [MOCK_LORAS[0]],
        promptTemplate: 'fashion editorial, magazine cover, studio lighting, {prompt}, sharp focus',
        defaultParams: { steps: 40, guidance: 7.0 }
    }
];
