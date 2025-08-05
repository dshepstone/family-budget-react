// src/pages/MonthlyExpensesPage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExpenseItem from '../components/ExpenseItem';
import { EXPENSE_CATEGORIES, DEFAULT_ACCOUNTS } from '../utils/constants';
import { parseAmount } from '../utils/formatters';

const MonthlyExpensesPage = () => {
  const { state, actions, calculations, formatCurrency: formatCurrencyUtil } = useBudget();
  const [showZeroValues, setShowZeroValues] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const monthlyData = state.data.monthly || {};
  const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();

  const toggleCategory = (categoryKey) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const addExpenseToCategory = (categoryKey) => {
    const newExpense = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      actual: 0,
      account: DEFAULT_ACCOUNTS[0],
      date: '',
      paid: false,
      notes: ''
    };

    actions.updateMonthlyExpense(categoryKey, newExpense);
  };

  const updateExpense = (categoryKey, expenseIndex, updatedExpense) => {
    actions.updateMonthlyExpense(categoryKey, updatedExpense, expenseIndex);
  };

  const deleteExpense = (categoryKey, expenseIndex) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const categoryExpenses = [...(monthlyData[categoryKey] || [])];
      categoryExpenses.splice(expenseIndex, 1);
      
      // Update with the new array
      const newMonthly = { ...monthlyData };
      newMonthly[categoryKey] = categoryExpenses;
      
      // Update the entire monthly data
      Object.entries(newMonthly).forEach(([catKey, expenses]) => {
        expenses.forEach((expense, index) => {
          actions.updateMonthlyExpense(catKey, expense, index);
        });
      });
    }
  };

  const resetAllStatuses = () => {
    if (window.confirm('Reset all payment statuses to unpaid?')) {
      Object.entries(monthlyData).forEach(([categoryKey, expenses]) => {
        expenses.forEach((expense, index) => {
          const updatedExpense = { ...expense, paid: false };
          actions.updateMonthlyExpense(categoryKey, updatedExpense, index);
        });
      });
    }
  };

  const resetAllFunding = () => {
    if (window.confirm('Reset all transfer statuses?')) {
      Object.entries(monthlyData).forEach(([categoryKey, expenses]) => {
        expenses.forEach((expense, index) => {
          const updatedExpense = { ...expense, transferStatus: 'none' };
          actions.updateMonthlyExpense(categoryKey, updatedExpense, index);
        });
      });
    }
  };

  const exportMonthlyCSV = () => {
    const headers = ['Category', 'Name', 'Budgeted', 'Actual', 'Account', 'Date', 'Paid', 'Notes'];
    const csvRows = [headers.join(',')];

    Object.entries(monthlyData).forEach(([categoryKey, expenses]) => {
      const categoryName = EXPENSE_CATEGORIES.MONTHLY.find(cat => cat.key === categoryKey)?.name || categoryKey;
      
      expenses.forEach(expense => {
        const row = [
          categoryName,
          expense.name || '',
          expense.amount || 0,
          expense.actual || 0,
          expense.account || '',
          expense.date || '',
          expense.paid ? 'Yes' : 'No',
          expense.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        
        csvRows.push(row.join(','));
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryTotal = (categoryKey) => {
    const expenses = monthlyData[categoryKey] || [];
    return expenses.reduce((total, expense) => 
      total + parseAmount(expense.actual || expense.amount), 0
    );
  };

  const getAccountSummary = () => {
    const accountTotals = {};
    
    Object.values(monthlyData).forEach(expenses => {
      expenses.forEach(expense => {
        const account = expense.account || 'Unassigned';
        const amount = parseAmount(expense.actual || expense.amount);
        accountTotals[account] = (accountTotals[account] || 0) + amount;
      });
    });

    return accountTotals;
  };

  const accountSummary = getAccountSummary();

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">💳 Monthly Expenses</h2>
        <p className="page-description">
          Manage your recurring monthly expenses with detailed tracking and categorization
        </p>
      </div>

      {/* Page Controls */}
      <div className="page-controls">
        <div className="control-group">
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={showZeroValues}
              onChange={(e) => setShowZeroValues(e.target.checked)}
            />
            <span className="toggle-label">Show Zero-Value Items</span>
          </label>
        </div>

        <div className="control-group">
          <Button variant="secondary" onClick={resetAllFunding}>
            Reset Funding
          </Button>
          <Button variant="danger" onClick={resetAllStatuses}>
            Reset Statuses
          </Button>
          <Button variant="outline" onClick={exportMonthlyCSV}>
            📁 Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-grid">
          <Card title="Total Monthly Expenses" className="summary-card">
            <div className="summary-amount expense">
              {formatCurrencyUtil(totalMonthlyExpenses)}
            </div>
            <div className="summary-details">
              Total across {Object.keys(monthlyData).length} categories
            </div>
          </Card>

          <Card title="Funds to Set Aside by Account" className="summary-card">
            <div className="account-breakdown">
              {Object.entries(accountSummary).map(([account, total]) => (
                <div key={account} className="account-item">
                  <span className="account-name">{account}</span>
                  <span className="account-amount">
                    {formatCurrencyUtil(total)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="categories-section">
        {EXPENSE_CATEGORIES.MONTHLY.map(category => {
          const categoryExpenses = monthlyData[category.key] || [];
          const categoryTotal = getCategoryTotal(category.key);
          const isExpanded = expandedCategories.has(category.key);
          const hasExpenses = categoryExpenses.length > 0;
          const visibleExpenses = showZeroValues ? 
            categoryExpenses : 
            categoryExpenses.filter(expense => 
              parseAmount(expense.actual || expense.amount) > 0
            );

          if (!showZeroValues && !hasExpenses && categoryTotal === 0) {
            return null;
          }

          return (
            <Card key={category.key} className="category-card">
              <div className="category-header">
                <div className="category-info">
                  <button
                    className="category-toggle"
                    onClick={() => toggleCategory(category.key)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    <span className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                  <div className="category-total">
                    {formatCurrencyUtil(categoryTotal)}
                  </div>
                </div>
                
                <div className="category-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addExpenseToCategory(category.key)}
                  >
                    + Add Expense
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="category-content">
                  {visibleExpenses.length === 0 ? (
                    <div className="empty-category">
                      <p>No expenses in this category.</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => addExpenseToCategory(category.key)}
                      >
                        Add First Expense
                      </Button>
                    </div>
                  ) : (
                    <div className="expenses-list">
                      {visibleExpenses.map((expense, index) => (
                        <ExpenseItem
                          key={expense.id || index}
                          expense={expense}
                          onUpdate={(updatedExpense) => 
                            updateExpense(category.key, index, updatedExpense)
                          }
                          onDelete={() => deleteExpense(category.key, index)}
                          type="monthly"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Total Summary */}
      <Card title="Monthly Summary" className="total-summary-card">
        <div className="total-summary">
          <div className="total-item highlight">
            <span className="total-label">Total Monthly Expenses:</span>
            <span className="total-amount expense">
              {formatCurrencyUtil(totalMonthlyExpenses)}
            </span>
          </div>
          
          {Object.keys(accountSummary).length > 0 && (
            <div className="funds-summary">
              <h4>Funds to Set Aside by Account</h4>
              <div className="funds-grid">
                {Object.entries(accountSummary).map(([account, total]) => (
                  <div key={account} className="fund-item">
                    <span className="fund-account">{account}</span>
                    <span className="fund-amount">
                      {formatCurrencyUtil(total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MonthlyExpensesPage;