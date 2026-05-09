// Type definitions for the AI Influencer extension

export interface Model {
    id: string;
    name: string;
    speed: string;
}

export interface Lora {
    id: string;
    name: string;
    strength: number;
}

export interface Template {
    id: string;
    name: string;
    desc: string;
    engagement: string;
    niche: string;
}

export interface QualityMode {
    value: string;
    label: string;
    steps: number;
    time: string;
}

export interface Stats {
    totalContents: number;
    thisWeek: number;
    totalRevenue: number;
    creditsUsed: number;
    creditsLimit: number;
}

export interface GenerateRequestData {
    name?: string;
    age?: number;
    niche?: string;
    style?: string;
    custom_prompt?: string | null;
    ai_provider: string;
    model: string;
    steps: number;
    guidance_scale: number;
    influencer_id: string;
}

export interface ApiResponse {
    message: string;
    generation_time: number;
    [key: string]: any;
}

export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
    error?: string;
}

export interface ImagePromptParams {
    name?: string;
    age?: number;
    gender?: string;
    ethnicity?: string;
    niche?: string;
    style?: string;
    customPrompt?: string;
}

export interface VideoPromptParams {
    videoType?: string;
    animationStyle?: string;
    motionPrompt?: string;
}