// src/components/charts/ExpenseBreakdown.js
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBudget } from '../../context/BudgetContext';
import { useTheme } from '../../context/ThemeContext';
import { EXPENSE_CATEGORIES, CHART_COLORS } from '../../utils/constants';
import { formatCategoryName } from '../../utils/formatters';

const ExpenseBreakdown = ({ data, type = 'combined' }) => {
  const { formatCurrency } = useBudget();
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    if (!data) return [];

    const processedData = [];
    
    if (type === 'combined' || type === 'monthly') {
      // Process monthly data
      Object.entries(data.monthlyData || {}).forEach(([categoryKey, total]) => {
        if (total > 0) {
          const category = EXPENSE_CATEGORIES.MONTHLY.find(cat => cat.key === categoryKey);
          processedData.push({
            name: category?.name || formatCategoryName(categoryKey),
            value: total,
            type: 'monthly',
            icon: category?.icon || '📊',
            categoryKey
          });
        }
      });
    }

    if (type === 'combined' || type === 'annual') {
      // Process annual data (as monthly equivalent)
      Object.entries(data.annualData || {}).forEach(([categoryKey, total]) => {
        if (total > 0) {
          const category = EXPENSE_CATEGORIES.ANNUAL.find(cat => cat.key === categoryKey);
          processedData.push({
            name: category?.name || formatCategoryName(categoryKey),
            value: total,
            type: 'annual',
            icon: category?.icon || '📊',
            categoryKey
          });
        }
      });
    }

    // Sort by value (largest first)
    return processedData.sort((a, b) => b.value - a.value);
  }, [data, type]);

  const getColors = () => {
    const baseColors = isDark ? [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f',
      '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50'
    ] : CHART_COLORS.PRIMARY;

    return baseColors;
  };

  const colors = getColors();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-icon">{data.icon}</span>
            <span className="tooltip-name">{data.name}</span>
          </div>
          <div className="tooltip-content">
            <p className="tooltip-value">
              Amount: {formatCurrency(data.value)}
            </p>
            <p className="tooltip-percentage">
              {((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}% of total
            </p>
            <p className="tooltip-type">
              Type: {data.type === 'monthly' ? 'Monthly' : 'Annual (monthly avg)'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill={isDark ? '#ecf0f1' : '#2c3e50'}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="expense-breakdown empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h4>No Expense Data</h4>
          <p>Add some expenses to see the breakdown chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-breakdown">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with detailed breakdown */}
      <div className="breakdown-legend">
        <div className="legend-header">
          <h4>Expense Categories</h4>
          <div className="total-amount">
            Total: {formatCurrency(totalAmount)}
          </div>
        </div>
        
        <div className="legend-items">
          {chartData.map((item, index) => {
            const percentage = ((item.value / totalAmount) * 100).toFixed(1);
            
            return (
              <div key={item.categoryKey} className="legend-item">
                <div className="legend-indicator">
                  <div 
                    className="color-dot"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="category-icon">{item.icon}</span>
                </div>
                
                <div className="legend-content">
                  <div className="legend-name">{item.name}</div>
                  <div className="legend-details">
                    <span className="legend-amount">{formatCurrency(item.value)}</span>
                    <span className="legend-percentage">({percentage}%)</span>
                    <span className={`legend-type ${item.type}`}>
                      {item.type === 'monthly' ? 'Monthly' : 'Annual'}
                    </span>
                  </div>
                </div>

                <div className="legend-bar">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="breakdown-insights">
        <div className="insights-header">💡 Quick Insights</div>
        <div className="insights-list">
          {chartData.length > 0 && (
            <div className="insight-item">
              <span>Largest category: {chartData[0].name} ({((chartData[0].value / totalAmount) * 100).toFixed(1)}%)</span>
            </div>
          )}
          
          {chartData.length >= 3 && (
            <div className="insight-item">
              <span>Top 3 categories account for {((chartData.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / totalAmount) * 100).toFixed(1)}% of expenses</span>
            </div>
          )}
          
          <div className="insight-item">
            <span>Tracking {chartData.length} expense categories</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseBreakdown;