/**
 * Dashboard Tab - Stats
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord, PromptRecord, JobRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { getSchemaIssues } from '../utils/schemaGuard';

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    let offset = 25;
    return (
        <svg width="180" height="180" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            {data.map((item) => {
                const ratio = item.value / total;
                const dash = `${ratio * 100} ${100 - ratio * 100}`;
                const circle = (
                    <circle
                        key={item.label}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="6"
                        strokeDasharray={dash}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                );
                offset -= ratio * 100;
                return circle;
            })}
        </svg>
    );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
    const max = Math.max(1, ...data.map((item) => item.value));
    return (
        <div style={{ display: 'grid', gap: '10px' }}>
            {data.map((item) => (
                <div key={item.label} style={{ display: 'grid', gap: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${(item.value / max) * 100}%`,
                                height: '100%',
                                background: item.color,
                                borderRadius: '999px'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function DashboardTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
    const schemaIssues = getSchemaIssues(base, globalConfig);
    const schemaValid = schemaIssues.length === 0;
    const airtableService = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);

    const [influencers, setInfluencers] = useState<InfluencerProfileRecord[]>([]);
    const [prompts, setPrompts] = useState<PromptRecord[]>([]);
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [queueCount, setQueueCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const [profiles, promptRows, jobRows] = await Promise.all([
                    airtableService.getInfluencerProfiles(),
                    airtableService.getPrompts(),
                    airtableService.getJobs()
                ]);
                if (!active) return;
                setInfluencers(profiles);
                setPrompts(promptRows);
                setJobs(jobRows);
                const summary = await backendService.getQueueSummary(base.id, queueTableName, queueTableId);
                if (!active) return;
                setQueueCount(summary.counts?.Queued || 0);
            } catch {
                if (active) setQueueCount(0);
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [airtableService, base.id, queueTableName, queueTableId]);

    const promptStatusCounts = prompts.reduce<Record<string, number>>((acc, item) => {
        const status = (item.status || 'draft').toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const platformCounts = prompts.reduce<Record<string, number>>((acc, item) => {
        const platform = (item.platform || 'unknown').toLowerCase();
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
    }, {});

    const jobTypeCounts = jobs.reduce<Record<string, number>>((acc, item) => {
        const type = (item.outputType || 'image').toLowerCase();
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const statusChart = Object.entries(promptStatusCounts).map(([label, value], index) => ({
        label,
        value,
        color: ['#6366F1', '#22C55E', '#F59E0B', '#EF4444'][index % 4]
    }));

    const platformChart = Object.entries(platformCounts).map(([label, value], index) => ({
        label,
        value,
        color: ['#38BDF8', '#F472B6', '#A855F7', '#F97316'][index % 4]
    }));

    const jobChart = Object.entries(jobTypeCounts).map(([label, value], index) => ({
        label,
        value,
        color: ['#22C55E', '#6366F1', '#F59E0B'][index % 3]
    }));

    const pipelineCounts = useMemo(() => {
        const statusGroups = prompts.reduce<Record<string, number>>((acc, item) => {
            const status = (item.status || 'draft').toLowerCase();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const produced = jobs.filter((item) => (item.status || '').toLowerCase() === 'completed').length;
        return {
            prompts: statusGroups,
            queued: queueCount || 0,
            done: produced
        };
    }, [prompts, queueCount, jobs]);


    return (
        <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="glass-card">
                <div className="card-title">Dashboard</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Studio performance overview.
                </div>
                {!schemaValid && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#F87171' }}>
                        Fix setup in Setup tab to unlock actions.
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Active Influencers', value: influencers.length, color: '#22C55E' },
                    { label: 'Prompts (total)', value: prompts.length, color: '#6366F1' },
                    { label: 'Jobs (total)', value: jobs.length, color: '#F59E0B' },
                    { label: 'Queued', value: queueCount, color: '#F97316' }
                ].map((card) => (
                    <div key={card.label} className="glass-card" style={{ padding: '18px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{card.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: card.color, marginTop: '6px' }}>{card.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Prompt Status</div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <DonutChart data={statusChart.length ? statusChart : [{ label: 'none', value: 1, color: 'rgba(255,255,255,0.15)' }]} />
                        <div style={{ display: 'grid', gap: '6px' }}>
                            {statusChart.map((item) => (
                                <div key={item.label} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginRight: '6px' }} />
                                    {item.label}: {item.value}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Platforms</div>
                    <BarChart data={platformChart.length ? platformChart : [{ label: 'No data', value: 1, color: 'rgba(255,255,255,0.2)' }]} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Outputs</div>
                    <BarChart data={jobChart.length ? jobChart : [{ label: 'No data', value: 1, color: 'rgba(255,255,255,0.2)' }]} />
                </div>
                <div className="glass-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Pipeline Status</div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {[
                            { label: 'Prompts (draft)', value: pipelineCounts.prompts.draft || 0, color: '#6366F1' },
                            { label: 'Prompts (preview)', value: pipelineCounts.prompts.preview || 0, color: '#38BDF8' },
                            { label: 'Queued', value: pipelineCounts.queued || 0, color: '#F59E0B' },
                            { label: 'Done', value: pipelineCounts.done || 0, color: '#22C55E' }
                        ].map((item) => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '18px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>Production Queue</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auto-refreshing every 15s</div>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {jobs.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No production activity yet.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead style={{ background: 'rgba(15,23,42,0.4)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '10px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Influencer / Preset</th>
                                    <th style={{ textAlign: 'left', padding: '10px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '10px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Output Type</th>
                                    <th style={{ textAlign: 'right', padding: '10px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Preview</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...jobs].reverse().slice(0, 10).map((job) => (
                                    <tr key={job.id} style={{ borderTop: '1px solid rgba(148,163,184,0.1)', transition: 'background 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '12px 18px' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{job.presetName || 'Unnamed Script'}</div>
                                        </td>
                                        <td style={{ padding: '12px 18px' }}>
                                            <span style={{ 
                                                padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                                                background: job.status === 'completed' ? 'rgba(34,197,94,0.15)' : job.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                color: job.status === 'completed' ? '#4ade80' : job.status === 'failed' ? '#f87171' : '#fbbf24',
                                                border: `1px solid ${job.status === 'completed' ? 'rgba(34,197,94,0.3)' : job.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                                            }}>
                                                {job.status?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                                            {job.outputType?.toUpperCase() || 'IMAGE'}
                                        </td>
                                        <td style={{ padding: '8px 18px', textAlign: 'right' }}>
                                            {job.resultUrl ? (
                                                <a href={job.resultUrl} target="_blank" rel="noreferrer">
                                                    {job.outputType === 'video' ? (
                                                        <div style={{ width: 40, height: 40, background: '#1e293b', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>▶</div>
                                                    ) : (
                                                        <img src={job.resultUrl} alt="Output" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    )}
                                                </a>
                                            ) : (
                                                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {loading && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Synchronizing with production engine…</div>
            )}
        </div>
    );
}
