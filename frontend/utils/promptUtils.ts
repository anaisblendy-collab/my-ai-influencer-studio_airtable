// Utility functions for generating AI prompts

interface ImagePromptParams {
    name?: string;
    age?: number;
    gender?: string;
    ethnicity?: string;
    niche?: string;
    style?: string;
    customPrompt?: string;
}

interface VideoPromptParams {
    videoType?: string;
    animationStyle?: string;
    motionPrompt?: string;
}

interface ValidationResult {
    isValid: boolean;
    error?: string;
    errors?: string[];
}

const genderMap: Record<string, string> = {
    'female': 'woman',
    'male': 'man',
    'non-binary': 'person'
};

const nichePrompts: Record<string, string> = {
    'fashion': 'fashionable outfit, trendy style, high fashion aesthetic',
    'fitness': 'athletic wear, fit body, fitness environment',
    'travel': 'travel outfit, adventure style, scenic setting',
    'food': 'chef attire, culinary environment, food styling',
    'tech': 'modern tech aesthetic, professional workspace',
    'beauty': 'glamorous makeup, beauty aesthetic, elegant styling',
    'lifestyle': 'casual chic, lifestyle aesthetic, authentic vibe',
    'business': 'business professional, corporate attire, executive presence'
};

const motionPrompts: Record<string, string> = {
    'talking_head': 'natural talking motion, subtle head movements, engaging expression',
    'product_showcase': 'smooth product rotation, professional presentation',
    'lifestyle': 'casual lifestyle movements, authentic actions',
    'tutorial': 'instructional gestures, clear demonstrations',
    'review': 'expressive reactions, dynamic engagement',
    'unboxing': 'excited unboxing motions, product reveal'
};

export const buildImagePrompt = (params: ImagePromptParams): string => {
    const { name, age, gender, ethnicity, niche, style, customPrompt } = params;

    if (customPrompt) return customPrompt;

    let prompt = `professional portrait photo of a ${age} year old ${ethnicity} ${gender ? genderMap[gender] : 'person'}, `;
    prompt += `${niche ? nichePrompts[niche] : 'general aesthetic'}, ${style ? style.toLowerCase() : 'natural'} style, `;
    prompt += `high quality photography, natural lighting, instagram influencer aesthetic, `;
    prompt += `detailed face, perfect composition, 8k uhd, dslr quality`;

    return prompt;
};

export const buildVideoPrompt = (params: VideoPromptParams): string => {
    const { videoType, animationStyle, motionPrompt } = params;

    if (motionPrompt) return motionPrompt;

    return `${videoType ? motionPrompts[videoType] : 'natural motion'}, ${animationStyle || 'smooth'} motion style, professional video quality`;
};

export const validateApiKey = (apiKey: string): ValidationResult => {
    if (!apiKey) return { isValid: false, error: 'Clé API requise' };
    if (typeof apiKey !== 'string') return { isValid: false, error: 'Clé API doit être une chaîne' };
    if (apiKey.length < 10) return { isValid: false, error: 'Clé API trop courte' };
    // Basic check for Hugging Face API key format (starts with hf_)
    if (!apiKey.startsWith('hf_')) return { isValid: false, error: 'Format de clé API invalide' };
    return { isValid: true };
};

export const validateGenerationParams = (params: ImagePromptParams): ValidationResult => {
    const errors: string[] = [];

    if (!params.name && !params.customPrompt) {
        errors.push('Nom ou prompt personnalisé requis');
    }

    if (params.age && (params.age < 18 || params.age > 100)) {
        errors.push('Âge doit être entre 18 et 100 ans');
    }

    if (!params.niche) {
        errors.push('Niche requise');
    }

    if (!params.gender) {
        errors.push('Genre requis');
    }

    if (!params.ethnicity) {
        errors.push('Ethnicité requise');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};