import React from 'react';
import { useGlobalConfig } from '@airtable/blocks/ui';

export function RunnerTab() {
    const globalConfig = useGlobalConfig();
    
    // Parse the saved bridges from the config the user just showed
    const savedConnectorsRaw = globalConfig.get('customApiConnectors') as string;
    let activeBridges: any[] = [];
    try {
        if (savedConnectorsRaw) activeBridges = JSON.parse(savedConnectorsRaw);
    } catch(e) {}

    return (
        <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div className="card-title" style={{ margin: 0 }}>Automation Runner</div>
                    <div className="tag active" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulse 2s infinite' }}></div>
                        System Active
                    </div>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Real-time monitoring of background agents, scheduled hooks, and custom API bridges.
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                
                {/* Agent 1 */}
                <div className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '14px' }}>Fanvue Metrics Agent</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>Running</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                        Synchronizes creator post revenue, likes, and views automatically via secure API.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                        <span style={{ color: 'var(--text-soft)' }}>Heartbeat: Every 6 hrs</span>
                        <span>Next Check: <strong style={{ color: 'var(--text)' }}>in 42 mins</strong></span>
                    </div>
                </div>

                {/* Agent 2 */}
                <div className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 5V3"/><path d="M8 5V3"/><path d="M3 9h16"/><path d="M21 15v4h-2"/><path d="M19 19v-4h2"/><circle cx="18" cy="18" r="3"/></svg>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '14px' }}>Smart Content Publisher</div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>Idle</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                        Monitors Airtable calendar for records reaching their scheduled publish date.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                        <span style={{ color: 'var(--text-soft)' }}>Trigger: Ext. Calendar Match</span>
                        <span>Queue: <strong style={{ color: 'var(--text)' }}>0 pending</strong></span>
                    </div>
                </div>

                {/* Dynamic Bridges from Airtable globalConfig */}
                {activeBridges.map((bridge) => {
                    const isWebhook = bridge.url?.includes('webhook.site');
                    const isTelegram = bridge.url?.includes('api.telegram.org');
                    const isGPU = bridge.url?.includes('runpod') || bridge.url?.includes('comfy');
                    
                    let iconColor = '#3B82F6';
                    let bgColor = 'rgba(59,130,246,0.1)';
                    if (isTelegram) { iconColor = '#0EA5E9'; bgColor = 'rgba(14,165,233,0.1)'; }
                    if (isGPU) { iconColor = '#F59E0B'; bgColor = 'rgba(245,158,11,0.1)'; }

                    return (
                        <div key={bridge.id} className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, border: `1px solid ${bgColor}` }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{bridge.name || 'Custom Bridge'}</div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>Monitoring</div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                                {bridge.method} Endpoint. Target Table: <strong>{bridge.targetTable}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                                <span style={{ color: 'var(--text-soft)' }}>Trigger: {bridge.schedule}</span>
                                <span>URL: <strong style={{ color: 'var(--text)' }}>{bridge.url?.substring(0, 18)}...</strong></span>
                            </div>
                        </div>
                    );
                })}


            </div>

            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>Live View Console</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="ghost-btn" style={{ fontSize: '11px', padding: '6px 12px' }}>Clear Logs</button>
                        <button className="ghost-btn" style={{ fontSize: '11px', padding: '6px 12px' }}>Download CSV</button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid #10B981' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}>16:15:00</span>
                        <span style={{ color: '#10B981', minWidth: '65px', fontWeight: 600 }}>[INFO]</span>
                        <span>Fanvue Metrics Agent sync cycle complete. 0 updates.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid #F59E0B' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}>15:30:22</span>
                        <span style={{ color: '#F59E0B', minWidth: '65px', fontWeight: 600 }}>[WARN]</span>
                        <span>External API rate limit approaching (42/50). Throttling requests.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid #10B981' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}>14:02:11</span>
                        <span style={{ color: '#10B981', minWidth: '65px', fontWeight: 600 }}>[INFO]</span>
                        <span>Tele-Approve: Received layout approval for "Sofia_Summer.jpg".</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', borderLeft: '3px solid #3B82F6' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}>14:02:11</span>
                        <span style={{ color: '#3B82F6', minWidth: '65px', fontWeight: 600 }}>[HOOK]</span>
                        <span>Airtable state updated to 'Approved' for Record_XYZ.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid #10B981' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}>12:00:00</span>
                        <span style={{ color: '#10B981', minWidth: '65px', fontWeight: 600 }}>[INFO]</span>
                        <span>ComfyUI Server (RunPod) spun down due to inactivity to save costs.</span>
                    </div>
                    
                    {/* Blinking cursor effect for realism */}
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text)', padding: '10px 10px 10px 0' }}>
                        <span style={{ opacity: 0.5, minWidth: '65px' }}></span>
                        <span style={{ minWidth: '65px' }}></span>
                        <span style={{ width: '8px', height: '14px', background: 'var(--text-muted)', animation: 'blink 1s step-end infinite' }}></span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default RunnerTab;
