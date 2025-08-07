// src/plugins/textEditor/ImageNode.js
import { DecoratorNode } from 'lexical';

function ImageComponent({ src, altText }) {
    return <img src={src} alt={altText} style={{ maxWidth: '100%' }} />;
}

export class ImageNode extends DecoratorNode {
    __src;
    __altText;

    static getType() {
        return 'image';
    }

    static clone(node) {
        return new ImageNode(node.__src, node.__altText, node.__key);
    }

    // --- FIX: Add the required importJSON and exportJSON methods ---

    static importJSON(serializedNode) {
        const { src, altText } = serializedNode;
        return $createImageNode({ src, altText });
    }

    exportJSON() {
        return {
            src: this.__src,
            altText: this.__altText,
            type: 'image',
            version: 1,
        };
    }

    // ---------------------------------------------------------

    constructor(src, altText, key) {
        super(key);
        this.__src = src;
        this.__altText = altText;
    }

    createDOM() {
        return document.createElement('span');
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return <ImageComponent src={this.__src} altText={this.__altText} />;
    }
}

export function $createImageNode({ altText, src }) {
    return new ImageNode(src, altText);
}

export function $isImageNode(node) {
    return node instanceof ImageNode;
}