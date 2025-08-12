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
      body { 
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; 
        padding: 24px; 
        color: #111827;
        line-height: 1.3;
      }
      h1 { margin: 0 0 12px; font-size: 20px; }
      h2 { margin: 16px 0 8px; font-size: 16px; }
      h3 { margin: 12px 0 6px; font-size: 14px; }
      h4 { margin: 10px 0 6px; font-size: 13px; }
      .kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 10px; margin: 10px 0 16px; }
      .tile { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
      .tile .label { color: #6b7280; font-size: 11px; margin-bottom: 4px; }
      .tile .value { font-weight: 700; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0 16px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; font-size: 12px; }
      th { background: #f8fafc; font-weight: 600; }
      td.amount { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      tr.total-row td { background: #f9fafb; font-weight: 700; }
      .positive { color: #059669; }
      .negative { color: #dc2626; }
      .muted { color: #6b7280; }
      @media print {
        @page { 
          size: Letter; 
          margin: 0.6in;
        }
        body { 
          padding: 0; 
          font-size: 10px;
          line-height: 1.2;
        }
        h1 { font-size: 16px; page-break-after: avoid; margin-bottom: 8px; }
        h2 { font-size: 14px; page-break-after: avoid; margin: 12px 0 6px 0; }
        h3 { font-size: 12px; page-break-after: avoid; margin: 8px 0 4px 0; }
        table { page-break-inside: auto; font-size: 8px; margin: 6px 0 10px 0; }
        th, td { padding: 3px 5px; font-size: 8px; }
        .kpi { grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0 10px 0; }
        .tile { padding: 6px; }
        .tile .label { font-size: 8px; margin-bottom: 2px; }
        .tile .value { font-size: 10px; }
      }
    </style>
  `,
  wrap(title, body) {
    const hasCharts = body.includes('id="pieChart"') || body.includes('id="barChart"');
    const printScript = hasCharts 
      ? '' // Charts handle their own printing timing
      : '<script>window.onload = () => setTimeout(() => window.print(), 800);</script>';
    
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
          ${printScript}
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
  sectionExpenseCategories({ formatCurrency, monthly, annual }) {
    // Process monthly categories
    const monthlyCategoryTotals = Object.entries(monthly || {}).map(([category, items]) => ({
      category,
      total: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0),
      count: (items || []).length,
      monthlyImpact: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0),
      items: items || []
    }));

    // Process annual categories (show monthly impact)
    const annualCategoryTotals = Object.entries(annual || {}).map(([category, items]) => ({
      category,
      total: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0),
      count: (items || []).length,
      monthlyImpact: (items || []).reduce((s, e) => s + parseAmount(e.actual ?? e.amount ?? 0), 0) / 12,
      items: items || []
    }));

    // Combine for totals
    const allCategories = {};
    monthlyCategoryTotals.forEach(cat => {
      allCategories[cat.category] = {
        monthlyDirect: cat.monthlyImpact,
        monthlyFromAnnual: 0,
        totalMonthlyImpact: cat.monthlyImpact,
        monthlyItems: cat.items,
        annualItems: []
      };
    });

    annualCategoryTotals.forEach(cat => {
      if (allCategories[cat.category]) {
        allCategories[cat.category].monthlyFromAnnual = cat.monthlyImpact;
        allCategories[cat.category].totalMonthlyImpact += cat.monthlyImpact;
        allCategories[cat.category].annualItems = cat.items;
      } else {
        allCategories[cat.category] = {
          monthlyDirect: 0,
          monthlyFromAnnual: cat.monthlyImpact,
          totalMonthlyImpact: cat.monthlyImpact,
          monthlyItems: [],
          annualItems: cat.items
        };
      }
    });

    const sortedCategories = Object.entries(allCategories).sort((a, b) => b[1].totalMonthlyImpact - a[1].totalMonthlyImpact);
    const totalMonthlyImpact = sortedCategories.reduce((s, [, data]) => s + data.totalMonthlyImpact, 0);

    // Prepare data for charts
    const chartData = sortedCategories.map(([category, data]) => ({
      category,
      amount: data.totalMonthlyImpact,
      percentage: totalMonthlyImpact > 0 ? (data.totalMonthlyImpact / totalMonthlyImpact * 100) : 0
    }));

    const chartLabels = JSON.stringify(chartData.map(d => d.category));
    const chartValues = JSON.stringify(chartData.map(d => d.amount));
    const chartPercentages = JSON.stringify(chartData.map(d => d.percentage));

    // Colors for charts
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
      '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308'
    ];
    const backgroundColors = JSON.stringify(colors);
    const borderColors = JSON.stringify(colors.map(c => c + 'dd'));

    return `
      <h2>Expense Categories Analysis</h2>
      
      <div class="kpi">
        <div class="tile">
          <div class="label">Total Monthly Impact</div>
          <div class="value">${formatCurrency(totalMonthlyImpact)}</div>
        </div>
        <div class="tile">
          <div class="label">Total Categories</div>
          <div class="value">${sortedCategories.length}</div>
        </div>
        <div class="tile">
          <div class="label">Largest Category</div>
          <div class="value">${sortedCategories.length > 0 ? sortedCategories[0][0] : 'N/A'}</div>
        </div>
        <div class="tile">
          <div class="label">Annual Equivalent</div>
          <div class="value">${formatCurrency(totalMonthlyImpact * 12)}</div>
        </div>
      </div>

      <div class="charts-container">
        <div class="chart-card">
          <h3>Expense Distribution</h3>
          <div class="chart-wrapper pie-chart-wrapper">
            <canvas id="pieChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3>Monthly Impact by Category</h3>
          <div class="chart-wrapper bar-chart-wrapper">
            <canvas id="barChart"></canvas>
          </div>
        </div>
      </div>

      <h3>Category Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Category</th>
            <th style="width: 15%;">Monthly Direct</th>
            <th style="width: 15%;">Monthly from Annual</th>
            <th style="width: 15%;">Total Monthly Impact</th>
            <th style="width: 10%;">% of Total</th>
            <th style="width: 10%;">Items (Mo.)</th>
            <th style="width: 10%;">Items (Ann.)</th>
          </tr>
        </thead>
        <tbody>
          ${sortedCategories.map(([category, data]) => {
            const percentage = totalMonthlyImpact > 0 ? (data.totalMonthlyImpact / totalMonthlyImpact * 100) : 0;
            return `
              <tr>
                <td><strong>${category}</strong></td>
                <td class="amount">${formatCurrency(data.monthlyDirect)}</td>
                <td class="amount">${formatCurrency(data.monthlyFromAnnual)}</td>
                <td class="amount"><strong>${formatCurrency(data.totalMonthlyImpact)}</strong></td>
                <td class="amount">${percentage.toFixed(1)}%</td>
                <td class="amount">${data.monthlyItems.length}</td>
                <td class="amount">${data.annualItems.length}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td>Total</td>
            <td class="amount">${formatCurrency(monthlyCategoryTotals.reduce((s, c) => s + c.monthlyImpact, 0))}</td>
            <td class="amount">${formatCurrency(annualCategoryTotals.reduce((s, c) => s + c.monthlyImpact, 0))}</td>
            <td class="amount">${formatCurrency(totalMonthlyImpact)}</td>
            <td class="amount">100.0%</td>
            <td class="amount">${monthlyCategoryTotals.reduce((s, c) => s + c.count, 0)}</td>
            <td class="amount">${annualCategoryTotals.reduce((s, c) => s + c.count, 0)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Detailed Category Items</h3>
      ${sortedCategories.map(([category, data]) => {
        if (data.monthlyItems.length === 0 && data.annualItems.length === 0) return '';
        
        return `
          <h4 style="margin-top: 20px; color: #374151;">${category} - ${formatCurrency(data.totalMonthlyImpact)}/mo</h4>
          ${data.monthlyItems.length > 0 ? `
            <table style="margin-bottom: 12px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th colspan="4">Monthly Expenses</th>
                </tr>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.monthlyItems.map(item => `
                  <tr>
                    <td>${item.name || 'Untitled'}</td>
                    <td class="amount">${formatCurrency(parseAmount(item.actual ?? item.amount))}</td>
                    <td>${item.accountId || '-'}</td>
                    <td>${item.paid ? '✅ Paid' : '⏳ Pending'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          ${data.annualItems.length > 0 ? `
            <table>
              <thead>
                <tr style="background: #fef3c7;">
                  <th colspan="5">Annual Expenses (showing monthly impact)</th>
                </tr>
                <tr>
                  <th>Item</th>
                  <th>Annual Amount</th>
                  <th>Monthly Impact</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.annualItems.map(item => `
                  <tr>
                    <td>${item.name || 'Untitled'}</td>
                    <td class="amount">${formatCurrency(parseAmount(item.actual ?? item.amount))}</td>
                    <td class="amount">${formatCurrency(parseAmount(item.actual ?? item.amount) / 12)}</td>
                    <td>${item.date || item.dueDate ? new Date(item.date || item.dueDate).toLocaleDateString() : '-'}</td>
                    <td>${item.paid ? '✅ Paid' : '⏳ Pending'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        `;
      }).join('')}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
      <script>
        // Prevent multiple print dialogs
        let printTriggered = false;
        
        // Wait for Chart.js to load and charts to render before printing
        window.addEventListener('load', function() {
          if (typeof Chart !== 'undefined') {
            const labels = ${chartLabels};
            const data = ${chartValues};
            const percentages = ${chartPercentages};
            const backgroundColors = ${backgroundColors};
            const borderColors = ${borderColors};
            
            let chartsRendered = 0;
            const totalCharts = 2;
            
            function triggerPrint() {
              if (!printTriggered) {
                printTriggered = true;
                setTimeout(() => {
                  window.print();
                }, 800);
              }
            }
            
            function chartComplete() {
              chartsRendered++;
              if (chartsRendered >= totalCharts) {
                triggerPrint();
              }
            }

            // Pie Chart
            const pieCtx = document.getElementById('pieChart');
            if (pieCtx) {
              new Chart(pieCtx, {
                type: 'pie',
                data: {
                  labels: labels,
                  datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: {
                    duration: 0,
                    onComplete: chartComplete
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        font: { size: 10 },
                        padding: 8,
                        boxWidth: 12,
                        usePointStyle: false,
                        generateLabels: function(chart) {
                          const data = chart.data;
                          return data.labels.map((label, i) => ({
                            text: label + ' (' + percentages[i].toFixed(1) + '%)',
                            fillStyle: data.datasets[0].backgroundColor[i],
                            strokeStyle: data.datasets[0].borderColor[i],
                            lineWidth: 1,
                            index: i
                          }));
                        }
                      }
                    },
                    tooltip: { enabled: false }
                  },
                  layout: {
                    padding: {
                      top: 5,
                      bottom: 5,
                      left: 5,
                      right: 5
                    }
                  }
                }
              });
            } else {
              chartComplete();
            }

            // Bar Chart
            const barCtx = document.getElementById('barChart');
            if (barCtx) {
              new Chart(barCtx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [{
                    label: 'Monthly Impact',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.5,
                  animation: {
                    duration: 0,
                    onComplete: chartComplete
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        font: { size: 9 },
                        callback: function(value) {
                          return new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(value);
                        }
                      }
                    },
                    x: {
                      ticks: {
                        font: { size: 8 },
                        maxRotation: 45,
                        minRotation: 0
                      }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                  },
                  layout: {
                    padding: {
                      top: 10,
                      bottom: 5,
                      left: 5,
                      right: 5
                    }
                  }
                }
              });
            } else {
              chartComplete();
            }
          } else {
            // Fallback if Chart.js doesn't load
            if (!printTriggered) {
              printTriggered = true;
              setTimeout(() => window.print(), 1500);
            }
          }
        });
      </script>

      <style>
        .charts-container { 
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 16px 0;
        }
        .chart-card {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          page-break-inside: avoid;
        }
        .chart-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #374151;
          text-align: center;
        }
        .chart-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .pie-chart-wrapper {
          height: 280px;
          width: 280px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .bar-chart-wrapper {
          height: 280px;
          width: 100%;
        }
        .chart-card canvas {
          max-width: 100%;
          max-height: 100%;
        }
        @media print {
          body { 
            margin: 0.5in;
            font-size: 11px;
            line-height: 1.2;
          }
          h2 {
            margin: 8px 0 6px 0;
            font-size: 16px;
          }
          .kpi {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin: 8px 0 12px 0 !important;
          }
          .tile {
            padding: 6px !important;
            font-size: 9px !important;
          }
          .tile .label {
            font-size: 8px !important;
            margin-bottom: 3px !important;
          }
          .tile .value {
            font-size: 11px !important;
          }
          .charts-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
            margin: 12px 0 !important;
            page-break-inside: avoid;
          }
          .chart-card {
            margin-bottom: 15px;
            page-break-inside: avoid;
            background: #fff !important;
            border: 1px solid #ccc !important;
            padding: 15px;
            box-shadow: none !important;
          }
          .chart-card h3 {
            font-size: 12px !important;
            margin-bottom: 10px !important;
          }
          .pie-chart-wrapper {
            height: 220px !important;
            width: 220px !important;
            margin: 0 auto;
          }
          .bar-chart-wrapper {
            height: 200px !important;
            width: 100% !important;
          }
          .chart-card canvas {
            width: 100% !important;
            height: 100% !important;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }
          table {
            page-break-inside: auto;
            font-size: 9px !important;
            margin: 8px 0 12px 0 !important;
          }
          th, td {
            padding: 4px 6px !important;
            font-size: 9px !important;
          }
        }
        @media (max-width: 768px) {
          .charts-container {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    `;
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

  const handlePrintExpenseCategories = () => {
    const html = ReportsPrint.sectionExpenseCategories({
      formatCurrency,
      monthly: data.monthly || {},
      annual: data.annual || {}
    });
    ReportsPrint.open(html, 'Expense Categories Analysis');
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

      <Card title="Expense Categories Analysis">
        <p>Interactive visual breakdown of expenses by category with pie charts, bar charts, and detailed analysis. Shows monthly impact from both monthly and annual expenses.</p>
        <div style={{ marginTop: 8 }}>
          <Button variant="outline" onClick={handlePrintExpenseCategories}>📊 Print Interactive Expense Analysis</Button>
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