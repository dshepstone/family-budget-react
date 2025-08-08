// src/components/CalculatorModal.js
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import './CalculatorModal.css';

const CalculatorModal = ({ onClose }) => {
    const [input, setInput] = useState('');
    const [isError, setIsError] = useState(false);
    const nodeRef = useRef(null); // Create a ref

    const handleButtonClick = (value) => {
        if (isError) {
            setInput(value);
            setIsError(false);
        } else {
            setInput(prev => prev + value);
        }
    };

    const handleClear = () => {
        setInput('');
        setIsError(false);
    };

    const handleCalculate = () => {
        if (isError || input === '') return;
        try {
            const result = new Function('return ' + input)();
            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }
            setInput(String(result));
        } catch (error) {
            setInput('Error');
            setIsError(true);
        }
    };

    const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];

    return (
        // Pass the ref to the Draggable component
        <Draggable handle=".calculator-header" nodeRef={nodeRef}>
            {/* Attach the ref to the DOM node */}
            <div ref={nodeRef} className="calculator-modal" onClick={(e) => e.stopPropagation()}>
                <div className="calculator-header">
                    <h4 id="calculator-title">🧮 Calculator</h4>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className={`calculator-display ${isError ? 'error' : ''}`}>{input || '0'}</div>
                <div className="keypad-grid">
                    <button className="keypad-button clear" onClick={handleClear}>C</button>
                    {buttons.map((btn) => (
                        <button
                            key={btn}
                            className="keypad-button"
                            onClick={() => (btn === '=' ? handleCalculate() : handleButtonClick(btn))}
                        >
                            {btn}
                        </button>
                    ))}
                </div>
            </div>
        </Draggable>
    );
};

export default CalculatorModal;