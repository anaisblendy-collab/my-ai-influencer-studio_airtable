/**
 * LibraryTab Component - Influencer Library
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, AssetRecord, ContentMediaRecord, ContentRecord, FanvueAccountRecord, FanvuePostRecord, InfluencerProfileRecord, JobRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { NICHES, STYLES, GENDERS } from '../data/lookups';
import { useWorkspaceStore } from '../workspace/workspaceStore';

type DetailTab = 'overview' | 'content' | 'videos' | 'assets' | 'jobs';

export function LibraryTab({
    onSelectProfile,
    onManageAssets,
    onOpenStudio,
    onOpenCreator
}: {
    onSelectProfile?: (profile: any) => void;
    onManageAssets?: (profile: any) => void;
    onOpenStudio?: (profile: any) => void;
    onOpenCreator?: () => void;
}) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = new AirtableService(base, globalConfig);
    const { setSelectedProfile } = useWorkspaceStore();

    const [profiles, setProfiles] = useState<InfluencerProfileRecord[]>([]);
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [assets, setAssets] = useState<AssetRecord[]>([]);
    const [contents, setContents] = useState<ContentRecord[]>([]);
    const [contentMedia, setContentMedia] = useState<ContentMediaRecord[]>([]);
    const [fanvueAccounts, setFanvueAccounts] = useState<FanvueAccountRecord[]>([]);
    const [fanvuePosts, setFanvuePosts] = useState<FanvuePostRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterStatus, setFilterStatus] = useState<'active' | 'archived' | 'all'>('active');
    const [filterApproved, setFilterApproved] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [detailTab, setDetailTab] = useState<DetailTab>('overview');
    const [contentStatusFilter, setContentStatusFilter] = useState<'all' | 'approved' | 'generated'>('all');
    const [contentPlatformFilter, setContentPlatformFilter] = useState<'all' | 'instagram' | 'tiktok' | 'onlyfans'>('all');
    const [isWideLayout, setIsWideLayout] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1180 : true);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [postingToThreadsId, setPostingToThreadsId] = useState<string | null>(null);
    const [syncingMetrics, setSyncingMetrics] = useState(false);
    const [syncingPostId, setSyncingPostId] = useState<string | null>(null);
    const [runningAutopublish, setRunningAutopublish] = useState(false);
    const [autopublishReport, setAutopublishReport] = useState<null | {
        scanned: number;
        eligible: number;
        published: number;
        skipped: number;
        failed: number;
        items: Array<{ content_record_id?: string; status?: string; reason?: string; error?: string }>;
        message: string;
    }>(null);
    const [updatingFanvueAccount, setUpdatingFanvueAccount] = useState(false);
    const [editingProfile, setEditingProfile] = useState<InfluencerProfileRecord | null>(null);
    const [editProfile, setEditProfile] = useState({ name: '', age: '25', gender: 'female', niche: 'fashion', style: 'glamour', avatarUrl: '' });
    const [editingContentId, setEditingContentId] = useState<string>('');
    const [contentMediaDraft, setContentMediaDraft] = useState({ name: '', storageUrl: '', mediaType: 'image' as 'image' | 'video' });
    const [showFanvueHistory, setShowFanvueHistory] = useState(false);

    const fetchProfiles = async () => {
        setLoading(true);
        const [profilesData, jobsData, assetsData, contentData, contentMediaData, fanvueAccountsData, fanvuePostsData] = await Promise.all([
            airtableService.getInfluencerProfiles(),
            airtableService.getJobs(),
            airtableService.getAssets(),
            airtableService.getContentRecords(200),
            airtableService.getContentMedia(500),
            airtableService.getFanvueAccounts(),
            airtableService.getFanvuePosts(200)
        ]);
        setProfiles(profilesData);
        setJobs(jobsData);
        setAssets(assetsData);
        setContents(contentData);
        setContentMedia(contentMediaData);
        setFanvueAccounts(fanvueAccountsData);
        setFanvuePosts(fanvuePostsData);
        setLoading(false);
    };

    const visibleProfiles = useMemo(() => {
        return profiles
            .filter((profile) => {
                const status = (profile.status || 'Active').toLowerCase();
                if (filterStatus === 'all') return true;
                if (filterStatus === 'archived') return status === 'archived';
                return status !== 'archived';
            })
            .filter((profile) => !filterApproved || profile.approved);
    }, [profiles, filterApproved, filterStatus]);

    useEffect(() => {
        fetchProfiles();
    }, []);

    useEffect(() => {
        const handleResize = () => setIsWideLayout(window.innerWidth >= 1180);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!visibleProfiles.length) {
            setSelectedProfileId('');
            return;
        }
        if (!selectedProfileId || !visibleProfiles.some((profile) => profile.id === selectedProfileId)) {
            setSelectedProfileId(visibleProfiles[0].id);
        }
    }, [visibleProfiles, selectedProfileId]);

    const selectedProfile = useMemo(
        () => visibleProfiles.find((profile) => profile.id === selectedProfileId) || visibleProfiles[0] || null,
        [selectedProfileId, visibleProfiles]
    );

    const getInfluencerJobs = (influencerId: string) =>
        jobs
            .filter((job) => job.influencerIds.includes(influencerId))
            .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    const getInfluencerAssets = (influencerId: string) =>
        assets.filter((asset) => asset.linkedInfluencerIds.includes(influencerId));

    const getInfluencerContent = (profile: InfluencerProfileRecord) =>
        contents
            .filter((item) => item.influencerIds.includes(profile.id))
            .sort((a, b) => (new Date(b.createdAt || '').getTime() || 0) - (new Date(a.createdAt || '').getTime() || 0));

    const startEdit = (profile: InfluencerProfileRecord) => {
        setEditingProfile(profile);
        setEditProfile({
            name: profile.name,
            age: profile.age,
            gender: profile.gender,
            niche: profile.niche,
            style: profile.style,
            avatarUrl: profile.avatarUrl || ''
        });
    };

    const handleUpdateProfile = async () => {
        if (!editingProfile) return;
        const ok = await airtableService.updateInfluencerProfile(editingProfile.id, editProfile);
        if (ok) {
            setEditingProfile(null);
            fetchProfiles();
        } else {
            alert('Update failed.');
        }
    };

    const toggleArchive = async (profile: InfluencerProfileRecord) => {
        const nextStatus = profile.status === 'Archived' ? 'Active' : 'Archived';
        const ok = await airtableService.setInfluencerStatus(profile.id, nextStatus as 'Active' | 'Archived');
        if (ok) {
            fetchProfiles();
        } else {
            alert('Status update failed.');
        }
    };

    const toggleApproved = async (profile: InfluencerProfileRecord) => {
        const next = !profile.approved;
        const ok = await airtableService.setInfluencerApproved(profile.id, next);
        if (ok) {
            fetchProfiles();
        } else {
            alert('Approval update failed.');
        }
    };
    const toggleSelectProfile = (profileId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(profileId)) {
                next.delete(profileId);
            } else {
                next.add(profileId);
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const applyBulkAction = async (action: 'approve' | 'unapprove' | 'archive' | 'restore') => {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        for (const id of ids) {
            if (action === 'approve') await airtableService.setInfluencerApproved(id, true);
            if (action === 'unapprove') await airtableService.setInfluencerApproved(id, false);
            if (action === 'archive') await airtableService.setInfluencerStatus(id, 'Archived');
            if (action === 'restore') await airtableService.setInfluencerStatus(id, 'Active');
        }
        clearSelection();
        fetchProfiles();
    };

    const openProfileWorkspace = (profile: InfluencerProfileRecord) => {
        setSelectedProfile(profile as any);
        onSelectProfile?.(profile);
    };

    const publishToFanvue = async (item: ContentRecord) => {
        if (!selectedProfile) return;
        setPublishingId(item.id);
        try {
            const linkedMedia = contentMedia
                .filter((media) => media.contentIds.includes(item.id))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            const mediaUrls = linkedMedia
                .map((media) => (media.storageUrl || media.mediaUrl || '').trim())
                .filter(Boolean);
            const singleUrl = (item.storageUrl || '').trim() || (item.mediaUrl || '').trim();
            const publishUrls = mediaUrls.length ? mediaUrls : (singleUrl ? [singleUrl] : []);
            if (!publishUrls.length) {
                alert('Missing media URL. Add a public URL in Content -> Storage URL (recommended) or attach media.');
                return;
            }
            const result = await backendService.publishToFanvue({
                orgId: base.id,
                caption: item.prompt || `${selectedProfile.name} ${item.platform || 'fan post'}`,
                mediaUrl: publishUrls[0],
                mediaUrls: publishUrls.length > 1 ? publishUrls : undefined,
                mediaType: (item.type || '').toLowerCase() === 'video' ? 'video' : 'image',
                name: item.name || selectedProfile.name,
                contentRecordId: item.id,
                influencerId: selectedProfile.id,
                fanvueAccountId: detailFanvueAccount?.accountId,
                creatorUserUuid: selectedProfile.fanvueCreatorUuid
            });
            await fetchProfiles();
            alert(result.message || 'Sent to Fanvue.');
        } catch (error: any) {
            alert(error?.message || 'Fanvue publish failed');
        } finally {
            setPublishingId(null);
        }
    };

    const detailJobs = selectedProfile ? getInfluencerJobs(selectedProfile.id) : [];
    const detailAssets = selectedProfile ? getInfluencerAssets(selectedProfile.id) : [];
    const detailContent = selectedProfile ? getInfluencerContent(selectedProfile) : [];
    const detailFanvueAccount = selectedProfile
        ? fanvueAccounts.find((item) => (selectedProfile.fanvueAccountRecordIds || []).includes(item.id))
        || fanvueAccounts.find((item) => item.influencerIds.includes(selectedProfile.id))
        || null
        : null;
    const detailFanvuePosts = selectedProfile ? fanvuePosts.filter((item) => item.influencerIds.includes(selectedProfile.id)) : [];
    const approvedContent = detailContent.filter((item) => item.approved || (item.status || '').toLowerCase() === 'approved');
    const imageContent = detailContent.filter((item) => (item.type || '').toLowerCase() !== 'video');
    const videoContent = detailContent.filter((item) => (item.type || '').toLowerCase() === 'video');
    const contentPlatforms = Array.from(new Set(imageContent.map((item) => (item.platform || '').toLowerCase()).filter(Boolean)));
    const availableFanvueAccounts = useMemo(
        () => fanvueAccounts.slice().sort((a, b) => (a.displayName || a.username || a.accountId || '').localeCompare(b.displayName || b.username || b.accountId || '')),
        [fanvueAccounts]
    );
    const filteredContent = imageContent.filter((item) => {
        const normalizedStatus = (item.status || '').toLowerCase();
        const normalizedPlatform = (item.platform || '').toLowerCase();
        if (contentStatusFilter === 'approved' && !(item.approved || normalizedStatus === 'approved')) return false;
        if (contentStatusFilter === 'generated' && (item.approved || normalizedStatus === 'approved')) return false;
        if (contentPlatformFilter !== 'all' && normalizedPlatform !== contentPlatformFilter) return false;
        return true;
    });

    const getMediaItemsForContent = (contentId: string) =>
        contentMedia
            .filter((media) => media.contentIds.includes(contentId))
            .sort((a, b) => (a.order || 0) - (b.order || 0));

    const contentEditorItem = editingContentId
        ? detailContent.find((item) => item.id === editingContentId) || null
        : null;
    const contentEditorMedia = contentEditorItem ? getMediaItemsForContent(contentEditorItem.id) : [];

    const saveContentMediaDraft = async () => {
        if (!selectedProfile || !contentEditorItem) return;
        const primaryUrl = (contentMediaDraft.storageUrl || '').trim();
        if (!primaryUrl) {
            alert('Add a public media URL first.');
            return;
        }
        const created = await airtableService.createContentMediaRecord({
            contentId: contentEditorItem.id,
            influencerId: selectedProfile.id,
            name: (contentMediaDraft.name || '').trim() || `${contentEditorItem.name || selectedProfile.name} ${contentEditorMedia.length + 1}`,
            mediaUrl: primaryUrl,
            storageUrl: primaryUrl,
            mediaType: contentMediaDraft.mediaType,
            order: contentEditorMedia.length + 1
        });
        if (!created) {
            alert('Content media save failed. Check that `Content Media` exists in Setup and that the table has write permission.');
            return;
        }
        setContentMediaDraft({ name: '', storageUrl: '', mediaType: 'image' });
        await fetchProfiles();
    };

    const seedContentMediaFromContent = async (item: ContentRecord) => {
        if (!selectedProfile) return;
        const fallbackUrl = (item.storageUrl || item.mediaUrl || '').trim();
        if (!fallbackUrl) {
            alert('This content item has no URL to seed from.');
            return;
        }
        const created = await airtableService.createContentMediaRecord({
            contentId: item.id,
            influencerId: selectedProfile.id,
            name: item.name || `${selectedProfile.name} media`,
            mediaUrl: fallbackUrl,
            storageUrl: fallbackUrl,
            mediaType: (item.type || '').toLowerCase() === 'video' ? 'video' : 'image',
            order: getMediaItemsForContent(item.id).length + 1
        });
        if (!created) {
            alert('Could not seed carousel media. Check that `Content Media` exists in Setup and that the table has write permission.');
            return;
        }
        await fetchProfiles();
    };

    const moveContentMedia = async (mediaId: string, direction: -1 | 1) => {
        if (!contentEditorItem) return;
        const items = getMediaItemsForContent(contentEditorItem.id);
        const index = items.findIndex((item) => item.id === mediaId);
        const swapIndex = index + direction;
        if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;
        const current = items[index];
        const target = items[swapIndex];
        const currentOrder = current.order || index + 1;
        const targetOrder = target.order || swapIndex + 1;
        const first = await airtableService.updateContentMediaRecord(current.id, { order: targetOrder });
        const second = await airtableService.updateContentMediaRecord(target.id, { order: currentOrder });
        if (!first || !second) {
            alert('Could not update media order.');
            return;
        }
        await fetchProfiles();
    };

    const deleteContentMedia = async (mediaId: string) => {
        const ok = await airtableService.deleteContentMediaRecord(mediaId);
        if (!ok) {
            alert('Could not delete content media.');
            return;
        }
        await fetchProfiles();
    };

    const handleFanvueAccountChange = async (fanvueAccountRecordId: string) => {
        if (!selectedProfile) return;
        setUpdatingFanvueAccount(true);
        try {
            const ok = await airtableService.setInfluencerFanvueAccount(selectedProfile.id, fanvueAccountRecordId || null);
            if (!ok) {
                alert('Fanvue account update failed.');
                return;
            }
            await fetchProfiles();
        } finally {
            setUpdatingFanvueAccount(false);
        }
    };

    const handleUpdateFanvueUUID = async () => {
        if (!selectedProfile) return;
        const current = selectedProfile.fanvueCreatorUuid || '';
        const newUuid = window.prompt('Enter Fanvue Creator UUID for this influencer (leave empty to remove):', current);
        if (newUuid !== null && newUuid.trim() !== current) {
            const ok = await airtableService.updateInfluencerProfile(selectedProfile.id, { fanvueCreatorUuid: newUuid.trim() });
            if (ok) {
                await fetchProfiles();
            } else {
                alert('Failed to update Creator UUID.');
            }
        }
    };

    const syncFanvueMetrics = async () => {
        if (!selectedProfile) return;
        setSyncingMetrics(true);
        try {
            const result = await backendService.syncFanvueMetrics({
                orgId: base.id,
                influencerId: selectedProfile.id,
                fanvueAccountId: detailFanvueAccount?.accountId
            });
            await fetchProfiles();
            alert(result.message);
        } catch (error: any) {
            alert(error?.message || 'Fanvue sync failed');
        } finally {
            setSyncingMetrics(false);
        }
    };

    const syncFanvuePost = async (postId: string) => {
        if (!selectedProfile) return;
        setSyncingPostId(postId);
        try {
            const result = await backendService.syncFanvueMetrics({
                orgId: base.id,
                influencerId: selectedProfile.id,
                fanvueAccountId: detailFanvueAccount?.accountId,
                postIds: [postId]
            });
            await fetchProfiles();
            alert(result.message);
        } catch (error: any) {
            alert(error?.message || 'Fanvue sync failed');
        } finally {
            setSyncingPostId(null);
        }
    };

    const postToThreads = async (item: ContentRecord) => {
        if (!selectedProfile) return;
        const mediaUrl = (item.storageUrl || item.mediaUrl || '').trim();
        if (!mediaUrl) {
            alert('This content item has no media URL to post to Threads.');
            return;
        }
        const targetBot = (globalConfig.get('threadsTargetBot') as string) || undefined;
        setPostingToThreadsId(item.id);
        try {
            await backendService.createThreadsJob({
                message: item.prompt || `${selectedProfile.name} — ${item.platform || 'Threads'}`,
                images: [mediaUrl],
                tenant_id: base.id,
                targetBot,
            });
            alert(`✅ "${item.name || 'Content'}" queued for Threads!${targetBot ? `\nRouted to bot: ${targetBot}` : ''}`);
        } catch (error: any) {
            alert(`❌ Threads post failed: ${error?.message || 'Unknown error'}`);
        } finally {
            setPostingToThreadsId(null);
        }
    };

    const runAutoPublish = async (contentRecordId?: string, dryRun = false) => {
        setRunningAutopublish(true);
        try {
            const result = await backendService.runFanvueAutopublish({
                orgId: base.id,
                contentRecordId,
                dryRun,
                maxItems: contentRecordId ? 1 : 25,
            });
            setAutopublishReport({
                scanned: result.scanned,
                eligible: result.eligible,
                published: result.published,
                skipped: result.skipped,
                failed: result.failed,
                items: Array.isArray(result.items) ? result.items : [],
                message: result.message || (dryRun ? 'Dry run completed.' : 'Auto publish completed.')
            });
            if (!dryRun) {
                await fetchProfiles();
            }
            alert(result.message || (dryRun ? 'Dry run completed.' : 'Auto publish completed.'));
        } catch (error: any) {
            alert(error?.message || 'Auto publish failed');
        } finally {
            setRunningAutopublish(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-text">Loading influencer library...</div>
            </div>
        );
    }

    if (profiles.length === 0) {
        return (
            <div className="library-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '40px' }}>
                <div style={{ position: 'relative', marginBottom: '32px' }}>
                    <div style={{ fontSize: '80px', filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))' }}>👥</div>
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', fontSize: '32px' }}>✨</div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.5px' }}>Your Library is Empty</div>
                <div style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.6', marginBottom: '32px' }}>
                    No influencers generated yet. Head over to the **Creator** tab to design your first AI persona and start building your empire.
                </div>
                <button 
                    className="gradient-btn" 
                    style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 700 }}
                    onClick={() => onOpenCreator?.()}
                >
                    Create My First Influencer
                </button>
                
                <div style={{ marginTop: '64px', display: 'flex', gap: '32px', opacity: 0.5 }}>
                    <div style={{ fontSize: '12px' }}>✓ Personalities</div>
                    <div style={{ fontSize: '12px' }}>✓ AI Models</div>
                    <div style={{ fontSize: '12px' }}>✓ Social Sync</div>
                </div>
            </div>
        );
    }

    return (
        <div className="library-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className="card-title" style={{ margin: 0 }}>Influencer Library</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        className="dark-select"
                        value=""
                        onChange={(e) => {
                            const action = e.target.value as any;
                            if (action) applyBulkAction(action);
                            e.target.value = '';
                        }}
                        style={{ fontSize: '11px', minWidth: '150px' }}
                    >
                        <option value="">Bulk actions</option>
                        <option value="approve">Approve selected</option>
                        <option value="unapprove">Unapprove selected</option>
                        <option value="archive">Archive selected</option>
                        <option value="restore">Restore selected</option>
                    </select>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedIds.size} selected</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(['active', 'archived', 'all'] as const).map((value) => (
                            <button
                                key={value}
                                className="gradient-btn"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '11px', background: filterStatus === value ? 'var(--primary)' : 'transparent', color: filterStatus === value ? '#fff' : 'var(--text-main)' }}
                                onClick={() => setFilterStatus(value)}
                            >
                                {value[0].toUpperCase() + value.slice(1)}
                            </button>
                        ))}
                        <button
                            className="gradient-btn"
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '11px', background: filterApproved ? 'var(--primary)' : 'transparent', color: filterApproved ? '#fff' : 'var(--text-main)' }}
                            onClick={() => setFilterApproved(!filterApproved)}
                        >
                            Approved only
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {(['grid', 'list'] as const).map((value) => (
                            <button
                                key={value}
                                className="gradient-btn"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '11px', background: viewMode === value ? 'var(--primary)' : 'transparent', color: viewMode === value ? '#fff' : 'var(--text-main)' }}
                                onClick={() => setViewMode(value)}
                            >
                                {value[0].toUpperCase() + value.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button className="gradient-btn" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => onOpenCreator?.()}>
                        Create influencer
                    </button>
                </div>
            </div>
            {editingProfile && (
                <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid #22c55e' }}>
                    <div className="card-title" style={{ fontSize: '12px', color: '#22c55e' }}>Edit Profile</div>
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input type="text" className="dark-input" value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Avatar URL (public)</label>
                        <input type="text" className="dark-input" placeholder="https://..." value={editProfile.avatarUrl} onChange={(e) => setEditProfile({ ...editProfile, avatarUrl: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">Age</label>
                            <input type="number" className="dark-input" value={editProfile.age} onChange={(e) => setEditProfile({ ...editProfile, age: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gender</label>
                            <select className="dark-select" value={editProfile.gender} onChange={(e) => setEditProfile({ ...editProfile, gender: e.target.value })}>
                                {GENDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Niche</label>
                            <select className="dark-select" value={editProfile.niche} onChange={(e) => setEditProfile({ ...editProfile, niche: e.target.value })}>
                                {NICHES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Style</label>
                        <select className="dark-select" value={editProfile.style} onChange={(e) => setEditProfile({ ...editProfile, style: e.target.value })}>
                            {STYLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="gradient-btn" onClick={handleUpdateProfile}>Save Changes</button>
                        <button className="ghost-btn" onClick={() => setEditingProfile(null)}>Cancel</button>
                    </div>
                </div>
            )}

            {selectedProfile && (
                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isWideLayout ? 'minmax(220px, 260px) minmax(0, 1fr)' : '1fr', gap: '18px', alignItems: 'start' }}>
                        <div>
                            <div
                                style={{
                                    height: '220px',
                                    borderRadius: '18px',
                                    backgroundImage: `url(${selectedProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px solid var(--card-border)'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className="tag active">{selectedProfile.status || 'Active'}</span>
                                {selectedProfile.approved && <span className="tag fast">Approved</span>}
                                <span className="tag premium">{selectedProfile.niche}</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>{selectedProfile.name}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {selectedProfile.age} years · {selectedProfile.gender} · {selectedProfile.style}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Main workspace for this influencer: identity, generated content, uploaded assets, and production jobs.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isWideLayout ? 'flex-end' : 'flex-start' }}>
                                    <button className="ghost-btn" onClick={() => toggleApproved(selectedProfile)}>
                                        {selectedProfile.approved ? 'Unapprove' : 'Approve'}
                                    </button>
                                    <button className="ghost-btn" onClick={() => startEdit(selectedProfile)}>
                                        Edit Profile
                                    </button>
                                    <button className="ghost-btn" onClick={syncFanvueMetrics} disabled={syncingMetrics || !detailFanvuePosts.length}>
                                        {syncingMetrics ? 'Syncing...' : 'Sync Fanvue Metrics'}
                                    </button>
                                    <button className="gradient-btn" style={{ width: 'auto', padding: '10px 14px' }} onClick={() => openProfileWorkspace(selectedProfile)}>
                                        Open Workspace
                                    </button>
                                    <button className="gradient-btn" style={{ width: 'auto', padding: '10px 14px' }} onClick={() => onOpenStudio?.(selectedProfile)}>
                                        Open Studio
                                    </button>
                                    <button className="ghost-btn" onClick={() => onManageAssets?.(selectedProfile)}>Manage Assets</button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '16px' }}>
                                <div className="stat-item" style={{ padding: '14px' }}>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{detailContent.length}</div>
                                    <div className="stat-label">Content</div>
                                </div>
                                <div className="stat-item" style={{ padding: '14px' }}>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{videoContent.length}</div>
                                    <div className="stat-label">Videos</div>
                                </div>
                                <div className="stat-item" style={{ padding: '14px' }}>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{detailAssets.length}</div>
                                    <div className="stat-label">Assets</div>
                                </div>
                                <div className="stat-item" style={{ padding: '14px' }}>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{approvedContent.length}</div>
                                    <div className="stat-label">Approved</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                                {(['overview', 'content', 'videos', 'assets', 'jobs'] as DetailTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        className={detailTab === tab ? 'gradient-btn' : 'ghost-btn'}
                                        style={{ width: 'auto', padding: '8px 12px', fontSize: '11px' }}
                                        onClick={() => setDetailTab(tab)}
                                    >
                                        {tab === 'overview' ? 'Overview' : tab[0].toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                {detailTab === 'overview' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isWideLayout ? '1.1fr 0.9fr' : '1fr', gap: '12px' }}>
                                        <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>Profile Summary</div>
                                            <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                <div>Niche: {selectedProfile.niche}</div>
                                                <div>Style: {selectedProfile.style}</div>
                                                <div>LoRA: {selectedProfile.mainCharacterLora ? 'Configured' : 'Not configured'}</div>
                                                <div>Fanvue: {detailFanvueAccount ? `@${detailFanvueAccount.username || detailFanvueAccount.displayName || 'connected'}` : 'Not linked yet'}</div>
                                                <div>Creator UUID: {selectedProfile.fanvueCreatorUuid || 'Missing'}</div>
                                                <div>Last active: {selectedProfile.lastActive ? new Date(selectedProfile.lastActive).toLocaleDateString() : '—'}</div>
                                            </div>
                                            <div style={{ marginTop: '12px' }}>
                                                <label className="form-label">Fanvue Account</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span className="tag" style={{ borderColor: availableFanvueAccounts.length ? 'rgba(34,197,94,0.35)' : undefined, color: availableFanvueAccounts.length ? '#22C55E' : undefined }}>
                                                        {availableFanvueAccounts.length ? `Connected: ${availableFanvueAccounts.length}` : 'Not connected'}
                                                    </span>
                                                    <span className="tag" style={{ borderColor: detailFanvueAccount ? 'rgba(59,130,246,0.35)' : undefined, color: detailFanvueAccount ? '#60A5FA' : undefined }}>
                                                        {detailFanvueAccount ? `Linked: ${detailFanvueAccount.displayName || detailFanvueAccount.username || 'account'}` : 'Not linked'}
                                                    </span>
                                                    <span className="tag" style={{ borderColor: selectedProfile.fanvueCreatorUuid ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)', color: selectedProfile.fanvueCreatorUuid ? '#22C55E' : '#F59E0B' }}>
                                                        {selectedProfile.fanvueCreatorUuid ? 'Creator UUID linked' : 'Creator UUID missing'}
                                                    </span>
                                                </div>
                                                <select
                                                    className="dark-select"
                                                    value={detailFanvueAccount?.id || ''}
                                                    onChange={(e) => {
                                                        const nextValue = e.currentTarget.value;
                                                        handleFanvueAccountChange(nextValue);
                                                    }}
                                                    disabled={updatingFanvueAccount}
                                                >
                                                    <option value="">No linked account</option>
                                                    {availableFanvueAccounts.map((account) => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.displayName || account.username || account.accountId || account.id}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    Pick which connected Fanvue creator account this influencer should publish to.
                                                </div>
                                                <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '12px', border: `1px solid ${selectedProfile.fanvueCreatorUuid ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, background: selectedProfile.fanvueCreatorUuid ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 700 }}>
                                                            {selectedProfile.fanvueCreatorUuid ? 'Creator-scoped Fanvue publish is ready' : 'Creator UUID still missing'}
                                                        </div>
                                                        <button className="ghost-btn" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={handleUpdateFanvueUUID}>
                                                            {selectedProfile.fanvueCreatorUuid ? 'Edit UUID' : 'Add UUID'}
                                                        </button>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {selectedProfile.fanvueCreatorUuid
                                                            ? `Posts can use /creators/${selectedProfile.fanvueCreatorUuid}/posts for this influencer.`
                                                            : 'Add `Fanvue Creator UUID` on this influencer if you want posts to be created explicitly on behalf of that creator.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>Latest Activity</div>
                                            {detailJobs[0] ? (
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Last job: {detailJobs[0].status || 'unknown'} {detailJobs[0].outputType ? `(${detailJobs[0].outputType})` : ''}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No jobs yet.</div>
                                            )}
                                            {detailContent[0] && (
                                                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Latest content: {detailContent[0].type || 'media'} {detailContent[0].createdAt ? `· ${new Date(detailContent[0].createdAt).toLocaleDateString()}` : ''}
                                                </div>
                                            )}
                                            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Fanvue posts: {detailFanvuePosts.length}
                                                {detailFanvuePosts[0]?.postUrl ? (
                                                    <>
                                                        {' '}· <a href={detailFanvuePosts[0].postUrl} target="_blank" rel="noreferrer">latest post</a>
                                                    </>
                                                ) : null}
                                            </div>
                                            {detailFanvuePosts[0] && (
                                                <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span className="tag">Views: {detailFanvuePosts[0].views || 0}</span>
                                                    <span className="tag">Likes: {detailFanvuePosts[0].likes || 0}</span>
                                                    <span className="tag">Comments: {detailFanvuePosts[0].comments || 0}</span>
                                                    <span className="tag">Revenue: ${detailFanvuePosts[0].revenue || 0}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {detailTab === 'overview' && (
                                    <div style={{ marginTop: '12px', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setShowFanvueHistory(!showFanvueHistory)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800 }}>Fanvue History {detailFanvuePosts.length > 0 ? `(${detailFanvuePosts.length})` : ''}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', transform: showFanvueHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</div>
                                            </div>
                                            <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); syncFanvueMetrics(); }} disabled={syncingMetrics || !detailFanvuePosts.length}>
                                                {syncingMetrics ? 'Syncing...' : 'Sync all'}
                                            </button>
                                        </div>
                                        {showFanvueHistory && (
                                            <>
                                                {detailFanvuePosts.length ? (
                                                    <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                                                        {detailFanvuePosts.map((post) => (
                                                            <div key={post.id} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: isWideLayout ? 'nowrap' : 'wrap' }}>
                                                                {post.mediaUrl ? (
                                                                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundImage: `url(${post.mediaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--card-border)', flexShrink: 0 }} />
                                                                ) : (
                                                                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0, textAlign: 'center', lineHeight: 1.2 }}>No<br />media</div>
                                                                )}
                                                                <div style={{ flex: 1, display: 'grid', gap: '6px', minWidth: 'min-content' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'capitalize', color: post.status === 'published' ? '#4ade80' : 'var(--text-main)' }}>{post.status || 'published'}</span>
                                                                        {post.postUrl && (
                                                                            <a href={post.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-accent)' }}>↗ Open post</a>
                                                                        )}
                                                                        {post.caption && (
                                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{post.caption}"</span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>👁️ {post.views || 0}</span>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>❤️ {post.likes || 0}</span>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>💬 {post.comments || 0}</span>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700 }}>💵 ${post.revenue || 0}</span>
                                                                        <span style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '10px' }}>
                                                                            {post.lastSyncAt ? `Synced: ${new Date(post.lastSyncAt).toLocaleDateString()} ${new Date(post.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: isWideLayout ? 'flex-end' : 'flex-start' }}>
                                                                    <button className="ghost-btn" style={{ padding: '6px 12px' }} onClick={() => syncFanvuePost(post.id)} disabled={syncingPostId === post.id}>
                                                                        {syncingPostId === post.id ? 'Syncing...' : 'Sync'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        No Fanvue posts yet. Publish a content item to create history.
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {detailTab === 'content' && (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Filters</span>
                                            {(['all', 'approved', 'generated'] as const).map((value) => (
                                                <button
                                                    key={value}
                                                    className={contentStatusFilter === value ? 'gradient-btn' : 'ghost-btn'}
                                                    style={{ width: 'auto', padding: '6px 10px', fontSize: '10px' }}
                                                    onClick={() => setContentStatusFilter(value)}
                                                >
                                                    {value[0].toUpperCase() + value.slice(1)}
                                                </button>
                                            ))}
                                            <select
                                                className="dark-select"
                                                value={contentPlatformFilter}
                                                onChange={(e) => setContentPlatformFilter(e.target.value as typeof contentPlatformFilter)}
                                                style={{ width: 'auto', minWidth: '140px' }}
                                            >
                                                <option value="all">All platforms</option>
                                                {contentPlatforms.map((platform) => (
                                                    <option key={platform} value={platform}>
                                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filteredContent.length} item(s)</span>
                                            <button className="ghost-btn" onClick={() => runAutoPublish(undefined, true)} disabled={runningAutopublish}>
                                                {runningAutopublish ? 'Checking...' : 'Dry run'}
                                            </button>
                                            <button className="ghost-btn" onClick={() => runAutoPublish()} disabled={runningAutopublish}>
                                                {runningAutopublish ? 'Running auto publish...' : 'Run Auto Publish'}
                                            </button>
                                        </div>
                                        {autopublishReport && (
                                            <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 800 }}>Auto Publish Report</div>
                                                    <button className="ghost-btn" onClick={() => setAutopublishReport(null)}>Clear</button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                                    <span className="tag">Scanned {autopublishReport.scanned}</span>
                                                    <span className="tag">Eligible {autopublishReport.eligible}</span>
                                                    <span className="tag">Published {autopublishReport.published}</span>
                                                    <span className="tag">Skipped {autopublishReport.skipped}</span>
                                                    <span className="tag">Failed {autopublishReport.failed}</span>
                                                </div>
                                                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {autopublishReport.message}
                                                </div>
                                                {autopublishReport.items.length > 0 && (
                                                    <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                                                        {autopublishReport.items.slice(0, 5).map((item, index) => (
                                                            <div key={`${item.content_record_id || 'content'}-${index}`} style={{ padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: 700 }}>
                                                                    {item.content_record_id || 'Content item'} · {item.status || 'unknown'}
                                                                </div>
                                                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    {item.reason || item.error || 'No detail returned.'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {contentEditorItem && (
                                            <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.28)', background: 'rgba(59,130,246,0.06)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: 800 }}>Content Media Editor</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            Manage carousel order for <strong>{contentEditorItem.name || 'Content item'}</strong> without leaving the Library.
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button className="ghost-btn" onClick={() => seedContentMediaFromContent(contentEditorItem)} disabled={!!contentEditorMedia.length}>
                                                            Seed from content URL
                                                        </button>
                                                        <button className="ghost-btn" onClick={() => setEditingContentId('')}>
                                                            Close editor
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                                                    {contentEditorMedia.length ? contentEditorMedia.map((media, index) => (
                                                        <div
                                                            key={media.id}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: '56px minmax(0, 1fr) auto',
                                                                gap: '10px',
                                                                alignItems: 'center',
                                                                padding: '10px 12px',
                                                                borderRadius: '12px',
                                                                border: '1px solid var(--card-border)',
                                                                background: 'rgba(255,255,255,0.03)'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    height: '56px',
                                                                    borderRadius: '10px',
                                                                    background: `center / cover no-repeat url(${media.storageUrl || media.mediaUrl || contentEditorItem.mediaUrl || ''})`,
                                                                    backgroundColor: 'rgba(255,255,255,0.05)'
                                                                }}
                                                            />
                                                            <div>
                                                                <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                                                    #{media.order || index + 1} · {media.name || `Media ${index + 1}`}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all' }}>
                                                                    {media.storageUrl || media.mediaUrl || 'No URL'}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                <button className="ghost-btn" onClick={() => moveContentMedia(media.id, -1)} disabled={index === 0}>↑</button>
                                                                <button className="ghost-btn" onClick={() => moveContentMedia(media.id, 1)} disabled={index === contentEditorMedia.length - 1}>↓</button>
                                                                <button className="ghost-btn" onClick={() => deleteContentMedia(media.id)}>Delete</button>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            No extra media yet. Use “Seed from content URL” for the first item, or add public URLs below.
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: isWideLayout ? 'minmax(0, 1fr) minmax(220px, 240px) 140px auto' : '1fr', gap: '10px', marginTop: '12px' }}>
                                                    <input
                                                        type="text"
                                                        className="dark-input"
                                                        placeholder="Public media URL (Cloudinary/S3)"
                                                        value={contentMediaDraft.storageUrl}
                                                        onChange={(e) => {
                                                            const nextValue = e.currentTarget.value;
                                                            setContentMediaDraft((prev) => ({ ...prev, storageUrl: nextValue }));
                                                        }}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="dark-input"
                                                        placeholder="Label (optional)"
                                                        value={contentMediaDraft.name}
                                                        onChange={(e) => {
                                                            const nextValue = e.currentTarget.value;
                                                            setContentMediaDraft((prev) => ({ ...prev, name: nextValue }));
                                                        }}
                                                    />
                                                    <select
                                                        className="dark-select"
                                                        value={contentMediaDraft.mediaType}
                                                        onChange={(e) => {
                                                            const nextValue = e.currentTarget.value as 'image' | 'video';
                                                            setContentMediaDraft((prev) => ({ ...prev, mediaType: nextValue }));
                                                        }}
                                                    >
                                                        <option value="image">Image</option>
                                                        <option value="video">Video</option>
                                                    </select>
                                                    <button className="gradient-btn" onClick={saveContentMediaDraft}>
                                                        Add media
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                            {filteredContent.length ? filteredContent.map((item) => (
                                                <div key={item.id} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                                                    <div style={{ height: '140px', background: item.mediaUrl ? `center / cover no-repeat url(${item.mediaUrl})` : 'rgba(255,255,255,0.04)' }} />
                                                    <div style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.name || 'Content'}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.type || 'media'} · {item.platform || 'no platform'}</div>
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span className="tag">{item.status || 'Generated'}</span>
                                                            {item.approved && <span className="tag fast">Approved</span>}
                                                            {!item.storageUrl && <span className="tag" style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#FBBF24' }}>No Storage URL</span>}
                                                            {contentMedia.filter((media) => media.contentIds.includes(item.id)).length > 1 && (
                                                                <span className="tag" style={{ borderColor: 'rgba(59,130,246,0.35)', color: '#60A5FA' }}>
                                                                    Carousel {contentMedia.filter((media) => media.contentIds.includes(item.id)).length}
                                                                </span>
                                                            )}
                                                            <span className="tag" style={{ borderColor: selectedProfile?.fanvueCreatorUuid ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)', color: selectedProfile?.fanvueCreatorUuid ? '#22C55E' : '#F59E0B' }}>
                                                                {selectedProfile?.fanvueCreatorUuid ? 'Creator-scoped ready' : 'Generic publish'}
                                                            </span>
                                                                         <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                             <button className="ghost-btn" onClick={() => publishToFanvue(item)} disabled={!(item.storageUrl || item.mediaUrl) || publishingId === item.id}>
                                                                {publishingId === item.id ? 'Sending...' : 'Send to Fanvue'}
                                                            </button>
                                                            <button
                                                                onClick={() => postToThreads(item)}
                                                                disabled={!(item.storageUrl || item.mediaUrl) || postingToThreadsId === item.id}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(139,92,246,0.4)',
                                                                    background: postingToThreadsId === item.id ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
                                                                    color: '#A78BFA',
                                                                    fontWeight: 700,
                                                                    fontSize: '11px',
                                                                    cursor: (!(item.storageUrl || item.mediaUrl) || postingToThreadsId === item.id) ? 'not-allowed' : 'pointer',
                                                                    opacity: !(item.storageUrl || item.mediaUrl) ? 0.4 : 1,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {postingToThreadsId === item.id ? '⏳ Queuing...' : '🧵 Post to Threads'}
                                                            </button>
                                                            <button className="ghost-btn" onClick={() => runAutoPublish(item.id, true)} disabled={runningAutopublish}>
                                                                {runningAutopublish ? 'Checking...' : 'Why skipped?'}
                                                            </button>
                                                            <button className="ghost-btn" onClick={() => runAutoPublish(item.id)} disabled={runningAutopublish}>
                                                                {runningAutopublish ? 'Running...' : 'Auto Publish'}
                                                            </button>
                                                            <button
                                                                className="ghost-btn"
                                                                onClick={() => setEditingContentId((current) => current === item.id ? '' : item.id)}
                                                            >
                                                                {editingContentId === item.id ? 'Hide media' : 'Edit media'}
                                                            </button>
                                                        </div>                                         </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No content linked to this influencer yet.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'videos' && (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Videos</span>
                                            <span className="tag">{videoContent.length} total</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                            {videoContent.length ? videoContent.map((item) => (
                                                <div key={item.id} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                                                    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.mediaUrl ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                                                        {item.mediaUrl ? 'Video ready' : 'No preview'}
                                                    </div>
                                                    <div style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.name || 'Video'}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.platform || 'no platform'} · {item.provider || 'provider n/a'}</div>
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span className="tag">{item.status || 'Generated'}</span>
                                                            {item.approved && <span className="tag fast">Approved</span>}
                                                            {!item.storageUrl && <span className="tag" style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#FBBF24' }}>No Storage URL</span>}
                                                        </div>
                                                        {item.mediaUrl && (
                                                            <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="ghost-btn" style={{ marginTop: '10px', display: 'inline-flex', textDecoration: 'none' }}>
                                                                Open video
                                                            </a>
                                                        )}
                                                        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                            <button className="ghost-btn" onClick={() => publishToFanvue(item)} disabled={!(item.storageUrl || item.mediaUrl) || publishingId === item.id}>
                                                                {publishingId === item.id ? 'Sending...' : 'Send to Fanvue'}
                                                            </button>
                                                            <button
                                                                onClick={() => postToThreads(item)}
                                                                disabled={!(item.storageUrl || item.mediaUrl) || postingToThreadsId === item.id}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(139,92,246,0.4)',
                                                                    background: postingToThreadsId === item.id ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
                                                                    color: '#A78BFA',
                                                                    fontWeight: 700,
                                                                    fontSize: '11px',
                                                                    cursor: (!(item.storageUrl || item.mediaUrl) || postingToThreadsId === item.id) ? 'not-allowed' : 'pointer',
                                                                    opacity: !(item.storageUrl || item.mediaUrl) ? 0.4 : 1,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {postingToThreadsId === item.id ? '⏳ Queuing...' : '🧵 Post to Threads'}
                                                            </button>
                                                            <button className="ghost-btn" onClick={() => runAutoPublish(item.id, true)} disabled={runningAutopublish}>
                                                                {runningAutopublish ? 'Checking...' : 'Why skipped?'}
                                                            </button>
                                                            <button className="ghost-btn" onClick={() => runAutoPublish(item.id)} disabled={runningAutopublish}>
                                                                {runningAutopublish ? 'Running...' : 'Auto Publish'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No videos linked to this influencer yet.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'assets' && (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {detailAssets.length ? detailAssets.map((asset) => (
                                            <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '14px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '12px' }}>{asset.name || 'Asset'}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {asset.type || 'asset'} {asset.provider ? `· ${asset.provider}` : ''} {asset.trigger ? `· ${asset.trigger}` : ''}
                                                    </div>
                                                </div>
                                                {asset.fileUrl && (
                                                    <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="ghost-btn" style={{ textDecoration: 'none' }}>
                                                        Open
                                                    </a>
                                                )}
                                            </div>
                                        )) : (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No linked assets yet.</div>
                                        )}
                                    </div>
                                )}

                                {detailTab === 'jobs' && (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {detailJobs.length ? detailJobs.map((job) => (
                                            <div key={job.id} style={{ padding: '12px', borderRadius: '14px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '12px' }}>{job.status || 'Unknown'}</div>
                                                    <span className="tag">{job.outputType || 'image'}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                    {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'No date'} {job.cost ? `· $${job.cost}` : ''}
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No jobs for this influencer yet.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {visibleProfiles.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>+</div>
                    <div style={{ color: '#e4e4e7', fontWeight: 600 }}>No profiles found in Airtable</div>
                    <div style={{ color: '#71717a', fontSize: '12px', marginTop: '8px' }}>
                        Start in Creator Wizard to make your first influencer.
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                        <button className="gradient-btn" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => onOpenCreator?.()}>
                            Open Creator Wizard
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className="model-grid"
                    style={viewMode === 'grid'
                        ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }
                        : { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }
                    }
                >
                    {visibleProfiles.map((profile) => {
                        const influencerJobs = getInfluencerJobs(profile.id);
                        const influencerAssets = getInfluencerAssets(profile.id);
                        const influencerContent = getInfluencerContent(profile);
                        const isSelected = selectedProfile?.id === profile.id;
                        return (
                            <div
                                key={profile.id}
                                className="model-card"
                                onClick={() => {
                                    setSelectedProfileId(profile.id);
                                    setDetailTab('overview');
                                }}
                                style={{
                                    cursor: 'pointer',
                                    border: isSelected ? '1px solid var(--primary)' : undefined,
                                    boxShadow: isSelected ? '0 0 0 1px rgba(59,130,246,0.25)' : undefined,
                                    ...(viewMode === 'list'
                                        ? { display: 'grid', gridTemplateColumns: '96px 1fr', gap: '12px', alignItems: 'center', padding: '12px' }
                                        : {})
                                }}
                            >
                                <div className="model-card-image" style={{
                                    backgroundImage: `url(${profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    height: viewMode === 'list' ? '96px' : '160px',
                                    borderRadius: '12px',
                                    position: 'relative'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(profile.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => toggleSelectProfile(profile.id)}
                                        style={{ position: 'absolute', top: '10px', left: '10px' }}
                                    />
                                </div>
                                <div className="model-card-content">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                        <div className="model-card-title">{profile.name}</div>
                                        <div className="tag premium">{profile.niche}</div>
                                    </div>
                                    <div className="model-card-desc">
                                        {profile.age} years · {profile.gender} · {profile.style}
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Status: {profile.status || 'Active'} · {profile.approved ? 'Approved' : 'Not approved'}
                                    </div>
                                    <div className="generation-info" style={{ background: 'rgba(255,255,255,0.03)', marginTop: '8px' }}>
                                        <div className="info-item">
                                            <span>Content: {influencerContent.length}</span>
                                        </div>
                                        <div className="info-item">
                                            <span>Assets: {influencerAssets.length}</span>
                                        </div>
                                        <div className="info-item">
                                            <span>{profile.mainCharacterLora ? 'LoRA Active' : 'No LoRA'}</span>
                                        </div>
                                    </div>
                                    {influencerJobs[0] && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                            Last job: {influencerJobs[0].status || 'unknown'} {influencerJobs[0].outputType ? `(${influencerJobs[0].outputType})` : ''}
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); toggleApproved(profile); }}>
                                            {profile.approved ? 'Unapprove' : 'Approve'}
                                        </button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); startEdit(profile); }}>
                                            Edit
                                        </button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); toggleArchive(profile); }}>
                                            {profile.status === 'Archived' ? 'Restore' : 'Archive'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                        <button className="gradient-btn" style={{ width: '100%', padding: '8px 10px', fontSize: '11px' }} onClick={(e) => { e.stopPropagation(); openProfileWorkspace(profile); }}>
                                            Open Workspace
                                        </button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); onOpenStudio?.(profile); }}>
                                            Open Studio
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


