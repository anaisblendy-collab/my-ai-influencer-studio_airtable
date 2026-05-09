/**
 * Sidebar Component - Navigation (Workspace OS Style) - English Version
 */

import React from 'react';
import { useGlobalConfig } from '@airtable/blocks/ui';
import { CreditsProgressBar } from './CreditsProgressBar';

import { useWorkspaceStore } from '../workspace/workspaceStore';

type SidebarItem = {
    id: string;
    icon: string;
    label: string;
    badge?: string;
    basicOnly?: boolean;
    adminOnly?: boolean;
    tone?: 'setup' | 'influencer' | 'content' | 'production' | 'advanced';
};

export function Sidebar() {
    const { activeTab, setActiveTab } = useWorkspaceStore();
    const globalConfig = useGlobalConfig();
    const [collapsed, setCollapsed] = React.useState(
        globalConfig.get('sidebarCollapsed') === null ? false : Boolean(globalConfig.get('sidebarCollapsed'))
    );
    const basicMode = Boolean(globalConfig.get('basicMode'));
    const isAdmin = Boolean(globalConfig.get('isAdmin'));
    const sections: { title: string; items: SidebarItem[] }[] = [
        {
            title: 'CREATION',
            items: [
                { id: 'creator', icon: 'wizard', label: 'Creator Wizard', badge: 'NEW', tone: 'influencer' },
                { id: 'workspace', icon: 'studio', label: 'Content Studio', badge: 'PRO', tone: 'content' },
                { id: 'video', icon: 'video', label: 'Video Studio', badge: 'NEW', tone: 'content' },
            ]
        },
        {
            title: 'MANAGEMENT',
            items: [
                { id: 'instagram-cf', icon: 'instagram', label: 'Instagram CF', badge: 'NEW', tone: 'production' },
                { id: 'threads', icon: 'threads', label: 'Threads', badge: 'NEW', tone: 'production' },
                { id: 'library', icon: 'library', label: 'Influencer Library', tone: 'influencer' },
                { id: 'production', icon: 'queue', label: 'Production Queue', tone: 'production' },
                { id: 'assets', icon: 'assets', label: 'Assets (LoRAs)', basicOnly: false, tone: 'production' },
            ]
        },
        {
            title: 'PRO TOOLS',
            items: [
                { id: 'studio', icon: 'playground', label: 'Playground', tone: 'advanced' },
                { id: 'workflow', icon: 'workflow', label: 'Workflow', badge: 'NEW', tone: 'advanced' },
                { id: 'workflow-pro', icon: 'studio', label: 'Node Editor', badge: 'PRO', tone: 'advanced' },
                { id: 'edit-pro', icon: 'edit', label: 'Edit Pro', badge: 'NEW', tone: 'advanced' },
                { id: 'editor', icon: 'paint', label: 'Editor Studio', tone: 'advanced' },
                { id: 'training', icon: 'training', label: 'Training Center', basicOnly: false, tone: 'advanced' },
            ]
        },
        {
            title: 'SYSTEM',
            items: [
                { id: 'runner', icon: 'activity', label: 'Automation Runner', badge: 'NEW', tone: 'setup' },
                { id: 'storage', icon: 'connections', label: 'Connections', basicOnly: false, tone: 'advanced' },
                { id: 'setup', icon: 'settings', label: 'Setup', tone: 'setup' },
                { id: 'catalog', icon: 'catalog', label: 'Model Catalog', adminOnly: true, tone: 'advanced' },
            ]
        }
    ];

    const getIcon = (type: string) => {
        const props = { width: 18, height: 18, strokeWidth: 2, fill: "none", stroke: "currentColor" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
        switch (type) {
            case 'wizard': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M15 4V2m0 12v-2m4-3h2m-12 0H7m11.5-4.5L17 7m1 10-1.5-1.5M6.5 6.5 8 8m-1.5 9.5L8 16m3-1h2l4-4-2-2-4 4v2Z"/>
                    <path d="M2 22a2 2 0 0 0 2-2 2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 1 0 0-4 2 2 0 1 1-2-2V2"/>
                </svg>
            );
            case 'studio': return (
                <svg {...props} viewBox="0 0 24 24">
                    <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
            );
            case 'video': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>
                </svg>
            );
            case 'library': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M19 8a4 4 0 0 1 0 7.75"/>
                </svg>
            );
            case 'queue': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M2 13v1c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-1"/><path d="M5 10H2"/><path d="M22 10h-3"/><path d="M14 6h1a1 1 0 0 1 1 1v1"/><path d="M10 6H9a1 1 0 0 0-1 1v1"/><path d="M15 10v4"/><path d="M9 10v4"/>
                </svg>
            );
            case 'assets': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                </svg>
            );
            case 'playground': return (
                <svg {...props} viewBox="0 0 24 24">
                    <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
                </svg>
            );
            case 'workflow': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>
                </svg>
            );
            case 'edit': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-2-2Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M6 16h4"/><path d="m14 11-4 4"/><path d="m10 11 4 4"/>
                </svg>
            );
            case 'paint': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><path d="m2 2 5 2.5"/><path d="m4.5 4.5 2.5 5"/>
                </svg>
            );
            case 'training': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.04-2.44V4.5A2.5 2.5 0 0 1 7.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.04-2.44V4.5A2.5 2.5 0 0 0 16.5 2z"/>
                </svg>
            );
            case 'connections': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
                </svg>
            );
            case 'settings': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
            );
            case 'catalog': return (
                <svg {...props} viewBox="0 0 24 24">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
            );
            case 'activity': return (
                <svg {...props} viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
            );
            case 'instagram': return (
                <svg {...props} viewBox="0 0 24 24">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
            );
            case 'threads': return (
                <svg {...props} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>
                </svg>
            );
            default: return null;
        }
    };

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            width: collapsed ? '80px' : '240px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            zIndex: 100
        }}>
            <div className="sidebar-header" style={{ 
                marginBottom: '40px', 
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                height: '64px'
            }}>
                <div style={{ 
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: '18px',
                    fontWeight: 900,
                    boxShadow: '0 4px 12px var(--primary-glow)'
                }}>
                    B.
                </div>
                {!collapsed && (
                    <div style={{ marginLeft: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                        <div className="sidebar-title" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>Bonobooh</div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', opacity: 0.7 }}>STUDIO</div>
                    </div>
                )}
            </div>

            <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {sections.map((section, index) => (
                    <div key={section.title} style={{ marginBottom: '24px' }}>
                        {!collapsed && (
                            <div className="sidebar-section-title" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                {section.title}
                            </div>
                        )}
                        {collapsed && index > 0 && <div className="sidebar-section-divider" />}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {section.items.filter(tab => (!tab.adminOnly || isAdmin) && (!basicMode || tab.basicOnly !== false)).map(tab => (
                                <button
                                    key={tab.id}
                                    className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    title={collapsed ? tab.label : undefined}
                                    style={{
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        padding: collapsed ? '10px 0' : '10px 16px'
                                    }}
                                >
                                    <span className={`sidebar-icon-minimal ${activeTab === tab.id ? 'active' : ''}`}>
                                        {getIcon(tab.icon)}
                                    </span>
                                    {!collapsed && (
                                        <span style={{ 
                                            marginLeft: '4px',
                                            animation: 'fadeIn 0.2s ease-out',
                                            flex: 1
                                        }}>
                                            {tab.label}
                                        </span>
                                    )}
                                    {!collapsed && tab.badge && (
                                        <span className="sidebar-badge" style={{
                                            fontSize: '8px',
                                            padding: '2px 6px',
                                            background: tab.badge === 'NEW' ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.06)',
                                            color: tab.badge === 'NEW' ? '#000' : 'var(--text-muted)',
                                            borderRadius: '6px',
                                            fontWeight: 800
                                        }}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="sidebar-footer" style={{ 
                marginTop: 'auto', 
                padding: '20px 12px',
                borderTop: '1px solid var(--card-border)',
                background: 'rgba(0,0,0,0.1)'
            }}>
                <CreditsProgressBar collapsed={collapsed} />
                
                <button
                    className="sidebar-toggle-new"
                    onClick={() => {
                        const next = !collapsed;
                        setCollapsed(next);
                        globalConfig.setAsync('sidebarCollapsed', next);
                    }}
                    style={{
                        width: '100%',
                        marginTop: '16px',
                        background: 'transparent',
                        border: '1px solid var(--card-border)',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                    {!collapsed && <span>Collapse Sidebar</span>}
                </button>
            </div>
        </div>
    );
}
