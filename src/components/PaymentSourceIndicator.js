import React from 'react';

const SOURCE_CLASSES = {
  currentMonth: 'current-month',
  previousMonth: 'previous-month',
  carryover: 'carryover'
};

export default function PaymentSourceIndicator({ sourceType = 'currentMonth', amount, paychequeDate }) {
  const cls = SOURCE_CLASSES[sourceType] || SOURCE_CLASSES.currentMonth;
  const tooltip = paychequeDate
    ? `${sourceType} pay on ${paychequeDate}`
    : sourceType;
  return (
    <span className={`fund-indicator ${cls}`} title={tooltip}>
      {amount ? <span className="sr-only">{amount}</span> : null}
    </span>
  );
}
