// src/pages/IncomePage.js
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { sanitizeInput } from '../utils/validators';
import { parseAmount } from '../utils/formatters';
import AccountModal from '../components/AccountModal';
import QuickEntrySection from '../components/QuickEntrySection';
import '../styles/incomePage.css';

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

// Special account option values
const ACCOUNT_SPECIAL_VALUES = {
  CREATE_NEW: '__CREATE_NEW__',
  NO_ACCOUNT: '__NO_ACCOUNT__'
};

// How many pay-date inputs to show by frequency
const getMaxPayDates = (freq) => {
  switch (freq) {
    case 'weekly': return 5;        // up to 5 in a month
    case 'bi-weekly': return 3;     // covers 3-paycheque months
    case 'monthly': return 1;
    case 'one-time': return 1;
    default: return 0;
  }
};

// Simple, readable SVG bar chart used in the Analytics tab
const ImprovedBarChart = ({
  data,
  width = 900,
  height = 320,
  topN = 8,
  sortBy = 'projected',
  currencyFormatter = (v) => `$${v.toFixed(2)}`
}) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  // sort + slice
  const rows = [...data]
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    .slice(0, topN);

  const pad = { t: 30, r: 20, b: 70, l: 60 };
  const w = Math.max(300, width) - pad.l - pad.r;
  const h = Math.max(200, height) - pad.t - pad.b;

  const maxVal = Math.max(
    1,
    ...rows.map(r => Math.max(r.projected || 0, r.actual || 0))
  );

  const xBand = w / rows.length;
  const gap = Math.min(14, Math.max(8, xBand * 0.12));
  const barW = Math.max(12, Math.min(34, (xBand - gap) / 2));

  const y = (v) => h - (v / maxVal) * h;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  return (
    <svg width={w + pad.l + pad.r} height={h + pad.t + pad.b} style={{ display: 'block' }}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {/* Y grid & ticks */}
        {tickVals.map((tv, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={0}
              y1={y(tv)}
              x2={w}
              y2={y(tv)}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <text
              x={-10}
              y={y(tv)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {currencyFormatter(tv)}
            </text>
          </g>
        ))}

        {/* X axis */}
        <line x1="0" y1={h} x2={w} y2={h} stroke="#e5e7eb" />

        {/* Bars */}
        {rows.map((d, i) => {
          const cx = i * xBand + xBand / 2;
          const px = cx - barW - gap / 2;
          const ax = cx + gap / 2;
          const ph = h - y(d.projected || 0);
          const ah = h - y(d.actual || 0);

          return (
            <g key={d.id || d.name || i}>
              <rect x={px} y={y(d.projected || 0)} width={barW} height={ph} fill="#10b981" rx="4" />
              <rect x={ax} y={y(d.actual || 0)} width={barW} height={ah} fill="#3b82f6" rx="4" />

              {/* value labels */}
              <text x={px + barW / 2} y={y(d.projected || 0) - 6} fontSize="10" fill="#065f46" textAnchor="middle">
                {currencyFormatter(d.projected || 0)}
              </text>
              <text x={ax + barW / 2} y={y(d.actual || 0) - 6} fontSize="10" fill="#1e3a8a" textAnchor="middle">
                {currencyFormatter(d.actual || 0)}
              </text>

              {/* x labels */}
              <text
                x={cx}
                y={h + 16}
                textAnchor="middle"
                fontSize="11"
                fill="#374151"
              >
                {String(d.name).length > 16 ? `${String(d.name).slice(0, 16)}…` : d.name}
              </text>
            </g>
          );
        })}

        {/* legend */}
        <g transform={`translate(0, -14)`}>
          <rect x="0" y="-10" width="12" height="12" fill="#10b981" rx="2" />
          <text x="18" y="0" fontSize="12" fill="#374151">Projected</text>
          <rect x="100" y="-10" width="12" height="12" fill="#3b82f6" rx="2" />
          <text x="118" y="0" fontSize="12" fill="#374151">Actual</text>
        </g>
      </g>
    </svg>
  );
};

