// src/components/NotificationCenter.js
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { DUE_DATE_THRESHOLDS } from '../utils/constants';
import { formatRelativeDate } from '../utils/formatters';

const NotificationCenter = () => {
  const { state, calculations, formatCurrency } = useBudget();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  useEffect(() => {
    generateNotifications();
  }, [state.data]);

  const generateNotifications = () => {
    const newNotifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for upcoming expenses
    const upcomingExpenses = calculations.getUpcomingExpenses();
    upcomingExpenses.forEach(expense => {
      if (expense.daysUntil <= DUE_DATE_THRESHOLDS.DUE_SOON) {
        newNotifications.push({
          id: `upcoming-${expense.name}-${expense.daysUntil}`,
          type: expense.daysUntil <= DUE_DATE_THRESHOLDS.OVERDUE ? 'error' : 'warning',
          title: expense.daysUntil <= 0 ? 'Overdue Expense' : 'Upcoming Expense',
          message: `${expense.name} (${formatCurrency(expense.actual || expense.amount)}) ${
            expense.daysUntil <= 0 ? 'was due' : 'is due'
          } ${formatRelativeDate(expense.date)}`,
          action: {
            label: 'View Details',
            callback: () => {
              // Navigate to appropriate page
              if (expense.type === 'monthly') {
                // Navigate to monthly expenses
              } else {
                // Navigate to annual expenses
              }
            }
          },
          priority: expense.daysUntil <= 0 ? 'high' : 'medium',
          timestamp: new Date()
        });
      }
    });

    // Check for budget health issues
    const netMonthlyIncome = calculations.getNetMonthlyIncome();
    if (netMonthlyIncome < 0) {
      newNotifications.push({
        id: 'budget-deficit',
        type: 'error',
        title: 'Budget Deficit Alert',
        message: `Your monthly expenses exceed income by ${formatCurrency(Math.abs(netMonthlyIncome))}`,
        action: {
          label: 'Review Budget',
          callback: () => {
            // Navigate to home page
          }
        },
        priority: 'high',
        timestamp: new Date()
      });
    }

    // Check for low savings rate
    const savingsRate = calculations.getSavingsRate();
    if (savingsRate < 10 && netMonthlyIncome >= 0) {
      newNotifications.push({
        id: 'low-savings-rate',
        type: 'warning',
        title: 'Low Savings Rate',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Consider aiming for 10-20%.`,
        action: {
          label: 'Optimize Budget',
          callback: () => {
            // Navigate to monthly expenses
          }
        },
        priority: 'low',
        timestamp: new Date()
      });
    }

    // Check for data backup recommendations
    const lastBackup = localStorage.getItem('family-budget-last-backup');
    const backupDate = lastBackup ? new Date(lastBackup) : null;
    const daysSinceBackup = backupDate ? 
      Math.floor((today - backupDate) / (1000 * 60 * 60 * 24)) : 999;

    if (daysSinceBackup > 30) {
      newNotifications.push({
        id: 'backup-reminder',
        type: 'info',
        title: 'Backup Reminder',
        message: lastBackup ? 
          `Last backup was ${daysSinceBackup} days ago. Consider creating a new backup.` :
          'No recent backup found. Consider exporting your data for safekeeping.',
        action: {
          label: 'Create Backup',
          callback: () => {
            // Navigate to import/export page
          }
        },
        priority: 'low',
        timestamp: new Date()
      });
    }

    // Check for large unexplained variances
    const totalIncome = calculations.getTotalIncome();
    const totalExpenses = calculations.getTotalMonthlyExpenses() + calculations.getMonthlyAnnualImpact();
    const variance = Math.abs(totalIncome - totalExpenses);
    
    if (variance > totalIncome * 0.1 && totalIncome > 0) { // 10% variance threshold
      newNotifications.push({
        id: 'budget-variance',
        type: 'warning',
        title: 'Budget Variance Alert',
        message: `Large variance detected between income and expenses (${formatCurrency(variance)})`,
        action: {
          label: 'Review Numbers',
          callback: () => {
            // Navigate to home page
          }
        },
        priority: 'medium',
        timestamp: new Date()
      });
    }

    // Filter out dismissed notifications
    const activeNotifications = newNotifications.filter(
      notification => !dismissedNotifications.has(notification.id)
    );

    setNotifications(activeNotifications);
  };

  const dismissNotification = (notificationId) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const dismissAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setDismissedNotifications(prev => new Set([...prev, ...allIds]));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'var(--danger)';
      case 'medium':
        return 'var(--warning)';
      case 'low':
        return 'var(--info)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const activeNotifications = notifications.filter(
    notification => !dismissedNotifications.has(notification.id)
  );

  const highPriorityCount = activeNotifications.filter(n => n.priority === 'high').length;

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Badge */}
      <div className="notification-badge-container">
        <button
          className={`notification-badge ${highPriorityCount > 0 ? 'urgent' : ''}`}
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <span className="badge-icon">🔔</span>
          {activeNotifications.length > 0 && (
            <span className="badge-count">{activeNotifications.length}</span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="notification-panel">
          <Card
            title="🔔 Notifications"
            className="notification-card"
            headerActions={
              <div className="notification-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissAllNotifications}
                >
                  Dismiss All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  ✕
                </Button>
              </div>
            }
          >
            <div className="notifications-list">
              {activeNotifications.length === 0 ? (
                <div className="no-notifications">
                  <span className="no-notifications-icon">✅</span>
                  <span className="no-notifications-text">All caught up!</span>
                </div>
              ) : (
                activeNotifications
                  .sort((a, b) => {
                    // Sort by priority first, then by timestamp
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                    if (priorityDiff !== 0) return priorityDiff;
                    return new Date(b.timestamp) - new Date(a.timestamp);
                  })
                  .map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.type} priority-${notification.priority}`}
                    >
                      <div className="notification-content">
                        <div className="notification-header">
                          <span className="notification-icon">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <span className="notification-title">
                            {notification.title}
                          </span>
                          <div
                            className="priority-indicator"
                            style={{ backgroundColor: getPriorityColor(notification.priority) }}
                          />
                        </div>
                        
                        <div className="notification-message">
                          {notification.message}
                        </div>
                        
                        <div className="notification-footer">
                          <div className="notification-timestamp">
                            {notification.timestamp.toLocaleTimeString()}
                          </div>
                          
                          <div className="notification-buttons">
                            {notification.action && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  notification.action.callback();
                                  dismissNotification(notification.id);
                                }}
                              >
                                {notification.action.label}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => dismissNotification(notification.id)}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Notification Panel Backdrop */}
      {showNotifications && (
        <div
          className="notification-backdrop"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  );
};

export default NotificationCenter;