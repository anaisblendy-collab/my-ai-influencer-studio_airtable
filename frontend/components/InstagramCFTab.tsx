import React, { useState, useEffect } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { backendService } from '../services/backend';

export function InstagramCFTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const [usernames, setUsernames] = useState('');
    const [mode, setMode] = useState<'fast' | 'safe'>('fast');
    const [jobs, setJobs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            const data = await backendService.listInstagramCFJobs();
            setJobs(data.jobs);
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await backendService.getInstagramCFStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchStats();
        const timer = setInterval(() => {
            fetchJobs();
            fetchStats();
        }, 15000);
        return () => clearInterval(timer);
    }, []);

    const handleCreateJob = async () => {
        if (!usernames.trim()) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const userList = usernames.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
            if (userList.length === 0) throw new Error('No valid usernames found');

            const res = await backendService.createInstagramCFJob({
                usernames: userList,
                mode,
                source: 'airtable_extension',
                meta: { base_id: base.id },
                targetBot: globalConfig.get('cfWorkerUrl') as string // On utilise l'URL du worker comme ID unique
            });
            setSuccess(`Job created! ${res.usernames_count} users queued.`);
            setUsernames('');
            fetchJobs();
            fetchStats();
        } catch (err: any) {
            setError(err.message || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (id: string) => {
        try {
            await backendService.deleteInstagramCFJob(id);
            fetchJobs();
        } catch (err: any) {
            alert('Failed to delete job: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-main)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Create Job Section */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--primary)' }}>
                        New Close Friends Job
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Enter Instagram usernames (one per line or comma separated) to add them to your Close Friends list automatically.
                    </div>

                    <textarea
                        value={usernames}
                        onChange={(e) => setUsernames(e.target.value)}
                        placeholder="username1, username2, ..."
                        style={{
                            width: '100%',
                            height: '120px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--input-border)',
                            borderRadius: '12px',
                            padding: '12px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            resize: 'none',
                            marginBottom: '16px',
                            outline: 'none'
                        }}
                    />

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div
                            onClick={() => setMode('fast')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mode === 'fast' ? 'rgba(59, 130, 246, 0.2)' : 'var(--card-bg)',
                                border: mode === 'fast' ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                                borderRadius: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>FAST MODE</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quick processing</div>
                        </div>
                        <div
                            onClick={() => setMode('safe')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mode === 'safe' ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
                                border: mode === 'safe' ? '1px solid #10B981' : '1px solid var(--card-border)',
                                borderRadius: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>SAFE MODE</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Enhanced delays</div>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateJob}
                        disabled={loading || !usernames.trim()}
                        className="gradient-btn"
                        style={{ width: '100%', padding: '14px' }}
                    >
                        {loading ? 'CREATING...' : 'ENQUEUE CF JOB'}
                    </button>

                    {error && (
                        <div style={{ marginTop: '16px', color: '#F87171', fontSize: '12px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ marginTop: '16px', color: '#10B981', fontSize: '12px', textAlign: 'center' }}>
                            {success}
                        </div>
                    )}
                </div>

                {/* Stats Section */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
                        Processing Statistics
                    </div>

                    {stats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>QUEUED</div>
                                <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.jobs?.queued || 0}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>PROCESSING</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{stats.jobs?.processing || 0}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>TOTAL ADDED</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{stats.users?.total_added || 0}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>FAILED</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#F87171' }}>{stats.users?.total_failed || 0}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading stats...</div>
                    )}

                    <div style={{ marginTop: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>System Health</div>
                        <div style={{ height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #10B981, var(--primary))', opacity: 0.8 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            <span>Worker Polling: Active</span>
                            <span>Latency: 45ms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs list */}
            <div className="glass-card" style={{ marginTop: '24px', padding: '24px', minHeight: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800 }}>Recent Activities</div>
                    <button onClick={fetchJobs} className="ghost-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Refresh</button>
                </div>

                {jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        No CF jobs found. Create one to start automation.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>JOB ID</th>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>USERS</th>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>MODE</th>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>STATUS</th>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>RESULT</th>
                                    <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px' }}>{job.id.substring(0, 8)}...</td>
                                        <td style={{ padding: '12px' }}>{job.usernames_count} profiles</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                background: job.mode === 'safe' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: job.mode === 'safe' ? '#10B981' : '#3B82F6',
                                                textTransform: 'uppercase',
                                                fontWeight: 800
                                            }}>{job.mode}</span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                color: job.status === 'completed' ? '#10B981' : job.status === 'failed' ? '#F87171' : '#F59E0B',
                                                fontWeight: 700
                                            }}>{job.status.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {job.status === 'completed' && job.results ? (
                                                <span style={{ fontSize: '11px' }}>{job.results.added} ✅ / {job.results.failed} ❌</span>
                                            ) : job.status === 'failed' ? (
                                                <span style={{ fontSize: '11px', color: '#F87171' }}>{job.error}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button
                                                onClick={() => handleDeleteJob(job.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: 800
                                                }}
                                            >
                                                DELETE
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
