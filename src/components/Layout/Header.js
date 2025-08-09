// src/components/Layout/Header.js - Fixed Net Monthly Calculation
import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { APP_NAME, APP_VERSION } from '../../utils/constants';

const Header = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
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

  // Calculate projected monthly income using the same logic as Income Sources page
  const getProjectedNetMonthlyIncome = () => {
    try {
      // Get total PROJECTED income using the same calculation as Income Sources page
      const income = state.data.income || [];
      const totalProjectedIncome = income.reduce((total, item) => {
        // Use the same month-aware calculation as Income Sources page
        const hasDates = Array.isArray(item.payDates) && item.payDates.length > 0;
        const perCheckProjected = parseFloat(item.projectedAmount || item.amount || 0);

        let monthlyProjected = 0;
        
        switch (item.frequency) {
          case 'weekly':
            monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected * (52 / 12);
            break;
          case 'bi-weekly':
            monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected * (26 / 12);
            break;
          case 'monthly':
            monthlyProjected = perCheckProjected;
            break;
          case 'quarterly':
            monthlyProjected = perCheckProjected / 3;
            break;
          case 'semi-annual':
            monthlyProjected = perCheckProjected / 6;
            break;
          case 'annual':
            monthlyProjected = perCheckProjected / 12;
            break;
          case 'one-time':
            monthlyProjected = 0;
            break;
          default:
            monthlyProjected = perCheckProjected;
        }

        console.log(`Header Income Calculation: ${item.name}
          - Per Check: ${formatCurrency(perCheckProjected)}
          - Frequency: ${item.frequency}
          - Pay Dates: ${item.payDates?.length || 0}
          - Monthly Total: ${formatCurrency(monthlyProjected)}`);
        
        return total + monthlyProjected;
      }, 0);

      // Get expenses using BudgetContext calculations
      const monthlyExpenses = calculations.getTotalMonthlyExpenses();
      const annualImpact = calculations.getMonthlyAnnualImpact();
      
      console.log(`Header Final Calculations:
        - Total Projected Income: ${formatCurrency(totalProjectedIncome)}
        - Monthly Expenses: ${formatCurrency(monthlyExpenses)}
        - Annual Impact (Monthly): ${formatCurrency(annualImpact)}
        - Net Income: ${formatCurrency(totalProjectedIncome - monthlyExpenses - annualImpact)}`);
      
      // Calculate projected net income for the month
      const projectedNetIncome = totalProjectedIncome - monthlyExpenses - annualImpact;
      
      return {
        netIncome: projectedNetIncome,
        totalIncome: totalProjectedIncome
      };
    } catch (error) {
      console.error('Error calculating projected net monthly income:', error);
      return { netIncome: 0, totalIncome: 0 };
    }
  };

  const projectedBudget = getProjectedNetMonthlyIncome();
  const netMonthlyIncome = projectedBudget.netIncome;
  const totalProjectedIncome = projectedBudget.totalIncome;

  // Get some additional useful stats for the header
  const getTotalMonthlyExpenses = () => {
    try {
      return calculations.getTotalMonthlyExpenses() + calculations.getMonthlyAnnualImpact();
    } catch (error) {
      return 0;
    }
  };

  const totalExpenses = getTotalMonthlyExpenses();

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

        {/* Enhanced Quick Stats with Better Contrast */}
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Net Monthly:</span>
            <span className={`stat-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(netMonthlyIncome)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Projected Income:</span>
            <span className="stat-value income-value">
              {formatCurrency(totalProjectedIncome)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Total Expenses:</span>
            <span className="stat-value expense-value">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Budget Health:</span>
            <span className={`stat-value health-indicator ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
              {netMonthlyIncome >= 0 ? '✅ Good' : '⚠️ Alert'}
            </span>
          </div>
        </div>

        {/* Version Info */}
        <div className="version-info">
          <span className="version-number">v{APP_VERSION}</span>
          <span className="file-name">Family Budget</span>
        </div>
      </div>
    </header>
  );
};

export default Header;