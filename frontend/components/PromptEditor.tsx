import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';

const SlashCommand = Mention.extend({ name: 'slashCommand' });

interface PromptEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    accent?: string;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ 
    value, 
    onChange, 
    placeholder = 'Write your AI prompt here...',
    accent = '#6366f1'
}) => {
    const [popup, setPopup] = React.useState<{ visible: boolean, rect: () => DOMRect | null, items: string[], index: number, command: any, type: 'mention'|'slash' } | null>(null);
    const popupRef = React.useRef(popup);
    const containerRef = React.useRef<HTMLDivElement>(null);
    popupRef.current = popup;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                code: false,
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            Mention.configure({
                HTMLAttributes: { class: 'tiptap-mention' },
                suggestion: {
                    char: '@',
                    items: ({ query }) => ['Node Input', 'Base Image', 'Flux Output', 'Upscaled Result'].filter(i => i.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5),
                    render: () => ({
                        onStart: (props) => setPopup({ visible: true, rect: props.clientRect, items: props.items, index: 0, command: props.command, type: 'mention' }),
                        onUpdate: (props) => setPopup(p => p ? { ...p, rect: props.clientRect, items: props.items } : null),
                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') { setPopup(null); return true; }
                            if (props.event.key === 'ArrowDown') { setPopup(p => p ? { ...p, index: (p.index + 1) % p.items.length } : null); return true; }
                            if (props.event.key === 'ArrowUp') { setPopup(p => p ? { ...p, index: (p.index - 1 + p.items.length) % p.items.length } : null); return true; }
                            if (props.event.key === 'Enter') {
                                const p = popupRef.current;
                                if (p && p.items.length > 0) { p.command({ id: p.items[p.index] }); setPopup(null); return true; }
                            }
                            return false;
                        },
                        onExit: () => setPopup(null)
                    } as any)
                }
            }),
            SlashCommand.configure({
                HTMLAttributes: { class: 'tiptap-slash' },
                suggestion: {
                    char: '/',
                    items: ({ query }) => ['cinematic', '8k resolution', 'photorealistic', 'anime style', 'dark mood'].filter(i => i.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5),
                    render: () => ({
                        onStart: (props) => setPopup({ visible: true, rect: props.clientRect, items: props.items, index: 0, command: props.command, type: 'slash' }),
                        onUpdate: (props) => setPopup(p => p ? { ...p, rect: props.clientRect, items: props.items } : null),
                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') { setPopup(null); return true; }
                            if (props.event.key === 'ArrowDown') { setPopup(p => p ? { ...p, index: (p.index + 1) % p.items.length } : null); return true; }
                            if (props.event.key === 'ArrowUp') { setPopup(p => p ? { ...p, index: (p.index - 1 + p.items.length) % p.items.length } : null); return true; }
                            if (props.event.key === 'Enter') {
                                const p = popupRef.current;
                                if (p && p.items.length > 0) { p.command({ id: p.items[p.index] }); setPopup(null); return true; }
                            }
                            return false;
                        },
                        onExit: () => setPopup(null)
                    } as any)
                }
            }),
            CharacterCount.configure({
                limit: 2000,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            // getText() doesn't cleanly handle mention nodes natively, so we might need HTML later, but for now we'll rely on text sync.
            onChange(editor.getText());
        },
    });

    // Update content when value prop changes externally (e.g. from template or other node)
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        
        // Prevent setting content if the user is currently focused/typing to avoid cursor jumps
        if (editor.isFocused) return;

        const currentText = editor.getText();
        if (value !== currentText) {
            // Use setTimeout to avoid flushSync errors during React render cycles
            setTimeout(() => {
                if (!editor.isDestroyed) editor.commands.setContent(value);
            }, 0);
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div 
            className="tiptap-prompt-wrapper"
            onPointerDown={e => e.stopPropagation()}
            style={{ 
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                color: '#fff',
                minHeight: '80px',
                cursor: 'text',
                transition: 'border-color 0.2s',
            }}
            onClick={() => editor.chain().focus().run()}
        >
            <style>{`
                .tiptap-prompt-wrapper:focus-within {
                    border-color: ${accent}80 !important;
                    background: rgba(0,0,0,0.3) !important;
                }
                .ProseMirror {
                    outline: none;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: rgba(255,255,255,0.2);
                    pointer-events: none;
                    height: 0;
                }
                .tiptap-mention {
                    color: #A855F7;
                    background: rgba(168, 85, 247, 0.15);
                    border-radius: 4px;
                    padding: 1px 4px;
                    font-weight: bold;
                }
                .tiptap-slash {
                    color: #E0F81C;
                    background: rgba(224, 248, 28, 0.15);
                    border-radius: 4px;
                    padding: 1px 4px;
                    font-weight: bold;
                }
            `}</style>
            <div ref={containerRef} style={{ position: 'relative', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Toolbar */}
                {editor && (
                    <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                        <button 
                            onPointerDown={e => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            style={{ background: editor.isActive('bold') ? `${accent}22` : 'transparent', border: 'none', color: editor.isActive('bold') ? accent : '#aaa', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}
                        >B</button>
                        <button 
                            onPointerDown={e => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            style={{ background: editor.isActive('italic') ? `${accent}22` : 'transparent', border: 'none', color: editor.isActive('italic') ? accent : '#aaa', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontStyle: 'italic' }}
                        >I</button>
                        <button 
                            onPointerDown={e => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            style={{ background: editor.isActive('underline') ? `${accent}22` : 'transparent', border: 'none', color: editor.isActive('underline') ? accent : '#aaa', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, fontSize: 11, textDecoration: 'underline' }}
                        >U</button>
                        
                        <div style={{ flex: 1 }} />
                        
                        {/* Character Count */}
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center' }}>
                            {editor.storage.characterCount.characters()} / 2000
                        </div>
                    </div>
                )}
                <EditorContent editor={editor} style={{ padding: '8px 12px', minHeight: 60, fontSize: 13, color: '#eee', outline: 'none' }} />
            </div>
            
            {/* Suggestion Popover */}
            {popup && popup.visible && popup.rect() && containerRef.current && (
                <div 
                    style={{
                        position: 'absolute',
                        left: (popup.rect()?.left || 0) - containerRef.current.getBoundingClientRect().left,
                        top: (popup.rect()?.bottom || 0) - containerRef.current.getBoundingClientRect().top + 4,
                        background: 'rgba(17,17,20,0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        zIndex: 9999,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        minWidth: '140px'
                    }}
                >
                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {popup.type === 'mention' ? 'Variables' : 'Styles'}
                    </div>
                    {popup.items.length === 0 && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '6px' }}>No matches</div>}
                    {popup.items.map((item, i) => (
                        <div 
                            key={i}
                            onClick={() => { popup.command({ id: item }); setPopup(null); }}
                            onMouseEnter={() => setPopup(p => p ? { ...p, index: i } : null)}
                            style={{
                                padding: '6px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: i === popup.index ? (popup.type === 'mention' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(224, 248, 28, 0.2)') : 'transparent',
                                color: i === popup.index ? (popup.type === 'mention' ? '#A855F7' : '#E0F81C') : '#fff',
                                fontWeight: i === popup.index ? 700 : 500,
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
