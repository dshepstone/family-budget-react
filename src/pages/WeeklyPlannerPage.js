// src/pages/WeeklyPlannerPage.js
import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { currencyCalculator } from '../plugins/calculators/CurrencyCalculator';
import { formatDate } from '../utils/formatters';

const WeeklyPlannerPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [weeklyData, setWeeklyData] = useState({
    weeklyIncome: [0, 0, 0, 0],
    weeklyExpenses: [0, 0, 0, 0],
    monthlyTargets: {}
  });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Load planner data from context
  useEffect(() => {
    if (state.data.plannerState) {
      setWeeklyData({
        weeklyIncome: state.data.plannerState.weeklyIncome || [0, 0, 0, 0],
        weeklyExpenses: state.data.plannerState.weeklyExpenses || [0, 0, 0, 0],
        monthlyTargets: state.data.plannerState.monthlyTargets || {}
      });
    }
  }, [state.data.plannerState]);

  // Save planner data to context
  const savePlannerData = (newData) => {
    setWeeklyData(newData);
    actions.updatePlanner(newData);
  };

  const handleIncomeChange = (weekIndex, value) => {
    const newData = {
      ...weeklyData,
      weeklyIncome: weeklyData.weeklyIncome.map((income, index) => 
        index === weekIndex ? currencyCalculator.parseAmount(value) : income
      )
    };
    savePlannerData(newData);
  };

  const handleExpenseChange = (weekIndex, value) => {
    const newData = {
      ...weeklyData,
      weeklyExpenses: weeklyData.weeklyExpenses.map((expense, index) => 
        index === weekIndex ? currencyCalculator.parseAmount(value) : expense
      )
    };
    savePlannerData(newData);
  };

  const autoDistributeIncome = () => {
    const totalMonthlyIncome = calculations.getTotalIncome();
    const weeklyAmount = currencyCalculator.divide(totalMonthlyIncome, 4);
    
    const newData = {
      ...weeklyData,
      weeklyIncome: [weeklyAmount, weeklyAmount, weeklyAmount, weeklyAmount]
    };
    savePlannerData(newData);
  };

  const autoDistributeExpenses = () => {
    const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
    const weeklyAmount = currencyCalculator.divide(totalMonthlyExpenses, 4);
    
    const newData = {
      ...weeklyData,
      weeklyExpenses: [weeklyAmount, weeklyAmount, weeklyAmount, weeklyAmount]
    };
    savePlannerData(newData);
  };

  const resetPlanner = () => {
    if (window.confirm('Reset all weekly planning data?')) {
      const newData = {
        weeklyIncome: [0, 0, 0, 0],
        weeklyExpenses: [0, 0, 0, 0],
        monthlyTargets: {}
      };
      savePlannerData(newData);
    }
  };

  const exportPlannerCSV = () => {
    const headers = ['Week', 'Income', 'Expenses', 'Net Flow', 'Cumulative'];
    const csvRows = [headers.join(',')];

    let cumulative = 0;
    weeklyData.weeklyIncome.forEach((income, index) => {
      const expenses = weeklyData.weeklyExpenses[index];
      const netFlow = currencyCalculator.subtract(income, expenses);
      cumulative = currencyCalculator.add(cumulative, netFlow);
      
      const row = [
        `Week ${index + 1}`,
        income,
        expenses,
        netFlow,
        cumulative
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);
      
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-planner-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate weekly statistics
  const getTotalWeeklyIncome = () => {
    return weeklyData.weeklyIncome.reduce((total, income) => 
      currencyCalculator.add(total, income), 0);
  };

  const getTotalWeeklyExpenses = () => {
    return weeklyData.weeklyExpenses.reduce((total, expense) => 
      currencyCalculator.add(total, expense), 0);
  };

  const getNetWeeklyFlow = () => {
    return currencyCalculator.subtract(getTotalWeeklyIncome(), getTotalWeeklyExpenses());
  };

  const getWeeklyNetFlows = () => {
    return weeklyData.weeklyIncome.map((income, index) => 
      currencyCalculator.subtract(income, weeklyData.weeklyExpenses[index])
    );
  };

  const getCumulativeFlows = () => {
    const netFlows = getWeeklyNetFlows();
    const cumulative = [];
    let running = 0;
    
    netFlows.forEach(flow => {
      running = currencyCalculator.add(running, flow);
      cumulative.push(running);
    });
    
    return cumulative;
  };

  // Get current month dates
  const getMonthWeeks = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const weeks = [];
    
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start on Sunday
    
    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        start: new Date(weekStart),
        end: new Date(weekEnd),
        number: i + 1
      });
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const monthWeeks = getMonthWeeks();
  const netFlows = getWeeklyNetFlows();
  const cumulativeFlows = getCumulativeFlows();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">📋 Weekly Budget Planner</h2>
        <p className="page-description">
          Plan your weekly cash flow and track budget performance across the month
        </p>
      </div>

      {/* Page Controls */}
      <div className="page-controls">
        <div className="control-group">
          <label htmlFor="planner-month">Planning Month:</label>
          <select
            id="planner-month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="month-select"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month} {currentYear}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <Button variant="secondary" onClick={autoDistributeIncome}>
            Auto-Distribute Income
          </Button>
          <Button variant="secondary" onClick={autoDistributeExpenses}>
            Auto-Distribute Expenses
          </Button>
          <Button variant="outline" onClick={exportPlannerCSV}>
            📁 Export CSV
          </Button>
          <Button variant="danger" onClick={resetPlanner}>
            Reset Planner
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-grid">
          <Card title="Total Weekly Income" className="summary-card">
            <div className="summary-amount income">
              {formatCurrency(getTotalWeeklyIncome())}
            </div>
            <div className="summary-details">
              Planned across 4 weeks
            </div>
          </Card>

          <Card title="Total Weekly Expenses" className="summary-card">
            <div className="summary-amount expense">
              {formatCurrency(getTotalWeeklyExpenses())}
            </div>
            <div className="summary-details">
              Distributed spending plan
            </div>
          </Card>

          <Card title="Net Weekly Flow" className="summary-card">
            <div className={`summary-amount ${getNetWeeklyFlow() >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(getNetWeeklyFlow())}
            </div>
            <div className="summary-details">
              {getNetWeeklyFlow() >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </Card>

          <Card title="Month-End Position" className="summary-card">
            <div className={`summary-amount ${cumulativeFlows[3] >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(cumulativeFlows[3] || 0)}
            </div>
            <div className="summary-details">
              Projected end balance
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Planning Grid */}
      <Card title="Weekly Cash Flow Planning" className="planner-card">
        <div className="planner-grid">
          <div className="planner-header">
            <div className="week-header">Week</div>
            <div className="income-header">Income</div>
            <div className="expense-header">Expenses</div>
            <div className="net-header">Net Flow</div>
            <div className="cumulative-header">Cumulative</div>
            <div className="status-header">Status</div>
          </div>

          {weeklyData.weeklyIncome.map((income, index) => {
            const expenses = weeklyData.weeklyExpenses[index];
            const netFlow = netFlows[index];
            const cumulative = cumulativeFlows[index];
            const week = monthWeeks[index];
            const isPositive = netFlow >= 0;
            const status = isPositive ? 'Surplus' : 'Deficit';

            return (
              <div key={index} className="planner-row">
                <div className="week-info">
                  <div className="week-number">Week {index + 1}</div>
                  <div className="week-dates">
                    {formatDate(week.start, 'MMM DD')} - {formatDate(week.end, 'MMM DD')}
                  </div>
                </div>

                <div className="income-input">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={income}
                    onChange={(e) => handleIncomeChange(index, e.target.value)}
                    placeholder="0.00"
                    className="week-input income"
                  />
                </div>

                <div className="expense-input">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenses}
                    onChange={(e) => handleExpenseChange(index, e.target.value)}
                    placeholder="0.00"
                    className="week-input expense"
                  />
                </div>

                <div className={`net-flow ${isPositive ? 'positive' : 'negative'}`}>
                  {formatCurrency(netFlow)}
                </div>

                <div className={`cumulative-flow ${cumulative >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(cumulative)}
                </div>

                <div className={`status-indicator ${isPositive ? 'good' : 'warning'}`}>
                  <span className="status-icon">
                    {isPositive ? '✓' : '⚠️'}
                  </span>
                  <span className="status-text">{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Budget vs Actual Comparison */}
      <Card title="Budget vs Planned Comparison" className="comparison-card">
        <div className="comparison-grid">
          <div className="comparison-section">
            <h4>Monthly Budget Targets</h4>
            <div className="comparison-stats">
              <div className="comparison-item">
                <span className="label">Total Income:</span>
                <span className="value income">{formatCurrency(calculations.getTotalIncome())}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Monthly Expenses:</span>
                <span className="value expense">{formatCurrency(calculations.getTotalMonthlyExpenses())}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Annual Impact:</span>
                <span className="value annual">{formatCurrency(calculations.getMonthlyAnnualImpact())}</span>
              </div>
              <div className="comparison-item highlight">
                <span className="label">Net Position:</span>
                <span className={`value ${calculations.getNetMonthlyIncome() >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(calculations.getNetMonthlyIncome())}
                </span>
              </div>
            </div>
          </div>

          <div className="comparison-section">
            <h4>Weekly Planning Totals</h4>
            <div className="comparison-stats">
              <div className="comparison-item">
                <span className="label">Planned Income:</span>
                <span className="value income">{formatCurrency(getTotalWeeklyIncome())}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Planned Expenses:</span>
                <span className="value expense">{formatCurrency(getTotalWeeklyExpenses())}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Variance:</span>
                <span className="value neutral">
                  {formatCurrency(currencyCalculator.subtract(
                    getTotalWeeklyExpenses(), 
                    calculations.getTotalMonthlyExpenses()
                  ))}
                </span>
              </div>
              <div className="comparison-item highlight">
                <span className="label">Net Position:</span>
                <span className={`value ${getNetWeeklyFlow() >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(getNetWeeklyFlow())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="variance-analysis">
          <h4>Variance Analysis</h4>
          <div className="variance-items">
            <div className="variance-item">
              <span className="variance-label">Income Variance:</span>
              <span className={`variance-value ${
                currencyCalculator.subtract(getTotalWeeklyIncome(), calculations.getTotalIncome()) >= 0 ? 'positive' : 'negative'
              }`}>
                {formatCurrency(currencyCalculator.subtract(getTotalWeeklyIncome(), calculations.getTotalIncome()))}
              </span>
            </div>
            <div className="variance-item">
              <span className="variance-label">Expense Variance:</span>
              <span className={`variance-value ${
                currencyCalculator.subtract(getTotalWeeklyExpenses(), calculations.getTotalMonthlyExpenses()) <= 0 ? 'positive' : 'negative'
              }`}>
                {formatCurrency(currencyCalculator.subtract(getTotalWeeklyExpenses(), calculations.getTotalMonthlyExpenses()))}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Insights */}
      <Card title="💡 Planning Insights" className="insights-card">
        <div className="insights-list">
          {getNetWeeklyFlow() < 0 && (
            <div className="insight-item warning">
              <span className="insight-icon">⚠️</span>
              <span className="insight-text">
                Weekly planning shows a deficit of {formatCurrency(Math.abs(getNetWeeklyFlow()))}
              </span>
            </div>
          )}
          
          {netFlows.filter(flow => flow < 0).length > 0 && (
            <div className="insight-item warning">
              <span className="insight-icon">📉</span>
              <span className="insight-text">
                {netFlows.filter(flow => flow < 0).length} week(s) show negative cash flow
              </span>
            </div>
          )}
          
          {Math.abs(currencyCalculator.subtract(getTotalWeeklyIncome(), calculations.getTotalIncome())) > 100 && (
            <div className="insight-item info">
              <span className="insight-icon">📊</span>
              <span className="insight-text">
                Significant variance from monthly budget - review planning assumptions
              </span>
            </div>
          )}
          
          {getNetWeeklyFlow() >= 0 && netFlows.every(flow => flow >= 0) && (
            <div className="insight-item success">
              <span className="insight-icon">✅</span>
              <span className="insight-text">
                Excellent planning! All weeks show positive cash flow
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default WeeklyPlannerPage;