// src/components/ExpenseItem.js
import React, { useState, useCallback } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { DEFAULT_ACCOUNTS, PAYMENT_STATUS, TRANSFER_STATUS } from '../utils/constants';
import { validateExpenseItem, sanitizeExpenseName } from '../utils/validators';
import { formatCurrencyInput, parseAmount } from '../utils/formatters';
import { useBudget } from '../context/BudgetContext';

const ExpenseItem = ({ expense, onUpdate, onDelete, type = 'monthly' }) => {
  const { formatCurrency } = useBudget();
  const [isEditing, setIsEditing] = useState(!expense.name); // Edit mode if no name
  const [formData, setFormData] = useState({
    name: expense.name || '',
    amount: expense.amount?.toString() || '0',
    actual: expense.actual?.toString() || expense.amount?.toString() || '0',
    account: expense.account || DEFAULT_ACCOUNTS[0],
    date: expense.date || '',
    paid: expense.paid || false,
    transferStatus: expense.transferStatus || 'none',
    frequency: expense.frequency || 'monthly',
    notes: expense.notes || ''
  });

  const handleInputChange = useCallback((field, value) => {
    let processedValue = value;
    
    // Sanitize name input
    if (field === 'name') {
      processedValue = sanitizeExpenseName(value);
    }
    
    // Format currency inputs
    if (field === 'amount' || field === 'actual') {
      // Allow empty values during editing
      if (value === '') {
        processedValue = '';
      } else {
        const numericValue = parseAmount(value);
        processedValue = numericValue.toString();
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const updatedExpense = {
      ...expense,
      ...formData,
      amount: parseAmount(formData.amount),
      actual: parseAmount(formData.actual),
      name: formData.name.trim()
    };

    if (!validateExpenseItem(updatedExpense)) {
      alert('Please fill in all required fields with valid data.');
      return;
    }

    onUpdate(updatedExpense);
    setIsEditing(false);
  }, [expense, formData, onUpdate]);

  const handleCancel = useCallback(() => {
    if (!expense.name) {
      // If this is a new item without a name, delete it
      onDelete();
    } else {
      // Reset form data
      setFormData({
        name: expense.name || '',
        amount: expense.amount?.toString() || '0',
        actual: expense.actual?.toString() || expense.amount?.toString() || '0',
        account: expense.account || DEFAULT_ACCOUNTS[0],
        date: expense.date || '',
        paid: expense.paid || false,
        transferStatus: expense.transferStatus || 'none',
        frequency: expense.frequency || 'monthly',
        notes: expense.notes || ''
      });
      setIsEditing(false);
    }
  }, [expense, onDelete]);

  const handleQuickTogglePaid = useCallback(() => {
    const updatedExpense = {
      ...expense,
      paid: !expense.paid
    };
    onUpdate(updatedExpense);
  }, [expense, onUpdate]);

  const currentAmount = parseAmount(formData.actual || formData.amount);
  const statusColor = expense.paid ? 'success' : 'warning';

  if (isEditing) {
    return (
      <div className="expense-item editing">
        <div className="expense-form">
          <div className="form-row">
            <div className="form-group">
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Expense name"
                className="expense-name-input"
              />
            </div>

            <div className="form-group">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="Budgeted amount"
                className="amount-input"
              />
            </div>

            <div className="form-group">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.actual}
                onChange={(e) => handleInputChange('actual', e.target.value)}
                placeholder="Actual amount"
                className="actual-input"
              />
            </div>

            <div className="form-group">
              <select
                value={formData.account}
                onChange={(e) => handleInputChange('account', e.target.value)}
                className="account-select"
              >
                {DEFAULT_ACCOUNTS.map(account => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="date-input"
              />
            </div>

            {type === 'annual' && (
              <div className="form-group">
                <select
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  className="frequency-select"
                >
                  <option value="annual">Annual</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.paid}
                  onChange={(e) => handleInputChange('paid', e.target.checked)}
                />
                <span>Paid</span>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <select
                value={formData.transferStatus}
                onChange={(e) => handleInputChange('transferStatus', e.target.value)}
                className="transfer-select"
              >
                {TRANSFER_STATUS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <Input
                type="text"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notes (optional)"
                className="notes-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`expense-item ${expense.paid ? 'paid' : 'unpaid'}`}>
      <div className="expense-content">
        <div className="expense-main">
          <div className="expense-name">
            <span className="name-text">{expense.name}</span>
            {expense.notes && (
              <span className="notes-indicator" title={expense.notes}>
                📝
              </span>
            )}
          </div>

          <div className="expense-amounts">
            <div className="amount-group">
              <span className="amount-label">Budgeted:</span>
              <span className="amount budgeted">
                {formatCurrency(expense.amount || 0)}
              </span>
            </div>
            <div className="amount-group">
              <span className="amount-label">Actual:</span>
              <span className="amount actual">
                {formatCurrency(expense.actual || expense.amount || 0)}
              </span>
            </div>
          </div>

          <div className="expense-details">
            <div className="detail-item">
              <span className="detail-label">Account:</span>
              <span className="detail-value">{expense.account || 'Not set'}</span>
            </div>
            {expense.date && (
              <div className="detail-item">
                <span className="detail-label">Due:</span>
                <span className="detail-value">
                  {new Date(expense.date).toLocaleDateString()}
                </span>
              </div>
            )}
            {type === 'annual' && expense.frequency && (
              <div className="detail-item">
                <span className="detail-label">Frequency:</span>
                <span className="detail-value">{expense.frequency}</span>
              </div>
            )}
          </div>

          <div className="expense-status">
            <div className="status-indicators">
              <button
                className={`status-btn ${statusColor}`}
                onClick={handleQuickTogglePaid}
                title={expense.paid ? 'Mark as unpaid' : 'Mark as paid'}
              >
                {expense.paid ? '✓ Paid' : '○ Unpaid'}
              </button>
              
              {expense.transferStatus && expense.transferStatus !== 'none' && (
                <span className={`transfer-status ${expense.transferStatus}`}>
                  {expense.transferStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="expense-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseItem;