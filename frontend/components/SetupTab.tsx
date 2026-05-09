import React, { useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { backendService } from '../services/backend';

type FieldConfig = { key: string; label: string };

const influencerFields: FieldConfig[] = [
    { key: 'influencerNameFieldId', label: 'Name' },
    { key: 'influencerAgeFieldId', label: 'Age' },
    { key: 'influencerGenderFieldId', label: 'Gender' },
    { key: 'influencerNicheFieldId', label: 'Niche' },
    { key: 'influencerStyleFieldId', label: 'Style' },
    { key: 'influencerAvatarFieldId', label: 'Avatar' },
    { key: 'influencerStatusFieldId', label: 'Status' },
    { key: 'influencerApprovedFieldId', label: 'Approved' }
];

const queueFields: FieldConfig[] = [
    { key: 'queuePromptFieldId', label: 'Prompt' },
    { key: 'queueProviderFieldId', label: 'Provider' },
    { key: 'queueModelFieldId', label: 'Model' },
    { key: 'queueStatusFieldId', label: 'Status' },
    { key: 'queueOutputFieldId', label: 'Output Media' },
    { key: 'queueErrorFieldId', label: 'Error' },
    { key: 'queueCostFieldId', label: 'Cost' }
];

const contentFields: FieldConfig[] = [
    { key: 'contentOutputFieldId', label: 'Output Media' },
    { key: 'contentInfluencerFieldId', label: 'Influencer Link' },
    { key: 'contentPlatformFieldId', label: 'Platform' },
    { key: 'contentApprovedFieldId', label: 'Approved' },
    { key: 'contentStorageUrlFieldId', label: 'Storage URL' },
    { key: 'contentPublishToFieldId', label: 'Publish To' }
];

const contentMediaFields: FieldConfig[] = [
    { key: 'contentMediaNameFieldId', label: 'Name' },
    { key: 'contentMediaUrlFieldId', label: 'Media URL' },
    { key: 'contentMediaStorageUrlFieldId', label: 'Storage URL' },
    { key: 'contentMediaTypeFieldId', label: 'Media Type' },
    { key: 'contentMediaOrderFieldId', label: 'Order' },
    { key: 'contentMediaContentFieldId', label: 'Content Link' },
    { key: 'contentMediaInfluencerFieldId', label: 'Influencer Link' }
];

const assetsFields: FieldConfig[] = [
    { key: 'assetNameFieldId', label: 'Name' },
    { key: 'assetTypeFieldId', label: 'Type' },
    { key: 'assetProviderFieldId', label: 'Provider' },
    { key: 'assetSourceUrlFieldId', label: 'Source URL' },
    { key: 'assetTriggerFieldId', label: 'Trigger' },
    { key: 'assetStrengthFieldId', label: 'Strength' },
    { key: 'assetInfluencerFieldId', label: 'Influencer Link' },
    { key: 'assetFileFieldId', label: 'File' }
];

const promptsFields: FieldConfig[] = [
    { key: 'promptTextFieldId', label: 'Prompt Text' },
    { key: 'promptStatusFieldId', label: 'Status' },
    { key: 'promptStyleFieldId', label: 'Style' },
    { key: 'promptPlatformFieldId', label: 'Platform' },
    { key: 'promptReferenceFieldId', label: 'Reference Image' }
];

const backendFields: FieldConfig[] = [
    { key: 'backendUrl', label: 'Backend API URL' }
];

// Global configurations stored in GlobalConfig
// Using default production backend URL to ensure plug-and-play functionality
const DEFAULT_BACKEND_URL = 'https://backend-fastapi1.onrender.com';

export function SetupTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const [autoMapResult, setAutoMapResult] = React.useState<string>('');
    const [schemaStatus, setSchemaStatus] = React.useState<string>('');
    const [schemaDetails, setSchemaDetails] = React.useState<string[]>([]);
    const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false);
    const [isCreatingSchema, setIsCreatingSchema] = React.useState<boolean>(false);
    const [schemaStep, setSchemaStep] = React.useState<number>(0);
    const [schemaProgress, setSchemaProgress] = React.useState<number>(0);
    const canSetConfig = globalConfig.hasPermissionToSet();
    const permissionCheck = globalConfig.checkPermissionsForSet();
    const permissionReason = !permissionCheck.hasPermission ? permissionCheck.reasonDisplayString : '';

    const [showSystemSettings, setShowSystemSettings] = React.useState<boolean>(false);
    const [billingInfo, setBillingInfo] = React.useState<{ credits: number; is_premium: boolean } | null>(null);

    // Fetch Billing Status
    React.useEffect(() => {
        const fetchBilling = async () => {
            try {
                const status = await backendService.getBillingStatus(base.id);
                setBillingInfo({ credits: status.credits, is_premium: status.is_premium });
            } catch (err) {
                console.error('Failed to fetch billing status:', err);
                // Fallback to static info if backend is not reachable
                setBillingInfo({ credits: 0, is_premium: false });
            }
        };
        fetchBilling();
    }, [base.id]);

    // SECURITY PURGE: Remove sensitive keys from globalConfig on load
    React.useEffect(() => {
        if (canSetConfig) {
            const sensitiveKeys = ['huggingfaceApiKey', 'geminiApiKey', 'replicateApiToken', 'openrouterApiKey', 'replicateApiKey'];
            sensitiveKeys.forEach(key => {
                if (globalConfig.get(key)) {
                    console.log(`🔒 Security Purge: Removing ${key} from globalConfig`);
                    globalConfig.setAsync(key, undefined).catch(() => {});
                }
            });
        }
    }, [canSetConfig, globalConfig]);

    const tables = base.tables;
    const influencersTableId = globalConfig.get('influencersTableId') as string | undefined;
    const promptsTableId = globalConfig.get('promptsTableId') as string | undefined;
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const contentTableId = globalConfig.get('contentTableId') as string | undefined;
    const contentMediaTableId = globalConfig.get('contentMediaTableId') as string | undefined;
    const assetsTableId = globalConfig.get('assetsTableId') as string | undefined;


    const getFieldsForTable = (tableId?: string) => {
        if (!tableId) return [];
        const table = base.getTableByIdIfExists(tableId);
        return table ? table.fields : [];
    };

    const influencerFieldOptions = React.useMemo(() => getFieldsForTable(influencersTableId), [influencersTableId]);
    const promptFieldOptions = React.useMemo(() => getFieldsForTable(promptsTableId), [promptsTableId]);
    const queueFieldOptions = React.useMemo(() => getFieldsForTable(queueTableId), [queueTableId]);
    const contentFieldOptions = React.useMemo(() => getFieldsForTable(contentTableId), [contentTableId]);
    const contentMediaFieldOptions = React.useMemo(() => getFieldsForTable(contentMediaTableId), [contentMediaTableId]);
    const assetsFieldOptions = React.useMemo(() => getFieldsForTable(assetsTableId), [assetsTableId]);

    const setConfig = (key: string, value: string) => {
        if (!canSetConfig) {
            setSchemaStatus(`Permission required: ${permissionReason || 'read-only access'}`);
            return;
        }
        globalConfig.setAsync(key, value);
    };

    const handleAutoMap = () => {
        if (!canSetConfig) {
            setAutoMapResult(`Permission required: ${permissionReason || 'read-only access'}`);
            return;
        }
        let found = 0;
        const autoPickTable = (key: string, names: string[]) => {
            if (globalConfig.get(key)) return;
            const table = base.tables.find((t) => names.some((n) => t.name.toLowerCase() === n.toLowerCase()));
            if (table) {
                globalConfig.setAsync(key, table.id);
                found += 1;
            }
        };
        autoPickTable('influencersTableId', ['Influencers', 'Influencer']);
        autoPickTable('promptsTableId', ['Prompts', 'Prompt']);
        autoPickTable('queueTableId', ['Production Queue', 'Queue', 'Production']);
        autoPickTable('contentTableId', ['Content', 'Contenu', 'Contenus', 'Outputs']);
        autoPickTable('contentMediaTableId', ['Content Media', 'Media Items', 'Media du contenu']);

        const autoPickField = (tableId: string | undefined, fieldKey: string, names: string[], preferredTypes?: string[]) => {
            if (!tableId || globalConfig.get(fieldKey)) return;
            const table = base.getTableByIdIfExists(tableId);
            if (!table) return;
            const byName = table.fields.find((f) => names.some((n) => f.name.toLowerCase() === n.toLowerCase()));
            if (byName) {
                globalConfig.setAsync(fieldKey, byName.id);
                found += 1;
                return;
            }
            if (preferredTypes) {
                const candidates = table.fields.filter((f) => preferredTypes.includes(f.type));
                if (candidates.length === 1) {
                    globalConfig.setAsync(fieldKey, candidates[0].id);
                    found += 1;
                }
            }
        };
        const influencersId = globalConfig.get('influencersTableId') as string | undefined;
        const queueId = globalConfig.get('queueTableId') as string | undefined;
        const contentId = globalConfig.get('contentTableId') as string | undefined;
        autoPickField(influencersId, 'influencerNameFieldId', ['Name']);
        autoPickField(influencersId, 'influencerAgeFieldId', ['Age']);
        autoPickField(influencersId, 'influencerGenderFieldId', ['Gender']);
        autoPickField(influencersId, 'influencerNicheFieldId', ['Niche']);
        autoPickField(influencersId, 'influencerStyleFieldId', ['Style']);
        autoPickField(influencersId, 'influencerAvatarFieldId', ['Avatar', 'Photo']);
        autoPickField(influencersId, 'influencerStatusFieldId', ['Status', 'State']);
        autoPickField(influencersId, 'influencerApprovedFieldId', ['Approved']);

        autoPickField(queueId, 'queuePromptFieldId', ['Prompt', 'Prompt Text']);
        autoPickField(queueId, 'queueProviderFieldId', ['Provider']);
        autoPickField(queueId, 'queueModelFieldId', ['Model']);
        autoPickField(queueId, 'queueStatusFieldId', ['Status']);
        autoPickField(queueId, 'queueOutputFieldId', ['Output', 'Output Media'], ['multipleAttachments']);
        autoPickField(queueId, 'queueErrorFieldId', ['Error']);
        autoPickField(queueId, 'queueCostFieldId', ['Cost']);

        autoPickField(contentId, 'contentOutputFieldId', ['Output', 'Output Media', 'Media'], ['multipleAttachments']);
        autoPickField(contentId, 'contentInfluencerFieldId', ['Influencer'], ['multipleRecordLinks']);
        autoPickField(contentId, 'contentPlatformFieldId', ['Platform']);
        autoPickField(contentId, 'contentApprovedFieldId', ['Approved']);
        autoPickField(contentId, 'contentStorageUrlFieldId', ['Storage URL', 'URL de stockage']);
        autoPickField(contentId, 'contentPublishToFieldId', ['Publish To', 'Publier vers']);

        const contentMediaId = globalConfig.get('contentMediaTableId') as string | undefined;
        autoPickField(contentMediaId, 'contentMediaNameFieldId', ['Name']);
        autoPickField(contentMediaId, 'contentMediaUrlFieldId', ['Media URL']);
        autoPickField(contentMediaId, 'contentMediaStorageUrlFieldId', ['Storage URL']);
        autoPickField(contentMediaId, 'contentMediaTypeFieldId', ['Media Type']);
        autoPickField(contentMediaId, 'contentMediaOrderFieldId', ['Order']);
        autoPickField(contentMediaId, 'contentMediaContentFieldId', ['Content'], ['multipleRecordLinks']);
        autoPickField(contentMediaId, 'contentMediaInfluencerFieldId', ['Influencer'], ['multipleRecordLinks']);

        const assetsId = globalConfig.get('assetsTableId') as string | undefined;
        autoPickField(assetsId, 'assetNameFieldId', ['Name']);
        autoPickField(assetsId, 'assetTypeFieldId', ['Type']);
        autoPickField(assetsId, 'assetProviderFieldId', ['Provider']);
        autoPickField(assetsId, 'assetSourceUrlFieldId', ['Source URL', 'SourceUrl', 'Link']);
        autoPickField(assetsId, 'assetTriggerFieldId', ['Trigger', 'Trigger Words']);
        autoPickField(assetsId, 'assetStrengthFieldId', ['Strength']);
        autoPickField(assetsId, 'assetInfluencerFieldId', ['Influencer', 'Influencer Link', 'LinkedInfluencer'], ['multipleRecordLinks']);
        autoPickField(assetsId, 'assetFileFieldId', ['File', 'Media'], ['multipleAttachments']);

        setAutoMapResult(`Auto-Map done: ${found} fields/tables found`);
    };

    const handleClearMapping = () => {
        if (!canSetConfig) {
            setAutoMapResult(`Permission required: ${permissionReason || 'read-only access'}`);
            return;
        }
        const keys = [
            'influencersTableId',
            'promptsTableId',
            'queueTableId',
            'contentTableId',
            'influencerNameFieldId',
            'influencerAgeFieldId',
            'influencerGenderFieldId',
            'influencerNicheFieldId',
            'influencerStyleFieldId',
            'influencerAvatarFieldId',
            'influencerStatusFieldId',
            'influencerApprovedFieldId',
            'queuePromptFieldId',
            'queueProviderFieldId',
            'queueModelFieldId',
            'queueStatusFieldId',
            'queueOutputFieldId',
            'queueErrorFieldId',
            'queueCostFieldId',
            'contentOutputFieldId',
            'contentInfluencerFieldId',
            'contentPlatformFieldId',
            'contentApprovedFieldId',
            'contentStorageUrlFieldId',
            'contentPublishToFieldId',
            'contentMediaNameFieldId',
            'contentMediaUrlFieldId',
            'contentMediaStorageUrlFieldId',
            'contentMediaTypeFieldId',
            'contentMediaOrderFieldId',
            'contentMediaContentFieldId',
            'contentMediaInfluencerFieldId',
            'assetNameFieldId',
            'assetTypeFieldId',
            'assetProviderFieldId',
            'assetSourceUrlFieldId',
            'assetTriggerFieldId',
            'assetStrengthFieldId',
            'assetInfluencerFieldId',
            'assetFileFieldId'
        ];
        keys.forEach((key) => globalConfig.setAsync(key, null));
        setAutoMapResult('Mapping cleared.');
    };

    const updateProgress = (step: number, label: string, progress: number) => {
        setSchemaStep(step);
        setSchemaProgress(progress);
        setSchemaStatus(label);
    };

    const handleAutoCreateSchema = async (options?: { createTables?: boolean }) => {
        if (!canSetConfig) {
            setSchemaStatus(`Permission required: ${permissionReason || 'read-only access'}`);
            return;
        }
        if (isCreatingSchema) return;
        setIsCreatingSchema(true);
        setSchemaStep(0);
        setSchemaProgress(0);
        setSchemaStatus('Starting...');
        setSchemaDetails([]);
        try {
            const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
            const safeString = (val: any) => (val === null || val === undefined) ? "" : String(val);
            const getTableByIdWithRetry = async (tableId: string, maxWaitMs: number = 30000) => {
                const deadline = Date.now() + maxWaitMs;
                let delayMs = 120;
                while (Date.now() < deadline) {
                    const table = base.getTableByIdIfExists(tableId);
                    if (table) return table;
                    await wait(delayMs);
                    delayMs = Math.min(Math.floor(delayMs * 1.5), 2000);
                }
                return null;
            };
            const waitForTableReady = async (table: any, maxWaitMs: number = 30000) => {
                const deadline = Date.now() + maxWaitMs;
                let delayMs = 120;
                while (Date.now() < deadline) {
                    if (table && Array.isArray(table.fields) && table.fields.length > 0) return table;
                    await wait(delayMs);
                    delayMs = Math.min(Math.floor(delayMs * 1.5), 2000);
                }
                return table;
            };
            const getTableByNameWithRetry = async (names: string[], maxWaitMs: number = 30000) => {
                const deadline = Date.now() + maxWaitMs;
                let delayMs = 120;
                while (Date.now() < deadline) {
                    const table = base.tables.find((t) => names.some((n) => t.name.toLowerCase() === n.toLowerCase()))
                        || names.map((n) => base.getTableByNameIfExists(n)).find(Boolean);
                    if (table) return table as any;
                    await wait(delayMs);
                    delayMs = Math.min(Math.floor(delayMs * 1.5), 2000);
                }
                return null;
            };
            const ensureTable = async (names: string[], primaryFieldName: string = 'Name') => {
                const existing = base.tables.find((t) => names.some((n) => t.name.toLowerCase() === n.toLowerCase()));
                if (existing) return existing;
                if (options?.createTables === false) return null;
                const id: any = await base.createTableAsync(names[0], [{ name: primaryFieldName, type: 'singleLineText' as any }]);
                const tableId: string = typeof id === 'string' ? id : (id as any).id;
                const created = await getTableByIdWithRetry(tableId, 45000);
                if (!created) {
                    setSchemaDetails((prev) => [...prev, `Created table pending: ${names[0]} (${id})`]);
                    return null;
                }
                await waitForTableReady(created, 45000);
                setSchemaDetails((prev) => [...prev, `Created table: ${names[0]}`]);
                return created;
            };
            const fieldErrors: string[] = [];
            const setConfigIfEmpty = async (key: string | undefined, value: any) => {
                if (!key || value === undefined || value === null) return;
                const k = safeString(key);
                const v = safeString(value);
                if (!k || !v) return;
                if (!globalConfig.get(k)) await globalConfig.setAsync(k, v);
            };
            const createFieldWithRetry = async (table: any, name: string, type: string, options?: any) => {
                let attempts = 0;
                let delayMs = 160;
                while (true) {
                    try {
                        return await table.createFieldAsync(name, type, options);
                    } catch (error) {
                        const text = String(error);
                        if (text.toLowerCase().includes('table unavailable') || text.toLowerCase().includes('not available')) {
                            if (attempts < 7) {
                                attempts += 1;
                                await wait(delayMs);
                                delayMs = Math.min(Math.floor(delayMs * 1.7), 2000);
                                continue;
                            }
                        }
                        throw error;
                    }
                }
            };
            const ensureField = async (table: any, name: string, type: string, options?: any, configKey?: string) => {
                if (!table) {
                    return null;
                }
                await waitForTableReady(table, 30000);
                const existing = table.fields.find((f: any) => f.name.toLowerCase() === name.toLowerCase())
                    || (table.getFieldByNameIfExists && table.getFieldByNameIfExists(name));
                if (existing) {
                    if (existing.type !== type) {
                        const mismatch = `${table.name}.${name} is ${existing.type}, expected ${type}. Delete this field manually in Airtable, then run Create my tables again.`;
                        fieldErrors.push(mismatch);
                        setSchemaDetails((prev) => [...prev, `Field type mismatch: ${mismatch}`]);
                        return existing;
                    }
                    await setConfigIfEmpty(configKey, existing.id);
                    return existing;
                }
                const fieldWait = options?.linkedTableId ? 800 : 300;
                await wait(fieldWait);
                try {
                    let fieldOptions = options;
                    if (type === 'number' && !fieldOptions) fieldOptions = { precision: 0 };
                    if (type === 'checkbox' && !fieldOptions) fieldOptions = { icon: 'check', color: 'greenBright' };
                    if (type === 'singleSelect' && !fieldOptions) fieldOptions = { choices: [] };
                    if (type === 'dateTime' && !fieldOptions) {
                        fieldOptions = {
                            dateFormat: { name: 'iso' },
                            timeFormat: { name: '24hour' },
                            timeZone: 'utc'
                        };
                    }
                    if (type === 'multipleRecordLinks') {
                        if (!fieldOptions || !fieldOptions.linkedTableId) {
                            const msg = `${table.name}.${name} (${type}) missing linkedTableId`;
                            fieldErrors.push(msg);
                            setSchemaDetails((prev) => [...prev, `Failed field: ${msg}`]);
                            return null;
                        }
                    }
                    const id = await createFieldWithRetry(table, name, type, fieldOptions);
                    const created = table.getFieldByIdIfExists ? table.getFieldByIdIfExists(id) : null;
                    setSchemaDetails((prev) => [...prev, `Created field: ${table.name}.${name}`]);
                    if (configKey) {
                        await setConfigIfEmpty(configKey, created ? created.id : id);
                    }
                    return created || { id };
                } catch (error) {
                    const errorText = String(error);
                    fieldErrors.push(`${table.name}.${name} (${type}) -> ${errorText}`);
                    setSchemaDetails((prev) => [...prev, `Failed field: ${table.name}.${name} (${type})`]);
                    return null;
                }
            };

            updateProgress(1, 'Step 1/4: Creating tables...', 15);
            const influencersTable = await ensureTable(['Influencers', 'Influencer'], 'Name');
            const promptsTable = await ensureTable(['Prompts', 'Prompt', 'prompt'], 'Prompt');
            const queueTable = await ensureTable(['Production Queue', 'Queue', 'Production'], 'Job ID');
            const contentTable = await ensureTable(['Content', 'Contenu', 'Contenus', 'Outputs'], 'Name');
            const contentMediaTable = await ensureTable(['Content Media', 'Media Items', 'Media du contenu'], 'Name');
            const presetsTable = await ensureTable(['Presets', 'Preset'], 'Name');
            const modelConfigTable = await ensureTable(['Model Config', 'Config Models', 'Config Modeles'], 'Name');
            const fanvueAccountsTable = await ensureTable(['Fanvue Accounts', 'Fanvue Account'], 'Name');
            const fanvuePostsTable = await ensureTable(['Fanvue Posts', 'Fanvue Post'], 'Name');
            const assetsTable = await ensureTable(['Assets', 'Asset', 'Library'], 'Name');

            const influencersTableReady = await waitForTableReady(influencersTable || await getTableByNameWithRetry(['Influencers', 'Influencer'], 45000), 45000);
            const promptsTableReady = await waitForTableReady(promptsTable || await getTableByNameWithRetry(['Prompts', 'Prompt', 'prompt'], 45000), 45000);
            const queueTableReady = await waitForTableReady(queueTable || await getTableByNameWithRetry(['Production Queue', 'Queue', 'Production'], 45000), 45000);
            const contentTableReady = await waitForTableReady(contentTable || await getTableByNameWithRetry(['Content', 'Contenu', 'Contenus', 'Outputs'], 45000), 45000);
            const contentMediaTableReady = await waitForTableReady(contentMediaTable || await getTableByNameWithRetry(['Content Media', 'Media Items', 'Media du contenu'], 45000), 45000);
            const presetsTableReady = await waitForTableReady(presetsTable || await getTableByNameWithRetry(['Presets', 'Preset'], 45000), 45000);
            const modelConfigTableReady = await waitForTableReady(modelConfigTable || await getTableByNameWithRetry(['Model Config', 'Config Models', 'Config Modeles'], 45000), 45000);
            const fanvueAccountsTableReady = await waitForTableReady(fanvueAccountsTable || await getTableByNameWithRetry(['Fanvue Accounts', 'Fanvue Account'], 45000), 45000);
            const fanvuePostsTableReady = await waitForTableReady(fanvuePostsTable || await getTableByNameWithRetry(['Fanvue Posts', 'Fanvue Post'], 45000), 45000);
            const assetsTableReady = await waitForTableReady(assetsTable || await getTableByNameWithRetry(['Assets', 'Asset', 'Library'], 45000), 45000);

            updateProgress(2, 'Step 2/4: Creating fields...', 45);
            if (influencersTableReady) {
                await ensureField(influencersTableReady, 'Name', 'singleLineText', undefined, 'influencerNameFieldId');
                await ensureField(influencersTableReady, 'Age', 'number', { precision: 0 }, 'influencerAgeFieldId');
                await ensureField(influencersTableReady, 'Gender', 'singleSelect', { choices: [{ name: 'female' }, { name: 'male' }, { name: 'non-binary' }] }, 'influencerGenderFieldId');
                await ensureField(influencersTableReady, 'Niche', 'singleLineText', undefined, 'influencerNicheFieldId');
                await ensureField(influencersTableReady, 'Style', 'singleLineText', undefined, 'influencerStyleFieldId');
                await ensureField(influencersTableReady, 'Avatar', 'multipleAttachments');
                await ensureField(influencersTableReady, 'Total Generations', 'number', { precision: 0 });
                await ensureField(influencersTableReady, 'Avatar Upload URL', 'singleLineText');
                await ensureField(influencersTableReady, 'Status', 'singleLineText');
                await ensureField(influencersTableReady, 'Approved', 'checkbox', { icon: 'check', color: 'greenBright' });
                await ensureField(influencersTableReady, 'Fanvue Creator UUID', 'singleLineText');
            }

            if (promptsTableReady) {
                await ensureField(promptsTableReady, 'Prompt', 'singleLineText');
                await ensureField(promptsTableReady, 'Status', 'singleSelect', { choices: [{ name: 'draft' }, { name: 'used' }] });
                await ensureField(promptsTableReady, 'Style', 'singleLineText');
                await ensureField(promptsTableReady, 'Platform', 'singleLineText');
                await ensureField(promptsTableReady, 'Reference Image', 'multipleAttachments');
            }

            if (queueTableReady) {
                await ensureField(queueTableReady, 'Job ID', 'singleLineText');
                await ensureField(queueTableReady, 'Prompt Text', 'singleLineText');
                await ensureField(queueTableReady, 'Type', 'singleSelect', { choices: [{ name: 'Image' }, { name: 'Video' }] });
                await ensureField(queueTableReady, 'Status', 'singleSelect', { choices: [{ name: 'Queued' }, { name: 'Running' }, { name: 'Done' }, { name: 'Failed' }, { name: 'Archived' }] }, 'queueStatusFieldId');
                await ensureField(queueTableReady, 'Provider', 'singleLineText', undefined, 'queueProviderFieldId');
                await ensureField(queueTableReady, 'Model', 'singleLineText', undefined, 'queueModelFieldId');
                await ensureField(queueTableReady, 'Output Media', 'multipleAttachments', undefined, 'queueOutputFieldId');
                await ensureField(queueTableReady, 'Error', 'multilineText', undefined, 'queueErrorFieldId');
                await ensureField(queueTableReady, 'Cost', 'number', { precision: 2 }, 'queueCostFieldId');
                await ensureField(queueTableReady, 'Reference Image', 'multipleAttachments');
                await ensureField(queueTableReady, 'Mask Image', 'multipleAttachments');
                await ensureField(queueTableReady, 'Org ID', 'singleLineText');
                await ensureField(queueTableReady, 'Attempts', 'number', { precision: 0 });
                await ensureField(queueTableReady, 'Platform', 'singleSelect', { choices: [{ name: 'Social' }, { name: 'Standard' }, { name: 'Creative' }] });
                await ensureField(queueTableReady, 'Approved', 'checkbox', { icon: 'check', color: 'greenBright' });
                await ensureField(queueTableReady, 'LoRAs', 'singleLineText');
                await ensureField(queueTableReady, 'CreatedAt', 'dateTime');
                await ensureField(queueTableReady, 'CompletedAt', 'dateTime');
                await ensureField(queueTableReady, 'Content Record ID', 'singleLineText');
            }

            if (contentTableReady) {
                await ensureField(contentTableReady, 'Name', 'singleLineText');
                await ensureField(contentTableReady, 'Output Media', 'multipleAttachments', undefined, 'contentOutputFieldId');
                await ensureField(contentTableReady, 'Status', 'singleSelect', { choices: [{ name: 'Generated' }, { name: 'Approved' }, { name: 'Published' }, { name: 'Archived' }] });
                await ensureField(contentTableReady, 'Prompt', 'multilineText');
                await ensureField(contentTableReady, 'Provider', 'singleLineText');
                await ensureField(contentTableReady, 'Model', 'singleLineText');
                await ensureField(contentTableReady, 'CreatedAt', 'dateTime');
                await ensureField(contentTableReady, 'Storage URL', 'singleLineText');
                await ensureField(contentTableReady, 'Source', 'singleSelect', { choices: [{ name: 'generated' }, { name: 'uploaded' }, { name: 'edited' }] });
                await ensureField(contentTableReady, 'Platform', 'singleSelect', { choices: [{ name: 'Social' }, { name: 'Standard' }, { name: 'Creative' }] }, 'contentPlatformFieldId');
                await ensureField(contentTableReady, 'Approved', 'checkbox', { icon: 'check', color: 'greenBright' }, 'contentApprovedFieldId');
                await ensureField(contentTableReady, 'Type', 'singleLineText');
                await ensureField(contentTableReady, 'Auto Publish', 'checkbox', { icon: 'check', color: 'greenBright' });
                await ensureField(contentTableReady, 'Publish To', 'singleSelect', { choices: [{ name: 'Manual' }, { name: 'Fanvue' }, { name: 'Fanvue-now' }] });
                await ensureField(contentTableReady, 'Scheduled Publish At', 'dateTime');
            }

            if (contentMediaTableReady) {
                await ensureField(contentMediaTableReady, 'Name', 'singleLineText');
                await ensureField(contentMediaTableReady, 'Media URL', 'singleLineText');
                await ensureField(contentMediaTableReady, 'Storage URL', 'singleLineText');
                await ensureField(contentMediaTableReady, 'Media Type', 'singleSelect', { choices: [{ name: 'image' }, { name: 'video' }] });
                await ensureField(contentMediaTableReady, 'Order', 'number', { precision: 0 });
            }

            if (fanvueAccountsTableReady) {
                await ensureField(fanvueAccountsTableReady, 'Name', 'singleLineText');
                await ensureField(fanvueAccountsTableReady, 'Fanvue Account ID', 'singleLineText');
                await ensureField(fanvueAccountsTableReady, 'Username', 'singleLineText');
                await ensureField(fanvueAccountsTableReady, 'Display Name', 'singleLineText');
                await ensureField(fanvueAccountsTableReady, 'Status', 'singleSelect', { choices: [{ name: 'connected' }, { name: 'disconnected' }] });
                await ensureField(fanvueAccountsTableReady, 'Scopes', 'multilineText');
                await ensureField(fanvueAccountsTableReady, 'Connected At', 'dateTime');
                await ensureField(fanvueAccountsTableReady, 'Last Sync At', 'dateTime');
            }

            if (fanvuePostsTableReady) {
                await ensureField(fanvuePostsTableReady, 'Name', 'singleLineText');
                await ensureField(fanvuePostsTableReady, 'Fanvue Post ID', 'singleLineText');
                await ensureField(fanvuePostsTableReady, 'Status', 'singleSelect', { choices: [{ name: 'draft' }, { name: 'published' }, { name: 'scheduled' }, { name: 'failed' }] });
                await ensureField(fanvuePostsTableReady, 'Post URL', 'singleLineText');
                await ensureField(fanvuePostsTableReady, 'Caption', 'multilineText');
                await ensureField(fanvuePostsTableReady, 'Media URL', 'singleLineText');
                await ensureField(fanvuePostsTableReady, 'Media Type', 'singleSelect', { choices: [{ name: 'image' }, { name: 'video' }] });
                await ensureField(fanvuePostsTableReady, 'Published At', 'dateTime');
                await ensureField(fanvuePostsTableReady, 'Last Sync At', 'dateTime');
                await ensureField(fanvuePostsTableReady, 'Views', 'number', { precision: 0 });
                await ensureField(fanvuePostsTableReady, 'Likes', 'number', { precision: 0 });
                await ensureField(fanvuePostsTableReady, 'Comments', 'number', { precision: 0 });
                await ensureField(fanvuePostsTableReady, 'Revenue', 'number', { precision: 2 });
            }

            if (assetsTableReady) {
                await ensureField(assetsTableReady, 'Name', 'singleLineText', undefined, 'assetNameFieldId');
                await ensureField(assetsTableReady, 'Type', 'singleSelect', { choices: [{ name: 'LoRA' }, { name: 'Checkpoint' }, { name: 'ControlNet' }, { name: 'Embedding' }] }, 'assetTypeFieldId');
                await ensureField(assetsTableReady, 'Provider', 'singleSelect', { choices: [{ name: 'civitai' }, { name: 'huggingface' }, { name: 'replicate' }] }, 'assetProviderFieldId');
                await ensureField(assetsTableReady, 'Source URL', 'singleLineText', undefined, 'assetSourceUrlFieldId');
                await ensureField(assetsTableReady, 'Trigger', 'singleLineText', undefined, 'assetTriggerFieldId');
                await ensureField(assetsTableReady, 'Strength', 'number', { precision: 2 }, 'assetStrengthFieldId');
                await ensureField(assetsTableReady, 'Notes', 'multilineText');
                await ensureField(assetsTableReady, 'File', 'multipleAttachments', undefined, 'assetFileFieldId');
                await ensureField(assetsTableReady, 'Base Model', 'singleLineText');
                await ensureField(assetsTableReady, 'Version', 'singleLineText');
            }

            if (presetsTableReady) {
                await ensureField(presetsTableReady, 'Name', 'singleLineText');
                await ensureField(presetsTableReady, 'Goal', 'singleLineText');
                await ensureField(presetsTableReady, 'Platform', 'singleLineText');
                await ensureField(presetsTableReady, 'Prompt Template', 'multilineText');
                await ensureField(presetsTableReady, 'Default Provider', 'singleLineText');
                await ensureField(presetsTableReady, 'Default Model', 'singleLineText');
                await ensureField(presetsTableReady, 'Active', 'checkbox', { icon: 'check', color: 'greenBright' });
            }

            if (modelConfigTableReady) {
                await ensureField(modelConfigTableReady, 'Name', 'singleLineText');
                await ensureField(modelConfigTableReady, 'Provider ID', 'singleLineText');
                await ensureField(modelConfigTableReady, 'Type', 'singleSelect', { choices: [{ name: 'image' }, { name: 'video' }] });
                await ensureField(modelConfigTableReady, 'Provider', 'singleLineText');
                await ensureField(modelConfigTableReady, 'Description', 'multilineText');
                await ensureField(modelConfigTableReady, 'Status', 'singleSelect', { choices: [{ name: 'active' }, { name: 'disabled' }] });
            }

            updateProgress(3, 'Step 3/4: Creating link fields...', 70);
            await wait(800);
            if (modelConfigTableReady && influencersTableReady) {
                await ensureField(influencersTableReady, 'Main LoRA', 'multipleRecordLinks', { linkedTableId: modelConfigTableReady.id });
                await ensureField(influencersTableReady, 'Secondary LoRAs', 'multipleRecordLinks', { linkedTableId: modelConfigTableReady.id });
            } else {
                fieldErrors.push('Influencers.Main LoRA/Secondary LoRAs skipped: Model Config table not ready');
            }
            if (promptsTableReady && influencersTableReady) {
                await ensureField(promptsTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id });
            } else {
                fieldErrors.push('Prompts.Influencer skipped: Influencers table not ready');
            }
            if (queueTableReady && promptsTableReady) {
                await ensureField(queueTableReady, 'Prompt', 'multipleRecordLinks', { linkedTableId: promptsTableReady.id }, 'queuePromptFieldId');
            } else {
                fieldErrors.push('Production Queue.Prompt skipped: Prompts table not ready');
            }
            if (queueTableReady && influencersTableReady) {
                await ensureField(queueTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id });
            } else {
                fieldErrors.push('Production Queue.Influencer skipped: Influencers table not ready');
            }
            if (contentTableReady && influencersTableReady) {
                await ensureField(contentTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id }, 'contentInfluencerFieldId');
            } else {
                fieldErrors.push('Content.Influencer skipped: Influencers table not ready');
            }
            if (contentTableReady && queueTableReady) {
                await ensureField(contentTableReady, 'Queue Job', 'multipleRecordLinks', { linkedTableId: queueTableReady.id });
            }
            if (contentTableReady && promptsTableReady) {
                await ensureField(contentTableReady, 'Prompt Source', 'multipleRecordLinks', { linkedTableId: promptsTableReady.id });
            }
            if (contentMediaTableReady && contentTableReady) {
                await ensureField(contentMediaTableReady, 'Content', 'multipleRecordLinks', { linkedTableId: contentTableReady.id });
            }
            if (contentMediaTableReady && influencersTableReady) {
                await ensureField(contentMediaTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id });
            }
            if (fanvueAccountsTableReady && influencersTableReady) {
                await ensureField(influencersTableReady, 'Fanvue Account', 'multipleRecordLinks', { linkedTableId: fanvueAccountsTableReady.id });
                await ensureField(fanvueAccountsTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id });
            }
            if (fanvuePostsTableReady && influencersTableReady) {
                await ensureField(fanvuePostsTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id });
            }
            if (fanvuePostsTableReady && contentTableReady) {
                await ensureField(fanvuePostsTableReady, 'Content', 'multipleRecordLinks', { linkedTableId: contentTableReady.id });
            }
            if (fanvuePostsTableReady && fanvueAccountsTableReady) {
                await ensureField(fanvuePostsTableReady, 'Fanvue Account', 'multipleRecordLinks', { linkedTableId: fanvueAccountsTableReady.id });
                await ensureField(fanvueAccountsTableReady, 'Fanvue Posts', 'multipleRecordLinks', { linkedTableId: fanvuePostsTableReady.id });
            }
            if (assetsTableReady && influencersTableReady) {
                await ensureField(assetsTableReady, 'Influencer', 'multipleRecordLinks', { linkedTableId: influencersTableReady.id }, 'assetInfluencerFieldId');
            }

            updateProgress(4, 'Step 4/4: Saving config...', 90);
            await Promise.all([
                influencersTableReady ? globalConfig.setAsync('influencersTableId', influencersTableReady.id) : Promise.resolve(),
                promptsTableReady ? globalConfig.setAsync('promptsTableId', promptsTableReady.id) : Promise.resolve(),
                queueTableReady ? globalConfig.setAsync('queueTableId', queueTableReady.id) : Promise.resolve(),
                contentTableReady ? globalConfig.setAsync('contentTableId', contentTableReady.id) : Promise.resolve(),
                contentMediaTableReady ? globalConfig.setAsync('contentMediaTableId', contentMediaTableReady.id) : Promise.resolve(),
                fanvueAccountsTableReady ? globalConfig.setAsync('fanvueAccountsTableId', fanvueAccountsTableReady.id) : Promise.resolve(),
                fanvuePostsTableReady ? globalConfig.setAsync('fanvuePostsTableId', fanvuePostsTableReady.id) : Promise.resolve(),
            ]);
            if (fieldErrors.length > 0) {
                setSchemaStatus(`Schema partially created: ${fieldErrors.length} field(s) failed. Check Advanced Tools details.`);
                setSchemaDetails((prev) => [...prev, ...fieldErrors.map((item) => `Error detail: ${item}`)]);
            } else {
                setSchemaStatus('Schema created/verified.');
            }
            handleAutoMap();
            setSchemaProgress(100);
        } catch (error) {
            setSchemaStatus(`Auto-create failed: ${String(error)}`);
        } finally {
            setIsCreatingSchema(false);
        }
    };

    const handleDryRun = () => {
        const details: string[] = [];
        const tableExists = (name: string) => base.tables.some((t) => t.name.toLowerCase() === name.toLowerCase());
        if (!tableExists('Influencers')) details.push('Would create table: Influencers');
        if (!tableExists('Prompts')) details.push('Would create table: Prompts');
        if (!tableExists('Production Queue')) details.push('Would create table: Production Queue');
        if (!tableExists('Content') && !tableExists('Contenus') && !tableExists('Contenu')) {
            details.push('Would create table: Content');
        }
        if (!tableExists('Content Media')) details.push('Would create table: Content Media');
        if (!tableExists('Presets')) details.push('Would create table: Presets');
        if (!tableExists('Model Config') && !tableExists('Config Models') && !tableExists('Config Modeles')) {
            details.push('Would create table: Model Config');
        }
        if (!tableExists('Fanvue Accounts')) details.push('Would create table: Fanvue Accounts');
        if (!tableExists('Fanvue Posts')) details.push('Would create table: Fanvue Posts');
        if (!details.length) details.push('All tables already exist.');
        setSchemaDetails(details);
        setSchemaStatus('Dry run complete.');
    };

    React.useEffect(() => {
        const autoPickTable = (key: string, names: string[]) => {
            if (globalConfig.get(key)) return;
            const table = base.tables.find((t) => names.some((n) => t.name.toLowerCase() === n.toLowerCase()));
            if (table) globalConfig.setAsync(key, table.id);
        };
        autoPickTable('influencersTableId', ['Influencers', 'Influencer']);
        autoPickTable('promptsTableId', ['Prompts', 'Prompt']);
        autoPickTable('queueTableId', ['Production Queue', 'Queue', 'Production']);
        autoPickTable('contentTableId', ['Content', 'Contenu', 'Contenus', 'Outputs']);
        autoPickTable('contentMediaTableId', ['Content Media', 'Media Items', 'Media du contenu']);
        autoPickTable('fanvueAccountsTableId', ['Fanvue Accounts', 'Fanvue Account']);
        autoPickTable('fanvuePostsTableId', ['Fanvue Posts', 'Fanvue Post']);
        autoPickTable('assetsTableId', ['Assets', 'Asset', 'Library']);
    }, [base, globalConfig]);

    React.useEffect(() => {
        const autoPickField = (tableId: string | undefined, fieldKey: string, names: string[]) => {
            if (!tableId || globalConfig.get(fieldKey)) return;
            const table = base.getTableByIdIfExists(tableId);
            if (!table) return;
            const field = table.fields.find((f) => names.some((n) => f.name.toLowerCase() === n.toLowerCase()));
            if (field) globalConfig.setAsync(fieldKey, field.id);
        };
        autoPickField(influencersTableId, 'influencerNameFieldId', ['Name', 'Nom']);
        autoPickField(influencersTableId, 'influencerAgeFieldId', ['Age']);
        autoPickField(influencersTableId, 'influencerGenderFieldId', ['Gender', 'Genre']);
        autoPickField(influencersTableId, 'influencerNicheFieldId', ['Niche']);
        autoPickField(influencersTableId, 'influencerStyleFieldId', ['Style']);
        autoPickField(influencersTableId, 'influencerAvatarFieldId', ['Avatar', 'Photo']);
        autoPickField(influencersTableId, 'influencerStatusFieldId', ['Status', 'State']);
        autoPickField(influencersTableId, 'influencerApprovedFieldId', ['Approved']);

        autoPickField(queueTableId, 'queuePromptFieldId', ['Prompt', 'Prompt Text']);
        autoPickField(queueTableId, 'queueProviderFieldId', ['Provider']);
        autoPickField(queueTableId, 'queueModelFieldId', ['Model']);
        autoPickField(queueTableId, 'queueStatusFieldId', ['Status']);
        autoPickField(queueTableId, 'queueOutputFieldId', ['Output', 'Output Media']);
        autoPickField(queueTableId, 'queueErrorFieldId', ['Error']);
        autoPickField(queueTableId, 'queueCostFieldId', ['Cost']);

        autoPickField(contentTableId, 'contentOutputFieldId', ['Output', 'Output Media', 'Media']);
        autoPickField(contentTableId, 'contentInfluencerFieldId', ['Influencer']);
        autoPickField(contentTableId, 'contentPlatformFieldId', ['Platform']);
        autoPickField(contentTableId, 'contentApprovedFieldId', ['Approved']);
        autoPickField(contentTableId, 'contentStorageUrlFieldId', ['Storage URL']);
        autoPickField(contentTableId, 'contentPublishToFieldId', ['Publish To']);

        autoPickField(contentMediaTableId, 'contentMediaContentFieldId', ['Content']);
        autoPickField(contentMediaTableId, 'contentMediaInfluencerFieldId', ['Influencer']);

        const assetsTableId = globalConfig.get('assetsTableId') as string | undefined;
        autoPickField(assetsTableId, 'assetNameFieldId', ['Name']);
        autoPickField(assetsTableId, 'assetTypeFieldId', ['Type']);
        autoPickField(assetsTableId, 'assetProviderFieldId', ['Provider']);
        autoPickField(assetsTableId, 'assetSourceUrlFieldId', ['Source URL', 'SourceUrl']);
        autoPickField(assetsTableId, 'assetTriggerFieldId', ['Trigger', 'Trigger Words']);
        autoPickField(assetsTableId, 'assetStrengthFieldId', ['Strength']);
        autoPickField(assetsTableId, 'assetInfluencerFieldId', ['Influencer', 'LinkedInfluencer']);
        autoPickField(assetsTableId, 'assetFileFieldId', ['File', 'Example Images']);
    }, [base, globalConfig, influencersTableId, queueTableId, contentTableId, assetsTableId]);

    return (
        <div style={{ padding: 24, paddingBottom: 120 }}>
            {/* Account & Subscription Card */}
            <div className="glass-card" style={{ 
                padding: 24, 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ 
                        width: 50, 
                        height: 50, 
                        borderRadius: 12, 
                        background: 'var(--text-accent)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 24,
                        boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)'
                    }}>
                        👤
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Current Plan</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                            <div style={{ fontSize: 24, fontWeight: 900 }}>{billingInfo?.is_premium ? 'Premium Plan' : 'Free Tier'}</div>
                            <div style={{ 
                                padding: '4px 10px', 
                                borderRadius: 6, 
                                background: 'var(--card-bg)', 
                                border: '1px solid var(--card-border)',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#10B981'
                            }}>
                                {billingInfo !== null ? `${billingInfo.credits} CREDITS REMAINING` : 'LOADING...'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <a 
                    href={`https://whop.com/checkout/plan_9235jZU15CtNu?org_id=${base.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gradient-btn"
                    style={{ 
                        textDecoration: 'none',
                        width: 'auto',
                        padding: '12px 24px',
                        fontSize: 14,
                        fontWeight: 800,
                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    {billingInfo?.is_premium ? '🔄 MANAGE SUBSCRIPTION' : '⭐ UPGRADE TO PREMIUM'}
                </a>
            </div>

            {/* Foundation Setup Card */}
            <div className="glass-card" style={{ padding: 24, background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>🚀 Foundation Setup</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            Programmatic schema initialization for Airtable Marketplace standards.
                        </div>
                    </div>
                </div>

                {!canSetConfig && (
                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, fontSize: 12, color: '#F59E0B' }}>
                        ⚠️ Read-only access: {permissionReason || 'You do not have permission to update settings.'}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button 
                        className="gradient-btn" 
                        style={{ width: 'auto', padding: '10px 20px', fontSize: 13 }}
                        onClick={() => {
                            if (confirm('This will create all missing tables and fields. Continue?')) {
                                handleAutoCreateSchema({ createTables: true });
                            }
                        }}
                        disabled={!canSetConfig || isCreatingSchema}
                    >
                        {isCreatingSchema ? 'Initializing Workspace...' : 'Create my tables & fields'}
                    </button>
                    <button 
                        className="ghost-btn" 
                        onClick={() => {
                            if (confirm('This will only add missing fields to existing tables. Continue?')) {
                                handleAutoCreateSchema({ createTables: false });
                            }
                        }}
                        disabled={!canSetConfig || isCreatingSchema}
                    >
                        Fix missing fields only
                    </button>
                    <button className="ghost-btn" onClick={() => { handleClearMapping(); handleAutoMap(); }} disabled={!canSetConfig}>
                        Use existing tables
                    </button>
                    <button className="ghost-btn" onClick={() => setShowAdvanced((v) => !v)}>
                        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings & Tools'}
                    </button>
                    {autoMapResult && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{autoMapResult}</div>
                    )}
                </div>

                {schemaStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                        {isCreatingSchema && <div className="spinner-small" style={{ width: 12, height: 12, border: '2px solid var(--card-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                        <div>{schemaStatus}</div>
                    </div>
                )}

                {isCreatingSchema && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ height: 6, borderRadius: 999, background: 'var(--input-bg)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${schemaProgress}%`, background: 'var(--primary)', transition: 'width 200ms ease' }} />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Step {schemaStep}/4</span>
                            <span>{Math.round(schemaProgress)}%</span>
                        </div>
                    </div>
                )}

                {schemaDetails.length > 0 && (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--input-bg)', maxHeight: 150, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 1.5, border: '1px solid var(--card-border)' }}>
                        {schemaDetails.map((line, idx) => (
                            <div key={idx} style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 2, marginBottom: 2 }}>{line}</div>
                        ))}
                    </div>
                )}
            </div>

            {showAdvanced && (
                <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--card-border)', display: 'grid', gap: 32 }}>
                    {/* Backend URL Configuration Section (Non-sensitive) */}
                    <div style={{ padding: 24, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: 24 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '20px' }}>🛰️</span> System Routing
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 20 }}>
                            Configure your backend server endpoint. This is used by the extension to communicate with your AI infrastructure.
                        </div>
                        
                        <div style={{ display: 'grid', gap: '20px' }}>
                             <ApiKeyInput label="Backend Server URL" configKey="backendUrl" placeholder="https://backend-fastapi1.onrender.com" globalConfig={globalConfig} canSetConfig={canSetConfig} />
                             <ApiKeyInput label="Instagram CF Worker URL" configKey="cfWorkerUrl" placeholder="https://votre-worker-url.com" globalConfig={globalConfig} canSetConfig={canSetConfig} />
                             <ApiKeyInput label="Threads Worker URL" configKey="threadsWorkerUrl" placeholder="https://votre-worker-threads.com" globalConfig={globalConfig} canSetConfig={canSetConfig} />
                        </div>
                        
                        <div style={{ marginTop: 24, padding: 24, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 16, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '20px' }}>🔑</span> Whop Security
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 20 }}>
                                Enter your Whop License Key to activate the premium features of your Studio.
                            </div>
                             <ApiKeyInput 
                                label="Whop License Key" 
                                configKey="whop_token" 
                                placeholder="Your license key from Whop..." 
                                globalConfig={globalConfig} 
                                canSetConfig={canSetConfig} 
                             />
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            🛠️ Field & Table Mapping
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
                            Manually override the mapping between your Airtable tables and the extension's internal logic.
                        </div>

                        <div style={{ display: 'grid', gap: 40 }}>
                            <MappingSection title="Influencers" color="#3B82F6" tableId={influencersTableId} onTableChange={(id: string) => setConfig('influencersTableId', id)} fields={influencerFields} fieldOptions={influencerFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                            <MappingSection title="Prompts" color="#10B981" tableId={promptsTableId} onTableChange={(id: string) => setConfig('promptsTableId', id)} fields={promptsFields} fieldOptions={promptFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                            <MappingSection title="Production Queue" color="#8B5CF6" tableId={queueTableId} onTableChange={(id: string) => setConfig('queueTableId', id)} fields={queueFields} fieldOptions={queueFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                            <MappingSection title="Content" color="#EC4899" tableId={contentTableId} onTableChange={(id: string) => setConfig('contentTableId', id)} fields={contentFields} fieldOptions={contentFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                            <MappingSection title="Content Media" color="#F59E0B" tableId={contentMediaTableId} onTableChange={(id: string) => setConfig('contentMediaTableId', id)} fields={contentMediaFields} fieldOptions={contentMediaFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                            <MappingSection title="Assets (Library)" color="#10B981" tableId={assetsTableId} onTableChange={(id: string) => setConfig('assetsTableId', id)} fields={assetsFields} fieldOptions={assetsFieldOptions} tables={tables} globalConfig={globalConfig} setConfig={setConfig} canSetConfig={canSetConfig} />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 40, borderTop: '1px solid var(--card-border)', paddingTop: 16, display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => setShowSystemSettings(!showSystemSettings)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        letterSpacing: 1,
                        textTransform: 'uppercase'
                    }}
                >
                    {showSystemSettings ? 'Hide System Status' : 'Show System Status'}
                </button>
            </div>

            {showSystemSettings && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)' }}>Internal System Status</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Active Backend URL:
                        </div>
                        <code style={{ fontSize: 11, background: 'var(--input-bg)', padding: '6px 10px', borderRadius: 6, color: '#10B981', letterSpacing: 0.3, border: '1px solid var(--card-border)' }}>
                            {(globalConfig.get('backendUrl') as string) || DEFAULT_BACKEND_URL}
                        </code>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            You can change this URL in the API Configuration section above.
                        </div>
                    </div>
                </div>
            )}

            {/* Legal & About Footer */}
            <div style={{ 
                marginTop: 40, 
                padding: '24px 0', 
                borderTop: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12
            }}>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5, opacity: 0.8 }}>
                    BONOBOOH <span style={{ color: 'var(--primary)' }}>STUDIO AI</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a href="https://assets-2-prod.whop.com/uploads/user_7473124/other/bots/2026-04-05/fa7e1db7-9fe1-4484-8a46-b6b7109982c8.pdf" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-white">Terms of Service</a>
                    <a href="https://assets-2-prod.whop.com/uploads/user_7473124/other/bots/2026-04-05/2f1a97b3-11f8-4441-a41f-ffca41361062.pdf" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-white">Privacy Policy</a>
                    <a href="https://assets-2-prod.whop.com/uploads/user_7473124/other/bots/2026-04-05/5142e795-b9bb-4492-a00e-9f689357c31d.pdf" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-white">Refund Policy</a>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
                    © 2024 Bonobooh Studio AI. All rights reserved.
                </div>
            </div>
            
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .hover-white:hover {
                    color: rgba(255,255,255,0.9) !important;
                    text-decoration: underline !important;
                }
            `}</style>
        </div>
    );
}

function MappingSection({
    title, color, tableId, onTableChange, fields, fieldOptions, tables, globalConfig, setConfig, canSetConfig
}: any) {
    return (
        <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></span>
                {title} Table
            </div>
            <select className="dark-select" value={tableId || ''} onChange={(e) => onTableChange(e.target.value)} disabled={!canSetConfig}>
                <option value="">Select table</option>
                {tables.map((table: any) => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                ))}
            </select>
            {tableId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
                    {fields.map((field: any) => (
                        <div key={field.key}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 800 }}>{field.label.toUpperCase()}</div>
                            <select
                                className="dark-select"
                                value={(globalConfig.get(field.key) as string | undefined) || ''}
                                onChange={(e) => setConfig(field.key, e.target.value)}
                                disabled={!canSetConfig}
                            >
                                <option value="">Select field</option>
                                {fieldOptions.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}



function ApiKeyInput({ label, configKey, placeholder, globalConfig, canSetConfig }: any) {
    const value = (globalConfig.get(configKey) as string) || '';
    const [show, setShow] = React.useState(false);
    const isUrl = configKey === 'backendUrl';

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.5px' }}>{label.toUpperCase()}</div>
                {!isUrl && (
                    <div style={{ 
                        fontSize: 9, 
                        fontWeight: 700, 
                        color: '#10B981', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        opacity: 0.8,
                        padding: '2px 6px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderRadius: 4,
                        border: '1px solid rgba(16, 185, 129, 0.15)'
                    }}>
                        🔒 AES-256 ENCRYPTED
                    </div>
                )}
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
                <input 
                    type={show || isUrl ? 'text' : 'password'}
                    className="dark-input" 
                    value={value}
                    onChange={e => globalConfig.setAsync(configKey, e.target.value)}
                    placeholder={placeholder}
                    disabled={!canSetConfig}
                    style={{ flex: 1, paddingRight: '40px' }}
                />
                {configKey !== 'backendUrl' && (
                    <button 
                        onClick={() => setShow(!show)}
                        style={{ 
                            position: 'absolute', 
                            right: '8px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            opacity: 0.5
                        }}
                    >
                        {show ? '👁️' : '🙈'}
                    </button>
                )}
            </div>
        </div>
    );
}
