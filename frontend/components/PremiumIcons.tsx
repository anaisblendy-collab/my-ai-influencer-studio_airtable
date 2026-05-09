import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    size?: number | string;
}

const createIcon = (d: string) => ({ title, size = '16px', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        {title ? <title>{title}</title> : null}
        <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const PromptIcon = createIcon("M12 5.25V18.75 M5.25 8.25V5.25H18.75V8.25 M9 18.75H15");
export const ImageIcon = createIcon("M19.5 3.75H4.5C4.08579 3.75 3.75 4.08579 3.75 4.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75Z M9 10.5C9.82843 10.5 10.5 9.82843 10.5 9C10.5 8.17157 9.82843 7.5 9 7.5C8.17157 7.5 7.5 8.17157 7.5 9C7.5 9.82843 8.17157 10.5 9 10.5Z");
export const LLMIcon = createIcon("M7.9 16.1L2.7 14.2C2.6 14.1 2.4 14 2.4 13.9C2.3 13.8 2.2 13.7 2.2 13.5V13.1C2.3 13 2.4 12.9 2.5 12.8L7.9 10.9L9.8 5.7C9.9 5.6 10 5.5 10.1 5.4C10.2 5.3 10.3 5.3 10.5 5.3C10.7 5.3 10.8 5.3 10.9 5.4C11 5.5 11.1 5.6 11.2 5.7L13.1 10.9L18.3 12.8C18.4 12.9 18.5 13 18.6 13.1C18.7 13.2 18.7 13.3 18.7 13.5V13.9C18.7 14 18.7 14.1 18.6 14.2L13.1 16.1L11.2 21.3C11.1 21.4 11 21.5 10.9 21.6C10.8 21.7 10.7 21.7 10.5 21.7C10.3 21.7 10.2 21.7 10.1 21.6C10 21.5 9.9 21.4 9.8 21.3L7.9 16.1Z");
export const DefaultIcon = createIcon("M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01");

// Neural Studio / AI Specific Icons
export const BlackForestIcon = createIcon("M4 4h16v16H4z M12 4v16 M4 12h16");
export const IdeogramIcon = createIcon("M12 2L4 22h16L12 2z M12 12l4 4");
export const BriaIcon = createIcon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
export const GoogleIcon = createIcon("M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12S6.48 2 12 2zm0 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z");
export const StabilityAiIcon = createIcon("M12 3v18 M3 12h18 M12 12l6 6 M12 12l-6-6");
export const RunwayIcon = createIcon("M4 4v16 M20 4v16 M4 12h16");
export const LumaIcon = createIcon("M12 2v20 M2 12h20");
export const KlingIcon = createIcon("M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0");
export const OpenaiIcon = createIcon("M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6");
export const MidjourneyIcon = createIcon("M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z");
export const FalIcon = createIcon("M12 2L2 22h20L12 2zm0 4l6 12H6l6-12z");
export const ReplicateIcon = createIcon("M4 4h16v16H4V4zm4 4v8h8V8H8z");
export const FluxIcon = createIcon("M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5");
export const GrokIcon = createIcon("M12 2L4 22h16L12 2z M8 18h8");
export const HuggingFaceIcon = createIcon("M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z");
export const MinimaxIcon = createIcon("M4 4h4v16H4V4zm12 0h4v16h-4V4zM8 8h8v8H8V8z");

export const PremiumIconMap: Record<string, React.FC<IconProps>> = {
    prompt: PromptIcon,
    image: ImageIcon,
    llm: LLMIcon,
    black_forest: BlackForestIcon,
    ideogram: IdeogramIcon,
    bria: BriaIcon,
    google: GoogleIcon,
    stability_ai: StabilityAiIcon,
    runway: RunwayIcon,
    luma: LumaIcon,
    kling: KlingIcon,
    openai: OpenaiIcon,
    midjourney: MidjourneyIcon,
    fal: FalIcon,
    replicate: ReplicateIcon,
    flux: FluxIcon,
    grok: GrokIcon,
    huggingface: HuggingFaceIcon,
    minimax: MinimaxIcon,
    hf: HuggingFaceIcon,
    default: DefaultIcon
};
