import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService } from '../services/airtable';
import { BackendService } from '../services/backend';
import weavyNodesData from '../data/weavy_nodes.json';

// ─── Utils ────────────────────────────────────────────────────────────────────
function routeEdge(x1: number, y1: number, x2: number, y2: number): string {
    const t = Math.min(Math.max(Math.abs(x2 - x1) * 0.45, 40), 150);
    return `M ${x1},${y1} C ${x1 + t},${y1} ${x2 - t},${y2} ${x2},${y2}`;
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT = '#00f2ff'; 
const PURPLE = '#9B2BFF';
const BG_DARK = '#09090b';
const SIDE_BG = '#0f0f13';
const NODE_BG = '#1a1a1f';
const GB = 'rgba(255,255,255,0.07)';
const SOFT = '#52525b';
const NODE_W = 180; // Compact width
const PORT_R = 5;
const PORT_GAP = 24;
const HEAD_H = 36;

const TYPE_CLR: Record<string, string> = {
    image: ACCENT, video: '#FF3366', audio: '#4ECDC4',
    text: PURPLE, string: PURPLE, model: '#f59e0b', any: '#71717a',
    number: '#4ECDC4', integer: '#4ECDC4', seed: '#4ECDC4', boolean: '#4ECDC4',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor' }: any) => {
    const icons: any = {
        search: <><circle cx="11" cy="11" r="8" fill="none" stroke={color} strokeWidth="2"/><path d="M21 21l-4.35-4.35" fill="none" stroke={color} strokeWidth="2"/></>,
        trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke={color} strokeWidth="2"/>,
        settings: <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="none" stroke={color} strokeWidth="2" />,
        play: <path d="M5 3l14 9-14 9V3z" fill={color}/>,
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>{icons[name] || null}</svg>;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface NeuralNodeDef {
    id: string; name: string; type: string; category: string;
    color: string; description: string | null;
    schema: { inputs: Record<string, any>; outputs: Record<string, any>; parameters: any[] };
    isModel: boolean;
}
interface WFNode {
    id: string; x: number; y: number;
    data: {
        title: string; neuralType?: string; color?: string;
        params?: Record<string, any>;
        schema?: { inputs: Record<string, any>; outputs: Record<string, any>; parameters: any[] };
        status?: 'idle' | 'running' | 'done' | 'error';
    };
}
interface WFEdge { id: string; sourceId: string; sourceHandle: string; targetId: string; targetHandle: string; dataType?: string; }
interface Connecting { sourceId: string; handleId: string; mx: number; my: number; sourceType: string; handleIdx: number; }

// ─── Components ──────────────────────────────────────────────────────────────

function CompactNode({ node, selected, onSelect, onHeaderDown, onDelete, onInputUp }: any) {
    const color = node.data.color || ACCENT;
    const inputs = Object.entries(node.data.schema?.inputs || {});
    const outputs = Object.entries(node.data.schema?.outputs || {});

    return (
        <div onPointerDown={onHeaderDown} onClick={onSelect} style={{
            position: 'absolute', left: node.x, top: node.y, width: NODE_W,
            background: '#16161a', border: `1px solid ${selected ? color : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, cursor: 'grab', userSelect: 'none',
            boxShadow: selected ? `0 0 20px ${color}22` : '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: selected ? 100 : 10, transition: 'all 0.15s'
        }}>
            <div style={{ height: 3, background: color, borderRadius: '10px 10px 0 0' }} />
            <div style={{ height: HEAD_H, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.data.title}</span>
                <button onPointerDown={e => e.stopPropagation()} onClick={onDelete} style={{ background: 'none', border: 'none', color: SOFT, cursor: 'pointer', fontSize: 12 }}>×</button>
            </div>

            {/* Ports */}
            <div style={{ position: 'relative', height: Math.max(inputs.length, outputs.length) * PORT_GAP + 10 }}>
                {inputs.map(([id, inp]: any, i) => (
                    <div key={id} onPointerUp={e => onInputUp(id, e)} style={{ position: 'absolute', left: -PORT_R, top: i * PORT_GAP + 10, width: PORT_R * 2, height: PORT_R * 2, borderRadius: '50%', background: TYPE_CLR[inp.type] || SOFT, border: '2px solid #000' }}>
                        <span style={{ position: 'absolute', left: 12, top: -2, fontSize: 8, color: SOFT, whiteSpace: 'nowrap' }}>{inp.label}</span>
                    </div>
                ))}
                {outputs.map(([id, out]: any, i) => (
                    <div key={id} style={{ position: 'absolute', right: -PORT_R, top: i * PORT_GAP + 10, width: PORT_R * 2, height: PORT_R * 2, borderRadius: '50%', background: TYPE_CLR[out.type] || ACCENT, border: '2px solid #000' }}>
                        <span style={{ position: 'absolute', right: 12, top: -2, fontSize: 8, color: SOFT, whiteSpace: 'nowrap' }}>{out.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Neural Input (Lightweight Badge System) ──────────────────────────────────

function NeuralInput({ value, onChange, nodes, accent }: any) {
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse the text to find variables like {{n_123}}
    const renderContent = () => {
        if (!value) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>Enter prompt...</span>;

        const parts = value.split(/(\{\{n_\d+\}\})/g);
        return parts.map((part: string, i: number) => {
            const match = part.match(/\{\{(n_\d+)\}\}/);
            if (match) {
                const nodeId = match[1];
                const node = nodes.find((n: any) => n.id === nodeId);
                const label = node?.data.title || 'Unknown Node';
                return (
                    <span key={i} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(155, 43, 255, 0.15)',
                        color: '#c084fc',
                        padding: '1px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(155, 43, 255, 0.3)',
                        fontSize: 10,
                        fontWeight: 800,
                        margin: '0 2px',
                        verticalAlign: 'middle',
                        boxShadow: '0 0 10px rgba(155, 43, 255, 0.1)',
                        pointerEvents: 'none'
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc', marginRight: 6, display: 'inline-block' }} />
                        {label}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const insertVariable = (nodeId: string) => {
        const newValue = value + ` {{${nodeId}}} `;
        onChange(newValue);
    };

    return (
        <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
            <div style={{
                minHeight: 100,
                padding: '12px',
                background: '#000',
                border: `1px solid ${isFocused ? accent : GB}`,
                borderRadius: 12,
                fontSize: 12,
                fontFamily: 'monospace',
                lineHeight: '1.6',
                color: 'transparent', // Hide the actual text in the textarea
                position: 'relative',
                transition: 'all 0.2s',
                overflow: 'hidden'
            }}>
                {/* Layer 1: The Rendered Content (Badges) */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    padding: '12px',
                    pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    zIndex: 1
                }}>
                    {renderContent()}
                </div>

                {/* Layer 2: The Real Textarea (Invisible but focusable) */}
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    spellCheck={false}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '12px',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        lineHeight: '1.6',
                        color: 'transparent', // The text is hidden here
                        caretColor: '#fff', // But the cursor is visible
                        resize: 'none',
                        zIndex: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}
                />
            </div>

            {/* Variable Suggestion Toolbar */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: SOFT, textTransform: 'uppercase', alignSelf: 'center', marginRight: 4 }}>Inject:</span>
                {nodes.filter((n: any) => n.data.neuralType !== 'instructions').slice(0, 4).map((n: any) => (
                    <button key={n.id} onClick={() => insertVariable(n.id)} style={{
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${GB}`,
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.1s'
                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        + {n.data.title}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PropertyPanel({ node, allNodes, onUpdateParam, onClose }: any) {
    if (!node) return null;
    const params = node.data.schema?.parameters || [];
    const color = node.data.color || ACCENT;

    return (
        <div style={{ width: 320, background: 'rgba(15,15,19,0.95)', borderLeft: `1px solid ${GB}`, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', zIndex: 1000 }}>
            <div style={{ padding: '24px 20px', borderBottom: `1px solid ${GB}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{node.data.title}</div>
                    <div style={{ fontSize: 9, color: SOFT, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{node.data.neuralType}</div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: SOFT, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {params.length === 0 && <div style={{ fontSize: 11, color: SOFT }}>No parameters available for this node.</div>}
                
                {params.map((p: any) => {
                    const val = node.data.params?.[p.id] ?? p.default;
                    return (
                        <div key={p.id} style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{p.label || p.name}</label>
                                {(p.type === 'number' || p.type === 'integer') && <span style={{ fontSize: 11, color: ACCENT, fontWeight: 900 }}>{val}</span>}
                            </div>

                            {(p.type === 'enum' || p.type === 'select') && (
                                <select value={val ?? ''} onChange={e => onUpdateParam(p.id, e.target.value)}
                                    style={{ width: '100%', background: '#000', border: `1px solid ${GB}`, borderRadius: 8, padding: '10px', color: '#fff', fontSize: 12, outline: 'none' }}>
                                    {p.options?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            )}

                            {(p.type === 'number' || p.type === 'integer' || p.type === 'input-number') && (
                                <input type="range" min={p.min ?? 0} max={p.max ?? 100} step={p.step ?? 1} value={val ?? 0}
                                    onChange={e => onUpdateParam(p.id, parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: ACCENT }} />
                            )}

                            {(p.type === 'string' || p.type === 'text' || p.type === 'prompt') && (
                                <NeuralInput 
                                    value={val ?? ''} 
                                    onChange={(v: string) => onUpdateParam(p.id, v)}
                                    nodes={allNodes}
                                    accent={color}
                                />
                            )}

                            {p.type === 'boolean' && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={!!val} onChange={e => onUpdateParam(p.id, e.target.checked)} style={{ accentColor: ACCENT }} />
                                    <span style={{ fontSize: 12, color: '#fff' }}>Enable</span>
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: 20, borderTop: `1px solid ${GB}` }}>
                <button style={{ width: '100%', height: 44, background: ACCENT, color: '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Icon name="play" size={16} color="#000" /> RUN MODEL
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditorNodeTab() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const [nodes, setNodes] = useState<WFNode[]>([]);
    const [edges, setEdges] = useState<WFEdge[]>([]);
    const [pan, setPan] = useState({ x: 300, y: 150 });
    const [zoom, setZoom] = useState(0.9);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState<Connecting | null>(null);
    
    const canvasRef = useRef<HTMLDivElement>(null);
    const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
    const dragNode = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
    const isInit = useRef(true);

    const nodeLibrary = useMemo(() => Array.isArray(weavyNodesData) ? weavyNodesData as NeuralNodeDef[] : [], []);
    const filteredLib = useMemo(() => {
        const q = search.toLowerCase();
        return nodeLibrary.filter(n => !q || n.name.toLowerCase().includes(q) || (n.category || '').toLowerCase().includes(q)).slice(0, 80);
    }, [search, nodeLibrary]);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);

    // ── Init & Persist ────────────────────────────────────────────────────────
    useEffect(() => {
        const saved = globalConfig.get('wf_node_editor_v1') as any;
        if (saved?.nodes) { setNodes(saved.nodes); setEdges(saved.edges || []); }
        isInit.current = false;
    }, []);

    useEffect(() => {
        if (isInit.current) return;
        const t = setTimeout(() => globalConfig.setAsync('wf_node_editor_v1', { nodes, edges }), 1500);
        return () => clearTimeout(t);
    }, [nodes, edges]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const addNode = useCallback((def: NeuralNodeDef) => {
        const x = (400 - pan.x) / zoom, y = (250 - pan.y) / zoom;
        const params = (def.schema.parameters || []).reduce((a: any, p: any) => ({ ...a, [p.id]: p.default }), {});
        const newNode: WFNode = { id: `n_${Date.now()}`, x, y, data: { title: def.name, neuralType: def.type, color: def.color || ACCENT, schema: def.schema, params, status: 'idle' } };
        setNodes(p => [...p, newNode]);
        setSelectedId(newNode.id);
    }, [pan, zoom]);

    const updateParam = useCallback((id: string, key: string, val: any) => {
        setNodes(p => p.map(n => n.id === id ? { ...n, data: { ...n.data, params: { ...n.data.params, [key]: val } } } : n));
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'absolute', inset: 0, background: BG_DARK, color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', overflow: 'hidden' }}>
            
            {/* Left Library */}
            <div style={{ width: 260, background: SIDE_BG, borderRight: `1px solid ${GB}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: ACCENT, letterSpacing: '0.05em', marginBottom: 4 }}>NODE EDITOR</div>
                    <div style={{ fontSize: 9, color: SOFT, fontWeight: 800 }}>WEAVY LIBRARY</div>
                </div>
                <div style={{ padding: '0 20px 15px' }}>
                    <input placeholder="Search models..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${GB}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 12, outline: 'none' }} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 20px' }}>
                    {filteredLib.map(n => (
                        <div key={n.id} onClick={() => addNode(n)} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color || ACCENT }} />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{n.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div ref={canvasRef} 
                onPointerDown={e => {
                    if (e.target !== canvasRef.current) return;
                    setSelectedId(null);
                    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={e => {
                    if (panStart.current) {
                        setPan({ x: panStart.current.px + (e.clientX - panStart.current.mx), y: panStart.current.py + (e.clientY - panStart.current.my) });
                    } else if (dragNode.current) {
                        const dx = (e.clientX - dragNode.current.mx) / zoom, dy = (e.clientY - dragNode.current.my) / zoom;
                        setNodes(p => p.map(n => n.id === dragNode.current!.id ? { ...n, x: dragNode.current!.ox + dx, y: dragNode.current!.oy + dy } : n));
                    }
                }}
                onPointerUp={() => { panStart.current = null; dragNode.current = null; }}
                style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair', background: '#000' }}>
                
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />

                <div style={{ position: 'absolute', left: pan.x, top: pan.y, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                    <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
                        {edges.map(edge => {
                            const src = nodes.find(n => n.id === edge.sourceId), tgt = nodes.find(n => n.id === edge.targetId);
                            if (!src || !tgt) return null;
                            const sIdx = Object.keys(src.data.schema?.outputs || {}).indexOf(edge.sourceHandle);
                            const tIdx = Object.keys(tgt.data.schema?.inputs || {}).indexOf(edge.targetHandle);
                            return <path key={edge.id} d={routeEdge(src.x + NODE_W, src.y + HEAD_H + 10 + sIdx * PORT_GAP, tgt.x, tgt.y + HEAD_H + 10 + tIdx * PORT_GAP)} fill="none" stroke={ACCENT} strokeWidth={2} opacity={0.5} />;
                        })}
                    </svg>

                    {nodes.map(node => (
                        <CompactNode key={node.id} node={node} selected={selectedId === node.id}
                            onSelect={(e: any) => { e.stopPropagation(); setSelectedId(node.id); }}
                            onHeaderDown={(e: any) => { e.stopPropagation(); dragNode.current = { id: node.id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
                            onDelete={(e: any) => { e.stopPropagation(); setNodes(p => p.filter(n => n.id !== node.id)); setEdges(p => p.filter(ed => ed.sourceId !== node.id && ed.targetId !== node.id)); if (selectedId === node.id) setSelectedId(null); }}
                            onInputUp={() => {}} />
                    ))}
                </div>

                {/* HUD */}
                <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '8px 16px', background: 'rgba(15,15,20,0.9)', border: `1px solid ${GB}`, borderRadius: 100, backdropFilter: 'blur(10px)' }}>
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 10px' }}>−</button>
                    <span style={{ fontSize: 11, fontWeight: 900, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 10px' }}>+</button>
                </div>
            </div>

            {/* Right Property Panel */}
            <PropertyPanel node={selectedNode} allNodes={nodes} onUpdateParam={(k: string, v: any) => updateParam(selectedId!, k, v)} onClose={() => setSelectedId(null)} />
        </div>
    );
}

export default EditorNodeTab;
