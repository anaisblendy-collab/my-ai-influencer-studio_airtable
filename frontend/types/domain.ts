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
    path: string;
    triggerWord?: string;
    strength: number;
}

export interface BusinessPreset {
    id: string;
    name: string;
    description: string;
    baseModelId: string;
    capability?: 'image' | 'video' | 'edit';
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
    origin: string;
    niche: string;
    style: string;
    mainCharacterLora?: LoraConfig;
    secondaryLoras?: LoraConfig[];
    preferredModelId?: string;
    presets?: BusinessPreset[];
    totalGenerations?: number;
    lastActive?: Date;
    avatarUrl?: string;
}
