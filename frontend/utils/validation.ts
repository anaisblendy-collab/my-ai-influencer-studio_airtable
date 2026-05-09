import { z } from 'zod';

/**
 * Common Zod schemas for Neural Engine parameters
 */
export const CommonSchemas = {
    prompt: z.string().min(1, "Prompt cannot be empty").max(2000, "Prompt is too long"),
    aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '3:2', '2:3']),
    duration: z.number().min(1).max(10).default(5),
    creativity: z.number().min(0).max(100).default(50),
    resemblance: z.number().min(0).max(100).default(70),
    resolution: z.enum(['720p', '1080p', '4k']),
    imageUrl: z.string().url("Invalid image URL").or(z.string().startsWith('blob:')),
};

/**
 * Node-specific parameter schemas
 */
export const NodeParamSchemas: Record<string, z.ZodObject<any>> = {
    'flux_pro_1_1': z.object({
        prompt: CommonSchemas.prompt,
        aspectRatio: CommonSchemas.aspectRatio.default('9:16'),
    }),
    'seedance_lite_1_5': z.object({
        prompt: CommonSchemas.prompt,
        duration: CommonSchemas.duration,
        aspectRatio: CommonSchemas.aspectRatio.default('16:9'),
        resolution: CommonSchemas.resolution.default('720p'),
    }),
    'magnific_upscale': z.object({
        mode: z.enum(['ultra', 'high', 'balanced']).default('ultra'),
        resolution: z.enum(['2k', '4k']).default('4k'),
        creativity: CommonSchemas.creativity,
        resemblance: CommonSchemas.resemblance,
    }),
    'magnific_kling_2_6': z.object({
        prompt: CommonSchemas.prompt,
        duration: CommonSchemas.duration,
    }),
    'prompt_input': z.object({
        text: CommonSchemas.prompt,
    }),
    'image_input': z.object({
        url: CommonSchemas.imageUrl,
    })
};

/**
 * Validates a node's parameters against its schema
 * @returns { success: boolean, errors?: Record<string, string> }
 */
export function validateNodeParams(type: string, params: Record<string, any>) {
    const schema = NodeParamSchemas[type];
    if (!schema) return { success: true }; // No specific schema, assume valid

    const result = schema.safeParse(params);
    if (result.success) return { success: true };

    const errors: Record<string, string> = {};
    result.error.issues.forEach(issue => {
        const path = issue.path[0] as string;
        errors[path] = issue.message;
    });

    return { success: false, errors };
}
