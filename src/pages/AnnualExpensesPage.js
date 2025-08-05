// src/pages/AnnualExpensesPage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExpenseItem from '../components/ExpenseItem';
import { EXPENSE_CATEGORIES, DEFAULT_ACCOUNTS, FREQUENCY_OPTIONS } from '../utils/constants';
import { parseAmount } from '../utils/formatters';
import { currencyCalculator } from '../plugins/calculators/CurrencyCalculator';

const AnnualExpensesPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showZeroValues, setShowZeroValues] = useState(true);

  const annualData = state.data.annual || {};
  const totalAnnualExpenses = calculations.getTotalAnnualExpenses();
  const monthlyImpact = currencyCalculator.divide(totalAnnualExpenses, 12);

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
      frequency: 'annual',
      paid: false,
      notes: ''
    };

    actions.updateAnnualExpense(categoryKey, newExpense);
  };

  const updateExpense = (categoryKey, expenseIndex, updatedExpense) => {
    actions.updateAnnualExpense(categoryKey, updatedExpense, expenseIndex);
  };

  const deleteExpense = (categoryKey, expenseIndex) => {
    if (window.confirm('Are you sure you want to delete this annual expense?')) {
      const categoryExpenses = [...(annualData[categoryKey] || [])];
      categoryExpenses.splice(expenseIndex, 1);
      
      const newAnnual = { ...annualData };
      newAnnual[categoryKey] = categoryExpenses;
      
      Object.entries(newAnnual).forEach(([catKey, expenses]) => {
        expenses.forEach((expense, index) => {
          actions.updateAnnualExpense(catKey, expense, index);
        });
      });
    }
  };

  const resetAllStatuses = () => {
    if (window.confirm('Reset all payment statuses to unpaid?')) {
      Object.entries(annualData).forEach(([categoryKey, expenses]) => {
        expenses.forEach((expense, index) => {
          const updatedExpense = { ...expense, paid: false };
          actions.updateAnnualExpense(categoryKey, updatedExpense, index);
        });
      });
    }
  };

  const resetAllFunding = () => {
    if (window.confirm('Reset all transfer statuses?')) {
      Object.entries(annualData).forEach(([categoryKey, expenses]) => {
        expenses.forEach((expense, index) => {
          const updatedExpense = { ...expense, transferStatus: 'none' };
          actions.updateAnnualExpense(categoryKey, updatedExpense, index);
        });
      });
    }
  };

  const exportAnnualCSV = () => {
    const headers = ['Category', 'Name', 'Amount', 'Account', 'Due Date', 'Frequency', 'Paid', 'Monthly Impact', 'Notes'];
    const csvRows = [headers.join(',')];

    Object.entries(annualData).forEach(([categoryKey, expenses]) => {
      const categoryName = EXPENSE_CATEGORIES.ANNUAL.find(cat => cat.key === categoryKey)?.name || categoryKey;
      
      expenses.forEach(expense => {
        const amount = parseAmount(expense.actual || expense.amount);
        const monthlyImpact = getMonthlyImpact(amount, expense.frequency);
        
        const row = [
          categoryName,
          expense.name || '',
          amount,
          expense.account || '',
          expense.date || '',
          expense.frequency || 'annual',
          expense.paid ? 'Yes' : 'No',
          monthlyImpact,
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
    a.download = `annual-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryTotal = (categoryKey) => {
    const expenses = annualData[categoryKey] || [];
    return expenses.reduce((total, expense) => 
      total + parseAmount(expense.actual || expense.amount), 0
    );
  };

  const getMonthlyImpact = (amount, frequency) => {
    switch (frequency) {
      case 'monthly':
        return amount;
      case 'quarterly':
        return currencyCalculator.divide(amount, 3);
      case 'semi-annual':
        return currencyCalculator.divide(amount, 6);
      case 'annual':
      default:
        return currencyCalculator.divide(amount, 12);
    }
  };

  const getAccountSavingsPlan = () => {
    const accountTotals = {};
    
    Object.values(annualData).forEach(expenses => {
      expenses.forEach(expense => {
        const account = expense.account || 'Unassigned';
        const amount = parseAmount(expense.actual || expense.amount);
        const monthlyAmount = getMonthlyImpact(amount, expense.frequency);
        accountTotals[account] = (accountTotals[account] || 0) + monthlyAmount;
      });
    });

    return accountTotals;
  };

  const getUpcomingAnnualExpenses = () => {
    const upcoming = [];
    const today = new Date();
    
    Object.values(annualData).forEach(expenses => {
      expenses.forEach(expense => {
        if (expense.date && !expense.paid) {
          const dueDate = new Date(expense.date);
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 90 && daysUntil >= 0) {
            upcoming.push({
              ...expense,
              daysUntil,
              monthlyImpact: getMonthlyImpact(parseAmount(expense.actual || expense.amount), expense.frequency)
            });
          }
        }
      });
    });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const accountSavingsPlan = getAccountSavingsPlan();
  const upcomingExpenses = getUpcomingAnnualExpenses();

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">📅 Annual Expenses</h2>
        <p className="page-description">
          Plan and track your annual expenses with monthly impact analysis and savings goals
        </p>
        <div className="annual-note">
          💡 Annual expenses are divided by 12 to show their monthly impact on your budget
        </div>
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
          <Button variant="outline" onClick={exportAnnualCSV}>
            📁 Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-grid">
          <Card title="Total Annual Expenses" className="summary-card">
            <div className="summary-amount expense">
              {formatCurrency(totalAnnualExpenses)}
            </div>
            <div className="summary-details">
              Monthly impact: {formatCurrency(monthlyImpact)}
            </div>
          </Card>

          <Card title="Upcoming Expenses (90 days)" className="summary-card">
            <div className="summary-amount warning">
              {formatCurrency(upcomingExpenses.reduce((total, exp) => 
                total + parseAmount(exp.actual || exp.amount), 0))}
            </div>
            <div className="summary-details">
              {upcomingExpenses.length} expenses due
            </div>
          </Card>

          <Card title="Monthly Savings Needed" className="summary-card">
            <div className="summary-amount info">
              {formatCurrency(Object.values(accountSavingsPlan).reduce((total, amount) => total + amount, 0))}
            </div>
            <div className="summary-details">
              Across {Object.keys(accountSavingsPlan).length} accounts
            </div>
          </Card>
        </div>
      </div>

      {/* Upcoming Expenses Alert */}
      {upcomingExpenses.length > 0 && (
        <Card title="⚠️ Upcoming Annual Expenses" className="alert-card warning">
          <div className="upcoming-expenses-list">
            {upcomingExpenses.slice(0, 5).map((expense, index) => (
              <div key={index} className="upcoming-expense-item">
                <div className="expense-info">
                  <span className="expense-name">{expense.name}</span>
                  <span className="expense-amount">{formatCurrency(expense.actual || expense.amount)}</span>
                </div>
                <div className="expense-timing">
                  <span className={`days-until ${expense.daysUntil <= 30 ? 'urgent' : 'soon'}`}>
                    {expense.daysUntil === 0 ? 'Due today' : 
                     expense.daysUntil === 1 ? 'Due tomorrow' : 
                     `Due in ${expense.daysUntil} days`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Annual Expense Categories */}
      <div className="categories-section">
        {EXPENSE_CATEGORIES.ANNUAL.map(category => {
          const categoryExpenses = annualData[category.key] || [];
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

          const monthlyImpact = currencyCalculator.divide(categoryTotal, 12);

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
                  <div className="category-totals">
                    <div className="category-total annual">
                      {formatCurrency(categoryTotal)}/yr
                    </div>
                    <div className="category-total monthly">
                      ({formatCurrency(monthlyImpact)}/mo)
                    </div>
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
                      <p>No annual expenses in this category.</p>
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
                          type="annual"
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

      {/* Savings Plan Summary */}
      <Card title="🏦 Monthly Savings Plan by Account" className="savings-plan-card">
        <div className="savings-plan">
          {Object.keys(accountSavingsPlan).length === 0 ? (
            <div className="no-savings-plan">
              <p>No annual expenses assigned to accounts yet.</p>
            </div>
          ) : (
            <div className="savings-grid">
              {Object.entries(accountSavingsPlan).map(([account, monthlyAmount]) => (
                <div key={account} className="savings-item">
                  <div className="savings-account">
                    <span className="account-name">{account}</span>
                  </div>
                  <div className="savings-amounts">
                    <div className="monthly-saving">
                      <span className="amount-label">Monthly:</span>
                      <span className="amount">{formatCurrency(monthlyAmount)}</span>
                    </div>
                    <div className="annual-total">
                      <span className="amount-label">Annual:</span>
                      <span className="amount">{formatCurrency(monthlyAmount * 12)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Total Summary */}
      <Card title="Annual Summary" className="total-summary-card">
        <div className="total-summary">
          <div className="total-item highlight">
            <span className="total-label">Total Annual Expenses:</span>
            <span className="total-amount expense">
              {formatCurrency(totalAnnualExpenses)}/yr
            </span>
          </div>
          
          <div className="total-item">
            <span className="total-label">Monthly Budget Impact:</span>
            <span className="total-amount warning">
              {formatCurrency(monthlyImpact)}/mo
            </span>
          </div>
          
          <div className="total-item">
            <span className="total-label">Tracked Categories:</span>
            <span className="total-value">
              {Object.keys(annualData).length}
            </span>
          </div>
          
          <div className="total-item">
            <span className="total-label">Total Expenses:</span>
            <span className="total-value">
              {Object.values(annualData).flat().length}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnnualExpensesPage;