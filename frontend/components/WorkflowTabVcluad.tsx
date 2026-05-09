/**
 * WorkflowTabFinal.tsx — Neural Engine · Fixed Edge Routing
 *
 * Fixes connexions :
 *   ✅ portY() calcule la position réelle (header + image + params)
 *   ✅ Bézier intelligent : gère les edges "backwards" (cible à gauche)
 *   ✅ Routage orthogonal pour les retours en arrière
 *   ✅ Edges parallèles (même source→cible) décalés verticalement
 *   ✅ Tension adaptative selon distance horizontale
 *   ✅ Validation types ports (type-safe connections)
 *   ✅ Glow sur ports compatibles pendant connexion
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import { BackendService } from '../services/backend';
import { useWorkflowStore } from '../store/workflowStore';
import { PromptEditor } from './PromptEditor';
import neuralNodesData from '../data/neural_nodes.json';

// ─── Theme ────────────────────────────────────────────────────────────────────
// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
    { id: 'iphone-selfie', label: '🤳 Selfie', tags: 'iPhone selfie, handheld, close-up, natural light, candid' },
    { id: 'studio-shot', label: '📸 Studio', tags: 'professional studio lighting, clean background, 8k, sharp focus' },
    { id: 'cinematic', label: '🎬 Cine', tags: 'cinematic lighting, anamorphic lens, dramatic shadows, movie still' },
    { id: 'vintage', label: '🎞️ Vintage', tags: '35mm film, grainy, Kodak Portra 400, nostalgic aesthetic' },
    { id: 'lifestyle', label: '🏡 Life', tags: 'lifestyle photography, natural setting, candid moment, soft sunlight' },
];

const ACCENT = '#E0F81C';
const PURPLE = '#9B2BFF';
const BG_DARK = '#09090b';
const SIDE_BG = '#111114';
const NODE_BG = '#1c1c20';
const NODE_HEAD = '#27272a';
const GB = 'rgba(255,255,255,0.07)';
const TEXT_SOFT = '#71717a';
const NODE_W = 280;
const PORT_R = 7;
const PORT_GAP = 28;
const HEAD_H = 44;   // px — header height (incl. color bar)
const IMG_H = 170;  // px — image preview height (16/10 ratio on 280px width)
const PARAM_H = 52;   // px — per parameter row height

// Colors per data type
const TYPE_COLOR: Record<string, string> = {
    image: ACCENT,
    video: '#FF3366',
    audio: '#4ECDC4',
    text: PURPLE,
    string: PURPLE,
    model: '#f59e0b',
    any: '#a1a1aa',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface NeuralNodeDef {
    id: string; name: string; type: string;
    category: string; color: string; description: string | null;
    schema: { inputs: Record<string, any>; outputs: Record<string, any>; parameters: any[] };
    isModel: boolean;
}
interface WFNode {
    id: string; x: number; y: number;
    data: {
        title: string; neuralType?: string; color?: string;
        imageUrl?: string; status?: 'idle' | 'running' | 'done' | 'error';
        params?: Record<string, any>;
        schema?: { inputs: Record<string, any>; outputs: Record<string, any>; parameters: any[] };
        validationErrors?: Record<string, string>;
    };
}
interface WFEdge {
    id: string; sourceId: string; sourceHandle: string;
    targetId: string; targetHandle: string; dataType?: string;
}
interface Connecting {
    sourceId: string; handleId: string; handleIdx: number;
    sourceType: string; mx: number; my: number;
}

// ─── Bridge Definition ────────────────────────────────────────────────────────
const BRIDGE_DEF: NeuralNodeDef = {
    id: 'custom_bridge',
    name: 'Custom Bridge',
    type: 'custom_bridge',
    category: 'Neural Engine',
    color: '#9B2BFF',
    description: 'Execute custom API connector (ComfyUI, Ollama, etc.)',
    schema: {
        inputs: {
            input: { type: 'any', label: 'Input' }
        },
        outputs: {
            output: { type: 'any', label: 'Output' }
        },
        parameters: [
            { id: 'bridgeId', type: 'string', label: 'Bridge ID', default: '' },
            { id: 'bridgeName', type: 'string', label: 'Bridge Name', default: '' },
            { id: 'prompt', type: 'prompt', label: 'Prompt', default: '{{prompt}}' }
        ]
    },
    isModel: false
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nodeData = Array.isArray(neuralNodesData) ? (neuralNodesData as NeuralNodeDef[]) : [];
const findDef = (type: string) => nodeData.find(n => n.type === type) || null;

/**
 * Calcule la position Y RÉELLE d'un port sur le canvas.
 *
 * Structure visuelle d'un nœud :
 *   [3px color bar] + [HEAD_H-3 header] = HEAD_H total
 *   [image preview - only if imageUrl or isImgNode]
 *   [param rows]
 *   [ports are positioned at HEAD_H offset from top via CSS]
 *
 * Les ports sont positionnés via CSS absolu à top: HEAD_H + idx*PORT_GAP
 * donc la position canvas = node.y + HEAD_H + idx*PORT_GAP + PORT_R (centré)
 */
function portY(node: WFNode, idx: number): number {
    return node.y + HEAD_H + PORT_R + idx * PORT_GAP;
}

/**
 * Calcule le SVG path pour un edge.
 *
 * Stratégie de routage :
 * - Forward (source.x < target.x) : Bézier cubique horizontal classique
 * - Backward (source.x > target.x) : Route orthogonale avec contournement
 *   pour éviter de traverser les nœuds
 */
function routeEdge(
    x1: number, y1: number,
    x2: number, y2: number,
    parallelOffset = 0  // décalage vertical pour edges parallèles
): string {
    const Y1 = y1 + parallelOffset;
    const Y2 = y2 + parallelOffset;
    const dx = x2 - x1;

    if (dx >= 60) {
        // ── Forward edge : Bézier standard ──────────────────────────────────────
        // Tension adaptative : plus forte si nœuds proches, douce si éloignés
        const tension = Math.min(Math.max(dx * 0.45, 80), 280);
        return `M ${x1},${Y1} C ${x1 + tension},${Y1} ${x2 - tension},${Y2} ${x2},${Y2}`;
    } else {
        // ── Backward edge : contournement par le bas ────────────────────────────
        // Descend sous les deux nœuds, traverse horizontalement, remonte
        // Le décalage vertical dépend de l'index pour éviter les superpositions
        const DROP = 60 + Math.abs(parallelOffset) + 20;  // descend de DROP px sous les ports
        const radius = 14;  // rayon des coins arrondis
        const midX = (x1 + x2) / 2;
        const loopY = Math.max(Y1, Y2) + DROP;

        // Chemin : source → droite → coin → bas → coin → traverse → coin → bas → coin → cible
        return [
            `M ${x1},${Y1}`,
            `L ${x1 + 40},${Y1}`,
            `Q ${x1 + 40 + radius},${Y1} ${x1 + 40 + radius},${Y1 + radius}`,
            `L ${x1 + 40 + radius},${loopY - radius}`,
            `Q ${x1 + 40 + radius},${loopY} ${x1 + 40},${loopY}`,
            `L ${x2 - 40},${loopY}`,
            `Q ${x2 - 40 - radius},${loopY} ${x2 - 40 - radius},${loopY - radius}`,
            `L ${x2 - 40 - radius},${Y2 + radius}`,
            `Q ${x2 - 40 - radius},${Y2} ${x2 - 40},${Y2}`,
            `L ${x2},${Y2}`,
        ].join(' ');
    }
}

// ─── Port component ───────────────────────────────────────────────────────────
interface PortProps {
    id: string; label: string; side: 'input' | 'output'; idx: number;
    nodeId: string; portType: string;
    isCompatible: boolean; isActive: boolean;
    onOutputDown: (hid: string, hType: string, idx: number, e: React.PointerEvent) => void;
    onInputUp: (nid: string, hid: string, e: React.PointerEvent) => void;
    onInputLeave: () => void;
    onOutputEnter: (nid: string, hid: string, rect: DOMRect) => void;
    onOutputLeave: () => void;
}

