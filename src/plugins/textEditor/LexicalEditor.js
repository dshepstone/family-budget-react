// src/plugins/textEditor/LexicalEditor.js
import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { ImageNode } from './ImageNode';
import ImagePlugin from './ImagePlugin';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, $createListItemNode, $createListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { $getRoot, $createTextNode, $createParagraphNode } from 'lexical';

import { editorTheme } from './editorTheme';
import ToolbarPlugin from './ToolbarPlugin';

// The TemplatePlugin for adding content from the template buttons
const TemplatePlugin = ({ templateToInsert }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!templateToInsert) return;
    editor.update(() => {
      const root = $getRoot();
      const templateKey = templateToInsert.key;
      root.append($createParagraphNode());
      switch (templateKey) {
        case 'weeklyReview':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Weekly Review')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('Week 1: ')),
              $createListItemNode().append($createTextNode('Week 2: ')),
            )
          );
          break;
        case 'savingsGoals':
          root.append(
            $createHeadingNode('h2').append($createTextNode('Savings Goals')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('Emergency Fund: ')),
              $createListItemNode().append($createTextNode('Short-term Goal: ')),
            )
          );
          break;
        // Add other cases here
        default: break;
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
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, AutoLinkNode, LinkNode, ImageNode, TableNode, TableCellNode, TableRowNode],
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
          <TablePlugin />
          <ImagePlugin />
          <OnChangePlugin onChange={handleOnChange} />
          {/* FIX: The StateSyncPlugin has been removed as it's no longer needed */}
          <TemplatePlugin templateToInsert={templateToInsert} />
        </div>
      </div>
    </LexicalComposer>
  );
};

export default LexicalEditor;