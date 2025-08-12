// src/components/UpcomingExpenses.js - Enhanced with Modern Styling
import React from 'react';
import { useBudget } from '../context/BudgetContext';
import Button from './ui/Button';
import { formatRelativeDate } from '../utils/formatters';

const UpcomingExpenses = ({ expenses = [], maxDisplay = 5 }) => {
  const { formatCurrency, state } = useBudget();

  if (!expenses || expenses.length === 0) {
    return (
      <>
        <style jsx>{`
          .upcoming-expenses.empty {
            padding: 2rem 1rem;
            text-align: center;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-radius: 12px;
            border: 1px solid #bbf7d0;
          }

          .empty-state .empty-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
          }

          .empty-state h4 {
            color: #166534;
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
          }

          .empty-state p {
            color: #15803d;
            margin: 0;
            font-size: 0.875rem;
          }
        `}</style>
        
        <div className="upcoming-expenses empty">
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <h4>All Caught Up!</h4>
            <p>No upcoming expenses in the next 30 days.</p>
          </div>
        </div>
      </>
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
    alert(`Mark "${expense.name}" as paid? This feature would update the expense status.`);
  };

  const viewExpense = (expense) => {
    // Navigate to the appropriate page based on expense type
    alert(`Navigate to ${expense.type === 'monthly' ? 'Monthly' : 'Annual'} Expenses page to edit "${expense.name}"`);
  };

  return (
    <>
      <style jsx>{`
        .upcoming-expenses {
          background: var(--bg-primary, #ffffff);
          border-radius: 12px;
          overflow: hidden;
        }

        .expenses-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .expense-item {
          background: var(--bg-primary, #ffffff);
          border-bottom: 1px solid var(--border-light, #f1f5f9);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .expense-item:last-child {
          border-bottom: none;
        }

        .expense-item:hover {
          background: var(--bg-secondary, #f8fafc);
          transform: translateX(2px);
        }

        .expense-item.overdue {
          border-left: 4px solid #dc2626;
          background: linear-gradient(90deg, #fef2f2 0%, #ffffff 20%);
        }

        .expense-item.urgent {
          border-left: 4px solid #f59e0b;
          background: linear-gradient(90deg, #fffbeb 0%, #ffffff 20%);
        }

        .expense-item.soon {
          border-left: 4px solid #3b82f6;
          background: linear-gradient(90deg, #eff6ff 0%, #ffffff 20%);
        }

        .expense-item.upcoming {
          border-left: 4px solid #10b981;
          background: linear-gradient(90deg, #f0fdf4 0%, #ffffff 20%);
        }

        .expense-content {
          padding: 1rem;
        }

        .expense-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .expense-info {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          flex: 1;
        }

        .urgency-icon {
          font-size: 1.25rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        .expense-details {
          flex: 1;
          min-width: 0;
        }

        .expense-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary, #111827);
          margin-bottom: 0.25rem;
          line-height: 1.3;
        }

        .expense-metadata {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.5rem;
        }

        .expense-type {
          background: var(--bg-tertiary, #f1f5f9);
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary, #4b5563);
        }

        .expense-account {
          font-weight: 500;
        }

        .expense-amount {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary, #111827);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          flex-shrink: 0;
          margin-left: 1rem;
        }

        .expense-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-light, #f1f5f9);
        }

        .timing-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .timing-text {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .timing-text.overdue {
          color: #dc2626;
        }

        .timing-text.urgent {
          color: #f59e0b;
        }

        .timing-text.soon {
          color: #3b82f6;
        }

        .timing-text.upcoming {
          color: #10b981;
        }

        .due-date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .expense-actions {
          display: flex;
          gap: 0.5rem;
        }

        .expense-actions button {
          padding: 0.375rem 0.75rem;
          font-size: 0.8125rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          border: 1px solid var(--border-light, #d1d5db);
          background: var(--bg-primary, #ffffff);
          color: var(--text-secondary, #4b5563);
          cursor: pointer;
          font-weight: 500;
        }

        .expense-actions button:hover {
          background: var(--bg-secondary, #f8fafc);
          border-color: var(--border-medium, #9ca3af);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .expense-actions button:first-child {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
        }

        .expense-actions button:first-child:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
        }

        .urgency-bar {
          height: 3px;
          background: var(--border-light, #f1f5f9);
          position: relative;
          overflow: hidden;
        }

        .urgency-fill {
          height: 100%;
          transition: width 0.3s ease;
          position: absolute;
          left: 0;
          top: 0;
        }

        .urgency-fill.overdue {
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
        }

        .urgency-fill.urgent {
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
        }

        .urgency-fill.soon {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
        }

        .urgency-fill.upcoming {
          background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
        }

        .expenses-footer {
          background: var(--bg-secondary, #f8fafc);
          padding: 1rem;
          border-top: 1px solid var(--border-light, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .more-expenses {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
          font-weight: 500;
        }

        .expenses-footer button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .expenses-footer button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .expenses-stats {
          background: var(--bg-secondary, #f8fafc);
          padding: 1rem;
          border-top: 1px solid var(--border-light, #e5e7eb);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-item {
          text-align: center;
          padding: 0.75rem;
          background: var(--bg-primary, #ffffff);
          border-radius: 8px;
          border: 1px solid var(--border-light, #e5e7eb);
          transition: transform 0.2s ease;
        }

        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .upcoming-expenses .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .upcoming-expenses .stat-value.overdue {
          color: #dc2626;
        }

        .upcoming-expenses .stat-value.urgent {
          color: #f59e0b;
        }

        .upcoming-expenses .stat-value.total {
          color: #3b82f6;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .expense-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .expense-amount {
            margin-left: 0;
            align-self: flex-start;
          }

          .expense-footer {
            flex-direction: column;
            gap: 0.75rem;
            align-items: flex-start;
          }

          .expense-actions {
            align-self: stretch;
          }

          .expense-actions button {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .expenses-footer {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }
        }
      `}</style>

      <div className="upcoming-expenses">
        <div className="expenses-list">
          {prioritizedExpenses.map((expense, index) => {
            const urgencyLevel = getUrgencyLevel(expense.daysUntil);
            const urgencyIcon = getUrgencyIcon(expense.daysUntil);
            const timingText = getTimingText(expense.daysUntil);

            const account = (Array.isArray(state.data.accounts) ? state.data.accounts : []).find(a => a.id === expense.accountId);

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
                          {account && (
                            <span className="expense-account">• {account.name}</span>
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
                      <button onClick={() => markAsPaid(expense)}>
                        Mark Paid
                      </button>
                      <button onClick={() => viewExpense(expense)}>
                        View
                      </button>
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
            <button onClick={() => alert('Navigate to full expenses view')}>
              View All
            </button>
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
    </>
  );
};

export default UpcomingExpenses;