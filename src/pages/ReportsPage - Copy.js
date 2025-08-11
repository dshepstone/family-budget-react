// src/pages/ReportsPage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { PrintUtils } from '../utils/printUtils';
import '../styles/reports.css';

// Individual Report Print Classes
class FinancialSummaryPrint extends PrintUtils {
  static generatePrintContent(data, calculations, formatCurrency) {
    let html = this.generatePrintHeader(
      'Financial Summary Report',
      'Complete overview of income, expenses, and financial health'
    );

    const totalIncome = calculations.getTotalIncome();
    const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
    const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
    const netMonthlyIncome = calculations.getNetMonthlyIncome();
    const savingsRate = calculations.getSavingsRate();
    const totalAnnualExpenses = calculations.getTotalAnnualExpenses();

    // Financial Overview Section
    html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">💰 Financial Overview</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Monthly Income:</span>
            <span class="summary-value positive">${formatCurrency(totalIncome)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Monthly Expenses:</span>
            <span class="summary-value">${formatCurrency(totalMonthlyExpenses)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Annual Expenses (Monthly Impact):</span>
            <span class="summary-value">${formatCurrency(monthlyAnnualImpact)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Net Monthly Income:</span>
            <span class="summary-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}">${formatCurrency(netMonthlyIncome)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Savings Rate:</span>
            <span class="summary-value ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}">${savingsRate.toFixed(1)}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Annual Savings Potential:</span>
            <span class="summary-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}">${formatCurrency(netMonthlyIncome * 12)}</span>
          </div>
        </div>
      </div>
    `;

    // Budget Health Analysis
    const totalExpenses = totalMonthlyExpenses + monthlyAnnualImpact;
    const debtToIncomeRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    
    html += `
      <div class="summary-section">
        <h3 style="margin: 20px 0 15px 0; color: #2c3e50;">📊 Budget Health Metrics</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Expense-to-Income Ratio:</span>
            <span class="summary-value ${debtToIncomeRatio <= 80 ? 'positive' : debtToIncomeRatio <= 95 ? 'warning' : 'negative'}">${debtToIncomeRatio.toFixed(1)}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Annual Expenses:</span>
            <span class="summary-value">${formatCurrency(totalAnnualExpenses)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Emergency Fund Potential:</span>
            <span class="summary-value">${formatCurrency(netMonthlyIncome * 6)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Budget Status:</span>
            <span class="summary-value ${netMonthlyIncome > 0 ? 'positive' : 'negative'}">${netMonthlyIncome > 0 ? 'Surplus' : 'Deficit'}</span>
          </div>
        </div>
      </div>
    `;

    return html;
  }
}

class IncomeDetailsPrint extends PrintUtils {
  static generatePrintContent(data, calculations, formatCurrency) {
    let html = this.generatePrintHeader(
      'Income Details Report',
      'Complete breakdown of all income sources'
    );

    const totalIncome = calculations.getTotalIncome();
    
    html += `
      <div class="summary-section">
        <div class="summary-item">
          <span class="summary-label">Total Monthly Income:</span>
          <span class="summary-value positive">${formatCurrency(totalIncome)}</span>
        </div>
      </div>
    `;

    if (!Array.isArray(data.income) || data.income.length === 0) {
      html += '<p style="text-align: center; color: #666; margin: 40px 0;">No income sources configured.</p>';
      return html;
    }

    html += `
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Income Source</th>
            <th style="width: 20%;">Amount</th>
            <th style="width: 20%;">Percentage of Total</th>
            <th style="width: 20%;">Annual Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.income.forEach(income => {
      const amount = parseFloat(income.amount || 0);
      const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
      const annualAmount = amount * 12;

      html += `
        <tr>
          <td><strong>${income.name}</strong></td>
          <td class="amount">${formatCurrency(amount)}</td>
          <td class="amount">${percentage.toFixed(1)}%</td>
          <td class="amount">${formatCurrency(annualAmount)}</td>
        </tr>
      `;
    });

    html += `
        <tr class="total-row">
          <td><strong>Total Monthly Income</strong></td>
          <td class="amount"><strong>${formatCurrency(totalIncome)}</strong></td>
          <td class="amount"><strong>100.0%</strong></td>
          <td class="amount"><strong>${formatCurrency(totalIncome * 12)}</strong></td>
        </tr>
      </tbody>
    </table>
    `;

    return html;
  }
}

class ExpenseStatusPrint extends PrintUtils {
  static generatePrintContent(data, calculations, formatCurrency) {
    let html = this.generatePrintHeader(
      'Expense Status Report',
      'Payment and transfer status tracking for all expenses'
    );

    // Get all expenses with status
    const allExpenses = [];
    
    // Process monthly expenses
    Object.entries(data.monthly || {}).forEach(([categoryKey, expenses]) => {
      expenses.forEach(expense => {
        allExpenses.push({
          ...expense,
          category: this.getCategoryDisplayName(categoryKey),
          type: 'Monthly',
          monthlyAmount: parseFloat(expense.actual || expense.amount || 0)
        });
      });
    });

    // Process annual expenses
    Object.entries(data.annual || {}).forEach(([categoryKey, expenses]) => {
      expenses.forEach(expense => {
        allExpenses.push({
          ...expense,
          category: this.getCategoryDisplayName(categoryKey),
          type: 'Annual',
          monthlyAmount: parseFloat(expense.actual || expense.amount || 0) / 12
        });
      });
    });

    // Calculate status totals
    const paidTotal = allExpenses.filter(exp => exp.paid).reduce((sum, exp) => sum + exp.monthlyAmount, 0);
    const transferredTotal = allExpenses.filter(exp => exp.transferred).reduce((sum, exp) => sum + exp.monthlyAmount, 0);
    const pendingTotal = allExpenses.filter(exp => !exp.paid && !exp.transferred).reduce((sum, exp) => sum + exp.monthlyAmount, 0);

    html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Status Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Paid Expenses:</span>
            <span class="summary-value positive">${formatCurrency(paidTotal)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Transferred Expenses:</span>
            <span class="summary-value warning">${formatCurrency(transferredTotal)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Pending Expenses:</span>
            <span class="summary-value">${formatCurrency(pendingTotal)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Expenses:</span>
            <span class="summary-value">${formatCurrency(paidTotal + transferredTotal + pendingTotal)}</span>
          </div>
        </div>
      </div>
    `;

    if (allExpenses.length === 0) {
      html += '<p style="text-align: center; color: #666; margin: 40px 0;">No expenses configured.</p>';
      return html;
    }

    html += `
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Expense Name</th>
            <th style="width: 15%;">Category</th>
            <th style="width: 10%;">Type</th>
            <th style="width: 15%;">Status</th>
            <th style="width: 15%;">Monthly Impact</th>
            <th style="width: 10%;">Due Date</th>
            <th style="width: 10%;">Account</th>
          </tr>
        </thead>
        <tbody>
    `;

    allExpenses.forEach(expense => {
      const statusIcons = [];
      if (expense.paid) {
        statusIcons.push('<span class="status-indicator status-paid" title="Paid"></span>Paid');
      }
      if (expense.transferred) {
        statusIcons.push('<span class="status-indicator status-transferred" title="Transferred"></span>Transferred');
      }
      if (!expense.paid && !expense.transferred) {
        statusIcons.push('<span class="status-indicator status-pending" title="Pending"></span>Pending');
      }

      const account = this.findAccount(data.accounts, expense.accountId);
      
      html += `
        <tr>
          <td><strong>${expense.name}</strong></td>
          <td>${expense.category}</td>
          <td>${expense.type}</td>
          <td>${statusIcons.join(' ')}</td>
          <td class="amount">${formatCurrency(expense.monthlyAmount)}</td>
          <td>${expense.dueDate ? this.formatDate(expense.dueDate) : '-'}</td>
          <td>${account ? account.name : 'Unassigned'}</td>
        </tr>
      `;
    });

    html += `
      </tbody>
    </table>
    `;

    return html;
  }

  static findAccount(accounts, accountId) {
    if (!Array.isArray(accounts) || !accountId) return null;
    return accounts.find(acc => acc.id === accountId);
  }
}

class CompleteBudgetPrint extends PrintUtils {
  static generatePrintContent(data, calculations, formatCurrency) {
    let html = this.generatePrintHeader(
      'Complete Budget Report',
      'Comprehensive overview of all financial data'
    );

    // Financial Summary
    const totalIncome = calculations.getTotalIncome();
    const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
    const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
    const netMonthlyIncome = calculations.getNetMonthlyIncome();

    html += `
      <div class="summary-section">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Executive Summary</h3>
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
            <span class="summary-label">Net Income:</span>
            <span class="summary-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}">${formatCurrency(netMonthlyIncome)}</span>
          </div>
        </div>
      </div>
    `;

    // Income Section
    html += `<div style="page-break-before: always;"></div>`;
    html += `
      <h3 style="margin: 20px 0 15px 0; color: #2c3e50;">💵 Income Sources</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 60%;">Income Source</th>
            <th style="width: 20%;">Monthly Amount</th>
            <th style="width: 20%;">Annual Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    (data.income || []).forEach(income => {
      const amount = parseFloat(income.amount || 0);
      html += `
        <tr>
          <td><strong>${income.name}</strong></td>
          <td class="amount">${formatCurrency(amount)}</td>
          <td class="amount">${formatCurrency(amount * 12)}</td>
        </tr>
      `;
    });

    html += `
        <tr class="total-row">
          <td><strong>Total Income</strong></td>
          <td class="amount"><strong>${formatCurrency(totalIncome)}</strong></td>
          <td class="amount"><strong>${formatCurrency(totalIncome * 12)}</strong></td>
        </tr>
      </tbody>
    </table>
    `;

    // Monthly Expenses Section
    html += `
      <h3 style="margin: 30px 0 15px 0; color: #2c3e50;">📅 Monthly Expenses</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Expense</th>
            <th style="width: 20%;">Category</th>
            <th style="width: 15%;">Amount</th>
            <th style="width: 15%;">Due Date</th>
            <th style="width: 20%;">Account</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.entries(data.monthly || {}).forEach(([categoryKey, expenses]) => {
      if (expenses.length > 0) {
        expenses.forEach(expense => {
          const account = this.findAccount(data.accounts, expense.accountId);
          html += `
            <tr>
              <td><strong>${expense.name}</strong></td>
              <td>${this.getCategoryDisplayName(categoryKey)}</td>
              <td class="amount">${formatCurrency(expense.actual || expense.amount || 0)}</td>
              <td>${expense.dueDate ? this.formatDate(expense.dueDate) : '-'}</td>
              <td>${account ? account.name : 'Unassigned'}</td>
            </tr>
          `;
        });
      }
    });

    html += `
        <tr class="total-row">
          <td colspan="2"><strong>Total Monthly Expenses</strong></td>
          <td class="amount"><strong>${formatCurrency(totalMonthlyExpenses)}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
    `;

    // Annual Expenses Section
    html += `<div style="page-break-before: always;"></div>`;
    html += `
      <h3 style="margin: 20px 0 15px 0; color: #2c3e50;">📆 Annual Expenses</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Expense</th>
            <th style="width: 20%;">Category</th>
            <th style="width: 15%;">Annual Amount</th>
            <th style="width: 15%;">Monthly Impact</th>
            <th style="width: 20%;">Account</th>
          </tr>
        </thead>
        <tbody>
    `;

    let totalAnnual = 0;
    Object.entries(data.annual || {}).forEach(([categoryKey, expenses]) => {
      if (expenses.length > 0) {
        expenses.forEach(expense => {
          const annualAmount = parseFloat(expense.actual || expense.amount || 0);
          const monthlyImpact = annualAmount / 12;
          totalAnnual += annualAmount;
          
          const account = this.findAccount(data.accounts, expense.accountId);
          html += `
            <tr>
              <td><strong>${expense.name}</strong></td>
              <td>${this.getCategoryDisplayName(categoryKey)}</td>
              <td class="amount">${formatCurrency(annualAmount)}</td>
              <td class="amount">${formatCurrency(monthlyImpact)}</td>
              <td>${account ? account.name : 'Unassigned'}</td>
            </tr>
          `;
        });
      }
    });

    html += `
        <tr class="total-row">
          <td colspan="2"><strong>Total Annual Expenses</strong></td>
          <td class="amount"><strong>${formatCurrency(totalAnnual)}</strong></td>
          <td class="amount"><strong>${formatCurrency(totalAnnual / 12)}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    `;

    // Accounts Section
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      html += `
        <h3 style="margin: 30px 0 15px 0; color: #2c3e50;">🏦 Account Information</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Account Name</th>
              <th style="width: 20%;">Bank</th>
              <th style="width: 25%;">Account Number</th>
              <th style="width: 15%;">Current Balance</th>
              <th style="width: 15%;">Type</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.accounts.forEach(account => {
        html += `
          <tr>
            <td><strong>${account.name || 'Unnamed Account'}</strong></td>
            <td>${account.bank || 'N/A'}</td>
            <td>****${(account.accountNumber || '').slice(-4)}</td>
            <td class="amount">${formatCurrency(account.currentBalance || 0)}</td>
            <td>${account.accountType || 'N/A'}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    }

    return html;
  }

  static findAccount(accounts, accountId) {
    if (!Array.isArray(accounts) || !accountId) return null;
    return accounts.find(acc => acc.id === accountId);
  }
}

const ReportsPage = () => {
  const { state, calculations } = useBudget();
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const generateReport = async (reportType, title) => {
    setIsGenerating(true);
    try {
      let printContent = '';
      
      switch (reportType) {
        case 'financial-summary':
          printContent = FinancialSummaryPrint.generatePrintContent(state.data, calculations, formatCurrency);
          break;
        case 'income-details':
          printContent = IncomeDetailsPrint.generatePrintContent(state.data, calculations, formatCurrency);
          break;
        case 'expense-status':
          printContent = ExpenseStatusPrint.generatePrintContent(state.data, calculations, formatCurrency);
          break;
        case 'complete-budget':
          printContent = CompleteBudgetPrint.generatePrintContent(state.data, calculations, formatCurrency);
          break;
        default:
          throw new Error('Unknown report type');
      }

      PrintUtils.openPrintWindow(printContent, title);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const reports = [
    {
      id: 'financial-summary',
      title: 'Financial Summary Report',
      description: 'Overview of income, expenses, and financial health metrics',
      icon: '💰',
      category: 'Overview'
    },
    {
      id: 'income-details',
      title: 'Income Details Report',
      description: 'Complete breakdown of all income sources',
      icon: '💵',
      category: 'Income'
    },
    {
      id: 'expense-status',
      title: 'Expense Status Report',
      description: 'Payment and transfer status for all expenses',
      icon: '📊',
      category: 'Expenses'
    },
    {
      id: 'complete-budget',
      title: 'Complete Budget Report',
      description: 'Comprehensive overview of all financial data',
      icon: '📋',
      category: 'Comprehensive'
    }
  ];

  // Group reports by category
  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {});

  // Calculate some summary stats for the page
  const totalIncome = calculations.getTotalIncome();
  const totalExpenses = calculations.getTotalMonthlyExpenses() + calculations.getMonthlyAnnualImpact();
  const netIncome = calculations.getNetMonthlyIncome();

  return (
    <div className="page-container reports-page">
      <header className="page-header">
        <h1 className="page-title">📈 Reports</h1>
        <p className="page-subtitle">
          Generate and print detailed financial reports for your budget data.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">📊 Quick Financial Overview</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Monthly Income</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Monthly Expenses</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</div>
            </div>
            <div className={`p-4 rounded-lg border-l-4 ${netIncome >= 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="text-sm text-gray-600">Net Income</div>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netIncome)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="space-y-6">
        {Object.entries(groupedReports).map(([category, categoryReports]) => (
          <div key={category} className="card">
            <div className="card-header">
              <h3 className="card-title">{category} Reports</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">{report.icon}</span>
                          <h4 className="font-semibold text-lg">{report.title}</h4>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{report.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => generateReport(report.id, report.title)}
                      disabled={isGenerating}
                      className="btn btn-primary btn-sm w-full"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          🖨️ Generate & Print
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Print Instructions */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">📝 Printing Instructions</h3>
        </div>
        <div className="card-body">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to Print Reports:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Generate & Print" on any report above</li>
              <li>A new window will open with the formatted report</li>
              <li>The print dialog will automatically appear</li>
              <li>Ensure your printer is set to "Letter" size (8.5" x 11")</li>
              <li>Select "Print" to generate your physical report</li>
              <li>The window will close automatically after printing</li>
            </ol>
            <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-500">
              <p className="text-sm">
                <strong>Tip:</strong> All reports are optimized for standard letter-size paper with proper margins and page breaks.
                If you need to save as PDF, use your browser's "Save as PDF" option in the print dialog.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;