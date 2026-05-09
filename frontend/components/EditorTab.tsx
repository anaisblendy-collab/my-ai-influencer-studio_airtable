/**
 * Edit Studio - Basic V1 inpainting UI (mask + instruction)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBase, useGlobalConfig } from '@airtable/blocks/ui';
import { AirtableService } from '../services/airtable';
import { backendService } from '../services/backend';
import { mapRegistryToAIModel, useModelRegistry } from '../services/modelRegistry';
import { getSchemaIssues } from '../utils/schemaGuard';

type ToolMode = 'rectangle' | 'brush' | 'lasso' | 'select' | 'pan' | 'hover' | 'move';

interface ContentSourceItem {
    id: string;
    name: string;
    mediaUrl?: string;
}

interface MaskShape {
    id: string;
    type: 'brush' | 'lasso' | 'raster';
    points?: { x: number; y: number }[];
    radius?: number;
    raster?: ImageData;
    offsetX?: number;
    offsetY?: number;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface EditPreset {
    id: string;
    label: string;
    description: string;
    promptPrefix: string;
    promptSuffix?: string;
    defaults?: { strength?: number; steps?: number };
    modelIds: string[];
}

export function EditorTab({ prefilledImageUrl }: { prefilledImageUrl?: string | null }) {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const airtable = useMemo(() => new AirtableService(base, globalConfig), [base, globalConfig]);
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const queueTableName = queueTableId ? base.getTableByIdIfExists(queueTableId)?.name || 'Production Queue' : 'Production Queue';
    const schemaIssues = getSchemaIssues(base, globalConfig);
    const schemaValid = schemaIssues.length === 0;
    const billingMode = (globalConfig.get('connectionsBillingMode') as any) || 'platform';

    const defaultImageProvider = 'replicate';
    const defaultImageModel = 'black-forest-labs/flux-fill-pro';
    const defaultAutoMaskModel = 'meta/segment-anything';

    const [contents, setContents] = useState<ContentSourceItem[]>([]);
    const [selectedContentId, setSelectedContentId] = useState<string>('');
    const [sourceImageUrl, setSourceImageUrl] = useState<string>('');
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [uploadingSource, setUploadingSource] = useState(false);
    const [uploadingMask, setUploadingMask] = useState(false);
    const [toolMode, setToolMode] = useState<ToolMode>('brush');
    const [brushSize, setBrushSize] = useState(28);
    const [lassoSmooth, setLassoSmooth] = useState(35);
    const [hoverTolerance, setHoverTolerance] = useState(26);
    const [instruction, setInstruction] = useState('');
    const [editProvider, setEditProvider] = useState(defaultImageProvider);
    const [editModel, setEditModel] = useState(defaultImageModel);
    const [editStrength, setEditStrength] = useState(0.7);
    const [editSteps, setEditSteps] = useState(30);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('none');
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [queueing, setQueueing] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [samLoading, setSamLoading] = useState(false);  // SAM2 in progress
    const [toolboxPos, setToolboxPos] = useState({ x: 24, y: 24 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyRef = useRef<{ shapes: MaskShape[]; maskGrow: number }[]>([]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    
    const [selectedInfluencerId, setSelectedInfluencerId] = useState<string>('');
    const [influencers, setInfluencers] = useState<{ id: string; name: string; avatar?: any[] }[]>([]);
    const [maskBounds, setMaskBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
    const [maskGrow, setMaskGrow] = useState(0);
    const [maskShapes, setMaskShapes] = useState<MaskShape[]>([]);
    const maskShapesRef = useRef<MaskShape[]>([]);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
    const [bottomBarHover, setBottomBarHover] = useState(false);
    const [lassoNearStart, setLassoNearStart] = useState(false);
    const lassoAnimOffsetRef = useRef(0);
    const lassoAnimRafRef = useRef<number | null>(null);
    const LASSO_SNAP_RADIUS = 18;

    const imageRef = useRef<HTMLImageElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hoverCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const handleCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const rectStartRef = useRef<{ x: number; y: number } | null>(null);
    const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
    const brushPointsRef = useRef<{ x: number; y: number }[]>([]);
    const overlaySnapshotRef = useRef<ImageData | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const startUploadRef = useRef<HTMLInputElement | null>(null);
    const contentSelectRef = useRef<HTMLSelectElement | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const hoverEncodeRef = useRef<{
        data: Uint8ClampedArray;
        width: number;
        height: number;
        scaleX: number;
        scaleY: number;
    } | null>(null);
    const hoverMaskRef = useRef<{ data: Uint8Array; width: number; height: number } | null>(null);
    const hoverTempCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hoverContourCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hoverRafRef = useRef<number | null>(null);
    const lastHoverPointRef = useRef<{ x: number; y: number } | null>(null);
    const lastHoverTimeRef = useRef(0);
    const baseMaskRef = useRef<ImageData | null>(null);
    const isResizingMaskRef = useRef(false);
    const resizeStartRef = useRef({ x: 0, y: 0 });
    const resizeHandleRef = useRef<number | null>(null);
    const resizeShapeBaseRef = useRef<MaskShape | null>(null);
    const resizeGhostBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
    const isDraggingShapeRef = useRef(false);
    const dragShapeStartRef = useRef({ x: 0, y: 0 });
    const dragShapeBaseRef = useRef<MaskShape | null>(null);
    const frameRectRef = useRef<{ width: number; height: number; left: number; top: number }>({ width: 0, height: 0, left: 0, top: 0 });
    const imageNaturalRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
    const maskSessionIdRef = useRef<string | null>(null);
    const remoteMaskImageRef = useRef<HTMLImageElement | null>(null);
    const useRemoteMaskRef = useRef(false);

    const { models: editRegistryModels, loading: editRegistryLoading } = useModelRegistry({
        capability: 'edit',
        billingMode: 'platform',
        providerConnectedOnly: false
    });

    useEffect(() => {
        if (prefilledImageUrl) {
            setSourceImageUrl(prefilledImageUrl);
            // Clear content selection if we are force-injecting an image from playground
            setSelectedContentId('');
        }
    }, [prefilledImageUrl]);

    const editModels = useMemo(() => editRegistryModels.map(mapRegistryToAIModel), [editRegistryModels]);
    const selectedEditRegistry = useMemo(() => editRegistryModels.find((model) => model.id === editModel), [editRegistryModels, editModel]);
    const selectedFeatures = useMemo(() => new Set((selectedEditRegistry?.features || []).map((item) => item.toLowerCase())), [selectedEditRegistry]);
    const supportsMask = selectedFeatures.has('mask');
    const showMaskUI = true;
    const supportsHover = selectedFeatures.has('hover');

    const editPresets: EditPreset[] = [
        {
            id: 'iphone-selfie',
            label: 'iPhone Selfie',
            description: 'Close-up handheld selfie, natural light.',
            promptPrefix: 'iphone selfie, handheld, close-up, natural light,',
            promptSuffix: 'sharp focus, casual vibe',
            defaults: { strength: 0.65, steps: 28 },
            modelIds: ['google/nano-banana-pro']
        },
        {
            id: 'mirror-selfie',
            label: 'Mirror Selfie',
            description: 'Mirror shot, phone visible, indoor lighting.',
            promptPrefix: 'mirror selfie, phone visible, bathroom or bedroom,',
            promptSuffix: 'natural indoor light, realistic',
            defaults: { strength: 0.7, steps: 30 },
            modelIds: ['google/nano-banana-pro']
        },
        {
            id: 'full-body',
            label: 'Full Body',
            description: 'Head-to-toe framing, full body visible.',
            promptPrefix: 'full body shot, head-to-toe framing,',
            promptSuffix: 'clean background, balanced lighting',
            defaults: { strength: 0.72, steps: 32 },
            modelIds: ['google/nano-banana-pro']
        },
        {
            id: 'top-down',
            label: 'Top Down View',
            description: 'Overhead angle, flat-lay feel.',
            promptPrefix: 'top down view, overhead angle,',
            promptSuffix: 'flat lay composition, crisp details',
            defaults: { strength: 0.6, steps: 26 },
            modelIds: ['google/nano-banana-pro']
        },
        {
            id: 'product-shot',
            label: 'Product Shot',
            description: 'Clean product focus, centered framing.',
            promptPrefix: 'product shot, centered composition,',
            promptSuffix: 'studio lighting, high detail',
            defaults: { strength: 0.55, steps: 24 },
            modelIds: ['google/nano-banana-pro']
        },
        {
            id: 'editorial',
            label: 'Editorial',
            description: 'Stylized, magazine look.',
            promptPrefix: 'editorial style, cinematic lighting,',
            promptSuffix: 'high fashion, dramatic mood',
            defaults: { strength: 0.75, steps: 34 },
            modelIds: ['google/nano-banana-pro']
        }
    ];

    const availablePresets = useMemo(() => {
        return editPresets.filter((preset) => preset.modelIds.includes(editModel));
    }, [editModel, editPresets]);

    const applyPreset = (presetId: string) => {
        if (presetId === 'none') return;
        const preset = editPresets.find((item) => item.id === presetId);
        if (!preset) return;
        const parts = [preset.promptPrefix, instruction, preset.promptSuffix || ''];
        const merged = parts.map((part) => (part || '').trim()).filter(Boolean).join(' ');
        setInstruction(merged.trim());
        if (preset.defaults?.strength !== undefined) setEditStrength(preset.defaults.strength);
        if (preset.defaults?.steps !== undefined) setEditSteps(preset.defaults.steps);
    };

    const providerOptions = useMemo(() => {
        const labelMap: Record<string, string> = {
            replicate: 'Replicate',
            huggingface: 'Hugging Face',
            flux: 'Flux'
        };
        const seen = new Set<string>();
        const options: { key: string; label: string }[] = [];
        for (const model of editModels) {
            const providerKey = model.provider.toLowerCase();
            if (!seen.has(providerKey)) {
                seen.add(providerKey);
                options.push({ key: providerKey, label: labelMap[providerKey] || providerKey });
            }
        }
        return options;
    }, [editModels]);

    const availableEditModels = useMemo(() => {
        return editModels.filter((item) => item.provider.toLowerCase() === editProvider);
    }, [editModels, editProvider]);

    useEffect(() => {
        if (!editModels.length) return;
        const current = editModels.find((model) => model.id === editModel);
        if (current) return;
        const nextProvider = providerOptions[0]?.key || editModels[0].provider.toLowerCase();
        const nextModel = editModels.find((model) => model.provider.toLowerCase() === nextProvider) || editModels[0];
        setEditProvider(nextProvider);
        setEditModel(nextModel.id);
    }, [editModels, editModel, providerOptions]);

    useEffect(() => {
        const match = editModels.find((model) => model.id === editModel);
        if (match) {
            setEditProvider(match.provider.toLowerCase());
        }
        setSelectedPresetId('none');
    }, [editModels, editModel]);

    useEffect(() => {
        updateMaskBoundsFromShapes(maskShapesRef.current, selectedShapeId);
    }, [selectedShapeId]);


    useEffect(() => {
        if (!supportsMask || !showMaskUI) {
            if (toolMode === 'rectangle' || toolMode === 'brush' || toolMode === 'lasso' || toolMode === 'select' || toolMode === 'move' || toolMode === 'hover') {
                setToolMode('pan');
            }
            return;
        }
        if (!supportsHover && toolMode === 'hover') {
            setToolMode('brush');
        }
    }, [supportsMask, supportsHover, toolMode, showMaskUI]);

    useEffect(() => {
        const load = async () => {
            const items = await airtable.getContentRecords(50);
            const uniqueMap = new Map<string, ContentSourceItem>();
            items.forEach((item) => {
                if (item.mediaUrl && !uniqueMap.has(item.mediaUrl)) {
                    uniqueMap.set(item.mediaUrl, {
                        id: item.id,
                        name: item.name || 'Untitled Content',
                        mediaUrl: item.mediaUrl
                    });
                }
            });
            setContents(Array.from(uniqueMap.values()));

            const profiles = await airtable.getInfluencerProfiles();
            // Store full profile info including avatar
            setInfluencers(profiles as any);
        };
        load();
    }, [airtable]);

    useEffect(() => {
        if (sourceImageUrl) {
            setToolMode('pan');
        }
    }, [sourceImageUrl]);

    useEffect(() => {
        const checkTransfer = () => {
            const url = localStorage.getItem('bonobooh_studio_transfer_url');
            if (url) {
                setSourceImageUrl(url);
                localStorage.removeItem('bonobooh_studio_transfer_url');
            }
        };
        checkTransfer();
        window.addEventListener('focus', checkTransfer); // also check on focus (tab change might not trigger storage event for same window but sometimes it works)
        const interval = setInterval(checkTransfer, 1000); // Check every second just in case
        return () => {
            window.removeEventListener('focus', checkTransfer);
            clearInterval(interval);
        };
    }, []);

    const cloneShapes = (shapes: MaskShape[]) => shapes.map((shape) => ({
        ...shape,
        points: (shape.points || []).map((point) => ({ x: point.x, y: point.y })),
        bounds: { ...shape.bounds }
    }));

    const computeBoundsFromPoints = (points: { x: number; y: number }[], radius = 0) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        points.forEach((point) => {
            minX = Math.min(minX, point.x - radius);
            minY = Math.min(minY, point.y - radius);
            maxX = Math.max(maxX, point.x + radius);
            maxY = Math.max(maxY, point.y + radius);
        });
        if (!isFinite(minX)) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        return { minX, minY, maxX, maxY };
    };

    const computeShapeBounds = (shape: MaskShape) => {
        if (shape.type === 'raster' && shape.raster) {
            const offsetX = shape.offsetX || 0;
            const offsetY = shape.offsetY || 0;
            return {
                minX: offsetX,
                minY: offsetY,
                maxX: offsetX + shape.raster.width,
                maxY: offsetY + shape.raster.height
            };
        }
        return computeBoundsFromPoints(shape.points || [], shape.radius || 0);
    };

    const pointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.00001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const hitTestShape = (shape: MaskShape, point: { x: number; y: number }) => {
        if (shape.type === 'raster') return false;
        if (point.x < shape.bounds.minX || point.x > shape.bounds.maxX || point.y < shape.bounds.minY || point.y > shape.bounds.maxY) return false;
        if (shape.type === 'lasso') {
            return pointInPolygon(point, shape.points || []);
        }
        const radius = shape.radius || brushSize;
        return (shape.points || []).some((p) => {
            const dx = point.x - p.x;
            const dy = point.y - p.y;
            return dx * dx + dy * dy <= radius * radius;
        });
    };

    const findShapeAtPoint = (point: { x: number; y: number }) => {
        const shapes = maskShapesRef.current;
        for (let i = shapes.length - 1; i >= 0; i -= 1) {
            const shape = shapes[i];
            if (hitTestShape(shape, point)) return shape;
        }
        return null;
    };

    const translateShape = (shape: MaskShape, dx: number, dy: number) => {
        if (shape.type === 'raster') {
            const offsetX = (shape.offsetX || 0) + dx;
            const offsetY = (shape.offsetY || 0) + dy;
            return {
                ...shape,
                offsetX,
                offsetY,
                bounds: computeShapeBounds({ ...shape, offsetX, offsetY })
            };
        }
        const points = (shape.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy }));
        return {
            ...shape,
            points,
            bounds: computeBoundsFromPoints(points, shape.radius || 0)
        };
    };

    const renderMaskFromShapes = (shapes: MaskShape[]) => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;

        maskCtx.clearRect(0, 0, mask.width, mask.height);
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, mask.width, mask.height);

        shapes.forEach((shape) => {
            if (shape.type === 'raster' && shape.raster) {
                const ox = shape.offsetX || 0;
                const oy = shape.offsetY || 0;
                maskCtx.putImageData(shape.raster, ox, oy);
                return;
            }
            if (shape.type === 'lasso' && shape.points && shape.points.length > 2) {
                maskCtx.fillStyle = 'white';
                maskCtx.beginPath();
                maskCtx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i += 1) {
                    maskCtx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                maskCtx.closePath();
                maskCtx.fill();
                return;
            }
            if (shape.type === 'brush' && shape.points) {
                maskCtx.fillStyle = 'white';
                shape.points.forEach((p) => {
                    maskCtx.beginPath();
                    maskCtx.arc(p.x, p.y, shape.radius || brushSize, 0, Math.PI * 2);
                    maskCtx.fill();
                });
            }
        });

        baseMaskRef.current = maskCtx.getImageData(0, 0, mask.width, mask.height);
        if (maskGrow !== 0) {
            applyMaskGrow(maskGrow, baseMaskRef.current);
        } else {
            redrawOverlayFromMask();
            updateMaskBoundsFromShapes(shapes, selectedShapeId);
        }
    };

    const updateMaskBoundsFromShapes = (shapes: MaskShape[], focusId?: string | null) => {
        if (!shapes.length) {
            setMaskBounds(null);
            return;
        }
        const focusShape = focusId ? shapes.find((shape) => shape.id === focusId) : null;
        if (focusShape) {
            setMaskBounds({ ...focusShape.bounds });
            return;
        }
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        shapes.forEach((shape) => {
            minX = Math.min(minX, shape.bounds.minX);
            minY = Math.min(minY, shape.bounds.minY);
            maxX = Math.max(maxX, shape.bounds.maxX);
            maxY = Math.max(maxY, shape.bounds.maxY);
        });
        if (!isFinite(minX)) {
            setMaskBounds(null);
            return;
        }
        setMaskBounds({ minX, minY, maxX, maxY });
    };

    const applyShapes = (nextShapes: MaskShape[], push = true) => {
        maskShapesRef.current = nextShapes;
        setMaskShapes(nextShapes);
        if (push) {
            const nextHistory = historyRef.current.slice(0, historyIndex + 1);
            nextHistory.push({ shapes: cloneShapes(nextShapes), maskGrow });
            historyRef.current = nextHistory;
            setHistoryIndex(nextHistory.length - 1);
        }
        renderMaskFromShapes(nextShapes);
    };

    useEffect(() => {
        if (!selectedContentId) return;
        const item = contents.find((content) => content.id === selectedContentId);
        if (!item?.mediaUrl) return;
        setSourceImageUrl(item.mediaUrl);
        setSourceFile(null);
        setPreviewUrl('');
        setTimeout(resizeCanvases, 0);
    }, [selectedContentId, contents]);

    useEffect(() => {
        maskSessionIdRef.current = null;
        useRemoteMaskRef.current = false;
        hoverMaskRef.current = null;
        remoteMaskImageRef.current = null;
        clearHoverPreview();
    }, [sourceImageUrl]);

    const resizeCanvases = () => {
        const img = imageRef.current;
        const container = containerRef.current;
        const overlay = overlayCanvasRef.current;
        const hover = hoverCanvasRef.current;
        const handles = handleCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!img || !overlay || !mask || !hover || !handles || !container) return;

        const containerRect = container.getBoundingClientRect();
        const naturalWidth = img.naturalWidth || img.clientWidth;
        const naturalHeight = img.naturalHeight || img.clientHeight;
        if (!naturalWidth || !naturalHeight) return;
        imageNaturalRef.current = { width: naturalWidth, height: naturalHeight };
        const scale = Math.min(containerRect.width / naturalWidth, containerRect.height / naturalHeight);
        const width = Math.max(1, Math.round(naturalWidth * scale));
        const height = Math.max(1, Math.round(naturalHeight * scale));
        const left = Math.round((containerRect.width - width) / 2);
        const top = Math.round((containerRect.height - height) / 2);
        if (!width || !height) return;

        overlay.width = width;
        overlay.height = height;
        hover.width = width;
        hover.height = height;
        handles.width = width;
        handles.height = height;
        mask.width = width;
        mask.height = height;
        frameRectRef.current = { width, height, left, top };

        const maskCtx = mask.getContext('2d');
        if (maskCtx) {
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, width, height);
        }
        const overlayCtx = overlay.getContext('2d');
        if (overlayCtx) {
            overlayCtx.clearRect(0, 0, width, height);
        }
        const hoverCtx = hover.getContext('2d');
        if (hoverCtx) {
            hoverCtx.clearRect(0, 0, width, height);
        }
        const handleCtx = handles.getContext('2d');
        if (handleCtx) {
            handleCtx.clearRect(0, 0, width, height);
        }
        historyRef.current = [];
        setHistoryIndex(-1);
        setMaskBounds(null);
    };

    const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width ? canvas.width / rect.width : 1;
        const scaleY = rect.height ? canvas.height / rect.height : 1;
        let x = (event.clientX - rect.left) * scaleX;
        let y = (event.clientY - rect.top) * scaleY;
        x = Math.max(0, Math.min(canvas.width - 1, x));
        y = Math.max(0, Math.min(canvas.height - 1, y));
        return { x, y };
    };

    const drawBrush = (x: number, y: number) => {
        const overlay = overlayCanvasRef.current;
        if (!overlay) return;
        const overlayCtx = overlay.getContext('2d');
        if (!overlayCtx) return;
        overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, brushSize, 0, Math.PI * 2);
        overlayCtx.fill();
    };

    const drawRectanglePreview = (start: { x: number; y: number }, current: { x: number; y: number }) => {
        const overlay = overlayCanvasRef.current;
        if (!overlay) return;
        const overlayCtx = overlay.getContext('2d');
        if (!overlayCtx) return;

        if (overlaySnapshotRef.current) {
            overlayCtx.putImageData(overlaySnapshotRef.current, 0, 0);
        }

        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const width = Math.abs(start.x - current.x);
        const height = Math.abs(start.y - current.y);
        overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        overlayCtx.fillRect(x, y, width, height);
    };

    const drawLassoPreview = (points: { x: number; y: number }[], animOffset = 0) => {
        if (points.length < 2) return;
        const overlay = overlayCanvasRef.current;
        if (!overlay) return;
        const overlayCtx = overlay.getContext('2d');
        if (!overlayCtx) return;
        if (overlaySnapshotRef.current) {
            overlayCtx.putImageData(overlaySnapshotRef.current, 0, 0);
        }

        const first = points[0];
        const last = points[points.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const nearStart = Math.sqrt(dx * dx + dy * dy) < LASSO_SNAP_RADIUS && points.length > 3;

        // Semi-transparent fill preview
        overlayCtx.beginPath();
        overlayCtx.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i += 1) {
            overlayCtx.lineTo(points[i].x, points[i].y);
        }
        overlayCtx.closePath();
        overlayCtx.fillStyle = nearStart
            ? 'rgba(34, 197, 94, 0.22)'
            : 'rgba(239, 68, 68, 0.18)';
        overlayCtx.fill();

        // Marching ants outline
        overlayCtx.beginPath();
        overlayCtx.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i += 1) {
            overlayCtx.lineTo(points[i].x, points[i].y);
        }
        // Shadow for contrast
        overlayCtx.shadowColor = 'rgba(0,0,0,0.6)';
        overlayCtx.shadowBlur = 3;
        overlayCtx.strokeStyle = nearStart ? 'rgba(34, 197, 94, 1)' : 'rgba(255, 255, 255, 0.95)';
        overlayCtx.lineWidth = nearStart ? 2.5 : 2;
        overlayCtx.setLineDash([8, 5]);
        overlayCtx.lineDashOffset = -animOffset;
        overlayCtx.stroke();
        overlayCtx.shadowBlur = 0;
        overlayCtx.setLineDash([]);

        // Start anchor dot
        overlayCtx.beginPath();
        overlayCtx.arc(first.x, first.y, nearStart ? 9 : 5, 0, Math.PI * 2);
        overlayCtx.fillStyle = nearStart ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255,255,255,0.9)';
        overlayCtx.fill();
        overlayCtx.strokeStyle = 'rgba(0,0,0,0.5)';
        overlayCtx.lineWidth = 1.5;
        overlayCtx.stroke();
    };

    // Start marching-ants animation loop while lasso is being drawn
    const startLassoAnim = () => {
        if (lassoAnimRafRef.current !== null) return;
        const tick = () => {
            lassoAnimOffsetRef.current = (lassoAnimOffsetRef.current + 0.6) % 26;
            const pts = lassoPointsRef.current;
            if (pts.length >= 2) {
                const smoothed = smoothLasso(pts, lassoSmooth);
                drawLassoPreview(smoothed, lassoAnimOffsetRef.current);
                // Update snap state for cursor
                const first = pts[0];
                const last = pts[pts.length - 1];
                const d = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
                setLassoNearStart(d < LASSO_SNAP_RADIUS && pts.length > 3);
            }
            lassoAnimRafRef.current = requestAnimationFrame(tick);
        };
        lassoAnimRafRef.current = requestAnimationFrame(tick);
    };

    const stopLassoAnim = () => {
        if (lassoAnimRafRef.current !== null) {
            cancelAnimationFrame(lassoAnimRafRef.current);
            lassoAnimRafRef.current = null;
        }
        setLassoNearStart(false);
    };

    const smoothLasso = (points: { x: number; y: number }[], smoothLevel: number) => {
        if (points.length < 3 || smoothLevel <= 0) return points;
        const iterations = Math.min(3, Math.floor(smoothLevel / 35));
        let output = points;
        for (let i = 0; i < iterations; i += 1) {
            const next: { x: number; y: number }[] = [];
            for (let j = 0; j < output.length - 1; j += 1) {
                const p0 = output[j];
                const p1 = output[j + 1];
                next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
                next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
            }
            output = next;
        }
        return output;
    };

    const commitLasso = (points: { x: number; y: number }[]) => {
        stopLassoAnim();
        if (points.length < 3) return;
        const smoothPoints = smoothLasso(points, lassoSmooth);
        const shape: MaskShape = {
            id: `lasso-${Date.now()}`,
            type: 'lasso',
            points: smoothPoints,
            bounds: computeBoundsFromPoints(smoothPoints)
        };
        applyShapes([...maskShapesRef.current, shape], true);
        setSelectedShapeId(shape.id);
        setToolMode('select');
    };

    const commitBrush = (points: { x: number; y: number }[]) => {
        if (points.length === 0) return;
        const shape: MaskShape = {
            id: `brush-${Date.now()}`,
            type: 'brush',
            points,
            radius: brushSize,
            bounds: computeBoundsFromPoints(points, brushSize)
        };
        applyShapes([...maskShapesRef.current, shape], true);
        setSelectedShapeId(shape.id);
        setToolMode('select');
    };

    const deleteSelectedShape = () => {
        if (!selectedShapeId) return;
        const nextShapes = maskShapesRef.current.filter((shape) => shape.id !== selectedShapeId);
        setSelectedShapeId(null);
        applyShapes(nextShapes, true);
    };

    const duplicateSelectedShape = () => {
        if (!selectedShapeId) return;
        const shape = maskShapesRef.current.find((item) => item.id === selectedShapeId);
        if (!shape) return;
        const duplicated = translateShape({ ...shape, id: `${shape.id}-copy-${Date.now()}` }, 12, 12);
        applyShapes([...maskShapesRef.current, duplicated], true);
        setSelectedShapeId(duplicated.id);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (!selectedShapeId) return;
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                deleteSelectedShape();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                duplicateSelectedShape();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedShapeId, deleteSelectedShape, duplicateSelectedShape]);

    const addRasterShape = (imageData: ImageData) => {
        const shape: MaskShape = {
            id: `raster-${Date.now()}`,
            type: 'raster',
            raster: imageData,
            offsetX: 0,
            offsetY: 0,
            bounds: {
                minX: 0,
                minY: 0,
                maxX: imageData.width,
                maxY: imageData.height
            }
        };
        applyShapes([...maskShapesRef.current, shape], true);
        setSelectedShapeId(shape.id);
    };
    const commitRectangle = (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;

        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(start.x - end.x);
        const height = Math.abs(start.y - end.y);

        overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        overlayCtx.fillRect(x, y, width, height);

        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(x, y, width, height);
        pushHistory();
    };

    const updateMaskBounds = () => {
        updateMaskBoundsFromShapes(maskShapesRef.current, selectedShapeId);
    };

    const drawMaskOverlay = (maskData: ImageData | { data: Uint8Array; width: number; height: number }, ctx: CanvasRenderingContext2D, options?: { fillAlpha?: number; strokeAlpha?: number }) => {
        const fillAlpha = options?.fillAlpha ?? 0.55;
        const strokeAlpha = options?.strokeAlpha ?? 0.95;
        const width = (maskData as ImageData).width || (maskData as any).width;
        const height = (maskData as ImageData).height || (maskData as any).height;
        const data = (maskData as ImageData).data ? (maskData as ImageData).data : undefined;
        const mask = (maskData as any).data as Uint8Array | undefined;
        const overlayData = ctx.createImageData(width, height);
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const idx = (y * width + x) * 4;
                const maskValue = data ? data[idx] : (mask ? mask[y * width + x] * 255 : 0);
                if (maskValue > 10) {
                    overlayData.data[idx] = 220;
                    overlayData.data[idx + 1] = 240;
                    overlayData.data[idx + 2] = 255;
                    overlayData.data[idx + 3] = Math.floor(255 * fillAlpha);
                }
            }
        }
        ctx.putImageData(overlayData, 0, 0);

        // Edge stroke (light blue) - 3px thickness
        const strokeData = ctx.createImageData(width, height);
        const strokeRadius = 1;
        for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
                const idx = (y * width + x) * 4;
                const center = data ? data[idx] : (mask ? mask[y * width + x] * 255 : 0);
                if (center <= 10) continue;
                const left = data ? data[idx - 4] : (mask ? mask[y * width + (x - 1)] * 255 : 0);
                const right = data ? data[idx + 4] : (mask ? mask[y * width + (x + 1)] * 255 : 0);
                const up = data ? data[idx - width * 4] : (mask ? mask[(y - 1) * width + x] * 255 : 0);
                const down = data ? data[idx + width * 4] : (mask ? mask[(y + 1) * width + x] * 255 : 0);
                if (left <= 10 || right <= 10 || up <= 10 || down <= 10) {
                    for (let oy = -strokeRadius; oy <= strokeRadius; oy += 1) {
                        for (let ox = -strokeRadius; ox <= strokeRadius; ox += 1) {
                            const nx = x + ox;
                            const ny = y + oy;
                            if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
                            const nIdx = (ny * width + nx) * 4;
                            strokeData.data[nIdx] = 209;
                            strokeData.data[nIdx + 1] = 232;
                            strokeData.data[nIdx + 2] = 255;
                            strokeData.data[nIdx + 3] = Math.floor(255 * strokeAlpha);
                        }
                    }
                }
            }
        }
        ctx.putImageData(strokeData, 0, 0);
    };

    const redrawOverlayFromMask = () => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);
        drawMaskOverlay(maskData, overlayCtx, { fillAlpha: 0.42, strokeAlpha: 0.95 });
    };

    const applyMaskGrow = (pixels: number, baseMask?: ImageData | null) => {
        const mask = maskCanvasRef.current;
        const sourceMask = baseMask || baseMaskRef.current;
        if (!mask || !sourceMask) return;
        const maskCtx = mask.getContext('2d');
        if (!maskCtx) return;
        const width = mask.width;
        const height = mask.height;
        const baseData = sourceMask.data;
        const result = maskCtx.createImageData(width, height);
        const out = result.data;
        const radius = Math.abs(pixels);
        const grow = pixels >= 0;
        const stride = width * 4;

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                let hit = grow ? 0 : 1;
                const yMin = Math.max(0, y - radius);
                const yMax = Math.min(height - 1, y + radius);
                const xMin = Math.max(0, x - radius);
                const xMax = Math.min(width - 1, x + radius);
                for (let yy = yMin; yy <= yMax; yy += 1) {
                    const rowOffset = yy * stride;
                    for (let xx = xMin; xx <= xMax; xx += 1) {
                        const idx = rowOffset + xx * 4;
                        const active = baseData[idx] > 10;
                        if (grow) {
                            if (active) {
                                hit = 1;
                                yy = yMax + 1;
                                break;
                            }
                        } else {
                            if (!active) {
                                hit = 0;
                                yy = yMax + 1;
                                break;
                            }
                        }
                    }
                }
                const outIdx = (y * width + x) * 4;
                if (hit) {
                    out[outIdx] = 255;
                    out[outIdx + 1] = 255;
                    out[outIdx + 2] = 255;
                    out[outIdx + 3] = 255;
                }
            }
        }

        maskCtx.putImageData(result, 0, 0);
        redrawOverlayFromMask();
        updateMaskBounds();
    };

    const getHandleHit = (point: { x: number; y: number }) => {
        if (!maskBounds) return null;
        const { minX, minY, maxX, maxY } = maskBounds;
        const handleSize = 10;
        const handlePoints = [
            [minX, minY],
            [maxX, minY],
            [minX, maxY],
            [maxX, maxY],
            [minX + (maxX - minX) / 2, minY],
            [minX + (maxX - minX) / 2, maxY],
            [minX, minY + (maxY - minY) / 2],
            [maxX, minY + (maxY - minY) / 2]
        ];
        for (let i = 0; i < handlePoints.length; i += 1) {
            const [x, y] = handlePoints[i];
            if (Math.abs(point.x - x) <= handleSize && Math.abs(point.y - y) <= handleSize) {
                return i;
            }
        }
        return null;
    };

    const renderMaskHandles = () => {
        const canvas = handleCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!maskBounds) return;
        if (resizeGhostBoundsRef.current) {
            const ghost = resizeGhostBoundsRef.current;
            const ghostWidth = ghost.maxX - ghost.minX;
            const ghostHeight = ghost.maxY - ghost.minY;
            ctx.strokeStyle = 'rgba(226,232,240,0.85)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(ghost.minX - 2, ghost.minY - 2, ghostWidth + 4, ghostHeight + 4);
            ctx.setLineDash([]);
        }
        const { minX, minY, maxX, maxY } = maskBounds;
        const width = maxX - minX;
        const height = maxY - minY;
        if (selectedShapeId) {
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(minX - 3, minY - 3, width + 6, height + 6);
        }
        ctx.strokeStyle = 'rgba(96,165,250,0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX - 2, minY - 2, width + 4, height + 4);
        ctx.setLineDash([]);
        const handleSize = 8;
        const handlePoints = [
            [minX, minY],
            [maxX, minY],
            [minX, maxY],
            [maxX, maxY],
            [minX + width / 2, minY],
            [minX + width / 2, maxY],
            [minX, minY + height / 2],
            [maxX, minY + height / 2]
        ];
        ctx.fillStyle = 'rgba(12,12,16,0.85)';
        ctx.strokeStyle = 'rgba(96,165,250,0.9)';
        handlePoints.forEach(([x, y]) => {
            ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        });
    };

    const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!sourceImageUrl) return;
        if (toolMode === 'pan') {
            isPanningRef.current = true;
            panStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
            return;
        }
        if (toolMode === 'select') {
            const point = getCanvasPoint(event);
            const handleHit = getHandleHit(point);
            if (handleHit !== null && selectedShapeId) {
                const shape = maskShapesRef.current.find((item) => item.id === selectedShapeId) || null;
                if (shape && shape.type !== 'raster') {
                    isResizingMaskRef.current = true;
                    resizeHandleRef.current = handleHit;
                    resizeStartRef.current = point;
                    resizeShapeBaseRef.current = shape;
                    return;
                }
            }
            const hit = findShapeAtPoint(point);
            if (hit) {
                setSelectedShapeId(hit.id);
                isDraggingShapeRef.current = true;
                dragShapeStartRef.current = point;
                dragShapeBaseRef.current = hit;
            } else {
                setSelectedShapeId(null);
            }
            return;
        }
        if (toolMode === 'hover') {
            const point = getCanvasPoint(event);
            // If no local mask yet, compute one immediately
            if (!hoverMaskRef.current) {
                const maskData = computeHoverMask(point.x, point.y);
                hoverMaskRef.current = maskData;
                renderHoverPreview(maskData);
            }
            // Apply local mask immediately to canvas
            applyHoverMask();
            // Then launch SAM2 in background to upgrade the mask
            if (useRemoteMaskRef.current && maskSessionIdRef.current) {
                triggerSAMMask(point);
            }
            return;
        }
        isDrawingRef.current = true;
        const point = getCanvasPoint(event);
        if (toolMode === 'brush') {
            brushPointsRef.current = [point];
            drawBrush(point.x, point.y);
        } else if (toolMode === 'lasso') {
            lassoPointsRef.current = [point];
            lassoAnimOffsetRef.current = 0;
            const overlay = overlayCanvasRef.current;
            const overlayCtx = overlay?.getContext('2d');
            if (overlay && overlayCtx) {
                overlaySnapshotRef.current = overlayCtx.getImageData(0, 0, overlay.width, overlay.height);
            }
            startLassoAnim();
        } else {
            rectStartRef.current = point;
            const overlay = overlayCanvasRef.current;
            const overlayCtx = overlay?.getContext('2d');
            if (overlay && overlayCtx) {
                overlaySnapshotRef.current = overlayCtx.getImageData(0, 0, overlay.width, overlay.height);
            }
        }
    };

    const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (toolMode === 'pan' && isPanningRef.current) {
            setPan({
                x: event.clientX - panStartRef.current.x,
                y: event.clientY - panStartRef.current.y
            });
            return;
        }
        if (toolMode === 'select' && isResizingMaskRef.current && resizeShapeBaseRef.current && resizeHandleRef.current !== null) {
            const point = getCanvasPoint(event);
            const baseShape = resizeShapeBaseRef.current;
            const bounds = baseShape.bounds;
            let anchorX = bounds.minX;
            let anchorY = bounds.minY;
            if (resizeHandleRef.current === 0) { // top-left
                anchorX = bounds.maxX;
                anchorY = bounds.maxY;
            } else if (resizeHandleRef.current === 1) { // top-right
                anchorX = bounds.minX;
                anchorY = bounds.maxY;
            } else if (resizeHandleRef.current === 2) { // bottom-left
                anchorX = bounds.maxX;
                anchorY = bounds.minY;
            } else if (resizeHandleRef.current === 3) { // bottom-right
                anchorX = bounds.minX;
                anchorY = bounds.minY;
            } else if (resizeHandleRef.current === 4) { // mid-top
                anchorX = (bounds.minX + bounds.maxX) / 2;
                anchorY = bounds.maxY;
            } else if (resizeHandleRef.current === 5) { // mid-bottom
                anchorX = (bounds.minX + bounds.maxX) / 2;
                anchorY = bounds.minY;
            } else if (resizeHandleRef.current === 6) { // mid-left
                anchorX = bounds.maxX;
                anchorY = (bounds.minY + bounds.maxY) / 2;
            } else if (resizeHandleRef.current === 7) { // mid-right
                anchorX = bounds.minX;
                anchorY = (bounds.minY + bounds.maxY) / 2;
            }
            const baseDx = (resizeStartRef.current.x - anchorX) || 1;
            const baseDy = (resizeStartRef.current.y - anchorY) || 1;
            const nextDx = point.x - anchorX;
            const nextDy = point.y - anchorY;
            let scaleX = nextDx / baseDx;
            let scaleY = nextDy / baseDy;
            if ([4,5].includes(resizeHandleRef.current)) {
                scaleX = 1;
            }
            if ([6,7].includes(resizeHandleRef.current)) {
                scaleY = 1;
            }
            if (event.shiftKey) {
                const uniform = Math.max(Math.abs(scaleX || 1), Math.abs(scaleY || 1));
                scaleX = uniform;
                scaleY = uniform;
            }
            scaleX = Math.max(0.1, scaleX);
            scaleY = Math.max(0.1, scaleY);
            const points = (baseShape.points || []).map((p) => ({
                x: anchorX + (p.x - anchorX) * scaleX,
                y: anchorY + (p.y - anchorY) * scaleY
            }));
            const resized: MaskShape = {
                ...baseShape,
                points,
                bounds: computeBoundsFromPoints(points, baseShape.radius || 0)
            };
            resizeGhostBoundsRef.current = resized.bounds;
            const nextShapes = maskShapesRef.current.map((shape) => shape.id === baseShape.id ? resized : shape);
            applyShapes(nextShapes, false);
            renderMaskHandles();
            return;
        }
        if (toolMode === 'select' && isDraggingShapeRef.current && dragShapeBaseRef.current) {
            const point = getCanvasPoint(event);
            const dx = point.x - dragShapeStartRef.current.x;
            const dy = point.y - dragShapeStartRef.current.y;
            const baseShape = dragShapeBaseRef.current;
            const updated = translateShape(baseShape, dx, dy);
            const nextShapes = maskShapesRef.current.map((shape) => shape.id === baseShape.id ? updated : shape);
            applyShapes(nextShapes, false);
            return;
        }
        if (toolMode === 'hover') {
            const point = getCanvasPoint(event);
            scheduleHoverMask(point);
            return;
        }
        if (!isDrawingRef.current) return;
        const point = getCanvasPoint(event);
        if (toolMode === 'brush') {
            brushPointsRef.current = [...brushPointsRef.current, point];
            drawBrush(point.x, point.y);
        } else if (toolMode === 'lasso') {
            lassoPointsRef.current = [...lassoPointsRef.current, point];
            // Animation loop handles the redraw; no need to call drawLassoPreview here
        } else if (rectStartRef.current) {
            drawRectanglePreview(rectStartRef.current, point);
        }
    };

    const handlePointerUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (toolMode === 'pan' && isPanningRef.current) {
            isPanningRef.current = false;
            return;
        }
        if (toolMode === 'select' && isDraggingShapeRef.current) {
            isDraggingShapeRef.current = false;
            dragShapeBaseRef.current = null;
            pushHistory();
            return;
        }
        if (toolMode === 'select' && isResizingMaskRef.current) {
            isResizingMaskRef.current = false;
            resizeShapeBaseRef.current = null;
            resizeHandleRef.current = null;
            resizeGhostBoundsRef.current = null;
            renderMaskHandles();
            pushHistory();
            return;
        }
        if (toolMode === 'hover') {
            return;
        }
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        const point = getCanvasPoint(event);
        if (toolMode === 'rectangle' && rectStartRef.current) {
            commitRectangle(rectStartRef.current, point);
            pushHistory();
        } else if (toolMode === 'lasso') {
            // Auto-close if near start point
            const pts = lassoPointsRef.current;
            if (pts.length > 3) {
                const first = pts[0];
                const dx = point.x - first.x;
                const dy = point.y - first.y;
                if (Math.sqrt(dx * dx + dy * dy) < LASSO_SNAP_RADIUS) {
                    // Snap to close
                    commitLasso(pts);
                    lassoPointsRef.current = [];
                    rectStartRef.current = null;
                    overlaySnapshotRef.current = null;
                    return;
                }
            }
            commitLasso(lassoPointsRef.current);
            lassoPointsRef.current = [];
        } else if (toolMode === 'brush') {
            commitBrush(brushPointsRef.current);
            brushPointsRef.current = [];
        }
        rectStartRef.current = null;
        overlaySnapshotRef.current = null;
    };

    const handlePointerLeave = () => {
        if (toolMode === 'hover') {
            hoverMaskRef.current = null;
            clearHoverPreview();
        }
        if (toolMode === 'lasso' && isDrawingRef.current) {
            stopLassoAnim();
        }
        handlePointerUp({} as React.MouseEvent<HTMLCanvasElement>);
    };

    const clearMask = () => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, mask.width, mask.height);
        maskShapesRef.current = [];
        setMaskShapes([]);
        setSelectedShapeId(null);
        setMaskGrow(0);
        historyRef.current = [];
        setHistoryIndex(-1);
        baseMaskRef.current = null;
        setMaskBounds(null);
    };

    const autoMaskSimple = () => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;

        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, mask.width, mask.height);

        const padX = Math.floor(overlay.width * 0.15);
        const padY = Math.floor(overlay.height * 0.15);
        const width = overlay.width - padX * 2;
        const height = overlay.height - padY * 2;

        overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        overlayCtx.fillRect(padX, padY, width, height);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(padX, padY, width, height);
        pushHistory();
    };

    const applyMaskFromUrl = async (url: string) => {
        const overlay = overlayCanvasRef.current;
        const mask = maskCanvasRef.current;
        if (!overlay || !mask) return;
        const overlayCtx = overlay.getContext('2d');
        const maskCtx = mask.getContext('2d');
        if (!overlayCtx || !maskCtx) return;

        const maskImg = new Image();
        maskImg.crossOrigin = 'anonymous';
        maskImg.onload = () => {
            maskCtx.clearRect(0, 0, mask.width, mask.height);
            maskCtx.drawImage(maskImg, 0, 0, mask.width, mask.height);
            const data = maskCtx.getImageData(0, 0, mask.width, mask.height);
            addRasterShape(data);
        };
        maskImg.src = url;
    };

    const autoMaskML = async () => {
        if (!sourceImageUrl) {
            setStatus('Add an image first.');
            return;
        }
        setStatus('Auto-masking...');
        try {
            const referenceUrl = await uploadSourceIfNeeded();
            if (!referenceUrl) {
                setStatus('Upload or select an image first.');
                return;
            }
            const result = await backendService.autoMask({
                provider: defaultImageProvider,
                model: defaultAutoMaskModel,
                imageUrl: referenceUrl
            });
            await applyMaskFromUrl(result.mask_url);
            setStatus('Auto-mask ready.');
        } catch (error) {
            console.error('Auto-mask error', error);
            setStatus(`Auto-mask failed: ${String(error)}`);
        }
    };

    const handleSourceUpload = (file: File) => {
        const url = URL.createObjectURL(file);
        setSourceFile(file);
        setSourceImageUrl(url);
        setSelectedContentId('');
        setPreviewUrl('');
        setPreviewOpen(false);
        setTimeout(resizeCanvases, 0);
    };

    const pushHistory = () => {
        const nextHistory = historyRef.current.slice(0, historyIndex + 1);
        nextHistory.push({ shapes: cloneShapes(maskShapesRef.current), maskGrow });
        historyRef.current = nextHistory;
        setHistoryIndex(nextHistory.length - 1);
        updateMaskBounds();
    };

    const applyHistory = (index: number) => {
        const entry = historyRef.current[index];
        if (!entry) return;
        setHistoryIndex(index);
        setMaskGrow(entry.maskGrow);
        maskShapesRef.current = cloneShapes(entry.shapes);
        setMaskShapes(maskShapesRef.current);
        renderMaskFromShapes(maskShapesRef.current);
    };

    const undo = () => {
        if (historyIndex <= 0) return;
        applyHistory(historyIndex - 1);
    };

    const redo = () => {
        if (historyIndex >= historyRef.current.length - 1) return;
        applyHistory(historyIndex + 1);
    };

    const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        dragOffsetRef.current = {
            x: event.clientX - toolboxPos.x,
            y: event.clientY - toolboxPos.y
        };
    };

    const onDrag = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const nextX = Math.max(12, event.clientX - dragOffsetRef.current.x);
        const nextY = Math.max(12, event.clientY - dragOffsetRef.current.y);
        setToolboxPos({ x: nextX, y: nextY });
    };

    const stopDrag = (event?: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        if (!event) return;
        const host = event.currentTarget.parentElement as HTMLDivElement | null;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        if (event.clientY > rect.top + rect.height * 0.65) {
            setToolboxPos({ x: 24, y: rect.height - 120 });
        }
    };

    const fitToView = () => {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!img || !container) return;
        const w = img.naturalWidth || img.clientWidth;
        const h = img.naturalHeight || img.clientHeight;
        if (!w || !h) return;
        const rect = container.getBoundingClientRect();
        const scale = Math.min(rect.width / w, rect.height / h);
        setZoom(Number(scale.toFixed(2)));
        setPan({ x: 0, y: 0 });
    };

    const clearHoverPreview = () => {
        const hover = hoverCanvasRef.current;
        const hoverCtx = hover?.getContext('2d');
        if (hover && hoverCtx) {
            hoverCtx.clearRect(0, 0, hover.width, hover.height);
        }
    };

    const encodeImageForHover = () => {
        const img = imageRef.current;
        const overlay = overlayCanvasRef.current;
        if (!img || !overlay) return;
        const naturalWidth = img.naturalWidth || overlay.width;
        const naturalHeight = img.naturalHeight || overlay.height;
        if (!naturalWidth || !naturalHeight) return;
        // Higher resolution = finer mask, less fragmentation
        const maxDim = 520;
        const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
        const width = Math.max(1, Math.round(naturalWidth * scale));
        const height = Math.max(1, Math.round(naturalHeight * scale));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        // Smooth downscale to reduce noise
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        try {
            tempCtx.drawImage(img, 0, 0, width, height);
            const imageData = tempCtx.getImageData(0, 0, width, height);
            hoverEncodeRef.current = {
                data: imageData.data,
                width,
                height,
                scaleX: width / overlay.width,
                scaleY: height / overlay.height
            };
            hoverMaskRef.current = null;
            clearHoverPreview();
        } catch (e) {
            console.warn('Segmentation (Hover) disabled: Security constraint on cross-origin image.', e);
            // Gracefully degrade: Hover won't work, but Editor stays alive
            hoverEncodeRef.current = null;
        }
    };

    const computeHoverMask = (x: number, y: number) => {
        const encoded = hoverEncodeRef.current;
        if (!encoded) return null;
        const startX = Math.max(0, Math.min(encoded.width - 1, Math.round(x * encoded.scaleX)));
        const startY = Math.max(0, Math.min(encoded.height - 1, Math.round(y * encoded.scaleY)));

        // Sample average color in a 3x3 area around cursor for robustness
        let sumR = 0; let sumG = 0; let sumB = 0; let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const sx = Math.max(0, Math.min(encoded.width - 1, startX + dx));
                const sy = Math.max(0, Math.min(encoded.height - 1, startY + dy));
                const pi = (sy * encoded.width + sx) * 4;
                sumR += encoded.data[pi]; sumG += encoded.data[pi + 1]; sumB += encoded.data[pi + 2];
                count++;
            }
        }
        const targetR = sumR / count;
        const targetG = sumG / count;
        const targetB = sumB / count;

        // Perceptual tolerance: weight green channel more (eye is more sensitive)
        const tolerance = hoverTolerance;
        const totalPixels = encoded.width * encoded.height;
        const mask = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;
        const startLinear = startY * encoded.width + startX;
        queue[tail++] = startLinear;
        mask[startLinear] = 1;

        while (head < tail) {
            const idx = queue[head++];
            const px = idx % encoded.width;
            const py = (idx / encoded.width) | 0;
            const neighbors = [
                [px + 1, py],
                [px - 1, py],
                [px, py + 1],
                [px, py - 1]
            ];
            for (let i = 0; i < neighbors.length; i += 1) {
                const [nx, ny] = neighbors[i];
                if (nx < 0 || ny < 0 || nx >= encoded.width || ny >= encoded.height) continue;
                const nIdx = ny * encoded.width + nx;
                if (mask[nIdx]) continue;
                const pixelIndex = nIdx * 4;
                const dr = encoded.data[pixelIndex] - targetR;
                const dg = encoded.data[pixelIndex + 1] - targetG;
                const db = encoded.data[pixelIndex + 2] - targetB;
                // Perceptual weighting (luminance-weighted)
                const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
                if (dist <= tolerance) {
                    mask[nIdx] = 1;
                    queue[tail++] = nIdx;
                }
            }
        }

        // Morphological close: dilate then erode to fill small holes
        const radius = 2;
        const w = encoded.width;
        const h = encoded.height;
        const dilated = new Uint8Array(totalPixels);
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                if (mask[py * w + px]) {
                    const y0 = Math.max(0, py - radius); const y1 = Math.min(h - 1, py + radius);
                    const x0 = Math.max(0, px - radius); const x1 = Math.min(w - 1, px + radius);
                    for (let dy = y0; dy <= y1; dy++) for (let dx = x0; dx <= x1; dx++) dilated[dy * w + dx] = 1;
                }
            }
        }
        const eroded = new Uint8Array(totalPixels);
        for (let py = radius; py < h - radius; py++) {
            for (let px = radius; px < w - radius; px++) {
                if (!dilated[py * w + px]) continue;
                let ok = true;
                outer: for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (!dilated[(py + dy) * w + (px + dx)]) { ok = false; break outer; }
                    }
                }
                if (ok) eroded[py * w + px] = 1;
            }
        }

        return { data: eroded, width: encoded.width, height: encoded.height };
    };

    const drawMaskToCanvas = (maskData: { data: Uint8Array; width: number; height: number } | null, color: { r: number; g: number; b: number; a: number }, target: HTMLCanvasElement | null) => {
        if (!maskData || !target) return;
        const ctx = target.getContext('2d');
        if (!ctx) return;
        if (!hoverTempCanvasRef.current) {
            hoverTempCanvasRef.current = document.createElement('canvas');
        }
        const tempCanvas = hoverTempCanvasRef.current;
        tempCanvas.width = maskData.width;
        tempCanvas.height = maskData.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        const imgData = tempCtx.createImageData(maskData.width, maskData.height);
        for (let i = 0; i < maskData.data.length; i += 1) {
            const offset = i * 4;
            if (maskData.data[i]) {
                imgData.data[offset] = color.r;
                imgData.data[offset + 1] = color.g;
                imgData.data[offset + 2] = color.b;
                imgData.data[offset + 3] = color.a;
            }
        }
        tempCtx.putImageData(imgData, 0, 0);
        // Smooth upscale from encoded resolution to canvas resolution
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tempCanvas, 0, 0, target.width, target.height);
    };

    const drawMaskContour = (maskData: { data: Uint8Array; width: number; height: number }, ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number; a: number }, thickness: number, target: HTMLCanvasElement) => {
        const width = maskData.width;
        const height = maskData.height;
        if (!hoverContourCanvasRef.current) {
            hoverContourCanvasRef.current = document.createElement('canvas');
        }
        const tempCanvas = hoverContourCanvasRef.current;
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        const strokeData = tempCtx.createImageData(width, height);
        const radius = Math.max(1, Math.floor(thickness / 2));
        for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
                const idx = y * width + x;
                if (!maskData.data[idx]) continue;
                const left = maskData.data[idx - 1];
                const right = maskData.data[idx + 1];
                const up = maskData.data[idx - width];
                const down = maskData.data[idx + width];
                if (left || right || up || down) {
                    if (left && right && up && down) continue;
                }
                for (let oy = -radius; oy <= radius; oy += 1) {
                    for (let ox = -radius; ox <= radius; ox += 1) {
                        const nx = x + ox;
                        const ny = y + oy;
                        if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
                        const nIdx = (ny * width + nx) * 4;
                        strokeData.data[nIdx] = color.r;
                        strokeData.data[nIdx + 1] = color.g;
                        strokeData.data[nIdx + 2] = color.b;
                        strokeData.data[nIdx + 3] = color.a;
                    }
                }
            }
        }
        tempCtx.putImageData(strokeData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tempCanvas, 0, 0, target.width, target.height);
    };

    const renderHoverPreview = (maskData: { data: Uint8Array; width: number; height: number } | null) => {
        const hover = hoverCanvasRef.current;
        if (!hover) return;
        const hoverCtx = hover.getContext('2d');
        if (!hoverCtx) return;
        hoverCtx.clearRect(0, 0, hover.width, hover.height);
        if (!maskData) return;
        // Red fill + white contour for clear hover feedback
        drawMaskToCanvas(maskData, { r: 239, g: 68, b: 68, a: 235 }, hover);
        drawMaskContour(maskData, hoverCtx, { r: 255, g: 255, b: 255, a: 255 }, 3, hover);
    };

    const maskDataFromImage = (img: HTMLImageElement) => {
        if (!hoverTempCanvasRef.current) {
            hoverTempCanvasRef.current = document.createElement('canvas');
        }
        const tempCanvas = hoverTempCanvasRef.current;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(img, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const mask = new Uint8Array(tempCanvas.width * tempCanvas.height);
        for (let i = 0; i < mask.length; i += 1) {
            const idx = i * 4;
            const value = imgData.data[idx];
            if (value > 10) mask[i] = 1;
        }
        return { data: mask, width: tempCanvas.width, height: tempCanvas.height };
    };

    const applyMaskDataToFinal = (maskData: { data: Uint8Array; width: number; height: number }, replace: boolean = false) => {
        const mask = maskCanvasRef.current;
        if (!mask) return;
        const maskCtx = mask.getContext('2d');
        if (!maskCtx) return;
        if (replace) {
            maskCtx.clearRect(0, 0, mask.width, mask.height);
        }
        drawMaskToCanvas(maskData, { r: 255, g: 255, b: 255, a: 255 }, mask);
        const data = maskCtx.getImageData(0, 0, mask.width, mask.height);
        // addRasterShape calls applyShapes which handles rendering and history
        addRasterShape(data);
    };

    const applyRemoteMaskToFinal = () => {
        const mask = maskCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!mask || !overlay) return false;
        if (hoverMaskRef.current) {
            applyMaskDataToFinal(hoverMaskRef.current);
            return true;
        }
        const img = remoteMaskImageRef.current;
        if (!img) return false;
        const maskCtx = mask.getContext('2d');
        if (!maskCtx) return false;
        maskCtx.drawImage(img, 0, 0, mask.width, mask.height);
        const data = maskCtx.getImageData(0, 0, mask.width, mask.height);
        addRasterShape(data);
        return true;
    };

    const applyHoverMask = () => {
        if (!hoverMaskRef.current) return;
        applyMaskDataToFinal(hoverMaskRef.current);
        clearHoverPreview();
        // Optionnel: rester en mode hover pour segmentation multiple
        // setToolMode('select'); 
    };

    const scheduleHoverMask = (point: { x: number; y: number }, force?: boolean) => {
        lastHoverPointRef.current = point;
        if (hoverRafRef.current) return;
        hoverRafRef.current = window.requestAnimationFrame(() => {
            hoverRafRef.current = null;
            const now = Date.now();
            if (!force && now - lastHoverTimeRef.current < 40) return;
            lastHoverTimeRef.current = now;
            const latestPoint = lastHoverPointRef.current;
            if (!latestPoint) return;
            // Hover always uses fast local mask for immediate feedback
            const maskData = computeHoverMask(latestPoint.x, latestPoint.y);
            hoverMaskRef.current = maskData;
            renderHoverPreview(maskData);
        });
    };

    /**
     * On click in hover mode: trigger SAM2 via backend for precise AI mask.
     * Shows local mask instantly, then upgrades to SAM2 result when ready.
     */
    const triggerSAMMask = async (point: { x: number; y: number }) => {
        if (!useRemoteMaskRef.current || !maskSessionIdRef.current) return;
        const overlay = overlayCanvasRef.current;
        if (!overlay) return;
        const scaleX = imageNaturalRef.current.width / overlay.width;
        const scaleY = imageNaturalRef.current.height / overlay.height;
        const imgX = point.x * scaleX;
        const imgY = point.y * scaleY;
        setSamLoading(true);
        setStatus('SAM2: refining segment...');
        try {
            const result = await backendService.hoverMask({
                sessionId: maskSessionIdRef.current,
                x: imgX,
                y: imgY
            });
            const img = new Image();
            img.onload = () => {
                const maskData = maskDataFromImage(img);
                if (!maskData) return;
                // Upgrade current mask with precise SAM2 result
                applyMaskDataToFinal(maskData);
                setStatus('SAM2 Precise mask applied');
            };
            img.src = `data:image/png;base64,${result.mask_base64}`;
        } catch (error) {
            console.error('SAM2 mask failed', error);
            setStatus('SAM2 failed — kept local mask');
        } finally {
            setSamLoading(false);
        }
    };

    useEffect(() => {
        if (toolMode !== 'hover') {
            clearHoverPreview();
        }
    }, [toolMode]);

    const prepareMaskSession = async () => {
        if (!sourceImageUrl || maskSessionIdRef.current) return;
        try {
            const referenceUrl = await uploadSourceIfNeeded('studio-prep');
            if (!referenceUrl) return;
            const result = await backendService.encodeMask({ imageUrl: referenceUrl });
            maskSessionIdRef.current = result.session_id;
            useRemoteMaskRef.current = true;
        } catch (error) {
            useRemoteMaskRef.current = false;
            maskSessionIdRef.current = null;
            console.error('Mask encode failed', error);
        }
    };

    useEffect(() => {
        renderMaskHandles();
    }, [maskBounds]);

    const uploadMask = async (): Promise<string | null> => {
        const mask = maskCanvasRef.current;
        if (!mask) return null;
        setUploadingMask(true);
        try {
            const blob: Blob | null = await new Promise((resolve) => mask.toBlob(resolve, 'image/png'));
            if (!blob) return null;
            // Prefix with 'mask-' so backend routes to temp folder
            const file = new File([blob], `mask-${Date.now()}.png`, { type: 'image/png' });
            const url = await backendService.uploadReferenceImage(file, base.id);
            return url;
        } catch (error) {
            console.error('Mask upload failed', error);
            setStatus('Mask upload failed.');
            return null;
        } finally {
            setUploadingMask(false);
        }
    };

    const uploadMaskFromCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
        setUploadingMask(true);
        try {
            const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return null;
            const file = new File([blob], `mask-${Date.now()}.png`, { type: 'image/png' });
            const url = await backendService.uploadReferenceImage(file);
            return url;
        } catch (error) {
            console.error('Mask upload failed', error);
            setStatus('Mask upload failed.');
            return null;
        } finally {
            setUploadingMask(false);
        }
    };

    const uploadReferenceCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
        setUploadingSource(true);
        try {
            const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return null;
            const file = new File([blob], `edit-${Date.now()}.png`, { type: 'image/png' });
            const url = await backendService.uploadReferenceImage(file);
            return url;
        } catch (error) {
            console.error('Upload failed', error);
            setStatus('Image upload failed.');
            return null;
        } finally {
            setUploadingSource(false);
        }
    };

    const uploadSourceIfNeeded = async (prefix: string = 'studio-source'): Promise<string | null> => {
        if (!sourceImageUrl) return null;
        // Already an HTTP(S) URL — use it directly
        if (!sourceFile && /^https?:\/\//i.test(sourceImageUrl)) return sourceImageUrl;
        
        // If we have a File object, upload it
        if (sourceFile) {
            setUploadingSource(true);
            try {
                const url = await backendService.uploadReferenceImage(sourceFile, base.id);
                // Cache the uploaded URL so future calls don't re-upload
                setSourceImageUrl(url);
                setSourceFile(null);
                return url;
            } catch (error) {
                console.error('Source upload failed', error);
                setStatus('Image upload failed.');
                return null;
            } finally {
                setUploadingSource(false);
            }
        }
        
        // data: URL (base64) or blob: URL — convert to File and upload
        if (/^(data:|blob:)/i.test(sourceImageUrl)) {
            setUploadingSource(true);
            try {
                const response = await fetch(sourceImageUrl);
                const blob = await response.blob();
                const mimeType = blob.type || 'image/png';
                const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
                // Filename includes the prefix to help backend routing
                const file = new File([blob], `${prefix}-${Date.now()}.${ext}`, { type: mimeType });
                const uploadedUrl = await backendService.uploadReferenceImage(file, base.id);
                // Cache the uploaded URL so future calls don't re-upload
                setSourceImageUrl(uploadedUrl);
                setSourceFile(null);
                return uploadedUrl;
            } catch (error) {
                console.error('Source data/blob upload failed', error);
                setStatus('Image upload failed.');
                return null;
            } finally {
                setUploadingSource(false);
            }
        }
        return null;
    };

    const downloadPreview = async () => {
        if (!previewUrl) return;
        try {
            const response = await fetch(previewUrl);
            const blob = await response.blob();
            const ext = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
            const objUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = objUrl;
            a.download = `studio-preview-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(objUrl); document.body.removeChild(a); }, 500);
        } catch {
            setStatus('Download failed.');
        }
    };

    const buildPreview = async () => {
        if (!sourceImageUrl) {
            setStatus('Add an image first.');
            return;
        }
        if (!instruction.trim()) {
            setStatus('Instruction is required.');
            return;
        }
        setStatus('Preparing preview...');
        try {
            let referenceUrl: string | null = null;
            let maskUrl: string | null = null;
            referenceUrl = await uploadSourceIfNeeded();
            maskUrl = await uploadMask();

            if (!referenceUrl) {
                setStatus('Upload or select an image first.');
                return;
            }
            if (!maskUrl) {
                setStatus('Draw a mask first.');
                return;
            }

            const result = await backendService.previewEdit({
                provider: editProvider,
                model: editModel,
                imageUrl: referenceUrl,
                maskUrl,
                prompt: instruction,
                strength: editStrength,
                numInferenceSteps: editSteps,
                guidanceScale: 7.5,
                outputQuality: 90,
                orgId: base.id,
                billingMode
            });
            setPreviewUrl(result.output_url);
            setPreviewOpen(true);
            setStatus('Preview ready. Send to Queue to process.');
        } catch (error) {
            console.error('Preview error', error);
            setStatus(`Preview failed: ${String(error)}`);
        }
    };

    const sendToQueue = async () => {
        if (!schemaValid) {
            setStatus('Fix setup first (Schema invalid).');
            return;
        }
        if (!selectedInfluencerId) {
            setStatus('Select an influencer.');
            return;
        }
        if (!instruction.trim()) {
            setStatus('Instruction is required.');
            return;
        }
        setQueueing(true);
        setStatus('');
        try {
            let referenceUrl: string | null = null;
            let maskUrl: string | null = null;
            referenceUrl = await uploadSourceIfNeeded();
            maskUrl = await uploadMask();

            if (!referenceUrl) {
                setStatus('Upload or select an image first.');
                return;
            }

            await backendService.createQueueJob({
                baseId: base.id,
                queueTableName: queueTableName,
                queueTableId: queueTableId,
                promptRecordId: undefined,
                influencerId: selectedInfluencerId,
                mediaType: 'image',
                provider: editProvider,
                model: editModel,
                referenceImageUrl: referenceUrl,
                maskImageUrl: maskUrl || undefined,
                promptText: instruction,
                billingMode
            });

            setStatus('Queued for production.');
        } catch (error) {
            console.error('Queue error', error);
            setStatus(`Queue failed: ${String(error)}`);
        } finally {
            setQueueing(false);
        }
    };

    const toolTagStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.75)',
        color: '#E2E8F0',
        border: '1px solid rgba(148, 163, 184, 0.35)'
    };
    const toolTagActiveStyle: React.CSSProperties = {
        background: 'rgba(59, 130, 246, 0.35)',
        color: '#F8FAFC',
        border: '1px solid rgba(125, 211, 252, 0.7)',
        boxShadow: '0 0 0 1px rgba(56, 189, 248, 0.15)'
    };
    const toolLabelStyle: React.CSSProperties = {
        fontSize: '10px',
        color: 'rgba(226, 232, 240, 0.9)',
        fontWeight: 700
    };

    return (
        <div className="glass-card" style={{ padding: '16px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                <div style={{ minWidth: '220px' }}>
                    <div className="card-title">Edit Studio (Preview)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Mask an area, add an instruction, then send to Queue.
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Engine: Replicate • SD Inpaint
                    </div>
                    {!schemaValid && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#F87171' }}>
                            Fix setup in Setup tab to unlock actions.
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {(() => {
                            const selectedInf = influencers.find(i => i.id === selectedInfluencerId);
                            if (selectedInf?.avatar && selectedInf.avatar.length > 0) {
                                return <img src={selectedInf.avatar[0].url} alt="Avatar" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />;
                            }
                            return <span style={{ fontSize: '12px' }}>🧑‍🎤</span>;
                        })()}
                        <select
                            className="form-input"
                            value={selectedInfluencerId}
                            onChange={(event) => setSelectedInfluencerId(event.target.value)}
                            style={{ padding: '0', border: 'none', background: 'transparent', fontWeight: 700 }}
                        >
                            <option value="">Select influencer</option>
                            {influencers.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    {availablePresets.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Preset</span>
                            <select
                                className="form-input"
                                value={selectedPresetId}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setSelectedPresetId(value);
                                    applyPreset(value);
                                }}
                                style={{ padding: '6px 10px', minWidth: '180px' }}
                            >
                                <option value="none">None</option>
                                {availablePresets.map((preset) => (
                                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Provider</span>
                        <select
                            className="form-input"
                            value={editProvider}
                            onChange={(event) => {
                                const newProvider = event.target.value;
                                setEditProvider(newProvider);
                                // Pick first model for this provider
                                const firstModel = editModels.find(m => m.provider.toLowerCase() === newProvider.toLowerCase());
                                if (firstModel) setEditModel(firstModel.id);
                            }}
                            style={{ padding: '6px 10px', minWidth: '120px' }}
                        >
                            {providerOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Model</span>
                        <select
                            className="form-input"
                            value={editModel}
                            onChange={(event) => setEditModel(event.target.value)}
                            style={{ padding: '6px 10px', minWidth: '180px' }}
                            disabled={editRegistryLoading || availableEditModels.length === 0}
                        >
                            {availableEditModels.length === 0 ? (
                                <option value="">No inpainting models</option>
                            ) : (
                                availableEditModels.map((model) => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <button 
                        className="tag" 
                        style={{ padding: '6px 12px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => {
                            setSourceImageUrl('');
                            setSourceFile(null);
                            setSelectedContentId('');
                            setMaskShapes([]);
                            setHistoryIndex(-1);
                            historyRef.current = [];
                        }}
                    >
                        <span>🔄</span> CHANGE IMAGE
                    </button>
                    <button 
                        className="pill" 
                        style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', cursor: 'pointer', border: 'none' }}
                        onClick={() => window.open('https://replicate.com/black-forest-labs/flux-fill-pro', '_blank')}
                    >
                        Sandbox
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', flex: 1 }}>
                <div
                    className="glass-panel"
                    style={{ padding: '16px', position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    ref={containerRef}
                    onWheel={(event) => {
                        if (!sourceImageUrl) return;
                        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const pointerX = event.clientX - rect.left;
                        const pointerY = event.clientY - rect.top;
                        const speed = event.ctrlKey ? 0.008 : event.shiftKey ? 0.12 : 0.06;
                        const delta = event.deltaY > 0 ? -speed : speed;
                        const nextZoom = Math.min(2, Math.max(0.4, Number((zoom + delta).toFixed(event.ctrlKey ? 3 : 2))));
                        const scale = nextZoom / zoom;
                        setPan((prev) => ({
                            x: pointerX - (pointerX - prev.x) * scale,
                            y: pointerY - (pointerY - prev.y) * scale
                        }));
                        setZoom(nextZoom);
                        event.preventDefault();
                    }}
                >
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Preview</span>
                        <div />
                    </div>
                    {!sourceImageUrl && (
                        <div
                            style={{
                                minHeight: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px'
                            }}
                        >
                            <div
                                style={{
                                    width: 'min(580px, 100%)',
                                    borderRadius: '32px',
                                    padding: '40px',
                                    background: 'rgba(15, 23, 42, 0.45)',
                                    backdropFilter: 'blur(24px) saturate(180%)',
                                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
                                    textAlign: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Decorative Glow */}
                                <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '40%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '110px',
                                        marginBottom: '24px',
                                        position: 'relative'
                                    }}
                                >
                                    {[0, 1, 2].map((index) => (
                                        <div
                                            key={index}
                                            style={{
                                                width: 80,
                                                height: 100,
                                                borderRadius: '20px',
                                                background: index === 1
                                                    ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                                                    : 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                position: 'absolute',
                                                left: `calc(50% - 40px + ${(index - 1) * 35}px)`,
                                                transform: `rotate(${(index - 1) * 12}deg) translateY(${Math.abs(index - 1) * 8}px)`,
                                                zIndex: index === 1 ? 2 : 1,
                                                opacity: index === 1 ? 1 : 0.4,
                                                boxShadow: index === 1 ? '0 20px 40px rgba(59, 130, 246, 0.4)' : 'none',
                                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                            }}
                                        >
                                            {index === 1 && (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🪄</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', color: '#fff', marginBottom: '8px' }}>Edit Studio</div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>Pro Retouching & Inpainting</div>

                                {/* Studio Inspiration Library */}
                                <div className="custom-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '10px 0 24px', margin: '0 -20px', paddingLeft: '40px', paddingRight: '40px', scrollbarWidth: 'none' }}>
                                    {[
                                        { id: 'face', name: 'Face Retouch', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300', desc: 'Fix skin, makeup or expression.' },
                                        { id: 'wear', name: 'Outfit Swap', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=300', desc: 'Change clothes style with AI.' },
                                        { id: 'bg', name: 'Background', img: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=300', desc: 'New scenery & luxury locations.' },
                                        { id: 'light', name: 'Lighting', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=300', desc: 'Cinematic studio lighting fix.' }
                                    ].map(tech => (
                                        <div 
                                            key={tech.id}
                                            style={{
                                                minWidth: '110px',
                                                height: '150px',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                                                flexShrink: 0
                                            }}
                                            className="studio-inspiration-card"
                                        >
                                            <img src={tech.img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98) 5%, transparent 80%)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end',
                                                padding: '10px'
                                            }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: '2px' }}>{tech.name}</div>
                                                <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.2' }}>{tech.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <style>{`
                                    .studio-inspiration-card:hover {
                                        transform: scale(1.05) translateY(-8px);
                                        border-color: #38bdf8;
                                        box-shadow: 0 20px 40px rgba(56, 189, 248, 0.2);
                                    }
                                    .studio-inspiration-card:hover img { opacity: 1; }
                                `}</style>

                                <div style={{ display: 'grid', gap: '16px', marginTop: '32px', maxWidth: '360px', margin: '32px auto 0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <label className="gradient-btn" style={{ padding: '12px', cursor: 'pointer', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                                            <span>📤</span> Upload image
                                            <input
                                                ref={startUploadRef}
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    if (file) handleSourceUpload(file);
                                                }}
                                            />
                                        </label>
                                        <button
                                            className="ghost-btn"
                                            style={{ padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}
                                            onClick={() => contentSelectRef.current?.focus()}
                                        >
                                            📂 Select asset
                                        </button>
                                    </div>

                                    <div style={{ marginTop: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                                Recent Content Library
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => contentSelectRef.current?.focus()}>
                                                View All
                                            </div>
                                        </div>
                                        
                                        <div className="custom-scrollbar" style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                                            gap: '12px', 
                                            maxHeight: '200px', 
                                            overflowY: 'auto',
                                            padding: '4px',
                                            paddingRight: '8px'
                                        }}>
                                            {contents.length === 0 ? (
                                                <div style={{ gridColumn: '1 / -1', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    No recent content found. Upload an image to start.
                                                </div>
                                            ) : (
                                                contents.map((item) => (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => setSelectedContentId(item.id)}
                                                        style={{ 
                                                            aspectRatio: '1', 
                                                            borderRadius: '10px', 
                                                            overflow: 'hidden', 
                                                            cursor: 'pointer',
                                                            border: selectedContentId === item.id ? '2px solid var(--text-accent)' : '1px solid rgba(255,255,255,0.1)',
                                                            position: 'relative',
                                                            transition: 'all 0.2s ease',
                                                            background: 'rgba(0,0,0,0.2)',
                                                            boxShadow: selectedContentId === item.id ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                    >
                                                        <img 
                                                            src={item.mediaUrl} 
                                                            alt={item.name} 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        />
                                                        {selectedContentId === item.id && (
                                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <span style={{ fontSize: '18px' }}>✅</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ 
                                    marginTop: '32px', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    gap: '16px',
                                    fontSize: '10px', 
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    color: 'rgba(255,255,255,0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>CTRL + WHEEL</span>
                                        <span>ULTRA ZOOM</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>SHIFT + WHEEL</span>
                                        <span>FAST PAN</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {sourceImageUrl && (
                        <div style={{ position: 'relative', width: '100%', flex: 1, borderRadius: '16px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${frameRectRef.current.left}px`,
                                    top: `${frameRectRef.current.top}px`,
                                    width: `${frameRectRef.current.width}px`,
                                    height: `${frameRectRef.current.height}px`,
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transformOrigin: 'top left'
                                }}
                            >
                                <img
                                    ref={imageRef}
                                    src={sourceImageUrl}
                                    crossOrigin="anonymous"
                                    alt="Source"
                                    style={{ width: '100%', height: '100%', display: 'block' }}
                                onLoad={() => {
                                    resizeCanvases();
                                    encodeImageForHover();
                                    // Delayed: only prep masks if user actually needs it
                                    // or keep it here but ensure uploadSourceIfNeeded is smarter
                                }}
                            />
                                <canvas
                                    ref={overlayCanvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: toolMode === 'brush' || toolMode === 'hover' ? 'crosshair'
                                            : toolMode === 'lasso' ? (lassoNearStart ? 'cell' : 'crosshair')
                                            : toolMode === 'pan' ? 'grab'
                                            : toolMode === 'select' ? 'move'
                                            : toolMode === 'move' ? 'move' : 'cell'
                                    }}
                                    onMouseDown={handlePointerDown}
                                    onMouseMove={handlePointerMove}
                                    onMouseUp={handlePointerUp}
                                    onMouseLeave={handlePointerLeave}
                                />
                                <canvas
                                    ref={hoverCanvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <canvas
                                    ref={handleCanvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
                            </div>
                        </div>
                    )}

                    {sourceImageUrl && (
                        <div
                            style={{
                                position: 'absolute',
                                left: toolboxPos.x,
                                top: toolboxPos.y,
                                background: 'rgba(15, 23, 42, 0.62)',
                                border: '1px solid rgba(148, 163, 184, 0.25)',
                                borderRadius: '16px',
                                padding: '12px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                                cursor: isDragging ? 'grabbing' : 'default',
                                zIndex: 5
                            }}
                            onMouseMove={onDrag}
                            onMouseUp={stopDrag}
                            onMouseLeave={stopDrag}
                        >
                            <div
                                style={{
                                    fontSize: '10px',
                                color: 'rgba(226, 232, 240, 0.75)',
                                    fontWeight: 800,
                                    letterSpacing: '0.6px',
                                    textTransform: 'uppercase',
                                    marginRight: '6px',
                                    cursor: 'grab',
                                    userSelect: 'none'
                                }}
                                onMouseDown={startDrag}
                            >
                                Tools
                            </div>
                            {supportsMask && showMaskUI && (
                                <button
                                    className={`tag ${toolMode === 'brush' ? 'active' : ''}`}
                                    onClick={() => { setToolMode('brush'); }}
                                    style={toolMode === 'brush' ? toolTagActiveStyle : toolTagStyle}
                                >
                                    Brush
                                </button>
                            )}
                            {supportsMask && showMaskUI && (
                                <button
                                    className={`tag ${toolMode === 'lasso' ? 'active' : ''}`}
                                    onClick={() => { setToolMode('lasso'); }}
                                    style={toolMode === 'lasso' ? toolTagActiveStyle : toolTagStyle}
                                >
                                    Lasso
                                </button>
                            )}
                            {supportsHover && (
                                <button
                                    className={`tag ${toolMode === 'hover' ? 'active' : ''}`}
                                    onClick={() => { setToolMode('hover'); prepareMaskSession(); }}
                                    style={toolMode === 'hover' ? toolTagActiveStyle : toolTagStyle}
                                >
                                    Hover
                                </button>
                            )}
                            {supportsMask && showMaskUI && (
                                <button
                                    className={`tag ${toolMode === 'select' ? 'active' : ''}`}
                                    onClick={() => { setToolMode('select'); clearHoverPreview(); }}
                                    style={toolMode === 'select' ? toolTagActiveStyle : toolTagStyle}
                                >
                                    Select
                                </button>
                            )}
                            {supportsMask && showMaskUI && toolMode === 'select' && selectedShapeId && (
                                <>
                                    <button className="tag" onClick={duplicateSelectedShape} style={toolTagStyle}>Duplicate</button>
                                    <button className="tag" onClick={deleteSelectedShape} style={toolTagStyle}>Delete</button>
                                </>
                            )}
                            <button
                                className={`tag ${toolMode === 'pan' ? 'active' : ''}`}
                                onClick={() => setToolMode('pan')}
                                style={toolMode === 'pan' ? toolTagActiveStyle : toolTagStyle}
                            >
                                Pan
                            </button>
                            
                            {supportsMask && showMaskUI && (
                                <button className="tag" onClick={clearMask} style={toolTagStyle}>Clear mask</button>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                <span style={toolLabelStyle}>Zoom</span>
                                <input
                                    type="range"
                                    min={0.6}
                                    max={1.6}
                                    step={0.05}
                                    value={zoom}
                                    onChange={(event) => setZoom(Number(event.target.value))}
                                    style={{ width: '90px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
                                <span style={toolLabelStyle}>Brush</span>
                                <input
                                    type="range"
                                    min={8}
                                    max={80}
                                    value={brushSize}
                                    onChange={(event) => setBrushSize(Number(event.target.value))}
                                    style={{ width: '90px' }}
                                />
                            </div>

                            {toolMode === 'hover' && supportsHover && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                                    <span style={toolLabelStyle}>Sensitivity</span>
                                    <input
                                        type="range"
                                        min={8}
                                        max={60}
                                        value={hoverTolerance}
                                        onChange={(event) => setHoverTolerance(Number(event.target.value))}
                                        style={{ width: '100px' }}
                                    />
                                    <span style={{ fontSize: '10px', color: 'rgba(226, 232, 240, 0.65)' }}>Lower = stricter</span>
                                </div>
                            )}

                            {toolMode === 'lasso' && supportsMask && showMaskUI && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                                    <span style={toolLabelStyle}>Smooth</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={lassoSmooth}
                                        onChange={(event) => setLassoSmooth(Number(event.target.value))}
                                        style={{ width: '100px' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
                                <span style={toolLabelStyle}>Prompt</span>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Describe the edit..."
                                    value={instruction}
                                    onChange={(event) => setInstruction(event.target.value)}
                                    rows={2}
                                    style={{ width: '200px', padding: '6px 8px' }}
                                />
                                <button
                                    className="gradient-btn"
                                    onClick={buildPreview}
                                    disabled={queueing || uploadingSource || uploadingMask}
                                    style={{ padding: '6px 10px', height: '36px', fontSize: '12px' }}
                                >
                                    {queueing ? 'Working...' : 'Generate'}
                                </button>
                                <button
                                    className="tag"
                                    onClick={sendToQueue}
                                    disabled={queueing}
                                    style={{ ...toolTagStyle, padding: '6px 10px', height: '36px', fontSize: '12px' }}
                                >
                                    {queueing ? 'Queueing...' : 'Queue'}
                                </button>
                            </div>
                            {supportsMask && showMaskUI && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
                                    <span style={toolLabelStyle}>Mask</span>
                                    <button
                                        className="tag"
                                        onClick={() => {
                                            const next = Math.max(-24, maskGrow - 2);
                                            setMaskGrow(next);
                                            applyMaskGrow(next);
                                        }}
                                        style={{ ...toolTagStyle, padding: '4px 6px', fontSize: '10px' }}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="range"
                                        min={-24}
                                        max={24}
                                        step={1}
                                        value={maskGrow}
                                        onChange={(event) => {
                                            const value = Number(event.target.value);
                                            setMaskGrow(value);
                                            applyMaskGrow(value);
                                        }}
                                        style={{ width: '110px' }}
                                    />
                                    <button
                                        className="tag"
                                        onClick={() => {
                                            const next = Math.min(24, maskGrow + 2);
                                            setMaskGrow(next);
                                            applyMaskGrow(next);
                                        }}
                                        style={{ ...toolTagStyle, padding: '4px 6px', fontSize: '10px' }}
                                    >
                                        +
                                    </button>
                                    <div style={{ fontSize: '10px', color: 'rgba(226, 232, 240, 0.8)', minWidth: '36px', textAlign: 'center' }}>
                                        {maskGrow > 0 ? `+${maskGrow}` : `${maskGrow}`}px
                                    </div>
                                    <button
                                        className="tag"
                                        onClick={() => {
                                            setMaskGrow(0);
                                            applyMaskGrow(0);
                                        }}
                                        style={toolTagStyle}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className="tag"
                                        onClick={clearMask}
                                        style={{ ...toolTagStyle, color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)' }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                            {(status || samLoading) && (
                                <div style={{ width: '100%', fontSize: '11px', color: samLoading ? 'rgba(96, 165, 250, 0.9)' : 'rgba(226, 232, 240, 0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {samLoading && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" />
                                        </svg>
                                    )}
                                    {status}
                                </div>
                            )}
                        </div>
                    )}

                    {sourceImageUrl && (
                        <div
                            style={{
                                position: 'absolute',
                                right: '18px',
                                bottom: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                alignItems: 'center',
                                background: 'rgba(12, 12, 16, 0.7)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                padding: '6px 8px',
                                zIndex: 6,
                                opacity: bottomBarHover ? 1 : 0.35,
                                transition: 'opacity 0.2s ease'
                            }}
                            onMouseEnter={() => setBottomBarHover(true)}
                            onMouseLeave={() => setBottomBarHover(false)}
                        >
                            <button className="tag" onClick={undo} disabled={historyIndex <= 0} style={{ padding: '4px 8px', fontSize: '9px' }}>Undo</button>
                            <button className="tag" onClick={redo} disabled={historyIndex >= historyRef.current.length - 1} style={{ padding: '4px 8px', fontSize: '9px' }}>Redo</button>
                            <button
                                className="tag"
                                onClick={fitToView}
                                style={{ padding: '4px 8px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                aria-label="Fit to view"
                            >
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M6 2.5V5M10 2.5V5M6 11V13.5M10 11V13.5M2.5 6H5M11 6H13.5M2.5 10H5M11 10H13.5" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            </button>
                            <button className="tag" onClick={() => setZoom(1)} style={{ padding: '4px 8px', fontSize: '9px' }}>100%</button>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{Math.round(zoom * 100)}%</div>
                        </div>
                    )}

                    {sourceImageUrl && previewOpen && previewUrl && (
                        <div
                            className="glass-card"
                            style={{
                                position: 'absolute',
                                right: '18px',
                                top: '56px',
                                width: '240px',
                                padding: '10px',
                                borderRadius: '16px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                border: '1px solid rgba(148, 163, 184, 0.25)',
                                boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                                zIndex: 6
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    Preview
                                </div>
                                <button
                                    title="Download preview"
                                    onClick={downloadPreview}
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#E2E8F0', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                >
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Download
                                </button>
                            </div>
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={previewUrl} alt="Preview result" style={{ width: '100%', display: 'block' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                    className="tag"
                                    style={{ ...toolTagStyle, flex: 1, padding: '6px 8px', fontSize: '11px' }}
                                    onClick={() => {
                                        setPreviewOpen(false);
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    className="gradient-btn"
                                    style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
                                    onClick={() => {
                                        setSourceImageUrl(previewUrl);
                                        setSourceFile(null);
                                        setPreviewUrl('');
                                        setPreviewOpen(false);
                                        clearMask();
                                        setToolMode('pan');
                                    }}
                                >
                                    Use Result
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
