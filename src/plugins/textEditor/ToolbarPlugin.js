// src/plugins/textEditor/ToolbarPlugin.js
import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection, $isRangeSelection,
    FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND,
    CAN_REDO_COMMAND, CAN_UNDO_COMMAND,
    REDO_COMMAND, UNDO_COMMAND,
    SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_LOW,
} from 'lexical';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_IMAGE_COMMAND } from './ImagePlugin'; // Corrected import
import {
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Redo2, Undo2, Bold, Italic, Underline, Code, Link2, Image, Table
} from 'lucide-react';

// The rest of this file remains the same as the previous version...

const BLOCK_TYPES = [
    { value: 'paragraph', label: 'Normal' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'code', label: 'Code Block' },
    { value: 'quote', label: 'Quote' }
];

const ToolbarPlugin = () => {
    const [editor] = useLexicalComposerContext();

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [blockType, setBlockType] = useState('paragraph');
    const [isBold, setBold] = useState(false);
    const [isItalic, setItalic] = useState(false);
    const [isUnderline, setUnderline] = useState(false);
    const [align, setAlign] = useState('left');

    const syncToolbar = useCallback(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;

        setBold(sel.hasFormat('bold'));
        setItalic(sel.hasFormat('italic'));
        setUnderline(sel.hasFormat('underline'));

        const top = sel.anchor.getNode().getTopLevelElementOrThrow();
        setBlockType(top.getType() === 'heading' ? top.getTag() : top.getType());
        setAlign(top.getFormatType() || 'left');
    }, []);

    useEffect(() => editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => { syncToolbar(); return false; },
        COMMAND_PRIORITY_LOW
    ), [editor, syncToolbar]);

    useEffect(() => editor.registerCommand(
        CAN_UNDO_COMMAND,
        payload => { setCanUndo(payload); return false; },
        COMMAND_PRIORITY_LOW
    ), [editor]);

    useEffect(() => editor.registerCommand(
        CAN_REDO_COMMAND,
        payload => { setCanRedo(payload); return false; },
        COMMAND_PRIORITY_LOW
    ), [editor]);

    return (
        <div className="toolbar">
            <IconBtn icon={<Undo2 size={18} />} disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} />
            <IconBtn icon={<Redo2 size={18} />} disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} />
            <Divider />
            <Select value={blockType} opts={BLOCK_TYPES} onChange={v => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, v)} />
            <Divider />
            <IconBtn icon={<Bold size={18} />} active={isBold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} />
            <IconBtn icon={<Italic size={18} />} active={isItalic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} />
            <IconBtn icon={<Underline size={18} />} active={isUnderline} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} />
            <IconBtn icon={<Code size={18} />} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} />
            <IconBtn icon={<Link2 size={18} />} onClick={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://')} />
            <Divider />
            <IconBtn icon={<Image size={18} />} onClick={() => editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: '', altText: 'image' })} />
            <IconBtn icon={<Table size={18} />} onClick={() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: 3, columns: 3 })} />
            <Divider />
            <IconBtn icon={<AlignLeft size={18} />} active={align === 'left'} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} />
            <IconBtn icon={<AlignCenter size={18} />} active={align === 'center'} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} />
            <IconBtn icon={<AlignRight size={18} />} active={align === 'right'} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} />
            <IconBtn icon={<AlignJustify size={18} />} active={align === 'justify'} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')} />
        </div>
    );
};

const IconBtn = ({ icon, active, ...props }) => (
    <button className={`icon-btn ${active ? 'active' : ''}`} type="button" {...props}>{icon}</button>
);
const Divider = () => <div className="divider" />;
const Select = ({ value, opts, onChange }) => (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

export default ToolbarPlugin;