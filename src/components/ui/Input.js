// src/components/ui/Input.js
import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  type = 'text',
  className = '',
  error,
  helperText,
  label,
  required = false,
  disabled = false,
  ...props 
}, ref) => {
  const baseClasses = 'form-input';
  const errorClass = error ? 'input-error' : '';
  const disabledClass = disabled ? 'input-disabled' : '';
  
  const inputClasses = [
    baseClasses,
    errorClass,
    disabledClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-container">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
      
      {error && (
        <div className="input-error-message">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div className="input-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;