/**
 * AI Influencer Studio - Application principale
 */

import React, { useState, useEffect } from 'react';
import { useBase, useGlobalConfig, useSettingsButton } from '@airtable/blocks/ui';
import { loadCSSFromString } from '@airtable/blocks/ui';
import { Sidebar } from './components/Sidebar';
import { WorkspaceTab } from './components/WorkspaceTab';
import { TrainingTab } from './components/TrainingTab';
import { LoraManager } from './components/LoraManager';
import { HistoryTab } from './components/HistoryTab';
import { LibraryTab } from './components/LibraryTab';
import { StorageTab } from './components/StorageTab';
import { PresetsTab } from './components/PresetsTab';
import { DashboardTab } from './components/DashboardTab';
import { WorkflowTab } from './components/WorkflowTab';
import { EditorNodeTab } from './components/EditorNodeTab';
import { SetupTab } from './components/SetupTab';
import { ModelCatalogTab } from './components/ModelCatalogTab';
import { PlaygroundTab } from './components/PlaygroundTab';
import { EditorTab } from './components/EditorTab';
import { EditProTab } from './components/EditProTab';
import { BeginnerWizardTab } from './components/BeginnerWizardTab';
import { PromptProducerTab } from './components/PromptProducerTab';
import { QueueTab } from './components/QueueTab';
import { VideoTab } from './components/VideoTab';
import { RunnerTab } from './components/RunnerTab';
import { InstagramCFTab } from './components/InstagramCFTab';
import { ThreadsTab } from './components/ThreadsTab';
import { DARK_THEME_STYLES } from './styles/theme';
import type { AIModel } from './types/domain';
import { mapRegistryToAIModel, useModelRegistry } from './services/modelRegistry';
import { AirtableService } from './services/airtable';
import { WorkspaceProvider, useWorkspaceStore } from './workspace/workspaceStore';
import { backendService } from './services/backend';
import { loraService } from './services/lora';
import { ALL_PROVIDERS } from './data/providers';



// Charger les styles au démarrage
loadCSSFromString(DARK_THEME_STYLES);

