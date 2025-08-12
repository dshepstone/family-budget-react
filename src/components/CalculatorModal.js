// src/components/CalculatorModal.js
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import '../styles/CalculatorModal.css';


/** Safe arithmetic evaluator (no eval) */
function evaluateExpression(expr) {
  const tokens = expr.match(/(\d+(?:\.\d+)?)|[+\-*/()]|\s+/g)?.filter(t => !/^\s+$/.test(t)) || [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output = [];
  const ops = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+(?:\.\d+)?$/.test(t)) { output.push(parseFloat(t)); continue; }
    if (t === '(') { ops.push(t); continue; }
    if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
      if (ops.pop() !== '(') throw new Error('Mismatched parentheses');
      continue;
    }
    if (/[+\-*/]/.test(t)) {
      const prev = tokens[i - 1];
      const unaryMinus = (t === '-' && (i === 0 || prev === '(' || /[+\-*/]/.test(prev)));
      if (unaryMinus) output.push(0);
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (/[+\-*/]/.test(top) && prec[top] >= prec[t]) output.push(ops.pop()); else break;
      }
      ops.push(t);
      continue;
    }
    throw new Error('Invalid token');
  }
  while (ops.length) {
    const op = ops.pop();
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

export default function CalculatorModal({ onClose }) {
  const [input, setInput] = useState('');
  const [previousExpression, setPreviousExpression] = useState('');
  const [isError, setIsError] = useState(false);
  const [isResultDisplayed, setIsResultDisplayed] = useState(false);

  const [memory, setMemory] = useState(0);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const nodeRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef(null);
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  // --- Position & layout: prevent initial "jump" --- //
  useLayoutEffect(() => {
    const W = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const H = typeof window !== 'undefined' ? window.innerHeight : 800;
    const modalW = showHistory ? 680 : 380; // Wider when history is shown
    const x = Math.max(12, Math.round((W - modalW) / 2));
    const y = Math.max(16, Math.round(H * 0.1));
    setInitialPos({ x, y });

    // Update width based on history visibility
    const el = nodeRef.current;
    if (el) {
      el.style.width = modalW + 'px';
      el.style.maxWidth = modalW + 'px';
    }
  }, [showHistory]);

  // --- Click outside hamburger closes it --- //
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showHamburgerMenu) return;
      const hamburgerEl = e.target.closest('.hamburger-menu');
      const dropdownEl = e.target.closest('.hamburger-dropdown');
      
      if (!hamburgerEl && !dropdownEl) {
        setShowHamburgerMenu(false);
      }
    };
    
    if (showHamburgerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHamburgerMenu]);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll history view
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [history, showHistory]);

  // Load memory and history
  useEffect(() => {
    const savedMemory = sessionStorage.getItem('calculator-memory');
    const savedHistory = sessionStorage.getItem('calculator-history');
    if (savedMemory) {
      const m = parseFloat(savedMemory);
      if (!isNaN(m) && m !== 0) {
        setMemory(m);
        setShowMemoryIndicator(true);
      }
    }
    if (savedHistory) {
      try {
        const h = JSON.parse(savedHistory);
        if (Array.isArray(h)) setHistory(h);
      } catch {}
    }
  }, []);

  // Persist memory & flag
  useEffect(() => {
    sessionStorage.setItem('calculator-memory', String(memory));
    setShowMemoryIndicator(memory !== 0);
  }, [memory]);

  // Persist history
  useEffect(() => {
    sessionStorage.setItem('calculator-history', JSON.stringify(history));
  }, [history]);

  // Keyboard handling (only when over modal or input focused)
  useEffect(() => {
    const handleKeyDown = (event) => {
      const root = nodeRef.current;
      const isOver = root && root.matches(':hover');
      const isFocused = document.activeElement === inputRef.current;
      if (!isOver && !isFocused) return;

      const key = event.key;
      if (/[0-9+\-*/.=]/.test(key) || ['Enter','Escape','Backspace','Delete'].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (/[0-9]/.test(key)) handleButtonClick(key);
      else if (['+','-','*','/'].includes(key)) handleButtonClick(key);
      else if (key === '.') handleButtonClick('.');
      else if (key === 'Enter' || key === '=') handleCalculate();
      else if (key === 'Escape' || key === 'Delete') handleClear();
      else if (key === 'Backspace') handleBackspace();

      // Memory shortcuts
      if (event.ctrlKey && key.toLowerCase() === 'm') { event.preventDefault(); handleMemoryStore(); }
      if (event.ctrlKey && key.toLowerCase() === 'r') { event.preventDefault(); handleMemoryRecall(); }
      if (event.ctrlKey && key.toLowerCase() === 'l') { event.preventDefault(); handleMemoryClear(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [input, isError, previousExpression, isResultDisplayed, memory]);

  // --- Handlers --- //
  const handleButtonClick = (value) => {
    inputRef.current?.focus();
    if (isError) {
      setInput(value);
      setIsError(false);
      setPreviousExpression('');
      setIsResultDisplayed(false);
      return;
    }
    if (isResultDisplayed && /[0-9.]/.test(value)) {
      setInput(value);
      setPreviousExpression('');
      setIsResultDisplayed(false);
      return;
    }
    if (isResultDisplayed && /[+\-*/]/.test(value)) {
      setPreviousExpression(input + ' ' + value);
      setInput('');
      setIsResultDisplayed(false);
      return;
    }
    if (/[+\-*/]/.test(value)) {
      if (input) {
        setPreviousExpression(input + ' ' + value);
        setInput('');
        setIsResultDisplayed(false);
      } else if (previousExpression) {
        const exprWithoutOp = previousExpression.replace(/[\s+\-*/=]+$/, '');
        setPreviousExpression(exprWithoutOp + ' ' + value);
      }
      return;
    }
    setInput((p) => p + value);
  };

  const handleClear = () => {
    setInput('');
    setPreviousExpression('');
    setIsError(false);
    setLastResult(null);
    setIsResultDisplayed(false);
    inputRef.current?.focus();
  };

  const handleClearEntry = () => {
    setInput('');
    setIsError(false);
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    if (isError || isResultDisplayed) return handleClearEntry();
    setInput((p) => p.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleCalculate = () => {
    if (isError) return;
    let full = '';
    if (previousExpression && input) full = previousExpression + ' ' + input;
    else if (input) full = input;
    else if (previousExpression) full = previousExpression;
    else return;

    try {
      let clean = full.trim().replace(/[\+\-\*\/=\s]+$/, '');
      if (!clean) return;
      const sanitized = clean.replace(/[^0-9+\-*/.() ]/g, '');
      if (!sanitized) return;
      const result = evaluateExpression(sanitized);
      if (isNaN(result) || !isFinite(result)) throw new Error('Invalid calculation');

      const entry = {
        id: Date.now(),
        expression: clean,
        result,
        timestamp: new Date().toLocaleTimeString(),
        fullTimestamp: new Date().toLocaleString()
      };
      setHistory((h) => [...h, entry]);
      setLastResult(result);

      setPreviousExpression(clean + ' =');
      setInput(String(result));
      setIsResultDisplayed(true);
      inputRef.current?.focus();
    } catch (error) {
      const entry = {
        id: Date.now(),
        expression: full.trim().replace(/[\+\-\*\/=\s]+$/, '') || full,
        result: 'Error',
        timestamp: new Date().toLocaleTimeString(),
        fullTimestamp: new Date().toLocaleString(),
        isError: true
      };
      setHistory((h) => [...h, entry]);
      setInput('Error');
      setIsError(true);
      setPreviousExpression('');
      setIsResultDisplayed(false);
      inputRef.current?.focus();
    }
  };

  // Memory
  const handleMemoryStore = () => {
    const v = parseFloat(input) || 0;
    setMemory(v);
    setHistory((h) => [...h, {
      id: Date.now(),
      expression: `Memory Store: ${v}`,
      result: `M = ${v}`,
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toLocaleString(),
      isMemory: true
    }]);
  };
  const handleMemoryRecall = () => {
    if (memory === 0) return;
    if (isError || isResultDisplayed) {
      setInput(String(memory));
      setIsError(false);
      setPreviousExpression('');
      setIsResultDisplayed(false);
    } else {
      setInput((p) => p + String(memory));
    }
    setHistory((h) => [...h, {
      id: Date.now(),
      expression: 'Memory Recall',
      result: memory,
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toLocaleString(),
      isMemory: true
    }]);
  };
  const handleMemoryClear = () => {
    setMemory(0);
    setHistory((h) => [...h, {
      id: Date.now(),
      expression: 'Memory Clear',
      result: 'M = 0',
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toLocaleString(),
      isMemory: true
    }]);
  };
  const handleMemoryAdd = () => {
    const v = parseFloat(input) || 0;
    const n = memory + v;
    setMemory(n);
    setHistory((h) => [...h, {
      id: Date.now(),
      expression: `Memory Add: ${v}`,
      result: `M = ${n}`,
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toLocaleString(),
      isMemory: true
    }]);
  };
  const handleMemorySubtract = () => {
    const v = parseFloat(input) || 0;
    const n = memory - v;
    setMemory(n);
    setHistory((h) => [...h, {
      id: Date.now(),
      expression: `Memory Subtract: ${v}`,
      result: `M = ${n}`,
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toLocaleString(),
      isMemory: true
    }]);
  };

  // Clipboard / input
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const valid = /^[0-9+\-*/.() ]*$/.test(text);
    if (valid) {
      if (isError || isResultDisplayed) {
        setInput(text);
        setIsError(false);
        setPreviousExpression('');
        setIsResultDisplayed(false);
      } else {
        setInput((p) => p + text);
      }
    }
  };
  const handleInputChange = (e) => {
    const value = e.target.value;
    const valid = /^[0-9+\-*/.() ]*$/.test(value);
    if (!valid) return;
    setInput(value);
    if (isError) {
      setIsError(false);
      setPreviousExpression('');
      setIsResultDisplayed(false);
    }
  };

  // History
  const handleClearHistory = () => {
    if (window.confirm('Clear all calculation history?')) {
      setHistory([]);
      sessionStorage.removeItem('calculator-history');
    }
    setShowHamburgerMenu(false);
  };
  const handleUseHistoryItem = (item) => {
    if (item.isError) return;
    const value = typeof item.result === 'number' ? String(item.result) : item.expression;
    if (isError || isResultDisplayed) {
      setInput(value);
      setIsError(false);
      setPreviousExpression('');
      setIsResultDisplayed(false);
    } else {
      setInput((p) => p + value);
    }
    inputRef.current?.focus();
  };

  const toggleHamburgerMenu = (e) => {
    e.stopPropagation();
    setShowHamburgerMenu((s) => !s);
  };
  
  const handleMenuItemClick = (action, e) => {
    e.stopPropagation();
    if (action === 'history') {
      setShowHistory((v) => !v);
    }
    if (action === 'clearHistory') {
      handleClearHistory();
    }
    setShowHamburgerMenu(false);
  };

  const displayHasPrevious = Boolean(previousExpression);

  return (
    <div className="calculator-backdrop" aria-hidden="false">
      <Draggable
        nodeRef={nodeRef}
        handle=".calculator-header"
        cancel=".hamburger-menu, .hamburger-dropdown, .close-button, .history-panel, .keypad-button, .memory-btn, .calculator-display"
        defaultPosition={initialPos}
      >
        <div 
          ref={nodeRef} 
          className={`calculator-modal enhanced ${showHistory ? 'with-history' : ''}`} 
          role="dialog" 
          aria-label="Calculator"
        >
          <div className="calculator-header">
            <div className="header-left">
              <div className="hamburger-container">
                <button
                  className="hamburger-menu"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={toggleHamburgerMenu}
                  title="Menu"
                  aria-haspopup="true"
                  aria-expanded={showHamburgerMenu}
                >
                  ☰
                </button>
                {showHamburgerMenu && (
                  <div
                    className="hamburger-dropdown"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="menu-item" onClick={(e) => handleMenuItemClick('history', e)}>
                      📊 {showHistory ? 'Hide' : 'Show'} History
                    </div>
                    <div className="menu-item" onClick={(e) => handleMenuItemClick('clearHistory', e)}>
                      🗑️ Clear History
                    </div>
                  </div>
                )}
              </div>
              <h4 id="calculator-title">
                🧮 Calculator
                {showMemoryIndicator && <span className="memory-indicator" title={`Memory: ${memory}`}>M</span>}
              </h4>
            </div>
            <div className="header-controls">
              <button
                className="close-button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onClose}
                aria-label="Close calculator"
              >
                ×
              </button>
            </div>
          </div>

          <div className="calculator-content">
            {showHistory && (
              <div className="history-panel" aria-label="Calculation history">
                <div className="history-header">
                  <span>Receipt History</span>
                  <div className="history-actions">
                    <button className="clear-history" title="Clear history" onClick={handleClearHistory}>🗑️</button>
                    <button className="close-history" title="Close history" onClick={() => setShowHistory(false)}>×</button>
                  </div>
                </div>
                <div className="history-list" ref={historyRef}>
                  {history.length === 0 ? (
                    <div className="history-empty">No calculations yet</div>
                  ) : (
                    history.map((item) => (
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

            <div className="calculator-panel">
              <div className="display-container">
                {displayHasPrevious && <div className="previous-expression">{previousExpression}</div>}
                <textarea
                  className={`calculator-display ${isError ? 'error' : ''} ${displayHasPrevious ? 'has-previous' : ''}`}
                  value={input || '0'}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  ref={inputRef}
                  aria-live="polite"
                />
              </div>

              {/* Memory buttons */}
              <div className="memory-controls" aria-label="Memory controls">
                <button className="memory-btn" onClick={handleMemoryClear} disabled={memory === 0}>MC</button>
                <button className="memory-btn" onClick={handleMemoryRecall} disabled={memory === 0}>MR</button>
                <button className="memory-btn" onClick={handleMemoryStore}>MS</button>
                <button className="memory-btn" onClick={handleMemoryAdd}>M+</button>
                <button className="memory-btn" onClick={handleMemorySubtract}>M-</button>
              </div>

              {/* Keypad */}
              <div className="keypad-grid">
                <button className="keypad-button clear" onClick={handleClear}>C</button>
                <button className="keypad-button clear-entry" onClick={handleClearEntry}>CE</button>
                <button className="keypad-button backspace" onClick={handleBackspace} title="Backspace">⌫</button>
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

              <div className="calculator-instructions">
                <div><strong>Memory:</strong> Ctrl+M (Store) • Ctrl+R (Recall) • Ctrl+L (Clear)</div>
                <div><strong>Menu:</strong> Click ☰ for receipt history and more options</div>
                <div><strong>Input:</strong> Type, Ctrl+CV, Enter for equals, Esc to clear</div>
              </div>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
}