// src/components/CalculatorModal.js - Enhanced with Receipt View and Overflow Handling
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import './CalculatorModal.css';


// Safe arithmetic expression evaluator (no eval / new Function)
function evaluateExpression(expr) {
  const tokens = expr.match(/(\d+(?:\.\d+)?)|[+\-*/()]|\s+/g)?.filter(t => !/^\s+$/.test(t)) || [];
  const prec = { '+':1, '-':1, '*':2, '/':2 };
  const output = [];
  const opStack = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+(?:\.\d+)?$/.test(t)) { output.push(parseFloat(t)); continue; }
    if (t === '(') { opStack.push(t); continue; }
    if (t === ')') {
      while (opStack.length && opStack[opStack.length-1] !== '(') output.push(opStack.pop());
      if (opStack.pop() !== '(') throw new Error('Mismatched parentheses');
      continue;
    }
    if (/[+\-*/]/.test(t)) {
      const prev = tokens[i-1];
      const unaryMinus = (t === '-' && (i === 0 || prev === '(' || /[+\-*/]/.test(prev)));
      if (unaryMinus) output.push(0);
      while (opStack.length) {
        const top = opStack[opStack.length-1];
        if (/[+\-*/]/.test(top) && prec[top] >= prec[t]) output.push(opStack.pop()); else break;
      }
      opStack.push(t);
      continue;
    }
    throw new Error('Invalid token');
  }
  while (opStack.length) {
    const op = opStack.pop();
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
    output.push(op);
  }
  const stack = [];
  for (const x of output) {
    if (typeof x === 'number') { stack.push(x); continue; }
    const b = stack.pop(); const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error('Invalid expression');
    switch (x) {
      case '+': stack.push(a + b); break;
      case '-': stack.push(a - b); break;
      case '*': stack.push(a * b); break;
      case '/': if (b === 0) throw new Error('Invalid calculation'); stack.push(a / b); break;
      default: throw new Error('Invalid operator');
    }
  }
  const result = stack.pop();
  if (stack.length || !isFinite(result)) throw new Error('Invalid calculation');
  return result;
}
const CalculatorModal = ({ onClose }) => {
    const [input, setInput] = useState('');
    const [previousExpression, setPreviousExpression] = useState('');
    const [isError, setIsError] = useState(false);
    const [isResultDisplayed, setIsResultDisplayed] = useState(false);
    
    // Memory and History Features
    const [memory, setMemory] = useState(0);
    const [showMemoryIndicator, setShowMemoryIndicator] = useState(false);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    
    const nodeRef = useRef(null);
    const inputRef = useRef(null);
    const historyRef = useRef(null);

    // Handle clicks outside hamburger menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showHamburgerMenu && nodeRef.current && !nodeRef.current.contains(event.target)) {
                setShowHamburgerMenu(false);
            }
        };

        if (showHamburgerMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHamburgerMenu]);

    // Focus management
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Auto-scroll history to bottom when new items are added
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [history]);

    // Load memory and history from sessionStorage on mount
    useEffect(() => {
        const savedMemory = sessionStorage.getItem('calculator-memory');
        const savedHistory = sessionStorage.getItem('calculator-history');
        
        if (savedMemory) {
            const memValue = parseFloat(savedMemory);
            if (!isNaN(memValue) && memValue !== 0) {
                setMemory(memValue);
                setShowMemoryIndicator(true);
            }
        }
        
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory)) {
                    setHistory(parsedHistory);
                }
            } catch (e) {
                console.warn('Failed to load calculator history:', e);
            }
        }
    }, []);

    // Save memory to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('calculator-memory', memory.toString());
        setShowMemoryIndicator(memory !== 0);
    }, [memory]);

    // Save history to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('calculator-history', JSON.stringify(history));
    }, [history]);

    // Enhanced keyboard input handling - works when mouse is over calculator window
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Only handle keyboard when mouse is over calculator or input is focused
            const calculatorElement = nodeRef.current;
            const isMouseOverCalculator = calculatorElement && calculatorElement.matches(':hover');
            const isInputFocused = document.activeElement === inputRef.current;
            
            if (!isMouseOverCalculator && !isInputFocused) {
                return;
            }

            const key = event.key;
            
            // Prevent default for calculator-related keys
            if (/[0-9+\-*/.=]/.test(key) || key === 'Enter' || key === 'Escape' || key === 'Backspace' || key === 'Delete') {
                event.preventDefault();
                event.stopPropagation();
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
            // Memory shortcuts
            else if (event.ctrlKey && key === 'm') {
                event.preventDefault();
                event.stopPropagation();
                handleMemoryStore();
            } else if (event.ctrlKey && key === 'r') {
                event.preventDefault();
                event.stopPropagation();
                handleMemoryRecall();
            } else if (event.ctrlKey && key === 'l') {
                event.preventDefault();
                event.stopPropagation();
                handleMemoryClear();
            }
        };

        // Add event listener to the entire document to catch all keyboard events
        document.addEventListener('keydown', handleKeyDown);
        
        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [input, isError, memory, previousExpression, isResultDisplayed]);

    const handleButtonClick = (value) => {
        // Ensure input field gets focus when clicking buttons
        if (inputRef.current) {
            inputRef.current.focus();
        }
        
        if (isError) {
            setInput(value);
            setIsError(false);
            setPreviousExpression('');
            setIsResultDisplayed(false);
        } else if (isResultDisplayed && /[0-9.]/.test(value)) {
            // If a result is displayed and user enters a number, start fresh
            setInput(value);
            setPreviousExpression('');
            setIsResultDisplayed(false);
        } else if (isResultDisplayed && /[+\-*/]/.test(value)) {
            // If a result is displayed and user enters an operator, continue with the result
            setPreviousExpression(input + ' ' + value);
            setInput('');
            setIsResultDisplayed(false);
        } else if (/[+\-*/]/.test(value)) {
            // WINDOWS BEHAVIOR: When user enters an operator, move current input to previous expression
            if (input) {
                setPreviousExpression(input + ' ' + value);
                setInput('');
                setIsResultDisplayed(false);
            } else if (previousExpression) {
                // If there's already a previous expression, update the operator
                const expressionWithoutOperator = previousExpression.replace(/[\s+\-*/=]+$/, '');
                setPreviousExpression(expressionWithoutOperator + ' ' + value);
            }
        } else {
            // Numbers and decimal point
            setInput(prev => prev + value);
        }
    };

    const handleClear = () => {
        setInput('');
        setPreviousExpression('');
        setIsError(false);
        setLastResult(null);
        setIsResultDisplayed(false);
        // Keep focus on input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleClearEntry = () => {
        setInput('');
        setIsError(false);
        // Keep focus on input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleBackspace = () => {
        if (isError || isResultDisplayed) {
            handleClearEntry();
        } else {
            setInput(prev => prev.slice(0, -1));
        }
        // Keep focus on input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Enhanced calculate function with overflow handling and smart operator handling
    const handleCalculate = () => {
        if (isError) return;
        
        let fullExpression = '';
        if (previousExpression && input) {
            fullExpression = previousExpression + ' ' + input;
        } else if (input) {
            fullExpression = input;
        } else if (previousExpression) {
            // If there's only previous expression, use it
            fullExpression = previousExpression;
        } else {
            return;
        }
        
        try {
            // Smart handling of trailing operators - remove them before calculation
            let cleanExpression = fullExpression.trim();
            
            // Remove trailing operators (handles cases like "25+25+" or "25+25+=")
            cleanExpression = cleanExpression.replace(/[\+\-\*\/=\s]+$/, '');
            
            // If expression is empty after cleaning, return
            if (!cleanExpression) return;
            
            // Basic validation to prevent code injection
            const sanitizedInput = cleanExpression.replace(/[^0-9+\-*/.() ]/g, '');
            
            // If sanitized input is empty, return
            if (!sanitizedInput) return;
            
            const result = evaluateExpression(sanitizedInput);
            
            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }
            
            // Add to history with the cleaned expression
            const historyEntry = {
                id: Date.now(),
                expression: cleanExpression,
                result: result,
                timestamp: new Date().toLocaleTimeString(),
                fullTimestamp: new Date().toLocaleString()
            };
            
            setHistory(prev => [...prev, historyEntry]);
            setLastResult(result);
            
            // Handle display overflow
            const resultString = String(result);
            setPreviousExpression(cleanExpression + ' =');
            setInput(resultString);
            setIsResultDisplayed(true);
            
            // Keep focus on input
            if (inputRef.current) {
                inputRef.current.focus();
            }
            
        } catch (error) {
            let errorExpression = fullExpression;
            
            // Try to clean the expression for error display too
            if (fullExpression.trim()) {
                errorExpression = fullExpression.trim().replace(/[\+\-\*\/=\s]+$/, '');
            }
            
            const errorEntry = {
                id: Date.now(),
                expression: errorExpression || fullExpression,
                result: 'Error',
                timestamp: new Date().toLocaleTimeString(),
                fullTimestamp: new Date().toLocaleString(),
                isError: true
            };
            
            setHistory(prev => [...prev, errorEntry]);
            setInput('Error');
            setIsError(true);
            setPreviousExpression('');
            setIsResultDisplayed(false);
            
            // Keep focus on input
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    // Memory functions
    const handleMemoryStore = () => {
        const currentValue = parseFloat(input) || 0;
        setMemory(currentValue);
        
        // Add to history
        const memoryEntry = {
            id: Date.now(),
            expression: `Memory Store: ${currentValue}`,
            result: `M = ${currentValue}`,
            timestamp: new Date().toLocaleTimeString(),
            fullTimestamp: new Date().toLocaleString(),
            isMemory: true
        };
        
        setHistory(prev => [...prev, memoryEntry]);
    };

    const handleMemoryRecall = () => {
        if (memory !== 0) {
            if (isError || isResultDisplayed) {
                setInput(String(memory));
                setIsError(false);
                setPreviousExpression('');
                setIsResultDisplayed(false);
            } else {
                setInput(prev => prev + String(memory));
            }
            
            // Add to history
            const recallEntry = {
                id: Date.now(),
                expression: 'Memory Recall',
                result: memory,
                timestamp: new Date().toLocaleTimeString(),
                fullTimestamp: new Date().toLocaleString(),
                isMemory: true
            };
            
            setHistory(prev => [...prev, recallEntry]);
        }
    };

    const handleMemoryClear = () => {
        setMemory(0);
        
        // Add to history
        const clearEntry = {
            id: Date.now(),
            expression: 'Memory Clear',
            result: 'M = 0',
            timestamp: new Date().toLocaleTimeString(),
            fullTimestamp: new Date().toLocaleString(),
            isMemory: true
        };
        
        setHistory(prev => [...prev, clearEntry]);
    };

    const handleMemoryAdd = () => {
        const currentValue = parseFloat(input) || 0;
        const newMemory = memory + currentValue;
        setMemory(newMemory);
        
        // Add to history
        const addEntry = {
            id: Date.now(),
            expression: `Memory Add: ${currentValue}`,
            result: `M = ${newMemory}`,
            timestamp: new Date().toLocaleTimeString(),
            fullTimestamp: new Date().toLocaleString(),
            isMemory: true
        };
        
        setHistory(prev => [...prev, addEntry]);
    };

    const handleMemorySubtract = () => {
        const currentValue = parseFloat(input) || 0;
        const newMemory = memory - currentValue;
        setMemory(newMemory);
        
        // Add to history
        const subtractEntry = {
            id: Date.now(),
            expression: `Memory Subtract: ${currentValue}`,
            result: `M = ${newMemory}`,
            timestamp: new Date().toLocaleTimeString(),
            fullTimestamp: new Date().toLocaleString(),
            isMemory: true
        };
        
        setHistory(prev => [...prev, subtractEntry]);
    };

    // Handle paste events
    const handlePaste = (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        
        // Validate pasted content
        const validChars = /^[0-9+\-*/.() ]*$/;
        if (validChars.test(pastedText)) {
            if (isError || isResultDisplayed) {
                setInput(pastedText);
                setIsError(false);
                setPreviousExpression('');
                setIsResultDisplayed(false);
            } else {
                setInput(prev => prev + pastedText);
            }
        }
    };

    // Handle input changes
    const handleInputChange = (event) => {
        const value = event.target.value;
        // Only allow valid calculator characters
        const validChars = /^[0-9+\-*/.() ]*$/;
        if (validChars.test(value)) {
            setInput(value);
            if (isError) {
                setIsError(false);
                setPreviousExpression('');
                setIsResultDisplayed(false);
            }
        }
    };

    // Clear all history
    const handleClearHistory = () => {
        if (window.confirm('Clear all calculation history?')) {
            setHistory([]);
            sessionStorage.removeItem('calculator-history');
        }
    };

    // Use history item
    const handleUseHistoryItem = (item) => {
        if (item.isError) return;
        
        const value = typeof item.result === 'number' ? String(item.result) : item.expression;
        if (isError || isResultDisplayed) {
            setInput(value);
            setIsError(false);
            setPreviousExpression('');
            setIsResultDisplayed(false);
        } else {
            setInput(prev => prev + value);
        }
        
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Toggle hamburger menu
    const toggleHamburgerMenu = (event) => {
        event.stopPropagation();
        setShowHamburgerMenu(!showHamburgerMenu);
    };

    // Handle menu item clicks
    const handleMenuItemClick = (action, event) => {
        event.stopPropagation();
        switch (action) {
            case 'history':
                setShowHistory(!showHistory);
                break;
            case 'clearHistory':
                handleClearHistory();
                break;
            default:
                break;
        }
        setShowHamburgerMenu(false);
    };

    const formatDisplayValue = (value) => {
        if (!value || value === '0') return '0';
        
        // Handle very long numbers by using scientific notation if needed
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (numValue.toString().length > 12) {
                return numValue.toExponential(6);
            }
        }
        
        return value;
    };

    const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];

    return (
        <Draggable handle=".calculator-header" cancel=".hamburger-menu, .hamburger-dropdown, .close-button" nodeRef={nodeRef}>
            <div ref={nodeRef} className="calculator-modal enhanced">
                <div className="calculator-header">
                    <div className="header-left">
                        <button
                            className="hamburger-menu"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={toggleHamburgerMenu}
                            title="Menu"
                        >
                            ☰
                        </button>
                        <h4 id="calculator-title">
                            🧮 Calculator
                            {showMemoryIndicator && (
                                <span className="memory-indicator" title={`Memory: ${memory}`}>
                                    M
                                </span>
                            )}
                        </h4>

                        {/* Hamburger Menu - Positioned under button */}
                        {showHamburgerMenu && (
                            <div 
                                className="hamburger-dropdown" 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div 
                                    className="menu-item"
                                    onClick={(e) => handleMenuItemClick('history', e)}
                                >
                                    📊 {showHistory ? 'Hide' : 'Show'} History
                                </div>
                                <div 
                                    className="menu-item"
                                    onClick={(e) => handleMenuItemClick('clearHistory', e)}
                                >
                                    🗑️ Clear History
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="header-controls">
                        <button 
                            className="close-button" 
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={onClose}
                        >×</button>
                    </div>
                </div>
                
                <div className="calculator-content">
                    {/* History Panel / Receipt */}
                    {showHistory && (
                        <div className="history-panel">
                            <div className="history-header">
                                <span>Receipt History</span>
                                <button
                                    className="close-history"
                                    onClick={() => setShowHistory(false)}
                                    title="Close History"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="history-list" ref={historyRef}>
                                {history.length === 0 ? (
                                    <div className="history-empty">No calculations yet</div>
                                ) : (
                                    history.map(item => (
                                        <div
                                            key={item.id}
                                            className={`history-item ${item.isError ? 'error' : ''} ${item.isMemory ? 'memory' : ''}`}
                                            onClick={() => handleUseHistoryItem(item)}
                                            title="Click to use this value"
                                        >
                                            <div className="history-expression">{item.expression}</div>
                                            <div className="history-result">= {item.result}</div>
                                            <div className="history-time">{item.fullTimestamp}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Calculator Panel */}
                    <div className="calculator-panel">
                        {/* Enhanced display with Windows-like previous expression */}
                        <div className="display-container">
                            {/* Previous Expression Display (Windows-like) */}
                            {previousExpression && (
                                <div className="previous-expression">
                                    {previousExpression}
                                </div>
                            )}

                            {/* Main Calculator Display */}
                            <input
                                ref={inputRef}
                                type="text"
                                className={`calculator-display ${isError ? 'error' : ''} ${previousExpression ? 'has-previous' : ''}`}
                                value={formatDisplayValue(input) || '0'}
                                onChange={handleInputChange}
                                onPaste={handlePaste}
                                placeholder="0"
                                autoComplete="off"
                                spellCheck="false"
                            />
                        </div>
                        
                        {/* Memory Controls */}
                        <div className="memory-controls">
                            <button 
                                className="memory-btn"
                                onClick={handleMemoryClear}
                                title="Memory Clear (Ctrl+L)"
                                disabled={memory === 0}
                            >
                                MC
                            </button>
                            <button 
                                className="memory-btn"
                                onClick={handleMemoryRecall}
                                title="Memory Recall (Ctrl+R)"
                                disabled={memory === 0}
                            >
                                MR
                            </button>
                            <button 
                                className="memory-btn"
                                onClick={handleMemoryStore}
                                title="Memory Store (Ctrl+M)"
                            >
                                MS
                            </button>
                            <button 
                                className="memory-btn"
                                onClick={handleMemoryAdd}
                                title="Memory Add"
                            >
                                M+
                            </button>
                            <button 
                                className="memory-btn"
                                onClick={handleMemorySubtract}
                                title="Memory Subtract"
                            >
                                M-
                            </button>
                        </div>
                        
                        {/* Standard Keypad */}
                        <div className="keypad-grid">
                            <button className="keypad-button clear" onClick={handleClear}>C</button>
                            <button className="keypad-button clear-entry" onClick={handleClearEntry}>CE</button>
                            <button className="keypad-button backspace" onClick={handleBackspace}>⌫</button>
                            <button className="keypad-button operator" onClick={() => handleButtonClick('/')}>÷</button>
                            
                            <button className="keypad-button number" onClick={() => handleButtonClick('7')}>7</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('8')}>8</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('9')}>9</button>
                            <button className="keypad-button operator" onClick={() => handleButtonClick('*')}>×</button>
                            
                            <button className="keypad-button number" onClick={() => handleButtonClick('4')}>4</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('5')}>5</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('6')}>6</button>
                            <button className="keypad-button operator" onClick={() => handleButtonClick('-')}>-</button>
                            
                            <button className="keypad-button number" onClick={() => handleButtonClick('1')}>1</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('2')}>2</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('3')}>3</button>
                            <button className="keypad-button operator" onClick={() => handleButtonClick('+')}>+</button>
                            
                            <button className="keypad-button number zero" onClick={() => handleButtonClick('0')}>0</button>
                            <button className="keypad-button number" onClick={() => handleButtonClick('.')}>.</button>
                            <button className="keypad-button equals" onClick={handleCalculate}>=</button>
                        </div>
                        
                        {/* Enhanced Instructions */}
                        <div className="calculator-instructions">
                            <small>
                                💡 <strong>Memory:</strong> Ctrl+M (Store) • Ctrl+R (Recall) • Ctrl+L (Clear)<br/>
                                <strong>Menu:</strong> Click ☰ for receipt history and more options<br/>
                                <strong>Input:</strong> Type, Ctrl+C/V, Enter for equals, Esc to clear
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    );
};

export default CalculatorModal;