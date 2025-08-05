// src/components/Layout/Navigation.js
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
    </nav>
  );
};

export default Navigation;