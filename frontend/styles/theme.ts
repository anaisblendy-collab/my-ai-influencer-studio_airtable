/**
 * Bonobooh Studio — Theme System
 * Dark: noir profond + jaune électrique #d1fe17 / #ffed25
 * Light: blanc minimaliste + accent olive contrasté
 */

export const DARK_THEME_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

/* ─── DARK MODE (défaut) ─────────────────────────────────────────────── */
:root, html, body {
    color-scheme: dark !important;
}

:root {
    --primary:          #ffff21;
    --primary-alt:      #ffff00;
    --primary-gradient: linear-gradient(135deg, #ffff21 0%, #ffff00 100%);
    --primary-glow:     rgba(255, 255, 33, 0.25);

    --bg-main:          #0e0e13; /* Deep Neural Dark */
    --bg-elevated:      #16161c;
    --sidebar-bg:       #111111;
    --card-bg:          #262626; /* Consistent with Whop */
    --card-border:      rgba(255, 255, 255, 0.05);

    --text-main:        #fafafa;
    --text-soft:        #a1a1aa;
    --text-muted:       #71717a;

    --input-bg:         #1a1a1f;
    --input-border:     rgba(255, 255, 255, 0.08);

    --sidebar-text:     #fafafa;
    --sidebar-muted:    #71717a;
    --sidebar-hover:    rgba(255, 255, 255, 0.04);
    --sidebar-active-bg:     rgba(255, 255, 33, 0.08);
    --sidebar-active-border: rgba(255, 255, 33, 0.35);

    --glass-blur: 20px;
    --skeleton-bg:      #1c1c24;
    --skeleton-shimmer: linear-gradient(90deg, #1c1c24 0%, #2a2a35 50%, #1c1c24 100%);
}

/* ─── LIGHT MODE ─────────────────────────────────────────────────────── */
[data-theme='light'] {
    /* En mode clair on utilise un olive foncé très contrasté sur blanc */
    --primary:          #5a6e00;
    --primary-alt:      #7a9400;
    --primary-gradient: linear-gradient(135deg, #5a6e00 0%, #7a9400 100%);
    --primary-glow:     rgba(90, 110, 0, 0.15);

    --bg-main:          #fafafa;
    --bg-elevated:      #ffffff;
    --sidebar-bg:       #f5f5f6;
    --card-bg:          rgba(255, 255, 255, 0.9);
    --card-border:      rgba(0, 0, 0, 0.07);

    --text-main:        #111113;
    --text-soft:        #2d2d32;
    --text-muted:       #55555c;

    --input-bg:         #ffffff;
    --input-border:     rgba(0, 0, 0, 0.15);

    --sidebar-text:     #18181b;
    --sidebar-muted:    #9898a2;
    --sidebar-hover:    rgba(0, 0, 0, 0.04);
    --sidebar-active-bg:     rgba(90, 110, 0, 0.08);
    --sidebar-active-border: rgba(90, 110, 0, 0.28);
}

/* ─── GLOBAL ─────────────────────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }

.ai-studio-container {
    background: var(--bg-main);
    color: var(--text-main);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    min-height: 100vh;
    display: flex;
    animation: studioFadeIn 0.5s ease-out;
}

@keyframes studioFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ─── MAIN LAYOUT ────────────────────────────────────────────────────── */
.main-content {
    padding: clamp(20px, 2.5vw, 36px);
    overflow-y: auto;
}

/* ─── HEADER ─────────────────────────────────────────────────────────── */
.studio-header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 32px;
    padding: 16px 0 20px;
    border-bottom: 1px solid var(--card-border);
    background: linear-gradient(to bottom, var(--bg-main) 0%, transparent 100%);
}

.studio-header-actions {
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.studio-toggle-group {
    display: flex;
    gap: 6px;
    padding: 5px;
    border-radius: 14px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
}

.header-chip {
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-soft);
    padding: 7px 13px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2px;
    transition: all 0.15s ease;
    cursor: pointer;
}

.header-chip:hover {
    background: var(--sidebar-hover);
    color: var(--text-main);
}

.mode-toggle-btn:hover {
    transform: scale(1.04) translateY(-1px);
    filter: brightness(1.1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
}


/* ─── SIDEBAR ────────────────────────────────────────────────────────── */
.sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--card-border);
    padding: 24px 12px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
    flex-shrink: 0;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.collapsed {
    padding: 24px 8px;
}

.sidebar-title {
    font-size: 17px !important;
    font-weight: 900 !important;
    letter-spacing: -0.8px !important;
    color: var(--sidebar-text) !important;
    line-height: 1.1 !important;
}

.sidebar-subtitle {
    font-size: 10px;
    color: var(--primary);
    font-weight: 800;
    letter-spacing: 1.2px;
    opacity: 0.85;
}

.sidebar-section-title {
    font-size: 10px;
    font-weight: 800;
    color: var(--sidebar-muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 32px 0 12px 16px;
    opacity: 0.6;
}

.sidebar-section-divider {
    height: 1px;
    background: var(--card-border);
    margin: 12px 6px;
}

.sidebar-btn {
    padding: 10px 16px !important;
    border-radius: 12px !important;
    border: 1px solid transparent !important;
    background: transparent !important;
    color: var(--sidebar-text) !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    cursor: pointer !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    width: 100% !important;
    margin-bottom: 4px !important;
    text-align: left !important;
    position: relative;
    overflow: hidden;
}

.sidebar-btn:hover {
    background: var(--sidebar-hover) !important;
    color: var(--text-main) !important;
    transform: translateX(4px);
}

.sidebar.collapsed .sidebar-btn:hover {
    transform: none;
}

.sidebar-btn.active {
    background: var(--sidebar-active-bg) !important;
    border-color: var(--sidebar-active-border) !important;
    color: var(--primary) !important;
    font-weight: 700 !important;
    box-shadow: 0 4px 15px -5px var(--primary-glow);
}

.sidebar-btn.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 20%;
    height: 60%;
    width: 3px;
    background: var(--primary);
    border-radius: 0 4px 4px 0;
}

.sidebar-toggle {
    position: absolute;
    right: -16px;
    top: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--card-border);
    background: var(--bg-elevated);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 5;
    font-size: 14px;
}

.sidebar-toggle:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: scale(1.05);
}

