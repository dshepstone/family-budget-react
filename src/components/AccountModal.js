// src/components/AccountModal.js
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { sanitizeInput } from '../utils/validators';

const AccountModal = ({ isOpen, onClose, onAccountCreated }) => {
  const { state, actions } = useBudget();
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    accountNumber: '',
    transitNumber: '',
    branchNumber: '',
    currentBalance: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ name:'', bank:'', accountNumber:'', transitNumber:'', branchNumber:'', currentBalance:'' });
    }
  }, [isOpen]);

  const setField = (k, v) => setFormData(p => ({ ...p, [k]: (k==='name'||k==='bank') ? sanitizeInput(v) : v }));

  const save = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Please enter an account name.'); return; }
    const accounts = Array.isArray(state.data.accounts) ? state.data.accounts : [];
    const newAccount = {
      ...formData,
      name: formData.name.trim(),
      bank: formData.bank.trim(),
      currentBalance: parseFloat(formData.currentBalance) || 0,
      id: `account-${Date.now()}`
    };
    actions.updateAccounts([...accounts, newAccount]);
    if (onAccountCreated) onAccountCreated(newAccount);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="account-modal">
        <style jsx>{`
          .account-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
          .account-modal { background:#fff; border-radius:16px; padding:24px; width:100%; max-width:600px; max-height:90vh; overflow:auto; box-shadow:0 20px 60px rgba(0,0,0,.3); }
          .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
          .input { padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; }
          .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
          .btn { padding:10px 16px; border-radius:8px; border:1px solid #d1d5db; background:#f9fafb; cursor:pointer; }
          .btn.primary { background:#10b981; color:#fff; border-color:#10b981; }
        `}</style>
        <h2 style={{marginTop:0}}>🏦 Add New Account</h2>
        <form onSubmit={save}>
          <div className="grid">
            <input className="input" placeholder="Account Name *" value={formData.name} onChange={e=>setField('name', e.target.value)} required />
            <input className="input" placeholder="Bank" value={formData.bank} onChange={e=>setField('bank', e.target.value)} />
            <input className="input" placeholder="Account #" value={formData.accountNumber} onChange={e=>setField('accountNumber', e.target.value)} />
            <input className="input" placeholder="Transit #" value={formData.transitNumber} onChange={e=>setField('transitNumber', e.target.value)} />
            <input className="input" placeholder="Branch #" value={formData.branchNumber} onChange={e=>setField('branchNumber', e.target.value)} />
            <input className="input" placeholder="Current Balance" value={formData.currentBalance} onChange={e=>setField('currentBalance', e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Save Account</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
