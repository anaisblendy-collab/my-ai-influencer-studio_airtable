/**
 * Schema Adapter Utility
 * Converts Replicate/OpenAPI schemas to UI-friendly form configurations.
 * Inspired by WaveSpeed's schemaToForm logic.
 */

export interface FormFieldConfig {
    name: string;
    type: 'text' | 'textarea' | 'number' | 'slider' | 'boolean' | 'select' | 'file' | 'loras';
    label: string;
    required: boolean;
    default?: any;
    min?: number;
    max?: number;
    step?: number;
    options?: (string | number)[];
    description?: string;
    placeholder?: string;
}

/**
 * Converts a Replicate OpenAPI schema (input object) to a list of form fields
 */
export function replicateSchemaToFields(schema: any): FormFieldConfig[] {
    if (!schema || !schema.properties) return [];

    const properties = schema.properties;
    const required = schema.required || [];
    const fields: FormFieldConfig[] = [];

    for (const [name, prop] of Object.entries(properties) as [string, any][]) {
        // Skip common internal or unneeded fields
        if (['webhook', 'webhook_events_filter'].includes(name)) continue;

        const field = mapPropertyToField(name, prop, required.includes(name));
        if (field) {
            fields.push(field);
        }
    }

    // Sort: Prompt and essential fields first
    return fields.sort((a, b) => {
        if (a.name === 'prompt') return -1;
        if (b.name === 'prompt') return 1;
        if (a.required && !b.required) return -1;
        if (!a.required && b.required) return 1;
        return a.name.localeCompare(b.name);
    });
}

function mapPropertyToField(name: string, prop: any, isRequired: boolean): FormFieldConfig | null {
    const label = prop.title || formatLabel(name);
    const description = prop.description || '';

    const baseField: any = {
        name,
        label,
        required: isRequired,
        default: prop.default,
        description,
    };

    // Check for enums (select)
    if (prop.enum && prop.enum.length > 0) {
        return {
            ...baseField,
            type: 'select',
            options: prop.enum
        };
    }

    // Map types
    switch (prop.type) {
        case 'string':
            if (name.toLowerCase().includes('prompt') || description.length > 100) {
                return { ...baseField, type: 'textarea' };
            }
            if (name.toLowerCase().includes('image') || name.toLowerCase().includes('mask')) {
                return { ...baseField, type: 'file' };
            }
            return { ...baseField, type: 'text' };

        case 'integer':
        case 'number':
            const isSlider = prop.minimum !== undefined && prop.maximum !== undefined;
            return {
                ...baseField,
                type: isSlider ? 'slider' : 'number',
                min: prop.minimum,
                max: prop.maximum,
                step: prop.type === 'integer' ? 1 : 0.01
            };

        case 'boolean':
            return { ...baseField, type: 'boolean' };

        case 'array':
            // Special case for LoRAs
            if (name.toLowerCase().includes('lora')) {
                return { ...baseField, type: 'loras' };
            }
            return null;

        default:
            return { ...baseField, type: 'text' };
    }
}

function formatLabel(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function extractDefaultsFromSchema(fields: FormFieldConfig[]): Record<string, any> {
    const defaults: Record<string, any> = {};
    fields.forEach(f => {
        if (f.default !== undefined) {
            defaults[f.name] = f.default;
        } else if (f.type === 'boolean') {
            defaults[f.name] = false;
        }
    });
    return defaults;
}
