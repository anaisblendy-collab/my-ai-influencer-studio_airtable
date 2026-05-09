import { generateImageAPI, checkAPIConnectivity } from '../apiUtils';

// Mock fetch globally
global.fetch = jest.fn();

describe('generateImageAPI', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('should successfully generate an image', async () => {
        const mockResponse = {
            success: true,
            record_id: 'rec123',
            image_url: 'https://example.com/image.jpg'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const params = {
            name: 'Alice',
            age: 25,
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion',
            style: 'Professionnel',
            model: 'stabilityai/stable-diffusion-xl-base-1.0',
            qualityMode: 'balanced',
            baseId: 'base123',
            tableId: 'table123'
        };

        const result = await generateImageAPI(params, 'hf_test_key', 'https://backend.example.com');

        expect(fetch).toHaveBeenCalledWith('https://backend.example.com/api/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Alice',
                age: 25,
                gender: 'female',
                ethnicity: 'caucasian',
                niche: 'fashion',
                style: 'Professionnel',
                model: 'stabilityai/stable-diffusion-xl-base-1.0',
                custom_prompt: null,
                lora: null,
                quality_mode: 'balanced',
                base_id: 'base123',
                table_id: 'table123'
            })
        });

        expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
        const mockErrorResponse = {
            detail: 'Invalid API key'
        };

        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => mockErrorResponse
        });

        const params = {
            name: 'Alice',
            age: 25,
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion',
            style: 'Professionnel'
        };

        await expect(generateImageAPI(params, 'invalid_key', 'https://backend.example.com')).rejects.toThrow('Invalid API key');
    });

    it('should handle network errors', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const params = {
            name: 'Alice',
            age: 25,
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion',
            style: 'Professionnel'
        };

        await expect(generateImageAPI(params, 'hf_test_key', 'https://backend.example.com')).rejects.toThrow('Network error');
    });
});

describe('checkAPIConnectivity', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('should return success for valid API key', async () => {
        const mockUserData = {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockUserData
        });

        const result = await checkAPIConnectivity('hf_valid_key');

        expect(fetch).toHaveBeenCalledWith('https://huggingface.co/api/whoami-v2', {
            headers: {
                'Authorization': 'Bearer hf_valid_key',
            },
        });

        expect(result.success).toBe(true);
        expect(result.user).toEqual(mockUserData);
    });

    it('should return error for invalid API key', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        });

        const result = await checkAPIConnectivity('hf_invalid_key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Erreur 401: Unauthorized');
    });

    it('should handle network connectivity issues', async () => {
        fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

        const result = await checkAPIConnectivity('hf_test_key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch');
    });

    it('should handle timeout errors', async () => {
        fetch.mockRejectedValueOnce(new Error('Timeout'));

        const result = await checkAPIConnectivity('hf_test_key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Timeout');
    });
});
