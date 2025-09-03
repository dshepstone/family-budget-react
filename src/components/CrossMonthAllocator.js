import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import PaymentSourceIndicator from './PaymentSourceIndicator';

export default function CrossMonthAllocator({ income, onClose }) {
  const { state, actions, formatCurrency } = useBudget();
  const [allocations, setAllocations] = useState(income.carryOverAllocations || {});

  const upcomingExpenses = Object.values(state.data.monthly || {})
    .flat()
    .filter(exp => exp.paymentOrigin?.sourceType === 'previousMonth');

  const handleChange = (name, value) => {
    setAllocations(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSave = () => {
    actions.allocateEndOfMonthFunds(income.id, allocations);
    onClose && onClose();
  };

  return (
    <div className="cross-month-allocator">
      <h3>Allocate {formatCurrency(income.amount)} from {income.name}</h3>
      <div className="allocator-list">
        {upcomingExpenses.map(exp => (
          <div key={exp.id} className="allocator-item">
            <PaymentSourceIndicator sourceType={exp.paymentOrigin?.sourceType} />
            <span>{exp.name}</span>
            <input
              type="number"
              value={allocations[exp.id] || ''}
              onChange={e => handleChange(exp.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button onClick={handleSave}>Save Allocations</button>
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  );
}
