// src/components/Layout/Navigation.js - Fixed with CSS import
import React from 'react';
import { useBudget } from '../../context/BudgetContext';
// Import the navigation CSS from styles folder
import '../../styles/navigation.css';

const Navigation = () => {
  const { state, actions } = useBudget();
  const currentPage = state.currentPage || 'home';
  const isCalculatorOpen = state.isCalculatorOpen || false;

  const navigationItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'income', label: 'Income', icon: '💵' },
    { id: 'monthly', label: 'Monthly', icon: '📅' },
    { id: 'annual', label: 'Annual', icon: '📆' },
    { id: 'accounts', label: 'Accounts', icon: '🏦' },
    { id: 'planner', label: 'Planner', icon: '📋' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'import', label: 'Data', icon: '💾' },
    { id: 'links', label: 'Links', icon: '🔗' }
  ];

  const handleNavigation = (pageId) => {
    actions.setCurrentPage(pageId);
  };

  const handleCalculatorToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    actions.toggleCalculator();
  };

  return (
    <nav className="main-navigation" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* Main Navigation Links */}
        <ul className="nav-links" role="menubar">
          {navigationItems.map((item) => (
            <li key={item.id} className="nav-item" role="none">
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.id)}
                role="menuitem"
                aria-current={currentPage === item.id ? 'page' : undefined}
                title={`Navigate to ${item.label}`}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Calculator Toggle - Fixed positioning */}
        <div className="nav-right">
          <button
            className={`calculator-nav-btn ${isCalculatorOpen ? 'active' : ''}`}
            onClick={handleCalculatorToggle}
            title={isCalculatorOpen ? 'Close Calculator' : 'Open Calculator'}
            aria-label={isCalculatorOpen ? 'Close Calculator' : 'Open Calculator'}
            aria-pressed={isCalculatorOpen}
          >
            <span className="nav-icon" aria-hidden="true">🔢</span>
            <span className="nav-label">Calculator</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;