// API utility functions for Hugging Face integration

interface GenerateImageParams {
    name?: string;
    age?: string | number;
    gender?: string;
    ethnicity?: string;
    niche?: string;
    style?: string;
    model?: string;
    customPrompt?: string;
    qualityMode?: string;
    baseId?: string;
    tableId?: string;
}

interface GenerateVideoParams {
    // Define video params when implemented
    [key: string]: any;
}

interface APIResponse {
    success: boolean;
    user?: any;
    error?: string;
}

export const generateImageAPI = async (params: GenerateImageParams, apiKey?: string, baseUrl?: string): Promise<any> => {
    const { name, age, gender, ethnicity, niche, style, model, customPrompt, qualityMode, baseId, tableId } = params;
    const apiBaseUrl = (baseUrl || '').trim();
    if (!apiBaseUrl) {
        throw new Error('Backend URL is not configured');
    }

    const response = await fetch(`${apiBaseUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: name || `Influenceur_${Date.now()}`,
            age: typeof age === 'string' ? parseInt(age) : age,
            gender,
            ethnicity,
            niche,
            style,
            model,
            custom_prompt: customPrompt || null,
            lora: null,
            quality_mode: qualityMode,
            base_id: baseId,
            table_id: tableId
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Erreur backend: ${response.status}`);
    }

    return await response.json();
};

export const generateVideoAPI = async (params: GenerateVideoParams, apiKey?: string): Promise<any> => {
    // This would be implemented when video generation is ready
    throw new Error('Génération vidéo pas encore implémentée');
};

export const checkAPIConnectivity = async (apiKey: string): Promise<APIResponse> => {
    try {
        // Simple API check - try to get user info
        const response = await fetch('https://huggingface.co/api/whoami-v2', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (response.ok) {
            const userData = await response.json();
            return { success: true, user: userData };
        } else {
            return { success: false, error: `Erreur ${response.status}: ${response.statusText}` };
        }
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};
