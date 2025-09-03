import React from 'react';
import { useBudget } from '../context/BudgetContext';
import PaymentSourceIndicator from './PaymentSourceIndicator';

export default function CrossMonthDashboard() {
  const { state, formatCurrency } = useBudget();
  const data = state.data.crossMonthData || {};
  return (
    <div className="cross-month-dashboard">
      <h3>Cross-Month Funds</h3>
      <div>Carryover: {formatCurrency(data.currentMonthCarryover || 0)}</div>
      <div>Allocated to Next Month: {formatCurrency(data.nextMonthAllocation || 0)}</div>
      <ul>
        {(data.allocationDetails || []).map((d, i) => (
          <li key={i}>
            <PaymentSourceIndicator sourceType="previousMonth" />
            {d.expenseName}: {formatCurrency(d.allocatedAmount)} from {d.sourcePaycheque}
          </li>
        ))}
      </ul>
    </div>
  );
}
