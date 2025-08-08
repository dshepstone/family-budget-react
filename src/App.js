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
import NotesPage from './pages/NotesPage';
import ImportExportPage from './pages/ImportExportPage';
import LinksPage from './pages/LinksPage';
import NotificationCenter from './components/NotificationCenter';
import CalculatorModal from './components/CalculatorModal';
import ThemeProvider from './context/ThemeContext';
import './styles/globals.css';
import './styles/themes.css';
import './styles/components.css';
import './styles/responsive.css';

const PAGES = {
  home: HomePage,
  income: IncomePage,
  monthly: MonthlyExpensesPage,
  annual: AnnualExpensesPage,
  planner: WeeklyPlannerPage,
  notes: NotesPage,
  import: ImportExportPage,
  links: LinksPage
};

function PageRenderer() {
  const { state } = useBudget();
  const CurrentPage = PAGES[state.currentPage] || HomePage;
  return <CurrentPage />;
}

function AppContent() {
  const { state, actions } = useBudget();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (state.isCalculatorOpen) {
      document.body.classList.add('calculator-open');
    } else {
      document.body.classList.remove('calculator-open');
    }
    return () => {
      document.body.classList.remove('calculator-open');
    };
  }, [state.isCalculatorOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && state.isCalculatorOpen) {
        event.preventDefault();
        actions.toggleCalculator();
      }

      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          event.preventDefault();
          const exportEvent = new CustomEvent('exportData');
          window.dispatchEvent(exportEvent);
        } else if (event.key === 'p') {
          event.preventDefault();
          window.print();
        }
      }

      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        actions.toggleCalculator();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.isCalculatorOpen]);

  return (
    <div className="app-container">
      <Header />
      <Navigation />

      <main className="main-content">
        <div className="page-container">
          <PageRenderer />
        </div>
      </main>

      <NotificationCenter />

      <div className="version-indicator">
        <span>Family Budget React v2.0.0</span>
        <span className="last-updated">
          Updated: {new Date(state.lastUpdated).toLocaleString()}
        </span>
      </div>

      {state.isCalculatorOpen && (
        <div
          className="calculator-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calculator-title"
        >
          <CalculatorModal onClose={actions.toggleCalculator} />
        </div>
      )}
    </div>
  );
}

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