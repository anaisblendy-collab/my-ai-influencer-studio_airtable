import { create } from 'zustand';
import { validateNodeParams } from '../utils/validation';

export interface WFNode {
    id: string;
    x: number;
    y: number;
    data: {
        title: string;
        neuralType?: string;
        color?: string;
        imageUrl?: string;
        status?: 'idle' | 'running' | 'done' | 'error';
        params?: Record<string, any>;
        schema?: { inputs: Record<string, any>; outputs: Record<string, any>; parameters: any[] };
        validationErrors?: Record<string, string>;
    };
}

export interface WFEdge {
    id: string;
    sourceId: string;
    sourceHandle: string;
    targetId: string;
    targetHandle: string;
    dataType?: string;
}

interface WorkflowState {
    nodes: WFNode[];
    edges: WFEdge[];
    pan: { x: number; y: number };
    zoom: number;
    selectedId: string | null;
    isInitialized: boolean;

    // Actions
    setNodes: (nodes: WFNode[] | ((prev: WFNode[]) => WFNode[])) => void;
    setEdges: (edges: WFEdge[] | ((prev: WFEdge[]) => WFEdge[])) => void;
    setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
    setZoom: (zoom: number | ((prev: number) => number)) => void;
    setSelectedId: (id: string | null) => void;
    
    updateNodeParam: (nodeId: string, key: string, val: any) => void;
    validateAll: () => boolean;
    initialize: (data: { nodes: WFNode[]; edges: WFEdge[] }) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    nodes: [],
    edges: [],
    pan: { x: 300, y: 150 },
    zoom: 0.9,
    selectedId: null,
    isInitialized: false,

    setNodes: (next) => set((state) => ({ 
        nodes: typeof next === 'function' ? next(state.nodes) : next 
    })),

    setEdges: (next) => set((state) => ({ 
        edges: typeof next === 'function' ? next(state.edges) : next 
    })),

    setPan: (next) => set((state) => ({ 
        pan: typeof next === 'function' ? next(state.pan) : next 
    })),

    setZoom: (next) => set((state) => ({ 
        zoom: typeof next === 'function' ? next(state.zoom) : next 
    })),

    setSelectedId: (id) => set({ selectedId: id }),

    updateNodeParam: (nodeId, key, val) => set((state) => {
        const nextNodes = state.nodes.map(n => {
            if (n.id !== nodeId) return n;
            
            const nextParams = { ...(n.data.params || {}), [key]: val };
            const validation = validateNodeParams(n.data.neuralType || '', nextParams);
            
            const nextData = { 
                ...n.data, 
                params: nextParams,
                validationErrors: validation.success ? undefined : validation.errors
            };
            
            // Sync preview keys
            if (key === 'imageUrl' || key === 'url') {
                nextData.imageUrl = val;
            }
            
            return { ...n, data: nextData };
        });
        return { nodes: nextNodes };
    }),

    validateAll: () => {
        let allValid = true;
        const nextNodes = get().nodes.map(n => {
            const validation = validateNodeParams(n.data.neuralType || '', n.data.params || {});
            if (!validation.success) allValid = false;
            return {
                ...n,
                data: {
                    ...n.data,
                    validationErrors: validation.success ? undefined : validation.errors
                }
            };
        });
        set({ nodes: nextNodes });
        return allValid;
    },

    initialize: (data) => set({ 
        nodes: data.nodes, 
        edges: data.edges, 
        isInitialized: true 
    }),
}));
