// src/utils/printUtils.js - Print Utilities for Budget Pages
import { getStatusAmount } from './expenseUtils';
export class PrintUtils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static getBasePrintStyles() {
        return `
      <style>
        @page {
          size: letter;
          margin: 0.75in;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
          background: white;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }
        
        .print-title {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 10px 0;
        }
        
        .print-subtitle {
          font-size: 14px;
          color: #7f8c8d;
          margin: 0;
        }
        
        .print-date {
          font-size: 12px;
          color: #95a5a6;
          margin: 5px 0 0 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        
        th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .category-header {
          background-color: #e9ecef !important;
          font-weight: 700;
          font-size: 12px;
          color: #495057;
        }
        
        .amount {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }
        
        .total-row {
          background-color: #f1f3f4 !important;
          font-weight: 700;
          border-top: 2px solid #2c3e50;
        }
        
        .summary-section {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border: 1px solid #dee2e6;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 10px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }
        
        .summary-item:last-child {
          border-bottom: none;
        }
        
        .summary-label {
          font-weight: 500;
          color: #495057;
        }
        
        .summary-value {
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
        
        .positive {
          color: #28a745;
        }
        
        .negative {
          color: #dc3545;
        }
        
        .warning {
          color: #ffc107;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-print {
          display: none;
        }
        
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 5px;
        }
        
        .status-paid {
          background-color: #28a745;
        }
        
        .status-transferred {
          background-color: #ffc107;
        }
        
        .status-pending {
          background-color: #6c757d;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
        }
      </style>
    `;
    }

    static openPrintWindow(htmlContent, title = 'Budget Report') {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${this.getBasePrintStyles()}
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
          };
          
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
      </html>
    `);
        printWindow.document.close();
    }

    static generatePrintHeader(title, subtitle = '') {
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
      <div class="print-header">
        <h1 class="print-title">${title}</h1>
        ${subtitle ? `<p class="print-subtitle">${subtitle}</p>` : ''}
        <p class="print-date">Generated on ${currentDate}</p>
      </div>
    `;
    }
}

