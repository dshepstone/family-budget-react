// src/plugins/textEditor/ImagePlugin.js
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
// FIX: Corrected the import path to look in the same directory.
import { $createImageNode } from './ImageNode';
import { createCommand, COMMAND_PRIORITY_EDITOR } from 'lexical';

export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND');

export default function ImagePlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            INSERT_IMAGE_COMMAND,
            (payload) => {
                const imageSrc = prompt('Enter image URL:', payload.src || 'https://via.placeholder.com/300');
                if (imageSrc) {
                    const imageNode = $createImageNode({ altText: payload.altText, src: imageSrc });
                    editor.update(() => {
                        // To insert at the current selection, you might use:
                        // const selection = $getSelection();
                        // if ($isRangeSelection(selection)) {
                        //   selection.insertNodes([imageNode]);
                        // }
                        // For simplicity here, we'll append to the root.
                        editor.getRootElement().append(imageNode);
                    });
                }
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}