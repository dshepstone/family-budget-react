// src/components/charts/CashFlowChart.js
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useBudget } from '../../context/BudgetContext';
import { useTheme } from '../../context/ThemeContext';
import { currencyCalculator } from '../../plugins/calculators/CurrencyCalculator';

const CashFlowChart = () => {
  const { state, calculations, formatCurrency } = useBudget();
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    // Get weekly data from planner if available
    const plannerData = state.data.plannerState || {};
    const weeklyIncome = plannerData.weeklyIncome || [0, 0, 0, 0];
    const weeklyExpenses = plannerData.weeklyExpenses || [0, 0, 0, 0];

    // If no planner data, estimate from monthly totals
    const totalMonthlyIncome = calculations.getTotalIncome();
    const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
    const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
    const totalExpenses = currencyCalculator.add(totalMonthlyExpenses, monthlyAnnualImpact);

    // Create weekly projections
    const data = [];
    let cumulativeFlow = 0;

    for (let week = 1; week <= 4; week++) {
      const weekIndex = week - 1;
      
      // Use planner data if available, otherwise distribute monthly totals
      const income = weeklyIncome[weekIndex] || currencyCalculator.divide(totalMonthlyIncome, 4);
      const expenses = weeklyExpenses[weekIndex] || currencyCalculator.divide(totalExpenses, 4);
      const netFlow = currencyCalculator.subtract(income, expenses);
      
      cumulativeFlow = currencyCalculator.add(cumulativeFlow, netFlow);

      data.push({
        week: `Week ${week}`,
        income: Number(income.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        netFlow: Number(netFlow.toFixed(2)),
        cumulative: Number(cumulativeFlow.toFixed(2))
      });
    }

    return data;
  }, [state.data.plannerState, calculations]);

  const getChartColors = () => {
    return {
      income: isDark ? '#2ecc71' : '#27ae60',
      expenses: isDark ? '#e74c3c' : '#c0392b',
      netFlow: isDark ? '#3498db' : '#2980b9',
      cumulative: isDark ? '#f39c12' : '#e67e22',
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      text: isDark ? '#ecf0f1' : '#2c3e50'
    };
  };

  const colors = getChartColors();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p 
              key={index} 
              className="tooltip-item"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  return (
    <div className="cash-flow-chart">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid}
            />
            <XAxis 
              dataKey="week"
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 12 }}
            />
            <YAxis 
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 12 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: colors.text }}
            />
            
            {/* Reference line at zero */}
            <ReferenceLine y={0} stroke={colors.text} strokeDasharray="2 2" />
            
            {/* Income line */}
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke={colors.income}
              strokeWidth={2}
              dot={{ fill: colors.income, strokeWidth: 2, r: 4 }}
              name="Income"
            />
            
            {/* Expenses line */}
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke={colors.expenses}
              strokeWidth={2}
              dot={{ fill: colors.expenses, strokeWidth: 2, r: 4 }}
              name="Expenses"
            />
            
            {/* Net flow line */}
            <Line 
              type="monotone" 
              dataKey="netFlow" 
              stroke={colors.netFlow}
              strokeWidth={3}
              dot={{ fill: colors.netFlow, strokeWidth: 2, r: 5 }}
              name="Net Flow"
            />
            
            {/* Cumulative line */}
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke={colors.cumulative}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: colors.cumulative, strokeWidth: 2, r: 4 }}
              name="Cumulative"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-icon" style={{ color: colors.income }}>📈</span>
            <span className="stat-label">Avg Weekly Income:</span>
            <span className="stat-value">
              {formatCurrency(chartData.reduce((sum, week) => sum + week.income, 0) / 4)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon" style={{ color: colors.expenses }}>📉</span>
            <span className="stat-label">Avg Weekly Expenses:</span>
            <span className="stat-value">
              {formatCurrency(chartData.reduce((sum, week) => sum + week.expenses, 0) / 4)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon" style={{ color: colors.cumulative }}>💰</span>
            <span className="stat-label">Month-End Position:</span>
            <span className={`stat-value ${chartData[3]?.cumulative >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(chartData[3]?.cumulative || 0)}
            </span>
          </div>
        </div>

        {/* Cash Flow Health Indicator */}
        <div className="flow-health">
          <div className="health-label">Cash Flow Health:</div>
          <div className="health-indicators">
            {chartData.map((week, index) => (
              <div 
                key={index}
                className={`health-indicator ${week.netFlow >= 0 ? 'healthy' : 'warning'}`}
                title={`${week.week}: ${formatCurrency(week.netFlow)}`}
              >
                <div className="indicator-bar">
                  <div 
                    className="indicator-fill"
                    style={{ 
                      height: `${Math.min(Math.abs(week.netFlow) / 1000 * 100, 100)}%`,
                      backgroundColor: week.netFlow >= 0 ? colors.income : colors.expenses
                    }}
                  />
                </div>
                <span className="week-label">W{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowChart;