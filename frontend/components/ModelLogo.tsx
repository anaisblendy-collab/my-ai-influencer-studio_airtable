import { useGlobalConfig } from '@airtable/blocks/ui';
import { PremiumIconMap } from './PremiumIcons';


interface ModelLogoProps {
    modelId?: string;
    provider?: string;
    size?: string;
    style?: React.CSSProperties;
    active?: boolean;
}

export const ModelLogo: React.FC<ModelLogoProps> = ({ modelId = '', provider = '', size = '24px', style, active }) => {
    const p = provider.toLowerCase();
    const m = modelId.toLowerCase();

    const globalConfig = useGlobalConfig();

    const getCustomLogo = (key: string) => globalConfig.get(key) as string | undefined;

    const commonStyle: React.CSSProperties = {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
    };

    // Seedance 2.0 (Custom Brand - Official Logo)
    if (m.includes('seedance') || m.includes('nano_banana')) {
        const customSeedance = getCustomLogo('logo_seedance');
        const seedanceLogo = customSeedance || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAANcSURBVHgB7VjPTxNBFP5mdpuKLaQVQQ0agcRQOEOCBy5GL3LjDzDEk5w8oGe4eNKLFw9evGHUg8Z4MiYgRq/KwcQThKDRgOFHIVra7jzfzG5322q3dSHQRF/z2u3szJvvfe/HtgMEkmKdYp1lpQPS96zj+IN0sy4dIJBqXfIw+HKYYMpBpSyPsnEcvuiU2dWAHrCeRJOIgEtX04hEk8m/CUgI0fBcGW5of/B29fTgsfMTNx89RGZoEJEBDY/dwsVrbzAyNoXOrj5Eld18Hosbq4idH8DEu3nEkwlEArSd3cbqD4G11gsYGL2PyMIhE4pAjkAut8WlXTuEdpgdKZKwhQWLdlHEHvBIAcXdxYAiBWlZtfcMM+Q4Ckrl2ZT+jN6udFKXADnuQM25oQzp5UJob9gAOYgqSrFDwjNDFIanXtkr36BsoHI1E50DGQzfmMSVxRUcSaf9cSoRLMLbgB2+gWaHPWIl1EeUGR1F4vY9bOY28SnvgJTrkGbFAGkg6qEMWdLW2QNjrYyi/sERxFuSv83f+LYGkc8hxrnnCPL7WPlvDDduERlSlDcTNMOkAuxnL1/H8YkhtDHIwsdXeHnnqhl3igUU9TRmRBK5zJivqqrJ1qYqPIcYhIBl4q8QlGreKULtZLG5VUA8cynYhnQ9Ci9Uurxl6UZlwENyKBSQ5JCR701QZW470HsyWBWBuwCUWaFMaDy/lDvWQBrW6UPcg3RX1Xlkl9Gs/ZUkdUzhyGoTzJAg1xGPCSpdkoeJIgIyucMvqRsbqcplnBPV5UtFBsj9yuamE1d2cF8EG+lPISOGTJkHhuNWRcVM8kLC90UQsqOpNiTaO+DE+JllFX2GhGFGGGLcnI+Y1HodlYJV1qk1V6TDRQW+Kvjjy/NzWOjvxc7UNNq/rMC23UIg77Gj8SmHojdG5TBeS2dMC1pSMX9ccPJKBiiJw4JYxZpcNovlF8+NlrstDNM6XOHdMRRQOhHD+vITfF14hoX1z/44WUeQTB9DPPcd629nUE8k51uB0cRaE+hMdsAOedob+3+rp3ozZMfiDc8/ceY0TT6doa6+cyRtO3Tu/79B9aQpAc2heeSDBvQazSN39Zs+dVjC3o5S9us4xpduNNmBVUnG4R6zHRSQWdZpuFEy8gtkeQrvdy1OFAAAAABJRU5ErkJggg==";
        return (
            <div style={{ ...commonStyle, background: '#000', borderRadius: '6px', overflow: 'hidden' }}>
                <img src={seedanceLogo} alt="Seedance" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
        );
    }

    // Kling (Infinity Loop)
    if (m.includes('kling') || p.includes('kling')) {
        return (
            <div style={{ ...commonStyle, background: '#111', borderRadius: '6px', padding: '10%' }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 12c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" stroke="white" strokeWidth="2" opacity="0.9" />
                    <path d="M5 12c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="white" strokeWidth="1.5" opacity="0.4" />
                    <path d="M9 12c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4z" stroke="white" strokeWidth="1" opacity="0.6" />
                </svg>
            </div>
        );
    }

    // Pixverse (Stylized shape)
    if (m.includes('pixverse')) {
        return (
            <div style={{ ...commonStyle, background: 'linear-gradient(135deg, #FF00FF, #AA00FF)', borderRadius: '6px', padding: '20%' }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4l8 8-8 8V4z" fill="white" />
                    <path d="M20 4l-8 8 8 8V4z" fill="white" fillOpacity="0.5" />
                </svg>
            </div>
        );
    }

    // Luma
    if (m.includes('luma') || p.includes('luma')) {
        const customLuma = getCustomLogo('logo_luma');
        if (customLuma) {
            return (
                <div style={{ ...commonStyle, background: '#000', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={customLuma} alt="Luma" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            );
        }
        return (
            <div style={{ ...commonStyle, background: 'linear-gradient(135deg, #00E5FF, #00B0FF)', borderRadius: '6px', color: '#fff', fontWeight: 900, fontSize: `calc(${size} * 0.6)`, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                L
            </div>
        );
    }

    // Runway
    if (m.includes('runway') || p.includes('runway')) {
        const customRunway = getCustomLogo('logo_runway');
        if (customRunway) {
            return (
                <div style={{ ...commonStyle, background: '#000', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={customRunway} alt="Runway" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            );
        }
        return (
            <div style={{ ...commonStyle, background: 'linear-gradient(135deg, #6200EA, #AA00FF)', borderRadius: '6px', color: '#fff', fontWeight: 900, fontSize: `calc(${size} * 0.6)`, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                R
            </div>
        );
    }

    // Hailuo / MiniMax
    if (m.includes('hailuo') || m.includes('mini-max')) {
        const customHailuo = getCustomLogo('logo_hailuo');
        if (customHailuo) {
            return (
                <div style={{ ...commonStyle, background: '#000', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={customHailuo} alt="Hailuo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            );
        }
        return (
            <div style={{ ...commonStyle, background: 'linear-gradient(135deg, #00C853, #64DD17)', borderRadius: '6px', color: '#fff', fontWeight: 900, fontSize: `calc(${size} * 0.6)`, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                H
            </div>
        );
    }

    // OpenAI (Dall-E)
    if (p.includes('openai')) {
        return (
            <div style={{ ...commonStyle, background: '#10a37f', borderRadius: '6px', padding: '15%' }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.2819 9.8256V6.99182C22.2819 6.01254 21.4886 5.21919 20.5093 5.21919H17.6755V2.38541C17.6755 1.40613 16.8821 0.612793 15.9029 0.612793H13.0691V3.44657C13.0691 4.42585 12.2757 5.2192 11.2965 5.2192H8.46268V2.38541C8.46268 1.40613 7.66934 0.612793 6.69006 0.612793H3.85628V3.44657C3.85628 4.42585 3.06293 5.2192 2.08366 5.2192H0.666748V8.05298C0.666748 9.03226 1.46009 9.82561 2.43937 9.82561H5.27315V12.6594C5.27315 13.6387 6.06649 14.432 7.04577 14.432H9.87955V17.2658C9.87955 18.2451 10.6729 19.0384 11.6522 19.0384H14.4859V16.2046C14.4859 15.2254 15.2793 14.432 16.2586 14.432H19.0924V17.2658C19.0924 18.2451 19.8857 19.0384 20.865 19.0384H22.2819V16.2046C22.2819 15.2254 21.4886 14.432 20.5093 14.432H17.6755V11.5983C17.6755 10.619 16.8821 9.8256 15.9029 9.8256H13.0691V6.99182C13.0691 6.01254 13.8624 5.21919 14.8417 5.21919H17.6755V8.05298C17.6755 9.03226 18.4688 9.82561 19.4481 9.82561H22.2819V9.8256Z" fill="white" />
                </svg>
            </div>
        );
    }

    // Hugging Face
    if (p.includes('huggingface')) {
        return <div style={{ ...commonStyle, fontSize: size, filter: 'grayscale(0.2)' }}>🤗</div>;
    }

    // Google / Gemini / Veo
    if (p.includes('google') || m.includes('gemini') || m.includes('veo') || p.includes('nanobanana')) {
        const GoogleIcon = PremiumIconMap.google;
        return (
            <div style={{ ...commonStyle, background: '#fff', borderRadius: '6px', border: '1px solid #eee' }}>
                <GoogleIcon size="80%" />
            </div>
        );
    }

    // Stability AI
    if (p.includes('stability') || m.includes('stable-diffusion') || m.includes('sdxl') || m.includes('sd3')) {
        const StabilityIcon = PremiumIconMap.stability_ai;
        return (
            <div style={{ ...commonStyle, background: '#000', borderRadius: '6px' }}>
                <StabilityIcon size="70%" className="text-white" />
            </div>
        );
    }

    // Black Forest (Flux)
    if (m.includes('flux') || p.includes('black-forest') || m.includes('schnell')) {
        const FluxIcon = PremiumIconMap.black_forest;
        return (
            <div style={{ ...commonStyle, background: '#000', borderRadius: '6px' }}>
                <FluxIcon size="70%" className="text-yellow-400" />
            </div>
        );
    }

    // OpenAI
    if (p.includes('openai') || m.includes('dall-e')) {
        const OpenaiIcon = PremiumIconMap.openai;
        return (
            <div style={{ ...commonStyle, background: '#10a37f', borderRadius: '6px' }}>
                <OpenaiIcon size="70%" className="text-white" />
            </div>
        );
    }

    // Luma
    if (m.includes('luma') || p.includes('dream-machine')) {
        const LumaIcon = PremiumIconMap.luma;
        return (
            <div style={{ ...commonStyle, background: '#000', borderRadius: '6px' }}>
                <LumaIcon size="70%" className="text-blue-400" />
            </div>
        );
    }


    // Default Fallback
    return (
        <div style={{ ...commonStyle, background: 'var(--card-bg)', borderRadius: '6px', color: 'var(--text-soft)', fontWeight: 800, fontSize: `calc(${size} * 0.5)`, border: '1px solid var(--card-border)' }}>
            {p.substring(0, 1).toUpperCase() || '?'}
        </div>
    );
};
