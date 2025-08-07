// src/plugins/textEditor/LexicalEditor.js
import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, $createListItemNode, $createListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $getRoot, $createTextNode, $createParagraphNode } from 'lexical';

import { editorTheme } from './editorTheme';
import ToolbarPlugin from './ToolbarPlugin';

// FIX: This custom plugin programmatically inserts templates into the editor state
const TemplatePlugin = ({ templateToInsert }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!templateToInsert) return;

    editor.update(() => {
      const root = $getRoot();
      const templateKey = templateToInsert.key;

      root.append($createParagraphNode()); // Add a space before inserting

      switch (templateKey) {
        case 'weeklyReview':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Weekly Review')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('Week 1: ')),
              $createListItemNode().append($createTextNode('Week 2: ')),
              $createListItemNode().append($createTextNode('Week 3: ')),
              $createListItemNode().append($createTextNode('Week 4: '))
            )
          );
          break;
        case 'savingsGoals':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Savings Goals')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('Emergency Fund: ')),
              $createListItemNode().append($createTextNode('Short-term Goal: ')),
              $createListItemNode().append($createTextNode('Long-term Goal: '))
            )
          );
          break;
        case 'billTracker':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Bill Tracker')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('[ ] Rent/Mortgage: ')),
              $createListItemNode().append($createTextNode('[ ] Utilities: ')),
              $createListItemNode().append($createTextNode('[ ] Insurance: '))
            )
          );
          break;
        case 'reflection':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Monthly Reflection')),
            $createParagraphNode().append($createTextNode('What went well:')),
            $createParagraphNode(),
            $createParagraphNode().append($createTextNode('Areas for improvement:'))
          );
          break;
        default:
          break;
      }
    });
  }, [templateToInsert, editor]);

  return null;
};

function Placeholder() {
  return <div className="editor-placeholder">Enter your notes...</div>;
}

const LexicalEditor = ({ value, onChange, templateToInsert }) => {
  const initialConfig = {
    namespace: 'MyNotesEditor',
    theme: editorTheme,
    editorState: value,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      AutoLinkNode,
      LinkNode
    ],
    onError: (error) => console.error(error),
  };

  const handleOnChange = (editorState) => {
    onChange(JSON.stringify(editorState.toJSON()));
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<Placeholder />}
            ErrorBoundary={({ error }) => <div>{error.message}</div>}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <OnChangePlugin onChange={handleOnChange} />
          <TemplatePlugin templateToInsert={templateToInsert} />
        </div>
      </div>
    </LexicalComposer>
  );
};

export default LexicalEditor;