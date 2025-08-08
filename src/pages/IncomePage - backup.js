// src/pages/IncomePage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { DEFAULT_ACCOUNTS } from '../utils/constants';
import { sanitizeInput } from '../utils/validators';
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

  // Form state (supports per-pay-date actuals)
  const [formData, setFormData] = useState({
    name: '',
    projectedAmount: '',
    actualAmount: '',
    frequency: 'monthly',
    account: DEFAULT_ACCOUNTS[0],
    notes: '',
    weeks: Array(5).fill(0),
    actualWeeks: Array(5).fill(0),
    payDates: [],
    payActuals: []
  });

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

  // Trim per-date arrays when frequency changes
  React.useEffect(() => {
    const max = getMaxPayDates(formData.frequency);
    if (!Array.isArray(formData.payDates)) return;

    const next = { ...formData };
    if (formData.payDates.length > max) next.payDates = formData.payDates.slice(0, max);
    if (!Array.isArray(formData.payActuals)) next.payActuals = [];
    if (formData.payActuals.length > max) next.payActuals = formData.payActuals.slice(0, max);

    // Shallow compare objects; if different, update
    if (
      next.payDates !== formData.payDates ||
      next.payActuals !== formData.payActuals
    ) {
      setFormData(prev => ({ ...prev, payDates: next.payDates, payActuals: next.payActuals }));
    }
  }, [formData.frequency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Month-aware monthly amount (uses payDates/payActuals when present)
  const getMonthAwareMonthlyAmount = (income, which = 'projected') => {
    const hasDates = Array.isArray(income.payDates) && income.payDates.length > 0;

    if (which === 'actual') {
      // If per-date actuals exist, sum them (month-aware)
      if (Array.isArray(income.payActuals) && income.payActuals.length > 0) {
        return income.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0);
      }
    }

    const perCheck =
      which === 'actual'
        ? (typeof income.actualAmount === 'number' ? income.actualAmount : parseAmount(income.actualAmount))
        : (typeof income.projectedAmount === 'number' ? income.projectedAmount : parseAmount(income.projectedAmount));

    switch (income.frequency) {
      case 'weekly':
        return hasDates ? perCheck * income.payDates.length : perCheck * (52 / 12);
      case 'bi-weekly':
        return hasDates ? perCheck * income.payDates.length : perCheck * (26 / 12);
      case 'monthly':
        return perCheck;
      case 'quarterly':
        return perCheck / 3;
      case 'semi-annual':
        return perCheck / 6;
      case 'annual':
        return perCheck / 12;
      case 'one-time':
        return 0;
      default:
        return perCheck;
    }
  };

  // Normalize income data
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
      account: income.account || DEFAULT_ACCOUNTS[0],
      notes: income.notes || '',
      payDates,
      payActuals
    };
  });

  // Totals (month-aware)
  const totalProjectedIncome = incomeData.reduce((total, income) => {
    return total + getMonthAwareMonthlyAmount(income, 'projected');
  }, 0);

  const totalActualIncome = incomeData.reduce((total, income) => {
    return total + getMonthAwareMonthlyAmount(income, 'actual');
  }, 0);

  // === ANALYTICS HELPERS ===
  const buildIncomeAnalytics = (data) => {
    const rows = data.map((inc) => {
      const projected = getMonthAwareMonthlyAmount(inc, 'projected');
      const actual = getMonthAwareMonthlyAmount(inc, 'actual');
      const variance = actual - projected;
      return {
        id: inc.id,
        name: inc.name || 'Untitled',
        account: inc.account || 'Unassigned',
        frequency: inc.frequency || 'monthly',
        projected,
        actual,
        variance
      };
    });

    const topNegative = [...rows].sort((a, b) => a.variance - b.variance).slice(0, 5);
    const topPositive = [...rows].sort((a, b) => b.variance - a.variance).slice(0, 5);

    const byAccountMap = rows.reduce((acc, r) => {
      acc[r.account] = (acc[r.account] || 0) + r.actual;
      return acc;
    }, {});
    const byAccount = Object.entries(byAccountMap)
      .map(([account, actual]) => ({ account, actual }))
      .sort((a, b) => b.actual - a.actual);

    const chart = rows; // reuse rows (label + projected + actual)
    return { rows, topNegative, topPositive, byAccount, chart };
  };

  // === ANALYTICS DATA ===
  const analytics = buildIncomeAnalytics(incomeData);

  // === MONTH TOTALS / VARIANCE ===
  const incomeVariance = totalActualIncome - totalProjectedIncome;
  const variancePercentage =
    totalProjectedIncome > 0 ? (incomeVariance / totalProjectedIncome) * 100 : 0;

  // === FORM INPUT HANDLER ===
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' ? sanitizeInput(value) : value
    }));
  };

  // Save/add income
  const handleSubmit = (e) => {
    e.preventDefault();

    // Only require name + projected
    const hasName = formData.name && formData.name.trim() !== '';
    const projected = parseAmount(formData.projectedAmount);
    if (!hasName || isNaN(projected)) {
      alert('Please enter a name and a projected amount.');
      return;
    }

    // Sum per-date actuals if provided
    const actualFromEntries = Array.isArray(formData.payActuals)
      ? formData.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0)
      : 0;

    // If user typed an Overall Actual, use it; otherwise per-date sum; otherwise 0
    const actual = formData.actualAmount
      ? parseAmount(formData.actualAmount)
      : actualFromEntries;

    // Define weekly splits
    const weeks = Array(5).fill(projected > 0 ? projected / 5 : 0);
    const actualWeeks = Array(5).fill(actual > 0 ? actual / 5 : 0);

    const incomeItem = {
      ...formData,
      projectedAmount: projected,
      actualAmount: actual,
      amount: projected, // Maintain backward compatibility
      weeks,
      actualWeeks,
      payDates: Array.isArray(formData.payDates) ? formData.payDates : [],
      payActuals: Array.isArray(formData.payActuals) ? formData.payActuals : [],
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

  // Accounts list: collect from state + monthly/annual + defaults
  const accountsFromMonthly = Object.values(state?.data?.monthly || {})
    .flat()
    .map(e => (typeof e?.account === 'string' ? e.account.trim() : ''))
    .filter(Boolean);

  const accountsFromAnnual = Object.values(state?.data?.annual || {})
    .flat()
    .map(e => (typeof e?.account === 'string' ? e.account.trim() : ''))
    .filter(Boolean);

  const accountsFromState = Array.isArray(state?.data?.accounts)
    ? state.data.accounts
        .map(a => (typeof a === 'string' ? a.trim() : ''))
        .filter(Boolean)
    : [];

  // Build account options only from saved data (no defaults)
const ACCOUNT_OPTIONS = Array.from(
  new Set([...accountsFromState, ...accountsFromMonthly, ...accountsFromAnnual])
);



const handleEdit = (index) => {
  const income = incomeData[index];
  setFormData({
    name: income.name || '',
    projectedAmount: income.projectedAmount?.toString() || '',
    actualAmount: income.actualAmount?.toString() || '',
    frequency: income.frequency || 'monthly',
    // If there isn't a valid account on the row, leave it blank
    account: (typeof income.account === 'string' && income.account.trim())
      ? income.account.trim()
      : '',
    notes: income.notes || '',
    weeks: Array.isArray(income.weeks) ? income.weeks : Array(5).fill(0),
    actualWeeks: Array.isArray(income.actualWeeks) ? income.actualWeeks : Array(5).fill(0),
    payDates: Array.isArray(income.payDates) ? income.payDates : [],
    payActuals: Array.isArray(income.payActuals) ? income.payActuals : []
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

const handleDelete = (index) => {
  if (window.confirm('Are you sure you want to delete this income source?')) {
    const newIncomeData = incomeData.filter((_, i) => i !== index);
    actions.updateIncome(newIncomeData);
  }
};

const resetForm = () => {
  setFormData({
    name: '',
    frequency: 'monthly',
    projectedAmount: '',
    actualAmount: '',
    account: ACCOUNT_OPTIONS[0] ?? '', // <- leave blank if none exist
    notes: '',
    weeks: Array(5).fill(0),
    actualWeeks: Array(5).fill(0),
    payDates: [],
    payActuals: []
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
    const projectedMonthly = getMonthAwareMonthlyAmount(income, 'projected');
    const actualMonthly = getMonthAwareMonthlyAmount(income, 'actual');
    const variance = actualMonthly - projectedMonthly;
    const row = [
      income.name || '',
      projectedMonthly || 0,
      actualMonthly || 0,
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

        /* --- Analytics layout --- */
        .analytics-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .analytics-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .a-card {
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }

        .a-card.pos .a-value { color: #059669; }
        .a-card.neg .a-value { color: #dc2626; }

        .a-title {
          color: #6b7280;
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .a-value {
          font-weight: 800;
          font-size: 1.4rem;
        }

        .a-sub {
          color: #6b7280;
          font-size: 0.85rem;
          margin-top: 6px;
        }

        .a-panel {
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }

        .a-panel-title {
          font-weight: 700;
          margin-bottom: 10px;
          color: #111827;
        }

        .a-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .mini-table {
          width: 100%;
          border-collapse: collapse;
        }

        .mini-table th, .mini-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
        }

        .mini-table th {
          text-align: left;
          color: #6b7280;
          font-weight: 700;
          background: #f9fafb;
        }

        .mini-table .num {
          text-align: right;
          font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
          font-weight: 600;
        }

        .mini-table .neg { color: #dc2626; }
        .mini-table .pos { color: #059669; }

        .muted { color: #9ca3af; text-align: center; }

        @media (max-width: 1024px) {
          .a-columns {
            grid-template-columns: 1fr;
          }
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
                                />
                                {/* Actual $ for that date */}
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  inputMode="decimal"
                                  className="form-input"
                                  placeholder="Actual $ for this date"
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
                            Optional: record each pay date and the actual amount received on that date.
                          </small>
                        </div>
                      )}

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
                        <label className="form-label" htmlFor="income-account">Account *</label>
                        <select
                          id="income-account"
                          className="form-select"
                          value={formData.account}
                          onChange={(e) => handleInputChange('account', e.target.value)}
                          required
                        >
                          {ACCOUNT_OPTIONS.map(acc => (
                            <option key={acc} value={acc}>{acc}</option>
                          ))}
                        </select>
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
            <strong>Actual Monthly Income:</strong> The total income you have actually received this month. Annual value = monthly × 12.
          </li>
          <li>
            <strong>Income Variance:</strong> The difference between actual and projected income. Negative means under target, positive means over target.
          </li>
          <li>
            <strong>Income Sources:</strong> The number of active income sources you’ve added to your budget.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default IncomePage;
