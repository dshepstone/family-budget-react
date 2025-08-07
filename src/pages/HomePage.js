// src/pages/HomePage.js - Redesigned Layout
import React from 'react';
import { useBudget } from '../context/BudgetContext';
import SummaryCards from '../components/SummaryCards';
import UpcomingExpenses from '../components/UpcomingExpenses';
import QuickActions from '../components/QuickActions';
import CashFlowChart from '../components/charts/CashFlowChart';
import ExpenseBreakdown from '../components/charts/ExpenseBreakdown';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { HomePagePrint } from '../utils/printUtils';


const HomePage = () => {
  const { state, calculations, formatCurrency, actions } = useBudget();

  const totalIncome = calculations.getTotalIncome();
  const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
  const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
  const netMonthlyIncome = calculations.getNetMonthlyIncome();
  const savingsRate = calculations.getSavingsRate();
  const upcomingExpenses = calculations.getUpcomingExpenses();

  // Calculate category totals for expense breakdown
  const getExpenseBreakdownData = () => {
    const monthlyData = {};
    const annualData = {};

    Object.entries(state.data.monthly || {}).forEach(([category, expenses]) => {
      const total = expenses.reduce((sum, expense) =>
        sum + parseFloat(expense.actual || expense.amount || 0), 0
      );
      if (total > 0) {
        monthlyData[category] = total;
      }
    });

    Object.entries(state.data.annual || {}).forEach(([category, expenses]) => {
      const total = expenses.reduce((sum, expense) =>
        sum + parseFloat(expense.actual || expense.amount || 0), 0
      ) / 12;
      if (total > 0) {
        annualData[category] = total;
      }
    });

    return { monthlyData, annualData };
  };

  const expenseData = getExpenseBreakdownData();
  const accounts = Array.isArray(state.data.accounts) ? state.data.accounts : [];

  const allExpenses = [
    ...Object.values(state.data.monthly || {}).flat(),
    ...Object.values(state.data.annual || {}).flat()
  ];

  const getProjectedTotal = (accountId) => {
    return allExpenses
      .filter(e => e.accountId === accountId && e.transferred && !e.paid)
      .reduce((sum, e) => sum + (parseFloat(e.actual || e.amount || 0)), 0);
  };

  const handlePrint = () => {
    const printContent = HomePagePrint.generatePrintContent(
      state.data,
      calculations,
      formatCurrency
    );
    HomePagePrint.openPrintWindow(printContent, 'Budget Dashboard Overview');
  };

  const getTotalCurrentBalance = () => {
    return accounts.reduce((sum, acc) => sum + (parseFloat(acc.currentBalance) || 0), 0);
  };

  const getTotalProjected = () => {
    return accounts.reduce((sum, acc) => sum + getProjectedTotal(acc.id), 0);
  };

  return (
    <div className="homepage-redesigned">
      {/* --- CHANGE APPLIED HERE --- */}
      <div className="page-header">
        <h2 className="page-title">🏠 Dashboard Overview</h2>
        <p className="page-description">
          Your complete budget overview with real-time calculations and insights
        </p>
        <div className="page-header-actions">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="print-button"
          >
            🖨️ Print Dashboard
          </Button>
        </div>
      </div>

      {/* Quick Actions - Full Width */}
      <QuickActions />

      {/* Summary Cards - Full Width */}
      <SummaryCards />

      {/* Main Content - Two Column Layout */}
      <div className="homepage-main-content">

        {/* Left Column - Primary Content */}
        <div className="homepage-left-column">

          {/* Financial Overview */}
          <Card title="💰 Financial Overview" className="financial-overview-card">
            <div className="financial-overview-grid">
              <div className="overview-stat">
                <div className="stat-icon income">💵</div>
                <div className="stat-content">
                  <div className="stat-value income">{formatCurrency(totalIncome)}</div>
                  <div className="stat-label">Monthly Income</div>
                </div>
              </div>

              <div className="overview-stat">
                <div className="stat-icon expense">💳</div>
                <div className="stat-content">
                  <div className="stat-value expense">{formatCurrency(totalMonthlyExpenses)}</div>
                  <div className="stat-label">Monthly Expenses</div>
                </div>
              </div>

              <div className="overview-stat">
                <div className="stat-icon annual">📅</div>
                <div className="stat-content">
                  <div className="stat-value annual">{formatCurrency(monthlyAnnualImpact)}</div>
                  <div className="stat-label">Annual Impact</div>
                </div>
              </div>

              <div className="overview-stat highlight">
                <div className={`stat-icon ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                  {netMonthlyIncome >= 0 ? '📈' : '📉'}
                </div>
                <div className="stat-content">
                  <div className={`stat-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(netMonthlyIncome)}
                  </div>
                  <div className="stat-label">Net Monthly Cash</div>
                </div>
              </div>

              <div className="overview-stat">
                <div className={`stat-icon ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}`}>
                  💰
                </div>
                <div className="stat-content">
                  <div className={`stat-value ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}`}>
                    {savingsRate.toFixed(1)}%
                  </div>
                  <div className="stat-label">Savings Rate</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="charts-row">
            <Card title="📊 Monthly Cash Flow" className="chart-card cash-flow-card">
              <div className="chart-container">
                <CashFlowChart />
              </div>
            </Card>

            <Card title="🥧 Expense Categories" className="chart-card expense-chart-card">
              <div className="chart-container">
                <ExpenseBreakdown data={expenseData} />
                <div className="chart-summary">
                  <div className="chart-stat">
                    <strong>{Object.keys(expenseData.monthlyData).length + Object.keys(expenseData.annualData).length}</strong> Categories
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Account Balances - Compact Table Format */}
          <Card title="🏦 Account Balances" className="accounts-table-card">
            {accounts.length === 0 ? (
              <div className="empty-accounts-state">
                <div className="empty-icon">🏦</div>
                <h4>No Accounts Added</h4>
                <p>Add your bank accounts to track balances and projected totals.</p>
                <Button
                  variant="primary"
                  onClick={() => actions.setCurrentPage('monthly')}
                >
                  Add Account
                </Button>
              </div>
            ) : (
              <>
                <div className="accounts-table">
                  <div className="accounts-table-header">
                    <div>Account</div>
                    <div>Current</div>
                    <div>Projected</div>
                    <div>Net</div>
                  </div>

                  {accounts.map((account) => {
                    const projectedTotal = getProjectedTotal(account.id);
                    const currentBalance = parseFloat(account.currentBalance) || 0;
                    const netProjected = currentBalance - projectedTotal;

                    return (
                      <div key={account.id} className="accounts-table-row">
                        <div className="account-info">
                          <div className="account-name">
                            <span className="account-icon">💳</span>
                            {account.name}
                          </div>
                          <div className="account-details">
                            {account.bank} • {account.transitNumber}-{account.branchNumber}
                          </div>
                        </div>

                        <div className="balance-cell">
                          <input
                            type="number"
                            value={account.currentBalance || ''}
                            onChange={(e) =>
                              actions.updateAccount({
                                ...account,
                                currentBalance: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="balance-input-compact"
                            placeholder="0.00"
                          />
                        </div>

                        <div className="balance-cell projected">
                          {formatCurrency(projectedTotal)}
                        </div>

                        <div className={`balance-cell net ${netProjected >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(netProjected)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Totals Row */}
                  <div className="accounts-table-row totals">
                    <div className="account-info">
                      <div className="account-name">
                        <strong>Total</strong>
                      </div>
                    </div>
                    <div className="balance-cell">
                      <strong>{formatCurrency(getTotalCurrentBalance())}</strong>
                    </div>
                    <div className="balance-cell projected">
                      <strong>{formatCurrency(getTotalProjected())}</strong>
                    </div>
                    <div className={`balance-cell net ${(getTotalCurrentBalance() - getTotalProjected()) >= 0 ? 'positive' : 'negative'}`}>
                      <strong>{formatCurrency(getTotalCurrentBalance() - getTotalProjected())}</strong>
                    </div>
                  </div>
                </div>

                <div className="accounts-table-footer">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actions.setCurrentPage('monthly')}
                  >
                    Manage Accounts
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Column - Secondary Content */}
        <div className="homepage-right-column">

          {/* Upcoming Expenses */}
          <Card title="⏰ Upcoming Expenses" className="upcoming-card-compact">
            <UpcomingExpenses expenses={upcomingExpenses} maxDisplay={3} />
          </Card>

          {/* Budget Health */}
          <Card title="🩺 Budget Health" className="health-card-compact">
            <div className="health-metrics-compact">
              <div className="health-item-compact">
                <div className="health-label">Emergency Fund</div>
                <div className="health-indicator">
                  <div className="indicator-bar">
                    <div
                      className="indicator-fill"
                      style={{
                        width: `${Math.min((netMonthlyIncome * 6) / (totalMonthlyExpenses * 6) * 100, 100)}%`,
                        backgroundColor: netMonthlyIncome > 0 ? '#27ae60' : '#e74c3c'
                      }}
                    ></div>
                  </div>
                  <span className="indicator-text">
                    {netMonthlyIncome > 0 ? 'Building' : 'Attention'}
                  </span>
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Debt-to-Income</div>
                <div className="health-value">
                  {totalIncome > 0 ? ((totalMonthlyExpenses / totalIncome) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Categories</div>
                <div className="health-value">
                  {Object.keys(state.data.monthly || {}).length + Object.keys(state.data.annual || {}).length}
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Tracked Expenses</div>
                <div className="health-value">
                  {Object.values(state.data.monthly || {}).flat().length +
                    Object.values(state.data.annual || {}).flat().length}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Insights */}
          <Card title="💡 Quick Insights" className="insights-card-compact">
            <div className="insights-list-compact">
              {netMonthlyIncome < 0 && (
                <div className="insight-item warning">
                  <span className="insight-icon">⚠️</span>
                  <span className="insight-text">
                    Expenses exceed income by {formatCurrency(Math.abs(netMonthlyIncome))}
                  </span>
                </div>
              )}

              {savingsRate < 10 && netMonthlyIncome >= 0 && (
                <div className="insight-item warning">
                  <span className="insight-icon">📉</span>
                  <span className="insight-text">
                    Savings rate below 10%
                  </span>
                </div>
              )}

              {upcomingExpenses.length > 0 && (
                <div className="insight-item info">
                  <span className="insight-icon">📅</span>
                  <span className="insight-text">
                    {upcomingExpenses.length} expense(s) due soon
                  </span>
                </div>
              )}

              {netMonthlyIncome >= 0 && savingsRate >= 20 && (
                <div className="insight-item success">
                  <span className="insight-icon">✅</span>
                  <span className="insight-text">
                    Meeting savings goals!
                  </span>
                </div>
              )}

              {accounts.length === 0 && (
                <div className="insight-item info">
                  <span className="insight-icon">🏦</span>
                  <span className="insight-text">
                    Add accounts to track balances
                  </span>
                </div>
              )}

              {/* Always show a positive insight if no issues */}
              {netMonthlyIncome >= 0 && savingsRate >= 10 && upcomingExpenses.length === 0 && (
                <div className="insight-item success">
                  <span className="insight-icon">🎉</span>
                  <span className="insight-text">
                    Budget is looking healthy!
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;