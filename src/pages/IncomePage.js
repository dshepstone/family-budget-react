// src/pages/IncomePage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { DEFAULT_ACCOUNTS } from '../utils/constants';
import { validateIncomeItem, sanitizeInput } from '../utils/validators';
import { parseAmount } from '../utils/formatters';

// Enhanced frequency options with weekly and bi-weekly
const ENHANCED_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-time', label: 'One-time' }
];

const IncomePage = () => {
  const { state, actions, formatCurrency: formatCurrencyUtil } = useBudget();
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, sources, analytics
  const [formData, setFormData] = useState({
    name: '',
    projectedAmount: '',
    actualAmount: '',
    frequency: 'monthly',
    account: DEFAULT_ACCOUNTS[0],
    notes: '',
    weeks: Array(5).fill(0),
    actualWeeks: Array(5).fill(0)
  });

  // Convert frequency to monthly multiplier for calculations
  const getMonthlyMultiplier = (frequency) => {
    const multipliers = {
      'weekly': 52 / 12,
      'bi-weekly': 26 / 12,
      'monthly': 1,
      'quarterly': 1 / 3,
      'semi-annual': 1 / 6,
      'annual': 1 / 12,
      'one-time': 0
    };
    return multipliers[frequency] || 1;
  };

  const incomeData = (state.data.income || []).map(income => {
    const weeks = Array.isArray(income.weeks) ? income.weeks : Array(5).fill(0);
    const actualWeeks = Array.isArray(income.actualWeeks) ? income.actualWeeks : Array(5).fill(0);

    const projectedAmount = income.projectedAmount !== undefined
      ? parseAmount(income.projectedAmount)
      : parseAmount(income.amount) || weeks.reduce((sum, week) => sum + parseAmount(week), 0);

    const actualAmount = income.actualAmount !== undefined
      ? parseAmount(income.actualAmount)
      : actualWeeks.reduce((sum, week) => sum + parseAmount(week), 0);

    return {
      ...income,
      name: income.name || income.source || '',
      projectedAmount,
      actualAmount,
      weeks,
      actualWeeks,
      frequency: income.frequency || 'monthly',
      account: income.account || DEFAULT_ACCOUNTS[0],
      notes: income.notes || ''
    };
  });

  // Calculate monthly equivalents
  const totalProjectedIncome = incomeData.reduce((total, income) => {
    const monthlyAmount = income.projectedAmount * getMonthlyMultiplier(income.frequency);
    return total + monthlyAmount;
  }, 0);

  const totalActualIncome = incomeData.reduce((total, income) => {
    const monthlyAmount = income.actualAmount * getMonthlyMultiplier(income.frequency);
    return total + monthlyAmount;
  }, 0);

  const incomeVariance = totalActualIncome - totalProjectedIncome;
  const variancePercentage = totalProjectedIncome > 0 ? (incomeVariance / totalProjectedIncome) * 100 : 0;

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

    const projectedAmount = parseAmount(formData.projectedAmount);
    const actualAmount = parseAmount(formData.actualAmount);
    const weeks = Array(5).fill(projectedAmount / 5);
    const actualWeeks = Array(5).fill(actualAmount / 5);

    const incomeItem = {
      ...formData,
      projectedAmount,
      actualAmount,
      amount: projectedAmount, // Maintain backward compatibility
      weeks,
      actualWeeks,
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
      projectedAmount: income.projectedAmount?.toString() || '',
      actualAmount: income.actualAmount?.toString() || '',
      frequency: income.frequency || 'monthly',
      account: income.account || DEFAULT_ACCOUNTS[0],
      notes: income.notes || '',
      weeks: income.weeks || Array(5).fill(0),
      actualWeeks: income.actualWeeks || Array(5).fill(0)
    });
    setEditingIndex(index);
    setShowAddForm(true);
    setActiveTab('sources');

    // Scroll to form after a brief delay to allow tab change to complete
    setTimeout(() => {
      const formElement = document.querySelector('.income-form');
      if (formElement) {
        formElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
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
      projectedAmount: '',
      actualAmount: '',
      frequency: 'monthly',
      account: DEFAULT_ACCOUNTS[0],
      notes: '',
      weeks: Array(5).fill(0),
      actualWeeks: Array(5).fill(0)
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportIncomeCSV = () => {
    const headers = ['Source', 'Projected Amount', 'Actual Amount', 'Variance', 'Frequency', 'Account', 'Notes'];
    const csvRows = [headers.join(',')];

    incomeData.forEach(income => {
      const variance = income.actualAmount - income.projectedAmount;
      const row = [
        income.name || '',
        income.projectedAmount || 0,
        income.actualAmount || 0,
        variance,
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
    a.download = `income-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      className={`tab-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="income-page">
      <style jsx>{`
        .income-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .page-header {
          text-align: center;
          margin-bottom: 32px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 48px 32px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          position: relative;
        }

        .page-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          pointer-events: none;
        }

        .page-title {
          font-size: 2.5rem;
          margin: 0 0 8px 0;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }

        .page-description {
          font-size: 1.125rem;
          margin: 0;
          opacity: 1;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }

        .tabs-container {
          margin-bottom: 32px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .tabs-header {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .tab-button {
          flex: 1;
          padding: 16px 24px;
          border: none;
          background: none;
          font-size: 0.95rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          text-align: center;
        }

        .tab-button:hover {
          color: #4f46e5;
          background: rgba(79, 70, 229, 0.08);
        }

        .tab-button.active {
          color: #4f46e5;
          background: white;
          font-weight: 600;
        }

        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
        }

        .tab-content {
          padding: 32px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .summary-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          text-align: center;
          position: relative;
          overflow: hidden;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        .summary-card.projected::before {
          background: linear-gradient(90deg, #10b981, #34d399);
        }

        .summary-card.actual::before {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        .summary-card.variance::before {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }

        .summary-card.variance.negative::before {
          background: linear-gradient(90deg, #ef4444, #f87171);
        }

        .card-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .card-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }

        .card-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          word-break: break-all;
          line-height: 1.1;
        }

        .card-subtext {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.2;
        }

        .variance-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 16px;
          margin-top: 8px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .variance-indicator.positive {
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .variance-indicator.negative {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .page-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .action-button.primary {
          background: #4f46e5;
          color: white;
        }

        .action-button.primary:hover {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
        }

        .action-button.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .action-button.secondary:hover {
          background: #e5e7eb;
        }

        .income-form {
          background: white;
          padding: 32px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 32px;
        }

        .form-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .form-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .editing-indicator {
          font-size: 1.25rem;
        }

        .form-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          font-style: italic;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 0.875rem;
          display: block;
        }

        .form-input, .form-select, .form-textarea {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .projected-actual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .income-table-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .income-table {
          width: 100%;
          border-collapse: collapse;
        }

        .income-table th {
          background: #f8fafc;
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .income-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          vertical-align: middle;
        }

        .income-table tbody tr:hover {
          background: #f8fafc;
        }

        .source-name {
          font-weight: 600;
          color: #111827;
          max-width: 150px;
          word-break: break-word;
        }

        .amount-cell {
          font-weight: 600;
          font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
        }

        .amount.projected {
          color: #059669;
        }

        .amount.actual {
          color: #2563eb;
        }

        .variance-cell {
          font-weight: 600;
          font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
        }

        .variance.positive {
          color: #059669;
        }

        .variance.negative {
          color: #dc2626;
        }

        .frequency-badge {
          background: #f3f4f6;
          color: #374151;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 0.875rem;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .btn-small.edit-btn {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-small.edit-btn:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .btn-small.edit-btn.editing {
          background: #fef3c7;
          color: #92400e;
          border-color: #fbbf24;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
        }

        .btn-small.edit-btn.editing:hover {
          background: #fde68a;
          color: #78350f;
        }

        .btn-small.delete-btn {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-small.delete-btn:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        .btn-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .btn-small:disabled:hover {
          background: inherit;
          color: inherit;
          transform: none;
        }

        .empty-state {
          text-align: center;
          padding: 64px 32px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .income-page {
            padding: 16px;
          }

          .page-header {
            padding: 32px 16px;
          }

          .page-title {
            font-size: 2rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .projected-actual-grid {
            grid-template-columns: 1fr;
          }

          .income-table-container {
            overflow-x: auto;
          }

          .income-table {
            min-width: 800px;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">💵 Income Management</h1>
        <p className="page-description">
          Track projected vs actual income with comprehensive analysis
        </p>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <TabButton
            id="overview"
            label="📊 Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <TabButton
            id="sources"
            label="💰 Income Sources"
            active={activeTab === 'sources'}
            onClick={() => setActiveTab('sources')}
          />
          <TabButton
            id="analytics"
            label="📈 Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <>
              <div className="summary-grid">
                <div className="summary-card projected">
                  <div className="card-icon">🎯</div>
                  <div className="card-label">Projected Monthly Income</div>
                  <div className="card-value">{formatCurrencyUtil(totalProjectedIncome)}</div>
                  <div className="card-subtext">Annual: {formatCurrencyUtil(totalProjectedIncome * 12)}</div>
                </div>

                <div className="summary-card actual">
                  <div className="card-icon">💰</div>
                  <div className="card-label">Actual Monthly Income</div>
                  <div className="card-value">{formatCurrencyUtil(totalActualIncome)}</div>
                  <div className="card-subtext">Annual: {formatCurrencyUtil(totalActualIncome * 12)}</div>
                </div>

                <div className={`summary-card variance ${incomeVariance >= 0 ? '' : 'negative'}`}>
                  <div className="card-icon">{incomeVariance >= 0 ? '📈' : '📉'}</div>
                  <div className="card-label">Income Variance</div>
                  <div className="card-value">{formatCurrencyUtil(incomeVariance)}</div>
                  <div className={`variance-indicator ${incomeVariance >= 0 ? 'positive' : 'negative'}`}>
                    {incomeVariance >= 0 ? '↗️' : '↘️'} {variancePercentage.toFixed(1)}%
                  </div>
                </div>

                <div className="summary-card">
                  <div className="card-icon">📋</div>
                  <div className="card-label">Income Sources</div>
                  <div className="card-value">{incomeData.length}</div>
                  <div className="card-subtext">Active sources</div>
                </div>
              </div>

              <div className="page-actions">
                <button className="action-button primary" onClick={() => {
                  setShowAddForm(true);
                  setActiveTab('sources');
                  // Scroll to form after tab change
                  setTimeout(() => {
                    const formElement = document.querySelector('.income-form');
                    if (formElement) {
                      formElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                      });
                    }
                  }, 100);
                }}>
                  <span>+</span> Add Income Source
                </button>
                <button className="action-button secondary" onClick={handlePrint}>
                  <span>🖨️</span> Print Report
                </button>
                <button className="action-button secondary" onClick={exportIncomeCSV}>
                  <span>📁</span> Export CSV
                </button>
              </div>
            </>
          )}

          {activeTab === 'sources' && (
            <>
              {showAddForm && (
                <div className="income-form">
                  <div className="form-header">
                    <h2 className="form-title">
                      {editingIndex !== null ? (
                        <>
                          <span className="editing-indicator">✏️</span>
                          Edit Income Source: {incomeData[editingIndex]?.name || 'Unknown'}
                        </>
                      ) : (
                        'Add New Income Source'
                      )}
                    </h2>
                    {editingIndex !== null && (
                      <p className="form-subtitle">
                        Currently editing row {editingIndex + 1} from the table below
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label" htmlFor="income-name">Income Source Name *</label>
                        <input
                          id="income-name"
                          type="text"
                          className="form-input"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="e.g., Salary, Freelance, Investment"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="income-frequency">Frequency *</label>
                        <select
                          id="income-frequency"
                          className="form-select"
                          value={formData.frequency}
                          onChange={(e) => handleInputChange('frequency', e.target.value)}
                          required
                        >
                          {ENHANCED_FREQUENCY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Projected Amount *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input"
                          value={formData.projectedAmount}
                          onChange={(e) => handleInputChange('projectedAmount', e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Actual Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input"
                          value={formData.actualAmount}
                          onChange={(e) => handleInputChange('actualAmount', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="income-account">Account</label>
                        <select
                          id="income-account"
                          className="form-select"
                          value={formData.account}
                          onChange={(e) => handleInputChange('account', e.target.value)}
                        >
                          {DEFAULT_ACCOUNTS.map(account => (
                            <option key={account} value={account}>
                              {account}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group full-width">
                        <label className="form-label" htmlFor="income-notes">Notes</label>
                        <textarea
                          id="income-notes"
                          className="form-textarea"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Additional notes about this income source..."
                          rows="3"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="action-button primary">
                        {editingIndex !== null ? 'Update Income' : 'Add Income'}
                      </button>
                      <button type="button" className="action-button secondary" onClick={resetForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="income-table-container">
                {incomeData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h3>No Income Sources</h3>
                    <p>Add your first income source to start tracking your budget.</p>
                    <button className="action-button primary" onClick={() => {
                      setShowAddForm(true);
                      setTimeout(() => {
                        const formElement = document.querySelector('.income-form');
                        if (formElement) {
                          formElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                            inline: 'nearest'
                          });
                        }
                      }, 100);
                    }}>
                      Add Income Source
                    </button>
                  </div>
                ) : (
                  <table className="income-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Projected</th>
                        <th>Actual</th>
                        <th>Variance</th>
                        <th>Frequency</th>
                        <th>Account</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeData.map((income, index) => {
                        const variance = income.actualAmount - income.projectedAmount;
                        return (
                          <tr key={income.id || index}>
                            <td className="source-name">{income.name}</td>
                            <td className="amount-cell">
                              <span className="amount projected">
                                {formatCurrencyUtil(income.projectedAmount)}
                              </span>
                            </td>
                            <td className="amount-cell">
                              <span className="amount actual">
                                {formatCurrencyUtil(income.actualAmount)}
                              </span>
                            </td>
                            <td className="variance-cell">
                              <span className={`variance ${variance >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrencyUtil(variance)}
                              </span>
                            </td>
                            <td>
                              <span className="frequency-badge">
                                {income.frequency}
                              </span>
                            </td>
                            <td>{income.account}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className={`btn-small edit-btn ${editingIndex === index ? 'editing' : ''}`}
                                  onClick={() => handleEdit(index)}
                                  disabled={editingIndex !== null && editingIndex !== index}
                                >
                                  {editingIndex === index ? 'Editing...' : 'Edit'}
                                </button>
                                <button
                                  className="btn-small delete-btn"
                                  onClick={() => handleDelete(index)}
                                  disabled={editingIndex !== null}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb' }}>
                        <td><strong>Monthly Totals</strong></td>
                        <td><strong className="amount projected">{formatCurrencyUtil(totalProjectedIncome)}</strong></td>
                        <td><strong className="amount actual">{formatCurrencyUtil(totalActualIncome)}</strong></td>
                        <td><strong className={`variance ${incomeVariance >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrencyUtil(incomeVariance)}
                        </strong></td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <div style={{ textAlign: 'center', padding: '64px 32px', color: '#6b7280' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📊</div>
              <h3>Analytics Coming Soon</h3>
              <p>Detailed income analytics and trends will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomePage;