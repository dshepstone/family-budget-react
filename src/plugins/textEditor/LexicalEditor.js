// src/plugins/textEditor/LexicalEditor.js
// Simplified text editor without Lexical dependencies
import React, { useState, useCallback } from 'react';

const LexicalEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter your text...',
  className = '',
  showToolbar = true,
  readOnly = false,
  autoFocus = false
}) => {
  const [textValue, setTextValue] = useState(value);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange]);

  const formatText = (format) => {
    const textarea = document.getElementById('simple-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textValue.substring(start, end);

    if (!selectedText) return;

    let formattedText = selectedText;
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `_${selectedText}_`;
        break;
      default:
        break;
    }

    const newValue = textValue.substring(0, start) + formattedText + textValue.substring(end);
    setTextValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const insertList = (listType) => {
    const textarea = document.getElementById('simple-editor');
    const start = textarea.selectionStart;
    const listItem = listType === 'bullet' ? '• ' : '1. ';

    const newValue = textValue.substring(0, start) + listItem + textValue.substring(start);
    setTextValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={`simple-editor-container ${className}`}>
      {showToolbar && !readOnly && (
        <div className="simple-toolbar">
          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => formatText('bold')}
              title="Bold (Markdown: **text**)"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => formatText('italic')}
              title="Italic (Markdown: *text*)"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => formatText('underline')}
              title="Underline (Markdown: _text_)"
            >
              <u>U</u>
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertList('bullet')}
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => insertList('number')}
              title="Numbered List"
            >
              1. List
            </button>
          </div>
        </div>
      )}

      <div className="simple-editor-wrapper">
        <textarea
          id="simple-editor"
          className="simple-editor-textarea"
          value={textValue}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          autoFocus={autoFocus}
          style={{
            minHeight: '150px',
            width: '100%',
            padding: '12px',
            border: '1px solid var(--input-border, #bdc3c7)',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'vertical',
            backgroundColor: readOnly ? 'var(--disabled-bg, #f5f5f5)' : 'var(--input-bg, #ffffff)',
            color: 'var(--text-primary, #2c3e50)'
          }}
        />
      </div>

      <div className="editor-help">
        <small style={{ color: 'var(--text-muted, #95a5a6)', fontSize: '12px' }}>
          Supports Markdown: **bold**, *italic*, _underline_, • bullets, 1. numbers
        </small>
      </div>
    </div>
  );
};

export default LexicalEditor;