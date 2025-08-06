// src/pages/WeeklyPlannerPage.js - Complete Integration
import React, { useState, useEffect, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext';

const WEEK_COUNT = 5;

const WeeklyPlannerPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [weekVisibility, setWeekVisibility] = useState(Array(5).fill(true));
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Month names for header
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Auto-populate planner when component mounts or when monthly/annual data changes
  useEffect(() => {
    actions.autoPopulatePlanner();
  }, [state.data.monthly, state.data.annual]);

  // Get all expenses from monthly and annual data
  const getAllExpenses = useCallback(() => {
    const allExpenses = [];

    // Process monthly expenses
    if (state.data.monthly) {
      Object.entries(state.data.monthly).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          expenses.forEach(expense => {
            if (expense.name && expense.name.trim()) {
              allExpenses.push({
                ...expense,
                categoryKey,
                categoryName: getCategoryName(categoryKey),
                monthlyAmount: parseFloat(expense.actual || expense.amount || 0),
                type: 'monthly',
                isAnnual: false
              });
            }
          });
        }
      });
    }

    // Process annual expenses (convert to monthly equivalent)
    if (state.data.annual) {
      Object.entries(state.data.annual).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          expenses.forEach(expense => {
            if (expense.name && expense.name.trim()) {
              const annualAmount = parseFloat(expense.actual || expense.amount || 0);
              allExpenses.push({
                ...expense,
                categoryKey: `annual-${categoryKey}`,
                categoryName: `${getCategoryName(categoryKey)} (Annual)`,
                monthlyAmount: annualAmount / 12,
                type: 'annual',
                isAnnual: true,
                originalAnnualAmount: annualAmount
              });
            }
          });
        }
      });
    }

    return allExpenses;
  }, [state.data.monthly, state.data.annual]);

  // Get category name
  const getCategoryName = (categoryKey) => {
    const categoryNames = {
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
      gifts: 'Gifts',
      'yearly-subs': 'Yearly Subscriptions',
      'yearly-car': 'Yearly Car',
      'yearly-bank': 'Yearly Banking'
    };

    return categoryNames[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  };

  // Get planner data for expense
  const getExpensePlannerData = (expenseName) => {
    return state.data.plannerState?.[expenseName] || {
      weeks: Array(5).fill(0),
      transferred: Array(5).fill(false),
      paid: Array(5).fill(false)
    };
  };

  // Update planner data for expense
  const updateExpensePlannerData = (expenseName, newData) => {
    const updatedPlannerState = {
      ...state.data.plannerState,
      [expenseName]: newData
    };
    actions.updatePlanner(updatedPlannerState);
  };

  // Handle week amount change
  const handleWeekAmountChange = (expenseName, weekIndex, value) => {
    const currentData = getExpensePlannerData(expenseName);
    const newWeeks = [...currentData.weeks];
    newWeeks[weekIndex] = parseFloat(value) || 0;

    updateExpensePlannerData(expenseName, {
      ...currentData,
      weeks: newWeeks
    });
  };

  // Handle status change with cross-page syncing
  const handleStatusChange = (expense, weekIndex, type, checked) => {
    const currentData = getExpensePlannerData(expense.name);
    const newStatus = [...currentData[type]];
    newStatus[weekIndex] = checked;

    // Update planner state
    updateExpensePlannerData(expense.name, {
      ...currentData,
      [type]: newStatus
    });

    // Sync with monthly/annual pages
    actions.updateExpenseStatus(
      expense.id,
      expense.name,
      weekIndex,
      type,
      checked,
      'weekly'
    );
  };

  // Handle quick actions
  const handleQuickAction = (expenseName, weekIndex, action, monthlyAmount) => {
    let newValue = 0;

    switch (action) {
      case 'reset':
        newValue = 0;
        break;
      case 'full':
        newValue = monthlyAmount;
        break;
      case 'half':
        newValue = monthlyAmount / 2;
        break;
      case 'quarter':
        newValue = monthlyAmount / 4;
        break;
      default:
        return;
    }

    handleWeekAmountChange(expenseName, weekIndex, newValue);
  };

  // Calculate week totals
  const calculateWeekTotals = () => {
    return calculations.getWeeklyPlannerTotals();
  };

  // Calculate remaining balance for expense
  const calculateRemainingBalance = (expense, weeklyAmounts) => {
    const monthlyAmount = expense.monthlyAmount;
    const weeklySum = weeklyAmounts.reduce((sum, amount) => sum + amount, 0);
    return monthlyAmount - weeklySum;
  };

  // Toggle week visibility
  const toggleWeekVisibility = (weekIndex) => {
    const newVisibility = [...weekVisibility];
    newVisibility[weekIndex] = !newVisibility[weekIndex];
    setWeekVisibility(newVisibility);
  };

  // Reset week
  const resetWeek = (weekIndex) => {
    if (!window.confirm(`Are you sure you want to reset all Week ${weekIndex + 1} planned amounts to zero?`)) {
      return;
    }

    const allExpenses = getAllExpenses();
    allExpenses.forEach(expense => {
      handleWeekAmountChange(expense.name, weekIndex, 0);
    });
  };

  // Reset all weeks
  const resetAllWeeks = () => {
    if (!window.confirm('Are you sure you want to reset all weekly planned amounts to zero?')) {
      return;
    }

    const allExpenses = getAllExpenses();
    allExpenses.forEach(expense => {
      const currentData = getExpensePlannerData(expense.name);
      updateExpensePlannerData(expense.name, {
        ...currentData,
        weeks: Array(5).fill(0)
      });
    });
  };

  // Calculate week date ranges
  const getWeekDateRange = (weekIndex) => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const weekStartDate = new Date(currentYear, currentMonth, 1 + weekIndex * 7);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    // Ensure week end doesn't go past month end
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    if (weekEndDate > monthEnd) {
      weekEndDate.setTime(monthEnd.getTime());
    }

    return {
      start: weekStartDate.toISOString().split('T')[0],
      end: weekEndDate.toISOString().split('T')[0]
    };
  };

  // Auto-distribute expenses evenly across weeks
  const autoDistributeExpenses = () => {
    if (!window.confirm('Auto-distribute all expenses evenly across weeks? This will overwrite current weekly planning.')) {
      return;
    }

    const allExpenses = getAllExpenses();
    allExpenses.forEach(expense => {
      const weeklyAmount = expense.monthlyAmount / 5;
      const currentData = getExpensePlannerData(expense.name);
      updateExpensePlannerData(expense.name, {
        ...currentData,
        weeks: Array(5).fill(weeklyAmount)
      });
    });
  };

  // Group expenses by category for display
  const groupExpensesByCategory = () => {
    const allExpenses = getAllExpenses();
    const grouped = {};

    allExpenses.forEach(expense => {
      if (!grouped[expense.categoryKey]) {
        grouped[expense.categoryKey] = {
          name: expense.categoryName,
          expenses: []
        };
      }
      grouped[expense.categoryKey].expenses.push(expense);
    });

    return grouped;
  };

  const weekTotals = calculateWeekTotals();
  const weeklyIncome = calculations.getWeeklyIncome();
  const groupedExpenses = groupExpensesByCategory();

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .weekly-planner-page {
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

        .week-visibility-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .week-visibility-controls label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
          cursor: pointer;
        }

        .action-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .planner-table-container {
          overflow-x: auto;
          width: 100%;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .planner-table {
          width: 100%;
          border-collapse: collapse;
          background-color: #fff;
          font-size: 0.9rem;
          min-width: 1200px;
        }

        .planner-table th,
        .planner-table td {
          padding: 8px;
          border: 1px solid #dee2e6;
          text-align: center;
          vertical-align: middle;
        }

        .planner-table th {
          background-color: #007bff;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .planner-table th:first-child {
          text-align: left;
          width: 25%;
        }

        .planner-table th.status-header {
          min-width: 60px;
          font-size: 0.8rem;
        }

        .week-date-range-inputs {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 4px 0;
        }

        .week-date-start,
        .week-date-end {
          font-size: 0.7rem;
          padding: 1px 2px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 2px;
          background-color: rgba(255,255,255,0.1);
          color: white;
        }

        .category-row {
          background-color: #f8f9fa !important;
          font-weight: bold;
          color: #2c3e50;
        }

        .category-row td {
          text-align: left;
          padding-left: 15px;
          font-size: 1rem;
          background-color: #f8f9fa;
        }

        .expense-name {
          text-align: left !important;
          padding-left: 20px !important;
          font-weight: 500;
          color: #495057;
        }

        .annual-indicator {
          font-size: 0.7rem;
          color: #6c757d;
          font-style: italic;
        }

        .planner-input-group {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          position: relative;
          width: 100%;
        }

        .table-input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
          text-align: right;
          background-color: #fff;
          color: #495057;
          transition: all 0.2s ease;
        }

        .table-input:focus {
          outline: 2px solid #007bff;
          outline-offset: -1px;
          border-color: #007bff;
        }

        .table-input.has-value {
          background-color: #e8f5e8 !important;
          border-color: #28a745 !important;
          font-weight: 600 !important;
          color: #155724 !important;
        }

        .table-input.zero-value {
          background-color: #fff;
          border-color: #dee2e6;
          font-weight: normal;
        }

        .planner-action-select {
          font-size: 0.75rem;
          padding: 2px 4px;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          background-color: #f8f9fa;
          color: #495057;
          cursor: pointer;
          max-width: 100%;
        }

        .planner-action-select:hover {
          background-color: #e9ecef;
        }

        .status-cell {
          text-align: center !important;
          padding: 4px !important;
          min-width: 60px;
          vertical-align: middle;
        }

        .status-checkboxes {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .transferred-checkbox,
        .paid-checkbox {
          margin: 2px;
          transform: scale(1.1);
          cursor: pointer;
        }

        .transferred-checkbox:checked {
          accent-color: #ffc107;
        }

        .paid-checkbox:checked {
          accent-color: #28a745;
        }

        .remaining-amount {
          font-weight: 600 !important;
          text-align: right;
          padding-right: 12px !important;
        }

        .table-footer {
          background-color: #f8f9fa;
          font-weight: bold;
          border-top: 2px solid #007bff;
        }

        .table-footer td {
          padding: 10px 8px;
          font-size: 0.9rem;
        }

        .cash-flow-analysis {
          margin-top: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 100%);
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .cash-flow-analysis h3 {
          margin-bottom: 15px;
          color: #2c3e50;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .cash-flow-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
        }

        .cash-flow-grid > div {
          text-align: center;
          padding: 12px;
          background-color: rgba(255,255,255,0.8);
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .week-label {
          font-size: 0.9rem;
          color: #7f8c8d;
          margin-bottom: 5px;
        }

        .balance-amount {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .balance-amount.positive {
          color: #27ae60;
        }

        .balance-amount.negative {
          color: #e74c3c;
        }

        .hidden {
          display: none !important;
        }

        .income-section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #e8f5e8;
          border-radius: 8px;
          border: 1px solid #28a745;
        }

        .income-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .income-week {
          text-align: center;
          padding: 8px;
          background-color: rgba(255,255,255,0.8);
          border-radius: 4px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
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

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .page-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .cash-flow-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .income-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <h2 className="page-title">📋 Weekly Budget Planner</h2>

      {/* Income Section */}
      <div className="income-section">
        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>💵 Weekly Income</h3>
        <div className="income-summary">
          {weeklyIncome.map((income, index) => (
            <div key={index} className={`income-week ${!weekVisibility[index] ? 'hidden' : ''}`}>
              <div className="week-label">Week {index + 1}</div>
              <div style={{ fontWeight: 'bold', color: '#155724' }}>
                {formatCurrency(income)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-controls">
        <div className="week-visibility-controls">
          <span style={{ fontWeight: '600' }}>Show Weeks:</span>
          {Array.from({ length: 5 }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={weekVisibility[i]}
                onChange={() => toggleWeekVisibility(i)}
              />
              {i + 1}
            </label>
          ))}
        </div>

        <div className="action-controls">
          <button className="btn btn-primary" onClick={autoDistributeExpenses}>
            Auto-Distribute
          </button>
          <button className="btn btn-danger btn-sm" onClick={resetAllWeeks}>
            Reset All Weeks
          </button>
          <button className="btn btn-success" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Print this Page
          </button>
        </div>
      </div>

      <div className="planner-table-container">
        <table className="planner-table" id="planner-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Expense Category</th>
              <th>Monthly Actual</th>
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  <th
                    className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}
                  >
                    <div>Week {weekIndex + 1}</div>
                    <div className="week-date-range-inputs">
                      <input
                        type="date"
                        className="week-date-start"
                        value={getWeekDateRange(weekIndex).start}
                        readOnly
                      />
                      <input
                        type="date"
                        className="week-date-end"
                        value={getWeekDateRange(weekIndex).end}
                        readOnly
                      />
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => resetWeek(weekIndex)}
                    >
                      Reset
                    </button>
                  </th>
                  <th className={`week-${weekIndex + 1}-status-col status-header ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                    Status
                  </th>
                </React.Fragment>
              ))}
              <th>Remaining Balance</th>
            </tr>
          </thead>

          <tbody>
            {Object.keys(groupedExpenses).length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No expense data found. Please add expenses in the Monthly and Annual Expenses tabs first.
                </td>
              </tr>
            ) : (
              Object.entries(groupedExpenses).map(([categoryKey, category]) => (
                <React.Fragment key={categoryKey}>
                  {/* Category Header */}
                  <tr className="category-row">
                    <td colSpan="13">{category.name}</td>
                  </tr>

                  {/* Expense Rows */}
                  {category.expenses.map((expense, index) => {
                    const expenseData = getExpensePlannerData(expense.name);
                    const remaining = calculateRemainingBalance(expense, expenseData.weeks);

                    return (
                      <tr key={`${categoryKey}-${index}`} data-expense-id={expense.id}>
                        <td className="expense-name" style={{ textAlign: 'left', paddingLeft: '20px' }}>
                          {expense.name}
                          {expense.isAnnual && (
                            <div className="annual-indicator">
                              (Annual: {formatCurrency(expense.originalAnnualAmount)})
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{formatCurrency(expense.monthlyAmount)}</strong>
                        </td>

                        {/* Week Columns */}
                        {Array.from({ length: 5 }, (_, weekIndex) => (
                          <React.Fragment key={weekIndex}>
                            <td className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                              <div className="planner-input-group">
                                <input
                                  type="number"
                                  className={`table-input ${expenseData.weeks[weekIndex] > 0 ? 'has-value' : 'zero-value'}`}
                                  value={expenseData.weeks[weekIndex].toFixed(2)}
                                  step="0.01"
                                  onChange={(e) => handleWeekAmountChange(expense.name, weekIndex, e.target.value)}
                                />
                                <select
                                  className="planner-action-select"
                                  onChange={(e) => {
                                    handleQuickAction(expense.name, weekIndex, e.target.value, expense.monthlyAmount);
                                    e.target.value = '';
                                  }}
                                >
                                  <option value="">Quick Fill</option>
                                  <option value="reset">Reset to $0</option>
                                  <option value="full">Full Amount ({formatCurrency(expense.monthlyAmount)})</option>
                                  <option value="half">Half Amount ({formatCurrency(expense.monthlyAmount / 2)})</option>
                                  <option value="quarter">Quarter Amount ({formatCurrency(expense.monthlyAmount / 4)})</option>
                                </select>
                              </div>
                            </td>
                            <td className={`week-${weekIndex + 1}-status-col status-cell ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                              <div className="status-checkboxes">
                                <input
                                  type="checkbox"
                                  className="transferred-checkbox"
                                  title="Transferred"
                                  checked={expenseData.transferred[weekIndex]}
                                  onChange={(e) => handleStatusChange(expense, weekIndex, 'transferred', e.target.checked)}
                                />
                                <br />
                                <input
                                  type="checkbox"
                                  className="paid-checkbox"
                                  title="Paid"
                                  checked={expenseData.paid[weekIndex]}
                                  onChange={(e) => handleStatusChange(expense, weekIndex, 'paid', e.target.checked)}
                                />
                              </div>
                            </td>
                          </React.Fragment>
                        ))}

                        <td
                          className="remaining-amount"
                          style={{
                            fontWeight: 'bold',
                            color: Math.abs(remaining) < 0.001 ? 'black' : 'red'
                          }}
                        >
                          {formatCurrency(remaining)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>

          <tfoot>
            <tr className="table-footer">
              <td><strong>Weekly Expense Totals</strong></td>
              <td></td>
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  <td className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                    <strong>{formatCurrency(weekTotals[weekIndex])}</strong>
                    <div style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
                      Net: {formatCurrency(weeklyIncome[weekIndex] - weekTotals[weekIndex])}
                    </div>
                  </td>
                  <td className={`week-${weekIndex + 1}-status-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}></td>
                </React.Fragment>
              ))}
              <td>
                <strong>{formatCurrency(weekTotals.reduce((sum, total) => sum + total, 0))}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Cash Flow Analysis */}
      <div className="cash-flow-analysis">
        <h3>📊 Weekly Cash Flow Analysis</h3>
        <div className="cash-flow-grid">
          {Array.from({ length: 5 }, (_, weekIndex) => {
            const balance = weeklyIncome[weekIndex] - weekTotals[weekIndex];
            return (
              <div
                key={weekIndex}
                className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}
              >
                <div className="week-label">Week {weekIndex + 1}</div>
                <div className="week-label">Income: {formatCurrency(weeklyIncome[weekIndex])}</div>
                <div className="week-label">Expenses: {formatCurrency(weekTotals[weekIndex])}</div>
                <div className={`balance-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                  Balance: {formatCurrency(balance)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerPage;