import React, { useState, useEffect } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { backendService } from '../services/backend';

export function ThreadsTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    // Post form state
    const [message, setMessage] = useState('');
    const [mediaUrls, setMediaUrls] = useState('');
    const [targetBot, setTargetBot] = useState(() =>
        (globalConfig.get('threadsTargetBot') as string) || ''
    );
    const [botSaved, setBotSaved] = useState(false);

    // Data state
    const [jobs, setJobs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ── Data fetching ──────────────────────────────────────────────
    const fetchJobs = async () => {
        try {
            const data = await backendService.listThreadsJobs(base.id);
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch threads jobs:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await backendService.getThreadsStats(base.id);
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch threads stats:', err);
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

    // ── Save target bot ────────────────────────────────────────────
    const saveTargetBot = async () => {
        await globalConfig.setAsync('threadsTargetBot', targetBot);
        setBotSaved(true);
        setTimeout(() => setBotSaved(false), 2000);
    };

    // ── Create job ─────────────────────────────────────────────────
    const handleCreateJob = async () => {
        if (!message.trim() && !mediaUrls.trim()) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const urls = mediaUrls
                .split(/[\n,]+/)
                .map(u => u.trim())
                .filter(u => u.startsWith('http'));

            await backendService.createThreadsJob({
                message: message.trim(),
                images: urls,
                tenant_id: base.id,
                targetBot: targetBot || undefined,
            });

            const mediaCount = urls.length;
            setSuccess(
                mediaCount > 0
                    ? `✅ Post queued with ${mediaCount} media file(s)!`
                    : `✅ Thread post queued successfully!`
            );
            setMessage('');
            setMediaUrls('');
            fetchJobs();
            fetchStats();
        } catch (err: any) {
            setError(err.message || 'Failed to create threads job');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (id: string) => {
        if (!confirm('Delete this job?')) return;
        try {
            await backendService.deleteThreadsJob(id);
            fetchJobs();
            fetchStats();
        } catch (err: any) {
            alert('Failed to delete job: ' + err.message);
        }
    };

    // ── Status badge helper ────────────────────────────────────────
    const statusBadge = (status: string) => {
        const colors: Record<string, { bg: string; text: string }> = {
            done:    { bg: 'rgba(16,185,129,0.12)',  text: '#10B981' },
            failed:  { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
            claimed: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6' },
            queued:  { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
        };
        const c = colors[status] || { bg: 'rgba(255,255,255,0.05)', text: '#aaa' };
        return (
            <span style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                background: c.bg,
                color: c.text,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                {status}
            </span>
        );
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-main)' }}>

            {/* ── Target Bot Banner ─────────────────────────────── */}
            <div style={{
                padding: '16px 20px',
                background: targetBot
                    ? 'rgba(139,92,246,0.08)'
                    : 'rgba(255,255,255,0.03)',
                border: targetBot
                    ? '1px solid rgba(139,92,246,0.3)'
                    : '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
            }}>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B5CF6', marginBottom: '4px' }}>
                        🤖 Link your Threads Worker Bot
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Enter the same Worker ID as in your Tampermonkey script. Jobs will be routed to that specific bot.
                    </div>
                    {targetBot && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            ✅ Jobs will be sent to: <span style={{ color: '#8B5CF6', fontFamily: 'monospace', fontWeight: 700 }}>{targetBot}</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        value={targetBot}
                        onChange={(e) => setTargetBot(e.target.value)}
                        placeholder="e.g. BOT-THREADS-01"
                        style={{
                            background: 'var(--input-bg)',
                            border: targetBot
                                ? '1px solid #8B5CF6'
                                : '1px solid var(--input-border)',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            color: 'var(--text-main)',
                            fontSize: '13px',
                            outline: 'none',
                            width: '200px',
                            fontFamily: 'monospace',
                        }}
                    />
                    <button
                        onClick={saveTargetBot}
                        style={{
                            background: botSaved
                                ? '#10B981'
                                : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 16px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {botSaved ? '✅ Saved!' : 'SAVE'}
                    </button>
                </div>
            </div>

            {/* ── Top Grid: Compose + Stats ─────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Compose card */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px', color: '#8B5CF6' }}>
                        🚀 New Threads Post
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Schedule a post. Your ThreadClaw Worker bot will pick it up automatically.
                    </div>

                    {/* Message textarea */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Caption / Message
                    </div>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your Threads post here..."
                        style={{
                            width: '100%',
                            height: '100px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--input-border)',
                            borderRadius: '12px',
                            padding: '12px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            resize: 'none',
                            marginBottom: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />

                    {/* Media URLs textarea */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            🖼️ Media URLs <span style={{ color: '#8B5CF6' }}>(images &amp; videos)</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            optional
                        </div>
                    </div>
                    <textarea
                        value={mediaUrls}
                        onChange={(e) => setMediaUrls(e.target.value)}
                        placeholder={"https://res.cloudinary.com/example/photo.jpg\nhttps://example.com/clip.mp4"}
                        style={{
                            width: '100%',
                            height: '70px',
                            background: 'rgba(139,92,246,0.05)',
                            border: mediaUrls
                                ? '1px solid rgba(139,92,246,0.4)'
                                : '1px solid var(--input-border)',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                            resize: 'none',
                            marginBottom: '16px',
                            outline: 'none',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                        }}
                    />

                    {/* Preview media count */}
                    {mediaUrls.trim() && (() => {
                        const count = mediaUrls.split(/[\n,]+/).filter(u => u.trim().startsWith('http')).length;
                        return (
                            <div style={{
                                marginTop: '-10px',
                                marginBottom: '14px',
                                fontSize: '11px',
                                color: '#8B5CF6',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                            }}>
                                <span>📎 {count} media file{count !== 1 ? 's' : ''} detected</span>
                                {mediaUrls.match(/\.(mp4|mov|webm)/i) && (
                                    <span style={{ background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px' }}>
                                        🎬 Video
                                    </span>
                                )}
                            </div>
                        );
                    })()}

                    <button
                        onClick={handleCreateJob}
                        disabled={loading || (!message.trim() && !mediaUrls.trim())}
                        className="gradient-btn"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '13px',
                            cursor: loading || (!message.trim() && !mediaUrls.trim()) ? 'not-allowed' : 'pointer',
                            opacity: loading || (!message.trim() && !mediaUrls.trim()) ? 0.5 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading ? '⏳ QUEUING...' : '🚀 POST TO THREADS'}
                    </button>

                    {error && (
                        <div style={{ marginTop: '12px', color: '#F87171', fontSize: '12px', textAlign: 'center', padding: '8px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px' }}>
                            ❌ {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ marginTop: '12px', color: '#10B981', fontSize: '12px', textAlign: 'center', padding: '8px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px' }}>
                            {success}
                        </div>
                    )}
                </div>

                {/* Stats card */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
                        📊 Threads Analytics
                    </div>

                    {stats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { label: 'QUEUED',     value: stats.queued  || 0, color: '#F59E0B' },
                                { label: 'CLAIMED',    value: stats.claimed || 0, color: '#8B5CF6' },
                                { label: 'PUBLISHED',  value: stats.done    || 0, color: '#10B981' },
                                { label: 'FAILED',     value: stats.failed  || 0, color: '#F87171' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: 'var(--card-bg)',
                                    padding: '16px',
                                    borderRadius: '14px',
                                    border: '1px solid var(--card-border)',
                                }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em' }}>{s.label}</div>
                                    <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, marginTop: '4px' }}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading stats...</div>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Worker Health</div>
                        <div style={{ height: '6px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #8B5CF6, #EC4899)', opacity: 0.85 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            <span>Target Bot: {targetBot || <span style={{ color: '#F59E0B' }}>Not configured</span>}</span>
                            <span>Auto-refresh: 15s</span>
                        </div>
                    </div>

                    <button
                        onClick={() => { fetchJobs(); fetchStats(); }}
                        style={{
                            marginTop: '16px',
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                        }}
                    >
                        🔄 Refresh Now
                    </button>
                </div>
            </div>

            {/* ── Job History Table ─────────────────────────────── */}
            <div className="glass-card" style={{ marginTop: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>📋 Threads History</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                        <div>No Threads jobs yet. Compose your first post above.</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
                                    {['ID', 'MESSAGE', 'MEDIA', 'BOT', 'STATUS', 'DATE', 'ACTION'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {job.id.substring(0, 8)}
                                        </td>
                                        <td style={{ padding: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {job.message || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>no caption</span>}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {job.images?.length > 0 ? (
                                                <span style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: 700 }}>
                                                    {job.images.some((u: string) => u.match(/\.(mp4|mov|webm)/i)) ? '🎬' : '🖼️'} {job.images.length}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#8B5CF6' }}>
                                            {job.target_bot || <span style={{ color: 'var(--text-muted)' }}>any</span>}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {statusBadge(job.status)}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {new Date(job.created_at).toLocaleString()}
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
                                                    fontWeight: 800,
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                🗑 DELETE
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
