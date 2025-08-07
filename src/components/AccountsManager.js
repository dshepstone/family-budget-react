// src/components/AccountsManager.js - Using your existing CSS system
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

const AccountsManager = () => {
    const { state, actions, formatCurrency } = useBudget();
    const [editingAccount, setEditingAccount] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        bank: '',
        transitNumber: '',
        branchNumber: '',
        accountNumber: '',
        currentBalance: ''
    });

    const accounts = Array.isArray(state.data.accounts) ? state.data.accounts : [];

    // Calculate statistics
    const totalAccounts = accounts.length;
    const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.currentBalance) || 0), 0);
    const activeAccounts = accounts.filter(acc => (parseFloat(acc.currentBalance) || 0) > 0).length;

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        const requiredFields = ['name', 'bank', 'transitNumber', 'branchNumber', 'accountNumber'];
        for (const field of requiredFields) {
            if (!formData[field].trim()) {
                alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                return;
            }
        }

        const accountData = {
            ...formData,
            currentBalance: parseFloat(formData.currentBalance) || 0,
            id: editingAccount?.id || Date.now().toString()
        };

        if (editingAccount) {
            actions.updateAccount(accountData);
        } else {
            actions.addAccount(accountData);
        }

        resetForm();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            bank: '',
            transitNumber: '',
            branchNumber: '',
            accountNumber: '',
            currentBalance: ''
        });
        setEditingAccount(null);
    };

    const handleEdit = (account) => {
        setFormData({
            name: account.name || '',
            bank: account.bank || '',
            transitNumber: account.transitNumber || '',
            branchNumber: account.branchNumber || '',
            accountNumber: account.accountNumber || '',
            currentBalance: account.currentBalance?.toString() || ''
        });
        setEditingAccount(account);
    };

    const handleDelete = (accountId) => {
        if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            actions.removeAccount(accountId);
        }
    };

    const maskAccountNumber = (accountNumber) => {
        if (!accountNumber) return '****';
        const str = accountNumber.toString();
        return str.length > 4 ? `****${str.slice(-4)}` : str;
    };

    return (
        <div className="accounts-manager-container">
            {/* Statistics Overview */}
            <div className="accounts-stats-grid">
                <div className="account-stat-card">
                    <div className="stat-icon stat-icon-primary">
                        💳
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{totalAccounts}</div>
                        <div className="stat-label">Total Accounts</div>
                    </div>
                </div>
                <div className="account-stat-card">
                    <div className="stat-icon stat-icon-success">
                        💰
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{formatCurrency(totalBalance)}</div>
                        <div className="stat-label">Total Balance</div>
                    </div>
                </div>
                <div className="account-stat-card">
                    <div className="stat-icon stat-icon-warning">
                        ✅
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{activeAccounts}</div>
                        <div className="stat-label">Active Accounts</div>
                    </div>
                </div>
            </div>

            {/* Add New Account Section */}
            <div className="add-account-section">
                <div className="add-account-header">
                    <h3 className="add-account-title">
                        <span className="add-account-icon">➕</span>
                        {editingAccount ? 'Edit Account' : 'Add New Account'}
                    </h3>
                    <p className="add-account-subtitle">
                        {editingAccount
                            ? 'Update your account information below'
                            : 'Connect your bank accounts to track expenses and manage transfers'
                        }
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="add-account-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label-white">Account Name</label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="e.g., Primary Checking"
                                required
                                className="input-white"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label-white">Bank Name</label>
                            <Input
                                type="text"
                                value={formData.bank}
                                onChange={(e) => handleInputChange('bank', e.target.value)}
                                placeholder="e.g., TD Bank"
                                required
                                className="input-white"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label-white">Transit Number</label>
                            <Input
                                type="text"
                                value={formData.transitNumber}
                                onChange={(e) => handleInputChange('transitNumber', e.target.value)}
                                placeholder="e.g., 12345"
                                required
                                className="input-white"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label-white">Branch Number</label>
                            <Input
                                type="text"
                                value={formData.branchNumber}
                                onChange={(e) => handleInputChange('branchNumber', e.target.value)}
                                placeholder="e.g., 67890"
                                required
                                className="input-white"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label-white">Account Number</label>
                            <Input
                                type="text"
                                value={formData.accountNumber}
                                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                                placeholder="e.g., 9876543210"
                                required
                                className="input-white"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label-white">Current Balance (Optional)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.currentBalance}
                                onChange={(e) => handleInputChange('currentBalance', e.target.value)}
                                placeholder="0.00"
                                className="input-white"
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        {editingAccount && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={resetForm}
                                className="btn-white-outline"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" variant="primary" className="btn-white">
                            {editingAccount ? 'Update Account' : 'Add Account'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Accounts List */}
            <Card>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">
                            <span className="accounts-list-icon">🏢</span>
                            Your Accounts
                        </h3>
                        <p className="card-subtitle">
                            Manage your connected bank accounts and view balances
                        </p>
                    </div>
                </div>
                <div className="card-content">
                    {accounts.length === 0 ? (
                        <div className="accounts-empty-state">
                            <div className="empty-state-icon">💳</div>
                            <h4 className="empty-state-title">No accounts added yet</h4>
                            <p className="empty-state-text">Add your first bank account to get started with expense tracking.</p>
                        </div>
                    ) : (
                        <div className="accounts-list">
                            {accounts.map((account) => (
                                <div key={account.id} className="account-item">
                                    <div className="account-header">
                                        <div className="account-info">
                                            <div className="account-name">
                                                <span className="account-icon">💳</span>
                                                {account.name}
                                            </div>
                                            <div className="account-bank">{account.bank} - Banking Account</div>
                                        </div>
                                        <div className="account-actions">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleEdit(account)}
                                                className="account-btn-edit"
                                            >
                                                ✏️ Edit
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDelete(account.id)}
                                                className="account-btn-delete"
                                            >
                                                🗑️ Delete
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="account-details-grid">
                                        <div className="account-detail">
                                            <div className="detail-label">Transit</div>
                                            <div className="detail-value">{account.transitNumber}</div>
                                        </div>
                                        <div className="account-detail">
                                            <div className="detail-label">Branch</div>
                                            <div className="detail-value">{account.branchNumber}</div>
                                        </div>
                                        <div className="account-detail">
                                            <div className="detail-label">Account</div>
                                            <div className="detail-value">{maskAccountNumber(account.accountNumber)}</div>
                                        </div>
                                        <div className="account-detail">
                                            <div className="detail-label">Type</div>
                                            <div className="detail-value">Banking</div>
                                        </div>
                                    </div>

                                    {account.currentBalance !== undefined && (
                                        <div className="account-balance">
                                            <span className="balance-label">Current Balance</span>
                                            <span className="balance-amount">
                                                {formatCurrency(parseFloat(account.currentBalance) || 0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AccountsManager;