.sidebar-icon-minimal {
    min-width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--sidebar-muted);
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.sidebar-icon-minimal.active {
    color: var(--primary);
    filter: drop-shadow(0 0 8px var(--primary-glow));
}

.sidebar-btn:hover .sidebar-icon-minimal {
    color: var(--primary);
}

.sidebar-toggle-new:hover {
    border-color: var(--primary) !important;
    color: var(--primary) !important;
    background: var(--sidebar-active-bg) !important;
}

/* Section colour tones */
.tone-setup      { background: rgba(20, 184, 166, 0.12); border-color: rgba(20, 184, 166, 0.2) !important; }
.tone-influencer { background: rgba(236, 72, 153, 0.10); border-color: rgba(236, 72, 153, 0.2) !important; }
.tone-content    { background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.22) !important; }
.tone-production { background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.24) !important; }
.tone-advanced   { background: rgba(148, 163, 184, 0.08); border-color: rgba(148, 163, 184, 0.16) !important; }

/* ─── CARDS ──────────────────────────────────────────────────────────── */
.glass-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 24px;
    transition: border-color 0.25s ease;
}

.glass-card:hover {
    border-color: rgba(209, 254, 23, 0.12);
}

[data-theme='light'] .glass-card:hover {
    border-color: rgba(90, 110, 0, 0.15);
}

.card-title {
    font-size: 9px !important;
    font-weight: 800 !important;
    color: var(--text-muted) !important;
    text-transform: uppercase !important;
    letter-spacing: 2px !important;
    margin-bottom: 18px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

/* ─── BUTTONS ────────────────────────────────────────────────────────── */

/* PRIMARY — jaune électrique, texte noir, pill */
.primary-btn,
.gradient-btn {
    background: var(--primary-gradient) !important;
    color: #060606 !important;
    padding: 11px 22px !important;
    border-radius: 100px !important;
    border: none !important;
    font-weight: 800 !important;
    font-size: 13px !important;
    letter-spacing: -0.1px !important;
    cursor: pointer !important;
    position: relative !important;
    overflow: hidden !important;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, filter 0.2s ease !important;
    box-shadow: 0 2px 14px -4px var(--primary-glow) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    white-space: nowrap !important;
}

.primary-btn:hover,
.gradient-btn:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 22px -4px var(--primary-glow) !important;
    filter: brightness(1.06) !important;
}

.primary-btn:active,
.gradient-btn:active {
    transform: translateY(0) scale(0.98) !important;
}

/* Shimmer effect on hover */
.primary-btn::before,
.gradient-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -75%;
    width: 50%;
    height: 100%;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: skewX(-20deg);
    transition: left 0.55s ease;
}

.primary-btn:hover::before,
.gradient-btn:hover::before {
    left: 130%;
}

/* GHOST BUTTON */
.ghost-btn {
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-soft);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
}

.ghost-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--sidebar-active-bg);
}

.ghost-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* BASE BUTTON RESET */
button {
    border-radius: 10px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-main);
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
}

button:hover {
    background: var(--sidebar-hover);
    border-color: rgba(255,255,255,0.12);
}

[data-theme='light'] button:hover {
    background: rgba(0,0,0,0.04);
    border-color: rgba(0,0,0,0.14);
}