const PremiumPaywall = ({ baseId }: { baseId: string }) => (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh', textAlign: 'center', background: 'linear-gradient(180deg, rgba(16,185,129,0.05) 0%, rgba(0,0,0,0.5) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ fontSize: 64, marginBottom: 16, textShadow: '0 0 40px rgba(16,185,129,0.5)' }}>💎</div>
        <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>Premium Studio Feature</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, maxWidth: 450, lineHeight: '1.6' }}>
            This powerful AI tool is exclusively reserved for Premium members. Upgrade to unlock full access to Video Studio, advanced LoRAs, Pro Editor, and all high-end models.
        </p>
        <a 
            href={`https://whop.com/checkout/plan_9235jZU15CtNu?org_id=${baseId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-btn"
            style={{ textDecoration: 'none', padding: '12px 32px', fontSize: 15, fontWeight: 800 }}
        >
            🚀 Unlock Premium Studio
        </a>
        <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, width: '100%', maxWidth: 300 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontWeight: 600 }}>ALREADY A MEMBER?</div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input 
                    type="password"
                    placeholder="Enter License Key..."
                    id="whop-unlock-input"
                    style={{ 
                        flex: 1, 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={async () => {
                        const val = (document.getElementById('whop-unlock-input') as HTMLInputElement).value;
                        if (!val) return;
                        // Use globalConfig to save the token for future sessions
                        // @ts-ignore
                        const globalConfig = (window as any)._globalConfig;
                        if (globalConfig) {
                            await globalConfig.setAsync('whop_token', val);
                            alert('License key saved. Refreshing...');
                            window.location.reload();
                        } else {
                            // Fallback for direct update if globalConfig not in window
                            alert('Saving failed. Use the Setup tab if visible or check console.');
                        }
                    }}
                    style={{
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#16a34a',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    UNLOCK
                </button>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
                Your license key is sent to your email after purchase on Whop.
            </div>
        </div>
    </div>
);

function AIInfluencerStudio() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    
    // Export globalConfig for the Paywall component
    useEffect(() => {
        (window as any)._globalConfig = globalConfig;
        backendService.setGlobalConfig(globalConfig);

        // Auto-fix localhost if found (per user request)
        const currentUrl = globalConfig.get('backendUrl') as string;
        if (currentUrl && currentUrl.includes('localhost') && globalConfig.hasPermissionToSet()) {
            globalConfig.setAsync('backendUrl', 'https://backend-fastapi1.onrender.com');
        }
    }, [globalConfig]);
    
    const canEditConfig = globalConfig.hasPermissionToSet();
    const { activeTab, setActiveTab } = useWorkspaceStore();
    const [selectedModel, setSelectedModel] = useState<AIModel | undefined>(undefined);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>(() => {
        const saved = globalConfig.get('aiStudioThemeMode') as string;
        if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
        return 'auto';
    });
    const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
        const saved = globalConfig.get('aiStudioDensity') as string;
        if (saved === 'compact' || saved === 'comfortable') return saved;
        return 'comfortable';
    });
    const [prefilledProfile, setPrefilledProfile] = useState<any>(null);
    const [queueCount, setQueueCount] = useState<number>(0);
    const [schemaValid, setSchemaValid] = useState<boolean>(true);
    const [prefilledEditorImage, setPrefilledEditorImage] = useState<string | null>(null);
    const [schemaIssues, setSchemaIssues] = useState<string[]>([]);
    const [billingInfo, setBillingInfo] = useState<{ credits: number; is_premium: boolean } | null>(null);
    const [isWhopValid, setIsWhopValid] = useState<boolean | null>(null);
    const [setupOkCount, setSetupOkCount] = useState<number>(0);
    const setupTotal = 4;
    const influencersTableId = globalConfig.get('influencersTableId') as string | undefined;
    const promptsTableId = globalConfig.get('promptsTableId') as string | undefined;
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const contentTableId = globalConfig.get('contentTableId') as string | undefined;
    const influencerNameFieldId = globalConfig.get('influencerNameFieldId') as string | undefined;
    const influencerAgeFieldId = globalConfig.get('influencerAgeFieldId') as string | undefined;
    const influencerGenderFieldId = globalConfig.get('influencerGenderFieldId') as string | undefined;
    const influencerNicheFieldId = globalConfig.get('influencerNicheFieldId') as string | undefined;
    const influencerStyleFieldId = globalConfig.get('influencerStyleFieldId') as string | undefined;
    const queuePromptFieldId = globalConfig.get('queuePromptFieldId') as string | undefined;
    const queueProviderFieldId = globalConfig.get('queueProviderFieldId') as string | undefined;
    const queueModelFieldId = globalConfig.get('queueModelFieldId') as string | undefined;
    const queueStatusFieldId = globalConfig.get('queueStatusFieldId') as string | undefined;
    const queueOutputFieldId = globalConfig.get('queueOutputFieldId') as string | undefined;
    const queueErrorFieldId = globalConfig.get('queueErrorFieldId') as string | undefined;
    const queueCostFieldId = globalConfig.get('queueCostFieldId') as string | undefined;
    const contentOutputFieldId = globalConfig.get('contentOutputFieldId') as string | undefined;
    const contentInfluencerFieldId = globalConfig.get('contentInfluencerFieldId') as string | undefined;
    const contentPlatformFieldId = globalConfig.get('contentPlatformFieldId') as string | undefined;
    const contentApprovedFieldId = globalConfig.get('contentApprovedFieldId') as string | undefined;

    // Apply theme to document body or a wrapper
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const applySystem = () => {
            if (themeMode === 'auto') {
                setTheme(media.matches ? 'dark' : 'light');
            }
        };
        applySystem();
        const handler = () => applySystem();
        if (media.addEventListener) {
            media.addEventListener('change', handler);
        } else {
            media.addListener(handler);
        }
        return () => {
            if (media.removeEventListener) {
                media.removeEventListener('change', handler);
            } else {
                media.removeListener(handler);
            }
        };
    }, [themeMode]);

    useEffect(() => {
        const mode = (globalConfig.get('connectionsBillingMode') as any) || 'platform';
        (window as any).AirtableMode = mode;
        if (themeMode === 'light') setTheme('light');
        if (themeMode === 'dark') setTheme('dark');
    }, [themeMode, globalConfig]);


    useEffect(() => {
        if (canEditConfig) {
            globalConfig.setAsync('aiStudioThemeMode', themeMode).catch(console.error);
        }
    }, [themeMode, canEditConfig, globalConfig]);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-density', density);
    }, [theme, density]);

    useEffect(() => {
        document.body.setAttribute('data-density', density);
        if (canEditConfig) {
            globalConfig.setAsync('aiStudioDensity', density).catch(console.error);
        }
    }, [density, canEditConfig, globalConfig]);

    useSettingsButton(() => {
        setActiveTab('setup');
    });

    // Backend URL used for all operations, retrieved from global config.
    // Defaults to the production SaaS backend to ensure a plug-and-play experience for Airtable Marketplace reviewers.
    const BACKEND_URL = (globalConfig.get('backendUrl') as string | undefined) || 'https://backend-fastapi1.onrender.com';

    useEffect(() => {
        backendService.setBaseUrl(BACKEND_URL);
        loraService.setBaseUrl(BACKEND_URL);
    }, [BACKEND_URL]);

    useEffect(() => {
        const fetchBilling = async () => {
            if (!BACKEND_URL) return;
            try {
                // Check general billing
                const status = await backendService.getBillingStatus(base.id);
                setBillingInfo({ credits: status.credits, is_premium: status.is_premium });
                
                // Also check Whop license strictly
                const whopStatus = await backendService.checkSubscriptionStatus();
                setIsWhopValid(whopStatus.isValid);
            } catch (err) {
                // Silent fail for global header if not set up yet
            }
        };
        fetchBilling();
        const interval = setInterval(fetchBilling, 180000);
        return () => clearInterval(interval);
    }, [base.id, BACKEND_URL]);

    // In-memory Auth logic: Keys are handled via the Connections tab 
    // and never persisted to Airtable's globalConfig for security.
    useEffect(() => {
        // We only set the Billing Mode. Specific keys are handled 
        // by the backend's internal state/storage per-request.
        // Initialize billing mode if not set. 
        const currentMode = globalConfig.get('connectionsBillingMode') as string;
        if (canEditConfig && !currentMode) {
            globalConfig.setAsync('connectionsBillingMode', 'platform').catch(() => {});
        }

    }, [globalConfig, BACKEND_URL, canEditConfig]);

    useEffect(() => {
        let active = true;
        if (!queueTableId) {
            setQueueCount(0);
            return undefined;
        }
        const loadQueue = async () => {
            try {
                const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
                const summary = await backendService.getQueueSummary(base.id, queueTableName, queueTableId);
                if (active) {
                    const nextCount = summary.counts?.Queued || 0;
                    setQueueCount((previousCount) => (previousCount === nextCount ? previousCount : nextCount));
                }
            } catch {
                if (active) {
                    setQueueCount((previousCount) => (previousCount === 0 ? previousCount : 0));
                }
            }
        };
        loadQueue();
        const timer = setInterval(loadQueue, 60000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [base.id, queueTableId]);

    useEffect(() => {
        const validate = () => {
            const issues: string[] = [];
            const requiredIssues: string[] = [];

            let okCount = 0;
            if (!influencersTableId || !base.getTableByIdIfExists(influencersTableId)) {
                requiredIssues.push('Missing Influencers table');
            } else {
                okCount += 1;
            }
            if (!promptsTableId || !base.getTableByIdIfExists(promptsTableId)) {
                requiredIssues.push('Missing Prompts table');
            } else {
                okCount += 1;
            }
            if (!queueTableId || !base.getTableByIdIfExists(queueTableId)) {
                requiredIssues.push('Missing Production Queue table');
            } else {
                okCount += 1;
            }
            if (!contentTableId || !base.getTableByIdIfExists(contentTableId)) {
                requiredIssues.push('Missing Content table');
            } else {
                okCount += 1;
            }

            const influencerFields = [
                ['influencerNameFieldId', influencerNameFieldId],
                ['influencerAgeFieldId', influencerAgeFieldId],
                ['influencerGenderFieldId', influencerGenderFieldId],
                ['influencerNicheFieldId', influencerNicheFieldId],
                ['influencerStyleFieldId', influencerStyleFieldId],
            ] as const;
            influencerFields.forEach(([key, value]) => {
                if (!value) requiredIssues.push(`Missing Influencers field: ${key}`);
            });
            const queueFields = [
                ['queuePromptFieldId', queuePromptFieldId],
                ['queueProviderFieldId', queueProviderFieldId],
                ['queueModelFieldId', queueModelFieldId],
                ['queueStatusFieldId', queueStatusFieldId],
                ['queueOutputFieldId', queueOutputFieldId],
                ['queueErrorFieldId', queueErrorFieldId],
                ['queueCostFieldId', queueCostFieldId],
            ] as const;
            queueFields.forEach(([key, value]) => {
                if (!value) requiredIssues.push(`Missing Queue field: ${key}`);
            });
            const contentFields = [
                ['contentOutputFieldId', contentOutputFieldId],
                ['contentInfluencerFieldId', contentInfluencerFieldId],
            ] as const;
            contentFields.forEach(([key, value]) => {
                if (!value) requiredIssues.push(`Missing Content field: ${key}`);
            });
            const optionalContentFields = [
                ['contentPlatformFieldId', contentPlatformFieldId],
                ['contentApprovedFieldId', contentApprovedFieldId],
            ] as const;
            optionalContentFields.forEach(([key, value]) => {
                if (!value) issues.push(`Optional Content field: ${key}`);
            });

            const nextIssues = [...requiredIssues, ...issues];
            const nextSchemaValid = requiredIssues.length === 0;
            setSchemaIssues((previousIssues) => (
                previousIssues.length === nextIssues.length &&
                    previousIssues.every((issue, index) => issue === nextIssues[index])
                    ? previousIssues
                    : nextIssues
            ));
            setSchemaValid((previousValid) => (previousValid === nextSchemaValid ? previousValid : nextSchemaValid));
            setSetupOkCount((previousCount) => (previousCount === okCount ? previousCount : okCount));
        };
        validate();
    }, [
        base.id,
        influencersTableId,
        promptsTableId,
        queueTableId,
        contentTableId,
        influencerNameFieldId,
        influencerAgeFieldId,
        influencerGenderFieldId,
        influencerNicheFieldId,
        influencerStyleFieldId,
        queuePromptFieldId,
        queueProviderFieldId,
        queueModelFieldId,
        queueStatusFieldId,
        queueOutputFieldId,
        queueErrorFieldId,
        queueCostFieldId,
        contentOutputFieldId,
        contentInfluencerFieldId,
        contentPlatformFieldId,
        contentApprovedFieldId,
    ]);

    // Récupérer la clé API depuis la config Airtable
    const apiKey = globalConfig.get('huggingfaceApiKey') as string | undefined;

    const toggleTheme = () => {
        setThemeMode((prev) => (prev === 'auto' ? 'dark' : prev === 'dark' ? 'light' : 'auto'));
    };
    const toggleDensity = () => {
        setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
    };
    const themeLabel = themeMode === 'auto' ? 'Theme: Auto' : themeMode === 'dark' ? 'Theme: Dark' : 'Theme: Light';
    const densityLabel = density === 'compact' ? 'UI: Compact' : 'UI: Comfortable';

    const [isBillingModeSaving, setIsBillingModeSaving] = useState(false);
    const toggleBillingMode = async () => {
        if (isBillingModeSaving) return;
        const currentMode = (globalConfig.get('connectionsBillingMode') as any) || 'platform';
        const nextMode = currentMode === 'platform' ? 'byok' : 'platform';
        
        // 🌍 SYNC GLOBAL STATE FOR BACKEND SERVICE
        (window as any).AirtableMode = nextMode;
        
        setIsBillingModeSaving(true);

        try {
            await globalConfig.setAsync('connectionsBillingMode', nextMode);
            // If switching to platform, sync backend to reset to platform mode
            if (nextMode === 'platform') {
                await Promise.all(
                    ALL_PROVIDERS.map((provider) =>
                        backendService.saveConnection({
                            orgId: base.id,
                            provider: provider.id,
                            mode: 'platform'
                        })
                    )
                );
            }
        } catch (error) {
            console.error('Failed to toggle billing mode:', error);
            alert('Failed to change mode. Please check your connection.');
        } finally {
            setIsBillingModeSaving(false);
        }
    };


    const { models: registryModels } = useModelRegistry({ orgId: base.id, capability: 'image', billingMode: 'platform', providerConnectedOnly: true });

    useEffect(() => {
        if (registryModels.length && !selectedModel) {
            const first = registryModels[0];
            setSelectedModel(mapRegistryToAIModel(first));
        }
    }, [registryModels, selectedModel]);

    const tabTitleMap: Record<string, string> = {
        setup: 'Setup',
        creator: 'Create Influencer',
        library: 'Influencer Library',
        workspace: 'Content Studio',
        prompts: 'Prompt Lab',
        production: 'Production Queue',
        assets: 'Assets',
        dashboard: 'Dashboard',
        studio: 'Playground',
        editor: 'Editor Studio',
        'edit-pro': 'Edit Pro',
        workflow: 'Workflow',
        storage: 'Connections',
        training: 'Training Center',
        catalog: 'Model Catalog',
        video: 'Video Studio',
        'instagram-cf': 'Instagram Close Friends',
        threads: 'Threads Automation'
    };

    // Security check: If Whop license is invalid, show lock screen
    // TEMPORARILY DISABLED AS REQUESTED
    /*
    if (isWhopValid === false) {
        return <PremiumPaywall baseId={base.id} />;
    }
    */

    return (
        <div className="ai-studio-container" style={{ display: 'flex', height: '100vh' }}>
                {/* Animated Background Blobs */}
                <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0, animation: 'pulseGlow 10s infinite alternate' }} />
                <div style={{ position: 'absolute', bottom: '15%', right: '25%', width: '400px', height: '400px', background: 'rgba(139, 92, 246, 0.1)', filter: 'blur(120px)', borderRadius: '50%', zIndex: 0, animation: 'pulseGlow 15s infinite alternate-reverse' }} />

                {/* Sidebar */}
                <div style={{ width: 'auto', flexShrink: 0, position: 'relative', zIndex: 10 }}>
                    <Sidebar />
                </div>

                {/* Main Content */}
                <div className="main-content" style={{ flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto' }}>
                    {/* Header Simplified */}
                    {/* Header Simplified - Hidden in Workflow for full screen experience */}
                    {activeTab !== 'workflow' && (
                        <div className="studio-header" style={{ position: 'relative', zIndex: 100 }}>
                            <div>
                                <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: 900, color: 'var(--primary)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>BONOBOOH STUDIO / OS-1</div>
                                <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-2px' }}>{tabTitleMap[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
                            </div>

                            <div className="studio-header-actions">
                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    
                                    {/* Global Billing Info */}
                                    {billingInfo && (
                                        <div style={{ textAlign: 'right', paddingRight: '16px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                {billingInfo.is_premium ? 'Premium Plan' : 'Free Tier'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: 2 }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#10B981' }}>
                                                    {billingInfo.credits} RUNS
                                                </div>
                                                <a 
                                                    href={'https://whop.com/checkout/plan_9235jZU15CtNu?org_id=' + base.id}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: '9px',
                                                        fontWeight: 800,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(59, 130, 246, 0.2)',
                                                        color: '#60A5FA',
                                                        textDecoration: 'none',
                                                        border: '1px solid rgba(59, 130, 246, 0.5)'
                                                    }}
                                                >
                                                    {billingInfo.is_premium ? 'MANAGE' : 'UPGRADE'}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>WORKSPACE STATUS</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: schemaValid ? '#10B981' : '#F87171' }}>
                                                {schemaValid ? 'READY' : 'SETUP REQUIRED'}
                                            </div>
                                            <div style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                                                🔑 BYOK MODE
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>ACTIVE QUEUE</div>
                                        <div style={{ fontSize: '12px', fontWeight: 800 }}>{queueCount} jobs</div>
                                    </div>
                                </div>
                                <div className="studio-toggle-group">
                                    <button className="header-chip" onClick={toggleTheme} title="Toggle theme">
                                        {themeLabel}
                                    </button>
                                    <button className="header-chip" onClick={toggleDensity} title="Toggle density">
                                        {densityLabel}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ padding: '0 32px' }}>
                    </div>

                    {/* Tab content */}
                    {!schemaValid ? (
                        <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid rgba(248,113,113,0.4)' }}>
                            <div style={{ fontWeight: 700, color: '#F87171', marginBottom: 8 }}>Fix setup required</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                {schemaIssues.slice(0, 4).join(', ')}{schemaIssues.length > 4 ? '…' : ''}
                            </div>
                            <button className="primary-btn" onClick={() => setActiveTab('setup')}>Open Setup</button>
                        </div>
                    ) : (activeTab === 'setup' && (
                        <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid rgba(16,185,129,0.35)' }}>
                            <div style={{ fontWeight: 700, color: '#10B981', marginBottom: 8 }}>Setup complete</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Required fields are mapped. Optional fields can be added later.
                            </div>
                        </div>
                    ))}
                    {activeTab === 'workspace' && (
                        <WorkspaceTab />
                    )}

                    {activeTab === 'workflow' && (
                        <WorkflowTab />
                    )}

                    {activeTab === 'workflow-pro' && (
                        (billingInfo === null || billingInfo.is_premium) ? <EditorNodeTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'setup' && (
                        <SetupTab />
                    )}
                    {activeTab === 'dashboard' && (
                        <DashboardTab />
                    )}

                    {activeTab === 'creator' && (
                        <BeginnerWizardTab
                            onNavigateLibrary={() => setActiveTab('library')}
                            onNavigateWorkspace={() => setActiveTab('workspace')}
                            onNavigatePrompts={() => setActiveTab('prompts')}
                            onNavigateEditPro={() => setActiveTab('edit-pro')}
                            onNavigateVideoStudio={() => setActiveTab('video')}
                        />
                    )}


                    {activeTab === 'studio' && (
                        <PlaygroundTab
                            selectedModel={selectedModel}
                            setSelectedModel={setSelectedModel}
                            onEditImage={(url) => {
                                setPrefilledEditorImage(url);
                                setActiveTab('editor');
                            }}
                        />
                    )}

                    {activeTab === 'editor' && (
                        <EditorTab prefilledImageUrl={prefilledEditorImage} />
                    )}

                    {activeTab === 'edit-pro' && (
                        (billingInfo === null || billingInfo.is_premium) ? <EditProTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'training' && (
                        <TrainingTab />
                    )}

                    {activeTab === 'assets' && (
                        (billingInfo === null || billingInfo.is_premium) ? <LoraManager /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'prompts' && (
                        <PromptProducerTab />
                    )}

                    {activeTab === 'production' && (
                        <QueueTab />
                    )}
                    {activeTab === 'video' && (
                        (billingInfo === null || billingInfo.is_premium) ? <VideoTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'library' && (
                        <LibraryTab
                            onSelectProfile={(profile) => {
                                setPrefilledProfile(profile);
                                setActiveTab('workspace');
                            }}
                            onManageAssets={(profile) => {
                                setPrefilledProfile(profile);
                                setActiveTab('assets');
                            }}
                            onOpenStudio={(profile) => {
                                setPrefilledProfile(profile);
                                setActiveTab('studio');
                            }}
                            onOpenCreator={() => setActiveTab('creator')}
                        />
                    )}

                    {activeTab === 'storage' && (
                        (billingInfo === null || billingInfo.is_premium) ? <StorageTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'instagram-cf' && (
                        (billingInfo === null || billingInfo.is_premium) ? <InstagramCFTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'threads' && (
                        (billingInfo === null || billingInfo.is_premium) ? <ThreadsTab /> : <PremiumPaywall baseId={base.id} />
                    )}

                    {activeTab === 'runner' && <RunnerTab />}



                    {(activeTab === 'some_future_tab') && (
                        <div className="glass-card">
                            <div className="empty-state">
                                <div className="empty-state-icon">🚧</div>
                                <div className="empty-state-text">Section in development</div>
                                <div style={{ fontSize: '12px', color: '#52525b' }}>
                                    This feature will be available soon in your OS Workspace
                                </div>
                            </div>
                        </div>
                    )}
                </div>
        </div>
    );
}

export default AIInfluencerStudio;
