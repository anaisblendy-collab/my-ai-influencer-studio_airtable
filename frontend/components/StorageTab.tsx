/**
 * Connections & Storage configuration
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig, useSession } from '@airtable/blocks/ui';
import { backendService, ConnectionStatusItem, ConnectorTestResponse, FanvueStatusItem } from '../services/backend';
import { ALL_PROVIDERS, LLM_PROVIDERS, IMAGE_PROVIDERS, VIDEO_PROVIDERS, ProviderDefinition, ProviderId, StorageMode } from '../data/providers';

// Connection mode is now strictly BYOK for marketplace compliance

type CustomConnectorConfig = {
    id: string;
    name: string;
    purpose: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    authMode: 'none' | 'bearer' | 'header';
    authHeaderName: string;
    headersText: string;
    queryText: string;
    bodyText: string;
    resultPath: string;
    targetTable: string;
    schedule: string;
};

const CONNECTOR_TEMPLATES: Array<CustomConnectorConfig & { description: string }> = [
    {
        id: 'fanvue-insights',
        name: 'Fanvue Post Metrics',
        purpose: 'Pull latest metrics for creator posts',
        method: 'GET',
        url: 'https://api.fanvue.com/posts',
        authMode: 'bearer',
        authHeaderName: 'Authorization',
        headersText: '{\n  "X-Fanvue-API-Version": "2025-06-26"\n}',
        queryText: '{\n  "limit": "10"\n}',
        bodyText: '',
        resultPath: 'data.0',
        targetTable: 'Fanvue Posts',
        schedule: 'Every 6 hours',
        description: 'Reusable sync for metrics and post state.'
    },
    {
        id: 'cloudinary-folder',
        name: 'Cloudinary Folder Assets',
        purpose: 'Fetch ready media from a Cloudinary folder',
        method: 'GET',
        url: 'https://res.cloudinary.com/<cloud-name>/image/list/<folder>.json',
        authMode: 'none',
        authHeaderName: 'Authorization',
        headersText: '',
        queryText: '',
        bodyText: '',
        resultPath: 'resources.0',
        targetTable: 'Content Media',
        schedule: 'Manual or daily',
        description: 'Use for asset intake into Content Media.'
    },
    {
        id: 'creator-webhook',
        name: 'Creator Webhook',
        purpose: 'Send approved content to an external creator system',
        method: 'POST',
        url: 'https://api.example.com/creator/hooks/content',
        authMode: 'bearer',
        authHeaderName: 'Authorization',
        headersText: '{\n  "Content-Type": "application/json"\n}',
        queryText: '',
        bodyText: '{\n  "influencer": "{{name}}",\n  "caption": "{{prompt}}",\n  "media_url": "{{storageUrl}}"\n}',
        resultPath: '',
        targetTable: 'Content',
        schedule: 'On approve',
        description: 'Push approved content to a remote workflow.'
    },
    {
        id: 'comfyui-render',
        name: 'ComfyUI GPU Render',
        purpose: 'Run a high-end AI workflow on RunPod/Modal',
        method: 'POST',
        url: 'https://api.runpod.ai/v2/<endpoint-id>/runsync',
        authMode: 'bearer',
        authHeaderName: 'Authorization',
        headersText: '{\n  "Content-Type": "application/json"\n}',
        queryText: '',
        bodyText: '{\n  "input": {\n    "prompt": "{{prompt}}",\n    "lora_name": "influencer_v1",\n    "lora_weight": 0.8,\n    "workflow": "simple_sdxl"\n  }\n}',
        resultPath: 'output.results[0].image_url',
        targetTable: 'Content Media',
        schedule: 'On demand',
        description: 'Trigger your own GPU server (RunPod/Modal) for custom styles.'
    },
    {
        id: 'telegram-approve',
        name: 'Tele-Approve Channel',
        purpose: 'Send previews to a Telegram group for approval',
        method: 'POST',
        url: 'https://api.telegram.org/bot<token>/sendMessage',
        authMode: 'none',
        authHeaderName: 'Authorization',
        headersText: '',
        queryText: '',
        bodyText: '{\n  "chat_id": "@my_creator_group",\n  "text": "New content ready for review: {{storageUrl}}",\n  "parse_mode": "HTML"\n}',
        resultPath: '',
        targetTable: 'Content',
        schedule: 'Manual',
        description: 'Get internal team approval via Telegram notifications.'
    },
    {
        id: 'cloudinary-optimizer',
        name: 'Media Optimizer (AI)',
        purpose: 'Automatic background removal & AI cropping',
        method: 'POST',
        url: 'https://api.cloudinary.com/v1_1/<cloud_name>/image/upload',
        authMode: 'none',
        authHeaderName: 'Authorization',
        headersText: '{\n  "Content-Type": "application/json"\n}',
        queryText: '',
        bodyText: '{\n  "file": "{{storageUrl}}",\n  "upload_preset": "influencer_auto",\n  "background_removal": "cloudinary_ai",\n  "transformation": [\n    {"width": 1080, "height": 1350, "crop": "fill", "gravity": "face"},\n    {"effect": "improve:outdoor"}\n  ]\n}',
        resultPath: 'secure_url',
        targetTable: 'Content Media',
        schedule: 'On intake',
        description: 'Auto-crop to Social-ratio & Remove Backgrounds using Cloudinary AI.'
    }
];

const INITIAL_CONNECTOR_DRAFT: CustomConnectorConfig = {
    id: '',
    name: 'New Bridge',
    purpose: '',
    method: 'GET',
    url: '',
    authMode: 'none',
    authHeaderName: 'Authorization',
    headersText: '',
    queryText: '',
    bodyText: '',
    resultPath: '',
    targetTable: 'Content',
    schedule: 'Manual'
};

const EMPTY_KEYS: Record<ProviderId, string> = {
    openrouter: '',
    openai: '',
    gemini: '',
    replicate: '',
    fal: '',
    huggingface: '',
    civitai: '',
    kling: '',
    runway: '',
    luma: '',
    veo: '',
    wan: '',
    muapi: '',
    xai: '',
    google: '',
    together: ''
};

const EMPTY_STATUS: Record<ProviderId, { state: 'idle' | 'ok' | 'error'; message?: string }> = {
    openrouter: { state: 'idle' },
    openai: { state: 'idle' },
    gemini: { state: 'idle' },
    replicate: { state: 'idle' },
    fal: { state: 'idle' },
    huggingface: { state: 'idle' },
    civitai: { state: 'idle' },
    kling: { state: 'idle' },
    runway: { state: 'idle' },
    luma: { state: 'idle' },
    veo: { state: 'idle' },
    wan: { state: 'idle' },
    muapi: { state: 'idle' },
    xai: { state: 'idle' },
    google: { state: 'idle' },
    together: { state: 'idle' }
};

function getConnectionModelKey(providerId: ProviderId) {
    return `connectionModel_${providerId}`;
}

function shallowEqualStringMap(a: Record<string, string>, b: Record<string, string>) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => a[key] === b[key]);
}

export function StorageTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const session = useSession();
    const orgId = base.id;
    const canEditConfig = globalConfig.hasPermissionToSet();
    const recordWriteCheck = session.checkPermissionsForUpdateRecords();
    const hasRecordWritePermission = recordWriteCheck.hasPermission;
    const isReadOnly = !canEditConfig;

    // Always BYOK mode for marketplace compliance
    const mode = 'byok';
    const configuredStorageMode = (globalConfig.get('storageMode') as StorageMode | undefined) || 'standard';
    const configuredDefaultLlm = (globalConfig.get('defaultLlm') as string | undefined) || 'openrouter';
    const configuredDefaultImage = (globalConfig.get('defaultImage') as string | undefined) || 'replicate';
    const configuredDefaultVideo = (globalConfig.get('defaultVideo') as string | undefined) || 'luma';

    const configuredModels = useMemo(() => {
        const acc = { ...EMPTY_KEYS };
        ALL_PROVIDERS.forEach((provider) => {
            acc[provider.id] = (globalConfig.get(getConnectionModelKey(provider.id)) as string | undefined) || '';
        });
        return acc;
    }, [globalConfig]);

    const [keys, setKeys] = useState<Record<ProviderId, string>>({ ...EMPTY_KEYS });
    const [models, setModels] = useState<Record<ProviderId, string>>(configuredModels);
    const [status, setStatus] = useState<Record<ProviderId, { state: 'idle' | 'ok' | 'error'; message?: string }>>({ ...EMPTY_STATUS });
    const [airtableStatus, setAirtableStatus] = useState<{ connected: boolean; email?: string } | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [storageMode, setStorageMode] = useState<StorageMode>(configuredStorageMode);
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [bucketName, setBucketName] = useState('');
    const [region, setRegion] = useState('us-east-1');
    const [saving, setSaving] = useState(false);
    
    const [storageSaved, setStorageSaved] = useState<{ bucketName?: string | null; region?: string | null; hasAccessKey: boolean; hasSecretKey: boolean }>({
        bucketName: null,
        region: 'us-east-1',
        hasAccessKey: false,
        hasSecretKey: false
    });

    const [defaultLlm, setDefaultLlm] = useState(configuredDefaultLlm);
    const [defaultImage, setDefaultImage] = useState(configuredDefaultImage);
    const [defaultVideo, setDefaultVideo] = useState(configuredDefaultVideo);

    const [fanvueStatus, setFanvueStatus] = useState<FanvueStatusItem>({
        success: true,
        connected: false,
        scopes: [],
        has_refresh_token: false,
        auth_configured: false
    });

    const [fanvueConnecting, setFanvueConnecting] = useState(false);
    const [fanvueNotice, setFanvueNotice] = useState('');
    const [backendHealth, setBackendHealth] = useState<{ status: string; services: Record<string, string> }>({ status: 'loading', services: {} });

    const [savedConnectors, setSavedConnectors] = useState<CustomConnectorConfig[]>(() => {
        try {
            const raw = globalConfig.get('customApiConnectors') as string | undefined;
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const [connectorDraft, setConnectorDraft] = useState<CustomConnectorConfig>(INITIAL_CONNECTOR_DRAFT);
    const [connectorAuthToken, setConnectorAuthToken] = useState('');
    const [connectorTest, setConnectorTest] = useState<ConnectorTestResponse | null>(null);
    const [testingConnector, setTestingConnector] = useState(false);
    const [showAdvancedConnector, setShowAdvancedConnector] = useState(false);
    const [showDeveloperMode, setShowDeveloperMode] = useState(false);
    const [connectionsNotice, setConnectionsNotice] = useState('');

    const fetchAirtableStatus = async () => {
        try {
            const status = await backendService.getAirtableStatus(orgId);
            setAirtableStatus(status);
        } catch (e) {
            console.error('Airtable status check failed', e);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchAirtableStatus();
        }
    }, [orgId]);

    // Handle OAuth messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'airtable-connected') {
                fetchAirtableStatus();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const onConnectAirtable = async () => {
        try {
            const { authorize_url } = await backendService.getAirtableConnectUrl(orgId);
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            window.open(authorize_url, 'airtable-oauth', `width=${width},height=${height},left=${left},top=${top}`);
        } catch (error: any) {
            alert(`Connect failed: ${error.message}`);
        }
    };

    const onDisconnectAirtable = async () => {
        if (!confirm('Disconnect Airtable account? Backend will no longer be able to write to this base.')) return;
        try {
            await backendService.disconnectAirtable(orgId);
            fetchAirtableStatus();
        } catch (error: any) {
            alert(`Disconnect failed: ${error.message}`);
        }
    };

    useEffect(() => {
        setStorageMode((prev: StorageMode) => (prev === configuredStorageMode ? prev : configuredStorageMode));
        setDefaultLlm((prev: string) => (prev === configuredDefaultLlm ? prev : configuredDefaultLlm));
        setDefaultImage((prev: string) => (prev === configuredDefaultImage ? prev : configuredDefaultImage));
        setDefaultVideo((prev: string) => (prev === configuredDefaultVideo ? prev : configuredDefaultVideo));
        setModels((prev: Record<ProviderId, string>) => (shallowEqualStringMap(prev, configuredModels) ? prev : configuredModels));
    }, [
        configuredStorageMode,
        configuredDefaultLlm,
        configuredDefaultImage,
        configuredDefaultVideo,
        configuredModels
    ]);

    const refreshFanvueStatus = async () => {
        const latest = await backendService.getFanvueStatus(orgId);
        setFanvueStatus(latest);
        return latest;
    };

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setLoadingStatus(true);
            try {
                const res = await backendService.getConnectionsStatus(orgId);
                const storageRes = await backendService.getStorageStatus(orgId);
                const fanvueRes = await refreshFanvueStatus();
                const healthRes = await backendService.getHealth();
                if (!isMounted) return;
                setBackendHealth(healthRes);
                const nextStatus = { ...EMPTY_STATUS };
                res.connections.forEach((item: ConnectionStatusItem) => {
                    const providerId = item.provider as ProviderId;
                    if (!nextStatus[providerId]) return;
                    nextStatus[providerId] = {
                        state: item.has_key ? 'ok' : 'idle',
                        message: item.has_key ? 'Configured on backend' : 'Not configured'
                    };
                });
                setStatus(nextStatus);
                setStorageSaved({
                    bucketName: storageRes.bucket_name,
                    region: storageRes.region || 'us-east-1',
                    hasAccessKey: storageRes.has_access_key,
                    hasSecretKey: storageRes.has_secret_key
                });
                setBucketName(storageRes.bucket_name || '');
                setRegion(storageRes.region || 'us-east-1');
                setFanvueStatus(fanvueRes);
            } catch (error) {
                console.error(error);
            } finally {
                if (isMounted) {
                    setLoadingStatus(false);
                }
            }
        };
        load();
        return () => {
            isMounted = false;
        };
    }, [orgId]);

    useEffect(() => {
        const onFanvueMessage = async (event: MessageEvent) => {
            if (event?.data?.type !== 'fanvue-connected') return;
            try {
                const latest = await refreshFanvueStatus();
                if (latest.connected) {
                    setFanvueNotice('Fanvue connected. You can close the OAuth tab.');
                }
                setFanvueConnecting(false);
            } catch (error) {
                console.error(error);
                setFanvueConnecting(false);
            }
        };
        window.addEventListener('message', onFanvueMessage);
        return () => window.removeEventListener('message', onFanvueMessage);
    }, [orgId]);

    const connectionOkCount = useMemo(
        () => Object.values(status).filter((item) => item.state === 'ok').length,
        [status]
    );

    const parseConnectorMap = (value: string, label: string): Record<string, string> => {
        if (!value.trim()) return {};
        try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(`${label} must be a JSON object`);
            }
            return Object.fromEntries(
                Object.entries(parsed).map(([key, item]) => [String(key), item == null ? '' : String(item)])
            );
        } catch (error: any) {
            throw new Error(error?.message || `${label} JSON is invalid`);
        }
    };

    const parseConnectorBody = (value: string): Record<string, any> | undefined => {
        if (!value.trim()) return undefined;
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Body must be a JSON object');
        }
        return parsed;
    };

    const saveCustomConnectors = async (next: CustomConnectorConfig[]) => {
        setSavedConnectors(next);
        if (canEditConfig) {
            await globalConfig.setAsync('customApiConnectors', JSON.stringify(next));
        }
    };

    const applyConnectorTemplate = (templateId: string) => {
        const template = CONNECTOR_TEMPLATES.find((item) => item.id === templateId);
        if (!template) return;
        setConnectorDraft({
            id: '',
            name: template.name,
            purpose: template.purpose,
            method: template.method,
            url: template.url,
            authMode: template.authMode,
            authHeaderName: template.authHeaderName,
            headersText: template.headersText,
            queryText: template.queryText,
            bodyText: template.bodyText,
            resultPath: template.resultPath,
            targetTable: template.targetTable,
            schedule: template.schedule
        });
        setConnectorAuthToken('');
        setConnectorTest(null);
    };

    const saveConnectorDraft = async () => {
        if (isReadOnly) {
            alert('You do not have permission to save connector configuration.');
            return;
        }
        const normalized: CustomConnectorConfig = {
            ...connectorDraft,
            id: connectorDraft.id || `connector_${Date.now()}`,
            name: (connectorDraft.name || '').trim() || 'Custom connector',
            purpose: (connectorDraft.purpose || '').trim(),
            url: (connectorDraft.url || '').trim(),
            authMode: connectorDraft.authMode,
            authHeaderName: (connectorDraft.authHeaderName || 'Authorization').trim(),
            headersText: (connectorDraft.headersText || '').trim(),
            queryText: (connectorDraft.queryText || '').trim(),
            bodyText: (connectorDraft.bodyText || '').trim(),
            resultPath: (connectorDraft.resultPath || '').trim(),
            targetTable: connectorDraft.targetTable || 'Content',
            schedule: connectorDraft.schedule || 'Manual'
        };
        if (!normalized.url) {
            alert('Connector URL is required.');
            return;
        }
        const next = [...savedConnectors.filter((item) => item.id !== normalized.id), normalized];
        await saveCustomConnectors(next);
        setConnectorDraft(normalized);
        alert('Connector saved.');
    };

    const deleteConnectorDraft = async (connectorId: string) => {
        if (isReadOnly) {
            alert('You do not have permission to delete connector configuration.');
            return;
        }
        const next = savedConnectors.filter((item) => item.id !== connectorId);
        await saveCustomConnectors(next);
        if (connectorDraft.id === connectorId) {
            setConnectorDraft(INITIAL_CONNECTOR_DRAFT);
            setConnectorTest(null);
            setConnectorAuthToken('');
        }
    };

    const testConnectorDraft = async () => {
        const urlToTest = (connectorDraft.url || '').trim();
        if (!urlToTest) {
            alert('Connector URL is required before test.');
            return;
        }
        setTestingConnector(true);
        try {
            const headers = parseConnectorMap(connectorDraft.headersText, 'Headers');
            const queryParams = parseConnectorMap(connectorDraft.queryText, 'Query params');
            const body = parseConnectorBody(connectorDraft.bodyText);
            const result = await backendService.testCustomConnector({
                orgId,
                name: connectorDraft.name,
                method: connectorDraft.method,
                url: connectorDraft.url.trim(),
                headers,
                queryParams,
                body,
                authMode: connectorDraft.authMode,
                authToken: connectorAuthToken || undefined,
                authHeaderName: connectorDraft.authHeaderName,
                resultPath: connectorDraft.resultPath || undefined
            });
            setConnectorTest(result);
        } catch (error: any) {
            setConnectorTest(null);
            alert(error?.message || 'Connector test failed');
        } finally {
            setTestingConnector(false);
        }
    };

    const statusBadge = (provider: ProviderId) => {
        const current = status[provider];
        if (!current) return null;
        const colors =
            current.state === 'ok'
                ? { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', text: '#10B981' }
                : current.state === 'error'
                    ? { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', text: '#EF4444' }
                    : { bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.28)', text: '#3B82F6' };
        let label = current.message || (current.state === 'ok' ? 'OK' : current.state === 'error' ? 'Error' : 'Idle');
        if (label.startsWith('data:image/')) {
            label = 'Generated (Image)';
        }
        return (
            <span
                className="tag"
                style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    textTransform: 'none'
                }}
            >
                {label}
            </span>
        );
    };

    const persistModelSelections = async () => {
        if (!canEditConfig) return;
        await Promise.all(
            ALL_PROVIDERS.map((provider) => globalConfig.setAsync(getConnectionModelKey(provider.id), models[provider.id] || ''))
        );
    };

    const onSaveConnections = async () => {
        if (isReadOnly) {
            alert('You do not have permission to update workspace configuration.');
            return;
        }
        setSaving(true);
        try {
            await Promise.all(
                ALL_PROVIDERS.map((provider) =>
                    backendService.saveConnection({
                        orgId,
                        provider: provider.id,
                        mode,
                        apiKey: mode === 'byok' ? keys[provider.id] : undefined
                    })
                )
            );
            await persistModelSelections();
            const res = await backendService.getConnectionsStatus(orgId);
            const nextStatus = { ...EMPTY_STATUS };
            res.connections.forEach((item) => {
                const providerId = item.provider as ProviderId;
                if (!nextStatus[providerId]) return;
                nextStatus[providerId] = {
                    state: item.has_key ? 'ok' : 'idle',
                    message: item.has_key ? 'Configured on backend' : 'Not configured'
                };
            });
            setStatus(nextStatus);
            setKeys({ ...EMPTY_KEYS });
            alert('Connections saved.');
        } catch (error: any) {
            console.error(error);
            alert(error?.message || 'Failed to save connections.');
        } finally {
            setSaving(false);
        }
    };

    const onTest = async (provider: ProviderId) => {
        setStatus((prev) => ({ ...prev, [provider]: { state: 'idle', message: 'Testing...' } }));
        try {
            if (keys[provider]) {
                await backendService.saveConnection({
                    orgId,
                    provider,
                    mode: 'byok',
                    apiKey: keys[provider]
                });
            }
            if (canEditConfig) {
                await globalConfig.setAsync(getConnectionModelKey(provider), models[provider] || '');
            }
            const res = await backendService.testConnection({
                orgId,
                provider,
                model: models[provider] || undefined,
                prompt: 'Reply OK'
            });
            setStatus((prev) => ({ ...prev, [provider]: { state: 'ok', message: res.message || 'OK' } }));
        } catch (error: any) {
            const rawMessage = error?.message || 'Test failed';
            const friendlyMessage = rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')
                ? 'Quota exceeded. Check billing and try again.'
                : rawMessage.includes('Provider not supported')
                    ? 'Test not available for this provider yet.'
                    : rawMessage;
            setStatus((prev) => ({
                ...prev,
                [provider]: { state: 'error', message: friendlyMessage }
            }));
        }
    };

    const handleStorageSave = async () => {
        if (isReadOnly) {
            alert('You do not have permission to update workspace configuration.');
            return;
        }
        try {
            await globalConfig.setAsync('storageMode', storageMode);
            if (storageMode === 'pro') {
                await backendService.saveStorageConfig({
                    orgId,
                    provider: 's3',
                    bucketName,
                    region,
                    accessKey,
                    secretKey
                });
                setStorageSaved({
                    bucketName,
                    region,
                    hasAccessKey: Boolean(accessKey),
                    hasSecretKey: Boolean(secretKey)
                });
                setAccessKey('');
                setSecretKey('');
            }
            alert('Storage configuration saved.');
        } catch (error) {
            console.error(error);
            alert('Error during save.');
        }
    };

    const handleDefaultSave = async () => {
        if (isReadOnly) {
            alert('You do not have permission to update workspace configuration.');
            return;
        }
        try {
            await globalConfig.setAsync('defaultLlm', defaultLlm);
            await globalConfig.setAsync('defaultImage', defaultImage);
            await globalConfig.setAsync('defaultVideo', defaultVideo);
            await persistModelSelections();
            alert('Default providers saved.');
        } catch (error) {
            console.error(error);
            alert('Error saving defaults.');
        }
    };

    const handleFanvueConnect = async () => {
        try {
            setFanvueConnecting(true);
            setFanvueNotice('Waiting for Fanvue authorization...');
            const response = await backendService.getFanvueConnectUrl(orgId);
            window.open(response.authorize_url, '_blank', 'noopener,noreferrer');
            let attempts = 0;
            const poll = window.setInterval(async () => {
                attempts += 1;
                try {
                    const latest = await refreshFanvueStatus();
                    if (latest.connected || (latest.accounts || []).length > 0) {
                        window.clearInterval(poll);
                        setFanvueConnecting(false);
                        setFanvueNotice('Fanvue connected. Ready for publishing and metrics sync.');
                        return;
                    }
                } catch (error) {
                    console.error(error);
                }
                if (attempts >= 12) {
                    window.clearInterval(poll);
                    setFanvueConnecting(false);
                    setFanvueNotice('OAuth window opened. If nothing changed, click Refresh status after authorizing.');
                }
            }, 2500);
        } catch (error: any) {
            setFanvueConnecting(false);
            setFanvueNotice('');
            alert(error?.message || 'Fanvue connection failed');
        }
    };

    const handleFanvueDisconnect = async (accountId?: string) => {
        try {
            await backendService.disconnectFanvue(orgId, accountId);
            const latest = await refreshFanvueStatus();
            setFanvueStatus(latest);
            setFanvueNotice(accountId ? 'Fanvue account disconnected.' : 'All Fanvue accounts disconnected.');
            alert(accountId ? 'Fanvue account disconnected.' : 'Fanvue disconnected.');
        } catch (error: any) {
            alert(error?.message || 'Fanvue disconnect failed');
        }
    };

    const renderProviderSection = (title: string, subtitle: string, providers: ProviderDefinition[]) => (
        <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</div>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
                {providers.map((provider) => (
                    <div key={provider.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{provider.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{provider.description}</div>
                            </div>
                            {statusBadge(provider.id)}
                        </div>
                        <div className="form-group" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>API Key</label>
                                    <span style={{ fontSize: '9px', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>🔑 AES-256</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sent to backend, not saved in Airtable</div>
                            </div>
                            <input
                                type="password"
                                className="dark-input"
                                placeholder={status[provider.id]?.state === 'ok' ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (Key securely configured)' : 'Paste your API key'}
                                value={keys[provider.id]}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setKeys((prev) => ({ ...prev, [provider.id]: value }));
                                }}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', marginTop: '12px' }}>
                            <input
                                type="text"
                                className="dark-input"
                                placeholder={`Model: ${provider.modelPlaceholder}`}
                                value={models[provider.id] || ''}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setModels((prev) => ({ ...prev, [provider.id]: value }));
                                }}
                                style={{ height: '36px' }}
                            />
                            <button className="gradient-btn" onClick={() => onTest(provider.id)} disabled={loadingStatus} style={{ height: '36px', minWidth: '80px' }}>
                                Test
                            </button>
                        </div>
                        {status[provider.id]?.state === 'ok' && status[provider.id]?.message?.startsWith('data:image/') && (
                            <div style={{ marginTop: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Test Image Output:</div>
                                <img src={status[provider.id]!.message!} alt="Test Result" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button className="gradient-btn" onClick={onSaveConnections} disabled={saving || loadingStatus || isReadOnly} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{saving ? 'Saving...' : 'Save provider settings'}</span>
                    {!saving && <span style={{ fontSize: '12px' }}>🔒</span>}
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    In BYOK mode, `Test` auto-saves the current key for that provider before testing. 
                    <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>• AES-256 Encrypted</span>
                </div>
            </div>
        </div>
    );

    const renderCustomBridgesSection = () => (
        <div className="glass-card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <div className="card-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔗</span> Custom API Bridges
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Connect your own GPU servers (RunPod/Modal), Webhooks, or Media APIs.
                    </div>
                </div>
                <button 
                    className="ghost-btn" 
                    onClick={() => setShowAdvancedConnector(!showAdvancedConnector)}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                    {showAdvancedConnector ? 'Close Editor' : 'Manage Bridges'}
                </button>
            </div>

            {showAdvancedConnector ? (
                <div style={{ display: 'grid', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Templates Selector */}
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Templates</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                            {CONNECTOR_TEMPLATES.map((tmpl) => (
                                <div 
                                    key={tmpl.id} 
                                    className="glass-card" 
                                    style={{ 
                                        padding: '12px', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.2s ease',
                                        border: connectorDraft.id === tmpl.id ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                        background: connectorDraft.id === tmpl.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)'
                                    }}
                                    onClick={() => applyConnectorTemplate(tmpl.id)}
                                >
                                    <div style={{ fontSize: '13px', fontWeight: 800 }}>{tmpl.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{tmpl.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor Form */}
                    <div style={{ display: 'grid', gap: '16px', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Bridge Name</label>
                                <input 
                                    type="text" 
                                    className="dark-input" 
                                    value={connectorDraft.name} 
                                    onChange={(e) => setConnectorDraft({ ...connectorDraft, name: e.target.value })} 
                                    placeholder="e.g. My RunPod Workflow"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Method</label>
                                <select 
                                    className="dark-select" 
                                    value={connectorDraft.method}
                                    onChange={(e) => setConnectorDraft({ ...connectorDraft, method: e.target.value as any })}
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">API Endpoint URL</label>
                            <input 
                                type="text" 
                                className="dark-input" 
                                value={connectorDraft.url} 
                                onChange={(e) => setConnectorDraft({ ...connectorDraft, url: e.target.value })} 
                                placeholder="https://api.example.com/v1/..."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Auth Mode</label>
                                <select 
                                    className="dark-select" 
                                    value={connectorDraft.authMode}
                                    onChange={(e) => setConnectorDraft({ ...connectorDraft, authMode: e.target.value as any })}
                                >
                                    <option value="none">No Auth</option>
                                    <option value="bearer">Bearer Token</option>
                                    <option value="header">Custom Header</option>
                                </select>
                            </div>
                            {connectorDraft.authMode !== 'none' && (
                                <div className="form-group">
                                    <label className="form-label">Auth Token / Key</label>
                                    <input 
                                        type="password" 
                                        className="dark-input" 
                                        value={connectorAuthToken} 
                                        onChange={(e) => setConnectorAuthToken(e.target.value)} 
                                        placeholder="Paste token here..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Body (JSON) - Use {"{{prompt}}"}, {"{{storageUrl}}"}, {"{{name}}"}</label>
                            <textarea 
                                className="dark-input" 
                                style={{ height: '120px', fontFamily: 'monospace', fontSize: '12px' }}
                                value={connectorDraft.bodyText}
                                onChange={(e) => setConnectorDraft({ ...connectorDraft, bodyText: e.target.value })}
                                placeholder='{ "input": { "prompt": "{{prompt}}" } }'
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button className="gradient-btn" style={{ flex: 1 }} onClick={saveConnectorDraft}>Save Bridge</button>
                            <button 
                                className="ghost-btn" 
                                onClick={testConnectorDraft} 
                                disabled={testingConnector}
                                style={{ minWidth: '120px' }}
                            >
                                {testingConnector ? 'Testing...' : 'Test Bridge'}
                            </button>
                        </div>

                        {connectorTest && (
                            <div style={{ 
                                marginTop: '12px', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                background: connectorTest.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                border: connectorTest.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: connectorTest.success ? '#10B981' : '#EF4444' }}>
                                        {connectorTest.success ? 'Success' : 'Test Failed'} ({connectorTest.status_code})
                                    </span>
                                </div>
                                <pre style={{ fontSize: '10px', overflowX: 'auto', maxHeight: '100px', margin: 0, opacity: 0.8 }}>
                                    {JSON.stringify(connectorTest.preview || connectorTest.message, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* Saved Bridges List */}
                    {savedConnectors.length > 0 && (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saved Bridges</div>
                            {savedConnectors.map((conn) => (
                                <div key={conn.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{conn.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{conn.method} • {conn.url.substring(0, 40)}...</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="ghost-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setConnectorDraft(conn)}>Edit</button>
                                        <button className="ghost-btn" style={{ padding: '4px 10px', fontSize: '11px', color: '#EF4444' }} onClick={() => deleteConnectorDraft(conn.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {savedConnectors.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom bridges configured yet.</div>
                    ) : (
                        savedConnectors.map(c => (
                            <div 
                                key={c.id} 
                                style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 10px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    fontSize: '11px', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'default'
                                }}
                            >
                                <span style={{ fontWeight: 600 }}>🟢 {c.name}</span>
                                <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                                    <button 
                                        className="ghost-btn" 
                                        style={{ padding: '2px 6px', fontSize: '10px' }} 
                                        onClick={() => {
                                            setConnectorDraft(c);
                                            setShowAdvancedConnector(true);
                                        }}
                                        title="Edit"
                                    >✏️</button>
                                    <button 
                                        className="ghost-btn" 
                                        style={{ padding: '2px 6px', fontSize: '10px', color: '#EF4444' }} 
                                        onClick={() => {
                                            if (confirm(`Delete bridge "${c.name}"?`)) {
                                                deleteConnectorDraft(c.id);
                                            }
                                        }}
                                        title="Delete"
                                    >🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    return (

        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '12px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>WORKSPACE STATUS</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>READY</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Organization: {orgId.slice(-6).toUpperCase()}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>SECURITY STATUS</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>ENCRYPTED</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AES-256 Fernet Standard</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>INFRASTRUCTURE</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: backendHealth.status === 'operational' ? 'var(--primary)' : '#EF4444' }}>{backendHealth.status === 'operational' ? 'OPERATIONAL' : 'STANDBY'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Backend healthy</div>
                </div>
            </div>

            {!canEditConfig && (
                <div className="glass-card" style={{ border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                    <div style={{ fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>Read-only mode</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This user can view settings, but cannot save billing mode, defaults, or storage settings in Airtable configuration.</div>
                </div>
            )}

            {!hasRecordWritePermission && (
                <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.28)' }}>
                    <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '8px' }}>Limited workspace permission</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Session permission is currently limited. Record-writing flows elsewhere in the app may stay blocked until the user has write access.</div>
                </div>
            )}

            <div className="glass-card">
                <div style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚡</span> AI Engine Connections
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Connect your own AI generation engines via API keys. Your keys are encrypted and stored securely on our backend.</div>
                </div>
                <div style={{ display: 'grid', gap: '20px' }}>

                            <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '20px' }}>🛡️</div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', marginBottom: '2px' }}>Secure Infrastructure & AES-256 Encryption</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>All connection tokens are <strong>AES-256 encrypted</strong> using the Fernet standard. Your secrets never touch the public Airtable base.</div>
                                </div>
                            </div>
                            {renderProviderSection('LLM providers', 'Text and prompt generation providers used by Content Studio.', LLM_PROVIDERS)}
                            {renderProviderSection('Image providers', 'Image generation engines used by Production Queue.', IMAGE_PROVIDERS)}
                            {renderProviderSection('Video providers', 'Video-capable providers for motion workflows.', VIDEO_PROVIDERS)}
                </div>
            </div>

            <div className="glass-card">
                <div style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ marginBottom: '4px' }}>Media Storage</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Define where generated assets are hosted.</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    <button type="button" onClick={() => setStorageMode('standard')} className={storageMode === 'standard' ? 'gradient-btn' : 'ghost-btn'} style={{ textAlign: 'left', padding: '18px', minHeight: '96px', border: storageMode === 'standard' ? '2px solid var(--primary)' : '1px solid var(--card-border)' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Standard Hosting</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Uses app-managed secure storage for rapid asset delivery. Managed by backend.</div>
                    </button>
                    <button type="button" onClick={() => setStorageMode('pro')} className={storageMode === 'pro' ? 'gradient-btn' : 'ghost-btn'} style={{ textAlign: 'left', padding: '18px', minHeight: '96px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>AWS S3 Bucket</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Enterprise storage in your own AWS bucket for high retention and compliance.</div>
                    </button>
                </div>

                {storageMode === 'pro' && (
                    <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">S3 Access Key</label>
                            <input type="text" className="dark-input" placeholder="AKIA..." value={accessKey} onChange={(e) => setAccessKey(e.currentTarget.value)} disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">S3 Secret Key</label>
                            <input type="password" className="dark-input" placeholder="********" value={secretKey} onChange={(e) => setSecretKey(e.currentTarget.value)} disabled={isReadOnly} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Bucket Name</label>
                                <input type="text" className="dark-input" placeholder="my-influencer-assets" value={bucketName} onChange={(e) => setBucketName(e.currentTarget.value)} disabled={isReadOnly} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">S3 Region</label>
                                <select className="dark-select" value={region} onChange={(e) => setRegion(e.currentTarget.value)} disabled={isReadOnly}>
                                    <option value="us-east-1">us-east-1</option>
                                    <option value="eu-west-1">eu-west-1</option>
                                    <option value="eu-west-3">eu-west-3</option>
                                </select>
                            </div>
                        </div>
                        <button className="gradient-btn" onClick={handleStorageSave} disabled={isReadOnly}>Save storage settings</button>
                    </div>
                )}

                <div style={{ marginTop: '24px', padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#18BFFF', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: '18px' }}>A</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '14px' }}>Airtable Connection</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required for backend base updates</div>
                            </div>
                        </div>
                        <div style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: airtableStatus?.connected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: airtableStatus?.connected ? '#10B981' : 'var(--text-muted)', border: airtableStatus?.connected ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.1)' }}>
                            {airtableStatus?.connected ? 'CONNECTED' : 'NOT CONNECTED'}
                        </div>
                    </div>
                    {airtableStatus?.connected ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{airtableStatus.email || 'Authorized User'}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Secure OAuth Token stored</div>
                            </div>
                            <button className="ghost-btn" style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444' }} onClick={onDisconnectAirtable}>Disconnect</button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>Grant the extension permission to write generated content and update records in your base.</p>
                            <button className="gradient-btn" style={{ width: '100%', padding: '10px', fontSize: '13px' }} onClick={onConnectAirtable} disabled={isReadOnly}>Connect Airtable via OAuth</button>
                        </div>
                    )}
                </div>
            </div>
            {renderCustomBridgesSection()}

            <div className="glass-card">
                <div style={{ marginBottom: '14px' }}>
                    <div className="card-title" style={{ marginBottom: '6px' }}>Fanvue Integration</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Connect creator accounts for publishing.</div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="gradient-btn" onClick={handleFanvueConnect} disabled={fanvueConnecting}>{fanvueStatus.connected ? 'Manage Fanvue' : 'Connect Fanvue'}</button>
                    {fanvueStatus.connected && <button className="ghost-btn" onClick={() => handleFanvueDisconnect()}>Disconnect All</button>}
                </div>
            </div>
        </div>
    );
}
