/**
 * Queue Tab - Production Queue list with retry
 */

import React, { useEffect, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService } from '../services/airtable';
import { getSchemaIssues } from '../utils/schemaGuard';

type QueueItem = {
    id: string;
    prompt?: string;
    influencerName?: string;
    influencerId?: string;
    status?: string;
    type?: string;
    provider?: string;
    model?: string;
    error?: string;
    outputUrl?: string;
    cost?: number;
    duration?: string;
    createdAt?: string;
    completedAt?: string;
};

export function QueueTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = new AirtableService(base, globalConfig);
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
    const schemaIssues = getSchemaIssues(base, globalConfig);
    const schemaValid = schemaIssues.length === 0;

    const backendBaseUrl = (globalConfig.get('backendBaseUrl') as string | undefined) || '';

    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'queued' | 'failed' | 'done'>('queued');
    const [sortKey, setSortKey] = useState<'created' | 'completed'>('created');
    const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);

    const [enqueueBusy, setEnqueueBusy] = useState(false);
    const [enqueueStatus, setEnqueueStatus] = useState<string>('');

    const getFieldString = (record: any, fieldName: string) => {
        const field = record.parentTable?.getFieldByNameIfExists?.(fieldName);
        return field ? record.getCellValueAsString(fieldName) : '';
    };

    const getFieldValue = (record: any, fieldName: string) => {
        const field = record.parentTable?.getFieldByNameIfExists?.(fieldName);
        return field ? record.getCellValue(fieldName) : null;
    };

    const load = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) {
                setItems([]);
                setLoading(false);
                return;
            }
            const query = table.selectRecordsAsync();
            const records = await query;
            const limited = records.records.slice(0, 50);
            const data = limited.map((record: any) => {
                const output = getFieldValue(record, 'Output Media') as any[] | null;
                const influencerLinks = getFieldValue(record, 'Influencer') as any[] | null;
                const createdAt = getFieldString(record, 'CreatedAt');
                const completedAt = getFieldString(record, 'CompletedAt');
                return {
                    id: record.id,
                    prompt: getFieldString(record, 'Prompt'),
                    influencerName: Array.isArray(influencerLinks) && influencerLinks[0] ? influencerLinks[0].name : '',
                    influencerId: Array.isArray(influencerLinks) && influencerLinks[0] ? influencerLinks[0].id : '',
                    status: getFieldString(record, 'Status'),
                    type: getFieldString(record, 'Type'),
                    provider: getFieldString(record, 'Provider'),
                    model: getFieldString(record, 'Model'),
                    error: getFieldString(record, 'Error'),
                    outputUrl: Array.isArray(output) && output[0] ? output[0].url : '',
                    createdAt: createdAt || '',
                    completedAt: completedAt || ''
                };
            });
            setItems(data);
        } catch (error) {
            setLoadError(String(error));
        } finally {
            setLoading(false);
        }
    };

    // Manual load only to avoid heavy Airtable reads on mount.


    const assignInfluencer = async (recordId: string, influencerId: string) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) return;
            await table.updateRecordAsync(recordId, {
                Influencer: [{ id: influencerId }]
            });
        } catch (error) {
            alert(`Assign failed: ${String(error)}`);
        }
    };

    const markApproved = async (recordId: string) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) return;
            await table.updateRecordAsync(recordId, {
                Status: 'Approved'
            });
        } catch (error) {
            alert(`Approve failed: ${String(error)}`);
        }
    };

    const sendToContenu = async (item: QueueItem) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            if (!item.outputUrl) {
                alert('No output media to send.');
                return;
            }
            const influencerId = item.influencerId;
            await airtableService.saveContentRecord({
                influencerId: influencerId,
                name: item.influencerName,
                status: 'Approved',
                prompt: item.prompt,
                model: item.model,
                provider: item.provider,
                type: item.type,
                approved: true,
                queueJobId: item.id,
                mediaUrl: item.outputUrl
            });
        } catch (error) {
            alert(`Send to Contenu failed: ${String(error)}`);
        }
    };

    const retryJob = async (recordId: string) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) return;
            await table.updateRecordAsync(recordId, {
                Status: { name: 'Queued' },
                Error: ''
            });
        } catch (error) {
            alert(`Retry failed: ${String(error)}`);
        }
    };

    const clearError = async (recordId: string) => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) return;
            await table.updateRecordAsync(recordId, {
                Error: ''
            });
        } catch (error) {
            alert(`Clear failed: ${String(error)}`);
        }
    };

    const bulkRetryFailed = async () => {
        if (!schemaValid) {
            alert('Fix setup first (Schema invalid).');
            return;
        }
        try {
            const table = queueTableId ? base.getTableByIdIfExists(queueTableId) : base.getTableByNameIfExists('Production Queue');
            if (!table) return;
            const failed = items.filter(item => (item.status || '').toLowerCase() === 'failed');
            for (const item of failed) {
                await table.updateRecordAsync(item.id, {
                    Status: { name: 'Queued' },
                    Error: ''
                });
            }
        } catch (error) {
            alert(`Bulk retry failed: ${String(error)}`);
        }
    };

    const totals = items.reduce((acc, item) => {
        acc.cost += item.cost || 0;
        return acc;
    }, { cost: 0 });

    const counts = items.reduce(
        (acc, item) => {
            const key = (item.status || '').toLowerCase();
            if (key === 'queued') acc.queued += 1;
            else if (key === 'running') acc.running += 1;
            else if (key === 'done') acc.done += 1;
            else if (key === 'failed') acc.failed += 1;
            return acc;
        },
        { queued: 0, running: 0, failed: 0, done: 0 }
    );

    const visibleItems = items
        .filter(item => {
            if (filter === 'queued') return (item.status || '').toLowerCase() === 'queued';
            if (filter === 'failed') return (item.status || '').toLowerCase() === 'failed';
            if (filter === 'done') return (item.status || '').toLowerCase() === 'done';
            return true;
        })
        .sort((a, b) => {
            const aKey = sortKey === 'completed' ? a.completedAt : a.createdAt;
            const bKey = sortKey === 'completed' ? b.completedAt : b.createdAt;
            return String(bKey).localeCompare(String(aKey));
        });

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-text">Loading queue...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.3s' }}>
            <div className="glass-card">
                <div className="card-title">{queueTableName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Monitor jobs and retry failed items.
                </div>
                {!schemaValid && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#F87171' }}>
                        Fix setup in Setup tab to unlock actions.
                    </div>
                )}
            </div>
            {loadError && (
                <div className="glass-card" style={{ color: '#F87171', fontSize: '12px' }}>
                    Failed to load queue: {loadError}
                </div>
            )}

            <div className="glass-card" style={{ position: 'sticky', top: '10px', zIndex: 4 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span className="tag active">Queued: {counts.queued}</span>
                        <span className="tag">Running: {counts.running}</span>
                        <span className="tag">Failed: {counts.failed}</span>
                        <span className="tag">Done: {counts.done}</span>
                        <span className="tag">Cost: ${totals.cost.toFixed(2)}</span>
                        <span className="tag">Visible: {visibleItems.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            className={`tag ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`tag ${filter === 'queued' ? 'active' : ''}`}
                            onClick={() => setFilter('queued')}
                        >
                            Queued
                        </button>
                        <button
                            className={`tag ${filter === 'failed' ? 'active' : ''}`}
                            onClick={() => setFilter('failed')}
                        >
                            Failed
                        </button>
                        <button
                            className={`tag ${filter === 'done' ? 'active' : ''}`}
                            onClick={() => setFilter('done')}
                        >
                            Done
                        </button>
                        <button
                            className={`tag ${sortKey === 'created' ? 'active' : ''}`}
                            onClick={() => setSortKey('created')}
                        >
                            Newest
                        </button>
                        <button
                            className={`tag ${sortKey === 'completed' ? 'active' : ''}`}
                            onClick={() => setSortKey('completed')}
                        >
                            Completed
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Monitor and manage your background production jobs automatically.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            className="ghost-btn"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={load}
                            disabled={loading}
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                            className="ghost-btn"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={bulkRetryFailed}
                        >
                            Retry Failed
                        </button>
                    </div>
                </div>
                {enqueueStatus && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: '10px' }}>{enqueueStatus}</div>
                )}
            </div>

            {items.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>No jobs loaded</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Click Refresh to load the latest jobs.
                    </div>
                </div>
            ) : (
                <div className="glass-card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {visibleItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '68px minmax(0, 1fr) auto',
                                    gap: '12px',
                                    padding: '12px',
                                    background: 'var(--row-bg)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)'
                                }}
                            >
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '8px',
                                    background: item.outputUrl
                                        ? `url(${item.outputUrl})`
                                        : 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(148,163,184,0.10) 100%)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    flexShrink: 0
                                }} />

                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {item.influencerName || 'Influencer'}
                                        </div>
                                        <span className={`tag ${((item.status || '').toLowerCase() === 'queued' || (item.status || '').toLowerCase() === 'done') ? 'active' : ''}`}>
                                            {item.status || 'unknown'}
                                        </span>
                                        <span className="tag">{item.type || 'image'}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {item.provider || 'provider'} · {item.model || 'model'}
                                        {(item.createdAt || item.completedAt) && (
                                            <span> · {sortKey === 'completed' ? (item.completedAt || item.createdAt || '') : (item.createdAt || '')}</span>
                                        )}
                                    </div>
                                    {item.prompt && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '6px', lineHeight: 1.4 }}>
                                            {item.prompt}
                                        </div>
                                    )}
                                    {item.error && (
                                        <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                                            {item.error}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {item.outputUrl && (
                                        <button
                                            className="ghost-btn"
                                            style={{ padding: '8px 12px', fontSize: '11px' }}
                                            onClick={() => window.open(item.outputUrl, '_blank')}
                                        >
                                            Open
                                        </button>
                                    )}
                                    {item.error && (
                                        <button
                                            className="ghost-btn"
                                            style={{ padding: '8px 12px', fontSize: '11px' }}
                                            onClick={() => clearError(item.id)}
                                        >
                                            Clear
                                        </button>
                                    )}
                                    {item.status?.toLowerCase() === 'failed' && (
                                        <button
                                            className="gradient-btn"
                                            style={{ padding: '8px 12px', fontSize: '10px' }}
                                            onClick={() => retryJob(item.id)}
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
