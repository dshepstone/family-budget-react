// src/components/UpcomingExpenses.js
import React from 'react';
import { useBudget } from '../context/BudgetContext';
import Button from './ui/Button';
import { formatRelativeDate } from '../utils/formatters';

const UpcomingExpenses = ({ expenses = [], maxDisplay = 5 }) => {
  const { formatCurrency } = useBudget();

  if (!expenses || expenses.length === 0) {
    return (
      <div className="upcoming-expenses empty">
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <h4>All Caught Up!</h4>
          <p>No upcoming expenses in the next 30 days.</p>
        </div>
      </div>
    );
  }

  const prioritizedExpenses = expenses
    .sort((a, b) => {
      // Sort by urgency: overdue first, then by days until due
      if (a.daysUntil < 0 && b.daysUntil >= 0) return -1;
      if (b.daysUntil < 0 && a.daysUntil >= 0) return 1;
      return a.daysUntil - b.daysUntil;
    })
    .slice(0, maxDisplay);

  const getUrgencyLevel = (daysUntil) => {
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'urgent';
    if (daysUntil <= 7) return 'soon';
    return 'upcoming';
  };

  const getUrgencyIcon = (daysUntil) => {
    if (daysUntil < 0) return '🚨';
    if (daysUntil <= 3) return '⚠️';
    if (daysUntil <= 7) return '📅';
    return '📋';
  };

  const getTimingText = (daysUntil) => {
    if (daysUntil < 0) {
      const daysOverdue = Math.abs(daysUntil);
      return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
    }
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  const markAsPaid = (expense) => {
    // This would need to be connected to the appropriate update action
    // For now, just show an alert
    alert(`Mark "${expense.name}" as paid? This feature would update the expense status.`);
  };

  const viewExpense = (expense) => {
    // Navigate to the appropriate page based on expense type
    alert(`Navigate to ${expense.type === 'monthly' ? 'Monthly' : 'Annual'} Expenses page to edit "${expense.name}"`);
  };

  return (
    <div className="upcoming-expenses">
      <div className="expenses-list">
        {prioritizedExpenses.map((expense, index) => {
          const urgencyLevel = getUrgencyLevel(expense.daysUntil);
          const urgencyIcon = getUrgencyIcon(expense.daysUntil);
          const timingText = getTimingText(expense.daysUntil);

          return (
            <div key={`${expense.name}-${index}`} className={`expense-item ${urgencyLevel}`}>
              <div className="expense-content">
                <div className="expense-header">
                  <div className="expense-info">
                    <span className="urgency-icon">{urgencyIcon}</span>
                    <div className="expense-details">
                      <div className="expense-name">{expense.name}</div>
                      <div className="expense-metadata">
                        <span className="expense-type">
                          {expense.type === 'monthly' ? 'Monthly' : 'Annual'}
                        </span>
                        {expense.account && (
                          <span className="expense-account">• {expense.account}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="expense-amount">
                    {formatCurrency(expense.actual || expense.amount || 0)}
                  </div>
                </div>

                <div className="expense-footer">
                  <div className="timing-info">
                    <span className={`timing-text ${urgencyLevel}`}>
                      {timingText}
                    </span>
                    {expense.date && (
                      <span className="due-date">
                        ({formatRelativeDate(expense.date)})
                      </span>
                    )}
                  </div>

                  <div className="expense-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsPaid(expense)}
                    >
                      Mark Paid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewExpense(expense)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress bar for urgency */}
              <div className="urgency-bar">
                <div 
                  className={`urgency-fill ${urgencyLevel}`}
                  style={{
                    width: expense.daysUntil < 0 ? '100%' : 
                           expense.daysUntil <= 3 ? '90%' :
                           expense.daysUntil <= 7 ? '60%' : '30%'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      {expenses.length > maxDisplay && (
        <div className="expenses-footer">
          <div className="more-expenses">
            <span>+{expenses.length - maxDisplay} more upcoming expenses</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Navigate to full expenses view')}
          >
            View All
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="expenses-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value overdue">
              {expenses.filter(e => e.daysUntil < 0).length}
            </span>
            <span className="stat-label">Overdue</span>
          </div>
          <div className="stat-item">
            <span className="stat-value urgent">
              {expenses.filter(e => e.daysUntil >= 0 && e.daysUntil <= 3).length}
            </span>
            <span className="stat-label">This Week</span>
          </div>
          <div className="stat-item">
            <span className="stat-value total">
              {formatCurrency(expenses.reduce((total, expense) => 
                total + parseFloat(expense.actual || expense.amount || 0), 0))}
            </span>
            <span className="stat-label">Total Due</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingExpenses;