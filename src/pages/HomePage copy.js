// src/pages/HomePage.js - Complete with BudgetContext Calculations
import React, { useMemo, useState } from 'react';
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

  // Add help accordion state
  const [helpAccordions, setHelpAccordions] = useState({
    actualIncome: false,
    netCashFlow: false,
    projectedIncome: false,
    monthlyExpenses: false,
    savingsRate: false,
    monthComplete: false,
    legalDisclaimer: false
  });

  // Helper function to toggle help accordions
  const toggleHelpAccordion = (cardType) => {
    setHelpAccordions(prev => ({
      ...prev,
      [cardType]: !prev[cardType]
    }));
  };

  // Helper function to parse amounts safely
  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value && value !== 0) return 0;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculate projected income using the same logic as Income Sources page
  const totalProjectedIncome = useMemo(() => {
    const income = state.data.income || [];
    return income.reduce((total, item) => {
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
        case 'semi-monthly':
          monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected * 2;
          break;
        case 'monthly':
          monthlyProjected = hasDates ? perCheckProjected * item.payDates.length : perCheckProjected;
          break;
        default:
          monthlyProjected = perCheckProjected;
      }

      return total + monthlyProjected;
    }, 0);
  }, [state.data.income]);

  // Calculate actual income received to date (FIXED - original behavior)
  const totalActualIncome = useMemo(() => {
    const income = state.data.income || [];
    return income.reduce((total, item) => {
      const hasDates = Array.isArray(item.payDates) && item.payDates.length > 0;
      
      // 1) If per-date actuals exist, sum them (these are month-aware)
      if (Array.isArray(item.payActuals) && item.payActuals.length > 0) {
        return total + item.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0);
      }
      
      // 2) Use actualAmount only (never fall back to projected)
      const perCheckActual = parseAmount(item.actualAmount || 0);
      
      // 3) If user says "overall actual is monthly total", just use it
      if (item.actualMode === 'monthly-total') {
        return total + perCheckActual;
      }
      
      // 4) Otherwise treat as per-paycheck and multiply by frequency
      let monthlyActual = 0;
      switch (item.frequency) {
        case 'weekly':
          monthlyActual = hasDates ? perCheckActual * item.payDates.length : perCheckActual * (52 / 12);
          break;
        case 'bi-weekly':
          monthlyActual = hasDates ? perCheckActual * item.payDates.length : perCheckActual * (26 / 12);
          break;
        case 'semi-monthly':
          monthlyActual = hasDates ? perCheckActual * item.payDates.length : perCheckActual * 2;
          break;
        case 'monthly':
          monthlyActual = hasDates ? perCheckActual * item.payDates.length : perCheckActual;
          break;
        default:
          monthlyActual = perCheckActual;
      }

      return total + monthlyActual;
    }, 0);
  }, [state.data.income]);

  // Enhanced income analysis using corrected calculations
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
  const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact ? calculations.getMonthlyAnnualImpact() : calculations.getTotalAnnualExpenses() / 12;
  
  // Calculate net income using both projected and actual
  const projectedNetMonthlyIncome = totalProjectedIncome - totalMonthlyExpenses - monthlyAnnualImpact;
  const actualNetIncome = totalActualIncome - totalMonthlyExpenses - monthlyAnnualImpact;
  
  // Calculate savings rates
  const projectedSavingsRate = totalProjectedIncome > 0 ? (projectedNetMonthlyIncome / totalProjectedIncome) * 100 : 0;
  const actualSavingsRate = totalActualIncome > 0 ? (actualNetIncome / totalActualIncome) * 100 : 0;
  
  const upcomingExpenses = calculations.getUpcomingExpenses ? calculations.getUpcomingExpenses() : [];

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
          background: rgba(255, 255, 255, 0.15);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .income-stat-value {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .income-stat-label {
          font-size: 0.75rem;
          opacity: 0.9;
          font-weight: 600;
        }
        
        .income-stat-explanation {
          font-size: 0.7rem;
          opacity: 0.8;
          margin-top: 4px;
          line-height: 1.2;
        }
        
        .month-progress-indicator {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .income-explanation-section {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .income-explanation-title {
          font-weight: 700;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        
        .income-explanation-text {
          font-size: 0.8rem;
          line-height: 1.4;
          opacity: 0.95;
        }
        
        .financial-overview-alternative {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .financial-overview-row {
          display: grid;
          gap: 16px;
        }
        
        .financial-overview-row.featured-row {
          grid-template-columns: 1fr;
        }
        
        .financial-overview-row.second-row {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .financial-overview-row.third-row {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .overview-stat.actual-performance {
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
          border: 1px solid #0891b2;
          color: white;
        }
        
        .overview-stat.actual-performance .stat-icon {
          color: white;
        }
        
        .overview-stat.actual-performance .variance-indicator {
          background: rgba(0, 0, 0, 0.4) !important;
          color: #ffffff !important;
          border: 2px solid rgba(255, 255, 255, 0.5) !important;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9) !important;
          font-weight: 800 !important;
          font-size: 0.85rem !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }
        
        .overview-stat {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 0.75rem;
          transition: all 0.2s ease;
          min-height: 70px;
          position: relative;
        }
        
        .overview-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        
        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .stat-content {
          flex: 1;
          min-width: 0;
        }
        
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .two-column-stat {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          text-align: center;
        }
        
        /* Help Accordion Styles */
        .card-with-help {
          position: relative;
        }

        .help-toggle {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: #6b7280;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .help-toggle:hover {
          background: rgba(0, 0, 0, 0.2);
          color: #374151;
          transform: scale(1.1);
        }

        .overview-stat.actual-performance .help-toggle {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: rgba(255, 255, 255, 0.8);
        }

        .overview-stat.actual-performance .help-toggle:hover {
          background: rgba(0, 0, 0, 0.4);
          color: white;
        }

        .help-accordion {
          margin-top: 12px;
          overflow: hidden;
          transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
        }

        .help-accordion.closed {
          max-height: 0;
          opacity: 0;
        }

        .help-accordion.open {
          max-height: 500px;
          opacity: 1;
        }

        .help-content {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
        }

        .overview-stat.actual-performance .help-content {
          background: rgba(255, 255, 255, 0.95);
          color: #374151;
        }

        .help-content h4 {
          margin: 0 0 8px 0;
          font-weight: 600;
          color: #111827;
          font-size: 0.9rem;
        }

        .help-content ul {
          margin: 8px 0 0 0;
          padding-left: 16px;
        }

        .help-content li {
          margin-bottom: 4px;
        }

        .help-content strong {
          color: #1f2937;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .financial-overview-row.second-row {
            flex-direction: column;
          }
          
          .financial-overview-row.third-row {
            grid-template-columns: 1fr;
          }
          
          .overview-stat.cash-flow-card {
            min-width: auto;
          }
          
          .overview-stat.full-width .stat-content > div {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .variance-indicator {
            margin-left: 0;
            margin-top: 8px;
          }
          
          .financial-overview-row.featured-row {
            grid-template-columns: 1fr;
          }
        }

        /* Give Net Cash Flow a little more breathing room */
        .overview-stat.net-cash {
          min-height: 96px;
        }

        /* Prevent the two numbers from squishing on narrower widths */
        .overview-stat.net-cash .two-column-stat {
          grid-template-columns: repeat(2, minmax(160px, 1fr));
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

      {/* Enhanced Income Progress Card with Better Explanations */}
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
            <div className="income-stat-explanation">
              Difference between actual and projected income for the full month
            </div>
          </div>
          <div className="income-stat">
            <div className="income-stat-value">{formatCurrency(incomeAnalysis.expectedAtThisPoint)}</div>
            <div className="income-stat-label">Expected by Now</div>
            <div className="income-stat-explanation">
              How much income you should have received by day {new Date().getDate()} of this month
            </div>
          </div>
          <div className="income-stat">
            <div className="income-stat-value">
              {incomeAnalysis.totalProjectedIncome - incomeAnalysis.totalActualIncome > 0 ? 
                formatCurrency(incomeAnalysis.totalProjectedIncome - incomeAnalysis.totalActualIncome) : '$0'}
            </div>
            <div className="income-stat-label">Still Expected</div>
            <div className="income-stat-explanation">
              Amount still projected to be received this month from all income sources
            </div>
          </div>
        </div>

        <div className="income-explanation-section">
          <div className="income-explanation-title">📊 How These Numbers Work</div>
          <div className="income-explanation-text">
            <strong>Actual Income:</strong> Total money you've received this month from all sources (salary, freelance, etc.). 
            <strong>Projected Income:</strong> Expected monthly total based on your income frequency settings. 
            <strong>Progress Tracking:</strong> Compares your actual income to what you should have received by today's date, helping you stay on track with your budget goals.
          </div>
        </div>
      </Card>

      {/* Summary Cards - Full Width */}
      <SummaryCards />

      {/* Main Content - Two Column Layout */}
      <div className="homepage-main-content">

        {/* Left Column - Primary Content */}
        <div className="homepage-left-column">

          {/* Financial Overview with Help Accordions - ENHANCED */}
          <Card title="💰 Financial Overview" className="financial-overview-card">
            <div className="financial-overview-alternative">
              {/* First Row: Full-width Actual Monthly Income with help */}
              <div className="financial-overview-row featured-row">
                <div className="overview-stat actual-performance full-width card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('actualIncome')}
                    aria-label="Help for Actual Monthly Income"
                  >
                    ?
                  </button>
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div>
                        <div className="stat-value">{formatCurrency(incomeAnalysis.totalActualIncome)}</div>
                        <div className="stat-label">Actual Monthly Income</div>
                      </div>
                      <span className={`variance-indicator ${incomeAnalysis.variance >= 0 ? 'variance-positive' : 'variance-negative'}`}>
                        {incomeAnalysis.variance >= 0 ? '↗' : '↘'} {formatCurrency(Math.abs(incomeAnalysis.variance))} vs projected
                      </span>
                    </div>
                    <div className={`help-accordion ${helpAccordions.actualIncome ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>💵 Actual Monthly Income</h4>
                        <p><strong>What it shows:</strong> The real money you've received this month from all income sources.</p>
                        <p><strong>How it's calculated:</strong></p>
                        <ul>
                          <li>Takes your actual income amounts from each paycheck</li>
                          <li>Multiplies by pay frequency (weekly, bi-weekly, etc.)</li>
                          <li>Shows month-to-date total across all income sources</li>
                        </ul>
                        <p><strong>The variance indicator</strong> shows how much you're above or below your projected income target for the month.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row: Net Cash Flow (Two Numbers) with help */}
              <div className="financial-overview-row featured-row">
                <div className="overview-stat net-cash full-width card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('netCashFlow')}
                    aria-label="Help for Net Cash Flow"
                  >
                    ?
                  </button>
                  <div className="stat-icon">📈</div>
                  <div className="stat-content">
                    <div className="two-column-stat">
                      <div>
                        <div className={`stat-value ${projectedNetMonthlyIncome >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(projectedNetMonthlyIncome)}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Projected</div>
                      </div>
                      <div>
                        <div className={`stat-value ${actualNetIncome >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(actualNetIncome)}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: '0.8' }}>Actual</div>
                      </div>
                    </div>
                    <div className="stat-label">Net Cash Flow</div>
                    <div className={`help-accordion ${helpAccordions.netCashFlow ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>📈 Net Cash Flow</h4>
                        <p><strong>What it shows:</strong> How much money you have left after paying all monthly expenses.</p>
                        <p><strong>Formula:</strong> Income - Monthly Expenses = Net Cash Flow</p>
                        <ul>
                          <li><strong>Projected:</strong> Expected leftover money based on projected income</li>
                          <li><strong>Actual:</strong> Real leftover money based on actual income received</li>
                          <li><strong>Positive (green):</strong> You have money left over for savings/goals</li>
                          <li><strong>Negative (red):</strong> You're spending more than you earn this month</li>
                        </ul>
                        <p><strong>Goal:</strong> Keep this positive to build emergency funds and reach financial goals.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Row: Projected Income + Expenses with help */}
              <div className="financial-overview-row second-row">
                <div className="overview-stat card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('projectedIncome')}
                    aria-label="Help for Projected Income"
                  >
                    ?
                  </button>
                  <div className="stat-icon income">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value income">{formatCurrency(incomeAnalysis.totalProjectedIncome)}</div>
                    <div className="stat-label">Projected Monthly Income</div>
                    <div className={`help-accordion ${helpAccordions.projectedIncome ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>🎯 Projected Monthly Income</h4>
                        <p><strong>What it shows:</strong> Expected total income for the entire month.</p>
                        <p><strong>Based on:</strong></p>
                        <ul>
                          <li>Your projected income amounts per paycheck</li>
                          <li>Pay frequency (weekly = 4-5 checks, bi-weekly = 2-3 checks, etc.)</li>
                          <li>All active income sources combined</li>
                        </ul>
                        <p><strong>Use this to:</strong> Plan monthly spending, set savings goals, and budget for upcoming expenses.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overview-stat card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('monthlyExpenses')}
                    aria-label="Help for Monthly Expenses"
                  >
                    ?
                  </button>
                  <div className="stat-icon expenses">🧾</div>
                  <div className="stat-content">
                    <div className="stat-value expenses">{formatCurrency(totalMonthlyExpenses)}</div>
                    <div className="stat-label">Monthly Expenses</div>
                    <div className={`help-accordion ${helpAccordions.monthlyExpenses ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>🧾 Monthly Expenses</h4>
                        <p><strong>What it includes:</strong></p>
                        <ul>
                          <li>All monthly recurring expenses (rent, utilities, subscriptions)</li>
                          <li>Monthly portion of annual expenses (car insurance, taxes)</li>
                          <li>Based on your actual or budgeted amounts</li>
                        </ul>
                        <p><strong>Goal:</strong> Keep this number lower than your projected income to maintain positive cash flow.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Third Row: Savings Rates + Month Complete with help */}
              <div className="financial-overview-row third-row">
                <div className="overview-stat card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('savingsRate')}
                    aria-label="Help for Savings Rate"
                  >
                    ?
                  </button>
                  <div className="stat-icon savings">💰</div>
                  <div className="stat-content">
                    <div className="stat-value savings">{actualSavingsRate.toFixed(1)}%</div>
                    <div className="stat-label">Actual Savings Rate</div>
                    <div className={`help-accordion ${helpAccordions.savingsRate ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>💰 Savings Rate</h4>
                        <p><strong>What it shows:</strong> What percentage of your income you're able to save.</p>
                        <p><strong>Formula:</strong> (Net Cash Flow ÷ Income) × 100</p>
                        <p><strong>Benchmarks:</strong></p>
                        <ul>
                          <li><strong>20%+:</strong> Excellent - building wealth quickly</li>
                          <li><strong>10-20%:</strong> Good - on track for financial goals</li>
                          <li><strong>5-10%:</strong> Okay - but could improve</li>
                          <li><strong>Below 5%:</strong> Consider reducing expenses</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overview-stat projected card-with-help">
                  <button 
                    className="help-toggle"
                    onClick={() => toggleHelpAccordion('monthComplete')}
                    aria-label="Help for Month Complete"
                  >
                    ?
                  </button>
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <div className="stat-value">{incomeAnalysis.monthProgress.toFixed(1)}%</div>
                    <div className="stat-label">Month Complete</div>
                    <div className={`help-accordion ${helpAccordions.monthComplete ? 'open' : 'closed'}`}>
                      <div className="help-content">
                        <h4>📅 Month Complete</h4>
                        <p><strong>What it shows:</strong> How far through the current month you are, as a percentage.</p>
                        <p><strong>Why it matters:</strong></p>
                        <ul>
                          <li>Helps evaluate if your income is on track</li>
                          <li>Useful for pacing monthly spending</li>
                          <li>Context for interpreting other financial metrics</li>
                        </ul>
                        <p><strong>Example:</strong> If you're 50% through the month, you should ideally have received about 50% of your expected monthly income.</p>
                      </div>
                    </div>
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

      {/* Collapsible Legal Disclaimer Footer */}
      <footer className="legal-disclaimer-footer" style={{
        marginTop: '3rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-tertiary, #f8fafc)',
        borderRadius: '8px',
        border: '1px solid var(--border-light, #e5e7eb)'
      }}>
        <button
          onClick={() => setHelpAccordions(prev => ({ ...prev, legalDisclaimer: !prev.legalDisclaimer }))}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #6b7280)',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-secondary, #f1f5f9)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <span>📋 Legal Disclaimer & Terms of Use</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
            {helpAccordions.legalDisclaimer ? '▲' : '▼'}
          </span>
        </button>
        
        <div className={`help-accordion ${helpAccordions.legalDisclaimer ? 'open' : 'closed'}`}>
          <div style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
            borderRadius: '6px',
            padding: '1rem',
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted, #6b7280)',
            lineHeight: '1.4',
            border: '1px solid var(--border-light, #e5e7eb)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ color: 'var(--text-secondary, #4b5563)' }}>Important Legal Notice</strong>
            </div>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Family Budget Simplified</strong> is provided for informational and educational purposes only. 
              This application is not intended to provide financial, investment, legal, tax, or accounting advice. 
              The creators, developers, and distributors of this application disclaim any and all liability for 
              decisions made based on information provided by this software.
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Users acknowledge that all financial decisions are made at their own risk and discretion. 
              This application does not constitute professional financial advice, and users are strongly 
              encouraged to consult with qualified financial advisors, accountants, or other professionals 
              before making any financial decisions.
            </p>
            <p style={{ margin: '0' }}>
              No warranty, express or implied, is provided regarding the accuracy, completeness, or reliability 
              of any calculations, projections, or information provided. Users assume full responsibility for 
              verifying all data and calculations before making financial decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;