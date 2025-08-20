// src/pages/AnnualExpensesPage.js - Enhanced with Weekly Sync and Fixed Styling
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { AnnualExpensesPrint } from '../utils/printUtils';
import { getStatusAmount } from '../utils/expenseUtils';
import { ALL_WEEKS } from '../utils/constants';

const ANNUAL_CATEGORY_NAMES = {
  'yearly-subs': 'Yearly Subscriptions',
  'yearly-car': 'Yearly Car Expenses',
  'yearly-bank': 'Yearly Banking',
  'yearly-insurance': 'Yearly Insurance',
  'yearly-tax': 'Yearly Tax Expenses',
  'yearly-medical': 'Yearly Medical',
  'yearly-home': 'Yearly Home/Property',
  'yearly-personal': 'Yearly Personal'
};

const AnnualExpensesPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [currentWeek, setCurrentWeek] = useState(1);

  const getPlannerStatus = (expenseName, statusType) => {
    const entry = state.data.plannerState?.[expenseName];
    const statuses = entry?.[statusType] || [];
    if (currentWeek === ALL_WEEKS) {
      return statuses.some(Boolean);
    }
    return statuses[currentWeek - 1] || false;
  };

  // Auto-populate planner when annual data changes
  useEffect(() => {
    if (state.data.annual && Object.keys(state.data.annual).length > 0) {
      // Trigger auto-population of planner
      actions.autoPopulatePlanner();
    }
  }, [state.data.annual]);

  // Handle expense input changes
  const handleExpenseChange = (categoryKey, expenseIndex, field, value) => {
    const category = state.data.annual[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    const updatedExpense = {
      ...expense,
      [field]: field === 'actual' || field === 'projected' ? parseFloat(value) || 0 : value,
      id: expense.id || `${categoryKey}-${Date.now()}-${expenseIndex}`
    };

    actions.updateAnnualExpense(categoryKey, updatedExpense, expenseIndex);

    // If this is an actual amount change, trigger planner update with monthly equivalent
    if (field === 'actual' && updatedExpense.name) {
      const monthlyEquivalent = updatedExpense.actual / 12;
      setTimeout(() => {
        actions.distributeMonthlyToWeekly(updatedExpense.name, monthlyEquivalent, updatedExpense.date);
      }, 100);
    }
  };

  // Handle status changes (paid/transferred) with weekly sync
  const handleStatusChange = (categoryKey, expenseIndex, statusType, checked) => {
    const category = state.data.annual[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    const updatedExpense = {
      ...expense,
      [statusType]: checked,
      id: expense.id || `${categoryKey}-${Date.now()}-${expenseIndex}`
    };

    actions.updateAnnualExpense(categoryKey, updatedExpense, expenseIndex);

    // Sync with weekly planner for current week
    if (expense.name) {
      const weekIndex = currentWeek === ALL_WEEKS ? null : currentWeek - 1;
      actions.updateExpenseStatus(
        updatedExpense.id,
        expense.name,
        weekIndex,
        statusType,
        checked,
        'annual'
      );
    }
  };

  // Add new expense to category
  const addExpense = (categoryKey) => {
    const category = state.data.annual[categoryKey] || [];
    const newExpense = {
      id: `${categoryKey}-${Date.now()}`,
      name: '',
      actual: 0,
      projected: 0,
      date: '',
      accountId: '',
      paid: false,
      transferred: false,
      transferStatus: 'full'
    };

    actions.updateAnnualExpense(categoryKey, newExpense, category.length);
  };

  // Remove expense from category
  const removeExpense = (categoryKey, expenseIndex) => {
    actions.removeAnnualExpense(categoryKey, expenseIndex);
  };

  // Add a new category
  const addCategory = () => {
    const name = prompt('Enter new category name');
    if (name && !state.data.annual[name]) {
      actions.addAnnualCategory(name);
    }
  };

  // Remove an entire category
  const removeCategory = (categoryKey) => {
    if (window.confirm(`Remove category "${categoryKey}"?`)) {
      actions.removeAnnualCategory(categoryKey);
    }
  };

  // Copy projected to actual
  const copyProjectedToActual = (categoryKey, expenseIndex) => {
    const category = state.data.annual[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    handleExpenseChange(categoryKey, expenseIndex, 'actual', expense.projected || 0);
  };

  // Calculate category total
  const getCategoryTotal = (categoryKey) => {
    const category = state.data.annual[categoryKey] || [];
    return category.reduce((total, expense) => total + (parseFloat(expense.actual) || 0), 0);
  };

  // Calculate total annual expenses
  const getTotalAnnualExpenses = () => {
    return calculations.getTotalAnnualExpenses();
  };

  const calculateStatusSummary = () => {
    const requiredTransfers = {};
    const paidAmounts = {};

    Object.values(state.data.annual || {}).forEach(expenses => {
      if (Array.isArray(expenses)) {
        expenses.forEach(expense => {
          const amount = getStatusAmount(expense);
          if (amount <= 0) return;
          const accId = expense.accountId || 'unassigned';
          if (expense.transferred) {
            requiredTransfers[accId] = (requiredTransfers[accId] || 0) + amount;
          }
          if (expense.paid) {
            paidAmounts[accId] = (paidAmounts[accId] || 0) + amount;
          }
        });
      }
    });

    const accountIds = Array.from(new Set([...Object.keys(requiredTransfers), ...Object.keys(paidAmounts)]));
    const rows = accountIds.map(id => {
      const required = requiredTransfers[id] || 0;
      const paid = paidAmounts[id] || 0;
      return { id, required, paid, net: required - paid };
    });

    const totalRequired = rows.reduce((sum, r) => sum + r.required, 0);
    const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0);
    const balanceAfterPayments = getTotalAnnualExpenses() - totalPaid;

    return { rows, totalRequired, totalPaid, balanceAfterPayments };
  };

  const statusSummary = calculateStatusSummary();

  // Reset funding for all expenses
  const resetFunding = () => {
    if (!window.confirm('Reset all projected amounts to $0.00?')) return;

    Object.keys(state.data.annual || {}).forEach(categoryKey => {
      const category = state.data.annual[categoryKey] || [];
      category.forEach((expense, index) => {
        if (expense.name) {
          handleExpenseChange(categoryKey, index, 'projected', 0);
        }
      });
    });
  };

  const handlePrint = () => {
    const printContent = AnnualExpensesPrint.generatePrintContent(
      state.data,
      calculations,
      formatCurrency
    );
    AnnualExpensesPrint.openPrintWindow(printContent, 'Annual Expenses Report');
  };

  // Reset all statuses
  const resetStatuses = () => {
    if (!window.confirm('Reset all payment and transfer statuses?')) return;

    Object.keys(state.data.annual || {}).forEach(categoryKey => {
      const category = state.data.annual[categoryKey] || [];
      category.forEach((expense, index) => {
        if (expense.name) {
          handleExpenseChange(categoryKey, index, 'paid', false);
          handleExpenseChange(categoryKey, index, 'transferred', false);
          handleExpenseChange(categoryKey, index, 'transferStatus', 'full');
        }
      });
    });
  };

  // Calculate monthly savings plan
  const getMonthlySavingsPlan = () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const expensesByMonth = {};

    Object.keys(state.data.annual || {}).forEach(categoryKey => {
      const category = state.data.annual[categoryKey] || [];
      category.forEach(expense => {
        if (expense.date && expense.name && expense.actual > 0) {
          const dueDate = new Date(expense.date);
          const month = dueDate.getMonth() + 1;
          const amount = parseFloat(expense.actual) || 0;

          if (!expensesByMonth[month]) {
            expensesByMonth[month] = [];
          }
          expensesByMonth[month].push({
            name: expense.name,
            amount: amount,
            monthsToSave: Math.max(1, (month - currentMonth + 12) % 12) || 1
          });
        }
      });
    });

    return expensesByMonth;
  };

  const savingsPlan = getMonthlySavingsPlan();

  return (
    <div className="main-content annual-expenses-page no-top-gap">

      <style>{`
          /* Remove inherited top spacing from global/components CSS just on these pages */
          .main-content.no-top-gap { 
            margin-top: 0 !important; 
            padding-top: 8px !important; /* tweak to 0–12px if you want tighter/looser */
          }

          /* Make sure the first heading doesn’t add extra space */
          .monthly-expenses-page .page-title,
          .weekly-planner-page .page-title,
          .annual-expenses-page .page-title {
            margin-top: 0 !important;
          }

        .annual-expenses-page {
          padding: 20px 0;
          background-color: var(--bg-primary);
          min-height: 100vh;
        }

        .page-title {
          color: var(--text-primary);
          margin-bottom: 20px;
          font-size: 1.8rem;
          font-weight: 600;
        }

        .page-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background-color: var(--card-bg);
          border-radius: 8px;
          border: 1px solid var(--card-border);
          flex-wrap: wrap;
          gap: 15px;
          box-shadow: var(--card-shadow);
        }

        .action-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .current-week-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 15px;
          background: linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(40, 167, 69, 0.05));
          border-radius: 8px;
          border: 1px solid rgba(40, 167, 69, 0.3);
          box-shadow: 0 2px 4px rgba(40, 167, 69, 0.1);
        }

        .week-select {
          padding: 8px 12px;
          border: 1px solid var(--input-border);
          border-radius: 6px;
          font-size: 0.9rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .week-select:focus {
          outline: none;
          border-color: var(--success);
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
        }

        .yearly-note {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.05));
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          font-size: 0.95rem;
          color: var(--text-primary);
          box-shadow: 0 2px 4px rgba(251, 191, 36, 0.1);
        }

        .category {
          margin-bottom: 24px;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--card-shadow);
          background: var(--card-bg);
          transition: all 0.2s ease;
        }

        .category:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .category-header {
          background: linear-gradient(135deg, var(--success) 0%, #1e7e34 100%);
          color: white;
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-name {
          font-size: 1.2rem;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .category-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .category-total {
          font-size: 1.2rem;
          font-weight: bold;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .add-item-btn, .remove-category-btn {
          background-color: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          transition: all 0.2s ease;
        }

        .add-item-btn:hover, .remove-category-btn:hover {
          background-color: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        .subcategory-header {
          display: flex;
          background: var(--bg-secondary);
          padding: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-light);
        }

        .header-date {
          width: 140px;
        }

        .header-name {
          flex: 2;
        }

        .header-status {
          width: 140px;
          text-align: center;
        }

        .header-amounts {
          width: 220px;
          display: flex;
          justify-content: space-between;
        }

        .header-monthly {
          width: 100px;
          text-align: center;
        }

        .subcategory-list {
          background-color: var(--card-bg);
        }

        .subcategory {
          display: flex;
          align-items: center;
          padding: 15px 12px;
          border-bottom: 1px solid var(--border-light);
          gap: 12px;
          transition: all 0.2s ease;
          min-height: 60px;
        }

        .subcategory:hover {
          background-color: var(--hover-bg);
        }

        .subcategory:last-child {
          border-bottom: none;
        }

        .due-date-input {
          width: 140px;
          padding: 8px 10px;
          border: 1px solid var(--input-border);
          border-radius: 6px;
          font-size: 0.85rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .due-date-input:focus {
          outline: none;
          border-color: var(--success);
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
        }

        .expense-name-input {
          flex: 2;
          padding: 8px 10px;
          border: 1px solid var(--input-border);
          border-radius: 6px;
          font-size: 0.85rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .expense-name-input:focus {
          outline: none;
          border-color: var(--success);
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
        }

        .account-select {
          width: 140px;
          padding: 8px 10px;
          border: 1px solid var(--input-border);
          border-radius: 6px;
          font-size: 0.85rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .account-select:focus {
          outline: none;
          border-color: var(--success);
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
        }

        .status-control-group {
          width: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .annual-status-checkboxes {
          display: flex;
          gap: 8px;
        }

        .status-checkbox-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          cursor: pointer;
          color: var(--text-primary);
        }

        .checkbox-label {
          font-weight: bold;
        }

        .transferred-checkbox:checked {
          accent-color: #ffc107;
        }

        .paid-checkbox:checked {
          accent-color: var(--success);
        }

        .frequency-dropdown {
          width: 90px;
          padding: 4px 6px;
          border: 1px solid var(--input-border);
          border-radius: 4px;
          font-size: 0.8rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          cursor: pointer;
        }

        .frequency-dropdown.paid {
          background-color: #d1ecf1;
          border-color: #bee5eb;
        }

        .frequency-dropdown.transferred {
          background-color: #fff3cd;
          border-color: #ffeaa7;
        }

        .amount-input-group {
          width: 220px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .amount-input {
        width: 90px;
        padding: 8px 10px;
        border: 1px solid var(--input-border);
        border-radius: 6px;
        font-size: 0.85rem;
        text-align: right;
        background-color: var(--input-bg);
        color: var(--text-primary);
        transition: all 0.2s ease;
        flex-shrink: 0; /* Add this line */
        box-sizing: border-box; /* Add this line */
      }

        .amount-input:focus {
          outline: none;
          border-color: var(--success);
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
        }

        .amount-input.has-value {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%) !important;
          border-color: var(--success) !important;
          font-weight: 600 !important;
          color: #155724 !important;
        }

        .copy-to-actual-btn {
          background: linear-gradient(135deg, var(--success) 0%, #1e7e34 100%);
          border: none;
          color: white;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .copy-to-actual-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }

        .monthly-equivalent {
          width: 100px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
          background: rgba(40, 167, 69, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(40, 167, 69, 0.2);
        }

        .item-delete-btn {
          background: linear-gradient(135deg, var(--danger) 0%, #c82333 100%);
          border: none;
          color: white;
          padding: 6px; /* Changed from 6px 10px */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          width: 32px; /* Reduced from 35px */
          height: 32px; /* Added fixed height */
          display: flex; /* Added for better centering */
          align-items: center; /* Center vertically */
          justify-content: center; /* Center horizontally */
          transition: all 0.2s ease;
          flex-shrink: 0; /* Prevent shrinking */
          text-align: center;
          line-height: 1;
          overflow: hidden; /* Prevent content overflow */
          box-sizing: border-box;
        }

        .item-delete-btn {
          background: linear-gradient(135deg, var(--danger) 0%, #c82333 100%);
          border: none;
          color: white;
          padding: 6px; /* Changed from 6px 10px */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          width: 32px; /* Reduced from 35px */
          height: 32px; /* Added fixed height */
          display: flex; /* Added for better centering */
          align-items: center; /* Center vertically */
          justify-content: center; /* Center horizontally */
          transition: all 0.2s ease;
          flex-shrink: 0; /* Prevent shrinking */
          text-align: center;
          line-height: 1;
          overflow: hidden;
          box-sizing: border-box;
        }

        .yearly-total {
          font-size: 1.3rem;
          font-weight: bold;
          text-align: center;
          padding: 25px;
          background: linear-gradient(135deg, var(--card-bg) 0%, var(--bg-secondary) 100%);
          border-radius: 12px;
          margin: 30px 0;
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          color: var(--text-primary);
        }

        .page-actions {
          text-align: center;
          margin: 30px 0;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          margin: 0 8px;
          transition: all 0.2s ease;
          text-transform: none;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
        }

        .btn-secondary {
          background: linear-gradient(135deg, var(--btn-secondary-bg) 0%, #545b62 100%);
          color: white;
        }

        .btn-success {
          background: linear-gradient(135deg, var(--success) 0%, #1e7e34 100%);
          color: white;
        }

        .btn-danger {
          background: linear-gradient(135deg, var(--danger) 0%, #c82333 100%);
          color: white;
        }

        /* Status Summary Section Styling */
        .status-summary-card {
          margin: 30px 0;
          padding: 25px;
          background: linear-gradient(135deg, var(--card-bg) 0%, var(--bg-secondary) 100%);
          border-radius: 12px;
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          transition: all 0.2s ease;
        }
        .status-summary-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.12); transform: translateY(-1px); }
        .status-summary-card h3 {
          margin: 0 0 20px 0; color: var(--text-primary); font-size: 1.3rem; font-weight: 600; text-align: center;
          padding-bottom: 15px; border-bottom: 2px solid var(--primary);
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .status-summary-table {
          width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,.08);
        }
        .status-summary-table thead { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); }
        .status-summary-table th {
          padding: 15px 20px; color: #fff; font-weight: 600; font-size: .95rem; text-align: left; border: none;
          text-shadow: 0 1px 2px rgba(0,0,0,.1);
        }
        .status-summary-table th:last-child { text-align: right; }
        .status-summary-table td {
          padding: 15px 20px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); font-size: .9rem;
          transition: background-color .2s ease;
        }
        .status-summary-table tbody tr:hover { background-color: var(--hover-bg); }
        .status-summary-table tbody tr:last-child td { border-bottom: none; }
        .status-summary-table .amount { text-align: right; font-weight: 600; font-family: 'Courier New', monospace; color: var(--text-primary); }
        .status-summary-table .overall-row {
          background: linear-gradient(135deg, rgba(33,150,243,.08), rgba(33,150,243,.04)); border-top: 2px solid var(--primary);
        }
        .status-summary-table .overall-row td { font-weight: 700; font-size: 1rem; color: var(--primary); border-bottom: none; }
        .status-summary-table .overall-row .amount { color: var(--primary); font-size: 1.1rem; }

        /* Responsive */
        @media (max-width: 768px) {
          .status-summary-card { margin: 20px 0; padding: 20px 15px; }
          .status-summary-table { font-size: .85rem; }
          .status-summary-table th, .status-summary-table td { padding: 12px 10px; }
          .status-summary-table th { font-size: .85rem; }

          @media (max-width: 480px) {
            .status-summary-table, .status-summary-table thead, .status-summary-table tbody,
            .status-summary-table th, .status-summary-table td, .status-summary-table tr { display: block; }
            .status-summary-table thead tr { position: absolute; top: -9999px; left: -9999px; }
            .status-summary-table tr {
              border: 1px solid var(--card-border); border-radius: 8px; margin-bottom: 15px; padding: 15px;
              background: var(--card-bg); box-shadow: 0 2px 4px rgba(0,0,0,.05);
            }
            .status-summary-table td {
              border: none; position: relative; padding: 8px 0 8px 120px; text-align: left !important;
            }
            .status-summary-table td:before {
              content: attr(data-label) ": "; position: absolute; left: 0; width: 110px; padding-right: 10px;
              white-space: nowrap; font-weight: 600; color: var(--text-secondary);
            }
            .status-summary-table .overall-row { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; }
            .status-summary-table .overall-row td, .status-summary-table .overall-row td:before { color: rgba(255,255,255,.9); }
          }
        }

        /* Accents */
        .status-summary-card .amount { position: relative; }
        .status-summary-card .amount:after {
          content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
          opacity: 0; transition: opacity .2s ease;
        }
        .status-summary-table tbody tr:hover .amount:after { opacity: 1; }

        /* Optional horizontal scroll aesthetics */
        .status-summary-table { overflow-x: auto; }
        .status-summary-table::-webkit-scrollbar { height: 6px; }
        .status-summary-table::-webkit-scrollbar-track { background: var(--bg-secondary); border-radius: 3px; }
        .status-summary-table::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 3px; }
        .status-summary-table::-webkit-scrollbar-thumb:hover { background: var(--primary-dark); }

        .savings-plan-section {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05));
          border-radius: 12px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        }

        .savings-plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          background: var(--card-bg);
          border-radius: 8px;
          overflow: hidden;
        }

        .savings-plan-table th,
        .savings-plan-table td {
          padding: 12px 15px;
          border: 1px solid var(--border-light);
          text-align: left;
        }

        .savings-plan-table th {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          font-weight: 600;
        }

        .savings-plan-table td {
          color: var(--text-primary);
        }

        .weekly-sync-indicator {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
          border-radius: 12px;
          border: 1px solid rgba(40, 167, 69, 0.3);
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.1);
        }

        .weekly-sync-indicator h4 {
          margin: 0 0 15px 0;
          color: var(--success);
          font-size: 1.1rem;
        }

        .sync-info {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .add-category-wrapper {
          text-align: center;
          margin: 30px 0;
        }

        .add-category-btn {
          background: linear-gradient(135deg, var(--success) 0%, #1e7e34 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-category-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(40, 167, 69, 0.3);
        }

        @media (max-width: 768px) {
          .page-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .subcategory {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            padding: 15px;
          }

          .subcategory-header {
            display: none;
          }

          .amount-input-group {
            width: 100%;
            justify-content: space-between;
          }

          .status-control-group {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
          }

          .due-date-input, .expense-name-input, .account-select {
            width: 100%;
          }

          .monthly-equivalent {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <h2 className="page-title">📅 Annual Expenses</h2>

      {/* Current Week Selector for Status Sync */}
      <div className="current-week-selector">
        <label><strong>Weekly Planner Sync - Current Week:</strong></label>
        <select
          value={currentWeek}
          onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
          className="week-select"
        >
          <option value={ALL_WEEKS}>All Weeks (Month)</option>
          <option value={1}>Week 1</option>
          <option value={2}>Week 2</option>
          <option value={3}>Week 3</option>
          <option value={4}>Week 4</option>
          <option value={5}>Week 5</option>
        </select>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Status changes will sync with {currentWeek === ALL_WEEKS ? 'all weeks' : `Week ${currentWeek}`} in the weekly planner
        </span>
      </div>

      <div className="page-controls">
        <div></div>
        <div className="action-controls">
          <button className="btn btn-secondary" onClick={resetFunding}>
            Reset Funding
          </button>
          <button className="btn btn-danger" onClick={resetStatuses}>
            Reset Statuses
          </button>
          <button className="btn btn-success" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      <div className="yearly-note">
        💡 Annual expenses are divided by 12 to show their monthly impact on the budget and integrated into the weekly planner.
      </div>

      {/* Annual Expense Categories */}
      <div id="annual-expense-categories">
        {Object.entries(state.data.annual || {}).map(([categoryKey, expenses]) => {
          const categoryName = ANNUAL_CATEGORY_NAMES[categoryKey] || categoryKey;
          const categoryTotal = getCategoryTotal(categoryKey);

          return (
            <div key={categoryKey} className="category" data-category={categoryKey}>
              <div className="category-header">
                <span className="category-name">{categoryName}</span>
                <div className="category-controls">
                  <span className="category-total">{formatCurrency(categoryTotal)}/yr</span>
                  <button className="add-item-btn" onClick={() => addExpense(categoryKey)}>+
                  </button>
                  <button className="remove-category-btn" onClick={() => removeCategory(categoryKey)} title="Delete Category">
                    ×
                  </button>
                </div>
              </div>

              <div className="subcategory-header">
                <span className="header-date">Due Date</span>
                <span className="header-name">Expense Name</span>
                <span style={{ width: '140px', textAlign: 'center' }}>Account</span>
                <span className="header-status">Status</span>
                <div className="header-amounts">
                  <span>Projected</span>
                  <span>Actual</span>
                </div>
                <span className="header-monthly">Monthly</span>
                <span style={{ width: '35px' }}></span>
              </div>

              <div className="subcategory-list">
                {expenses.map((expense, index) => {
                  const actualAmount = parseFloat(expense.actual || 0);
                  const projectedAmount = parseFloat(expense.projected || 0);
                  const monthlyEquivalent = actualAmount / 12;

                  return (
                    <div
                      key={index}
                      className="subcategory"
                      data-expense-id={expense.id}
                    >
                      <input
                        type="date"
                        className="due-date-input"
                        value={expense.date || ''}
                        onChange={(e) => handleExpenseChange(categoryKey, index, 'date', e.target.value)}
                      />

                      <input
                        className="expense-name-input"
                        value={expense.name || ''}
                        placeholder="Expense name"
                        onChange={(e) => handleExpenseChange(categoryKey, index, 'name', e.target.value)}
                      />

                      <select
                        className="account-select"
                        value={expense.accountId || ''}
                        onChange={(e) => handleExpenseChange(categoryKey, index, 'accountId', e.target.value)}
                      >
                        <option value="">Select Account</option>
                        {(Array.isArray(state.data.accounts) ? state.data.accounts : []).map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>

                      <div className="status-control-group">
                        <div className="annual-status-checkboxes">
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="paid-checkbox"
                              checked={getPlannerStatus(expense.name, 'paid')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'paid', e.target.checked)}
                            />
                            <span className="checkbox-label">P</span>
                          </label>
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="transferred-checkbox"
                              checked={getPlannerStatus(expense.name, 'transferred')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'transferred', e.target.checked)}
                            />
                            <span className="checkbox-label">T</span>
                          </label>
                        </div>

                        <select
                          className={`frequency-dropdown ${expense.paid ? 'paid' : expense.transferred ? 'transferred' : ''}`}
                          value={expense.transferStatus || 'full'}
                          onChange={(e) => handleExpenseChange(categoryKey, index, 'transferStatus', e.target.value)}
                        >
                          <option value="full">Full</option>
                          <option value="half">½</option>
                          <option value="quarter">¼</option>
                          <option value="actual">Actual</option>
                        </select>
                      </div>

                      <div className="amount-input-group">
                        <input
                          type="number"
                          className={`amount-input projected-input ${projectedAmount > 0 ? 'has-value' : ''}`}
                          value={expense.projected ?? ''}
                          step="0.01"
                          placeholder="Projected"
                          onChange={(e) => handleExpenseChange(categoryKey, index, 'projected', e.target.value)}
                        />
                        <button
                          className="copy-to-actual-btn"
                          onClick={() => copyProjectedToActual(categoryKey, index)}
                          title="Copy Projected to Actual"
                        >
                          →
                        </button>
                        <input
                          type="number"
                          className={`amount-input actual-input ${actualAmount > 0 ? 'has-value' : ''}`}
                          value={expense.actual ?? ''}
                          step="0.01"
                          placeholder="Actual"
                          onChange={(e) => handleExpenseChange(categoryKey, index, 'actual', e.target.value)}
                        />
                      </div>

                      <div className="monthly-equivalent">
                        {formatCurrency(monthlyEquivalent)}/mo
                      </div>

                      <button
                        className="item-delete-btn"
                        onClick={() => removeExpense(categoryKey, index)}
                        title="Delete Expense"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="add-category-wrapper">
          <button className="add-category-btn" onClick={addCategory}>Add Category</button>
        </div>
      </div>

      <div className="page-actions">
        <button className="btn btn-secondary" onClick={() => handlePrint()}>
          🖨️ Print this Page
        </button>
        <button className="btn btn-primary">
          📁 Export Annual CSV
        </button>
      </div>

      <div className="yearly-total">
        Total Annual Expenses: {formatCurrency(getTotalAnnualExpenses())}/yr ({formatCurrency(getTotalAnnualExpenses() / 12)}/mo)
      </div>

      <div className="status-summary-card">
        <h3>💰 Status Summary</h3>
        <table className="status-summary-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Required Transfers (Hold)</th>
              <th>Paid</th>
              <th>Net to Hold</th>
            </tr>
          </thead>
          <tbody>
            {statusSummary.rows.map(row => {
              const account = (Array.isArray(state.data.accounts) ? state.data.accounts : [])
                .find(a => a.id === row.id);
              const name = account ? account.name : 'Unassigned';
              return (
                <tr key={row.id}>
                  <td data-label="Account">{name}</td>
                  <td data-label="Required Transfers" className="amount">{formatCurrency(row.required)}</td>
                  <td data-label="Paid" className="amount">{formatCurrency(row.paid)}</td>
                  <td data-label="Net to Hold" className="amount">{formatCurrency(row.net)}</td>
                </tr>
              );
            })}
            <tr className="overall-row">
              <td data-label="Account"><strong>Overall</strong></td>
              <td data-label="Required Transfers" className="amount">{formatCurrency(statusSummary.totalRequired)}</td>
              <td data-label="Paid" className="amount">{formatCurrency(statusSummary.totalPaid)}</td>
              <td data-label="Net to Hold" className="amount">{formatCurrency(statusSummary.balanceAfterPayments)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monthly Savings Plan */}
      {Object.keys(savingsPlan).length > 0 && (
        <div className="savings-plan-section">
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>📊 Monthly Savings Plan</h3>
          <table className="savings-plan-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Expenses Due</th>
                <th>Monthly Savings Needed</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(savingsPlan).map(([month, expenses]) => {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                const monthsToSave = expenses[0]?.monthsToSave || 1;
                const monthlySavings = totalAmount / monthsToSave;

                return (
                  <tr key={month}>
                    <td><strong>{monthNames[month - 1]}</strong></td>
                    <td>{expenses.map(exp => `${exp.name} (${formatCurrency(exp.amount)})`).join(', ')}</td>
                    <td><strong>{formatCurrency(monthlySavings)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly Sync Information */}
      <div className="weekly-sync-indicator">
        <h4>📊 Weekly Planner Integration</h4>
        <div className="sync-info">
          • Annual expenses automatically populate the weekly planner as monthly equivalents (annual ÷ 12)<br />
          • Status changes (Paid/Transferred) sync with {currentWeek === ALL_WEEKS ? 'All Weeks' : `Week ${currentWeek}`} in the weekly planner<br />
          • Due dates determine which week expenses are planned for<br />
          • Changes here update the weekly planner in real-time
        </div>
      </div>
    </div>
  );
};

export default AnnualExpensesPage;