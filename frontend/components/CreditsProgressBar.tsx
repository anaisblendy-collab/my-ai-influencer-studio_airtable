import React, { useEffect, useState } from 'react';
import { backendService, CreditStatus } from '../services/backend';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { useWorkspaceStore } from '../workspace/workspaceStore';

export function CreditsProgressBar({ collapsed = false }: { collapsed?: boolean }) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const { setActiveTab } = useWorkspaceStore();
    const billingMode = globalConfig.get('connectionsBillingMode') as string;
    const isByok = billingMode === 'byok';
    const [credits, setCredits] = useState<CreditStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshCredits = async () => {
        try {
            const status = await backendService.getCreditsStatus(base.id);
            setCredits(status);
        } catch (error) {
            console.error('Failed to fetch credits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshCredits();
        // Refresh every 30 seconds
        const interval = setInterval(refreshCredits, 30000);
        
        // Listen for immediate refresh events
        window.addEventListener('refresh-credits', refreshCredits);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('refresh-credits', refreshCredits);
        };
    }, [base.id]);

    if (!credits && loading) return null;
    if (!credits) return null;

    const usagePercent = Math.min(100, (credits.used_credits / credits.total_credits) * 100);
    const isLow = credits.remaining_credits <= 2;
    const isExhausted = credits.remaining_credits <= 0;

    // Premium Color Logic
    let barColor = 'linear-gradient(90deg, #d1fe17 0%, #ffed25 100%)'; // Volt Green to Yellow
    if (usagePercent > 70) barColor = 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'; // Orange to Red
    if (isExhausted) barColor = '#EF4444';

    if (collapsed) {
        return (
            <div 
                title={`${credits.remaining_credits} runs remaining`}
                style={{
                    padding: '8px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <div style={{
                    width: '32px',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${usagePercent}%`,
                        background: barColor,
                        borderRadius: '2px',
                        transition: 'width 0.6s ease'
                    }} />
                </div>
                <div style={{ fontSize: '9px', fontWeight: 900, color: isExhausted ? '#EF4444' : 'var(--primary)' }}>
                    {credits.remaining_credits}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '14px',
            background: 'var(--card-bg)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isLow ? '0 0 15px rgba(245, 158, 11, 0.08)' : 'none'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: isExhausted ? '#EF4444' : 'var(--primary)',
                        filter: 'blur(1px)',
                        animation: !isExhausted ? 'pulseGlow 2s infinite alternate' : 'none'
                    }} />
                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                        RUNS
                    </span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: isExhausted ? '#EF4444' : '#fff' }}>
                    {credits.remaining_credits} <span style={{ opacity: 0.5, fontWeight: 500 }}>LEFT</span>
                </div>
            </div>

            <div style={{
                height: '5px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${usagePercent}%`,
                    background: barColor,
                    borderRadius: '10px',
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: isLow ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
                }} />
            </div>
        </div>
    );
}
