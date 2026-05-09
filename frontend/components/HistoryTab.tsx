/**
 * History Tab Component - Generation Audit Log from Airtable
 */

import React, { useState, useEffect } from 'react';
import { backendService, ContentItem } from '../services/backend';

export function HistoryTab() {
    const [records, setRecords] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const historyRecords = await backendService.getContents(50);
            setRecords(historyRecords);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="glass-card">
                <div className="card-title">Generation Archives</div>
                <div className="loading-container">
                    <div className="loading-text">Retrieving production history...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card-title">Production History</div>
                    <button
                        className="quick-add-btn"
                        onClick={loadHistory}
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                        🔄 Refresh Logs
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px', color: '#a1a1aa' }}>
                    <span>Total Created: {records.length} assets</span>
                </div>
            </div>

            {/* Generations List */}
            {records.length === 0 ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📚</div>
                        <div className="empty-state-text">No assets generated yet</div>
                        <div style={{ fontSize: '12px', color: '#52525b' }}>
                            Your agency's creations will appear here as they are produced.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {records.map(record => (
                            <div
                                key={record.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: 'rgba(30, 30, 46, 0.5)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(139, 92, 246, 0.2)'
                                }}
                            >
                                {/* Preview */}
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '8px',
                                    background: record.image_url
                                        ? `url(${record.image_url})`
                                        : 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    flexShrink: 0
                                }}>
                                    {!record.image_url && (
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px'
                                        }}>
                                            📸
                                        </div>
                                    )}
                                </div>

                                {/* Content Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#e4e4e7',
                                        marginBottom: '4px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {record.name} • {record.niche} ({record.style})
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#a1a1aa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ color: '#8B5CF6' }}>{record.model}</span>
                                        <span>•</span>
                                        <span style={{ color: '#4ade80' }}>● Completed</span>
                                        {record.cost && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: '#facc15' }}>${record.cost}</span>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>
                                        {formatDate(new Date(record.created_at))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {record.image_url && (
                                        <button
                                            className="quick-add-btn"
                                            onClick={() => window.open(record.image_url, '_blank')}
                                            style={{ padding: '6px 12px', fontSize: '11px' }}
                                        >
                                            View Asset
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