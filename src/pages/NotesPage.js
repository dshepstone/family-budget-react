// src/pages/NotesPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext';
import LexicalEditor from '../plugins/textEditor/LexicalEditor';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// --- FIX: Helper functions to handle data migration ---

/**
 * Checks if a string is a valid JSON.
 * @param {string} str The string to check.
 * @returns {boolean}
 */
function isJsonString(str) {
    if (typeof str !== 'string') return false;
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * Converts a plain text or Markdown string into a basic Lexical JSON state.
 * This prevents the app from crashing when loading old data.
 * @param {string} text The plain text to convert.
 * @returns {string} A JSON string representing a valid Lexical state.
 */
function plainTextToLexicalJson(text) {
    return JSON.stringify({
        root: {
            children: [
                {
                    children: [
                        {
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text: text,
                            type: 'text',
                            version: 1,
                        },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1,
                },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
        },
    });
}


const NotesPage = () => {
    const { actions, formatCurrency } = useBudget();
    const [notes, setNotes] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [lastSaved, setLastSaved] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [isAutoSave, setIsAutoSave] = useState(true);
    const [templateToInsert, setTemplateToInsert] = useState(null);

    const getDefaultNoteContent = useCallback(() => {
        const currentYear = new Date().getFullYear();
        const monthName = MONTH_NAMES[currentMonth];
        const netIncome = actions.calculations?.getNetMonthlyIncome?.() || 0;

        return `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"# ${monthName} ${currentYear} Budget Notes","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","tag":"h1","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"- Net Income: ${formatCurrency(netIncome)}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

    }, [currentMonth, actions.calculations, formatCurrency]);

    const saveNotes = useCallback(() => {
        if (notes === null) return;
        localStorage.setItem(`budget-notes-${currentMonth}`, notes);
        localStorage.setItem(`budget-notes-title-${currentMonth}`, noteTitle);
        const now = new Date();
        localStorage.setItem(`budget-notes-lastsaved-${currentMonth}`, now.toISOString());
        setLastSaved(now);
    }, [notes, noteTitle, currentMonth]);

    useEffect(() => {
        let savedNotes = localStorage.getItem(`budget-notes-${currentMonth}`);
        const savedTitle = localStorage.getItem(`budget-notes-title-${currentMonth}`);

        // FIX: Check if the saved data is valid JSON. If not, convert it.
        if (savedNotes && !isJsonString(savedNotes)) {
            savedNotes = plainTextToLexicalJson(savedNotes);
        }

        setNotes(savedNotes || getDefaultNoteContent());
        setNoteTitle(savedTitle || `${MONTH_NAMES[currentMonth]} Budget Notes`);

        const lastSaveTime = localStorage.getItem(`budget-notes-lastsaved-${currentMonth}`);
        setLastSaved(lastSaveTime ? new Date(lastSaveTime) : null);
    }, [currentMonth, getDefaultNoteContent]);

    useEffect(() => {
        if (!isAutoSave) return;
        const autoSaveTimer = setTimeout(saveNotes, 2000);
        return () => clearTimeout(autoSaveTimer);
    }, [notes, noteTitle, isAutoSave, saveNotes]);

    const handleAddTemplate = (templateKey) => {
        setTemplateToInsert({ key: templateKey, timestamp: Date.now() });
    };

    if (notes === null) {
        return <div>Loading notes...</div>;
    }

    return (
        <div className="page-container">
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
                            <Button onClick={saveNotes} disabled={isAutoSave}>💾 Save</Button>
                        </div>
                    </div>
                    <LexicalEditor
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
        </div>
    );
};

export default NotesPage;