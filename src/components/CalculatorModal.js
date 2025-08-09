// src/components/CalculatorModal.js
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import './CalculatorModal.css';

const CalculatorModal = ({ onClose }) => {
    const [input, setInput] = useState('');
    const [isError, setIsError] = useState(false);
    const nodeRef = useRef(null);
    const inputRef = useRef(null); // Reference for the input field

    // Focus the input when component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Handle keyboard input - only when calculator input is focused
    useEffect(() => {
        const handleKeyDown = (event) => {
            // CRITICAL: Only handle keyboard events when calculator input is specifically focused
            // This prevents interference with the main budget application
            if (document.activeElement !== inputRef.current) {
                return;
            }

            const key = event.key;
            
            // Prevent default for calculator-related keys only when calculator is focused
            if (/[0-9+\-*/.=]/.test(key) || key === 'Enter' || key === 'Escape' || key === 'Backspace' || key === 'Delete') {
                event.preventDefault();
            }

            // Handle different key types
            if (/[0-9]/.test(key)) {
                handleButtonClick(key);
            } else if (['+', '-', '*', '/'].includes(key)) {
                handleButtonClick(key);
            } else if (key === '.') {
                handleButtonClick('.');
            } else if (key === 'Enter' || key === '=') {
                handleCalculate();
            } else if (key === 'Escape' || key === 'Delete') {
                handleClear();
            } else if (key === 'Backspace') {
                handleBackspace();
            }
        };

        // Add event listener only to the calculator input, not document
        if (inputRef.current) {
            inputRef.current.addEventListener('keydown', handleKeyDown);
        }
        
        // Cleanup
        return () => {
            if (inputRef.current) {
                inputRef.current.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [input, isError]); // Dependencies to ensure latest state

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
        // Keep focus on input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleBackspace = () => {
        if (isError) {
            handleClear();
        } else {
            setInput(prev => prev.slice(0, -1));
        }
    };

    const handleCalculate = () => {
        if (isError || input === '') return;
        try {
            // Basic validation to prevent code injection
            const sanitizedInput = input.replace(/[^0-9+\-*/.() ]/g, '');
            const result = new Function('return ' + sanitizedInput)();
            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }
            setInput(String(result));
        } catch (error) {
            setInput('Error');
            setIsError(true);
        }
    };

    // Handle paste events
    const handlePaste = (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        
        // Validate pasted content (only allow numbers, operators, decimal points, and parentheses)
        const validChars = /^[0-9+\-*/.() ]*$/;
        if (validChars.test(pastedText)) {
            if (isError) {
                setInput(pastedText);
                setIsError(false);
            } else {
                setInput(prev => prev + pastedText);
            }
        }
    };

    // Handle input changes (for direct typing)
    const handleInputChange = (event) => {
        const value = event.target.value;
        // Only allow valid calculator characters
        const validChars = /^[0-9+\-*/.() ]*$/;
        if (validChars.test(value)) {
            setInput(value);
            if (isError) {
                setIsError(false);
            }
        }
    };

    const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];

    return (
        <Draggable handle=".calculator-header" nodeRef={nodeRef}>
            <div ref={nodeRef} className="calculator-modal">
                <div className="calculator-header">
                    <h4 id="calculator-title">🧮 Calculator</h4>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                {/* Enhanced display with input field for copy/paste and keyboard input */}
                <input
                    ref={inputRef}
                    type="text"
                    className={`calculator-display ${isError ? 'error' : ''}`}
                    value={input || '0'}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    placeholder="0"
                    autoComplete="off"
                    spellCheck="false"
                />
                
                <div className="keypad-grid">
                    <button className="keypad-button clear" onClick={handleClear}>C</button>
                    <button className="keypad-button backspace" onClick={handleBackspace}>⌫</button>
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
                
                {/* Instructions */}
                <div className="calculator-instructions">
                    <small>
                        💡 Click input field to type • Ctrl+C to copy • Ctrl+V to paste • Enter for equals • Esc to clear
                    </small>
                </div>
            </div>
        </Draggable>
    );
};

export default CalculatorModal;