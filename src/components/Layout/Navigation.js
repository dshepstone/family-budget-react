// src/components/Layout/Navigation.js - Updated with Notes page
import React from 'react';
import { useBudget } from '../../context/BudgetContext';

const Navigation = () => {
  const { state, actions } = useBudget();

  const navigationItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'income', label: 'Income', icon: '💵' },
    { id: 'monthly', label: 'Monthly Expenses', icon: '💳' },
    { id: 'annual', label: 'Annual Expenses', icon: '📅' },
    { id: 'planner', label: 'Weekly Planner', icon: '📋' },
    { id: 'notes', label: 'Notes', icon: '📝' }, // Added Notes page
    { id: 'import', label: 'Import/Export', icon: '📂' },
    { id: 'links', label: 'Links', icon: '🔗' }
  ];

  const handlePageChange = (pageId) => {
    actions.setCurrentPage(pageId);
  };

  return (
    <nav className="nav-bar">
      {navigationItems.map(item => (
        <button
          key={item.id}
          className={`nav-btn ${state.currentPage === item.id ? 'active' : ''}`}
          onClick={() => handlePageChange(item.id)}
          aria-label={`Navigate to ${item.label}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}

      {/* Calculator Toggle Button */}
      <button
        className="nav-btn calculator-nav-btn"
        onClick={actions.toggleCalculator}
        aria-label="Open Calculator"
        title="Calculator (Ctrl+Shift+C)"
      >
        <span className="nav-icon">🧮</span>
        <span className="nav-label">Calculator</span>
      </button>
    </nav>
  );
};

export default Navigation;