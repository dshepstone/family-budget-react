// src/components/Layout/Header.js - Fixed Net Monthly Calculation with Privacy Badge
import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { APP_NAME, APP_VERSION } from '../../utils/constants';

const Header = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  
  // Privacy notice state
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  // Check if user has acknowledged privacy notice
  React.useEffect(() => {
    const privacyAcknowledged = localStorage.getItem('privacy-notice-acknowledged');
    if (!privacyAcknowledged) {
      setShowPrivacyNotice(true);
    }
  }, []);

  const handlePrivacyAcknowledge = () => {
    localStorage.setItem('privacy-notice-acknowledged', 'true');
    setShowPrivacyNotice(false);
  };

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
    <>
      {/* Privacy Notice Modal */}
      {showPrivacyNotice && (
        <div className="privacy-notice-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="privacy-notice-modal" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
              <h2 style={{ color: '#2563eb', marginBottom: '0.5rem' }}>Your Privacy is Protected</h2>
              <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>This budget application respects your privacy</p>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h3 style={{ color: '#1f2937', marginBottom: '1rem', fontSize: '1.2rem' }}>🛡️ Complete Privacy Guarantee</h3>
              
              <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #0ea5e9' }}>
                <strong style={{ color: '#0369a1' }}>✅ Your data NEVER leaves your device</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem', color: '#374151' }}>
                  <li>All budget data is stored locally in your browser only</li>
                  <li>No accounts, registrations, or cloud storage</li>
                  <li>No data transmission to external servers</li>
                  <li>No cookies or tracking</li>
                </ul>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #22c55e' }}>
                <strong style={{ color: '#15803d' }}>🔒 Local Storage Only</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem', color: '#374151' }}>
                  <li>Data stays in your browser's local storage</li>
                  <li>Only you can access your financial information</li>
                  <li>Clear your browser data to remove all information</li>
                </ul>
              </div>

              <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                <strong style={{ color: '#d97706' }}>📱 Device Recommendations</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem', color: '#374151' }}>
                  <li>Use on your personal devices for maximum security</li>
                  <li>Avoid public computers for sensitive financial data</li>
                  <li>Regular browser backups recommended for data safety</li>
                </ul>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handlePrivacyAcknowledge}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                I Understand - Continue to Budget App
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        {/* Privacy Badge in Upper Right Corner */}
        <div className="privacy-badge" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#059669',
          color: 'white',
          padding: '0.375rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
        onClick={() => setShowPrivacyNotice(true)}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#047857';
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#059669';
          e.target.style.transform = 'translateY(0px)';
          e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }}
        >
          🔒 Private
        </div>

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
    </>
  );
};

export default Header;