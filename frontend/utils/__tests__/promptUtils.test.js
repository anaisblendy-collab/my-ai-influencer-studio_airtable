import { buildImagePrompt, buildVideoPrompt, validateApiKey, validateGenerationParams } from '../promptUtils';

describe('buildImagePrompt', () => {
    it('should generate a custom prompt when provided', () => {
        const params = {
            customPrompt: 'A beautiful sunset over mountains'
        };
        expect(buildImagePrompt(params)).toBe('A beautiful sunset over mountains');
    });

    it('should generate a standard prompt for fashion niche', () => {
        const params = {
            name: 'Alice',
            age: '25',
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion',
            style: 'Professionnel'
        };

        const prompt = buildImagePrompt(params);
        expect(prompt).toContain('25 year old caucasian woman');
        expect(prompt).toContain('fashionable outfit, trendy style, high fashion aesthetic');
        expect(prompt).toContain('professionnel style');
        expect(prompt).toContain('instagram influencer aesthetic');
    });

    it('should handle different genders correctly', () => {
        const maleParams = { age: '30', gender: 'male', ethnicity: 'asian', niche: 'tech', style: 'Modern' };
        const femaleParams = { age: '28', gender: 'female', ethnicity: 'african', niche: 'beauty', style: 'Elegant' };
        const nonBinaryParams = { age: '22', gender: 'non-binary', ethnicity: 'latin', niche: 'lifestyle', style: 'Casual' };

        expect(buildImagePrompt(maleParams)).toContain('30 year old asian man');
        expect(buildImagePrompt(femaleParams)).toContain('28 year old african woman');
        expect(buildImagePrompt(nonBinaryParams)).toContain('22 year old latin person');
    });
});

describe('buildVideoPrompt', () => {
    it('should return custom motion prompt when provided', () => {
        const params = {
            motionPrompt: 'Slow zoom in with dramatic lighting'
        };
        expect(buildVideoPrompt(params)).toBe('Slow zoom in with dramatic lighting');
    });

    it('should generate standard video prompt for talking head', () => {
        const params = {
            videoType: 'talking_head',
            animationStyle: 'smooth'
        };

        const prompt = buildVideoPrompt(params);
        expect(prompt).toContain('natural talking motion, subtle head movements, engaging expression');
        expect(prompt).toContain('smooth motion style');
        expect(prompt).toContain('professional video quality');
    });

    it('should handle different video types', () => {
        const types = ['product_showcase', 'lifestyle', 'tutorial', 'review', 'unboxing'];

        types.forEach(type => {
            const params = { videoType: type, animationStyle: 'dynamic' };
            const prompt = buildVideoPrompt(params);
            expect(prompt).toContain('dynamic motion style');
            expect(prompt).toContain('professional video quality');
        });
    });
});

describe('validateApiKey', () => {
    it('should reject empty API key', () => {
        const result = validateApiKey('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Clé API requise');
    });

    it('should reject non-string API key', () => {
        const result = validateApiKey(12345);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Clé API doit être une chaîne');
    });

    it('should reject API key that is too short', () => {
        const result = validateApiKey('hf_short');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Clé API trop courte');
    });

    it('should reject API key with wrong format', () => {
        const result = validateApiKey('invalid_key_format_123456789');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Format de clé API invalide');
    });

    it('should accept valid Hugging Face API key format', () => {
        const result = validateApiKey('hf_abcdefghijklmnopqrstuvwxyz123456');
        expect(result.isValid).toBe(true);
    });
});

describe('validateGenerationParams', () => {
    it('should accept valid parameters', () => {
        const params = {
            name: 'Alice',
            age: 25,
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion'
        };

        const result = validateGenerationParams(params);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should accept parameters with custom prompt instead of name', () => {
        const params = {
            customPrompt: 'A beautiful portrait',
            age: 30,
            gender: 'male',
            ethnicity: 'asian',
            niche: 'tech'
        };

        const result = validateGenerationParams(params);
        expect(result.isValid).toBe(true);
    });

    it('should reject missing name and custom prompt', () => {
        const params = {
            age: 25,
            gender: 'female',
            ethnicity: 'caucasian',
            niche: 'fashion'
        };

        const result = validateGenerationParams(params);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Nom ou prompt personnalisé requis');
    });

    it('should reject invalid age', () => {
        const tooYoung = { name: 'Alice', age: 15, gender: 'female', ethnicity: 'caucasian', niche: 'fashion' };
        const tooOld = { name: 'Bob', age: 150, gender: 'male', ethnicity: 'asian', niche: 'tech' };

        expect(validateGenerationParams(tooYoung).isValid).toBe(false);
        expect(validateGenerationParams(tooOld).isValid).toBe(false);
        expect(validateGenerationParams(tooYoung).errors).toContain('Âge doit être entre 18 et 100 ans');
    });

    it('should reject missing required fields', () => {
        const missingNiche = { name: 'Alice', age: 25, gender: 'female', ethnicity: 'caucasian' };
        const missingGender = { name: 'Bob', age: 30, ethnicity: 'asian', niche: 'tech' };
        const missingEthnicity = { name: 'Charlie', age: 28, gender: 'male', niche: 'business' };

        expect(validateGenerationParams(missingNiche).errors).toContain('Niche requise');
        expect(validateGenerationParams(missingGender).errors).toContain('Genre requis');
        expect(validateGenerationParams(missingEthnicity).errors).toContain('Ethnicité requise');
    });
});