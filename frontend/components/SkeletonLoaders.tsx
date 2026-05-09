
import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`skeleton ${className}`} />
);

export const DashboardSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Skeleton className="skeleton-title" />
        <div className="stats-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="stat-item">
                    <Skeleton className="skeleton-text" style={{ width: '40%' }} />
                    <Skeleton className="skeleton-title" style={{ height: '40px', marginTop: '8px' }} />
                </div>
            ))}
        </div>
        <div className="glass-card">
            <Skeleton className="skeleton-title" style={{ width: '30%', marginBottom: '24px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="skeleton-text" style={{ height: '60px' }} />
                ))}
            </div>
        </div>
    </div>
);

export const LibrarySkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card" style={{ padding: '16px' }}>
                <Skeleton className="skeleton-card" style={{ height: '240px', marginBottom: '16px' }} />
                <Skeleton className="skeleton-text" style={{ width: '80%' }} />
                <Skeleton className="skeleton-text" style={{ width: '50%' }} />
            </div>
        ))}
    </div>
);

export const FormSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {[1, 2, 3, 4].map(i => (
            <div key={i}>
                <Skeleton className="skeleton-text" style={{ width: '20%', marginBottom: '8px' }} />
                <Skeleton className="skeleton-text" style={{ height: '42px' }} />
            </div>
        ))}
        <Skeleton className="skeleton-button" style={{ marginTop: '10px' }} />
    </div>
);
