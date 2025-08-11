// src/pages/ReportsPage.js
import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

/**
 * ----------------------------------------------------------------------------
 * Helpers (kept here so Reports works even if printUtils isn't loaded)
 * ----------------------------------------------------------------------------
 */

const parseAmount = (v) => {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Mirrors IncomePage/useBudgetCalculations month-aware logic
const monthAwareIncome = (income, which = 'projected') => {
  const hasDates = Array.isArray(income.payDates) && income.payDates.length > 0;
  const perCheckProjected = parseAmount(income.projectedAmount ?? income.amount);
  const perCheckActual = parseAmount(income.actualAmount);

  if (which === 'actual') {
    // 1) If per-date actuals exist, sum them (month-aware)
    if (Array.isArray(income.payActuals) && income.payActuals.length > 0) {
      return income.payActuals.reduce((s, v) => s + (parseAmount(v) || 0), 0);
    }
    // 2) If overall actual is a monthly total, just use it
    if (income.actualMode === 'monthly-total') {
      return perCheckActual || 0;
    }
    // 3) Otherwise treat overall actual as per-paycheck
    switch (income.frequency) {
      case 'weekly':
        return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (52 / 12);
      case 'bi-weekly':
        return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (26 / 12);
      case 'semi-monthly':
        return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * 2;
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
    case 'semi-monthly':
      return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * 2;
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

const ReportsPrint = {
  currency: (n) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);
    } catch {
      return `$${(n || 0).toFixed(2)}`;
    }
  },
  // very small stylesheet to make the prints neat
  baseStyles: `
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { margin: 0 0 16px; font-size: 22px; }
      h2 { margin: 24px 0 8px; font-size: 18px; }
      .kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; margin: 12px 0 20px; }
      .tile { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
      .tile .label { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
      .tile .value { font-weight: 700; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 13px; }
      th { background: #f8fafc; }
      td.amount { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      tr.total-row td { background: #f9fafb; font-weight: 700; }
      .positive { color: #059669; }
      .negative { color: #dc2626; }
      .muted { color: #6b7280; }
    </style>
  `,
  wrap(title, body) {
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          ${this.baseStyles}
        </head>
        <body>
          <h1>${title}</h1>
          ${body}
          <script>window.onload = () => setTimeout(() => window.print(), 50);</script>
        </body>
      </html>
    `;
  },
  open(html, title = 'Report') {
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (w) {
      w.document.open();
      w.document.write(this.wrap(title, html));
      w.document.close();
    }
  },
  // --------------------------------------------------------------
  // Sections
  // --------------------------------------------------------------
  sectionFinancialSummary({ formatCurrency, projectedIncome, actualIncome, totalMonthlyExpenses, monthlyAnnualImpact, totalAnnualExpenses }) {
    const projectedNetMonthly = projectedIncome - totalMonthlyExpenses - monthlyAnnualImpact;
    const actualNetMonthly = actualIncome - totalMonthlyExpenses - monthlyAnnualImpact;
    const projectedSavingsRate = projectedIncome > 0 ? (projectedNetMonthly / projectedIncome) * 100 : 0;
    const actualSavingsRate = actualIncome > 0 ? (actualNetMonthly / actualIncome) * 100 : 0;

    return `
      <h2>Financial Summary</h2>
      <div class="kpi">
        <div class="tile"><div class="label">Projected Monthly Income</div><div class="value">${formatCurrency(projectedIncome)}</div></div>
        <div class="tile"><div class="label">Actual Month-to-Date Income</div><div class="value">${formatCurrency(actualIncome)}</div></div>
        <div class="tile"><div class="label">Monthly Expenses</div><div class="value">${formatCurrency(totalMonthlyExpenses)}</div></div>
        <div class="tile"><div class="label">Monthly Portion of Annual</div><div class="value">${formatCurrency(monthlyAnnualImpact)}</div></div>
        <div class="tile"><div class="label">Projected Net / mo</div><div class="value ${projectedNetMonthly>=0?'positive':'negative'}">${formatCurrency(projectedNetMonthly)}</div></div>
        <div class="tile"><div class="label">Actual Net / mo</div><div class="value ${actualNetMonthly>=0?'positive':'negative'}">${formatCurrency(actualNetMonthly)}</div></div>
        <div class="tile"><div class="label">Projected Savings Rate</div><div class="value">${projectedSavingsRate.toFixed(1)}%</div></div>
        <div class="tile"><div class="label">Actual Savings Rate</div><div class="value">${actualSavingsRate.toFixed(1)}%</div></div>
        <div class="tile"><div class="label">Total Annual Expenses</div><div class="value">${formatCurrency(totalAnnualExpenses)}</div></div>
      </div>
    `;
  },
  sectionIncomeDetails({ formatCurrency, income }) {
    const projectedTotal = (income || []).reduce((s, inc) => s + monthAwareIncome(inc, 'projected'), 0);
    const actualTotal = (income || []).reduce((s, inc) => s + monthAwareIncome(inc, 'actual'), 0);

    let body = `
      <h2>Income Details</h2>
      <table>
        <thead>
          <tr>
            <th style="width:35%;">Income Source</th>
            <th style="width:15%;">Projected (mo.)</th>
            <th style="width:15%;">Actual (mo.)</th>
            <th style="width:15%;">Variance</th>
            <th style="width:10%;">% of Projected</th>
            <th style="width:10%;">Annual (proj.)</th>
          </tr>
        </thead>
        <tbody>
    `;

    (income || []).forEach((inc) => {
      const projected = monthAwareIncome(inc, 'projected');
      const actual = monthAwareIncome(inc, 'actual');
      const variance = actual - projected;
      const pct = projectedTotal > 0 ? (projected / projectedTotal) * 100 : 0;

      body += `
        <tr>
          <td><strong>${inc.name || 'Untitled'}</strong> <span class="muted">(${inc.frequency || 'monthly'})</span></td>
          <td class="amount">${formatCurrency(projected)}</td>
          <td class="amount">${formatCurrency(actual)}</td>
          <td class="amount ${variance>=0?'positive':'negative'}">${formatCurrency(variance)}</td>
          <td class="amount">${pct.toFixed(1)}%</td>
          <td class="amount">${formatCurrency(projected * 12)}</td>
        </tr>
      `;
    });

    body += `
      <tr class="total-row">
        <td>Totals</td>
        <td class="amount">${formatCurrency(projectedTotal)}</td>
        <td class="amount">${formatCurrency(actualTotal)}</td>
        <td class="amount">${formatCurrency(actualTotal - projectedTotal)}</td>
        <td class="amount">100.0%</td>
        <td class="amount">${formatCurrency(projectedTotal * 12)}</td>
      </tr>
      </tbody>
      </table>
    `;
    return body;
  },
  sectionExpenseStatus({ formatCurrency, monthly, annual }) {
    const rows = [];

    // Monthly expenses
    Object.entries(monthly || {}).forEach(([category, items]) => {
      (items || []).forEach((e) => {
        rows.push({
          category,
          name: e.name || 'Untitled',
          freq: 'Monthly',
          amount: parseAmount(e.actual ?? e.amount ?? 0),
          account: e.accountId || '',
          date: e.date || '',
          paid: !!e.paid,
          transferred: !!e.transferred,
        });
      });
    });

    // Annual expenses (show monthly impact and due date)
    Object.entries(annual || {}).forEach(([category, items]) => {
      (items || []).forEach((e) => {
        const monthlyImpact = parseAmount(e.actual ?? e.amount ?? 0) / 12;
        rows.push({
          category,
          name: e.name || 'Untitled',
          freq: e.frequency || 'Annual',
          amount: monthlyImpact,
          account: e.accountId || '',
          date: e.date || e.dueDate || '',
          paid: !!e.paid,
          transferred: !!e.transferred,
        });
      });
    });

    let body = `
      <h2>Expense Status (Monthly view)</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Expense</th>
            <th>Freq.</th>
            <th>Account</th>
            <th>Date</th>
            <th style="width:12%;">Paid</th>
            <th style="width:12%;">Transferred</th>
            <th class="amount">Monthly Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    let total = 0;
    rows.forEach((r) => {
      total += r.amount || 0;
      body += `
        <tr>
          <td>${r.category}</td>
          <td>${r.name}</td>
          <td>${r.freq}</td>
          <td>${r.account || '-'}</td>
          <td>${r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
          <td>${r.paid ? 'Yes' : 'No'}</td>
          <td>${r.transferred ? 'Yes' : 'No'}</td>
          <td class="amount">${formatCurrency(r.amount || 0)}</td>
        </tr>
      `;
    });

    body += `
      <tr class="total-row">
        <td colspan="7">Total</td>
        <td class="amount">${formatCurrency(total)}</td>
      </tr>
      </tbody>
      </table>
    `;

    return body;
  },
  sectionCompleteBudget({ formatCurrency, monthly, annual, income }) {
    // Monthly totals by category
    const monthlyCategoryTotals = Object.entries(monthly || {}).map(([category, items]) => ({
      category,
      total: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0),
      count: (items || []).length,
    }));

    const annualCategoryTotals = Object.entries(annual || {}).map(([category, items]) => ({
      category,
      total: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0),
      count: (items || []).length,
    }));

    const projectedIncomeTotal = (income || []).reduce((s, inc) => s + monthAwareIncome(inc, 'projected'), 0);

    let body = `
      <h2>Complete Budget (Snapshot)</h2>
      <div class="kpi">
        <div class="tile"><div class="label">Projected Income (mo.)</div><div class="value">${formatCurrency(projectedIncomeTotal)}</div></div>
        <div class="tile"><div class="label">Monthly Expenses</div><div class="value">${formatCurrency(monthlyCategoryTotals.reduce((s,x)=>s+x.total,0))}</div></div>
        <div class="tile"><div class="label">Annual Expenses (total)</div><div class="value">${formatCurrency(annualCategoryTotals.reduce((s,x)=>s+x.total,0))}</div></div>
      </div>
      <h3>Monthly Categories</h3>
      <table>
        <thead><tr><th>Category</th><th>Items</th><th class="amount">Total (mo.)</th></tr></thead>
        <tbody>
          ${monthlyCategoryTotals.map(row => `
            <tr><td>${row.category}</td><td>${row.count}</td><td class="amount">${formatCurrency(row.total)}</td></tr>
          `).join('')}
          <tr class="total-row">
            <td>All Monthly</td><td>${monthlyCategoryTotals.reduce((s,x)=>s+x.count,0)}</td>
            <td class="amount">${formatCurrency(monthlyCategoryTotals.reduce((s,x)=>s+x.total,0))}</td>
          </tr>
        </tbody>
      </table>

      <h3>Annual Categories</h3>
      <table>
        <thead><tr><th>Category</th><th>Items</th><th class="amount">Total (annual)</th></tr></thead>
        <tbody>
          ${annualCategoryTotals.map(row => `
            <tr><td>${row.category}</td><td>${row.count}</td><td class="amount">${formatCurrency(row.total)}</td></tr>
          `).join('')}
          <tr class="total-row">
            <td>All Annual</td><td>${annualCategoryTotals.reduce((s,x)=>s+x.count,0)}</td>
            <td class="amount">${formatCurrency(annualCategoryTotals.reduce((s,x)=>s+x.total,0))}</td>
          </tr>
        </tbody>
      </table>
    `;
    return body;
  }
};

