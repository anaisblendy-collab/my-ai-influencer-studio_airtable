import type { BusinessPreset, LoraConfig } from '../types/domain';

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
        baseModelId: 'flux-2-2',
        capability: 'image',
        loras: [],
        promptTemplate: 'posted on instagram, phone photo, {prompt}, natural lighting, high quality',
        defaultParams: { steps: 25, guidance: 3.5 }
    },
    {
        id: 'cinematic-ultra',
        name: 'Cinematic 8K',
        description: 'Movie scene, dramatic lighting, detailed',
        baseModelId: 'nanobana-pro',
        capability: 'image',
        loras: [MOCK_LORAS[1]],
        promptTemplate: 'cinematic shot, 8k, detailed, dramatic lighting, {prompt}, depth of field',
        defaultParams: { steps: 30, guidance: 6.0 }
    },
    {
        id: 'fashion-editorial',
        name: 'Fashion Editorial',
        description: 'Studio lighting, vogue style, sharp focus',
        baseModelId: 'seedream',
        capability: 'image',
        loras: [MOCK_LORAS[0]],
        promptTemplate: 'fashion editorial, magazine cover, studio lighting, {prompt}, sharp focus',
        defaultParams: { steps: 40, guidance: 7.0 }
    }
];
