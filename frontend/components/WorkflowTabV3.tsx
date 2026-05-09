/**
 * WorkflowTabV2.tsx — Minimalist AI Workflow Canvas
 * Compatible Airtable Blocks SDK
 *
 * Fixes appliqués :
 *  ✅ backdropFilter supprimé partout  → cause erreur "Unrecognized feature: vr"
 *  ✅ position:fixed → position:absolute (iframes Airtable)
 *  ✅ Wheel zoom via listener natif passive:false (preventDefault React passif bloqué)
 *  ✅ useEffect([globalConfig]) boucle infinie → deps [] avec ref
 *  ✅ boxShadow glow supprimés (performance iframe)
 *  ✅ className Tailwind sur <select> remplacé par inline style
 */

import React, {
  useCallback, useEffect, useRef, useState, useMemo,
} from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import neuralNodesData from '../data/neural_nodes.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type HandleType = 'image' | 'video' | 'text' | 'prompt' | 'seed' | 'number'
  | 'boolean' | 'model' | 'string' | 'enum' | 'integer' | 'input-number';

interface NodeParameter {
  id: string;
  type: 'string' | 'number' | 'select' | 'boolean' | 'seed';
  label: string;
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

interface NodeSchema {
  inputs: Record<string, { type: HandleType; label: string }>;
  outputs: Record<string, { type: HandleType; label: string }>;
  parameters?: NodeParameter[];
}

type NodeKind =
  | 'image' | 'prompt' | 'model' | 'output'
  | 'video' | 'upscale' | 'faceswap' | 'lora' | 'inpaint' | 'neural';

interface WFNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  data: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    prompt?: string;
    model?: string;
    status?: 'idle' | 'running' | 'done' | 'error';
    params?: Record<string, any>;
    schema?: NodeSchema;
    neuralType?: string;
  };
}

interface WFEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface NeuralNodeDef {
  id: string;
  name: string;
  type: string;
  category: string;
  color: string;
  description: string | null;
  schema: {
    inputs: Record<string, { type: string; label: string }>;
    outputs: Record<string, { type: string; label: string }>;
    parameters: any[];
  };
  isModel: boolean;
}

// ─── Node Schemas ─────────────────────────────────────────────────────────────

const NODE_SCHEMAS: Record<string, NodeSchema> = {
  image: {
    inputs: {},
    outputs: { image: { type: 'image', label: 'Source' } },
    parameters: [
      { id: 'aspect_ratio', type: 'select', label: 'Aspect Ratio', options: ['1:1', '16:9', '9:16'], default: '1:1' },
    ],
  },
  prompt: {
    inputs: { context: { type: 'text', label: 'Context' } },
    outputs: { prompt: { type: 'prompt', label: 'Neural Text' } },
    parameters: [
      { id: 'style', type: 'select', label: 'Art Style', options: ['Cinematic', 'Realistic', 'Cyberpunk', 'None'], default: 'Realistic' },
    ],
  },
  model: {
    inputs: {
      image: { type: 'image', label: 'Reference' },
      prompt: { type: 'prompt', label: 'Instructions' },
    },
    outputs: { media: { type: 'image', label: 'Generated' } },
    parameters: [
      { id: 'seed', type: 'seed', label: 'Seed', default: -1 },
      { id: 'steps', type: 'number', label: 'Steps', min: 1, max: 50, step: 1, default: 28 },
      { id: 'guidance', type: 'number', label: 'Guidance', min: 1, max: 20, step: 0.1, default: 7.5 },
    ],
  },
  output: {
    inputs: { media: { type: 'image', label: 'Final Result' } },
    outputs: {},
  },
  video: {
    inputs: {},
    outputs: { video: { type: 'video', label: 'Video Source' } },
  },
  upscale: {
    inputs: { image: { type: 'image', label: 'Low Res' } },
    outputs: { image: { type: 'image', label: 'HD Result' } },
    parameters: [
      { id: 'scale', type: 'number', label: 'Scale', min: 2, max: 4, default: 2 },
    ],
  },
  faceswap: {
    inputs: { face: { type: 'image', label: 'Face' }, target: { type: 'image', label: 'Target' } },
    outputs: { image: { type: 'image', label: 'Swapped' } },
  },
  lora: {
    inputs: { model: { type: 'model', label: 'Base Model' } },
    outputs: { model: { type: 'model', label: 'Adapted Model' } },
    parameters: [
      { id: 'lora_id', type: 'string', label: 'LoRA Name', default: 'My Adapter' },
      { id: 'strength', type: 'number', label: 'Strength', min: 0, max: 2, step: 0.1, default: 1 },
    ],
  },
  inpaint: {
    inputs: { image: { type: 'image', label: 'Original' }, mask: { type: 'image', label: 'Mask' } },
    outputs: { image: { type: 'image', label: 'Inpainted' } },
  },
  neural: { inputs: {}, outputs: {} },
};

// ─── Node Config ──────────────────────────────────────────────────────────────

const NODE_CONFIG: Record<NodeKind, { color: string; label: string; path: string }> = {
  image:    { color: '#6C8EF5', label: 'IMAGE',    path: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 6l2.5 3 2-2.5 3 3.5H4l4-4z' },
  prompt:   { color: '#A0A0A0', label: 'PROMPT',   path: 'M4 6h12M4 10h8M4 14h10' },
  model:    { color: '#9B5FFF', label: 'MODEL',    path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  output:   { color: '#E0F81C', label: 'OUTPUT',   path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  video:    { color: '#FF6B6B', label: 'VIDEO',    path: 'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z' },
  upscale:  { color: '#4ECDC4', label: 'UPSCALE',  path: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5' },
  faceswap: { color: '#FFD93D', label: 'FACESWAP', path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  lora:     { color: '#9B2BFF', label: 'LORA',     path: 'M13 10V3L4 14h7v7l9-11h-7z' },
  inpaint:  { color: '#CCCCCC', label: 'INPAINT',  path: 'M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.37 2.63a2.12 2.12 0 1 1 3 3L12 15l-4 1 1-4Z' },
  neural:   { color: '#9B5FFF', label: 'NEURAL',   path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_NODES: WFNode[] = [
  { id: 'n1', kind: 'image',  x: 60,   y: 300, data: { title: 'Color Reference',  imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=280', schema: NODE_SCHEMAS.image } },
  { id: 'n2', kind: 'model',  x: 60,   y: 60,  data: { title: 'Rodin 2.0',        subtitle: '3D', model: 'Rodin 2.0', schema: NODE_SCHEMAS.model } },
  { id: 'n3', kind: 'image',  x: 370,  y: 80,  data: { title: 'Stable Diffusion', subtitle: 'IMAGE', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=280', schema: NODE_SCHEMAS.image } },
  { id: 'n4', kind: 'prompt', x: 700,  y: 60,  data: { title: 'Motion Prompt',    subtitle: 'TEXT', prompt: 'A bird lands on the model\'s shoulder. Model looks at camera. Bird flies away. Cinematic.', schema: NODE_SCHEMAS.prompt } },
  { id: 'n5', kind: 'image',  x: 700,  y: 280, data: { title: 'Flux Pro 1.1',     subtitle: 'IMAGE', imageUrl: 'https://images.unsplash.com/photo-1549944850-84e00be4203b?q=80&w=200', schema: NODE_SCHEMAS.image } },
  { id: 'n6', kind: 'video',  x: 1020, y: 80,  data: { title: 'Minimax Video',    subtitle: 'VIDEO', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=380', status: 'done', schema: NODE_SCHEMAS.video } },
];

const DEFAULT_EDGES: WFEdge[] = [
  { id: 'e1', sourceId: 'n1', targetId: 'n3' },
  { id: 'e2', sourceId: 'n2', targetId: 'n3' },
  { id: 'e3', sourceId: 'n3', targetId: 'n4' },
  { id: 'e4', sourceId: 'n4', targetId: 'n6' },
  { id: 'e5', sourceId: 'n5', targetId: 'n4' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 240;
const BG_DARK = '#0C0C10';
const SIDE_BG = '#0E0E14';
const NODE_BG = '#16161E';
const NODE_HEAD_BG = '#101016';
const GB = 'rgba(255,255,255,0.08)';

const STATUS_COLORS: Record<string, string> = {
  running: '#E0F81C',
  done:    '#4ECDC4',
  error:   '#FF6B6B',
  idle:    'rgba(255,255,255,0.2)',
};

// ─── SVG Icon ─────────────────────────────────────────────────────────────────

function Icon({ path, size = 13, color = 'rgba(255,255,255,0.5)' }: { path: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );
}

// ─── Bezier ───────────────────────────────────────────────────────────────────

function makeBezier(sx: number, sy: number, tx: number, ty: number) {
  const cx = Math.abs(tx - sx) * 0.5;
  return `M${sx},${sy} C${sx + cx},${sy} ${tx - cx},${ty} ${tx},${ty}`;
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: WFNode;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<WFNode['data']>) => void;
  onStartConnect: (handleId: string, e: React.PointerEvent) => void;
  onHoverHandle: (handleId: string | null) => void;
}

function NodeCard({ node, selected, onPointerDown, onDelete, onUpdate, onStartConnect, onHoverHandle }: NodeCardProps) {
  const cfg = NODE_CONFIG[node.kind];

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', left: node.x, top: node.y, width: NODE_W,
        userSelect: 'none', cursor: 'grab',
        borderRadius: 12,
        background: NODE_BG,
        border: `1px solid ${selected ? cfg.color : GB}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', background: NODE_HEAD_BG, borderBottom: `1px solid ${GB}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {node.data.status && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: STATUS_COLORS[node.data.status] }} />
          )}
          <Icon path={cfg.path} size={12} color={cfg.color} />
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.07em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.data.subtitle || cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.data.model || node.data.title}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onDelete}
            style={{ width: 15, height: 15, borderRadius: 3, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l6 6M7 1L1 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 10 }}>
        {node.data.imageUrl ? (
          <div style={{ borderRadius: 7, overflow: 'hidden', width: '100%', aspectRatio: '4/3', background: '#000', position: 'relative' }}>
            <img src={node.data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* ✅ FIX: solid overlay, NO backdropFilter */}
            {node.data.status === 'running' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9, color: '#E0F81C', fontWeight: 800, letterSpacing: '0.12em' }}>PROCESSING</span>
              </div>
            )}
          </div>
        ) : node.data.prompt ? (
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, fontStyle: 'italic' }}>
            {node.data.prompt}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(node.data.schema?.parameters || []).map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>{p.label}</span>
                  {p.type === 'number' && <span style={{ fontSize: 9, color: '#E0F81C', fontWeight: 700 }}>{node.data.params?.[p.id] ?? p.default}</span>}
                </div>
                {p.type === 'select' && (
                  <select
                    onPointerDown={e => e.stopPropagation()}
                    value={node.data.params?.[p.id] ?? p.default}
                    onChange={e => onUpdate({ params: { ...node.data.params, [p.id]: e.target.value } })}
                    style={{ background: BG_DARK, border: `1px solid ${GB}`, borderRadius: 5, color: '#fff', fontSize: 10, padding: '3px 5px', outline: 'none', width: '100%' }}
                  >
                    {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {p.type === 'number' && (
                  <input
                    type="range" min={p.min} max={p.max} step={p.step}
                    value={node.data.params?.[p.id] ?? p.default}
                    onPointerDown={e => e.stopPropagation()}
                    onChange={e => onUpdate({ params: { ...node.data.params, [p.id]: parseFloat(e.target.value) } })}
                    style={{ width: '100%', accentColor: '#E0F81C', cursor: 'pointer' }}
                  />
                )}
                {p.type === 'seed' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      value={node.data.params?.[p.id] ?? p.default}
                      onPointerDown={e => e.stopPropagation()}
                      onChange={e => onUpdate({ params: { ...node.data.params, [p.id]: parseInt(e.target.value) } })}
                      style={{ flex: 1, background: BG_DARK, border: `1px solid ${GB}`, borderRadius: 5, color: '#fff', fontSize: 10, padding: '3px 5px', outline: 'none' }}
                    />
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => onUpdate({ params: { ...node.data.params, [p.id]: Math.floor(Math.random() * 9999999) } })}
                      style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${GB}`, borderRadius: 5, color: '#fff', padding: '0 7px', cursor: 'pointer', fontSize: 12 }}
                    >⚄</button>
                  </div>
                )}
              </div>
            ))}
            {!node.data.schema?.parameters?.length && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', display: 'block', textAlign: 'center', padding: '8px 0' }}>No parameters</span>
            )}
          </div>
        )}
      </div>

      {/* ── Input ports (left) ── */}
      <div style={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(node.data.schema?.inputs || {}).map(([id, inp]) => (
          <div key={id} title={`${inp.label} (${inp.type})`}
            onPointerEnter={() => onHoverHandle(id)}
            onPointerLeave={() => onHoverHandle(null)}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#9B2BFF', border: `2px solid ${NODE_HEAD_BG}`, cursor: 'crosshair' }}
          />
        ))}
      </div>

      {/* ── Output ports (right) ── */}
      <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(node.data.schema?.outputs || {}).map(([id, out]) => (
          <div key={id} title={`${out.label} (${out.type})`}
            onPointerDown={e => { e.stopPropagation(); onStartConnect(id, e); }}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#E0F81C', border: `2px solid ${NODE_HEAD_BG}`, cursor: 'crosshair' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkflowTabV2() {
  const base         = useBase();
  const globalConfig = useGlobalConfig();

  // ✅ FIX: stable ref → never re-created, no infinite re-render
  const airtableService = useMemo(() => new AirtableService(base, globalConfig), []); // eslint-disable-line

  const [nodes, setNodes]   = useState<WFNode[]>(DEFAULT_NODES);
  const [edges, setEdges]   = useState<WFEdge[]>(DEFAULT_EDGES);
  const [pan, setPan]       = useState({ x: 60, y: 80 });
  const [zoom, setZoom]     = useState(0.82);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [influencers, setInfluencers]           = useState<InfluencerProfileRecord[]>([]);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState('');
  const [neuralNodes, setNeuralNodes]           = useState<NeuralNodeDef[]>([]);
  const [connecting, setConnecting]             = useState<{ sourceId: string; handleId: string; mx: number; my: number } | null>(null);
  const [hoverHandle, setHoverHandle]           = useState<{ nodeId: string; handleId: string } | null>(null);
  const [isRunning, setIsRunning]               = useState(false);

  const canvasRef  = useRef<HTMLDivElement>(null);
  const panStart   = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const dragNode   = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const didInit    = useRef(false);
  const didSaveOnce = useRef(false);

  // ── Init (once) ───────────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ FIX: [] deps — runs once, no globalConfig in deps → no infinite loop
    const saved = globalConfig.get('wf_v2') as any;
    if (saved?.nodes?.length) {
      setNodes(saved.nodes);
      setEdges(saved.edges || []);
    }
    didInit.current = true;

    if (neuralNodesData) setNeuralNodes(neuralNodesData as NeuralNodeDef[]);

    airtableService.getInfluencerProfiles()
      .then(infs => { setInfluencers(infs); if (infs.length) setSelectedInfluencerId(infs[0].id); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist (debounced) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!didSaveOnce.current) { didSaveOnce.current = true; return; } // skip initial render
    const t = setTimeout(() => globalConfig.setAsync('wf_v2', { nodes, edges }), 900);
    return () => clearTimeout(t);
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel zoom (native, passive:false) ───────────────────────────────────
  // ✅ FIX: React onWheel is passive → can't call e.preventDefault()
  //         Must attach a native listener with { passive: false }
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(2, Math.max(0.2, z - e.deltaY * 0.001)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Canvas pan ────────────────────────────────────────────────────────────
  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;
    setSelectedId(null);
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (panStart.current) {
      setPan({ x: panStart.current.px + e.clientX - panStart.current.mx, y: panStart.current.py + e.clientY - panStart.current.my });
    } else if (dragNode.current) {
      const dx = (e.clientX - dragNode.current.mx) / zoom;
      const dy = (e.clientY - dragNode.current.my) / zoom;
      setNodes(prev => prev.map(n =>
        n.id === dragNode.current!.id ? { ...n, x: dragNode.current!.ox + dx, y: dragNode.current!.oy + dy } : n
      ));
    } else if (connecting) {
      setConnecting(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null);
    }
  }, [zoom, connecting]);

  const onPointerUp = useCallback(() => {
    if (connecting && hoverHandle && connecting.sourceId !== hoverHandle.nodeId) {
      setEdges(prev => [...prev, {
        id: `e${Date.now()}`,
        sourceId: connecting.sourceId,
        targetId: hoverHandle.nodeId,
        sourceHandle: connecting.handleId,
        targetHandle: hoverHandle.handleId,
      }]);
    }
    panStart.current = null;
    dragNode.current = null;
    setConnecting(null);
    setHoverHandle(null);
  }, [connecting, hoverHandle]);

  const startNodeDrag = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const node = nodes.find(n => n.id === id)!;
    dragNode.current = { id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [nodes]);

  // ── Node CRUD ─────────────────────────────────────────────────────────────
  const addNode = useCallback((kind: NodeKind) => {
    const schema = NODE_SCHEMAS[kind] || { inputs: {}, outputs: {} };
    const params: Record<string, any> = {};
    schema.parameters?.forEach(p => { if (p.default !== undefined) params[p.id] = p.default; });
    setNodes(prev => [...prev, {
      id: `n${Date.now()}`, kind,
      x: Math.max(0, (300 - pan.x) / zoom),
      y: Math.max(0, (200 - pan.y) / zoom),
      data: { title: NODE_CONFIG[kind].label, schema, params },
    }]);
  }, [zoom, pan]);

  const addNeuralNode = useCallback((nd: NeuralNodeDef) => {
    const mapType = (t: string): NodeParameter['type'] =>
      t === 'enum' ? 'select' : (t === 'integer' || t === 'input-number') ? 'number' : t as any;
    const schema: NodeSchema = {
      inputs:  nd.schema.inputs  as any,
      outputs: nd.schema.outputs as any,
      parameters: nd.schema.parameters.map(p => ({ ...p, type: mapType(p.type) })),
    };
    const params: Record<string, any> = {};
    nd.schema.parameters.forEach(p => { if (p.default !== undefined) params[p.id] = p.default; });
    setNodes(prev => [...prev, {
      id: `n${Date.now()}`, kind: 'neural',
      x: Math.max(0, (300 - pan.x) / zoom),
      y: Math.max(0, (200 - pan.y) / zoom),
      data: { title: nd.name, schema, params, neuralType: nd.type },
    }]);
  }, [zoom, pan]);

  const deleteNode = useCallback((id: string) => {
    setNodes(p => p.filter(n => n.id !== id));
    setEdges(p => p.filter(e => e.sourceId !== id && e.targetId !== id));
  }, []);

  const updateNode = useCallback((id: string, patch: Partial<WFNode['data']>) => {
    setNodes(p => p.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, []);

  // ── Run (topological sort) ────────────────────────────────────────────────
  const runWorkflow = useCallback(async () => {
    if (isRunning) return;
    if (!selectedInfluencerId) { alert('Please select an influencer first'); return; }

    const adj      = new Map<string, string[]>();
    const indegree = new Map<string, number>();
    nodes.forEach(n => { adj.set(n.id, []); indegree.set(n.id, 0); });
    edges.forEach(e => {
      adj.get(e.sourceId)?.push(e.targetId);
      indegree.set(e.targetId, (indegree.get(e.targetId) || 0) + 1);
    });

    const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const order: string[] = [];
    while (queue.length) {
      const curr = queue.shift()!;
      order.push(curr);
      adj.get(curr)?.forEach(next => {
        const d = (indegree.get(next) || 0) - 1;
        indegree.set(next, d);
        if (d === 0) queue.push(next);
      });
    }
    if (order.length !== nodes.length) { alert('Cycle detected in workflow!'); return; }

    setIsRunning(true);
    setNodes(p => p.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    for (const nodeId of order) {
      setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
      await new Promise(r => setTimeout(r, 700));
      setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done' } } : n));
    }
    setIsRunning(false);
  }, [isRunning, selectedInfluencerId, nodes, edges]);

  // ── Render ────────────────────────────────────────────────────────────────
  // ✅ FIX: position:absolute (not fixed) — works in Airtable iframe
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: BG_DARK,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      fontFamily: '"SF Pro Display","Helvetica Neue",system-ui,sans-serif',
      display: 'flex', overflow: 'hidden',
    }}>

      {/* ── Left Sidebar ── */}
      <div style={{
        width: 230, flexShrink: 0, zIndex: 300,
        background: SIDE_BG, borderRight: `1px solid ${GB}`,
        display: 'flex', flexDirection: 'column',
        padding: '18px 14px', gap: 7, overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#E0F81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#000', flexShrink: 0 }}>B</div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>NEURAL OS</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Workflow Studio</div>
          </div>
        </div>

        {/* Influencer */}
        {influencers.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Influencer</div>
            {/* ✅ FIX: inline style seulement — pas de className Tailwind */}
            <select
              value={selectedInfluencerId}
              onChange={e => setSelectedInfluencerId(e.target.value)}
              style={{ width: '100%', background: NODE_BG, border: `1px solid ${GB}`, borderRadius: 7, color: '#fff', fontSize: 11, padding: '6px 8px', outline: 'none', cursor: 'pointer' }}
            >
              {influencers.map(i => <option key={i.id} value={i.id} style={{ background: NODE_BG }}>{i.name}</option>)}
            </select>
          </div>
        )}

        {/* Components */}
        <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Components</div>
        {(['prompt', 'image', 'model', 'upscale', 'lora', 'inpaint', 'faceswap', 'output'] as NodeKind[]).map(kind => {
          const cfg = NODE_CONFIG[kind];
          return (
            <button key={kind} onClick={() => addNode(kind)} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 11px', background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${GB}`, borderRadius: 9, cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{cfg.label}</span>
            </button>
          );
        })}

        {/* Neural nodes */}
        {neuralNodes.length > 0 && (
          <>
            <div style={{ height: 1, background: GB, margin: '5px 0' }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Neural AI ({neuralNodes.length})</div>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {neuralNodes.slice(0, 50).map(nd => (
                <button key={nd.id} onClick={() => addNeuralNode(nd)} title={nd.description || nd.name} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 9px', background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.04)`, borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(155,95,255,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: nd.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nd.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Run / Clear */}
        <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={runWorkflow} disabled={isRunning} style={{
            padding: '13px', background: isRunning ? '#5A6208' : '#E0F81C', color: '#000',
            border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: isRunning ? 'wait' : 'pointer',
          }}>
            {isRunning ? 'Running…' : 'Run Workflow'}
          </button>
          <button
            onClick={() => { if (window.confirm('Clear all nodes?')) { setNodes([]); setEdges([]); } }}
            style={{ padding: '10px', background: 'transparent', color: 'rgba(255,255,255,0.32)', border: `1px solid ${GB}`, borderRadius: 9, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
          >Clear Canvas</button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Top info bar — ✅ FIX: NO backdropFilter, solid bg */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 14px',
          background: 'rgba(14,14,20,0.97)',
          border: `1px solid ${GB}`, borderRadius: 10,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>{nodes.length} nodes · {edges.length} edges</span>
          <span style={{ fontSize: 10, color: '#E0F81C', fontWeight: 700 }}>{Math.round(zoom * 100)}%</span>
        </div>

        {/* Pointer canvas */}
        <div
          ref={canvasRef}
          onPointerDown={onCanvasDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
        >
          <div style={{
            position: 'absolute',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}>
            {/* SVG edges */}
            <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
              <defs>
                {Object.entries(NODE_CONFIG).map(([k, c]) => (
                  <linearGradient key={k} id={`g-${k}`} x1="0%" x2="100%">
                    <stop offset="0%"   stopColor={c.color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={c.color} stopOpacity="0.65" />
                  </linearGradient>
                ))}
              </defs>

              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.sourceId);
                const tgt = nodes.find(n => n.id === edge.targetId);
                if (!src || !tgt) return null;
                const sIdx = Object.keys(src.data.schema?.outputs || {}).indexOf(edge.sourceHandle || '');
                const tIdx = Object.keys(tgt.data.schema?.inputs  || {}).indexOf(edge.targetHandle || '');
                const sx = src.x + NODE_W, sy = src.y + 60 + (sIdx >= 0 ? sIdx * 22 : 0);
                const tx = tgt.x,          ty = tgt.y + 60 + (tIdx >= 0 ? tIdx * 22 : 0);
                return (
                  <path
                    key={edge.id}
                    d={makeBezier(sx, sy, tx, ty)}
                    stroke={`url(#g-${src.kind})`}
                    strokeWidth={1.5} fill="none" strokeLinecap="round"
                    strokeDasharray={src.data.status === 'running' ? '6 4' : undefined}
                  />
                );
              })}

              {/* Connection preview */}
              {connecting && (() => {
                const src = nodes.find(n => n.id === connecting.sourceId);
                if (!src || !canvasRef.current) return null;
                const rect = canvasRef.current.getBoundingClientRect();
                return (
                  <path
                    d={makeBezier(
                      src.x + NODE_W, src.y + 60,
                      (connecting.mx - rect.left - pan.x) / zoom,
                      (connecting.my - rect.top  - pan.y) / zoom,
                    )}
                    stroke="#E0F81C" strokeWidth={1.5} strokeDasharray="6 5" fill="none" opacity={0.55}
                  />
                );
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                onPointerDown={e => startNodeDrag(node.id, e)}
                onDelete={() => deleteNode(node.id)}
                onUpdate={patch => updateNode(node.id, patch)}
                onStartConnect={(handleId, e) => {
                  e.stopPropagation();
                  setConnecting({ sourceId: node.id, handleId, mx: e.clientX, my: e.clientY });
                }}
                onHoverHandle={handleId => setHoverHandle(handleId ? { nodeId: node.id, handleId } : null)}
              />
            ))}
          </div>
        </div>

        {/* Zoom controls */}
        <div style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 2,
          background: SIDE_BG, border: `1px solid ${GB}`, borderRadius: 8, padding: '4px 5px',
        }}>
          {([['−', -0.1], ['+', 0.1]] as [string, number][]).map(([lbl, d]) => (
            <button key={lbl} onClick={() => setZoom(z => Math.min(2, Math.max(0.2, +(z + d).toFixed(1))))} style={{
              width: 24, height: 24, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: 4, fontSize: 15,
            }}>{lbl}</button>
          ))}
          <div style={{ width: 1, height: 12, background: GB }} />
          <button onClick={() => { setPan({ x: 60, y: 80 }); setZoom(0.82); }} style={{
            width: 24, height: 24, background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>

        {/* Hint */}
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.05em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Scroll to zoom · Drag canvas to pan · Yellow port to connect nodes
        </div>
      </div>
    </div>
  );
}

export default WorkflowTabV2;
