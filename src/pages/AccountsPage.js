// src/pages/AccountsPage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { sanitizeInput } from '../utils/validators';
import './AccountsPage.css'; // Import the CSS file

const AccountsPage = () => {
  const { state, actions, formatCurrency } = useBudget();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    bank: '', 
    accountNumber: '', 
    transitNumber: '', 
    branchNumber: '', 
    currentBalance: '' 
  });

  const accounts = Array.isArray(state.data.accounts) ? state.data.accounts : [];

  // Updated setField function - removed sanitizeInput from name and bank to allow spaces
  const setField = (k, v) => setForm(prev => ({ 
    ...prev, 
    [k]: v // Allow spaces in all fields, including name and bank
  }));

  const reset = () => { 
    setForm({ 
      name: '', 
      bank: '', 
      accountNumber: '', 
      transitNumber: '', 
      branchNumber: '', 
      currentBalance: '' 
    }); 
    setEditingId(null); 
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { 
      alert('Account name is required'); 
      return; 
    }
    
    const data = { 
      ...form, 
      name: form.name.trim(), 
      bank: form.bank.trim(), 
      currentBalance: parseFloat(form.currentBalance) || 0, 
      id: editingId || `account-${Date.now()}` 
    };
    
    if (editingId) {
      // Update existing account
      actions.updateAccount(data);
    } else {
      // Add new account
      actions.addAccount(data);
    }
    
    reset();
  };

  const editAccount = (acc) => {
    setEditingId(acc.id);
    setForm({
      name: acc.name || '',
      bank: acc.bank || '',
      accountNumber: acc.accountNumber || '',
      transitNumber: acc.transitNumber || '',
      branchNumber: acc.branchNumber || '',
      currentBalance: String(acc.currentBalance ?? '')
    });
  };

  const deleteAccount = (accountId) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      actions.removeAccount(accountId);
    }
  };

  const total = accounts.reduce((s, a) => s + (parseFloat(a.currentBalance) || 0), 0);

  return (
    <div className="accounts-page">
      <div className="accounts-header">
        <h1 className="accounts-title">🏦 Accounts</h1>
        <p className="accounts-description">
          Central place to add and edit accounts used throughout the app.
        </p>
      </div>

      <form onSubmit={save} className="account-form">
        <div className="form-grid">
          <input 
            className="form-input"
            placeholder="Account Name *" 
            value={form.name} 
            onChange={e => setField('name', e.target.value)} 
          />
          <input 
            className="form-input"
            placeholder="Bank" 
            value={form.bank} 
            onChange={e => setField('bank', e.target.value)} 
          />
          <input 
            className="form-input"
            placeholder="Account Number" 
            value={form.accountNumber} 
            onChange={e => setField('accountNumber', e.target.value)} 
          />
          <input 
            className="form-input"
            placeholder="Transit Number" 
            value={form.transitNumber} 
            onChange={e => setField('transitNumber', e.target.value)} 
          />
          <input 
            className="form-input"
            placeholder="Branch Number" 
            value={form.branchNumber} 
            onChange={e => setField('branchNumber', e.target.value)} 
          />
          <input 
            className="form-input"
            placeholder="Current Balance" 
            type="number"
            step="0.01"
            value={form.currentBalance} 
            onChange={e => setField('currentBalance', e.target.value)} 
          />
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={reset} className="btn btn-reset">
            Reset
          </button>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Update Account' : 'Save Account'}
          </button>
        </div>
      </form>

      <div className="accounts-list">
        {accounts.map(acc => (
          <div key={acc.id} className="account-card">
            <div className="account-info">
              <h3 className="account-name">{acc.name}</h3>
              <p className="account-bank">{acc.bank || '—'}</p>
            </div>
            
            <div className="account-detail">
              <span className="account-detail-label">Balance</span>
              <span className="account-detail-value account-balance">
                {formatCurrency(parseFloat(acc.currentBalance) || 0)}
              </span>
            </div>
            
            <div className="account-detail">
              <span className="account-detail-label">Account ID</span>
              <span className="account-detail-value account-id">
                {acc.id}
              </span>
            </div>
            
            <div className="account-actions">
              <button 
                onClick={() => editAccount(acc)}
                className="btn btn-edit"
              >
                Edit
              </button>
              <button 
                onClick={() => deleteAccount(acc.id)}
                className="btn btn-delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {accounts.length === 0 && (
          <div className="empty-state">
            No accounts yet. Add one using the form above.
          </div>
        )}
      </div>

      <div className="total-balance">
        <p className="total-balance-label">Total Balance</p>
        <p className="total-balance-amount">{formatCurrency(total)}</p>
      </div>
    </div>
  );
};

export default AccountsPage;