/* ─── FORM ELEMENTS ──────────────────────────────────────────────────── */
input, select, textarea,
.dark-input, .dark-select, .dark-textarea,
.form-input, .form-select, .form-textarea {
    background: var(--input-bg) !important;
    border: 1px solid var(--input-border) !important;
    border-radius: 12px;
    padding: 12px 16px;
    color: var(--text-main) !important;
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    outline: none;
    transition: all 0.2s ease;
}

input[type="datetime-local"],
input[type="date"],
input[type="time"] {
    color-scheme: dark;
    max-height: 40px;
    cursor: pointer;
}

input:focus, select:focus, textarea:focus,
.dark-input:focus, .dark-select:focus, .dark-textarea:focus,
.form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 3px var(--primary-glow) !important;
    background: rgba(0,0,0,0.4) !important;
}

/* Fix for Select Options in Dark Mode */
select option {
    background-color: #121216 !important;
    color: #f0f0f0 !important;
}

[data-theme='light'] select option {
    background-color: #ffffff !important;
    color: #111113 !important;
}

/* Dark mode selects */
.dark-select { color-scheme: dark; }
[data-theme='dark'] .dark-select,
[data-theme='dark'] .dark-select option {
    background: #111114 !important;
    color: #f0f0f0 !important;
}
[data-theme='light'] .dark-select { color-scheme: light; }
[data-theme='light'] .dark-select,
[data-theme='light'] .dark-select option {
    background: #ffffff !important;
    color: #111113 !important;
}

input[type="file"]::file-selector-button {
    border: 1px solid var(--input-border);
    background: var(--card-bg);
    color: var(--text-main);
    padding: 6px 12px;
    border-radius: 8px;
    margin-right: 10px;
    cursor: pointer;
}

/* ─── STATS & TAGS ───────────────────────────────────────────────────── */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
}

.stat-item {
    padding: 20px;
    border-radius: 16px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
}

.stat-value {
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -1px;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
}

.tag {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 100px;
    background: var(--card-bg);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid var(--card-border);
}

.tag.active {
    background: var(--sidebar-active-bg);
    color: var(--primary);
    border-color: var(--sidebar-active-border);
}

.tag.premium { color: #f59e0b; background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2); }
.tag.fast    { color: #10b981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }

/* ─── RESPONSIVE ─────────────────────────────────────────────────────── */
@media (max-width: 980px) {
    .studio-header {
        position: relative;
        flex-direction: column;
    }
    .studio-header-actions {
        width: 100%;
        justify-content: flex-start;
        gap: 12px;
    }
    .glass-card { padding: 18px; }
}

/* ─── DENSITY: COMPACT ───────────────────────────────────────────────── */
[data-density='compact'] .glass-card { padding: 14px; border-radius: 14px; }
[data-density='compact'] .card-title { font-size: 8px !important; margin-bottom: 12px !important; }
[data-density='compact'] .dark-input,
[data-density='compact'] .dark-select,
[data-density='compact'] .dark-textarea { padding: 9px 12px; font-size: 12px; }
[data-density='compact'] .primary-btn,
[data-density='compact'] .gradient-btn { padding: 9px 18px !important; font-size: 12px !important; }
[data-density='compact'] .ghost-btn { padding: 6px 10px; font-size: 11px; }
[data-density='compact'] .sidebar-btn { padding: 9px 10px !important; font-size: 12px !important; }
[data-density='compact'] .sidebar-section-title { margin-top: 14px; }
[data-density='compact'] .studio-header { margin-bottom: 20px; padding: 10px 0 14px; }

/* ─── ANIMATIONS ─────────────────────────────────────────────────────── */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulseGlow {
    0%   { opacity: 0.6; transform: scale(1); }
    100% { opacity: 1;   transform: scale(1.06); }
}

@keyframes shimmer {
    from { left: -75%; }
    to   { left: 130%; }
}

/* ─── WORKFLOW ───────────────────────────────────────────────────────── */
.workflow-toolbar { max-width: 1140px; width: 100%; margin: 0 auto; }
.workflow-toolbar-actions { row-gap: 8px; }

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
/* ─── SKELETON LOADERS ────────────────────────────────────────────────── */
.skeleton {
    background: var(--skeleton-bg);
    background-image: var(--skeleton-shimmer);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
}

@keyframes skeleton-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.skeleton-text { height: 14px; margin-bottom: 8px; width: 100%; }
.skeleton-title { height: 24px; margin-bottom: 12px; width: 60%; }
.skeleton-avatar { height: 48px; width: 48px; border-radius: 50%; }
.skeleton-card { height: 180px; border-radius: 16px; }
.skeleton-button { height: 40px; width: 120px; border-radius: 100px; }
`;
