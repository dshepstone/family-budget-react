// src/pages/HomePage.js
import React from 'react';
import { useBudget } from '../context/BudgetContext';
import SummaryCards from '../components/SummaryCards';
import UpcomingExpenses from '../components/UpcomingExpenses';
import QuickActions from '../components/QuickActions';
import CashFlowChart from '../components/charts/CashFlowChart';
import ExpenseBreakdown from '../components/charts/ExpenseBreakdown';
import Card from '../components/ui/Card';

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

    // Process monthly expenses
    Object.entries(state.data.monthly).forEach(([category, expenses]) => {
      const total = expenses.reduce((sum, expense) => 
        sum + parseFloat(expense.actual || expense.amount || 0), 0
      );
      if (total > 0) {
        monthlyData[category] = total;
      }
    });

    // Process annual expenses (as monthly equivalent)
    Object.entries(state.data.annual).forEach(([category, expenses]) => {
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

  const allExpenses = [
    ...Object.values(state.data.monthly || {}).flat(),
    ...Object.values(state.data.annual || {}).flat()
  ];

  const getProjectedTotal = (accountId) => {
    return allExpenses
      .filter(e => e.accountId === accountId && e.transferred && !e.paid)
      .reduce((sum, e) => sum + (parseFloat(e.actual || e.amount || 0)), 0);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">🏠 Dashboard Overview</h2>
        <p className="page-description">
          Your complete budget overview with real-time calculations and insights
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Summary Cards */}
      <SummaryCards />

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        
        {/* Financial Overview */}
        <Card title="💰 Financial Overview" className="overview-card">
          <div className="overview-stats">
            <div className="overview-item">
              <div className="overview-label">Monthly Income</div>
              <div className="overview-value income">
                {formatCurrency(totalIncome)}
              </div>
            </div>
            
            <div className="overview-item">
              <div className="overview-label">Monthly Expenses</div>
              <div className="overview-value expense">
                {formatCurrency(totalMonthlyExpenses)}
              </div>
            </div>
            
            <div className="overview-item">
              <div className="overview-label">Annual Impact (Monthly)</div>
              <div className="overview-value annual">
                {formatCurrency(monthlyAnnualImpact)}
              </div>
            </div>
            
            <div className="overview-item highlight">
              <div className="overview-label">Net Monthly Cash</div>
              <div className={`overview-value ${netMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(netMonthlyIncome)}
              </div>
            </div>
            
            <div className="overview-item">
              <div className="overview-label">Savings Rate</div>
              <div className={`overview-value ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}`}>
                {savingsRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>

        {/* Cash Flow Chart */}
        <Card title="📊 Monthly Cash Flow" className="chart-card">
          <CashFlowChart />
        </Card>

        {/* Expense Breakdown */}
        <Card title="🥧 Expense Breakdown" className="chart-card">
          <ExpenseBreakdown data={expenseData} />
        </Card>

        {/* Account Balances */}
        <Card title="🏦 Account Balances" className="accounts-card">
          <div className="accounts-grid">
            <div className="accounts-header">
              <span>Account</span>
              <span>Current Balance</span>
              <span>Projected Total</span>
            </div>
            {(state.data.accounts || []).map((acc) => (
              <div key={acc.id} className="account-row">
                <div className="account-info">
                  {acc.name} - {acc.bank} {acc.transitNumber}-{acc.branchNumber}-{acc.accountNumber}
                </div>
                <input
                  type="number"
                  value={acc.currentBalance ?? ''}
                  onChange={(e) =>
                    actions.updateAccount({
                      ...acc,
                      currentBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <div className="projected-value">
                  {formatCurrency(getProjectedTotal(acc.id))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Expenses */}
        <Card title="⏰ Upcoming Expenses" className="upcoming-card">
          <UpcomingExpenses expenses={upcomingExpenses} />
        </Card>

        {/* Budget Health */}
        <Card title="🩺 Budget Health" className="health-card">
          <div className="health-metrics">
            <div className="health-item">
              <div className="health-label">Emergency Fund Status</div>
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
                  {netMonthlyIncome > 0 ? 'Building' : 'Needs Attention'}
                </span>
              </div>
            </div>

            <div className="health-item">
              <div className="health-label">Debt-to-Income Ratio</div>
              <div className="health-value">
                {totalIncome > 0 ? ((totalMonthlyExpenses / totalIncome) * 100).toFixed(1) : 0}%
              </div>
            </div>

            <div className="health-item">
              <div className="health-label">Budget Categories</div>
              <div className="health-value">
                {Object.keys(state.data.monthly).length + Object.keys(state.data.annual).length}
              </div>
            </div>

            <div className="health-item">
              <div className="health-label">Total Tracked Expenses</div>
              <div className="health-value">
                {Object.values(state.data.monthly).flat().length + 
                 Object.values(state.data.annual).flat().length}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Insights */}
        <Card title="💡 Quick Insights" className="insights-card">
          <div className="insights-list">
            {netMonthlyIncome < 0 && (
              <div className="insight-item warning">
                <span className="insight-icon">⚠️</span>
                <span className="insight-text">
                  Monthly expenses exceed income by {formatCurrency(Math.abs(netMonthlyIncome))}
                </span>
              </div>
            )}
            
            {savingsRate < 10 && (
              <div className="insight-item warning">
                <span className="insight-icon">📉</span>
                <span className="insight-text">
                  Savings rate is below recommended 10-20%
                </span>
              </div>
            )}
            
            {upcomingExpenses.length > 0 && (
              <div className="insight-item info">
                <span className="insight-icon">📅</span>
                <span className="insight-text">
                  {upcomingExpenses.length} expense(s) due within 7 days
                </span>
              </div>
            )}
            
            {netMonthlyIncome >= 0 && savingsRate >= 20 && (
              <div className="insight-item success">
                <span className="insight-icon">✅</span>
                <span className="insight-text">
                  Great job! You're meeting savings goals
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;