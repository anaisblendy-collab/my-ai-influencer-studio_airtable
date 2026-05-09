/**
 * WorkflowTabV2.tsx â€” Minimalist AI Workflow Canvas
 * Design: Dark Studio â€¢ Inspired by Figma Weave
 * Pure React + inline styles â€” compatible avec Airtable Blocks SDK
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService, InfluencerProfileRecord } from '../services/airtable';
import { backendService } from '../services/backend';
import { PremiumIconMap } from './PremiumIcons';
import neuralNodesData from '../data/neural_nodes.json';


// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type HandleType = 'image' | 'video' | 'text' | 'prompt' | 'seed' | 'number' | 'boolean' | 'model' | 'string' | 'enum' | 'integer' | 'input-number';

interface NodeParameter {
  id: string;
  type: 'string' | 'number' | 'select' | 'boolean' | 'seed';
  label: string;
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

interface NodeSchema {
  inputs: Record<string, { type: HandleType; label: string }>;
  outputs: Record<string, { type: HandleType; label: string }>;
  parameters?: NodeParameter[];
}

type NodeKind =
  | 'image'
  | 'prompt'
  | 'model'
  | 'output'
  | 'video'
  | 'upscale'
  | 'faceswap'
  | 'lora'
  | 'inpaint'
  | 'neural';

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

// â”€â”€ Node Logic Definitions (Inspired by neural) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NODE_SCHEMAS: Record<string, NodeSchema> = {
    image: {
        inputs: {},
        outputs: { 'image': { type: 'image', label: 'Source' } },
        parameters: [
            { id: 'aspect_ratio', type: 'select', label: 'Aspect Ratio', options: ['1:1', '16:9', '9:16'], default: '1:1' }
        ]
    },
    prompt: {
        inputs: { 'context': { type: 'text', label: 'Context' } },
        outputs: { 'prompt': { type: 'prompt', label: 'Neural Text' } },
        parameters: [
            { id: 'style', type: 'select', label: 'Art Style', options: ['Cinematic', 'Realistic', 'Cyberpunk', 'None'], default: 'Realistic' }
        ]
    },
    model: {
        inputs: { 
            'image': { type: 'image', label: 'Reference' },
            'prompt': { type: 'prompt', label: 'Instructions' }
        },
        outputs: { 'media': { type: 'image', label: 'Generated' } },
        parameters: [
            { id: 'seed', type: 'seed', label: 'Seed', default: -1 },
            { id: 'steps', type: 'number', label: 'Steps', min: 1, max: 50, step: 1, default: 28 },
            { id: 'guidance', type: 'number', label: 'Guidance', min: 1, max: 20, step: 0.1, default: 7.5 }
        ]
    },
    output: {
        inputs: { 'media': { type: 'image', label: 'Final Result' } },
        outputs: {},
        parameters: [
            { id: 'auto_export', type: 'boolean', label: 'Auto Export to Airtable', default: true }
        ]
    },
    video: {
        inputs: {},
        outputs: { 'video': { type: 'video', label: 'Video Source' } }
    },
    upscale: {
        inputs: { 'image': { type: 'image', label: 'Low Res' } },
        outputs: { 'image': { type: 'image', label: 'HD Result' } },
        parameters: [
            { id: 'scale', type: 'number', label: 'Scale Factor', min: 2, max: 4, default: 2 }
        ]
    },
    faceswap: {
        inputs: { 
            'face': { type: 'image', label: 'Face' },
            'target': { type: 'image', label: 'Target' }
        },
        outputs: { 'image': { type: 'image', label: 'Swapped' } }
    },
    lora: {
        inputs: { 'model': { type: 'model', label: 'Base Model' } },
        outputs: { 'model': { type: 'model', label: 'Adapted Model' } },
        parameters: [
            { id: 'lora_id', type: 'string', label: 'LoRA Name', default: 'My Adapter' },
            { id: 'strength', type: 'number', label: 'Strength', min: 0, max: 2, step: 0.1, default: 1 }
        ]
    },
    inpaint: {
        inputs: { 
            'image': { type: 'image', label: 'Original' },
            'mask': { type: 'image', label: 'Mask' }
        },
        outputs: { 'image': { type: 'image', label: 'Inpainted' } }
    }
};

// â”€â”€â”€ Node Config (couleur + label + icÃ´ne SVG path) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NODE_CONFIG: Record<NodeKind, { color: string; label: string; path: string }> = {
  image: {
    color: '#6C8EF5',
    label: 'IMAGE',
    path: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 6l2.5 3 2-2.5 3 3.5H4l4-4z',
  },
  prompt: {
    color: '#A0A0A0',
    label: 'PROMPT',
    path: 'M4 6h12M4 10h8M4 14h10',
  },
  model: {
    color: '#9B5FFF',
    label: 'MODEL',
    path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  output: {
    color: '#E0F81C',
    label: 'OUTPUT',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  video: {
    color: '#FF6B6B',
    label: 'VIDEO',
    path: 'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
  },
  upscale: {
    color: '#4ECDC4',
    label: 'UPSCALE',
    path: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5',
  },
  faceswap: {
    color: '#FFD93D',
    label: 'FACESWAP',
    path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  lora: {
    color: '#9B2BFF',
    label: 'LORA',
    path: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  inpaint: {
    color: '#FFFFFF',
    label: 'INPAINT',
    path: 'M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.37 2.63a2.12 2.12 0 1 1 3 3L12 15l-4 1 1-4Z',
  },
  neural: {
    color: '#9B5FFF',
    label: 'neural',
    path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  }
};

// â”€â”€â”€ Default Workflow (inspirÃ© de Figma Weave Image 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_NODES: WFNode[] = [
  { id: 'n1', kind: 'image',  x: 60,   y: 320, data: { title: 'Color Reference',    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=280', schema: NODE_SCHEMAS.image } },
  { id: 'n2', kind: 'model',  x: 60,   y: 60,  data: { title: 'Rodin 2.0',          subtitle: '3D', model: 'Rodin 2.0', schema: NODE_SCHEMAS.model } },
  { id: 'n3', kind: 'image',  x: 380,  y: 80,  data: { title: 'Stable Diffusion',   subtitle: 'IMAGE', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=280', schema: NODE_SCHEMAS.image } },
  { id: 'n4', kind: 'prompt', x: 720,  y: 60,  data: { title: 'Motion Prompt',      subtitle: 'TEXT', prompt: 'a Great-Tailed Grackle bird is flying from the background and seating on the model\'s shoulder slowly and barely moves. the model looks at the camera. then bird flies away. cinematic.', schema: NODE_SCHEMAS.prompt } },
  { id: 'n5', kind: 'image',  x: 720,  y: 300, data: { title: 'Flux Pro 1.1',       subtitle: 'IMAGE', imageUrl: 'https://images.unsplash.com/photo-1549944850-84e00be4203b?q=80&w=200', schema: NODE_SCHEMAS.image } },
  { id: 'n6', kind: 'video',  x: 1060, y: 80,  data: { title: 'Minimax Video',      subtitle: 'VIDEO', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=380', status: 'done', schema: NODE_SCHEMAS.video } },
];

const DEFAULT_EDGES: WFEdge[] = [
  { id: 'e1', sourceId: 'n1', targetId: 'n3' },
  { id: 'e2', sourceId: 'n2', targetId: 'n3' },
  { id: 'e3', sourceId: 'n3', targetId: 'n4' },
  { id: 'e4', sourceId: 'n4', targetId: 'n6' },
  { id: 'e5', sourceId: 'n5', targetId: 'n4' },
];

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NODE_W = 240;
const NODE_PORT_SIZE = 10;
const CANVAS_BG = '#0C0C10';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

// â”€â”€â”€ neural Node Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface neuralNodeDef {
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

// â”€â”€â”€ SVG Icon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Icon({ path, size = 14, color }: { path: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

// â”€â”€â”€ Bezier path between two nodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getBezier(src: WFNode, tgt: WFNode) {
  const sx = src.x + NODE_W;
  const sy = src.y + 60;
  const tx = tgt.x;
  const ty = tgt.y + 60;
  const cx = (tx - sx) * 0.5;
  return `M${sx},${sy} C${sx + cx},${sy} ${tx - cx},${ty} ${tx},${ty}`;
}

// â”€â”€â”€ Single Workflow Node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NodeCardProps {
  node: WFNode;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
    nodes: WFNode[];
    setNodes: React.Dispatch<React.SetStateAction<WFNode[]>>;
    onStartConnect: (nodeId: string, handleId: string, e: React.PointerEvent) => void;
    onCompleteConnect: (nodeId: string, handleId: string) => void;
    onHoverHandle: (nodeId: string | null, handleId: string | null) => void;
  }
  
  function NodeCard({ node, selected, onPointerDown, onDelete, nodes, setNodes, onStartConnect, onCompleteConnect, onHoverHandle }: NodeCardProps) {
  const cfg = NODE_CONFIG[node.kind];
  const statusColor: Record<string, string> = {
    running: '#E0F81C',
    done: '#4ECDC4',
    error: '#FF6B6B',
    idle: 'rgba(255,255,255,0.2)',
  };

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_W,
        userSelect: 'none',
        cursor: 'grab',
        borderRadius: 16,
        background: GLASS,
        border: `1px solid ${selected ? cfg.color : GLASS_BORDER}`,
        boxShadow: selected ? `0 0 0 2px ${cfg.color}22, 0 8px 32px rgba(0,0,0,0.5)` : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: `1px solid ${GLASS_BORDER}`,
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {node.data.status && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor[node.data.status] || 'transparent',
              flexShrink: 0,
            }} />
          )}
          <Icon path={cfg.path} size={13} color={cfg.color} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {node.data.subtitle || cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
            {node.data.model || node.data.title}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onDelete}
            style={{
              width: 18, height: 18, borderRadius: 5, border: 'none',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l6 6M7 1L1 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* â”€â”€ Node Body â”€â”€ */}
      <div style={{ padding: 14 }}>
        {/* Image Preview Area */}
        {node.data.imageUrl ? (
          <div style={{
            width: '100%', aspectRatio: '1/1', borderRadius: 12,
            background: '#000', overflow: 'hidden', position: 'relative'
          }}>
            <img src={node.data.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
            {node.data.status === 'running' && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}>
                <div className="loader-neon" />
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.2)',
            minHeight: 80, display: 'flex', flexDirection: 'column', gap: 10
          }}>
            {/* Dynamic Parameter Rendering (Hidden Logic) */}
            {node.data.schema?.parameters?.map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{p.label}</span>
                  {p.type === 'number' && <span style={{ fontSize: 10, color: '#E0F81C', fontWeight: 700 }}>{node.data.params?.[p.id] ?? p.default}</span>}
                </div>
                
                {p.type === 'select' ? (
                  <select 
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 8px', outline: 'none' }}
                      value={node.data.params?.[p.id] ?? p.default}
                      onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, params: { ...n.data.params, [p.id]: val } } } : n));
                      }}
                  >
                      {p.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : p.type === 'number' ? (
                  <input 
                      type="range" min={p.min} max={p.max} step={p.step}
                      style={{ width: '100%', accentColor: '#E0F81C', height: 4 }}
                      value={node.data.params?.[p.id] ?? p.default}
                      onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setNodes(nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, params: { ...n.data.params, [p.id]: val } } } : n));
                      }}
                  />
                ) : p.type === 'seed' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                          type="number" 
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 8px', outline: 'none' }}
                          value={node.data.params?.[p.id] ?? p.default}
                          onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setNodes(nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, params: { ...n.data.params, [p.id]: val } } } : n));
                          }}
                      />
                      <button 
                          onClick={() => {
                              const val = Math.floor(Math.random() * 10000000);
                              setNodes(nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, params: { ...n.data.params, [p.id]: val } } } : n));
                          }}
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', padding: '0 8px', cursor: 'pointer' }}
                      >ðŸŽ²</button>
                  </div>
                ) : null}
              </div>
            ))}
            {!node.data.schema?.parameters?.length && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center', padding: '20px 0' }}>No parameters</span>}
          </div>
        )}
      </div>

      {/* Dynamic Ports (neural Logic) */}
            <div style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(node.data.schema?.inputs || {}).map(([id, input]) => (
                    <div 
                        key={id} 
                        title={`${input.label} (${input.type})`}
                        onPointerEnter={() => onHoverHandle(node.id, id)}
                        onPointerLeave={() => onHoverHandle(null, null)}
                        style={{ width: 14, height: 14, borderRadius: '50%', background: '#9B2BFF', border: `3px solid #121218`, cursor: 'crosshair', boxShadow: '0 0 10px rgba(155, 43, 255, 0.4)' }} 
                    />
                ))}
            </div>
            <div style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(node.data.schema?.outputs || {}).map(([id, output]) => (
                    <div 
                        key={id} 
                        title={`${output.label} (${output.type})`}
                        onPointerDown={(e) => onStartConnect(node.id, id, e)}
                        style={{ width: 14, height: 14, borderRadius: '50%', background: '#E0F81C', border: `3px solid #121218`, cursor: 'crosshair', boxShadow: '0 0 10px rgba(224, 248, 28, 0.4)' }} 
                    />
                ))}
            </div>
    </div>
  );
}