/**
 * ----------------------------------------------------------------------------
 * Reports Page
 * ----------------------------------------------------------------------------
 */
const ReportsPage = () => {
  const { state, calculations, formatCurrency: formatCurrencyFromCtx } = useBudget();
  const data = state?.data || {};

  const formatCurrency = (n) => {
    if (typeof formatCurrencyFromCtx === 'function') return formatCurrencyFromCtx(n || 0);
    return ReportsPrint.currency(n || 0);
    };

  // Derive top-level figures using the same logic as the rest of the app
  const figures = useMemo(() => {
    const projectedIncome = calculations.getTotalProjectedIncome
      ? calculations.getTotalProjectedIncome()
      : (data.income || []).reduce((s, inc) => s + monthAwareIncome(inc, 'projected'), 0);

    const actualIncome = calculations.getTotalActualIncome
      ? calculations.getTotalActualIncome()
      : (data.income || []).reduce((s, inc) => s + monthAwareIncome(inc, 'actual'), 0);

    const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses
      ? calculations.getTotalMonthlyExpenses()
      : Object.values(data.monthly || {}).flat().reduce((s,e)=> s + parseAmount(e.actual ?? e.amount ?? 0), 0);

    const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact
      ? calculations.getMonthlyAnnualImpact()
      : (Object.values(data.annual || {}).flat().reduce((s,e)=> s + parseAmount(e.actual ?? e.amount ?? 0), 0) / 12);

    const totalAnnualExpenses = calculations.getTotalAnnualExpenses
      ? calculations.getTotalAnnualExpenses()
      : Object.values(data.annual || {}).flat().reduce((s,e)=> s + parseAmount(e.actual ?? e.amount ?? 0), 0);

    return {
      projectedIncome,
      actualIncome,
      totalMonthlyExpenses,
      monthlyAnnualImpact,
      totalAnnualExpenses
    };
  }, [data, calculations]);

  const handlePrintSummary = () => {
    const html = ReportsPrint.sectionFinancialSummary({
      formatCurrency,
      projectedIncome: figures.projectedIncome,
      actualIncome: figures.actualIncome,
      totalMonthlyExpenses: figures.totalMonthlyExpenses,
      monthlyAnnualImpact: figures.monthlyAnnualImpact,
      totalAnnualExpenses: figures.totalAnnualExpenses,
    });
    ReportsPrint.open(html, 'Financial Summary');
  };

  const handlePrintIncome = () => {
    const html = ReportsPrint.sectionIncomeDetails({
      formatCurrency,
      income: data.income || []
    });
    ReportsPrint.open(html, 'Income Details');
  };

  const handlePrintExpenseStatus = () => {
    const html = ReportsPrint.sectionExpenseStatus({
      formatCurrency,
      monthly: data.monthly || {},
      annual: data.annual || {}
    });
    ReportsPrint.open(html, 'Expense Status (Monthly View)');
  };

  const handlePrintCompleteBudget = () => {
    const html = ReportsPrint.sectionCompleteBudget({
      formatCurrency,
      monthly: data.monthly || {},
      annual: data.annual || {},
      income: data.income || []
    });
    ReportsPrint.open(html, 'Complete Budget Snapshot');
  };

  // ---- UI ----
  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 className="page-title">📈 Reports</h2>
        <p className="page-description">Print-ready reports that use the same month-aware math as the Income page.</p>
      </div>

      <Card title="Financial Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
          <KPI label="Projected Monthly Income" value={formatCurrency(figures.projectedIncome)} />
          <KPI label="Actual Month-to-Date Income" value={formatCurrency(figures.actualIncome)} />
          <KPI label="Monthly Expenses" value={formatCurrency(figures.totalMonthlyExpenses)} />
          <KPI label="Monthly Portion of Annual" value={formatCurrency(figures.monthlyAnnualImpact)} />
          <KPI
            label="Projected Net / mo"
            value={formatCurrency(figures.projectedIncome - figures.totalMonthlyExpenses - figures.monthlyAnnualImpact)}
          />
          <KPI
            label="Actual Net / mo"
            value={formatCurrency(figures.actualIncome - figures.totalMonthlyExpenses - figures.monthlyAnnualImpact)}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Button variant="outline" onClick={handlePrintSummary}>🖨️ Print Financial Summary</Button>
        </div>
      </Card>

      <Card title="Income Details">
        <p>Breakdown of each income source with month-aware projected vs actual and variance.</p>
        <div style={{ marginTop: 8 }}>
          <Button variant="outline" onClick={handlePrintIncome}>🖨️ Print Income Details</Button>
        </div>
      </Card>

      <Card title="Expense Status (Monthly view)">
        <p>Shows monthly expense items and annual items (as monthly impact), including paid/transferred status.</p>
        <div style={{ marginTop: 8 }}>
          <Button variant="outline" onClick={handlePrintExpenseStatus}>🖨️ Print Expense Status</Button>
        </div>
      </Card>

      <Card title="Complete Budget Snapshot">
        <p>High-level snapshot combining monthly and annual categories with a quick income summary.</p>
        <div style={{ marginTop: 8 }}>
          <Button variant="outline" onClick={handlePrintCompleteBudget}>🖨️ Print Complete Budget</Button>
        </div>
      </Card>
    </div>
  );
};

const KPI = ({ label, value }) => (
  <div style={{
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    background: '#fff'
  }}>
    <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{label}</div>
    <div style={{ fontWeight: 700 }}>{value}</div>
  </div>
);

export default ReportsPage;
