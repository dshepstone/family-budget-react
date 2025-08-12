// src/components/Layout/Header.js - Fixed CSS class names for colored backgrounds
import React, { useEffect, useRef, useState } from 'react';
import '../../styles/header.css';
import { useBudget } from '../../context/BudgetContext';
import { useBudgetCalculations } from '../../hooks/useBudgetCalculations';
import { APP_NAME, APP_VERSION } from '../../utils/constants';
import logo from '../../logo/FamilyBudgetLogo_ImageOnly.png';


const Header = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const _calcHas = (obj, fn) => obj && typeof obj[fn] === 'function';
  const _needsFallback = !_calcHas(calculations, 'getTotalProjectedIncome');
  const _localCalcs = useBudgetCalculations(state?.data || {});
  const calcs = _needsFallback ? _localCalcs : calculations;

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const ref = useRef(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Measure header height and expose as CSS var so nav/content can offset
  useEffect(() => {
    const updateVar = () => {
      const h = ref.current?.offsetHeight || 0;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    updateVar();
    window.addEventListener('resize', updateVar);
    return () => window.removeEventListener('resize', updateVar);
  }, []);

  // Show privacy notice once unless acknowledged
  useEffect(() => {
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
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const handleThemeToggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const handleMonthChange = (e) => {
    setCurrentMonth(parseInt(e.target.value, 10));
  };

  // Header totals via shared calcs (with fallback)
  const totalProjectedIncome = calcs.getTotalProjectedIncome();
  const netMonthlyIncome = calcs.getNetMonthlyIncome();

  const totalExpenses = (() => {
    try {
      const monthly = calcs.getTotalMonthlyExpenses();
      const annualImpact = calculations.getMonthlyAnnualImpact
        ? calcs.getMonthlyAnnualImpact()
        : (calculations.getTotalAnnualExpenses ? calcs.getTotalAnnualExpenses() / 12 : 0);
      return monthly + annualImpact;
    } catch {
      return 0;
    }
  })();

  return (
    <>
      {/* Privacy Notice Modal */}
      {showPrivacyNotice && (
        <div
          className="privacy-notice-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            className="privacy-notice-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
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
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              >
                I Understand - Continue to Budget App
              </button>
            </div>
          </div>
        </div>
      )}

      <header ref={ref} className="app-header">
        {/* Privacy Badge in Upper Right Corner */}
        <div
          className="privacy-badge"
          style={{
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
            e.currentTarget.style.backgroundColor = '#047857';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          🔒 Private
        </div>

        <div className="header-content">
  {/* Theme Toggle */}
  

  {/* App Title and Logo */}
  <div className="app-title-section">
    <img
      src={logo}
      alt="Family Budget Simplified"
      className="app-logo-img"
      style={{ height: '110px', width: 'auto' }}
    />
  </div>

  <div className="title-info">
    <h1 className="app-title">{APP_NAME}</h1>
    <div className="app-subtitle">Complete Budget Management</div>
  </div>

  {/* Month Selector */}
  <div className="month-selector">
    <label htmlFor="budget-month" className="month-label">Budget Month:</label>
    <select id="budget-month" value={currentMonth} onChange={handleMonthChange} className="month-select">
      {months.map((month, index) => (
        <option key={index} value={index}>{month}</option>
      ))}
    </select>
  </div>

  {/* Enhanced Quick Stats */}
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
      <span className="stat-value expense">
        {formatCurrency(totalExpenses)}
      </span>
    </div>
    <div className="stat-item">
      <span className="stat-label">Budget Health:</span>
      <span className={`stat-value warning ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
        {netMonthlyIncome >= 0 ? '✅ Good' : '⚠️ Alert'}
      </span>
    </div>
  </div>

  {/* Version Info */}
  <div className="version-info">
    <span className="version-number">v{APP_VERSION}</span>
    <span className="file-name">Family Budget</span>
  </div>
</div> {/* <-- this closes header-content exactly once, here */}


     
      </header>
    </>
  );
};

export default Header;