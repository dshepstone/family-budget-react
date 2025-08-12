// src/components/SummaryCards.js - Enhanced with Help Dropdown Menus
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';

const SummaryCards = () => {
  const { calculations, formatCurrency } = useBudget();

  // Add help accordion state for each summary card
  const [helpAccordions, setHelpAccordions] = useState({
    'net-income': false,
    'total-income': false,
    'monthly-expenses': false,
    'annual-impact': false
  });

  // Helper function to toggle help accordions
  const toggleHelpAccordion = (cardType) => {
    setHelpAccordions(prev => ({
      ...prev,
      [cardType]: !prev[cardType]
    }));
  };

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
      description: 'Income minus all expenses',
      helpContent: {
        title: '💰 Net Monthly Cash',
        description: 'Shows how much money you have left after paying all monthly expenses.',
        details: [
          'Formula: Total Income - Monthly Expenses - Annual Impact = Net Cash',
          'Positive (green): You have money left over for savings and goals',
          'Negative (red): You\'re spending more than you earn this month',
          'This is your available cash flow for savings, investments, or emergency funds'
        ],
        goal: 'Keep this positive to build wealth and achieve financial stability.'
      }
    },
    {
      id: 'total-income',
      label: 'Total Monthly Income',
      value: totalIncome,
      className: 'income',
      icon: '💵',
      description: 'All income sources combined',
      helpContent: {
        title: '💵 Total Monthly Income',
        description: 'Your complete monthly income from all sources combined.',
        details: [
          'Includes salary, freelance work, side hustles, and other income',
          'Based on projected amounts and pay frequency settings',
          'Automatically calculates monthly equivalent (weekly × 4.33, bi-weekly × 2.17, etc.)',
          'Used as the foundation for all budget calculations'
        ],
        goal: 'Maximize this through career growth, side income, or investment returns.'
      }
    },
    {
      id: 'monthly-expenses',
      label: 'Monthly Expenses',
      value: totalMonthlyExpenses,
      className: 'expense',
      icon: '💳',
      description: 'Recurring monthly expenses',
      helpContent: {
        title: '💳 Monthly Expenses',
        description: 'Your total recurring monthly expenses across all categories.',
        details: [
          'Includes rent/mortgage, utilities, groceries, subscriptions, etc.',
          'Based on actual amounts when available, otherwise budgeted amounts',
          'Does not include annual expenses (those are shown separately)',
          'Automatically tracks and categorizes your spending patterns'
        ],
        goal: 'Keep under 80% of income to maintain healthy cash flow and savings.'
      }
    },
    {
      id: 'annual-impact',
      label: 'Annual Impact (Monthly)',
      value: monthlyAnnualImpact,
      className: 'annual',
      icon: '📅',
      description: 'Annual expenses divided by 12',
      helpContent: {
        title: '📅 Annual Impact (Monthly)',
        description: 'Shows the monthly impact of your annual expenses.',
        details: [
          'Takes yearly expenses (insurance, taxes, memberships) and divides by 12',
          'Helps you plan monthly savings for large annual bills',
          'Includes property taxes, car registration, annual subscriptions, etc.',
          'Prevents budget surprises when annual expenses come due'
        ],
        goal: 'Set aside this amount monthly so annual expenses don\'t strain your budget.'
      }
    }
  ];

  return (
    <>
      <style jsx>{`
        .summary-section {
          margin: 1.5rem 0;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .summary-card {
          position: relative;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 0.75rem;
          padding: 1.25rem;
          border: 1px solid var(--border-light, #e5e7eb);
          transition: all 0.2s ease;
          min-height: 120px;
          display: flex;
          flex-direction: column;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .summary-card.positive {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-color: #10b981;
        }

        .summary-card.negative {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-color: #ef4444;
        }

        .summary-card.income {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }

        .summary-card.expense {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          border-color: #f59e0b;
        }

        .summary-card.annual {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border-color: #6366f1;
        }

        .summary-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .summary-icon-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .summary-icon {
          font-size: 1.5rem;
        }

        .summary-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary, #111827);
        }

        .summary-amount {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.5rem 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .summary-amount.positive {
          color: #059669;
        }

        .summary-amount.negative {
          color: #dc2626;
        }

        .summary-amount.income {
          color: #2563eb;
        }

        .summary-amount.expense {
          color: #d97706;
        }

        .summary-amount.annual {
          color: #7c3aed;
        }

        .summary-description {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-top: auto;
        }

        .summary-trend {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
        }

        .trend-indicator {
          font-size: 0.875rem;
        }

        /* Help Toggle Styles */
        .help-toggle {
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
          flex-shrink: 0;
        }

        .help-toggle:hover {
          background: rgba(0, 0, 0, 0.2);
          color: #374151;
          transform: scale(1.1);
        }

        /* Help Accordion Styles */
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
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
        }

        .help-content h4 {
          margin: 0 0 8px 0;
          font-weight: 600;
          color: #111827;
          font-size: 0.9rem;
        }

        .help-content p {
          margin: 0 0 8px 0;
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

        .help-goal {
          margin-top: 8px;
          padding: 8px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 6px;
          border-left: 3px solid #10b981;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
          
          .summary-card {
            min-height: 100px;
          }
          
          .summary-amount {
            font-size: 1.25rem;
          }
        }
      `}</style>

      <div className="summary-section">
        <div className="summary-grid">
          {summaryData.map(item => (
            <div key={item.id} className={`summary-card ${item.className}`}>
              <div className="summary-header">
                <div className="summary-icon-label">
                  <div className="summary-icon">{item.icon}</div>
                  <div className="summary-label">{item.label}</div>
                </div>
                <button 
                  className="help-toggle"
                  onClick={() => toggleHelpAccordion(item.id)}
                  aria-label={`Help for ${item.label}`}
                >
                  ?
                </button>
              </div>
              
              <div className={`summary-amount ${item.className}`}>
                {formatCurrency(item.value)}
              </div>
              
              <div className="summary-description">{item.description}</div>
              
              <div className="summary-trend">
                <span className="trend-indicator">
                  {item.value > 0 && item.className === 'positive' ? '↗️' : 
                   item.value < 0 && item.className === 'negative' ? '↘️' : ''}
                </span>
              </div>

              {/* Help Accordion */}
              <div className={`help-accordion ${helpAccordions[item.id] ? 'open' : 'closed'}`}>
                <div className="help-content">
                  <h4>{item.helpContent.title}</h4>
                  <p><strong>What it shows:</strong> {item.helpContent.description}</p>
                  <p><strong>Key Details:</strong></p>
                  <ul>
                    {item.helpContent.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                  <div className="help-goal">
                    <strong>Goal:</strong> {item.helpContent.goal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SummaryCards;