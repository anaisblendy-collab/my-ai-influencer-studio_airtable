from typing import List
from app.models.schemas import ModelInfo, ModelGroup, PresetInfo


MODEL_GROUPS: List[ModelGroup] = [
    ModelGroup(
        id="seedance",
        title="Seedance Models",
        description="ByteDance Seedance professional video tools",
        items=[
            ModelInfo(
                id="bytedance/seedance-1.5-pro",
                name="Seedance 1.5 Pro",
                description="Professional video generation tools",
                provider="ByteDance",
                type="video",
                speed="70s",
                resolution="1080p"
            )
        ]
    ),
    ModelGroup(
        id="wan",
        title="WAN Models",
        description="Unified audio-video generation suite",
        items=[
            ModelInfo(
                id="Wan-AI/Wan2.6-T2V",
                name="WAN 2.6",
                description="Unified text, image, and reference video",
                provider="HuggingFace",
                type="video",
                speed="80s",
                resolution="1080p"
            ),
            ModelInfo(
                id="Wan-AI/Wan2.5-T2V",
                name="WAN 2.5",
                description="Audio-video generation in one step",
                provider="HuggingFace",
                type="video",
                speed="75s",
                resolution="1080p"
            ),
            ModelInfo(
                id="Wan-AI/Wan2.2-T2V",
                name="WAN 2.2",
                description="Optimized for speed and quality",
                provider="HuggingFace",
                type="video",
                speed="55s",
                resolution="720p"
            )
        ]
    ),
    ModelGroup(
        id="kling",
        title="Kling Models",
        description="High realism video generation models",
        items=[
            ModelInfo(
                id="kling/Kling-O1",
                name="Kling O1",
                description="Unified audio-video generation",
                provider="Kuaishou",
                type="video",
                speed="70s",
                resolution="1080p"
            ),
            ModelInfo(
                id="kling/Kling-2",
                name="Kling 2",
                description="High realism video generation",
                provider="Kuaishou",
                type="video",
                speed="65s",
                resolution="1080p"
            )
        ]
    ),
    ModelGroup(
        id="openai",
        title="OpenAI Models",
        description="State-of-the-art text, image, and multimodal",
        items=[
            ModelInfo(
                id="openai/image-1",
                name="OpenAI Image",
                description="State-of-the-art image generation",
                provider="OpenAI",
                type="image",
                speed="25s",
                resolution="1024x1024"
            )
        ]
    ),
    ModelGroup(
        id="flux",
        title="Flux Models",
        description="Fast, high-quality image generation and editing",
        items=[
            ModelInfo(
                id="black-forest-labs/FLUX.1-schnell",
                name="FLUX.1 Schnell",
                description="Ultra-fast open weights flux model",
                provider="HuggingFace",
                type="image",
                speed="3s",
                resolution="1024x1024"
            ),
            ModelInfo(
                id="black-forest-labs/FLUX.1-kontext",
                name="FLUX.1 Kontext",
                description="Context-aware image editing",
                provider="HuggingFace",
                type="image",
                speed="20s",
                resolution="1024x1024"
            )
        ]
    ),
    ModelGroup(
        id="other",
        title="Other Models",
        description="Additional image and video engines",
        items=[
            ModelInfo(
                id="bytedance/seedream",
                name="Seedream",
                description="Unified image generation and editing",
                provider="ByteDance",
                type="image",
                speed="30s",
                resolution="1024x1024"
            ),
            ModelInfo(
                id="bytedance/dreamina",
                name="Dreamina",
                description="Advanced image and video generation",
                provider="ByteDance",
                type="image",
                speed="40s",
                resolution="1024x1024"
            ),
            ModelInfo(
                id="minmax/hailuo-2.3",
                name="Minmax Hailuo 2.3",
                description="Video generation and speech synthesis",
                provider="Minmax",
                type="video",
                speed="60s",
                resolution="1080p"
            ),
            ModelInfo(
                id="runwayml/gen-video",
                name="RunwayML",
                description="Video from images for stories and social",
                provider="RunwayML",
                type="video",
                speed="50s",
                resolution="720p"
            ),
            ModelInfo(
                id="tencent/hunyuan-video",
                name="Hunyuan Video",
                description="3D aware, temporal consistency",
                provider="Tencent",
                type="video",
                speed="65s",
                resolution="1080p"
            ),
            ModelInfo(
                id="shengshu/vidu",
                name="Vidu",
                description="Multi specialized video generation",
                provider="Shengshu",
                type="video",
                speed="55s",
                resolution="720p"
            )
        ]
    )
]


PRESETS: List[PresetInfo] = [
    PresetInfo(
        id="insta-lifestyle",
        name="Instagram Lifestyle",
        description="Natural light, casual lifestyle shots",
        base_model_id="black-forest-labs/FLUX.1-schnell",
        loras=[]
    ),
    PresetInfo(
        id="cinematic-8k",
        name="Cinematic 8K",
        description="Dramatic lighting, editorial quality",
        base_model_id="black-forest-labs/FLUX.1-kontext",
        loras=[]
    )
]