// Specific print functions for each page
export class WeeklyPlannerPrint extends PrintUtils {
    static generatePrintContent(data, calculations, formatCurrency) {
        const weekTotals = calculations.getWeeklyPlannerTotals();
        const weeklyIncome = calculations.getWeeklyIncome();

        let html = this.generatePrintHeader(
            'Weekly Budget Planner',
            'Detailed weekly expense planning and cash flow analysis'
        );

        // Income Summary
        html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 10px 0; color: #28a745;">💵 Weekly Income Summary</h3>
        <div class="summary-grid">
          ${Array.from({ length: 5 }, (_, i) => `
            <div class="summary-item">
              <span class="summary-label">Week ${i + 1}:</span>
              <span class="summary-value positive">${formatCurrency(weeklyIncome[i])}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        // Main Planner Table
        html += `
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Expense Category</th>
            <th style="width: 12%;">Monthly Amount</th>
            ${Array.from({ length: 5 }, (_, i) => `
              <th style="width: 10%;">Week ${i + 1}</th>
            `).join('')}
            <th style="width: 12%;">Remaining</th>
          </tr>
        </thead>
        <tbody>
    `;

        // Process expense data by category
        const groupedExpenses = this.groupExpensesByCategory(data);

        Object.entries(groupedExpenses).forEach(([categoryKey, category]) => {
            // Category header
            html += `
        <tr class="category-header">
          <td colspan="7"><strong>${category.name}</strong></td>
        </tr>
      `;

            // Category expenses
            category.expenses.forEach(expense => {
                const plannerData = data.plannerState?.[expense.name] || {
                    weeks: Array(5).fill(0),
                    transferred: Array(5).fill(false),
                    paid: Array(5).fill(false)
                };

                const weeklySum = plannerData.weeks.reduce((sum, amount) => sum + amount, 0);
                const remaining = expense.monthlyAmount - weeklySum;

                html += `
          <tr>
            <td style="padding-left: 20px;">
              ${expense.name}
              ${expense.isAnnual ? '<br><small style="color: #6c757d; font-style: italic;">(Annual: ' + formatCurrency(expense.originalAnnualAmount) + ')</small>' : ''}
            </td>
            <td class="amount">${formatCurrency(expense.monthlyAmount)}</td>
            ${plannerData.weeks.map((amount, weekIndex) => `
              <td class="amount">
                ${formatCurrency(amount)}
                ${plannerData.paid[weekIndex] ? '<div class="status-indicator status-paid" title="Paid"></div>' : ''}
                ${plannerData.transferred[weekIndex] ? '<div class="status-indicator status-transferred" title="Transferred"></div>' : ''}
              </td>
            `).join('')}
            <td class="amount ${Math.abs(remaining) < 0.001 ? '' : 'negative'}">${formatCurrency(remaining)}</td>
          </tr>
        `;
            });
        });

        // Totals row
        html += `
          <tr class="total-row">
            <td><strong>Weekly Expense Totals</strong></td>
            <td class="amount"><strong>${formatCurrency(weekTotals.reduce((sum, total) => sum + total, 0))}</strong></td>
            ${weekTotals.map((total, index) => `
              <td class="amount"><strong>${formatCurrency(total)}</strong></td>
            `).join('')}
            <td class="amount"><strong>${formatCurrency(weekTotals.reduce((sum, total) => sum + total, 0))}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

        // Cash Flow Analysis
        html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Weekly Cash Flow Analysis</h3>
        <div class="summary-grid">
          ${Array.from({ length: 5 }, (_, weekIndex) => {
            const balance = weeklyIncome[weekIndex] - weekTotals[weekIndex];
            return `
              <div class="summary-item">
                <div>
                  <strong>Week ${weekIndex + 1}</strong><br>
                  <small>Income: ${formatCurrency(weeklyIncome[weekIndex])}</small><br>
                  <small>Expenses: ${formatCurrency(weekTotals[weekIndex])}</small>
                </div>
                <div class="summary-value ${balance >= 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(balance)}
                </div>
              </div>
            `;
        }).join('')}
        </div>
      </div>
    `;

        return html;
    }

    static groupExpensesByCategory(data) {
        const grouped = {};

        // Process monthly expenses
        if (data.monthly) {
            Object.entries(data.monthly).forEach(([categoryKey, expenses]) => {
                if (Array.isArray(expenses)) {
                    expenses.forEach(expense => {
                        if (expense.name && expense.name.trim()) {
                            if (!grouped[categoryKey]) {
                                grouped[categoryKey] = {
                                    name: this.getCategoryName(categoryKey),
                                    expenses: []
                                };
                            }
                            grouped[categoryKey].expenses.push({
                                ...expense,
                                categoryKey,
                                monthlyAmount: parseFloat(expense.actual || expense.amount || 0),
                                type: 'monthly',
                                isAnnual: false
                            });
                        }
                    });
                }
            });
        }

        // Process annual expenses
        if (data.annual) {
            Object.entries(data.annual).forEach(([categoryKey, expenses]) => {
                if (Array.isArray(expenses)) {
                    expenses.forEach(expense => {
                        if (expense.name && expense.name.trim()) {
                            const annualCategoryKey = `annual-${categoryKey}`;
                            if (!grouped[annualCategoryKey]) {
                                grouped[annualCategoryKey] = {
                                    name: `${this.getCategoryName(categoryKey)} (Annual)`,
                                    expenses: []
                                };
                            }

                            const annualAmount = parseFloat(expense.actual || expense.amount || 0);
                            grouped[annualCategoryKey].expenses.push({
                                ...expense,
                                categoryKey: annualCategoryKey,
                                monthlyAmount: annualAmount / 12,
                                type: 'annual',
                                isAnnual: true,
                                originalAnnualAmount: annualAmount
                            });
                        }
                    });
                }
            });
        }

        return grouped;
    }

    static getCategoryName(categoryKey) {
        const categoryNames = {
            housing: 'Housing',
            taxes: 'Taxes',
            utilities: 'Utilities',
            insurance: 'Insurance',
            banking: 'Banking',
            loans: 'Loans',
            credit: 'Credit',
            subscriptions: 'Subscriptions',
            food: 'Food',
            transportation: 'Transportation',
            medical: 'Medical',
            personal: 'Personal',
            shopping: 'Shopping',
            dog: 'Dog',
            maintenance: 'Maintenance',
            gifts: 'Gifts',
            'yearly-subs': 'Yearly Subscriptions',
            'yearly-car': 'Yearly Car',
            'yearly-bank': 'Yearly Banking'
        };

        return categoryNames[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    }

    static generateStatusSummary(expenseCollection, accounts, totalProjected, formatCurrency) {
        const requiredTransfers = {};
        const paidAmounts = {};

        Object.values(expenseCollection || {}).forEach(expenses => {
            if (Array.isArray(expenses)) {
                expenses.forEach(expense => {
                    const amt = getStatusAmount(expense);
                    if (amt <= 0) return;
                    const accId = expense.accountId || 'unassigned';
                    if (expense.transferred) {
                        requiredTransfers[accId] = (requiredTransfers[accId] || 0) + amt;
                    }
                    if (expense.paid) {
                        paidAmounts[accId] = (paidAmounts[accId] || 0) + amt;
                    }
                });
            }
        });

        const accountIds = Array.from(new Set([...Object.keys(requiredTransfers), ...Object.keys(paidAmounts)]));

        const rowsHtml = accountIds.map(id => {
            const account = (Array.isArray(accounts) ? accounts : []).find(a => a.id === id);
            const name = account ? account.name : 'Unassigned';
            const required = requiredTransfers[id] || 0;
            const paid = paidAmounts[id] || 0;
            const net = required - paid;
            return `<tr><td>${name}</td><td class="amount">${formatCurrency(required)}</td><td class="amount">${formatCurrency(paid)}</td><td class="amount">${formatCurrency(net)}</td></tr>`;
        }).join('');

        const totalRequired = accountIds.reduce((sum, id) => sum + (requiredTransfers[id] || 0), 0);
        const totalPaid = accountIds.reduce((sum, id) => sum + (paidAmounts[id] || 0), 0);
        const balanceAfterPayments = totalProjected - totalPaid;

        return `
      <div class="summary-section">
        <h3>Status Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Required Transfers (Hold)</th>
              <th>Paid</th>
              <th>Net to Hold</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td><strong>Overall</strong></td>
              <td class="amount"><strong>${formatCurrency(totalRequired)}</strong></td>
              <td class="amount"><strong>${formatCurrency(totalPaid)}</strong></td>
              <td class="amount"><strong>${formatCurrency(balanceAfterPayments)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    }
}

export class MonthlyExpensesPrint extends PrintUtils {
    static generatePrintContent(data, calculations, formatCurrency) {
        let html = this.generatePrintHeader(
            'Monthly Expenses Report',
            'Complete breakdown of monthly expense categories and amounts'
        );

        // Summary
        const totalExpenses = calculations.getTotalMonthlyExpenses();
        html += `
      <div class="summary-section">
        <div class="summary-item">
          <span class="summary-label">Total Monthly Expenses:</span>
          <span class="summary-value">${formatCurrency(totalExpenses)}</span>
        </div>
      </div>
    `;

        // Monthly Expenses Table
        html += `
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Expense Name</th>
            <th style="width: 15%;">Due Date</th>
            <th style="width: 20%;">Account</th>
            <th style="width: 10%;">Status</th>
            <th style="width: 12%;">Projected</th>
            <th style="width: 13%;">Actual</th>
          </tr>
        </thead>
        <tbody>
    `;

        Object.entries(data.monthly || {}).forEach(([categoryKey, expenses]) => {
            const categoryName = this.getCategoryName(categoryKey);
            const categoryTotal = expenses.reduce((sum, exp) => sum + (parseFloat(exp.actual) || 0), 0);

            if (categoryTotal > 0 || expenses.some(exp => exp.name)) {
                html += `
          <tr class="category-header">
            <td colspan="6"><strong>${categoryName} - ${formatCurrency(categoryTotal)}</strong></td>
          </tr>
        `;

                expenses.forEach(expense => {
                    if (expense.name || parseFloat(expense.actual || 0) > 0) {
                        const account = this.findAccount(data.accounts, expense.accountId);
                        const statusIcons = [];
                        if (expense.transferred) statusIcons.push('<span class="status-indicator status-transferred" title="Transferred"></span>');
                        if (expense.paid) statusIcons.push('<span class="status-indicator status-paid" title="Paid"></span>');

                        html += `
              <tr>
                <td style="padding-left: 20px;">${expense.name || 'Unnamed'}</td>
                <td>${this.formatDate(expense.date)}</td>
                <td>${account ? account.name : 'Not Selected'}</td>
                <td>${statusIcons.join(' ') || '<span class="status-indicator status-pending" title="Pending"></span>'}</td>
                <td class="amount">${formatCurrency(expense.projected || 0)}</td>
                <td class="amount">${formatCurrency(expense.actual || 0)}</td>
              </tr>
            `;
                    }
                });
            }
        });

        html += `
          <tr class="total-row">
            <td colspan="5"><strong>Total Monthly Expenses</strong></td>
            <td class="amount"><strong>${formatCurrency(totalExpenses)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
        html += this.generateStatusSummary(data.monthly, data.accounts, totalExpenses, formatCurrency);

        return html;
    }

    static getCategoryName(categoryKey) {
        const categoryNames = {
            housing: 'Housing',
            taxes: 'Taxes',
            utilities: 'Utilities',
            insurance: 'Insurance',
            banking: 'Banking',
            loans: 'Loans',
            credit: 'Credit',
            subscriptions: 'Subscriptions',
            food: 'Food',
            transportation: 'Transportation',
            medical: 'Medical',
            personal: 'Personal',
            shopping: 'Shopping',
            dog: 'Dog',
            maintenance: 'Maintenance',
            gifts: 'Gifts'
        };
        return categoryNames[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    }

    static findAccount(accounts, accountId) {
        if (!Array.isArray(accounts) || !accountId) return null;
        return accounts.find(acc => acc.id === accountId);
    }
}

export class AnnualExpensesPrint extends PrintUtils {
    static generatePrintContent(data, calculations, formatCurrency) {
        let html = this.generatePrintHeader(
            'Annual Expenses Report',
            'Complete breakdown of yearly expense categories and savings plan'
        );

        // Summary
        const totalAnnual = calculations.getTotalAnnualExpenses();
        const monthlyImpact = totalAnnual / 12;

        html += `
      <div class="summary-section">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Annual Expenses:</span>
            <span class="summary-value">${formatCurrency(totalAnnual)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Monthly Impact:</span>
            <span class="summary-value">${formatCurrency(monthlyImpact)}</span>
          </div>
        </div>
      </div>
    `;

        // Annual Expenses Table
        html += `
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Expense Name</th>
            <th style="width: 15%;">Due Date</th>
            <th style="width: 15%;">Account</th>
            <th style="width: 10%;">Status</th>
            <th style="width: 12%;">Projected</th>
            <th style="width: 12%;">Actual</th>
            <th style="width: 11%;">Monthly</th>
          </tr>
        </thead>
        <tbody>
    `;

        const categoryNames = {
            'yearly-subs': 'Yearly Subscriptions',
            'yearly-car': 'Yearly Car Expenses',
            'yearly-bank': 'Yearly Banking',
            'yearly-insurance': 'Yearly Insurance',
            'yearly-tax': 'Yearly Tax Expenses',
            'yearly-medical': 'Yearly Medical',
            'yearly-home': 'Yearly Home/Property',
            'yearly-personal': 'Yearly Personal'
        };

        Object.entries(data.annual || {}).forEach(([categoryKey, expenses]) => {
            const categoryName = categoryNames[categoryKey] || categoryKey;
            const categoryTotal = expenses.reduce((sum, exp) => sum + (parseFloat(exp.actual) || 0), 0);

            if (categoryTotal > 0 || expenses.some(exp => exp.name)) {
                html += `
          <tr class="category-header">
            <td colspan="7"><strong>${categoryName} - ${formatCurrency(categoryTotal)}/year</strong></td>
          </tr>
        `;

                expenses.forEach(expense => {
                    if (expense.name || parseFloat(expense.actual || 0) > 0) {
                        const account = this.findAccount(data.accounts, expense.accountId);
                        const actualAmount = parseFloat(expense.actual || 0);
                        const monthlyEquivalent = actualAmount / 12;

                        const statusIcons = [];
                        if (expense.transferred) statusIcons.push('<span class="status-indicator status-transferred" title="Transferred"></span>');
                        if (expense.paid) statusIcons.push('<span class="status-indicator status-paid" title="Paid"></span>');

                        html += `
              <tr>
                <td style="padding-left: 20px;">${expense.name || 'Unnamed'}</td>
                <td>${this.formatDate(expense.date)}</td>
                <td>${account ? account.name : 'Not Selected'}</td>
                <td>${statusIcons.join(' ') || '<span class="status-indicator status-pending" title="Pending"></span>'}</td>
                <td class="amount">${formatCurrency(expense.projected || 0)}</td>
                <td class="amount">${formatCurrency(actualAmount)}</td>
                <td class="amount">${formatCurrency(monthlyEquivalent)}</td>
              </tr>
            `;
                    }
                });
            }
        });

        html += `
          <tr class="total-row">
            <td colspan="5"><strong>Total Annual Expenses</strong></td>
            <td class="amount"><strong>${formatCurrency(totalAnnual)}</strong></td>
            <td class="amount"><strong>${formatCurrency(monthlyImpact)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
        html += this.generateStatusSummary(data.annual, data.accounts, totalAnnual, formatCurrency);

        return html;
    }

    static findAccount(accounts, accountId) {
        if (!Array.isArray(accounts) || !accountId) return null;
        return accounts.find(acc => acc.id === accountId);
    }
}

export class HomePagePrint extends PrintUtils {
    static generatePrintContent(data, calculations, formatCurrency) {
        let html = this.generatePrintHeader(
            'Budget Dashboard Overview',
            'Complete financial summary and account balances'
        );

        const totalIncome = calculations.getTotalIncome();
        const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
        const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
        const netMonthlyIncome = calculations.getNetMonthlyIncome();
        const savingsRate = calculations.getSavingsRate();

        // Financial Overview
        html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">💰 Financial Overview</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Monthly Income:</span>
            <span class="summary-value positive">${formatCurrency(totalIncome)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Monthly Expenses:</span>
            <span class="summary-value">${formatCurrency(totalMonthlyExpenses)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Annual Impact:</span>
            <span class="summary-value">${formatCurrency(monthlyAnnualImpact)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Net Monthly Cash:</span>
            <span class="summary-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}">${formatCurrency(netMonthlyIncome)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Savings Rate:</span>
            <span class="summary-value ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}">${savingsRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;

        // Account Balances
        const accounts = Array.isArray(data.accounts) ? data.accounts : [];
        if (accounts.length > 0) {
            html += `
        <h3 style="color: #2c3e50; margin: 25px 0 15px 0;">🏦 Account Balances</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Account Name</th>
              <th style="width: 25%;">Bank Details</th>
              <th style="width: 20%;">Current Balance</th>
              <th style="width: 15%;">Projected</th>
              <th style="width: 15%;">Net</th>
            </tr>
          </thead>
          <tbody>
      `;

            let totalCurrentBalance = 0;
            let totalProjected = 0;

            accounts.forEach(account => {
                const currentBalance = parseFloat(account.currentBalance) || 0;
                const projectedTotal = this.getProjectedTotal(data, account.id);
                const netProjected = currentBalance - projectedTotal;

                totalCurrentBalance += currentBalance;
                totalProjected += projectedTotal;

                html += `
          <tr>
            <td><strong>${account.name}</strong></td>
            <td>${account.bank} • ${account.transitNumber}-${account.branchNumber}</td>
            <td class="amount">${formatCurrency(currentBalance)}</td>
            <td class="amount">${formatCurrency(projectedTotal)}</td>
            <td class="amount ${netProjected >= 0 ? 'positive' : 'negative'}">${formatCurrency(netProjected)}</td>
          </tr>
        `;
            });

            html += `
            <tr class="total-row">
              <td colspan="2"><strong>Total</strong></td>
              <td class="amount"><strong>${formatCurrency(totalCurrentBalance)}</strong></td>
              <td class="amount"><strong>${formatCurrency(totalProjected)}</strong></td>
              <td class="amount ${(totalCurrentBalance - totalProjected) >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(totalCurrentBalance - totalProjected)}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
        }

        // Budget Health Indicators
        html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🩺 Budget Health</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Emergency Fund Status:</span>
            <span class="summary-value ${netMonthlyIncome > 0 ? 'positive' : 'negative'}">
              ${netMonthlyIncome > 0 ? 'Building' : 'Attention Needed'}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Debt-to-Income Ratio:</span>
            <span class="summary-value">${totalIncome > 0 ? ((totalMonthlyExpenses / totalIncome) * 100).toFixed(1) : 0}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tracked Categories:</span>
            <span class="summary-value">${Object.keys(data.monthly || {}).length + Object.keys(data.annual || {}).length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Expenses:</span>
            <span class="summary-value">${Object.values(data.monthly || {}).flat().length + Object.values(data.annual || {}).flat().length}</span>
          </div>
        </div>
      </div>
    `;

        return html;
    }

    static getProjectedTotal(data, accountId) {
        const allExpenses = [
            ...Object.values(data.monthly || {}).flat(),
            ...Object.values(data.annual || {}).flat()
        ];

        return allExpenses
            .filter(e => e.accountId === accountId && e.transferred && !e.paid)
            .reduce((sum, e) => sum + (parseFloat(e.actual || e.amount || 0)), 0);
    }
}