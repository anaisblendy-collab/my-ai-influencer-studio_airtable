/**
 * LoRA Service - API calls for LoRA management
 */

import type {
    LoraCatalogItem,
    LoraCatalogResponse,
    LoraTestRequest,
    LoraTestResponse,
    LoraSaveRequest,
    LoraAirtableItem
} from './backend';

export class LoraService {
    private apiBaseUrl: string = 'https://backend-fastapi1.onrender.com';

    constructor(apiBaseUrl: string = '') {
        if (apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
        }
    }

    setBaseUrl(url: string) {
        if (url) {
            this.apiBaseUrl = url.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
        }
    }

    async getLoraCatalog(params?: {
        query?: string;
        types?: string;
        base_models?: string;
        sort?: string;
        page?: number;
        limit?: number;
        nsfw?: boolean;
        civitaiApiKey?: string;
    }): Promise<LoraCatalogResponse> {
        const queryParams = new URLSearchParams();
        if (params?.query) queryParams.append('query', params.query);
        if (params?.types) queryParams.append('types', params.types);
        if (params?.base_models) queryParams.append('base_models', params.base_models);
        if (params?.sort) queryParams.append('sort', params.sort);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.nsfw !== undefined) queryParams.append('nsfw', params.nsfw.toString());

        const headers: Record<string, string> = {};
        if (params?.civitaiApiKey) {
            headers['X-Civitai-API-Key'] = params.civitaiApiKey;
        }

        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/catalog?${queryParams.toString()}`, {
            headers
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch LoRA catalog');
        }
        return await response.json();
    }

    async getLoraDetails(modelId: number): Promise<LoraCatalogItem> {
        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/${modelId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch LoRA details');
        }
        return await response.json();
    }

    async testLora(request: LoraTestRequest): Promise<LoraTestResponse> {
        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/test`, {
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
        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/save`, {
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
        const queryParams = new URLSearchParams();
        queryParams.append('base_id', baseId);
        if (tableName) queryParams.append('table_name', tableName);

        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/${recordId}?${queryParams.toString()}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to delete LoRA');
        }
        return await response.json();
    }

    async listLorasFromAirtable(baseId: string, tableName?: string, typeFilter?: string): Promise<{ success: boolean; total: number; items: LoraAirtableItem[] }> {
        const queryParams = new URLSearchParams();
        queryParams.append('base_id', baseId);
        if (tableName) queryParams.append('table_name', tableName);
        if (typeFilter) queryParams.append('type_filter', typeFilter);

        const response = await fetch(`${this.apiBaseUrl}/api/v1/lora/airtable/list?${queryParams.toString()}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to list LoRAs');
        }
        return await response.json();
    }
}

// Export singleton instance
export const loraService = new LoraService();
