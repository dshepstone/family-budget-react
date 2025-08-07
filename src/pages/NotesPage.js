// src/pages/NotesPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import LexicalEditor from '../plugins/textEditor/LexicalEditor';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { createHeadlessEditor } from '@lexical/headless';
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ImageNode } from '../plugins/textEditor/ImageNode';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function isJsonString(str) {
    if (typeof str !== 'string') return false;
    try { JSON.parse(str); } catch (e) { return false; }
    return true;
}

function plainTextToLexicalJson(text) {
    return JSON.stringify({ root: { children: [{ children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }], direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1 }], direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 } });
}

const EMPTY_NOTE_STATE = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const NotesPage = () => {
    const { actions, formatCurrency } = useBudget();
    const [notes, setNotes] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [lastSaved, setLastSaved] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [isAutoSave, setIsAutoSave] = useState(true);

    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const fileInputRef = useRef(null);
    const [templateToInsert, setTemplateToInsert] = useState(null);
    const [editorKey, setEditorKey] = useState(0);

    const getDefaultNoteContent = useCallback(() => {
        const currentYear = new Date().getFullYear();
        const monthName = MONTH_NAMES[currentMonth];
        const netIncome = actions.calculations?.getNetMonthlyIncome?.() || 0;

        return `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"# ${monthName} ${currentYear} Budget Notes","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","tag":"h1","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"- Net Income: ${formatCurrency(netIncome)}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
    }, [currentMonth, actions.calculations, formatCurrency]);

    const saveContentToStorage = (contentToSave) => {
        localStorage.setItem(`budget-notes-${currentMonth}`, contentToSave);
        localStorage.setItem(`budget-notes-title-${currentMonth}`, noteTitle);
        const now = new Date();
        localStorage.setItem(`budget-notes-lastsaved-${currentMonth}`, now.toISOString());
        setLastSaved(now);
    };

    const autoSaveNotes = useCallback(() => {
        if (notes === null) return;
        saveContentToStorage(notes);
    }, [notes, noteTitle, currentMonth]);

    useEffect(() => {
        let savedNotes = localStorage.getItem(`budget-notes-${currentMonth}`);
        const savedTitle = localStorage.getItem(`budget-notes-title-${currentMonth}`);

        if (savedNotes && !isJsonString(savedNotes)) {
            savedNotes = plainTextToLexicalJson(savedNotes);
        }

        setNotes(savedNotes || getDefaultNoteContent());
        setNoteTitle(savedTitle || `${MONTH_NAMES[currentMonth]} Budget Notes`);
        setEditorKey(k => k + 1);

        const lastSaveTime = localStorage.getItem(`budget-notes-lastsaved-${currentMonth}`);
        setLastSaved(lastSaveTime ? new Date(lastSaveTime) : null);
    }, [currentMonth, getDefaultNoteContent]);

    useEffect(() => {
        if (!isAutoSave) return;
        const autoSaveTimer = setTimeout(autoSaveNotes, 2000);
        return () => clearTimeout(autoSaveTimer);
    }, [notes, noteTitle, isAutoSave, autoSaveNotes]);

    const handleImport = () => { fileInputRef.current?.click(); };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const newNotes = isJsonString(content) ? content : plainTextToLexicalJson(content);
            setNotes(newNotes);
            saveContentToStorage(newNotes);
            setEditorKey(k => k + 1);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExport = () => { /* ... (code unchanged) ... */ };
    const handleAddTemplate = (templateKey) => setTemplateToInsert({ key: templateKey, timestamp: Date.now() });

    const handleConfirm = (action) => {
        setConfirmAction(action);
        setShowConfirm(true);
    };

    const executeConfirm = () => {
        const newNotes = confirmAction === 'clear' ? EMPTY_NOTE_STATE : getDefaultNoteContent();

        setNotes(newNotes);
        saveContentToStorage(newNotes);
        setEditorKey(k => k + 1);

        setShowConfirm(false);
        setConfirmAction(null);
    };

    if (notes === null) {
        return <div>Loading notes...</div>;
    }

    return (
        <div className="page-container">
            {/* FIX: Confirmation Modal is now at the top of the component tree */}
            {showConfirm && (
                <div className="confirmation-overlay">
                    <div className="confirmation-modal">
                        <h3>⚠️ Confirm {confirmAction}</h3>
                        <p>Are you sure you want to {confirmAction} the notes? This action cannot be undone.</p>
                        <div className="confirmation-actions">
                            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                            <Button variant="danger" onClick={executeConfirm}>
                                Yes, {confirmAction}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-content">
                <div className="notes-header">
                    <h1 className="page-title">📝 Budget Notes</h1>
                    {lastSaved && <div className="last-saved">✅ Saved: {lastSaved.toLocaleTimeString()}</div>}
                </div>
                <Card className="notes-editor-card">
                    <div className="card-header">
                        <Input
                            type="text"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="Note title..."
                            className="note-title-input"
                        />
                        <div className="notes-actions">
                            <label className="auto-save-toggle">
                                <input type="checkbox" checked={isAutoSave} onChange={(e) => setIsAutoSave(e.target.checked)} />
                                <span>Auto-save</span>
                            </label>
                            <Button onClick={() => autoSaveNotes()}>💾 Save</Button>
                            <Button variant="outline" onClick={handleImport}>📥 Import</Button>
                            <Button variant="outline" onClick={handleExport}>📄 Export MD</Button>
                            <Button variant="danger" onClick={() => handleConfirm('reset')}>🔄 Reset</Button>
                            <Button variant="danger" onClick={() => handleConfirm('clear')}>❌ Clear</Button>
                        </div>
                    </div>
                    <LexicalEditor
                        key={editorKey}
                        value={notes}
                        onChange={setNotes}
                        templateToInsert={templateToInsert}
                    />
                </Card>
                <Card className="quick-templates-card">
                    <div className="card-header"><h3>📋 Quick Templates</h3></div>
                    <div className="card-content">
                        <div className="templates-grid">
                            <Button onClick={() => handleAddTemplate('weeklyReview')}>📅 Weekly Review</Button>
                            <Button onClick={() => handleAddTemplate('savingsGoals')}>🎯 Savings Goals</Button>
                            <Button onClick={() => handleAddTemplate('billTracker')}>📋 Bill Tracker</Button>
                            <Button onClick={() => handleAddTemplate('reflection')}>🤔 Reflection</Button>
                        </div>
                    </div>
                </Card>
            </div>

            <input ref={fileInputRef} type="file" accept=".json,.md,.txt" onChange={handleFileImport} style={{ display: 'none' }} />
        </div>
    );
};

export default NotesPage;