const IncomePage = () => {
  const { state, actions, formatCurrency: formatCurrencyUtil } = useBudget();
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, sources, analytics
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Form state (supports per-pay-date actuals) - REMOVED actualAmount field
  const [formData, setFormData] = useState({
    name: '',
    projectedAmount: '',
    frequency: 'monthly',
    account: '',
    newAccountName: '', // For creating new accounts
    notes: '',
    weeks: Array(5).fill(0),
    actualWeeks: Array(5).fill(0),
    payDates: [],
    payActuals: [],
    // How to interpret 'overall actual' when per-date actuals are not used
    actualMode: 'per-check' // 'per-check' | 'monthly-total'
  });

  // Quick Entry state - simpler approach
  const [quickEntryData, setQuickEntryData] = useState({});
  // State for button feedback instead of DOM queries
  const [updateFeedback, setUpdateFeedback] = useState({});

  // Trim per-date arrays when frequency changes
  useEffect(() => {
    const max = getMaxPayDates(formData.frequency);
    if (!Array.isArray(formData.payDates)) return;

    const nextPayDates = formData.payDates.length > max
      ? formData.payDates.slice(0, max)
      : formData.payDates;

    const nextPayActualsBase = Array.isArray(formData.payActuals) ? formData.payActuals : [];
    const nextPayActuals = nextPayActualsBase.length > max
      ? nextPayActualsBase.slice(0, max)
      : nextPayActualsBase;

    if (nextPayDates !== formData.payDates || nextPayActuals !== formData.payActuals) {
      setFormData(prev => ({ ...prev, payDates: nextPayDates, payActuals: nextPayActuals }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.frequency]);

  // Build account options from central accounts store
  const accounts = Array.isArray(state.data.accounts) ? state.data.accounts : [];
  const existingAccountNames = accounts.map(acc => acc.name).filter(Boolean);

  // Build account options with special values
  const buildAccountOptions = () => {
    const options = [];
    
    // Add "No Account" option first
    options.push({ value: ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT, label: 'No Account' });
    
    // Add existing accounts
    accounts.forEach(account => {
      options.push({ value: account.name, label: account.name });
    });
    
    // Add "Create New Account" option
    options.push({ value: ACCOUNT_SPECIAL_VALUES.CREATE_NEW, label: '+ Create New Account' });
    
    return options;
  };

  const ACCOUNT_OPTIONS = buildAccountOptions();

  // Set default account selection when options are available
  useEffect(() => {
    if (!formData.account && ACCOUNT_OPTIONS.length > 0) {
      // Default to "No Account" instead of first existing account
      setFormData(prev => ({ ...prev, account: ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ACCOUNT_OPTIONS.length]);

  // Month-aware monthly amount calculator
  const getMonthAwareMonthlyAmount = (income, which = 'projected') => {
    const hasDates = Array.isArray(income.payDates) && income.payDates.length > 0;
    const perCheckProjected = (typeof income.projectedAmount === 'number' ? income.projectedAmount : parseAmount(income.projectedAmount));
    const perCheckActual   = (typeof income.actualAmount === 'number' ? income.actualAmount : parseAmount(income.actualAmount));

    if (which === 'actual') {
      // 1) If per-date actuals exist, sum them (these are month-aware)
      if (Array.isArray(income.payActuals) && income.payActuals.length > 0) {
        return income.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0);
      }
      // 2) If user says "overall actual is monthly total", just use it
      if (income.actualMode === 'monthly-total') {
        return perCheckActual || 0;
      }
      // 3) Otherwise treat overall actual as per-paycheck
      switch (income.frequency) {
        case 'weekly':
          return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (52 / 12);
        case 'bi-weekly':
          return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (26 / 12);
        case 'monthly':
          return perCheckActual || 0;
        case 'quarterly':
          return (perCheckActual || 0) / 3;
        case 'semi-annual':
          return (perCheckActual || 0) / 6;
        case 'annual':
          return (perCheckActual || 0) / 12;
        case 'one-time':
          return 0;
        default:
          return perCheckActual || 0;
      }
    }

    // PROJECTED path
    switch (income.frequency) {
      case 'weekly':
        return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * (52 / 12);
      case 'bi-weekly':
        return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * (26 / 12);
      case 'monthly':
        return perCheckProjected || 0;
      case 'quarterly':
        return (perCheckProjected || 0) / 3;
      case 'semi-annual':
        return (perCheckProjected || 0) / 6;
      case 'annual':
        return (perCheckProjected || 0) / 12;
      case 'one-time':
        return 0;
      default:
        return perCheckProjected || 0;
    }
  };

  // Normalize income data from state
  const incomeData = (state.data.income || []).map((income) => {
    const weeks = Array.isArray(income.weeks) ? income.weeks : Array(5).fill(0);
    const actualWeeks = Array.isArray(income.actualWeeks) ? income.actualWeeks : Array(5).fill(0);
    const payDates = Array.isArray(income.payDates) ? income.payDates : [];
    const payActuals = Array.isArray(income.payActuals) ? income.payActuals : [];

    const projectedAmount =
      income.projectedAmount !== undefined
        ? parseAmount(income.projectedAmount)
        : (income.amount !== undefined
            ? parseAmount(income.amount)
            : weeks.reduce((sum, week) => sum + (parseAmount(week) || 0), 0));

    const actualAmount =
      income.actualAmount !== undefined
        ? parseAmount(income.actualAmount)
        : (payActuals.length > 0
            ? payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0)
            : actualWeeks.reduce((sum, week) => sum + (parseAmount(week) || 0), 0));

    return {
      ...income,
      name: income.name || income.source || '',
      projectedAmount,
      actualAmount,
      weeks,
      actualWeeks,
      frequency: income.frequency || 'monthly',
      account: income.account || '',
      notes: income.notes || '',
      payDates,
      payActuals,
      actualMode: income.actualMode || 'per-check'
    };
  });

  // Totals (month-aware)
  const totalProjectedIncome = incomeData.reduce((total, income) => {
    return total + getMonthAwareMonthlyAmount(income, 'projected');
  }, 0);

  const totalActualIncome = incomeData.reduce((total, income) => {
    return total + getMonthAwareMonthlyAmount(income, 'actual');
  }, 0);

  // Analytics builders
  const buildIncomeAnalytics = (data) => {
    const rows = data.map((inc) => {
      const projected = getMonthAwareMonthlyAmount(inc, 'projected');
      const actual = getMonthAwareMonthlyAmount(inc, 'actual');
      const variance = actual - projected;
      return {
        id: inc.id,
        name: inc.name || 'Untitled',
        account: inc.account || 'No Account',
        frequency: inc.frequency || 'monthly',
        projected,
        actual,
        variance
      };
    });

    const topNegative = [...rows].sort((a, b) => a.variance - b.variance).slice(0, 5);
    const topPositive = [...rows].sort((a, b) => b.variance - a.variance).slice(0, 5);

    const byAccountMap = rows.reduce((acc, r) => {
      const accountKey = r.account || 'No Account';
      acc[accountKey] = (acc[accountKey] || 0) + r.actual;
      return acc;
    }, {});
    const byAccount = Object.entries(byAccountMap)
      .map(([account, actual]) => ({ account, actual }))
      .sort((a, b) => b.actual - a.actual);

    const chart = rows;
    return { rows, topNegative, topPositive, byAccount, chart };
  };

  const analytics = buildIncomeAnalytics(incomeData);

  // Month totals / variance
  const incomeVariance = totalActualIncome - totalProjectedIncome;
  const variancePercentage =
    totalProjectedIncome > 0 ? (incomeVariance / totalProjectedIncome) * 100 : 0;

  // Form input handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' || field === 'newAccountName' ? sanitizeInput(value) : value
    }));
  };

  // Handle account selection change
  const handleAccountChange = (value) => {
    if (value === ACCOUNT_SPECIAL_VALUES.CREATE_NEW) {
      setShowAccountModal(true);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      account: value,
      newAccountName: ''
    }));
  };

  // Handle account creation from modal
  const handleAccountCreated = (newAccount) => {
    setFormData(prev => ({
      ...prev,
      account: newAccount.name,
      newAccountName: ''
    }));
  };

  // Helpers for quick entry inputs
  const sanitizeMoneyInput = (value) => {
    if (typeof value !== 'string') return '';
    // Normalize thousands separators and decimals from various locales
    let sanitized = value.replace(/[^0-9.,-]/g, '');
    const negative = sanitized.startsWith('-');
    sanitized = sanitized.replace(/-/g, '');

    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    let decimalSep = '';
    if (lastComma > lastDot) {
      decimalSep = ',';
    } else if (lastDot > lastComma) {
      decimalSep = '.';
    }

    if (decimalSep) {
      const otherSepRegex = decimalSep === '.' ? /,/g : /\./g;
      sanitized = sanitized.replace(otherSepRegex, '');
      sanitized = sanitized.replace(decimalSep, '.');
    } else {
      sanitized = sanitized.replace(/[.,]/g, '');
    }

    const hasTrailingDecimal = sanitized.endsWith('.');
    const parts = sanitized.split('.');
    const intPart = parts[0] || '';
    const decPart = parts[1] ? parts[1].slice(0, 2) : '';
    let result = intPart;
    if (decPart) {
      result += '.' + decPart;
    } else if (hasTrailingDecimal) {
      result += '.';
    }
    return negative && result ? '-' + result : result;
  };

  const parseMoneyInput = (s) => {
    if (typeof s !== 'string') return 0;
    const cleaned = sanitizeMoneyInput(s).replace(/\.$/, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Quick Entry Handlers - using stable keys and minimal state churn
  const handleQuickEntryDateChange = (incomeKey, dateIndex, value) => {
    setQuickEntryData((prev) => {
      const prevEntry = prev[incomeKey] || { payDates: [], payActuals: [] };
      const payDates = [...prevEntry.payDates];
      payDates[dateIndex] = value;
      return { ...prev, [incomeKey]: { ...prevEntry, payDates } };
    });
  };

  const handleQuickEntryAmountChange = (incomeKey, amountIndex, value) => {
    const sanitized = sanitizeMoneyInput(value);
    setQuickEntryData((prev) => {
      const prevEntry = prev[incomeKey] || { payDates: [], payActuals: [] };
      const payActuals = [...prevEntry.payActuals];
      payActuals[amountIndex] = sanitized;
      return { ...prev, [incomeKey]: { ...prevEntry, payActuals } };
    });
  };

  const handleQuickEntryAmountBlur = (incomeKey, amountIndex) => {
    setQuickEntryData((prev) => {
      const entry = prev[incomeKey];
      if (!entry) return prev;
      const raw = entry.payActuals[amountIndex];
      if (raw === '' || raw === undefined) return prev;
      const num = parseMoneyInput(raw);
      const payActuals = [...entry.payActuals];
      payActuals[amountIndex] = num.toFixed(2);
      return { ...prev, [incomeKey]: { ...entry, payActuals } };
    });
  };

  const handleQuickEntryUpdate = (incomeKey, rowIndex) => {
    // Find income using the stable key
    const incomeIndex = incomeData.findIndex(
      (inc) => (inc.id || `name:${inc.name}`) === incomeKey
    );
    const income = incomeData[incomeIndex];

    if (!income) {
      console.warn('Income source not found for key:', incomeKey);
      return;
    }

    const quickData = quickEntryData[incomeKey] || {};
    const maxDates = getMaxPayDates(income.frequency);
    if (rowIndex >= maxDates) return;

    const payDates = Array.isArray(income.payDates)
      ? [...income.payDates]
      : [];
    const payActuals = Array.isArray(income.payActuals)
      ? [...income.payActuals]
      : [];

    while (payDates.length <= rowIndex) payDates.push('');
    while (payActuals.length <= rowIndex) payActuals.push('');

    const newDate = quickData.payDates?.[rowIndex];
    const rawAmount = quickData.payActuals?.[rowIndex];
    if (newDate) payDates[rowIndex] = newDate;
    if (rawAmount === '') {
      payActuals[rowIndex] = undefined;
    } else if (rawAmount !== undefined) {
      payActuals[rowIndex] = parseMoneyInput(rawAmount);
    }

    while (
      payActuals.length &&
      (payActuals[payActuals.length - 1] === undefined ||
        payActuals[payActuals.length - 1] === '')
    ) {
      payActuals.pop();
    }

    const updatedIncome = {
      ...income,
      payDates,
      payActuals,
    };
    const updatedIncomeData = incomeData.map((inc, idx) =>
      idx === incomeIndex ? updatedIncome : inc
    );

    actions.updateIncome(updatedIncomeData);

    // Show React-based feedback for this specific row
    const feedbackKey = `${incomeKey}:${rowIndex}`;
    setUpdateFeedback((prev) => ({ ...prev, [feedbackKey]: 'saved' }));
    setTimeout(() => {
      setUpdateFeedback((prev) => ({ ...prev, [feedbackKey]: 'idle' }));
    }, 1500);
  };

  // Save/add income - UPDATED to remove actualAmount logic
  const handleSubmit = (e) => {
    e.preventDefault();

    // Only require name + projected
    const hasName = formData.name && formData.name.trim() !== '';
    const projected = parseAmount(formData.projectedAmount);
    if (!hasName || isNaN(projected)) {
      alert('Please enter a name and a projected amount.');
      return;
    }

    // Handle account field
    let finalAccount = '';
    if (formData.account === ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT) {
      finalAccount = '';
    } else {
      finalAccount = formData.account;
    }

    // Calculate actual amount from per-date actuals only
    const actualFromEntries = Array.isArray(formData.payActuals)
      ? formData.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0)
      : 0;

    // Define weekly splits
    const weeks = Array(5).fill(projected > 0 ? projected / 5 : 0);
    const actualWeeks = Array(5).fill(actualFromEntries > 0 ? actualFromEntries / 5 : 0);

    const incomeItem = {
      ...formData,
      projectedAmount: projected,
      actualAmount: actualFromEntries, // Only from per-date actuals
      amount: projected, // Maintain backward compatibility
      weeks,
      actualWeeks,
      account: finalAccount,
      payDates: Array.isArray(formData.payDates) ? formData.payDates : [],
      payActuals: Array.isArray(formData.payActuals) ? formData.payActuals : [],
      actualMode: formData.actualMode || 'per-check',
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

  // Edit
  const handleEdit = (index) => {
    const income = incomeData[index];
    const account = income.account || '';
    
    // Determine account selection
    let accountSelection = ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT;
    if (account && existingAccountNames.includes(account)) {
      accountSelection = account;
    }

    setFormData({
      name: income.name || '',
      projectedAmount: income.projectedAmount?.toString() || '',
      frequency: income.frequency || 'monthly',
      account: accountSelection,
      newAccountName: '',
      notes: income.notes || '',
      weeks: Array.isArray(income.weeks) ? income.weeks : Array(5).fill(0),
      actualWeeks: Array.isArray(income.actualWeeks) ? income.actualWeeks : Array(5).fill(0),
      payDates: Array.isArray(income.payDates) ? income.payDates : [],
      payActuals: Array.isArray(income.payActuals) ? income.payActuals : [],
      actualMode: income.actualMode || 'per-check'
    });
    setEditingIndex(index);
    setShowAddForm(true);
    setActiveTab('sources');

    setTimeout(() => {
      const formElement = document.querySelector('.income-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Delete
  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this income source?')) {
      const newIncomeData = incomeData.filter((_, i) => i !== index);
      actions.updateIncome(newIncomeData);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      frequency: 'monthly',
      projectedAmount: '',
      account: ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT,
      newAccountName: '',
      notes: '',
      weeks: Array(5).fill(0),
      actualWeeks: Array(5).fill(0),
      payDates: [],
      payActuals: [],
      actualMode: 'per-check'
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handlePrint = () => {
    const html = IncomePagePrint.generatePrintContent(state.data, formatCurrencyUtil);
    IncomePagePrint.openPrintWindow(html, 'Income Report');
  };

  const exportIncomeCSV = () => {
    const headers = ['Source', 'Projected Amount', 'Actual Amount', 'Variance', 'Frequency', 'Account', 'Notes'];
    const csvRows = [headers.join(',')];

    incomeData.forEach(income => {
      const projectedMonthly = getMonthAwareMonthlyAmount(income, 'projected');
      const actualMonthly = getMonthAwareMonthlyAmount(income, 'actual');
      const variance = actualMonthly - projectedMonthly;
      const row = [
        income.name || '',
        projectedMonthly || 0,
        actualMonthly || 0,
        variance,
        income.frequency || 'monthly',
        income.account || 'No Account',
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
      aria-selected={active}
      role="tab"
      id={`tab-${id}`}
    >
      {label}
    </button>
  );

  return (
    <div className="income-page">
      <div className="page-header">
        <h1 className="page-title">💵 Income Management</h1>
        <p className="page-description">
          Track projected vs actual income with comprehensive analysis
        </p>
      </div>

      <div className="tabs-container">
        <div className="tabs-header" role="tablist" aria-label="Income Tabs">
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

        <div className="tab-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
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

              {/* Quick Entry Section */}
              <QuickEntrySection
                incomeData={incomeData}
                quickEntryData={quickEntryData}
                updateFeedback={updateFeedback}
                handleQuickEntryDateChange={handleQuickEntryDateChange}
                handleQuickEntryAmountChange={handleQuickEntryAmountChange}
                handleQuickEntryAmountBlur={handleQuickEntryAmountBlur}
                handleQuickEntryUpdate={handleQuickEntryUpdate}
                getMaxPayDates={getMaxPayDates}
                getMonthAwareMonthlyAmount={getMonthAwareMonthlyAmount}
                formatCurrencyUtil={formatCurrencyUtil}
              />

              <div className="page-actions">
                <button className="action-button primary" onClick={() => {
                  setShowAddForm(true);
                  setActiveTab('sources');
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
                        <label className="form-label" htmlFor="income-account">Account</label>
                        <select
                          id="income-account"
                          className="form-select"
                          value={formData.account}
                          onChange={(e) => handleAccountChange(e.target.value)}
                        >
                          {ACCOUNT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        
                        {formData.account === ACCOUNT_SPECIAL_VALUES.NO_ACCOUNT && (
                          <div className="account-hint">
                            This income source will not be associated with any specific account.
                          </div>
                        )}
                        
                        {formData.account === ACCOUNT_SPECIAL_VALUES.CREATE_NEW && (
                          <div className="account-hint create-new">
                            Click "Create New Account" to open the account creation modal.
                          </div>
                        )}
                      </div>

                      {/* Actual amount mode */}
                      <div className="form-group full-width">
                        <label className="form-label" htmlFor="actual-mode">How should pay dates be calculated?</label>
                        <div id="actual-mode" role="radiogroup" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="radio"
                              name="actualMode"
                              value="per-check"
                              checked={formData.actualMode === 'per-check'}
                              onChange={(e) => handleInputChange('actualMode', e.target.value)}
                            />
                            <span>Per-paycheck (multiply by # of checks)</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="radio"
                              name="actualMode"
                              value="monthly-total"
                              checked={formData.actualMode === 'monthly-total'}
                              onChange={(e) => handleInputChange('actualMode', e.target.value)}
                            />
                            <span>Monthly total (don't multiply)</span>
                          </label>
                        </div>
                        <small style={{ color: '#6b7280' }}>
                          This setting only applies when you use the "Pay dates + actuals" section below. If you enter individual pay amounts, those are summed directly.
                        </small>
                      </div>

                      {/* Pay dates + actuals (dynamic by frequency) */}
                      {getMaxPayDates(formData.frequency) > 0 && (
                        <div className="form-group full-width">
                          <label className="form-label">
                            {formData.frequency === 'bi-weekly' ? 'Paycheque Dates (Bi-Weekly)' :
                              formData.frequency === 'weekly' ? 'Pay Dates (Weekly)' : 'Pay Date'}
                          </label>

                          <div className="projected-actual-grid">
                            {Array.from({ length: getMaxPayDates(formData.frequency) }).map((_, i) => (
                              <React.Fragment key={`payrow-${i}`}>
                                {/* Date */}
                                <input
                                  type="date"
                                  className="form-input"
                                  value={formData.payDates?.[i] || ''}
                                  onChange={(e) => {
                                    const next = [...(formData.payDates || [])];
                                    next[i] = e.target.value;
                                    setFormData(prev => ({ ...prev, payDates: next }));
                                  }}
                                  placeholder="Pay date"
                                />
                                {/* Actual $ for that date */}
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]*"
                                  autoComplete="off"
                                  className="form-input"
                                  placeholder="Actual $ received"
                                  value={formData.payActuals?.[i] ?? ''}
                                  onChange={(e) => {
                                    const next = [...(formData.payActuals || [])];
                                    next[i] = e.target.value;
                                    setFormData(prev => ({ ...prev, payActuals: next }));
                                  }}
                                />
                              </React.Fragment>
                            ))}
                          </div>

                          <small style={{ color: '#6b7280' }}>
                            Track your actual income by entering the date and amount for each paycheck. This provides the most accurate monthly income calculation.
                          </small>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Projected Amount - per pay *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          autoComplete="off"
                          className="form-input"
                          value={formData.projectedAmount}
                          onChange={(e) => handleInputChange('projectedAmount', e.target.value)}
                          placeholder="0.00"
                          required
                        />
                        <small style={{ color: '#6b7280' }}>
                          Enter the amount you expect to receive per paycheck (before taxes/deductions)
                        </small>
                      </div>

                      <div className="form-group full-width">
                        <label className="form-label" htmlFor="income-notes">Notes</label>
                        <textarea
                          id="income-notes"
                          className="form-textarea"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Additional notes about this income source..."
                        />
                      </div>

                      {/* FORM ACTIONS */}
                      <div className="form-actions full-width">
                        <button type="submit" className="action-button primary">
                          {editingIndex !== null ? 'Save Edits' : 'Add Income'}
                        </button>
                        <button type="button" className="action-button secondary" onClick={resetForm}>
                          Cancel
                        </button>
                      </div>
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
                        const projectedMonthly = getMonthAwareMonthlyAmount(income, 'projected');
                        const actualMonthly = getMonthAwareMonthlyAmount(income, 'actual');
                        const variance = actualMonthly - projectedMonthly;
                        return (
                          <tr key={income.id || index}>
                            <td className="source-name">{income.name}</td>
                            <td className="amount-cell">
                              <span className="amount projected">
                                {formatCurrencyUtil(projectedMonthly)}
                              </span>
                            </td>
                            <td className="amount-cell">
                              <span className="amount actual">
                                {formatCurrencyUtil(actualMonthly)}
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
                            <td>{income.account || 'No Account'}</td>
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
            <div className="analytics-grid">
              {/* Cards */}
              <div className="analytics-cards">
                <div className="a-card">
                  <div className="a-title">Projected (This Month)</div>
                  <div className="a-value">{formatCurrencyUtil(totalProjectedIncome)}</div>
                </div>
                <div className="a-card">
                  <div className="a-title">Actual (This Month)</div>
                  <div className="a-value">{formatCurrencyUtil(totalActualIncome)}</div>
                </div>
                <div className={`a-card ${incomeVariance < 0 ? 'neg' : 'pos'}`}>
                  <div className="a-title">Variance</div>
                  <div className="a-value">{formatCurrencyUtil(incomeVariance)}</div>
                  <div className="a-sub">
                    {(totalProjectedIncome > 0 ? ((incomeVariance / totalProjectedIncome) * 100) : 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="a-panel">
                <div className="a-panel-title">Projected vs Actual by Source (Current Month)</div>
                <ImprovedBarChart
                  data={analytics.chart}
                  width={900}
                  height={320}
                  topN={8}
                  sortBy="projected"
                  currencyFormatter={formatCurrencyUtil}
                />
              </div>

              {/* Top variances */}
              <div className="a-columns">
                <div className="a-panel">
                  <div className="a-panel-title">Biggest Shortfalls</div>
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Projected</th>
                        <th>Actual</th>
                        <th>Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topNegative.length === 0 && (
                        <tr><td colSpan="4" className="muted">No data</td></tr>
                      )}
                      {analytics.topNegative.map(r => (
                        <tr key={`neg-${r.id || r.name}`}>
                          <td>{r.name}</td>
                          <td className="num">{formatCurrencyUtil(r.projected)}</td>
                          <td className="num">{formatCurrencyUtil(r.actual)}</td>
                          <td className={`num ${r.variance < 0 ? 'neg' : 'pos'}`}>{formatCurrencyUtil(r.variance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="a-panel">
                  <div className="a-panel-title">Biggest Overages</div>
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Projected</th>
                        <th>Actual</th>
                        <th>Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topPositive.length === 0 && (
                        <tr><td colSpan="4" className="muted">No data</td></tr>
                      )}
                      {analytics.topPositive.map(r => (
                        <tr key={`pos-${r.id || r.name}`}>
                          <td>{r.name}</td>
                          <td className="num">{formatCurrencyUtil(r.projected)}</td>
                          <td className="num">{formatCurrencyUtil(r.actual)}</td>
                          <td className={`num ${r.variance < 0 ? 'neg' : 'pos'}`}>{formatCurrencyUtil(r.variance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By account */}
              <div className="a-panel">
                <div className="a-panel-title">Actual Income by Account</div>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th className="num">Actual (This Month)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byAccount.length === 0 && (
                      <tr><td colSpan="2" className="muted">No data</td></tr>
                    )}
                    {analytics.byAccount.map((r) => (
                      <tr key={`acct-${r.account}`}>
                        <td>{r.account}</td>
                        <td className="num">{formatCurrencyUtil(r.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Modal */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onAccountCreated={handleAccountCreated}
      />

      <div className="income-help-section" style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ marginBottom: '10px', fontSize: '1.25rem', fontWeight: '600' }}>
          📘 Income Overview – Help & Definitions
        </h3>
        <ul style={{ lineHeight: '1.6', fontSize: '0.95rem', color: '#374151' }}>
          <li>
            <strong>Projected Monthly Income:</strong> The total amount you expect to earn each month from all income sources. Annual value = monthly × 12.
          </li>
          <li>
            <strong>Actual Monthly Income:</strong> The total income you have actually received this month, calculated from individual pay dates or frequency multipliers.
          </li>
          <li>
            <strong>Income Variance:</strong> The difference between actual and projected income. Negative means under target, positive means over target.
          </li>
          <li>
            <strong>Account Selection:</strong> Choose "No Account" to skip account assignment, select an existing account, or create a new account using the quick creation modal.
          </li>
          <li>
            <strong>Pay Dates & Actuals:</strong> Enter specific pay dates and amounts for the most accurate income tracking. This overrides frequency-based calculations.
          </li>
          <li>
            <strong>Per-paycheck vs Monthly Total:</strong> Choose how to calculate monthly income when using frequency multipliers instead of individual pay date amounts.
          </li>
          <li>
            <strong>Quick Paycheque Entry:</strong> Use the quick entry section to rapidly update actual paycheque amounts as you receive them without editing source settings.
          </li>
        </ul>
      </div>
    </div>
  );
};

// src/utils/printUtils.js
export const IncomePagePrint = {
  generatePrintContent(data, formatCurrency) {
    // ------- helpers -------
    const safe = (v) => (v == null ? '' : String(v));
    const parseNum = (v) => {
      if (typeof v === 'number') return v;
      if (!v && v !== 0) return 0;
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    };

    // month-aware calculator (mirrors page logic)
    const monthAware = (income, which = 'projected') => {
      const hasDates = Array.isArray(income.payDates) && income.payDates.length > 0;
      const perCheckProj = parseNum(income.projectedAmount ?? income.amount);
      const perCheckAct  = parseNum(income.actualAmount);

      if (which === 'actual') {
        // A) per-date actuals win
        if (Array.isArray(income.payActuals) && income.payActuals.length > 0) {
          return income.payActuals.reduce((s, v) => s + parseNum(v), 0);
        }
        // B) if user said monthly total, use as-is
        if ((income.actualMode || 'per-check') === 'monthly-total') {
          return perCheckAct || 0;
        }
      }

      const base = which === 'projected' ? perCheckProj : perCheckAct;

      switch (income.frequency) {
        case 'weekly':     return hasDates ? base * income.payDates.length : base * (52 / 12);
        case 'bi-weekly':  return hasDates ? base * income.payDates.length : base * (26 / 12);
        case 'monthly':    return base;
        case 'quarterly':  return base / 3;
        case 'semi-annual':return base / 6;
        case 'annual':     return base / 12;
        case 'one-time':   return 0;
        default:           return base;
      }
    };

    const income = (data?.income || []).map((inc) => {
      const name = inc.name || inc.source || 'Untitled';
      const account = inc.account || 'No Account';
      const freq = inc.frequency || 'monthly';
      const payDates = Array.isArray(inc.payDates) ? inc.payDates : [];
      const payActuals = Array.isArray(inc.payActuals) ? inc.payActuals : [];
      const projectedPerPay = parseNum(inc.projectedAmount ?? inc.amount);
      const actualPerPay = parseNum(inc.actualAmount);
      const actualMode = inc.actualMode || 'per-check';

      const projMonthly = monthAware({ ...inc, projectedAmount: projectedPerPay }, 'projected');
      const actMonthly  = monthAware({ ...inc, actualAmount: actualPerPay, actualMode, payDates, payActuals }, 'actual');
      const variance    = actMonthly - projMonthly;

      return {
        id: inc.id || name,
        name,
        account,
        frequency: freq,
        projectedPerPay,
        actualPerPay,
        payDates,
        payActuals,
        projectedMonthly: projMonthly,
        actualMonthly: actMonthly,
        variance
      };
    });

    const totals = income.reduce((a, r) => {
      a.projected += r.projectedMonthly;
      a.actual += r.actualMonthly;
      return a;
    }, { projected: 0, actual: 0 });
    const totalVariance = totals.actual - totals.projected;

    const today = new Date();
    const printedDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });

    // ------- HTML -------
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Income Report</title>
<style>
  @page { size: Letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  html, body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; color: #111827; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 18px; }

  .badges { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .pill {
    font-size: 12px; padding: 6px 10px; border-radius: 999px;
    border: 1px solid #e5e7eb; background: #f9fafb; display: inline-block;
  }
  .strong { font-weight: 700; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  thead th {
    font-size: 12px; text-transform: none; letter-spacing: 0;
    text-align: left; color: #374151; padding: 10px 12px; border-bottom: 2px solid #e5e7eb;
    position: relative;
  }
  tbody td {
    padding: 10px 12px; font-size: 13px; vertical-align: top; border-bottom: 1px solid #f1f5f9;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }
  tfoot td {
    padding: 12px; font-weight: 700; border-top: 2px solid #e5e7eb; font-size: 13px;
  }

  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .muted { color: #6b7280; }
  .sourceCell { line-height: 1.35; }
  .sourceTitle { font-weight: 700; margin-bottom: 4px; }
  .acct { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .dates { margin-top: 8px; }
  .dates ul { margin: 0; padding-left: 14px; }
  .dates li { margin: 2px 0; color: #374151; }
  .dates small { color: #6b7280; }

  .variance-neg { color: #dc2626; }
  .variance-pos { color: #059669; }

  .grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .wrap { max-width: 8.5in; margin: 0 auto; }
  .header { margin-bottom: 14px; }
  .tableWrap { margin-top: 8px; }

  /* Avoid splitting rows across pages */
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Income Summary</h1>
      <div class="sub">Printed ${printedDate}</div>
      <div class="badges">
        <span class="pill"><span class="muted">Projected (month):</span> <span class="strong">${formatCurrency(totals.projected)}</span></span>
        <span class="pill"><span class="muted">Actual (month):</span> <span class="strong">${formatCurrency(totals.actual)}</span></span>
        <span class="pill"><span class="muted">Variance:</span> <span class="strong">${formatCurrency(totalVariance)}</span></span>
      </div>
    </div>

    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th style="width: 32%;">Source / Account / Pay Dates</th>
            <th style="width: 10%;">Frequency</th>
            <th class="num" style="width: 12%;">Projected<br/><span class="muted">(per pay)</span></th>
            <th class="num" style="width: 12%;">Actual<br/><span class="muted">(per pay)</span></th>
            <th class="num" style="width: 12%;">Projected<br/><span class="muted">(monthly)</span></th>
            <th class="num" style="width: 12%;">Actual<br/><span class="muted">(monthly)</span></th>
            <th class="num" style="width: 10%;">Variance</th>
          </tr>
        </thead>
        <tbody>
          ${income.map(r => {
            const payLines = (r.payDates.length ? r.payDates : []).map((d, i) => {
              const amt = r.payActuals?.[i];
              const amtStr = (amt || amt === 0) ? ` — <small>${formatCurrency(parseNum(amt))}</small>` : '';
              return `<li>${safe(d)}${amtStr}</li>`;
            }).join('');
            return `
            <tr>
              <td class="sourceCell">
                <div class="sourceTitle">${safe(r.name)}</div>
                ${r.account && r.account !== 'No Account' ? `<div class="acct">${safe(r.account)}</div>` : ''}
                ${payLines ? `<div class="dates"><ul>${payLines}</ul></div>` : ''}
              </td>
              <td>${safe(r.frequency)}</td>
              <td class="num">${formatCurrency(r.projectedPerPay)}</td>
              <td class="num">${formatCurrency(r.actualPerPay)}</td>
              <td class="num">${formatCurrency(r.projectedMonthly)}</td>
              <td class="num">${formatCurrency(r.actualMonthly)}</td>
              <td class="num ${r.variance < 0 ? 'variance-neg' : 'variance-pos'}">${formatCurrency(r.variance)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Totals</td>
            <td></td>
            <td class="num muted">—</td>
            <td class="num muted">—</td>
            <td class="num">${formatCurrency(totals.projected)}</td>
            <td class="num">${formatCurrency(totals.actual)}</td>
            <td class="num ${totalVariance < 0 ? 'variance-neg' : 'variance-pos'}">${formatCurrency(totalVariance)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</body>
</html>`;
  },

  openPrintWindow(html, title = 'Income Report') {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
    w.document.title = title;
  }
};

export default IncomePage;