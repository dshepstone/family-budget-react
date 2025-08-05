// src/components/SummaryCards.js
import React from 'react';
import { useBudget } from '../context/BudgetContext';

const SummaryCards = () => {
  const { calculations, formatCurrency } = useBudget();

  const totalIncome = calculations.getTotalIncome();
  const totalMonthlyExpenses = calculations.getTotalMonthlyExpenses();
  const monthlyAnnualImpact = calculations.getMonthlyAnnualImpact();
  const netMonthlyIncome = calculations.getNetMonthlyIncome();

  const summaryData = [
    {
      id: 'net-income',
      label: 'Net Monthly Cash',
      value: netMonthlyIncome,
      className: netMonthlyIncome >= 0 ? 'positive' : 'negative',
      icon: '💰',
      description: 'Income minus all expenses'
    },
    {
      id: 'total-income',
      label: 'Total Monthly Income',
      value: totalIncome,
      className: 'income',
      icon: '💵',
      description: 'All income sources combined'
    },
    {
      id: 'monthly-expenses',
      label: 'Monthly Expenses',
      value: totalMonthlyExpenses,
      className: 'expense',
      icon: '💳',
      description: 'Recurring monthly expenses'
    },
    {
      id: 'annual-impact',
      label: 'Annual Impact (Monthly)',
      value: monthlyAnnualImpact,
      className: 'annual',
      icon: '📅',
      description: 'Annual expenses divided by 12'
    }
  ];

  return (
    <div className="summary-section">
      <div className="summary-grid">
        {summaryData.map(item => (
          <div key={item.id} className={`summary-card ${item.className}`}>
            <div className="summary-icon">{item.icon}</div>
            <div className="summary-content">
              <div className="summary-label">{item.label}</div>
              <div className={`summary-amount ${item.className}`}>
                {formatCurrency(item.value)}
              </div>
              <div className="summary-description">{item.description}</div>
            </div>
            <div className="summary-trend">
              {/* You can add trend arrows or percentage changes here */}
              <span className="trend-indicator">
                {item.value > 0 && item.className === 'positive' ? '↗️' : 
                 item.value < 0 && item.className === 'negative' ? '↘️' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;