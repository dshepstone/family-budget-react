// src/pages/IncomePage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { DEFAULT_ACCOUNTS, FREQUENCY_OPTIONS } from '../utils/constants';
import { validateIncomeItem, sanitizeInput } from '../utils/validators';
import { formatCurrency, parseAmount } from '../utils/formatters';

const IncomePage = () => {
  const { state, actions, formatCurrency: formatCurrencyUtil } = useBudget();
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    account: DEFAULT_ACCOUNTS[0],
    notes: ''
  });

  const incomeData = state.data.income || [];
  const totalIncome = incomeData.reduce((total, income) => total + parseAmount(income.amount), 0);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' || field === 'notes' ? sanitizeInput(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateIncomeItem(formData)) {
      alert('Please fill in all required fields with valid data.');
      return;
    }

    const incomeItem = {
      ...formData,
      amount: parseAmount(formData.amount),
      id: editingIndex !== null ? incomeData[editingIndex].id : Date.now().toString()
    };

    const newIncomeData = [...incomeData];
    
    if (editingIndex !== null) {
      newIncomeData[editingIndex] = incomeItem;
      setEditingIndex(null);
    } else {
      newIncomeData.push(incomeItem);
    }

    actions.updateIncome(newIncomeData);
    resetForm();
  };

  const handleEdit = (index) => {
    const income = incomeData[index];
    setFormData({
      name: income.name || '',
      amount: income.amount?.toString() || '',
      frequency: income.frequency || 'monthly',
      account: income.account || DEFAULT_ACCOUNTS[0],
      notes: income.notes || ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this income source?')) {
      const newIncomeData = incomeData.filter((_, i) => i !== index);
      actions.updateIncome(newIncomeData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      account: DEFAULT_ACCOUNTS[0],
      notes: ''
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportIncomeCSV = () => {
    const headers = ['Source', 'Amount', 'Frequency', 'Account', 'Notes'];
    const csvRows = [headers.join(',')];

    incomeData.forEach(income => {
      const row = [
        income.name || '',
        income.amount || 0,
        income.frequency || 'monthly',
        income.account || '',
        income.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);
      
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">💵 Income Management</h2>
        <p className="page-description">
          Track and manage all your income sources with detailed categorization
        </p>
      </div>

      {/* Page Actions */}
      <div className="page-actions">
        <Button
          variant="success"
          onClick={() => setShowAddForm(true)}
        >
          + Add Income Source
        </Button>
        <Button
          variant="secondary"
          onClick={handlePrint}
        >
          🖨️ Print Income Report
        </Button>
        <Button
          variant="outline"
          onClick={exportIncomeCSV}
        >
          📁 Export CSV
        </Button>
      </div>

      {/* Income Summary */}
      <Card title="Income Summary" className="summary-card">
        <div className="income-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Total Monthly Income</div>
              <div className="stat-value income">
                {formatCurrencyUtil(totalIncome)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Income Sources</div>
              <div className="stat-value">
                {incomeData.length}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Annual Projection</div>
              <div className="stat-value">
                {formatCurrencyUtil(totalIncome * 12)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Add/Edit Income Form */}
      {showAddForm && (
        <Card 
          title={editingIndex !== null ? 'Edit Income Source' : 'Add New Income Source'}
          className="form-card"
        >
          <form onSubmit={handleSubmit} className="income-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="income-name">Income Source Name *</label>
                <Input
                  id="income-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Salary, Freelance, Investment"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="income-amount">Monthly Amount *</label>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="income-frequency">Frequency</label>
                <select
                  id="income-frequency"
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  className="form-select"
                >
                  {FREQUENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="income-account">Account</label>
                <select
                  id="income-account"
                  value={formData.account}
                  onChange={(e) => handleInputChange('account', e.target.value)}
                  className="form-select"
                >
                  {DEFAULT_ACCOUNTS.map(account => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="income-notes">Notes</label>
                <textarea
                  id="income-notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this income source..."
                  rows="3"
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary">
                {editingIndex !== null ? 'Update Income' : 'Add Income'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Income List */}
      <Card title="Income Sources" className="income-list-card">
        {incomeData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No Income Sources</h3>
            <p>Add your first income source to start tracking your budget.</p>
            <Button
              variant="primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Income Source
            </Button>
          </div>
        ) : (
          <div className="income-table-container">
            <table className="income-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Account</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.map((income, index) => (
                  <tr key={income.id || index}>
                    <td className="source-name">
                      <div className="source-info">
                        <span className="name">{income.name}</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      <span className="amount income">
                        {formatCurrencyUtil(income.amount)}
                      </span>
                    </td>
                    <td className="frequency-cell">
                      <span className="frequency-badge">
                        {income.frequency || 'monthly'}
                      </span>
                    </td>
                    <td className="account-cell">
                      {income.account || 'Not specified'}
                    </td>
                    <td className="notes-cell">
                      <span className="notes" title={income.notes}>
                        {income.notes ? 
                          (income.notes.length > 50 ? 
                            income.notes.substring(0, 50) + '...' : 
                            income.notes
                          ) : 
                          '-'
                        }
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Total Monthly Income</strong></td>
                  <td className="total-amount">
                    <strong>{formatCurrencyUtil(totalIncome)}</strong>
                  </td>
                  <td colSpan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IncomePage;