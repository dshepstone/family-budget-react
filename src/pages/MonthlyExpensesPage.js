// src/pages/MonthlyExpensesPage.js - Enhanced with Weekly Sync
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';

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

  // Add new expense to category
  const addExpense = (categoryKey) => {
    const category = state.data.monthly[categoryKey] || [];
    const newExpense = {
      id: `${categoryKey}-${Date.now()}`,
      name: '',
      actual: 0,
      projected: 0,
      date: '',
      account: '',
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

  // Create account select options
  const createAccountSelect = (selectedAccount = '') => {
    const accounts = ['Checking', 'Savings', 'Credit Card', 'Cash', 'Investment', 'Other'];

    return (
      <select value={selectedAccount} className="account-select">
        <option value="">Select Account</option>
        {accounts.map(account => (
          <option key={account} value={account}>{account}</option>
        ))}
      </select>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .monthly-expenses-page {
          padding: 20px;
          background-color: #fff;
          min-height: 100vh;
        }

        .page-title {
          color: #2c3e50;
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
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          flex-wrap: wrap;
          gap: 15px;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-label {
          font-weight: 500;
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
          padding: 10px;
          background-color: #e3f2fd;
          border-radius: 6px;
          border: 1px solid #2196f3;
        }

        .week-select {
          padding: 5px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .category {
          margin-bottom: 30px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .category-header {
          background-color: #007bff;
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-name {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .category-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .category-total {
          font-size: 1.1rem;
          font-weight: bold;
        }

        .add-item-btn {
          background-color: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
        }

        .add-item-btn:hover {
          background-color: rgba(255,255,255,0.3);
        }

        .subcategory-header {
          display: flex;
          background-color: #f8f9fa;
          padding: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
        }

        .header-date {
          width: 120px;
        }

        .header-name {
          flex: 2;
        }

        .header-status {
          width: 120px;
          text-align: center;
        }

        .header-amounts {
          width: 200px;
          display: flex;
          justify-content: space-between;
        }

        .subcategory-list {
          background-color: #fff;
        }

        .subcategory {
          display: flex;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #f0f0f0;
          gap: 10px;
        }

        .subcategory:hover {
          background-color: #f8f9fa;
        }

        .date-input {
          width: 120px;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .expense-name-input {
          flex: 2;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .account-select {
          width: 120px;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
          background-color: #fff;
        }

        .status-control-group {
          width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .transfer-status-select {
          width: 80px;
          padding: 2px 4px;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          font-size: 0.8rem;
          background-color: #fff;
        }

        .status-none {
          background-color: #fff;
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
          gap: 5px;
        }

        .status-checkbox-label {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .checkbox-label {
          font-weight: bold;
        }

        .transferred-checkbox:checked {
          accent-color: #ffc107;
        }

        .paid-checkbox:checked {
          accent-color: #28a745;
        }

        .amount-input-group {
          width: 200px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .amount-input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
          text-align: right;
        }

        .amount-input.has-value {
          background-color: #e8f5e8;
          border-color: #28a745;
          font-weight: 600;
          color: #155724;
        }

        .copy-to-actual-btn {
          background-color: #007bff;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .copy-to-actual-btn:hover {
          background-color: #0056b3;
        }

        .item-delete-btn {
          background-color: #dc3545;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
          width: 30px;
        }

        .item-delete-btn:hover {
          background-color: #c82333;
        }

        .total {
          font-size: 1.2rem;
          font-weight: bold;
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }

        .page-actions {
          text-align: center;
          margin: 20px 0;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          margin: 0 5px;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover {
          background-color: #1e7e34;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .hidden {
          display: none !important;
        }

        .weekly-sync-indicator {
          margin-top: 20px;
          padding: 15px;
          background-color: #e3f2fd;
          border-radius: 8px;
          border: 1px solid #2196f3;
        }

        .weekly-sync-indicator h4 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }

        .sync-info {
          font-size: 0.9rem;
          color: #1565c0;
        }

        @media (max-width: 768px) {
          .page-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .subcategory {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .subcategory-header {
            display: none;
          }

          .amount-input-group {
            width: 100%;
            justify-content: space-between;
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
        <span style={{ fontSize: '0.9rem', color: '#666' }}>
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
                <span style={{ width: '120px', textAlign: 'center' }}>Account</span>
                <span className="header-status">Status</span>
                <div className="header-amounts">
                  <span>Projected</span>
                  <span>Actual</span>
                </div>
                <span style={{ width: '30px' }}></span>
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
                        value={expense.account || ''}
                        onChange={(e) => handleExpenseChange(categoryKey, index, 'account', e.target.value)}
                      >
                        <option value="">Select Account</option>
                        <option value="Checking">Checking</option>
                        <option value="Savings">Savings</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Investment">Investment</option>
                        <option value="Other">Other</option>
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
        <button className="btn btn-secondary" onClick={() => window.print()}>
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