function Port({ id, label, side, idx, nodeId, portType, isCompatible, isActive, onOutputDown, onInputUp, onInputEnter, onInputLeave, onOutputEnter, onOutputLeave }: PortProps) {
    const isOut = side === 'output';
    const color = TYPE_COLOR[portType] || (isOut ? ACCENT : PURPLE);
    const glowing = isCompatible || isActive;

    return (
        <div
            title={`${label} · ${portType}`}
            onPointerDown={isOut ? e => { e.stopPropagation(); onOutputDown(id, portType, idx, e); } : undefined}
            onPointerUp={!isOut ? e => { e.stopPropagation(); onInputUp(nodeId, id, e); } : undefined}
            onPointerEnter={e => {
                if (!isOut) onInputEnter(nodeId, id, idx);
                else onOutputEnter(nodeId, id, (e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
            onPointerLeave={!isOut ? () => onInputLeave() : () => onOutputLeave()}
            style={{
                position: 'absolute',
                [isOut ? 'right' : 'left']: -(PORT_R + 1),
                top: HEAD_H + idx * PORT_GAP,
                width: PORT_R * 2, height: PORT_R * 2, borderRadius: '50%',
                background: glowing ? color : `${color}44`,
                border: `2px solid ${glowing ? color : `${color}66`}`,
                cursor: isOut ? 'crosshair' : (isCompatible ? 'cell' : 'default'),
                zIndex: 20,
                transition: 'all 0.18s ease',
                transform: glowing ? 'scale(1.4)' : 'scale(1)',
                boxShadow: glowing ? `0 0 10px ${color}cc, 0 0 20px ${color}55` : 'none',
            }}
        />
    );
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────
interface NodeCardProps {
    node: WFNode; selected: boolean;
    connecting: Connecting | null;
    onHeaderDown: (e: React.PointerEvent) => void;
    onDelete: () => void;
    onParamChange: (key: string, val: any) => void;
    onOutputDown: (hid: string, hType: string, idx: number, e: React.PointerEvent) => void;
    onInputUp: (nid: string, hid: string, e: React.PointerEvent) => void;
    onInputEnter: (nid: string, hid: string, idx: number) => void;
    onInputLeave: () => void;
}

// ─── Media Drag & Drop Input ──────────────────────────────────────────────────

function MediaInput({ url, onFileDrop, accent, type = 'image', params, onParamChange, loading = false }: any) {
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [showTrim, setShowTrim] = useState(false);
    const isVideo = type === 'video' || (url && url.match(/\.(mp4|webm|mov|ogg)$/i));
    
    const startTime = params?.startTime || 0;
    const endTime = params?.endTime || 10;

    return (
        <div
            onPointerDown={e => e.stopPropagation()}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => { setHovering(false); if (!showTrim) setShowTrim(false); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); if (e.dataTransfer.files[0]) onFileDrop(e.dataTransfer.files[0]); }}
            style={{
                position: 'relative', width: '100%', aspectRatio: '16/10',
                background: dragging ? `${accent}15` : '#0a0a0c',
                borderRadius: 10, overflow: 'hidden', border: `1px dashed ${dragging ? accent : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', zIndex: 50
            }}
            onClick={e => {
                if (showTrim) return;
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*';
                input.onchange = (e: any) => { if (e.target.files[0]) onFileDrop(e.target.files[0]); };
                input.click();
            }}
        >
            {url ? (
                <>
                    {isVideo ? (
                        <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted />
                    ) : (
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    )}
                    
                    {/* Hover Overlay */}
                    {hovering && isVideo && !showTrim && (
                        <button 
                            onClick={e => { e.stopPropagation(); setShowTrim(true); }}
                            style={{
                                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4
                            }}
                        >
                            ✂️ TRIM
                        </button>
                    )}

                    {/* Trim Controls */}
                    {showTrim && (
                        <div 
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)',
                                backdropFilter: 'blur(8px)', padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', flexDirection: 'column', gap: 6, zIndex: 60
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 8, fontWeight: 900, color: accent }}>TRIM VIDEO</span>
                                <button onClick={() => setShowTrim(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 10 }}>×</button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>START: {startTime}s</span>
                                        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>END: {endTime}s</span>
                                    </div>
                                    <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                        <div style={{ position: 'absolute', left: `${(startTime / 30) * 100}%`, right: `${100 - (endTime / 30) * 100}%`, height: '100%', background: accent, borderRadius: 2 }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <input type="number" value={startTime} onChange={e => onParamChange('startTime', parseFloat(e.target.value))} 
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 9, padding: '2px 4px' }} />
                                <input type="number" value={endTime} onChange={e => onParamChange('endTime', parseFloat(e.target.value))} 
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 9, padding: '2px 4px' }} />
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 20 }}>{loading ? '⏳' : '🌌'}</div>
                    <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {loading ? 'Uploading...' : 'Drop Media'}
                    </span>
                </div>
            )}
            {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
                    <div style={{ width: 24, height: 24, border: `2px solid ${accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
            )}
            {dragging && (
                <div style={{ position: 'absolute', inset: 0, background: `${accent}22`, border: `2px solid ${accent}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: accent }}>RELEASE TO UPLOAD</span>
                </div>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function NodeCard({ node, allNodes, selected, connecting, onHeaderDown, onDelete, onParamChange, onOutputDown, onInputUp, onInputEnter, onInputLeave, onOutputEnter, onOutputLeave, onFocusNode, onRunNode, selectedIds, backendService }: any) {
    const [isUploading, setIsUploading] = useState(false);
    const schema = node.data.schema;
    const inputs = schema ? Object.entries(schema.inputs) : [];
    const outputs = schema ? Object.entries(schema.outputs) : [];
    const params = schema?.parameters || [];
    const color = node.data.color || ACCENT;

    const statusColor: Record<string, string> = { running: ACCENT, done: '#4ade80', error: '#f87171' };
    const isMediaType = !!(node.data.neuralType || '').match(/sd_|flux|magnific|kling|hailuo|luma|runway|pika|svd|gen2|gen3|video|image|inpaint|custom|seedance/i);
    const showMedia = node.data.imageUrl || (isMediaType && node.data.status === 'done');

    const isGrouped = selectedIds?.has(node.id) && !selected;
    const hasError = node.data.validationErrors && Object.keys(node.data.validationErrors).length > 0;
    const borderCol = hasError ? '#f87171' : (selected ? color : isGrouped ? '#9B2BFF' : 'rgba(255,255,255,0.09)');

    return (
        <div
            onPointerDown={onHeaderDown}
            style={{
                position: 'absolute', left: node.x, top: node.y, width: NODE_W,
                background: 'linear-gradient(160deg, #1e1e24 0%, #16161b 100%)',
                border: `1px solid ${borderCol}`,
                borderRadius: 14, overflow: 'visible',
                userSelect: 'none', cursor: 'grab',
                boxShadow: selected 
                    ? `0 0 0 2px ${hasError ? '#f8717144' : `${color}44`}, 0 8px 32px rgba(0,0,0,0.5)` 
                    : isGrouped 
                    ? '0 0 0 2px #9B2BFF44, 0 4px 16px rgba(0,0,0,0.35)'
                    : '0 4px 16px rgba(0,0,0,0.35)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                animation: node.data.status === 'running' ? 'pulse-border 1.5s infinite' : 'none'
            }}
        >
            <style>{`
                @keyframes pulse-border {
                    0% { box-shadow: 0 0 0 0px ${color}88; }
                    70% { box-shadow: 0 0 0 8px ${color}00; }
                    100% { box-shadow: 0 0 0 0px ${color}00; }
                }
            `}</style>
            {/* Color bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${PURPLE})`, borderRadius: '14px 14px 0 0' }} />

            {/* Header */}
            <div style={{ height: HEAD_H - 3, padding: '0 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                    {node.data.status && statusColor[node.data.status] && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[node.data.status!], flexShrink: 0, boxShadow: `0 0 6px ${statusColor[node.data.status!]}` }} />
                    )}
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {node.data.neuralType === 'custom_bridge' ? <span style={{fontSize: 10}}>🔗</span> : 
                         isMediaType ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> :
                         <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: 'block' }} />}
                    </div>
                    <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.data.title}</div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {node.data.neuralType === 'custom_bridge' ? (node.data.params?.bridgeName || 'Custom Bridge') : (node.data.neuralType || 'node')}
                            </div>
                        </div>
                        {schema?.description && (
                            <div title={schema.description} style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', fontWeight: 900, flexShrink: 0 }}>i</div>
                        )}
                    </div>
                </div>
                <button onPointerDown={e => e.stopPropagation()} onClick={onDelete}
                    style={{ width: 20, height: 20, borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {/* Media preview / Media Drop */}
            {isMediaType && (
                <div style={{ padding: '4px 11px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <MediaInput 
                        url={node.data.imageUrl} 
                        accent={color} 
                        params={node.data.params}
                        onParamChange={onParamChange}
                        loading={isUploading}
                        type={(node.data.params?.mediaType || node.data.neuralType || '').toLowerCase().includes('video') ? 'video' : 'image'}
                        onFileDrop={async (file: File) => {
                            try {
                                setIsUploading(true);
                                console.log('Uploading file:', file.name, file.type);
                                
                                // Local preview first for speed
                                const localUrl = URL.createObjectURL(file);
                                onParamChange('imageUrl', localUrl);
                                
                                // Actual backend upload
                                const remoteUrl = await backendService.uploadMedia(file);
                                console.log('Upload success:', remoteUrl);
                                
                                // Update with permanent URL
                                onParamChange('imageUrl', remoteUrl);
                                
                                if (file.type.startsWith('video/')) {
                                    onParamChange('mediaType', 'video');
                                } else {
                                    onParamChange('mediaType', 'image');
                                }
                            } catch (err) {
                                console.error('Upload failed:', err);
                                alert('Upload failed. Please check your connection.');
                            } finally {
                                setIsUploading(false);
                            }
                        }}
                    />
                </div>
            )}

            {/* Params */}
            {params.length > 0 && (
                <div style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {params.map((p: any) => {
                        const key = p.id || p.name;
                        const val = node.data.params?.[key] ?? p.default;
                        return (
                            <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.label || p.name}</span>
                                    {(p.type === 'number' || p.type === 'integer' || p.type === 'input-number') && (
                                        <span style={{ fontSize: 10, color: color, fontWeight: 800 }}>{val}</span>
                                    )}
                                </div>
                                {(p.type === 'select' || p.type === 'enum') && (
                                    <select onPointerDown={e => e.stopPropagation()} value={val ?? ''} onChange={e => onParamChange(key, e.target.value)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 11, padding: '5px 9px', outline: 'none' }}>
                                        {(p.options || []).map((o: string) => <option key={o} value={o} style={{ background: SIDE_BG }}>{o}</option>)}
                                    </select>
                                )}
                                {(p.type === 'number' || p.type === 'integer' || p.type === 'input-number') && (
                                    <input type="range" min={p.min ?? 0} max={p.max ?? 100} step={p.step ?? 1} value={val ?? 0}
                                        onPointerDown={e => e.stopPropagation()} onChange={e => onParamChange(key, parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: color, cursor: 'pointer', height: 4 }} />
                                )}
                                {p.type === 'boolean' && (
                                    <label onPointerDown={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: 4 }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{p.label}</span>
                                        <div style={{ width: 32, height: 18, background: val ? color : 'rgba(255,255,255,0.1)', borderRadius: 10, position: 'relative', transition: 'background 0.2s', border: `1px solid ${val ? color : 'rgba(255,255,255,0.2)'}` }}>
                                            <div style={{ position: 'absolute', top: 1, left: val ? 15 : 1, width: 14, height: 14, background: val ? '#000' : '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                                        </div>
                                        <input type="checkbox" checked={!!val} onChange={e => onParamChange(key, e.target.checked)} style={{ display: 'none' }} />
                                    </label>
                                )}
                                {(p.type === 'string' || p.type === 'text' || p.type === 'prompt') && (
                                    <PromptEditor 
                                        value={val ?? ''} 
                                        onChange={(v: string) => onParamChange(key, v)}
                                        accent={color}
                                        placeholder={p.label || 'Enter prompt...'}
                                    />
                                )}
                                {p.type === 'seed' && (
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        <input type="number" value={val ?? -1} onPointerDown={e => e.stopPropagation()} onChange={e => onParamChange(key, parseInt(e.target.value))}
                                            style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 11, padding: '5px 9px', outline: 'none' }} />
                                        <button onPointerDown={e => e.stopPropagation()} onClick={() => onParamChange(key, Math.floor(Math.random() * 9999999))}
                                            style={{ background: `${color}20`, border: `1px solid ${color}44`, borderRadius: 7, color: color, padding: '0 10px', cursor: 'pointer', fontSize: 14 }}>⚄</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {params.length === 0 && !showMedia && (
                <div style={{ padding: '14px 11px', fontSize: 10, color: 'rgba(255,255,255,0.15)', textAlign: 'center', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {node.data.neuralType || 'No parameters'}
                </div>
            )}

            {/* Input ports */}
            {inputs.map(([id, inp]: any, idx: number) => {
                const compatible = connecting && connecting.sourceId !== node.id &&
                    (connecting.sourceType === inp.type || inp.type === 'any' || connecting.sourceType === 'any');
                return (
                    <Port key={`i-${id}`} id={id} label={inp.label} side="input" idx={idx} nodeId={node.id}
                        portType={inp.type} isCompatible={!!compatible} isActive={false}
                        onOutputDown={onOutputDown} onInputUp={onInputUp} onInputEnter={onInputEnter} onInputLeave={onInputLeave} />
                );
            })}

            {/* Output ports */}
            {outputs.map(([id, out]: any, idx: number) => (
                <Port key={`o-${id}`} id={id} label={out.label} side="output" idx={idx} nodeId={node.id}
                    portType={out.type} isCompatible={false}
                    isActive={connecting?.sourceId === node.id && connecting?.handleId === id}
                    onOutputDown={onOutputDown} onInputUp={onInputUp} 
                    onInputEnter={onInputEnter} onInputLeave={onInputLeave}
                    onOutputEnter={onOutputEnter} onOutputLeave={onOutputLeave} />
            ))}

            {/* Run Button (Node Level) */}
            <div style={{ padding: '10px 11px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                    onPointerDown={e => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRunNode(node.id); }}
                    disabled={node.data.status === 'running'}
                    style={{ 
                        width: '100%', height: 32, background: `${color}15`, color: color, 
                        border: `1px solid ${color}33`, borderRadius: 8, fontSize: 9, fontWeight: 900, 
                        cursor: node.data.status === 'running' ? 'wait' : 'pointer', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}25`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}15`; }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {node.data.status === 'running' ? 'Running...' : 'Run Model'}
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WorkflowTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtableService = useMemo(() => new AirtableService(base, globalConfig), []); // eslint-disable-line
    const backendService = useMemo(() => { const bs = new BackendService(); bs.setGlobalConfig(globalConfig); return bs; }, []); // eslint-disable-line

    const { 
        nodes, setNodes, edges, setEdges, 
        pan, setPan, zoom, setZoom, 
        selectedId, setSelectedId, updateNodeParam,
        initialize, validateAll 
    } = useWorkflowStore();

    const [search, setSearch] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [influencers, setInfluencers] = useState<InfluencerProfileRecord[]>([]);
    const [selectedInfluencerId, setSelectedInfluencerId] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'nodes' | 'templates' | 'bridges'>('nodes');
    const [savedBridges, setSavedBridges] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [connecting, setConnecting] = useState<Connecting | null>(null);
    const [hoveredInput, setHoveredInput] = useState<{ nodeId: string; handleId: string; idx: number } | null>(null);
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
    const [searchPos, setSearchPos] = useState<{ x: number; y: number } | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connecting | null>(null);
    const [hoveredOutput, setHoveredOutput] = useState<{ nodeId: string; handleId: string; rect: DOMRect } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const lassoStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
    const dragNode = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
    const isInitMount = useRef(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback((msg: string) => setLogs(p => [...p.slice(-49), `> ${msg}`]), []);

    // ── Load saved bridges from globalConfig (set by StorageTab) ────────────
    useEffect(() => {
        try {
            const raw = globalConfig.get('customApiConnectors') as any;
            const parsed: any[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
            setSavedBridges(parsed);
        } catch { setSavedBridges([]); }
    }, [globalConfig]); // eslint-disable-line

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const saved = globalConfig.get('wf_final_v2') as any;
                if (saved?.nodes?.length) {
                    const rebuilt = (saved.nodes as any[]).map((sn: any) => {
                        const def = findDef(sn.data?.neuralType || '');
                        return { ...sn, data: { ...sn.data, schema: def?.schema || sn.data?.schema || { inputs: {}, outputs: {}, parameters: [] }, params: { ...(def?.schema?.parameters?.reduce((a: any, p: any) => ({ ...a, [p.id]: p.default }), {}) || {}), ...(sn.data?.params || {}) }, status: 'idle' } };
                    });
                    initialize({ nodes: rebuilt, edges: Array.isArray(saved.edges) ? saved.edges : [] });
                    addLog('Workflow loaded.');
                }
            } catch (e) { console.error('Load failed', e); }

            try {
                addLog('Connexion au Neural Engine...');
                const p = await airtableService.getInfluencerProfiles();
                setInfluencers(p); 
                if (p.length) setSelectedInfluencerId(p[0].id);
                
                const r = await backendService.checkSubscriptionStatus();
                setCredits(r.creditsRemaining);
                if (r.isValid) addLog('✓ Neural Engine connecté.');
                else addLog('⚠ Mode limité (pas d\'abonnement).');
            } catch (err) {
                console.error('Initial check failed', err);
                addLog('⚠ Serveur en veille ou déconnecté. Prêt à l\'emploi.');
            }
        };
        
        init();
        isInitMount.current = false;
    }, []); // eslint-disable-line

    // ── Persist ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isInitMount.current) return;
        const t = setTimeout(() => {
            const slim = nodes.map(n => ({ id: n.id, x: n.x, y: n.y, data: { title: n.data.title, neuralType: n.data.neuralType, color: n.data.color, params: n.data.params, imageUrl: n.data.imageUrl } }));
            globalConfig.setAsync('wf_final_v2', { nodes: slim, edges }).catch(console.error);
        }, 1200);
        return () => clearTimeout(t);
    }, [nodes, edges]); // eslint-disable-line

    // ── Wheel zoom ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const el = canvasRef.current; if (!el) return;
        const h = (e: WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(2, Math.max(0.15, z - e.deltaY * 0.001))); };
        el.addEventListener('wheel', h, { passive: false });
        return () => el.removeEventListener('wheel', h);
    }, []);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !searchPos && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault(); setSearchPos({ x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 200 });
            }
            if (e.code === 'Escape') setSearchPos(null);
            
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || (document.activeElement as HTMLElement)?.isContentEditable;
            
            if ((e.code === 'Delete' || e.code === 'Backspace') && !isTyping) {
                if (selectedIds.size > 0) {
                    setNodes(p => p.filter(n => !selectedIds.has(n.id)));
                    setEdges(p => p.filter(edge => !selectedIds.has(edge.sourceId) && !selectedIds.has(edge.targetId)));
                    const count = selectedIds.size;
                    setSelectedIds(new Set());
                    setSelectedId(null);
                    addLog(`${count} nœud(s) supprimé(s).`);
                } else if (selectedId) {
                    setNodes(p => p.filter(n => n.id !== selectedId));
                    setEdges(p => p.filter(edge => edge.sourceId !== selectedId && edge.targetId !== selectedId));
                    setSelectedId(null);
                    addLog('Nœud supprimé.');
                }
            }
        };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [searchPos, selectedId, selectedIds, addLog]);

    // ── Global pointer up ─────────────────────────────────────────────────────
    useEffect(() => {
        const h = () => { if (connecting && !hoveredInput) setConnecting(null); };
        window.addEventListener('pointerup', h); return () => window.removeEventListener('pointerup', h);
    }, [connecting, hoveredInput]);

    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    // ── Canvas events ──────────────────────────────────────────────────────────
    const onCanvasDown = useCallback((e: React.PointerEvent) => {
        if (e.target !== canvasRef.current) return;
        setSelectedId(null); setConnecting(null); setSearchPos(null);
        if (e.shiftKey) {
            // Lasso mode
            lassoStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
            setLasso({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } else {
            setSelectedIds(new Set());
            panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    }, [pan]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (lassoStart.current) {
            const x = Math.min(e.clientX, lassoStart.current.mx);
            const y = Math.min(e.clientY, lassoStart.current.my);
            const w = Math.abs(e.clientX - lassoStart.current.mx);
            const h = Math.abs(e.clientY - lassoStart.current.my);
            setLasso({ x, y, w, h });
        } else if (panStart.current) {
            setPan({ x: panStart.current.px + (e.clientX - panStart.current.mx), y: panStart.current.py + (e.clientY - panStart.current.my) });
        } else if (dragNode.current) {
            const dx = (e.clientX - dragNode.current.mx) / zoom, dy = (e.clientY - dragNode.current.my) / zoom;
            if (selectedIds.size > 1 && selectedIds.has(dragNode.current.id)) {
                // Move all selected nodes together
                setNodes(p => p.map(n => selectedIds.has(n.id) ? { ...n, x: (n as any)._ox + dx, y: (n as any)._oy + dy } : n));
            } else {
                setNodes(p => p.map(n => n.id === dragNode.current!.id ? { ...n, x: dragNode.current!.ox + dx, y: dragNode.current!.oy + dy } : n));
            }
        } else if (connecting) {
            setConnecting(c => c ? { ...c, mx: e.clientX, my: e.clientY } : null);
        }
    }, [zoom, connecting, selectedIds]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (lassoStart.current && lasso && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            // Convert lasso screen coords to canvas coords
            const lx1 = (lasso.x - rect.left - pan.x) / zoom;
            const ly1 = (lasso.y - rect.top - pan.y) / zoom;
            const lx2 = lx1 + lasso.w / zoom;
            const ly2 = ly1 + lasso.h / zoom;
            const selected = new Set(nodes
                .filter(n => n.x < lx2 && n.x + NODE_W > lx1 && n.y < ly2 && n.y + 120 > ly1)
                .map(n => n.id)
            );
            setSelectedIds(selected);
            if (selected.size > 0) addLog(`${selected.size} nœud(s) sélectionné(s). Shift+drag pour déplacer.`);
            lassoStart.current = null;
            setLasso(null);
        } else {
            panStart.current = null;
            dragNode.current = null;
            if (connecting && !hoveredInput) {
                setPendingConnection(connecting);
                setSearchPos({ x: e.clientX, y: e.clientY });
            }
            setConnecting(null);
        }
    }, [connecting, hoveredInput, lasso, pan, zoom, nodes, addLog]);

    // ── Connection logic ───────────────────────────────────────────────────────
    const startConnect = useCallback((nodeId: string, hid: string, hType: string, hIdx: number, e: React.PointerEvent) => {
        e.stopPropagation();
        setConnecting({ sourceId: nodeId, handleId: hid, sourceType: hType, handleIdx: hIdx, mx: e.clientX, my: e.clientY });
    }, []);

    const finishConnect = useCallback((targetNodeId: string, targetHandleId: string, e: React.PointerEvent) => {
        e.stopPropagation();
        if (!connecting || connecting.sourceId === targetNodeId) { setConnecting(null); return; }
        const tgtNode = nodes.find(n => n.id === targetNodeId);
        const inpPort = tgtNode?.data.schema?.inputs[targetHandleId];
        if (!inpPort) { setConnecting(null); return; }
        const compatible = connecting.sourceType === inpPort.type || inpPort.type === 'any' || connecting.sourceType === 'any';
        if (!compatible) {
            addLog(`✗ Type incompatible : ${connecting.sourceType} → ${inpPort.type}`);
            setConnecting(null); return;
        }
        setEdges(prev => {
            if (prev.find(ed => ed.sourceId === connecting.sourceId && ed.sourceHandle === connecting.handleId && ed.targetId === targetNodeId && ed.targetHandle === targetHandleId)) return prev;
            addLog(`Connecté : ${connecting.handleId} → ${targetHandleId}`);
            return [...prev, { id: `e_${Date.now()}`, sourceId: connecting.sourceId, sourceHandle: connecting.handleId, targetId: targetNodeId, targetHandle: targetHandleId, dataType: connecting.sourceType }];
        });
        setConnecting(null); setHoveredInput(null);
    }, [connecting, nodes, addLog]); // eslint-disable-line

    // ── Node CRUD ──────────────────────────────────────────────────────────────
    const addNodeAt = useCallback((def: NeuralNodeDef, screenX?: number, screenY?: number, initialParams: Record<string, any> = {}) => {
        const params = {
            ...(def.schema.parameters || []).reduce((a: any, p: any) => ({ ...a, [p.id]: p.default }), {}),
            ...initialParams
        };
        const nx = screenX !== undefined ? (screenX - pan.x) / zoom : (420 - pan.x) / zoom;
        const ny = screenY !== undefined ? (screenY - pan.y) / zoom : (260 - pan.y) / zoom;
        const newNode = { id: `n_${Date.now()}`, x: nx, y: ny, data: { title: initialParams.bridgeName || def.name, neuralType: def.type, color: def.color || ACCENT, schema: def.schema as any, params, status: 'idle' } };
        setNodes(p => [...p, newNode]);
        setSelectedId(newNode.id);
        setSearchPos(null);

        // Auto-connect if we dragged an edge into the void
        if (pendingConnection) {
            const edgeId = `e_${Date.now()}`;
            const targetHandle = Object.keys(def.schema.inputs)[0]; 
            if (targetHandle) {
                setEdges(p => [...p, {
                    id: edgeId,
                    sourceId: pendingConnection.sourceId,
                    sourceHandle: pendingConnection.handleId,
                    targetId: newNode.id,
                    targetHandle: targetHandle,
                    dataType: pendingConnection.sourceType
                }]);
            }
            setPendingConnection(null);
        }
    }, [pan, zoom, pendingConnection]);

    const deleteNode = useCallback((id: string) => {
        setNodes(p => p.filter(n => n.id !== id));
        setEdges(p => p.filter(e => e.sourceId !== id && e.targetId !== id));
        if (selectedId === id) setSelectedId(null); addLog('Nœud supprimé.');
    }, [selectedId, addLog]);

    const deleteEdge = useCallback((id: string) => { setEdges(p => p.filter(e => e.id !== id)); addLog('Connexion supprimée.'); }, [addLog, setEdges]);

    // ── Templates ─────────────────────────────────────────────────────────────
    const applyTemplate = useCallback((id: string) => {
        const cx = (420 - pan.x) / zoom, cy = (180 - pan.y) / zoom;
        const t = Date.now();
        const TEMPLATES: Record<string, () => void> = {
            seedance: () => {
                const flux = findDef('flux_pro_1_1'), mag = findDef('magnific_upscale');
                if (!flux || !mag) { addLog('Nodes not found'); return; }
                const n1 = `n1_${t}`, n2 = `n2_${t}`, n3 = `n3_${t}`;
                setNodes(p => [...p,
                { id: n1, x: cx, y: cy, data: { title: 'Prompt', neuralType: 'prompt_input', color: '#6366f1', schema: { inputs: {}, outputs: { text: { type: 'text', label: 'Prompt' } }, parameters: [{ id: 'text', type: 'prompt', label: 'Prompt', default: 'Professional AI UGC, 8K, cinematic' }] }, params: { text: 'Professional AI UGC, 8K, cinematic' }, status: 'idle' } },
                { id: n2, x: cx + 330, y: cy, data: { title: 'Flux Pro 1.1', neuralType: flux.type, color: flux.color, schema: flux.schema as any, params: { prompt: '', aspectRatio: '9:16' }, status: 'idle' } },
                { id: n3, x: cx + 660, y: cy, data: { title: 'Magnific 4K', neuralType: mag.type, color: mag.color, schema: mag.schema as any, params: { mode: 'ultra', resolution: '4k', creativity: 50, resemblance: 70 }, status: 'idle' } },
                ]);
                setEdges(p => [...p,
                { id: `e1_${t}`, sourceId: n1, sourceHandle: 'text', targetId: n2, targetHandle: 'prompt', dataType: 'text' },
                { id: `e2_${t}`, sourceId: n2, sourceHandle: 'image', targetId: n3, targetHandle: 'image', dataType: 'image' },
                ]);
                addLog('Template Seedance AI UGC ajouté.');
            },
            kling: () => {
                const kling = findDef('magnific_kling_2_6'), omni = findDef('omnihuman_lipsync');
                if (!kling || !omni) { addLog('Nodes not found'); return; }
                const n1 = `n1_${t}`, n2 = `n2_${t}`, n3 = `n3_${t}`;
                setNodes(p => [...p,
                { id: n1, x: cx, y: cy, data: { title: 'Image Input', neuralType: 'image_input', color: '#ec4899', schema: { inputs: {}, outputs: { image: { type: 'image', label: 'Image' } }, parameters: [{ id: 'url', type: 'string', label: 'Image URL', default: '' }] }, params: { url: '' }, status: 'idle' } },
                { id: n2, x: cx + 330, y: cy, data: { title: 'Kling 2.6 Pro', neuralType: kling.type, color: kling.color, schema: kling.schema as any, params: { prompt: 'Cinematic movement, professional UGC', duration: 5 }, status: 'idle' } },
                { id: n3, x: cx + 660, y: cy, data: { title: 'OmniHuman', neuralType: omni.type, color: omni.color, schema: omni.schema as any, params: {}, status: 'idle' } },
                ]);
                setEdges(p => [...p,
                { id: `e1_${t}`, sourceId: n1, sourceHandle: 'image', targetId: n2, targetHandle: 'image', dataType: 'image' },
                { id: `e2_${t}`, sourceId: n2, sourceHandle: 'video', targetId: n3, targetHandle: 'image', dataType: 'video' },
                ]);
                addLog('Template Kling Lipsync UGC ajouté.');
            },
            veo: () => {
                const mystic = findDef('mystic_2_5'), veo = findDef('google_veo_3_1'), mag = findDef('magnific_upscale');
                if (!mystic || !veo || !mag) { addLog('Nodes not found'); return; }
                const n1 = `n1_${t}`, n2 = `n2_${t}`, n3 = `n3_${t}`;
                setNodes(p => [...p,
                { id: n1, x: cx, y: cy, data: { title: 'Mystic 2.5', neuralType: mystic.type, color: mystic.color, schema: mystic.schema as any, params: { prompt: 'Cinematic influencer portrait, 9:16', aspectRatio: '9:16' }, status: 'idle' } },
                { id: n2, x: cx + 330, y: cy, data: { title: 'Google Veo 3.1', neuralType: veo.type, color: veo.color, schema: veo.schema as any, params: { prompt: 'Walk forward, cinematic tracking', duration: 6 }, status: 'idle' } },
                { id: n3, x: cx + 660, y: cy, data: { title: 'Magnific Ultra', neuralType: mag.type, color: mag.color, schema: mag.schema as any, params: { mode: 'ultra', resolution: '4k' }, status: 'idle' } },
                ]);
                setEdges(p => [...p,
                { id: `e1_${t}`, sourceId: n1, sourceHandle: 'image', targetId: n2, targetHandle: 'image', dataType: 'image' },
                { id: `e2_${t}`, sourceId: n2, sourceHandle: 'video', targetId: n3, targetHandle: 'image', dataType: 'video' },
                ]);
                addLog('Template Veo Cinematic ajouté.');
            },
        };
        TEMPLATES[id]?.();
    }, [pan, zoom, addLog]); // eslint-disable-line

    // ── Tidy ─────────────────────────────────────────────────────────────────
    const tidyCanvas = useCallback(() => {
        const adj = new Map<string, string[]>(), ind = new Map<string, number>();
        nodes.forEach(n => { adj.set(n.id, []); ind.set(n.id, 0); });
        edges.forEach(e => { adj.get(e.sourceId)?.push(e.targetId); ind.set(e.targetId, (ind.get(e.targetId) || 0) + 1); });
        const queue = nodes.filter(n => (ind.get(n.id) || 0) === 0).map(n => n.id);
        const layers = new Map<string, number>(); let v = 0;
        while (queue.length) {
            const curr = queue.shift()!, layer = layers.get(curr) || 0; v++;
            (adj.get(curr) || []).forEach(nx => { layers.set(nx, Math.max(layers.get(nx) || 0, layer + 1)); const d = (ind.get(nx) || 0) - 1; ind.set(nx, d); if (d === 0) queue.push(nx); });
        }
        const colCount = new Map<number, number>();
        setNodes(p => p.map(n => { const col = layers.get(n.id) || 0, row = colCount.get(col) || 0; colCount.set(col, row + 1); return { ...n, x: 80 + col * 340, y: 80 + row * 300 }; }));
        addLog(v < nodes.length ? 'Cycle détecté — layout plat.' : 'Canvas ordonné.');
    }, [nodes, edges, addLog]);

    // ── Run ───────────────────────────────────────────────────────────────────
    const runWorkflow = useCallback(async (startNodeIdOrEvent?: any) => {
        if (isRunning || !nodes.length) return;
        
        let startNodeId: string | undefined = undefined;
        if (typeof startNodeIdOrEvent === 'string') {
            startNodeId = startNodeIdOrEvent;
        }

        // 🛡️ Skip validation for isolated single-node runs
        if (!startNodeId && !validateAll()) {
            addLog('✗ Échec de la validation : vérifiez les paramètres en rouge.');
            return;
        }

        setIsRunning(true);
        if (!startNodeId) {
            setNodes(p => p.map(n => ({ ...n, data: { ...n.data, status: 'idle', imageUrl: undefined } })));
            addLog('Démarrage workflow…');
        } else {
            setNodes(p => p.map(n => n.id === startNodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
            addLog(`▶ Exécution isolée : ${nodes.find(n => n.id === startNodeId)?.data.title}…`);
        }

        const adj = new Map<string, string[]>(), ind = new Map<string, number>();
        nodes.forEach(n => { adj.set(n.id, []); ind.set(n.id, 0); });
        edges.forEach(e => { adj.get(e.sourceId)?.push(e.targetId); ind.set(e.targetId, (ind.get(e.targetId) || 0) + 1); });
        
        const queue = nodes.filter(n => (ind.get(n.id) || 0) === 0).map(n => n.id), order: string[] = [];
        while (queue.length) { const c = queue.shift()!; order.push(c); (adj.get(c) || []).forEach(nx => { const d = (ind.get(nx) || 0) - 1; ind.set(nx, d); if (d === 0) queue.push(nx); }); }
        
        let sorted = order.length === nodes.length ? order : nodes.map(n => n.id);
        if (startNodeId) sorted = [startNodeId];

        // Build a context map: nodeId → output media URL (passed between nodes)
        const nodeOutputs = new Map<string, string>();

        let hasError = false;
        try {
            for (const nodeId of sorted) {
                const node = nodes.find(n => n.id === nodeId); if (!node) continue;
                setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
                if (!startNodeId) addLog(`Exécution : ${node.data.title}…`);

                await new Promise(r => setTimeout(r, 600));

                // ── Bridge Node Execution ──────────────────────────────────────
                if (node.data.neuralType === 'custom_bridge') {
                    const bridgeId = node.data.params?.bridgeId;
                    const bridge = savedBridges.find((b: any) => b.id === bridgeId);
                    if (!bridge) {
                        addLog(`✗ Bridge "${node.data.params?.bridgeName || bridgeId}" non trouvé.`);
                        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n));
                        hasError = true;
                        break;
                    }

                    // Resolve inputs from connected upstream nodes
                    const incomingEdge = edges.find(e => e.targetId === nodeId);
                    const upstreamUrl = incomingEdge ? nodeOutputs.get(incomingEdge.sourceId) || '' : '';
                    const prompt = node.data.params?.prompt || '';
                    const influencerName = influencers.find(i => i.id === selectedInfluencerId)?.fields?.Name as string || '';

                    // Template substitution
                    let bodyText = bridge.bodyText || '{}';
                    bodyText = bodyText.replace(/\{\{prompt\}\}/g, prompt)
                               .replace(/\{\{storageUrl\}\}/g, upstreamUrl)
                               .replace(/\{\{name\}\}/g, influencerName);
                    
                    let parsedBody: any = {};
                    try { parsedBody = JSON.parse(bodyText); } catch { parsedBody = { prompt }; }

                    try {
                        addLog(`🔗 Appel Bridge: ${bridge.name} → ${new URL(bridge.url).hostname}...`);
                        const result = await backendService.testCustomConnector({
                            orgId: base.id,
                            method: bridge.method || 'POST',
                            url: bridge.url,
                            body: parsedBody,
                            authMode: bridge.authMode || 'none',
                            authToken: bridge.authToken,
                            name: bridge.name,
                        });
                        const outputUrl = result.preview?.url || result.preview?.output_url || result.preview?.image_url || upstreamUrl;
                        nodeOutputs.set(nodeId, outputUrl);
                        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done', imageUrl: outputUrl || undefined } } : n));
                        addLog(`✓ Bridge ${bridge.name} OK`);
                    } catch (bridgeErr: any) {
                        addLog(`✗ Bridge échoué: ${bridgeErr?.message || bridgeErr}`);
                        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n));
                        hasError = true;
                        break;
                    }
                } else if (node.data.neuralType === 'ltx-video') {
                    const influencer = influencers.find(i => i.id === selectedInfluencerId)?.fields;
                    const incomingEdge = edges.find(e => e.targetId === nodeId);
                    const upstreamUrl = incomingEdge ? nodeOutputs.get(incomingEdge.sourceId) : undefined;
                    try {
                        const resp = await backendService.previewGenerateBatch({
                            influencer: influencer ? { name: influencer.Name as string, age: Number(influencer.Age), gender: influencer.Gender as string, niche: influencer.Niche as string, style: influencer.Style as string } : undefined,
                            provider: 'ltx',
                            model: 'ltx-video',
                            mediaType: 'video',
                            customPrompt: node.data.params.prompt || 'Cinematic video',
                            count: 1,
                            referenceImageUrl: upstreamUrl,
                            extraParams: {
                                motion: node.data.params.motion || 5,
                                duration: node.data.params.duration || '5s'
                            }
                        });
                        const result = resp.results?.[0];
                        if (result) {
                            nodeOutputs.set(nodeId, result.media_url);
                            setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done', imageUrl: result.media_url } } : n));
                            addLog(`✓ LTX-Video OK`);
                        } else throw new Error('No result returned');
                    } catch (err: any) {
                        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n));
                        addLog(`✗ LTX-Video échoué: ${err.message}`);
                        hasError = true;
                        break;
                    }
                } else {
                    // ── Standard Node ─────────────────────────────────────────────
                    const isImg = (node.data.neuralType || '').match(/sd_|flux|magnific|kling|hailuo|image|inpaint|custom|mystic|veo/i);
                    const outputUrl = isImg ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400' : '';
                    if (outputUrl) nodeOutputs.set(nodeId, outputUrl);
                    setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done', imageUrl: outputUrl || n.data.imageUrl } } : n));
                    addLog(`✓ ${node.data.title}`);
                }
            }
            if (!startNodeId && !hasError) addLog('Workflow terminé avec succès.');
            else if (hasError) addLog('⚠ Workflow interrompu suite à une erreur.');
        } catch (err: any) {
            addLog(`✗ Erreur : ${err?.message || err}`);
            setNodes(p => p.map(n => n.data.status === 'running' ? { ...n, data: { ...n.data, status: 'error' } } : n));
        } finally { setIsRunning(false); }
    }, [isRunning, nodes, edges, addLog]); // eslint-disable-line

    // ── Library ───────────────────────────────────────────────────────────────
    const filteredLib = useMemo(() => {
        const q = search.toLowerCase();
        return nodeData.filter(n => !q || (n.name || '').toLowerCase().includes(q) || (n.category || '').toLowerCase().includes(q)).slice(0, 100);
    }, [search]);
    const categories = useMemo(() => {
        const cats = new Map<string, NeuralNodeDef[]>();
        filteredLib.forEach(n => { const c = n.category || 'Other'; if (!cats.has(c)) cats.set(c, []); cats.get(c)!.push(n); });
        return cats;
    }, [filteredLib]);

    // ──────────────────────────────────────────────────────────────────────────
    // EDGE GEOMETRY — Le vrai fix du chaos visuel
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Calcule le chemin SVG pour chaque edge.
     *
     * Gestion des edges parallèles :
     * Si plusieurs edges partent du même nœud source ET vont vers des
     * destinations proches, on leur applique un offset vertical pour les séparer.
     */
    const edgeGeometry = useMemo(() => {
        return edges.map((edge, edgeIndex) => {
            const src = nodes.find(n => n.id === edge.sourceId);
            const tgt = nodes.find(n => n.id === edge.targetId);
            if (!src || !tgt) return null;

            const outKeys = Object.keys(src.data.schema?.outputs || {});
            const inKeys = Object.keys(tgt.data.schema?.inputs || {});
            const sIdx = outKeys.indexOf(edge.sourceHandle);
            const tIdx = inKeys.indexOf(edge.targetHandle);

            const x1 = src.x + NODE_W + PORT_R;
            const y1 = portY(src, sIdx >= 0 ? sIdx : 0);
            const x2 = tgt.x - PORT_R;
            const y2 = portY(tgt, tIdx >= 0 ? tIdx : 0);

            // Calculer l'offset pour les edges parallèles (même source, même handle)
            const parallelEdges = edges.filter(e =>
                e.sourceId === edge.sourceId && e.sourceHandle === edge.sourceHandle
            );
            const pIdx = parallelEdges.findIndex(e => e.id === edge.id);
            const parallelOffset = pIdx > 0 ? (pIdx - (parallelEdges.length - 1) / 2) * 16 : 0;

            const d = routeEdge(x1, y1, x2, y2, parallelOffset);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + parallelOffset;

            return { id: edge.id, d, mx, my, dataType: edge.dataType };
        }).filter(Boolean) as { id: string; d: string; mx: number; my: number; dataType?: string }[];
    }, [edges, nodes]);

    // Preview path pendant drag d'une connexion
    const previewD = useMemo(() => {
        if (!connecting) return null;
        const src = nodes.find(n => n.id === connecting.sourceId);
        if (!src || !canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        return routeEdge(
            src.x + NODE_W + PORT_R, portY(src, connecting.handleIdx),
            (connecting.mx - rect.left - pan.x) / zoom,
            (connecting.my - rect.top - pan.y) / zoom,
        );
    }, [connecting, nodes, pan, zoom]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'absolute', inset: 0, background: BG_DARK, color: '#fff', fontFamily: 'Inter,"SF Pro",system-ui,sans-serif', display: 'flex', overflow: 'hidden' }}>

            {/* ── Weavy-style Floating Dock ── */}
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 48, background: 'rgba(17,17,20,0.85)', backdropFilter: 'blur(12px)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 16, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {/* Neural Logo */}
                <div style={{ width: 32, height: 32, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#000', marginBottom: 8, cursor: 'default' }}>B</div>
                
                {/* Add Node (Search) */}
                <button onClick={(e) => setSearchPos(searchPos ? null : { x: 80, y: Math.max(20, e.clientY - 200) })} 
                    style={{ width: 36, height: 36, borderRadius: '50%', background: searchPos ? ACCENT : 'transparent', color: searchPos ? '#000' : '#fff', border: searchPos ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                
                {/* Run */}
                <button onClick={runWorkflow} disabled={isRunning} 
                    style={{ width: 36, height: 36, borderRadius: '50%', background: isRunning ? '#5a6208' : 'transparent', color: isRunning ? '#fff' : ACCENT, border: isRunning ? 'none' : `1px solid ${ACCENT}55`, cursor: isRunning ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isRunning ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                
                {/* Tidy */}
                <button onClick={tidyCanvas} 
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 9V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"></path><path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"></path><path d="M12 4v16"></path></svg>
                </button>
                
                <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                
                {/* Templates Toggle */}
                <button onClick={() => { setSidebarTab('templates'); setSearchPos(searchPos ? null : { x: 80, y: window.innerHeight / 2 - 200 }); }} 
                    style={{ width: 36, height: 36, borderRadius: '50%', background: sidebarTab === 'templates' && searchPos ? 'rgba(255,255,255,0.15)' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </button>

                {/* Bridges */}
                <button
                    onClick={() => { setSidebarTab('bridges'); setSearchPos(searchPos && sidebarTab === 'bridges' ? null : { x: 80, y: window.innerHeight / 2 - 200 }); }}
                    title={`Custom Bridges (${savedBridges.length})`}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: sidebarTab === 'bridges' && searchPos ? '#9B2BFF33' : 'transparent', color: sidebarTab === 'bridges' && searchPos ? '#9B2BFF' : TEXT_SOFT, border: sidebarTab === 'bridges' && searchPos ? '1px solid #9B2BFF55' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, position: 'relative' }}>
                    🔗
                    {savedBridges.length > 0 && (
                        <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#9B2BFF', color: '#fff', fontSize: 8, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {savedBridges.length}
                        </span>
                    )}
                </button>

                {/* Zoom Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
                    <button onClick={() => setZoom(z => Math.min(2, Math.max(0.15, +(z + 0.1).toFixed(2))))} style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: TEXT_SOFT, cursor: 'pointer', fontSize: 18 }}>+</button>
                    <button onClick={() => setZoom(z => Math.min(2, Math.max(0.15, +(z - 0.1).toFixed(2))))} style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: TEXT_SOFT, cursor: 'pointer', fontSize: 18 }}>−</button>
                </div>
            </div>

            {/* ── Floating Terminal Logs (Bottom Right) ── */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: 320, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${GB}`, borderRadius: 14, overflow: 'hidden', zIndex: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 150 }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: TEXT_SOFT, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 12px 4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TERMINAL</span>
                    <span style={{ color: ACCENT }}>{isRunning ? 'RUNNING' : 'IDLE'}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {logs.slice(-10).map((l, i) => <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: l.includes('✓') ? '#4ade80' : l.includes('✗') ? '#f87171' : 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{l}</div>)}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* ── Canvas ── */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* Grid */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(${GB} 1px, transparent 1px)`, backgroundSize: `${30 * zoom}px ${30 * zoom}px`, backgroundPosition: `${pan.x % (30 * zoom)}px ${pan.y % (30 * zoom)}px` }} />

                {/* Top HUD */}
                <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: 10, padding: '7px 18px', background: 'rgba(17,17,20,0.97)', border: `1px solid ${GB}`, borderRadius: 100 }}>
                    <span style={{ fontSize: 10, color: TEXT_SOFT }}>{nodes.length} nodes · {edges.length} edges · {Math.round(zoom * 100)}%</span>
                    {connecting && <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>● Connexion en cours…</span>}
                </div>



                {/* Canvas pointer */}
                <div ref={canvasRef}
                    onPointerDown={onCanvasDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                    onDoubleClick={e => { if (e.target === canvasRef.current) setSearchPos({ x: e.clientX, y: e.clientY }); }}
                    style={{ width: '100%', height: '100%', cursor: panStart.current ? 'grabbing' : 'default' }}
                >
                    <div style={{ position: 'absolute', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>

                        {/* ── SVG Edges ── */}
                        <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
                            <defs>
                                <style>{`
                  @keyframes nc-spin { to { transform: rotate(360deg); } }
                  @keyframes edge-flow { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
                  .edge-animated { animation: edge-flow 1.2s linear infinite; }
                `}</style>
                                {/* Gradient per data type */}
                                {Object.entries(TYPE_COLOR).map(([type, color]) => (
                                    <linearGradient key={type} id={`eg-${type}`} x1="0%" x2="100%">
                                        <stop offset="0%" stopColor={PURPLE} stopOpacity="0.5" />
                                        <stop offset="100%" stopColor={color} stopOpacity="0.9" />
                                    </linearGradient>
                                ))}
                                <linearGradient id="eg-default" x1="0%" x2="100%">
                                    <stop offset="0%" stopColor={PURPLE} stopOpacity="0.5" />
                                    <stop offset="100%" stopColor={ACCENT} stopOpacity="0.8" />
                                </linearGradient>
                            </defs>

                            {edgeGeometry.map(geo => {
                                if (!geo) return null;
                                const gradId = `eg-${geo.dataType || 'default'}`;
                                const isHovered = hoveredEdge === geo.id;
                                const edgeColor = isHovered ? ACCENT : `url(#${gradId})`;
                                return (
                                    <g key={geo.id}
                                        onPointerEnter={() => setHoveredEdge(geo.id)}
                                        onPointerLeave={() => setHoveredEdge(null)}
                                        style={{ pointerEvents: 'all' }}
                                    >
                                        {/* Fat invisible hit zone */}
                                        <path d={geo.d} fill="none" stroke="transparent" strokeWidth={16}
                                            style={{ cursor: 'pointer' }}
                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); deleteEdge(geo.id); }} />
                                        {/* Glow (hover) */}
                                        {isHovered && <path d={geo.d} fill="none" stroke={ACCENT} strokeWidth={6} strokeLinecap="round" opacity={0.2} />}
                                        {/* Main edge */}
                                        <path d={geo.d} fill="none" stroke={edgeColor}
                                            strokeWidth={isHovered ? 2.5 : 1.8} strokeLinecap="round"
                                            strokeDasharray="6 4" className="edge-animated"
                                            style={{ transition: 'stroke-width 0.15s' }}
                                        />
                                        {/* Delete button on hover */}
                                        {isHovered && <>
                                            <circle cx={geo.mx} cy={geo.my} r={9} fill="#1c1c20" stroke={ACCENT} strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => deleteEdge(geo.id)} />
                                            <text x={geo.mx} y={geo.my + 4} textAnchor="middle" fill={ACCENT} fontSize={11} fontWeight="bold" style={{ pointerEvents: 'none' }}>×</text>
                                        </>}
                                    </g>
                                );
                            })}

                            {/* Preview edge */}
                            {previewD && (
                                <path d={previewD} fill="none"
                                    stroke={hoveredInput ? ACCENT : 'rgba(255,255,255,0.4)'}
                                    strokeWidth={1.8} strokeDasharray="5 4" className="edge-animated"
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}
                        </svg>

                        {/* ── Nodes ── */}
                        {nodes.map(node => (
                            <NodeCard key={node.id} node={node} allNodes={nodes} selected={selectedId === node.id} connecting={connecting}
                                backendService={backendService}
                                onHeaderDown={e => {
                                    e.stopPropagation(); setSelectedId(node.id);
                                    // If dragging within a group, snapshot all group origins
                                    if (selectedIds.size > 1 && selectedIds.has(node.id)) {
                                        setNodes(p => p.map(n => selectedIds.has(n.id) 
                                            ? { ...n, _ox: n.x, _oy: n.y } as any 
                                            : n
                                        ));
                                    }
                                    dragNode.current = { id: node.id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY };
                                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                }}
                                onDelete={() => deleteNode(node.id)}
                                onParamChange={(k, v) => updateNodeParam(node.id, k, v)}
                                onOutputDown={(hid, hType, idx, e) => startConnect(node.id, hid, hType, idx, e)}
                                onInputUp={(nid, hid, e) => finishConnect(nid, hid, e)}
                                onInputEnter={(nid, hid, idx) => setHoveredInput({ nodeId: nid, handleId: hid, idx })}
                                onInputLeave={() => setHoveredInput(null)}
                                onFocusNode={(nid: string) => {
                                    const target = nodes.find(n => n.id === nid);
                                    if (target) {
                                        setPan({ x: window.innerWidth / 2 - target.x * zoom, y: window.innerHeight / 2 - target.y * zoom });
                                        setSelectedId(nid);
                                    }
                                }}
                                onOutputEnter={(nid: string, hid: string, rect: DOMRect) => setHoveredOutput({ nodeId: nid, handleId: hid, rect })}
                                onOutputLeave={() => setHoveredOutput(null)}
                                onRunNode={() => {
                                    console.log('Running isolated node:', node.id);
                                    runWorkflow(node.id);
                                }}
                                selectedIds={selectedIds}
                            />
                        ))}
                    </div>
                </div>

                {/* Lasso selection rectangle */}
                {lasso && (
                    <div style={{
                        position: 'absolute',
                        left: lasso.x,
                        top: lasso.y,
                        width: lasso.w,
                        height: lasso.h,
                        border: '1.5px dashed #9B2BFF',
                        background: 'rgba(155, 43, 255, 0.07)',
                        borderRadius: 6,
                        pointerEvents: 'none',
                        zIndex: 2000,
                    }} />
                )}

                {/* Mini Preview Magnifier */}
                {hoveredOutput && nodes.find(n => n.id === hoveredOutput.nodeId)?.data.imageUrl && (
                    <div style={{
                        position: 'fixed',
                        left: hoveredOutput.rect.right + 10,
                        top: hoveredOutput.rect.top - 50,
                        width: 200,
                        height: 200,
                        background: '#000',
                        border: `2px solid ${ACCENT}`,
                        borderRadius: 12,
                        zIndex: 10000,
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                        pointerEvents: 'none'
                    }}>
                        <img 
                            src={nodes.find(n => n.id === hoveredOutput.nodeId)?.data.imageUrl} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="preview"
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>
                            {hoveredOutput.handleId}
                        </div>
                    </div>
                )}

                {/* Quick search overlay & Menu Popover */}
                {searchPos && (
                    <div style={{ position: 'absolute', left: Math.min(searchPos.x, window.innerWidth - 320), top: Math.min(searchPos.y, window.innerHeight - 500), width: 300, maxHeight: 480, background: 'rgba(17,17,20,0.95)', backdropFilter: 'blur(16px)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16, display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                            {(['nodes', 'templates', 'bridges'] as const).map(t => (
                                <button key={t} onClick={() => setSidebarTab(t)}
                                    style={{ flex: 1, padding: '6px 0', background: sidebarTab === t ? (t === 'bridges' ? '#9B2BFF33' : `${ACCENT}20`) : 'transparent', color: sidebarTab === t ? (t === 'bridges' ? '#9B2BFF' : ACCENT) : TEXT_SOFT, border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {sidebarTab === 'nodes' && (
                            <div style={{ padding: '12px 16px 8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 10, top: 9, color: TEXT_SOFT }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    <input autoFocus placeholder="Search nodes…" value={search} onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: '8px 12px 8px 32px', color: '#fff', fontSize: 13, outline: 'none' }} />
                                </div>
                            </div>
                        )}

                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                            {sidebarTab === 'nodes' ? (
                                [...categories.entries()].map(([rawCat, defs]) => {
                                    const cat = rawCat === 'Weavy' ? 'Neural Engine' : rawCat;
                                    return (
                                        <div key={cat} style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 6 }}>{cat}</div>
                                        {defs.map(def => (
                                            <div key={def.id} onClick={() => addNodeAt(def, searchPos.x + 320, searchPos.y)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2, transition: 'background 0.1s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${def.color || ACCENT}20`, border: `1px solid ${def.color || ACCENT}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: def.color || ACCENT }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#eee', marginBottom: 2 }}>{def.name}</div>
                                                    <div style={{ fontSize: 10, color: TEXT_SOFT }}>{def.type}</div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    );
                                })
                            ) : sidebarTab === 'templates' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px' }}>
                                    {[
                                        { id: 'seedance', name: 'Seedance AI UGC', desc: 'Prompt → Flux Pro → Magnific', color: PURPLE },
                                        { id: 'kling', name: 'Kling Lipsync UGC', desc: 'Image → Kling 2.6 → OmniHuman', color: '#FF3366' },
                                        { id: 'veo', name: 'Veo Cinematic', desc: 'Mystic → Veo 3.1 → Magnific', color: '#4285F4' },
                                    ].map(tpl => (
                                        <div key={tpl.id} onClick={() => applyTemplate(tpl.id)}
                                            style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${tpl.color}15`; (e.currentTarget as HTMLElement).style.borderColor = `${tpl.color}40`; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = `rgba(255,255,255,0.05)`; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tpl.color }} />
                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{tpl.name}</div>
                                            </div>
                                            <div style={{ fontSize: 11, color: TEXT_SOFT }}>{tpl.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px' }}>
                                    {savedBridges.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px 10px', color: TEXT_SOFT, fontSize: 11 }}>
                                            No bridges found.<br/>Configure them in Connections.
                                        </div>
                                    ) : (
                                        savedBridges.map(bridge => (
                                            <div key={bridge.id} onClick={() => addNodeAt(BRIDGE_DEF, searchPos.x + 320, searchPos.y, { bridgeId: bridge.id, bridgeName: bridge.name })}
                                                style={{ padding: '12px', background: 'rgba(155, 43, 255, 0.05)', border: `1px solid rgba(155, 43, 255, 0.15)`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155, 43, 255, 0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(155, 43, 255, 0.3)'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155, 43, 255, 0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(155, 43, 255, 0.15)'; }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 16 }}>🔗</span>
                                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{bridge.name}</div>
                                                </div>
                                                <div style={{ fontSize: 9, color: 'rgba(155, 43, 255, 0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{bridge.method || 'POST'} · {new URL(bridge.url).hostname}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            {sidebarTab === 'nodes' && filteredLib.length === 0 && <div style={{ textAlign: 'center', color: TEXT_SOFT, fontSize: 12, padding: 30 }}>No nodes found</div>}
                        </div>

                        {/* Influencer Profile in Popover */}
                        {influencers.length > 0 && (
                            <div style={{ padding: '12px 16px', borderTop: `1px solid rgba(255,255,255,0.05)`, background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: TEXT_SOFT, letterSpacing: '0.08em', marginBottom: 8 }}>ACTIVE PROFILE</div>
                                <select value={selectedInfluencerId} onChange={e => setSelectedInfluencerId(e.target.value)}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}>
                                    {influencers.map(i => <option key={i.id} value={i.id} style={{ background: SIDE_BG }}>{i.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ position: 'absolute', bottom: 18, left: 16, fontSize: 9, color: 'rgba(255,255,255,0.14)', pointerEvents: 'none' }}>
                    Port jaune → connecter · Clic droit edge → supprimer · Double-clic / Espace → ajouter · Suppr → effacer nœud
                </div>
            </div>
        </div>
    );
}

export default WorkflowTab;