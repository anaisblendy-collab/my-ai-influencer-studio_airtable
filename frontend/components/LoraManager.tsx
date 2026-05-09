/**
 * Assets Manager - LoRAs and related assets
 * Enhanced with Civitai catalog integration
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, AssetRecord } from '../services/airtable';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import { loraService } from '../services/lora';
import type { LoraCatalogItem, LoraAirtableItem } from '../services/backend';

type Tab = 'catalog' | 'my-loras';

export function LoraManager() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = new AirtableService(base, globalConfig);
    const { selectedProfile } = useWorkspaceStore();
    
    // API Keys from globalConfig
    const civitaiApiKey = globalConfig.get('civitaiApiKey') as string | undefined;
    const huggingfaceApiKey = globalConfig.get('huggingfaceApiKey') as string | undefined;

    
    // State management
    const [activeTab, setActiveTab] = useState<Tab>('my-loras');
    const [assets, setAssets] = useState<AssetRecord[]>([]);
    const [myLoras, setMyLoras] = useState<LoraAirtableItem[]>([]);
    const [catalogItems, setCatalogItems] = useState<LoraCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [baseModelFilter, setBaseModelFilter] = useState<string>('all');
    const [nsfwFilter, setNsfwFilter] = useState(false);
    
    // Modal states
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedLora, setSelectedLora] = useState<LoraCatalogItem | LoraAirtableItem | null>(null);
    const [testPrompt, setTestPrompt] = useState('');
    const [testResult, setTestResult] = useState<{ url: string; time: number } | null>(null);
    const [testing, setTesting] = useState(false);
    
    const [showImportModal, setShowImportModal] = useState(false);
    const [importName, setImportName] = useState('');
    const [importStrength, setImportStrength] = useState(0.8);
    const [importNotes, setImportNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Load my LoRAs from Airtable
    useEffect(() => {
        const loadMyLoras = async () => {
            setLoading(true);
            try {
                const data = await loraService.listLorasFromAirtable(base.id, 'Assets', 'LoRA');
                setMyLoras(data.items || []);
            } catch (error) {
                console.error('Failed to load LoRAs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadMyLoras();
    }, [base.id]);

    // Load catalog when tab is activated
    useEffect(() => {
        if (activeTab === 'catalog') {
            loadCatalog();
        }
    }, [activeTab]);

    const loadCatalog = async () => {
        setCatalogLoading(true);
        try {
            const result = await loraService.getLoraCatalog({
                query: searchQuery || undefined,
                types: 'LoRA', // Filter to only LoRAs (not Checkpoints, ControlNet, etc.)
                base_models: baseModelFilter !== 'all' ? baseModelFilter : undefined,
                nsfw: nsfwFilter,
                limit: 50,
                sort: 'Newest',
                civitaiApiKey
            });
            setCatalogItems(result.items || []);
        } catch (error) {
            console.error('Failed to load catalog:', error);
        } finally {
            setCatalogLoading(false);
        }
    };

    const filteredMyLoras = useMemo(() => {
        return myLoras.filter(lora => {
            const matchesSearch = lora.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lora.trigger_words.some(w => w.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        });
    }, [myLoras, searchQuery]);

    const filteredCatalog = useMemo(() => {
        return catalogItems.filter(item => {
            const matchesSearch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesBaseModel = baseModelFilter === 'all' || item.base_model === baseModelFilter;
            const matchesNsfw = !nsfwFilter || item.nsfw;
            return matchesSearch && matchesBaseModel && matchesNsfw;
        });
    }, [catalogItems, searchQuery, baseModelFilter, nsfwFilter]);

    const handleTestLora = async () => {
        if (!selectedLora || !testPrompt) return;
        
        setTesting(true);
        try {
            const urn = 'urn' in selectedLora ? selectedLora.urn : selectedLora.urn;
            const result = await loraService.testLora({
                lora_urn: urn || '',
                prompt: testPrompt,
                provider: 'civitai', // Use Civitai's own generation engine for testing
                model: 'stabilityai/stable-diffusion-xl-base-1.0', // Default model, can be overridden by LoRA's base_model
                strength: importStrength,
                civitai_api_key: civitaiApiKey,
                huggingface_api_key: huggingfaceApiKey,
                base_id: base.id,
                billing_mode: (globalConfig.get('connectionsBillingMode') as any) || 'platform'
            });
            
            setTestResult({
                url: result.media_url,
                time: result.generation_time
            });
        } catch (error: any) {
            alert(`Test failed: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    const handleImportLora = async () => {
        if (!selectedLora || !importName) return;
        
        setSaving(true);
        try {
            const urn = 'urn' in selectedLora ? selectedLora.urn : selectedLora.urn;
            await loraService.saveLoraToAirtable({
                base_id: base.id,
                table_name: 'Assets',
                name: importName,
                urn: urn || '',
                provider: selectedLora.provider,
                trigger_words: selectedLora.trigger_words,
                strength: importStrength,
                notes: importNotes
            });
            
            // Reload my LoRAs
            const data = await loraService.listLorasFromAirtable(base.id, 'Assets', 'LoRA');
            setMyLoras(data.items || []);
            
            setShowImportModal(false);
            setImportName('');
            setImportNotes('');
            alert('LoRA imported successfully!');
        } catch (error: any) {
            alert(`Import failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLora = async (recordId: string) => {
        if (!confirm('Are you sure you want to delete this LoRA?')) return;
        
        try {
            await loraService.deleteLoraFromAirtable(recordId, base.id, 'Assets');
            const data = await loraService.listLorasFromAirtable(base.id, 'Assets', 'LoRA');
            setMyLoras(data.items || []);
            alert('LoRA deleted successfully!');
        } catch (error: any) {
            alert(`Delete failed: ${error.message}`);
        }
    };

    const openTestModal = (lora: LoraCatalogItem | LoraAirtableItem) => {
        setSelectedLora(lora);
        setTestPrompt('');
        setTestResult(null);
        setShowTestModal(true);
    };

    const openImportModal = (lora?: LoraCatalogItem) => {
        if (lora) {
            setSelectedLora(lora);
            setImportName(lora.name);
            setImportStrength(lora.strength_default || 0.8);
            setImportNotes(lora.description || '');
        } else {
            // Manual import mode
            setSelectedLora({
                id: '', name: '', model_id: '', trigger_words: [], example_images: [], nsfw: false, tags: [],
                provider: 'civitai', urn: ''
            });
            setImportName('');
            setImportStrength(0.8);
            setImportNotes('');
        }
        setShowImportModal(true);
    };

    const isLoraAlreadyImported = (lora: LoraCatalogItem) => {
        return myLoras.some(myLora => myLora.urn === lora.urn);
    };

    return (
        <div style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>
                    LoRA Manager
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        background: ((globalConfig.get('connectionsBillingMode') as any) || 'platform') === 'byok' ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)',
                        color: ((globalConfig.get('connectionsBillingMode') as any) || 'platform') === 'byok' ? '#000' : 'var(--text-muted)',
                        boxShadow: ((globalConfig.get('connectionsBillingMode') as any) || 'platform') === 'byok' ? '0 0 10px var(--primary-glow)' : 'none',
                        cursor: 'help'
                    }}>
                        MODE: {((globalConfig.get('connectionsBillingMode') as any) || 'platform').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {myLoras.length} LoRAs saved
                    </div>
                    {activeTab === 'my-loras' && (
                        <button 
                            onClick={() => openImportModal()}
                            className="primary-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            + Import Custom LoRA
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
                <button
                    onClick={() => setActiveTab('my-loras')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'my-loras' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'my-loras' ? '#fff' : 'var(--text)',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    My LoRAs ({myLoras.length})
                </button>
                <button
                    onClick={() => setActiveTab('catalog')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'catalog' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'catalog' ? '#fff' : 'var(--text)',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    Discover Catalog
                </button>
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search LoRAs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text)'
                    }}
                />
                {activeTab === 'catalog' && (
                    <>
                        <select
                            value={baseModelFilter}
                            onChange={(e) => setBaseModelFilter(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Base Models</option>
                            <option value="SDXL">SDXL</option>
                            <option value="SD15">SD 1.5</option>
                            <option value="Pony">Pony</option>
                            <option value="Flux">Flux</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={nsfwFilter}
                                onChange={(e) => setNsfwFilter(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '13px' }}>Show NSFW</span>
                        </label>
                    </>
                )}
            </div>

            {/* Content - My LoRAs Tab */}
            {activeTab === 'my-loras' && (
                <>
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-text">Loading your LoRAs...</div>
                        </div>
                    ) : (
                        <div className="model-grid">
                            {filteredMyLoras.map(lora => (
                                <div key={lora.record_id} className="glass-card" style={{ padding: '16px', position: 'relative' }}>
                                    <button
                                        onClick={() => handleDeleteLora(lora.record_id)}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '11px'
                                        }}
                                    >
                                        Delete
                                    </button>
                                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{lora.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        Provider: {lora.provider}
                                    </div>
                                    {lora.trigger_words.length > 0 && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                                            Triggers: {lora.trigger_words.slice(0, 5).join(', ')}{lora.trigger_words.length > 5 ? '...' : ''}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Strength: {lora.strength}
                                    </div>
                                    {lora.notes && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                                            {lora.notes}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => openTestModal(lora)}
                                        className="primary-btn"
                                        style={{ marginTop: '12px', width: '100%', fontSize: '12px' }}
                                    >
                                        Test LoRA
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && filteredMyLoras.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No LoRAs found. Browse the catalog to discover and import LoRAs!
                        </div>
                    )}
                </>
            )}

            {/* Content - Catalog Tab */}
            {activeTab === 'catalog' && (
                <>
                    {catalogLoading ? (
                        <div className="loading-container">
                            <div className="loading-text">Loading catalog from Civitai...</div>
                        </div>
                    ) : (
                        <div className="model-grid">
                            {filteredCatalog.map(lora => (
                                <div key={lora.id} className="glass-card" style={{ padding: '16px', position: 'relative' }}>
                                    {isLoraAlreadyImported(lora) && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            color: '#10B981',
                                            fontSize: '10px',
                                            fontWeight: 700
                                        }}>
                                            ✓ IMPORTED
                                        </div>
                                    )}
                                    {lora.example_images?.length > 0 && (
                                        <div style={{
                                            width: '100%',
                                            height: '140px',
                                            borderRadius: '8px',
                                            backgroundImage: `url(${lora.example_images[0]})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            marginBottom: '12px'
                                        }} />
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)' }}>{lora.name}</div>
                                        {lora.model_id && (
                                            <a 
                                                href={`https://civitai.com/models/${lora.model_id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                style={{ fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                SOURCE ↗
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', gap: '8px' }}>
                                        <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{lora.base_model}</span>
                                        <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{lora.type}</span>
                                    </div>
                                    {lora.trigger_words.length > 0 && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px', marginBottom: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '4px' }}>🎯 TRIGGERS:</span>
                                            {lora.trigger_words.slice(0, 5).join(', ')}{lora.trigger_words.length > 5 ? '...' : ''}
                                        </div>
                                    )}
                                    {lora.tags.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                            {lora.tags.slice(0, 6).map((tag, idx) => (
                                                <span key={idx} style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    color: 'var(--primary)',
                                                    borderRadius: '4px'
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        {!isLoraAlreadyImported(lora) ? (
                                            <button
                                                onClick={() => openImportModal(lora)}
                                                className="primary-btn"
                                                style={{ flex: 1, fontSize: '12px' }}
                                            >
                                                Import
                                            </button>
                                        ) : null}
                                        <button
                                            onClick={() => openTestModal(lora)}
                                            className="ghost-btn"
                                            style={{ flex: 1, fontSize: '12px' }}
                                        >
                                            Test
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Test Modal */}
            {showTestModal && selectedLora && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '16px' }}>
                            Test LoRA: {selectedLora.name}
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                Prompt
                            </label>
                            <textarea
                                value={testPrompt}
                                onChange={(e) => setTestPrompt(e.target.value)}
                                placeholder="Describe the image you want to generate..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {testResult && (
                            <div style={{ marginBottom: '16px' }}>
                                <img
                                    src={testResult.url}
                                    alt="Test result"
                                    style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Generation time: {testResult.time.toFixed(2)}s
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowTestModal(false)}
                                className="ghost-btn"
                                style={{ padding: '10px 20px' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={handleTestLora}
                                className="primary-btn"
                                style={{ padding: '10px 20px' }}
                                disabled={testing || !testPrompt}
                            >
                                {testing ? 'Generating...' : 'Generate Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && selectedLora && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass-card" style={{ width: '90%', maxWidth: '500px' }}>
                        <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '16px' }}>
                            Import LoRA
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={importName}
                                onChange={(e) => setImportName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text)'
                                }}
                            />
                        </div>

                        {selectedLora && 'id' in selectedLora && selectedLora.id === '' && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                    LoRA URN
                                </label>
                                <input
                                    type="text"
                                    value={selectedLora.urn || ''}
                                    placeholder="e.g. urn:air:sdxl:lora:12345@67890"
                                    onChange={(e) => setSelectedLora({...selectedLora, urn: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text)'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                Default Strength
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={importStrength}
                                onChange={(e) => setImportStrength(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>
                                {importStrength.toFixed(2)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                Notes
                            </label>
                            <textarea
                                value={importNotes}
                                onChange={(e) => setImportNotes(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="ghost-btn"
                                style={{ padding: '10px 20px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportLora}
                                className="primary-btn"
                                style={{ padding: '10px 20px' }}
                                disabled={saving || !importName}
                            >
                                {saving ? 'Saving...' : 'Save to Assets'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
