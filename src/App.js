// src/App.js
import React from 'react';
import { createPortal } from 'react-dom';
import ThemeProvider from './context/ThemeContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';

import Navigation from './components/Layout/Navigation';
import Header from './components/Layout/Header';
import CalculatorModal from './components/CalculatorModal';

import HomePage from './pages/HomePage';
import IncomePage from './pages/IncomePage';
import MonthlyExpensesPage from './pages/MonthlyExpensesPage';
import AnnualExpensesPage from './pages/AnnualExpensesPage';
import AccountsPage from './pages/AccountsPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import ReportsPage from './pages/ReportsPage';

// ✅ new pages
import NotesPage from './pages/NotesPage';
import ImportExportPage from './pages/ImportExportPage';
import LinksPage from './pages/LinksPage';

const AppContent = () => {
  const { state } = useBudget();
  const currentPage = state.currentPage || 'home';

  switch (currentPage) {
    case 'home': return <HomePage />;
    case 'income': return <IncomePage />;
    case 'monthly': return <MonthlyExpensesPage />;
    case 'annual': return <AnnualExpensesPage />;
    case 'accounts': return <AccountsPage />;
    case 'planner': return <WeeklyPlannerPage />;
    case 'reports': return <ReportsPage />;
    // ✅ new routes
    case 'notes': return <NotesPage />;
    case 'import': return <ImportExportPage />;
    case 'links': return <LinksPage />;
    default: return <HomePage />;
  }
};

// Split shell so we can use useBudget() inside providers
const AppShell = () => {
  const { state, actions } = useBudget();
  // ✅ FIX: read the correct reducer flag
  const showCalculator = !!state.isCalculatorOpen;

  return (
    <div className="app">
      <Header />
      <Navigation />

      <main className="main-content">
        <AppContent />
      </main>

      {showCalculator &&
        createPortal(
          <CalculatorModal onClose={actions.toggleCalculator} />,
          document.body
        )}
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <BudgetProvider>
      <AppShell />
    </BudgetProvider>
  </ThemeProvider>
);

export default App;
