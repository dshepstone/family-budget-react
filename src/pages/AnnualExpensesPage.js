// src/pages/AnnualExpensesPage.js - Enhanced with Weekly Sync
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';

const ANNUAL_CATEGORIES = [
  'yearly-subs', 'yearly-car', 'yearly-bank', 'yearly-insurance',
  'yearly-tax', 'yearly-medical', 'yearly-home', 'yearly-personal'
];

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
    return entry?.[statusType]?.[currentWeek - 1] || false;
  };

  // Initialize empty categories if they don't exist
  useEffect(() => {
    const hasAnnualData = state.data.annual && Object.keys(state.data.annual).length > 0;

    if (!hasAnnualData) {
      const initialData = {};
      ANNUAL_CATEGORIES.forEach(category => {
        initialData[category] = [];
      });

      // Update the annual data in context
      ANNUAL_CATEGORIES.forEach(category => {
        actions.updateAnnualExpense(category, { name: '', actual: 0, projected: 0, date: '', account: '', paid: false, transferred: false }, 0);
      });
    }
  }, []);

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
      actions.updateExpenseStatus(
        updatedExpense.id,
        expense.name,
        currentWeek - 1, // Convert to 0-based index
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
      account: '',
      paid: false,
      transferred: false,
      transferStatus: 'full'
    };

    actions.updateAnnualExpense(categoryKey, newExpense, category.length);
  };

  // Remove expense from category
  const removeExpense = (categoryKey, expenseIndex) => {
    const category = state.data.annual[categoryKey] || [];
    const updatedCategory = category.filter((_, index) => index !== expenseIndex);

    // Update the entire category
    updatedCategory.forEach((expense, index) => {
      actions.updateAnnualExpense(categoryKey, expense, index);
    });

    // If we removed all expenses, ensure category still exists as empty array
    if (updatedCategory.length === 0) {
      actions.updateAnnualExpense(categoryKey, { name: '', actual: 0 }, 0);
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

  // Reset funding for all expenses
  const resetFunding = () => {
    if (!window.confirm('Reset all projected amounts to $0.00?')) return;

    ANNUAL_CATEGORIES.forEach(categoryKey => {
      const category = state.data.annual[categoryKey] || [];
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

    ANNUAL_CATEGORIES.forEach(categoryKey => {
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

    ANNUAL_CATEGORIES.forEach(categoryKey => {
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
    <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .annual-expenses-page {
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
          background-color: #e8f5e8;
          border-radius: 6px;
          border: 1px solid #28a745;
        }

        .week-select {
          padding: 5px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .yearly-note {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          font-size: 0.95rem;
          color: #856404;
        }

        .category {
          margin-bottom: 30px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .category-header {
          background-color: #28a745;
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

        .header-monthly {
          width: 80px;
          text-align: center;
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

        .due-date-input {
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

        .annual-status-checkboxes {
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

        .frequency-dropdown {
          width: 80px;
          padding: 2px 4px;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          font-size: 0.8rem;
          background-color: #fff;
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
          background-color: #28a745;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .copy-to-actual-btn:hover {
          background-color: #1e7e34;
        }

        .monthly-equivalent {
          width: 80px;
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
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

        .yearly-total {
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

        .savings-plan-section {
          margin-top: 30px;
          padding: 20px;
          background-color: #f0f8ff;
          border-radius: 8px;
          border: 1px solid #b3d9ff;
        }

        .savings-plan-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .savings-plan-table th,
        .savings-plan-table td {
          padding: 10px;
          border: 1px solid #dee2e6;
          text-align: left;
        }

        .savings-plan-table th {
          background-color: #007bff;
          color: white;
          font-weight: 600;
        }

        .weekly-sync-indicator {
          margin-top: 20px;
          padding: 15px;
          background-color: #e8f5e8;
          border-radius: 8px;
          border: 1px solid #28a745;
        }

        .weekly-sync-indicator h4 {
          margin: 0 0 10px 0;
          color: #155724;
        }

        .sync-info {
          font-size: 0.9rem;
          color: #155724;
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

      <h2 className="page-title">📅 Annual Expenses</h2>

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
        {ANNUAL_CATEGORIES.map(categoryKey => {
          const categoryName = ANNUAL_CATEGORY_NAMES[categoryKey];
          const expenses = state.data.annual?.[categoryKey] || [];
          const categoryTotal = getCategoryTotal(categoryKey);

          return (
            <div key={categoryKey} className="category" data-category={categoryKey}>
              <div className="category-header">
                <span className="category-name">{categoryName}</span>
                <div className="category-controls">
                  <span className="category-total">{formatCurrency(categoryTotal)}/yr</span>
                  <button
                    className="add-item-btn"
                    onClick={() => addExpense(categoryKey)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="subcategory-header">
                <span className="header-date">Due Date</span>
                <span className="header-name">Expense Name</span>
                <span style={{ width: '120px', textAlign: 'center' }}>Account</span>
                <span className="header-status">Status</span>
                <div className="header-amounts">
                  <span>Projected</span>
                  <span>Actual</span>
                </div>
                <span className="header-monthly">Monthly</span>
                <span style={{ width: '30px' }}></span>
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
                        <div className="annual-status-checkboxes">
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="paid-checkbox"
                              checked={getPlannerStatus(expense.name, 'paid')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'paid', e.target.checked)}
                            />
                            <span className="checkbox-label">Paid</span>
                          </label>
                          <label className="status-checkbox-label">
                            <input
                              type="checkbox"
                              className="transferred-checkbox"
                              checked={getPlannerStatus(expense.name, 'transferred')}
                              onChange={(e) => handleStatusChange(categoryKey, index, 'transferred', e.target.checked)}
                            />
                            <span className="checkbox-label">Trans</span>
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
                        </select>
                      </div>

                      <div className="amount-input-group">
                        <input
                          type="number"
                          className={`amount-input projected-input ${projectedAmount > 0 ? 'has-value' : ''}`}
                          value={projectedAmount.toFixed(2)}
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
                          value={actualAmount.toFixed(2)}
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
      </div>

      <div className="page-actions">
        <button className="btn btn-secondary" onClick={() => window.print()}>
          🖨️ Print this Page
        </button>
        <button className="btn btn-primary">
          📁 Export Annual CSV
        </button>
      </div>

      <div className="yearly-total">
        Total Annual Expenses: {formatCurrency(getTotalAnnualExpenses())}/yr ({formatCurrency(getTotalAnnualExpenses() / 12)}/mo)
      </div>

      {/* Monthly Savings Plan */}
      {Object.keys(savingsPlan).length > 0 && (
        <div className="savings-plan-section">
          <h3 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>📊 Monthly Savings Plan</h3>
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
          • Status changes (Paid/Transferred) sync with Week {currentWeek} in the weekly planner<br />
          • Due dates determine which week expenses are planned for<br />
          • Changes here update the weekly planner in real-time
        </div>
      </div>
    </div>
  );
};

export default AnnualExpensesPage;