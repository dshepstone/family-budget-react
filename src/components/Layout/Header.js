// src/components/Layout/Header.js
import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { APP_NAME, APP_VERSION } from '../../utils/constants';

const Header = () => {
  const { state, actions, formatCurrency } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleThemeToggle = () => {
    actions.toggleTheme();
  };

  const handleMonthChange = (event) => {
    setCurrentMonth(parseInt(event.target.value));
    // You can add month-specific logic here if needed
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Theme Toggle */}
        <button 
          className="theme-toggle"
          onClick={handleThemeToggle}
          aria-label="Toggle theme"
        >
          <span className="theme-icon">
            {state.theme === 'light' ? '🌙' : '☀️'}
          </span>
          <span className="theme-toggle-text">
            {state.theme === 'light' ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* App Title and Logo */}
        <div className="app-title-section">
          <div className="app-logo">💰</div>
          <div className="title-info">
            <h1 className="app-title">{APP_NAME}</h1>
            <div className="app-subtitle">Complete Budget Management</div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="month-selector">
          <label htmlFor="budget-month" className="month-label">
            Budget Month:
          </label>
          <select
            id="budget-month"
            value={currentMonth}
            onChange={handleMonthChange}
            className="month-select"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Stats */}
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Net Monthly:</span>
            <span className={`stat-value ${actions.calculations?.getNetMonthlyIncome?.() >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(actions.calculations?.getNetMonthlyIncome?.() || 0)}
            </span>
          </div>
        </div>

        {/* Version Info */}
        <div className="version-info">
          <span className="version-number">v{APP_VERSION}</span>
          <span className="file-name">Family Budget React</span>
        </div>
      </div>
    </header>
  );
};

export default Header;