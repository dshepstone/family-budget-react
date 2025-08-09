// src/pages/HomePage.js - Fixed with Simplified Income Calculations
import React, { useMemo } from 'react';
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

  // Helper function to parse amounts safely
  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value && value !== 0) return 0;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // UPDATED: Use the same calculation logic as Income Sources page for consistency
  const totalProjectedIncome = useMemo(() => {
    const income = state.data.income || [];
    return income.reduce((total, item) => {
      // Use the same month-aware calculation as Income Sources page
      const hasDates = Array.isArray(item.payDates) && item.payDates.length > 0;
      const perCheckProjected = parseAmount(item.projectedAmount || item.amount);

      let monthlyProjected = 0;
      
      switch (item.frequency) {
        case 'weekly':
          monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected * (52 / 12);
          break;
        case 'bi-weekly':
          monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected * (26 / 12);
          break;
        case 'monthly':
          monthlyProjected = perCheckProjected;
          break;
        case 'quarterly':
          monthlyProjected = perCheckProjected / 3;
          break;
        case 'semi-annual':
          monthlyProjected = perCheckProjected / 6;
          break;
        case 'annual':
          monthlyProjected = perCheckProjected / 12;
          break;
        case 'one-time':
          monthlyProjected = 0;
          break;
        default:
          monthlyProjected = perCheckProjected;
      }
      
      return total + monthlyProjected;
    }, 0);
  }, [state.data.income]);

  const totalActualIncome = useMemo(() => {
    const income = state.data.income || [];
    return income.reduce((total, item) => {
      // For actual income, check if payActuals exist (per-paycheck actuals)
      if (Array.isArray(item.payActuals) && item.payActuals.length > 0) {
        return total + item.payActuals.reduce((sum, v) => sum + parseAmount(v), 0);
      }
      // Otherwise use the actualAmount (or 0 if not set)
      return total + parseAmount(item.actualAmount || 0);
    }, 0);
  }, [state.data.income]);

  // Income analysis using simplified calculations
  const incomeAnalysis = useMemo(() => {
    const variance = totalActualIncome - totalProjectedIncome;
    const percentReceived = totalProjectedIncome > 0 ? (totalActualIncome / totalProjectedIncome) * 100 : 0;
    
    // Calculate expected income based on how far through the month we are
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const dayOfMonth = now.getDate();
    const monthProgress = (dayOfMonth / daysInMonth) * 100;
    const expectedAtThisPoint = (totalProjectedIncome * monthProgress) / 100;
    const progressVariance = totalActualIncome - expectedAtThisPoint;
    const isOnTrack = progressVariance >= 0;

    return {
      totalProjectedIncome,
      totalActualIncome,
      variance,
      percentReceived,
      monthProgress,
      expectedAtThisPoint,
      progressVariance,
      isOnTrack
    };
  }, [totalProjectedIncome, totalActualIncome]);

  // Use existing BudgetContext calculations for expenses
  const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
  const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
  
  // Calculate net income using both projected and actual
  const projectedNetMonthlyIncome = totalProjectedIncome - totalMonthlyExpenses - monthlyAnnualImpact;
  const actualNetIncome = totalActualIncome - totalMonthlyExpenses - monthlyAnnualImpact;
  
  // Calculate savings rates
  const projectedSavingsRate = totalProjectedIncome > 0 ? (projectedNetMonthlyIncome / totalProjectedIncome) * 100 : 0;
  const actualSavingsRate = totalActualIncome > 0 ? (actualNetIncome / totalActualIncome) * 100 : 0;
  
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

  // Helper function to get progress bar color
  const getProgressColor = (percentage, isOnTrack = true) => {
    if (!isOnTrack) return '#ef4444'; // Red for behind schedule
    if (percentage >= 90) return '#10b981'; // Green for on track/ahead
    if (percentage >= 60) return '#f59e0b'; // Orange for moderate progress
    return '#3b82f6'; // Blue for early in month
  };

  return (
    <div className="homepage-redesigned">
      <style jsx>{`
        .income-progress-card {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          margin-bottom: 20px;
        }
        
        .progress-container {
          margin: 16px 0;
        }
        
        .progress-bar {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          height: 12px;
          overflow: hidden;
          margin: 8px 0;
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
        }
        
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          opacity: 0.9;
          margin-top: 4px;
        }
        
        .income-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        
        .income-stat {
          text-align: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        
        .income-stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .income-stat-label {
          font-size: 0.7rem;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .variance-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 8px;
        }
        
        .variance-positive {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .variance-negative {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .variance-neutral {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }
        
        .month-progress-indicator {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 12px;
          font-size: 0.8rem;
        }
        
        .financial-overview-grid .overview-stat.highlight {
          border: 2px solid #4f46e5;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
        }
        
        .overview-stat.actual-performance {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          color: white;
        }
        
        .overview-stat.actual-performance .stat-icon {
          color: white;
        }
        
        .overview-stat.actual-performance .variance-indicator {
          background: rgba(255, 255, 255, 0.25) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          font-weight: 700 !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
        }
        
        .two-column-stat {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          text-align: center;
        }
        
        .two-column-stat > div {
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }
        
        .stat-comparison {
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-size: 0.8rem;
        }
        
        /* FIXED: Import/Export Button Styling */
        .quick-actions .action-btn:nth-child(4),
        .quick-actions button[class*="export" i],
        .action-btn:has(.btn-icon:contains("📁")) {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%) !important;
          color: white !important;
          border: 2px solid #7c3aed !important;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
        }
        
        .quick-actions .action-btn:nth-child(4):hover,
        .quick-actions button[class*="export" i]:hover,
        .action-btn:has(.btn-icon:contains("📁")):hover {
          background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4) !important;
        }
        
        .quick-actions .action-btn:nth-child(5),
        .quick-actions button[class*="import" i],
        .action-btn:has(.btn-icon:contains("📂")) {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
          color: white !important;
          border: 2px solid #059669 !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3) !important;
        }
        
        .quick-actions .action-btn:nth-child(5):hover,
        .quick-actions button[class*="import" i]:hover,
        .action-btn:has(.btn-icon:contains("📂")):hover {
          background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4) !important;
        }

        /* Debugging info (temporary) */
        .debug-info {
          position: fixed;
          bottom: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 5px;
          font-size: 12px;
          font-family: monospace;
          z-index: 9999;
          max-width: 300px;
        }
      `}</style>

      <div className="page-header">
        <h2 className="page-title">🏠 Dashboard Overview</h2>
        <p className="page-description">
          Your complete budget overview with real-time income tracking and insights
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

      {/* Income Progress Card */}
      <Card title="💰 Income Progress This Month" className="income-progress-card">
        <div className="progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {formatCurrency(incomeAnalysis.totalActualIncome)}
            </span>
            <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>
              of {formatCurrency(incomeAnalysis.totalProjectedIncome)} projected
            </span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${Math.min(incomeAnalysis.percentReceived, 100)}%`,
                backgroundColor: getProgressColor(incomeAnalysis.percentReceived, incomeAnalysis.isOnTrack)
              }}
            />
          </div>
          
          <div className="progress-labels">
            <span>{incomeAnalysis.percentReceived.toFixed(1)}% received</span>
            <span>{incomeAnalysis.monthProgress.toFixed(1)}% through month</span>
          </div>
          
          <div className="month-progress-indicator">
            {incomeAnalysis.isOnTrack ? (
              <span>✅ On track - {formatCurrency(incomeAnalysis.progressVariance)} ahead of schedule</span>
            ) : (
              <span>⚠️ Behind schedule - {formatCurrency(Math.abs(incomeAnalysis.progressVariance))} expected by now</span>
            )}
          </div>
        </div>

        <div className="income-stats-grid">
          <div className="income-stat">
            <div className="income-stat-value">{formatCurrency(incomeAnalysis.variance)}</div>
            <div className="income-stat-label">Total Variance</div>
          </div>
          <div className="income-stat">
            <div className="income-stat-value">{formatCurrency(incomeAnalysis.expectedAtThisPoint)}</div>
            <div className="income-stat-label">Expected Now</div>
          </div>
          <div className="income-stat">
            <div className="income-stat-value">
              {incomeAnalysis.totalProjectedIncome - incomeAnalysis.totalActualIncome > 0 ? formatCurrency(incomeAnalysis.totalProjectedIncome - incomeAnalysis.totalActualIncome) : '$0'}
            </div>
            <div className="income-stat-label">Remaining</div>
          </div>
        </div>
      </Card>

      {/* Summary Cards - Full Width */}
      <SummaryCards />

      {/* Main Content - Two Column Layout */}
      <div className="homepage-main-content">

        {/* Left Column - Primary Content */}
        <div className="homepage-left-column">

          {/* Financial Overview with Better Grid Layout */}
          <Card title="💰 Financial Overview" className="financial-overview-card">
            <div className="financial-overview-alternative">
              {/* First Row: Income and Monthly Expenses */}
              <div className="financial-overview-row first-row">
                <div className="overview-stat">
                  <div className="stat-icon income">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value income">{formatCurrency(incomeAnalysis.totalProjectedIncome)}</div>
                    <div className="stat-label">Projected Income</div>
                  </div>
                </div>

                <div className="overview-stat actual-performance">
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(incomeAnalysis.totalActualIncome)}</div>
                    <div className="stat-label">Actual Income</div>
                    <span className={`variance-indicator ${incomeAnalysis.variance >= 0 ? 'variance-positive' : 'variance-negative'}`}>
                      {incomeAnalysis.variance >= 0 ? '↗' : '↘'} {formatCurrency(Math.abs(incomeAnalysis.variance))}
                    </span>
                  </div>
                </div>

                <div className="overview-stat">
                  <div className="stat-icon expense">💳</div>
                  <div className="stat-content">
                    <div className="stat-value expense">{formatCurrency(totalMonthlyExpenses)}</div>
                    <div className="stat-label">Monthly Expenses</div>
                  </div>
                </div>
              </div>

              {/* Second Row: Annual Impact, Net Cash (highlighted), Savings Rate */}
              <div className="financial-overview-row second-row">
                <div className="overview-stat">
                  <div className="stat-icon annual">📅</div>
                  <div className="stat-content">
                    <div className="stat-value annual">{formatCurrency(monthlyAnnualImpact)}</div>
                    <div className="stat-label">Annual Impact</div>
                  </div>
                </div>

                <div className="overview-stat highlight">
                  <div className={`stat-icon ${projectedNetMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                    {projectedNetMonthlyIncome >= 0 ? '📈' : '📉'}
                  </div>
                  <div className="stat-content">
                    <div className="two-column-stat">
                      <div>
                        <div className={`stat-value ${projectedNetMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(projectedNetMonthlyIncome)}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Projected Net</div>
                      </div>
                      <div>
                        <div className={`stat-value ${actualNetIncome >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(actualNetIncome)}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Actual Net</div>
                      </div>
                    </div>
                    <div className="stat-label">Net Monthly Cash</div>
                  </div>
                </div>

                <div className="overview-stat">
                  <div className={`stat-icon ${projectedSavingsRate >= 20 ? 'positive' : projectedSavingsRate >= 10 ? 'warning' : 'negative'}`}>
                    💰
                  </div>
                  <div className="stat-content">
                    <div className="two-column-stat">
                      <div>
                        <div className={`stat-value ${projectedSavingsRate >= 20 ? 'positive' : projectedSavingsRate >= 10 ? 'warning' : 'negative'}`}>
                          {projectedSavingsRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Projected</div>
                      </div>
                      <div>
                        <div className={`stat-value ${actualSavingsRate >= 20 ? 'positive' : actualSavingsRate >= 10 ? 'warning' : 'negative'}`}>
                          {actualSavingsRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Actual</div>
                      </div>
                    </div>
                    <div className="stat-label">Savings Rate</div>
                    {Math.abs(actualSavingsRate - projectedSavingsRate) > 1 && (
                      <div className="stat-comparison">
                        {actualSavingsRate > projectedSavingsRate ? '📈' : '📉'} 
                        {Math.abs(actualSavingsRate - projectedSavingsRate).toFixed(1)}% vs projected
                      </div>
                    )}
                  </div>
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

          {/* Budget Health with Actual Performance */}
          <Card title="🩺 Budget Health" className="health-card-compact">
            <div className="health-metrics-compact">
              <div className="health-item-compact">
                <div className="health-label">Income Progress</div>
                <div className="health-indicator">
                  <div className="indicator-bar">
                    <div
                      className="indicator-fill"
                      style={{
                        width: `${Math.min(incomeAnalysis.percentReceived, 100)}%`,
                        backgroundColor: getProgressColor(incomeAnalysis.percentReceived, incomeAnalysis.isOnTrack)
                      }}
                    ></div>
                  </div>
                  <span className="indicator-text">
                    {incomeAnalysis.percentReceived.toFixed(0)}% received
                  </span>
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Emergency Fund</div>
                <div className="health-indicator">
                  <div className="indicator-bar">
                    <div
                      className="indicator-fill"
                      style={{
                        width: `${Math.min((projectedNetMonthlyIncome * 6) / (totalMonthlyExpenses * 6) * 100, 100)}%`,
                        backgroundColor: projectedNetMonthlyIncome > 0 ? '#27ae60' : '#e74c3c'
                      }}
                    ></div>
                  </div>
                  <span className="indicator-text">
                    {projectedNetMonthlyIncome > 0 ? 'Building' : 'Attention'}
                  </span>
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Debt-to-Income</div>
                <div className="health-value">
                  {incomeAnalysis.totalProjectedIncome > 0 ? ((totalMonthlyExpenses / incomeAnalysis.totalProjectedIncome) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="health-item-compact">
                <div className="health-label">Budget Variance</div>
                <div className={`health-value ${incomeAnalysis.variance >= 0 ? 'positive' : 'negative'}`}>
                  {incomeAnalysis.variance >= 0 ? '+' : ''}{formatCurrency(incomeAnalysis.variance)}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Insights with Income Progress */}
          <Card title="💡 Quick Insights" className="insights-card-compact">
            <div className="insights-list-compact">
              {!incomeAnalysis.isOnTrack && (
                <div className="insight-item warning">
                  <span className="insight-icon">⏰</span>
                  <span className="insight-text">
                    Income {formatCurrency(Math.abs(incomeAnalysis.progressVariance))} behind schedule
                  </span>
                </div>
              )}

              {actualNetIncome < 0 && (
                <div className="insight-item warning">
                  <span className="insight-icon">⚠️</span>
                  <span className="insight-text">
                    Current net cash flow negative: {formatCurrency(actualNetIncome)}
                  </span>
                </div>
              )}

              {actualSavingsRate < 10 && actualNetIncome >= 0 && (
                <div className="insight-item warning">
                  <span className="insight-icon">📉</span>
                  <span className="insight-text">
                    Actual savings rate below 10%
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

              {incomeAnalysis.isOnTrack && actualSavingsRate >= 20 && (
                <div className="insight-item success">
                  <span className="insight-icon">✅</span>
                  <span className="insight-text">
                    Income on track & exceeding savings goals!
                  </span>
                </div>
              )}

              {incomeAnalysis.variance > 500 && (
                <div className="insight-item success">
                  <span className="insight-icon">🎉</span>
                  <span className="insight-text">
                    Income {formatCurrency(incomeAnalysis.variance)} above projected!
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

              {/* Always show a positive insight if no major issues */}
              {incomeAnalysis.isOnTrack && actualNetIncome >= 0 && actualSavingsRate >= 10 && upcomingExpenses.length === 0 && (
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

      {/* Debug Info - Shows calculation details (remove in production) */}
      <div className="debug-info">
        <strong>Debug Info (Updated Calculations):</strong><br/>
        Projected Income: {formatCurrency(incomeAnalysis.totalProjectedIncome)} (should match Income Sources page)<br/>
        Actual Income: {formatCurrency(incomeAnalysis.totalActualIncome)}<br/>
        Monthly Expenses: {formatCurrency(totalMonthlyExpenses)}<br/>
        Annual Impact: {formatCurrency(monthlyAnnualImpact)}<br/>
        Projected Net: {formatCurrency(projectedNetMonthlyIncome)}<br/>
        Actual Net: {formatCurrency(actualNetIncome)}<br/>
        <small>Should now match Income Sources total of $9,347.15</small>
      </div>
    </div>
  );
};

export default HomePage;