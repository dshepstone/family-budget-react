// src/pages/MonthlyExpensesPage.js - Enhanced with Weekly Sync (Accounts Section Removed)
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { MonthlyExpensesPrint } from '../utils/printUtils';

const CATEGORY_NAMES = {
  housing: 'Housing',
  taxes: 'Taxes',
  utilities: 'Utilities',
  insurance: 'Insurance',
  banking: 'Banking',
  loans: 'Loans',
  credit: 'Credit',
  subscriptions: 'Subscriptions',
  food: 'Food',
  transportation: 'Transportation',
  medical: 'Medical',
  personal: 'Personal',
  shopping: 'Shopping',
  dog: 'Dog',
  maintenance: 'Maintenance',
  gifts: 'Gifts'
};

const MonthlyExpensesPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [showZeroValues, setShowZeroValues] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);

  const getPlannerStatus = (expenseName, statusType) => {
    const entry = state.data.plannerState?.[expenseName];
    return entry?.[statusType]?.[currentWeek - 1] || false;
  };

  // Auto-populate planner when monthly data changes
  useEffect(() => {
    if (state.data.monthly && Object.keys(state.data.monthly).length > 0) {
      // Trigger auto-population of planner
      actions.autoPopulatePlanner();
    }
  }, [state.data.monthly]);

  // Handle expense input changes
  const handleExpenseChange = (categoryKey, expenseIndex, field, value) => {
    const category = state.data.monthly[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    const updatedExpense = {
      ...expense,
      [field]: field === 'actual' || field === 'projected' ? parseFloat(value) || 0 : value,
      id: expense.id || `${categoryKey}-${Date.now()}-${expenseIndex}`
    };

    actions.updateMonthlyExpense(categoryKey, updatedExpense, expenseIndex);

    // If this is an actual amount change, trigger planner update
    if (field === 'actual' && updatedExpense.name) {
      setTimeout(() => {
        actions.distributeMonthlyToWeekly(updatedExpense.name, updatedExpense.actual, updatedExpense.date);
      }, 100);
    }
  };

  // Handle status changes (paid/transferred) with weekly sync
  const handleStatusChange = (categoryKey, expenseIndex, statusType, checked) => {
    const category = state.data.monthly[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    const updatedExpense = {
      ...expense,
      [statusType]: checked,
      id: expense.id || `${categoryKey}-${Date.now()}-${expenseIndex}`
    };

    actions.updateMonthlyExpense(categoryKey, updatedExpense, expenseIndex);

    // Sync with weekly planner for current week
    if (expense.name) {
      actions.updateExpenseStatus(
        updatedExpense.id,
        expense.name,
        currentWeek - 1, // Convert to 0-based index
        statusType,
        checked,
        'monthly'
      );
    }
  };

  const handlePrint = () => {
    const printContent = MonthlyExpensesPrint.generatePrintContent(
      state.data,
      calculations,
      formatCurrency
    );
    MonthlyExpensesPrint.openPrintWindow(printContent, 'Monthly Expenses Report');
  };

  // Add new expense to category
  const addExpense = (categoryKey) => {
    const category = state.data.monthly[categoryKey] || [];
    const newExpense = {
      id: `${categoryKey}-${Date.now()}`,
      name: '',
      actual: 0,
      projected: 0,
      date: '',
      accountId: '',
      paid: false,
      transferred: false,
      transferStatus: 'none'
    };

    actions.updateMonthlyExpense(categoryKey, newExpense, category.length);
  };

  // Remove expense from category
  const removeExpense = (categoryKey, expenseIndex) => {
    actions.removeMonthlyExpense(categoryKey, expenseIndex);
  };

  // Add a new category
  const addCategory = () => {
    const name = prompt('Enter new category name');
    if (name && !state.data.monthly[name]) {
      actions.addMonthlyCategory(name);
    }
  };

  // Remove an entire category
  const removeCategory = (categoryKey) => {
    if (window.confirm(`Remove category "${categoryKey}"?`)) {
      actions.removeMonthlyCategory(categoryKey);
    }
  };

  // Copy projected to actual
  const copyProjectedToActual = (categoryKey, expenseIndex) => {
    const category = state.data.monthly[categoryKey] || [];
    const expense = category[expenseIndex] || {};

    handleExpenseChange(categoryKey, expenseIndex, 'actual', expense.projected || 0);
  };

  // Calculate category total
  const getCategoryTotal = (categoryKey) => {
    const category = state.data.monthly[categoryKey] || [];
    return category.reduce((total, expense) => total + (parseFloat(expense.actual) || 0), 0);
  };

  // Calculate total monthly expenses
  const getTotalMonthlyExpenses = () => {
    return calculations.getTotalMonthlyExpenses();
  };

  // Reset funding for all expenses
  const resetFunding = () => {
    if (!window.confirm('Reset all projected amounts to $0.00?')) return;

    Object.keys(state.data.monthly || {}).forEach(categoryKey => {
      const category = state.data.monthly[categoryKey] || [];
      category.forEach((expense, index) => {
        if (expense.name) {
          handleExpenseChange(categoryKey, index, 'projected', 0);
        }
      });
    });
  };

  // Reset all statuses
  const resetStatuses = () => {
    if (!window.confirm('Reset all payment and transfer statuses?')) return;

    Object.keys(state.data.monthly || {}).forEach(categoryKey => {
      const category = state.data.monthly[categoryKey] || [];
      category.forEach((expense, index) => {
        if (expense.name) {
          handleExpenseChange(categoryKey, index, 'paid', false);
          handleExpenseChange(categoryKey, index, 'transferred', false);
          handleExpenseChange(categoryKey, index, 'transferStatus', 'none');
        }
      });
    });
  };

  return (
    <div className="main-content">
      <style>{`
        .monthly-expenses-page {
          padding: 20px;
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

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-label {
          font-weight: 500;
          color: var(--text-primary);
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
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05));
          border-radius: 8px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
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
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .category {
          margin-bottom: 30px;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--card-shadow);
          background: var(--card-bg);
          transition: all 0.2s ease;
        }

        .category:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .category-header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: 20px;
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

        .subcategory-list {
          background-color: var(--card-bg);
        }

        .subcategory {
          display: flex;
          align-items: center;
          padding: 15px 12px;
          border-bottom: 1px solid var(--border-light);
          gap: 12px;
          transition: background-color 0.2s ease;
        }

        .subcategory:hover {
          background-color: var(--hover-bg);
        }

        .subcategory:last-child {
          border-bottom: none;
        }

        .date-input {
          width: 140px;
          padding: 8px 10px;
          border: 1px solid var(--input-border);
          border-radius: 6px;
          font-size: 0.85rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .date-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
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
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
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
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .status-control-group {
          width: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .transfer-status-select {
          width: 90px;
          padding: 4px 6px;
          border: 1px solid var(--input-border);
          border-radius: 4px;
          font-size: 0.8rem;
          background-color: var(--input-bg);
          color: var(--text-primary);
          cursor: pointer;
        }

        .status-none {
          background-color: var(--input-bg);
        }

        .status-quarter {
          background-color: #fff3cd;
        }

        .status-half {
          background-color: #d4edda;
        }

        .status-full {
          background-color: #cce5ff;
        }

        .status-paid {
          background-color: #d1ecf1 !important;
          border-color: #bee5eb !important;
        }

        .expense-status-checkboxes {
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
        }

        .amount-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .amount-input.has-value {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%) !important;
          border-color: var(--success) !important;
          font-weight: 600 !important;
          color: #155724 !important;
        }

        .copy-to-actual-btn {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
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
          box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
        }

        .item-delete-btn {
          background: linear-gradient(135deg, var(--danger) 0%, #c82333 100%);
          border: none;
          color: white;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          width: 35px;
          transition: all 0.2s ease;
        }

        .item-delete-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
        }

        .total {
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

        .weekly-sync-indicator {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%);
          border-radius: 12px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        }

        .weekly-sync-indicator h4 {
          margin: 0 0 15px 0;
          color: var(--primary);
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

          .date-input, .expense-name-input, .account-select {
            width: 100%;
          }
        }
      `}</style>

      <h2 className="page-title">💳 Monthly Expenses</h2>

      {/* Current Week Selector for Status Sync */}
      <div className="current-week-selector">
        <label><strong>Weekly Planner Sync - Current Week:</strong></label>
        <select
          value={currentWeek}
          onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
          className="week-select"
        >
          <option value={1}>Week 1</option>
          <option value={2}>Week 2</option>
          <option value={3}>Week 3</option>
          <option value={4}>Week 4</option>
          <option value={5}>Week 5</option>
        </select>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Status changes will sync with this week in the weekly planner
        </span>
      </div>

      <div className="page-controls">
        <div className="toggle-container">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showZeroValues}
              onChange={(e) => setShowZeroValues(e.target.checked)}
            />
            Show Zero-Value Items
          </label>
        </div>

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

      {/* Expense Categories */}
      <div id="monthly-expense-categories">
        {Object.entries(state.data.monthly || {}).map(([categoryKey, expenses]) => {
          const categoryName = CATEGORY_NAMES[categoryKey] || categoryKey;
          const categoryTotal = getCategoryTotal(categoryKey);

          return (
            <div key={categoryKey} className="category" data-category={categoryKey}>
              <div className="category-header">
                <span className="category-name">{categoryName}</span>
                <div className="category-controls">
                  <span className="category-total">{formatCurrency(categoryTotal)}</span>
                  <button className="add-item-btn" onClick={() => addExpense(categoryKey)}>+
                  </button>
                  <button className="remove-category-btn" onClick={() => removeCategory(categoryKey)} title="Delete Category">
                    ×
                  </button>
                </div>
              </div>

              <div className="subcategory-header">
                <span className="header-date">Date</span>
                <span className="header-name">Expense Name</span>
                <span style={{ width: '140px', textAlign: 'center' }}>Account</span>
                <span className="header-status">Status</span>
                <div className="header-amounts">
                  <span>Projected</span>
                  <span>Actual</span>
                </div>
                <span style={{ width: '35px' }}></span>
              </div>

              <div className="subcategory-list">
                {expenses.map((expense, index) => {
                  const actualAmount = parseFloat(expense.actual || 0);
                  const projectedAmount = parseFloat(expense.projected || 0);
                  const shouldShow = showZeroValues || actualAmount > 0 || expense.name;

                  if (!shouldShow) return null;

                  return (
                    <div
                      key={index}
                      className="subcategory"
                      data-expense-id={expense.id}
                    >
                      <input
                        type="date"
                        className="date-input"
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
                        <select
                          className={`transfer-status-select status-${expense.transferStatus || 'none'}${expense.paid ? ' status-paid' : ''}`}
                          value={expense.transferStatus || 'none'}
                          onChange={(e) => handleExpenseChange(categoryKey, index, 'transferStatus', e.target.value)}
                        >
                          <option value="none">--</option>
                          <option value="quarter">¼</option>
                          <option value="half">½</option>
                          <option value="full">Full</option>
                        </select>

                        <div className="expense-status-checkboxes">
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="transferred-checkbox"
                              checked={getPlannerStatus(expense.name, 'transferred')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'transferred', e.target.checked)}
                            />
                            <span className="checkbox-label">T</span>
                          </label>
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="paid-checkbox"
                              checked={getPlannerStatus(expense.name, 'paid')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'paid', e.target.checked)}
                            />
                            <span className="checkbox-label">P</span>
                          </label>
                        </div>
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
          📁 Export Monthly CSV
        </button>
      </div>

      <div className="total">
        Total Monthly Expenses: {formatCurrency(getTotalMonthlyExpenses())}
      </div>

      {/* Weekly Sync Information */}
      <div className="weekly-sync-indicator">
        <h4>📊 Weekly Planner Integration</h4>
        <div className="sync-info">
          • Monthly expenses automatically populate the weekly planner<br />
          • Status changes (Paid/Transferred) sync with Week {currentWeek} in the weekly planner<br />
          • Due dates determine which week expenses are planned for<br />
          • Changes here update the weekly planner in real-time
        </div>
      </div>
    </div>
  );
};

export default MonthlyExpensesPage;