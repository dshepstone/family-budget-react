// src/App.js
import React, { useEffect } from 'react';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import Navigation from './components/Layout/Navigation';
import Header from './components/Layout/Header';
import HomePage from './pages/HomePage';
import IncomePage from './pages/IncomePage';
import MonthlyExpensesPage from './pages/MonthlyExpensesPage';
import AnnualExpensesPage from './pages/AnnualExpensesPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import ImportExportPage from './pages/ImportExportPage';
import LinksPage from './pages/LinksPage';
import NotificationCenter from './components/NotificationCenter';
import CalculatorModal from './components/CalculatorModal';
import ThemeProvider from './context/ThemeContext';
import './styles/globals.css';
import './styles/themes.css';
import './styles/components.css';
import './styles/responsive.css';

// Page component mapping
const PAGES = {
  home: HomePage,
  income: IncomePage,
  monthly: MonthlyExpensesPage,
  annual: AnnualExpensesPage,
  planner: WeeklyPlannerPage,
  import: ImportExportPage,
  links: LinksPage
};

// Main App content component (needs to be inside BudgetProvider)
function AppContent() {
  const { state, actions } = useBudget();
  const CurrentPage = PAGES[state.currentPage] || HomePage;

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            // Trigger export
            const exportEvent = new CustomEvent('exportData');
            window.dispatchEvent(exportEvent);
            break;
          case 'p':
            event.preventDefault();
            window.print();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-container">
      <Header />
      <Navigation />

      <main className="main-content">
        <div className="page-container">
          <CurrentPage />
        </div>
      </main>

      <NotificationCenter />

      {/* Render calculator based on global state */}
      {state.isCalculatorOpen && <CalculatorModal onClose={actions.toggleCalculator} />}

      {/* Version indicator */}
      <div className="version-indicator">
        <span>Family Budget React v2.0.0</span>
        <span className="last-updated">
          Updated: {new Date(state.lastUpdated).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// Main App component with providers
function App() {
  return (
    <ThemeProvider>
      <BudgetProvider>
        <AppContent />
      </BudgetProvider>
    </ThemeProvider>
  );
}

export default App;