// â”€â”€â”€ Main WorkflowTabV2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function WorkflowTabV2() {
  const base = useBase();
  const globalConfig = useGlobalConfig();
  const airtableService = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);

  const [nodes, setNodes] = useState<WFNode[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<WFEdge[]>(DEFAULT_EDGES);
  const [pan, setPan] = useState({ x: 40, y: 60 });
  const [zoom, setZoom] = useState(0.82);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  
  const [influencers, setInfluencers] = useState<InfluencerProfileRecord[]>([]);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string>('');
  const [dynamicCatalog, setDynamicCatalog] = useState<any[]>([]);
  const [neuralNodes, setneuralNodes] = useState<neuralNodeDef[]>([]);
  const isInitialMount = useRef(true);
  const skipNextLoad = useRef(false);
  const [connecting, setConnecting] = useState<{ sourceId: string; handleId: string; mx: number; my: number } | null>(null);
  const [hoverHandle, setHoverHandle] = useState<{ nodeId: string; handleId: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const dragNode = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);

  // â”€â”€ Load neural Nodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (neuralNodesData) {
      setneuralNodes(neuralNodesData as neuralNodeDef[]);
    }
  }, []);

  // â”€â”€ Connection Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startConnection = (nodeId: string, handleId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setConnecting({ sourceId: nodeId, handleId, mx: e.clientX, my: e.clientY });
  };

  const completeConnection = (targetId: string, handleId: string) => {
    if (!connecting || connecting.sourceId === targetId) return;
    
    const newEdge: WFEdge = {
        id: `e${Date.now()}`,
        sourceId: connecting.sourceId,
        targetId: targetId,
        sourceHandle: connecting.handleId,
        targetHandle: handleId
    };
    
    setEdges(prev => [...prev, newEdge]);
    setConnecting(null);
  };
    useEffect(() => {
        const loadInitial = async () => {
            if (!isInitialMount.current) return;
            
            const saved = globalConfig.get('wf_v2') as any;
            if (saved?.nodes?.length) {
                setNodes(saved.nodes);
                setEdges(saved.edges || []);
            }
            isInitialMount.current = false;
        };

        loadInitial();

        const loadDeps = async () => {
            try {
                const infs = await airtableService.getInfluencerProfiles();
                setInfluencers(infs);
                if (infs.length) setSelectedInfluencerId(infs[0].id);
            } catch (err) {
                console.error('Failed to load influencer profiles:', err);
            }
        };
        loadDeps();
    }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    
    const t = setTimeout(() => {
        skipNextLoad.current = true;
        globalConfig.setAsync('wf_v2', { nodes, edges });
    }, 800);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  // â”€â”€ Canvas pan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;
    setSelectedId(null);
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (panStart.current) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.mx,
        y: panStart.current.py + e.clientY - panStart.current.my,
      });
    } else if (dragNode.current) {
      const dx = (e.clientX - dragNode.current.mx) / zoom;
      const dy = (e.clientY - dragNode.current.my) / zoom;
      setNodes(prev => prev.map(n =>
        n.id === dragNode.current!.id
          ? { ...n, x: dragNode.current!.ox + dx, y: dragNode.current!.oy + dy }
          : n
      ));
    } else if (connecting) {
      setConnecting(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null);
    }
  }, [zoom, connecting]);

  const onPointerUp = useCallback(() => {
    if (connecting && hoverHandle) {
        completeConnection(hoverHandle.nodeId, hoverHandle.handleId);
    }
    panStart.current = null;
    dragNode.current = null;
    setConnecting(null);
    setHoverHandle(null);
  }, [connecting, hoverHandle]);

  // â”€â”€ Wheel zoom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onWheel = useCallback((e: React.WheelEvent) => {
    setZoom(z => Math.min(2, Math.max(0.2, z - e.deltaY * 0.001)));
  }, []);

  // â”€â”€ Node drag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startNodeDrag = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const node = nodes.find(n => n.id === id)!;
    dragNode.current = { id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [nodes]);

  // â”€â”€ Add node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addNode = useCallback((kind: NodeKind) => {
    const id = `n${Date.now()}`;
    const cfg = NODE_CONFIG[kind];
    const schema = NODE_SCHEMAS[kind];
    
    // Default params from schema
    const params: Record<string, any> = {};
    schema.parameters?.forEach(p => {
        if (p.default !== undefined) params[p.id] = p.default;
    });

    setNodes(prev => [...prev, {
      id, kind,
      x: (canvasRef.current?.offsetWidth ?? 800) / 2 / zoom - pan.x / zoom - NODE_W / 2,
      y: (canvasRef.current?.offsetHeight ?? 500) / 2 / zoom - pan.y / zoom - 60,
      data: { 
        title: cfg.label, 
        params,
        schema 
      },
    }]);
    setShowLibrary(false);
  }, [zoom, pan]);

  // â”€â”€ Add neural node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addneuralNode = useCallback((neuralNode: neuralNodeDef) => {
    const id = `n${Date.now()}`;
    
    const params: Record<string, any> = {};
    neuralNode.schema.parameters?.forEach(p => {
      if (p.default !== undefined) params[p.id] = p.default;
    });

    // Map neural types to NodeParameter types
    const mapParamType = (t: string): NodeParameter['type'] => {
      if (t === 'enum') return 'select';
      if (t === 'integer' || t === 'input-number') return 'number';
      return t as NodeParameter['type'];
    };

    const schema: NodeSchema = {
      inputs: neuralNode.schema.inputs as Record<string, { type: HandleType; label: string }>,
      outputs: neuralNode.schema.outputs as Record<string, { type: HandleType; label: string }>,
      parameters: neuralNode.schema.parameters.map(p => ({
        id: p.id,
        type: mapParamType(p.type),
        label: p.label,
        default: p.default,
        options: p.options
      }))
    };

    setNodes(prev => [...prev, {
      id, kind: 'neural',
      x: (canvasRef.current?.offsetWidth ?? 800) / 2 / zoom - pan.x / zoom - NODE_W / 2,
      y: (canvasRef.current?.offsetHeight ?? 500) / 2 / zoom - pan.y / zoom - 60,
      data: { 
        title: neuralNode.name, 
        params,
        schema,
        neuralType: neuralNode.type
      },
    }]);
    setShowLibrary(false);
  }, [zoom, pan]);

  // â”€â”€ Delete node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deleteNode = useCallback((id: string) => {
    setNodes(p => p.filter(n => n.id !== id));
    setEdges(p => p.filter(e => e.sourceId !== id && e.targetId !== id));
  }, []);

  // â”€â”€ Run workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const runWorkflow = useCallback(async () => {
    if (!selectedInfluencerId) {
        alert('Please select an influencer first');
        return;
    }

    // 1. Dependency Analysis (Topological Sort)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const indegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    
    nodes.forEach(n => {
        indegree.set(n.id, 0);
        adj.set(n.id, []);
    });
    
    edges.forEach(e => {
        indegree.set(e.targetId, (indegree.get(e.targetId) || 0) + 1);
        adj.get(e.sourceId)?.push(e.targetId);
    });

    const queue: string[] = [];
    indegree.forEach((count, id) => { if (count === 0) queue.push(id); });
    
    const executionOrder: string[] = [];
    while (queue.length) {
        const curr = queue.shift()!;
        executionOrder.push(curr);
        adj.get(curr)?.forEach(next => {
            indegree.set(next, (indegree.get(next) || 0) - 1);
            if (indegree.get(next) === 0) queue.push(next);
        });
    }

    if (executionOrder.length !== nodes.length) {
        alert('Cycle detected in workflow! Please check your connections.');
        return;
    }

    // 2. Sequential Execution
    const influencer = influencers.find(i => i.id === selectedInfluencerId);
    setNodes(p => p.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    for (const nodeId of executionOrder) {
        const node = nodeMap.get(nodeId)!;
        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
        
        console.log(`Processing node ${node.data.title} (${node.kind}) for ${influencer?.name}`);
        
        // Simulate processing time
        await new Promise(r => setTimeout(r, 800));
        
        setNodes(p => p.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done' } } : n));
    }
  }, [selectedInfluencerId, influencers, nodes, edges]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: CANVAS_BG,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      fontFamily: '"SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* â”€â”€ Top Bar â”€â”€ */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 20px',
        background: 'rgba(18,18,24,0.9)',
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#E0F81C', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#000',
          }}>B</div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#fff' }}>
            NEURAL STUDIO
          </span>
        </div>
        <div style={{ width: 1, height: 20, background: GLASS_BORDER }} />
        
        <select 
            className="bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer text-white appearance-none hover:text-[#e0f81c] transition-colors"
            value={selectedInfluencerId}
            onChange={(e) => setSelectedInfluencerId(e.target.value)}
        >
            {influencers.map((i) => <option key={i.id} value={i.id} style={{ background: '#1a1a24', color: '#fff' }}>{i.name}</option>)}
        </select>

        <div style={{ width: 1, height: 20, background: GLASS_BORDER }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {nodes.length} nodes Â· {edges.length} connections
        </span>
        <button onClick={runWorkflow} style={{
          padding: '7px 18px',
          background: '#E0F81C', color: '#000',
          border: 'none', borderRadius: 9,
          fontSize: 10, fontWeight: 900,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>
          Execute Run
        </button>
      </div>

      {/* â”€â”€ Canvas â”€â”€ */}
      <div
        ref={canvasRef}
        onPointerDown={onCanvasDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        style={{
          width: '100%', height: '100%',
          cursor: panStart.current ? 'grabbing' : 'grab',
        }}
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
                <linearGradient key={k} id={`grad-${k}`} x1="0%" x2="100%">
                  <stop offset="0%" stopColor={c.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={c.color} stopOpacity="0.7" />
                </linearGradient>
              ))}
            </defs>
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.sourceId);
              const tgt = nodes.find(n => n.id === edge.targetId);
              if (!src || !tgt) return null;
              
              // Multi-port offset calculation
              const sIdx = Object.keys(src.data.schema?.outputs || {}).indexOf(edge.sourceHandle || '');
              const tIdx = Object.keys(tgt.data.schema?.inputs || {}).indexOf(edge.targetHandle || '');
              
              const sx = src.x + NODE_W;
              const sy = src.y + 60 + (sIdx >= 0 ? sIdx * 26 : 0);
              const tx = tgt.x;
              const ty = tgt.y + 60 + (tIdx >= 0 ? tIdx * 26 : 0);
              
              const dx = Math.abs(tx - sx) / 1.5;
              const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

              return (
                <path
                  key={edge.id}
                  d={d}
                  stroke={`url(#grad-${src.kind})`}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={src.data.status === 'running' ? '6 4' : undefined}
                />
              );
            })}

            {/* Connection Preview */}
            {connecting && (() => {
                const src = nodes.find(n => n.id === connecting.sourceId);
                if (!src || !canvasRef.current) return null;
                const rect = canvasRef.current.getBoundingClientRect();
                
                const sIdx = Object.keys(src.data.schema?.outputs || {}).indexOf(connecting.handleId);
                const sx = src.x + NODE_W;
                const sy = src.y + 60 + (sIdx >= 0 ? sIdx * 26 : 0);
                
                const tx = (connecting.mx - rect.left - pan.x) / zoom;
                const ty = (connecting.my - rect.top - pan.y) / zoom;
                const dx = Math.abs(tx - sx) / 1.5;
                const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
                return <path d={d} fill="none" stroke="#E0F81C" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />;
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
              nodes={nodes}
              setNodes={setNodes}
              onStartConnect={startConnection}
              onCompleteConnect={completeConnection}
              onHoverHandle={(nodeId, handleId) => setHoverHandle(nodeId && handleId ? { nodeId, handleId } : null)}
            />
          ))}
        </div>
      </div>

      {/* â”€â”€ Left Sidebar (Workflow Studio Style) â”€â”€ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 320, background: '#121218', borderRight: `1px solid ${GLASS_BORDER}`,
        zIndex: 300, display: 'flex', flexDirection: 'column', padding: '32px 24px',
        boxShadow: '10px 0 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ marginBottom: 40 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>NEURAL OS // ID:USER_BEV</span>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '8px 0', fontStyle: 'italic', textDecoration: 'underline 4px #E0F81C' }}>WORKFLOW STUDIO</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>COMPONENTS</span>
            
            {(['prompt', 'image', 'model', 'upscale', 'lora', 'inpaint', 'faceswap', 'output'] as NodeKind[]).map(kind => {
                const cfg = NODE_CONFIG[kind];
                return (
                    <button 
                        key={kind}
                        onClick={() => addNode(kind)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16,
                            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{cfg.label.toUpperCase()}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>{kind.toUpperCase()}</span>
                        </div>
                    </button>
                );
            })}

            {/* neural Nodes Section */}
            {neuralNodes.length > 0 && (
                <>
                    <div style={{ height: 1, background: GLASS_BORDER, margin: '8px 0' }} />
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>neural AI ({neuralNodes.length})</span>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {neuralNodes.slice(0, 50).map(node => (
                            <button 
                                key={node.id}
                                onClick={() => addneuralNode(node)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12,
                                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                                    marginBottom: 4
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(155,95,255,0.15)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                title={node.description || node.name}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: node.color }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{node.name}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
                onClick={runWorkflow}
                style={{
                    padding: '20px', background: '#E0F81C', color: '#000',
                    border: 'none', borderRadius: 16, fontSize: 13, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(224, 248, 28, 0.2)'
                }}
            >
                Run Workflow
            </button>
            <button 
                onClick={() => { if(confirm('Clear all?')) { setNodes([]); setEdges([]); }}}
                style={{
                    padding: '16px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, fontSize: 11, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer'
                }}
            >
                Clear Canvas
            </button>
        </div>
      </div>

      {/* â”€â”€ Zoom Controls â”€â”€ */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '5px 8px',
        background: 'rgba(18,18,24,0.95)',
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 10,
      }}>
        <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(1)))} style={{
          width: 28, height: 28, background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: 6, fontSize: 16,
        }}>âˆ’</button>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', minWidth: 36, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))} style={{
          width: 28, height: 28, background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: 6, fontSize: 16,
        }}>+</button>
        <div style={{ width: 1, height: 16, background: GLASS_BORDER, margin: '0 4px' }} />
        <button onClick={() => { setPan({ x: 40, y: 60 }); setZoom(0.82); }} style={{
          width: 28, height: 28, background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer', borderRadius: 6, fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1018 0A9 9 0 003 12zM12 8v4l3 3" />
          </svg>
        </button>
      </div>

      {/* â”€â”€ Keyboard shortcut hint â”€â”€ */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em', zIndex: 100,
        pointerEvents: 'none',
      }}>
        Scroll to zoom Â· Click + drag to pan Â· Click node to select
      </div>
    </div>
  );
}

export default WorkflowTabV2;
