// src/components/Navigation.js - Updated to include Accounts page
import React from 'react';
import { useBudget } from '../context/BudgetContext';


const Navigation = () => {
  const { state, actions } = useBudget();
  const currentPage = state.currentPage || 'home';

  const navigationItems = [
    { id: 'home', label: '🏠 Dashboard', icon: '🏠' },
    { id: 'income', label: '💵 Income', icon: '💵' },
    { id: 'monthly', label: '💳 Monthly', icon: '💳' },
    { id: 'annual', label: '📅 Annual', icon: '📅' },
    { id: 'accounts', label: '🏦 Accounts', icon: '🏦' }, // NEW: Accounts page
    { id: 'planner', label: '📊 Planner', icon: '📊' },
    { id: 'reports', label: '📈 Reports', icon: '📈' }
  ];

  return (
    <nav className="main-navigation">
      <style jsx>{`
        .main-navigation {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }

        .nav-brand {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-right: 2rem;
          padding: 1rem 0;
        }

        .nav-links {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 0;
        }

        .nav-item {
          position: relative;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          color: #6b7280;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
          background: none;
          border-left: none;
          border-right: none;
          border-top: none;
        }

        .nav-link:hover {
          color: #374151;
          background: #f9fafb;
        }

        .nav-link.active {
          color: #10b981;
          border-bottom-color: #10b981;
          background: #f0fdf4;
        }

        .nav-icon {
          font-size: 1rem;
        }

        .accounts-highlight {
          position: relative;
        }

        .accounts-highlight::after {
          content: 'NEW';
          position: absolute;
          top: 0.5rem;
          right: 0.25rem;
          background: #10b981;
          color: white;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 4px;
          line-height: 1;
        }

        @media (max-width: 768px) {
          .nav-container {
            flex-direction: column;
            padding: 10px;
          }

          .nav-brand {
            margin-right: 0;
            margin-bottom: 1rem;
            padding: 0.5rem 0;
          }

          .nav-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
          }

          .nav-link {
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            border-radius: 6px;
            border-bottom: none;
          }

          .nav-link.active {
            background: #10b981;
            color: white;
            border-bottom: none;
          }
        }
      `}</style>

      <div className="nav-container">
        <div className="nav-brand">
          Family Budget Simplified
        </div>

        <ul className="nav-links">
          {navigationItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''} ${item.id === 'accounts' ? 'accounts-highlight' : ''}`}
                onClick={() => actions.setCurrentPage(item.id)}
                aria-current={currentPage === item.id ? 'page' : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

// src/App.js - Updated to include AccountsPage routing
import React from 'react';
import { BudgetProvider } from './context/BudgetContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import IncomePage from './pages/IncomePage';
import MonthlyExpensesPage from './pages/MonthlyExpensesPage';
import AnnualExpensesPage from './pages/AnnualExpensesPage';
import AccountsPage from './pages/AccountsPage'; // NEW: Import AccountsPage
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import ReportsPage from './pages/ReportsPage';
import { useBudget } from './context/BudgetContext';

const AppContent = () => {
  const { state } = useBudget();
  const currentPage = state.currentPage || 'home';

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'income':
        return <IncomePage />;
      case 'monthly':
        return <MonthlyExpensesPage />;
      case 'annual':
        return <AnnualExpensesPage />;
      case 'accounts': // NEW: Add accounts page routing
        return <AccountsPage />;
      case 'planner':
        return <WeeklyPlannerPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        {renderCurrentPage()}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
};

export default App;