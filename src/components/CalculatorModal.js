// src/components/CalculatorModal.js
import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import './CalculatorModal.css';

const CalculatorModal = ({ onClose }) => {
    const [input, setInput] = useState('');

    const handleButtonClick = (value) => {
        setInput(prev => prev + value);
    };

    const handleClear = () => {
        setInput('');
    };

    const handleCalculate = () => {
        try {
            // Using eval() is acceptable for this simple, controlled use case.
            const result = eval(input);
            setInput(String(result));
        } catch (error) {
            setInput('Error');
        }
    };

    // Allow closing the modal with the 'Escape' key
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const buttons = [
        '7', '8', '9', '/',
        '4', '5', '6', '*',
        '1', '2', '3', '-',
        '0', '.', '=', '+'
    ];

    return (
        // Wrap your modal with the Draggable component
        // The `handle` prop tells Draggable which part initiates a drag
        <Draggable handle=".calculator-header">
            <div className="calculator-modal" onClick={(e) => e.stopPropagation()}>
                {/* The header is now the "handle" for moving the window */}
                <div className="calculator-header">
                    <h4>🧮 Calculator</h4>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="calculator-display">{input || '0'}</div>
                <div className="calculator-keypad">
                    <button className="keypad-button clear" onClick={handleClear}>C</button>
                    <div className="keypad-grid">
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
            </div>
        </Draggable>
    );
};

export default CalculatorModal;