import React from 'react';

/**
 * QuickEntrySection renders a grid of inputs allowing users to quickly
 * update paycheque dates and amounts. Previously this component was defined
 * inside `IncomePage`, which caused React to recreate it on every render and
 * resulted in input fields losing focus after a single character. Moving it
 * to its own file gives the component a stable identity so focus is preserved
 * while typing.
 */
const QuickEntrySection = ({
  incomeData,
  quickEntryData,
  updateFeedback,
  handleQuickEntryDateChange,
  handleQuickEntryAmountChange,
  handleQuickEntryAmountBlur,
  handleQuickEntryUpdate,
  getMaxPayDates,
  getMonthAwareMonthlyAmount,
  formatCurrencyUtil
}) => {
  const incomeSources = incomeData.filter(
    (income) => getMaxPayDates(income.frequency) > 0
  );

  if (incomeSources.length === 0) {
    return (
      <div className="quick-entry-section">
        <div className="quick-entry-no-sources">
          <h3>💰 No Income Sources for Quick Entry</h3>
          <p>
            Add income sources with weekly, bi-weekly, or monthly frequencies to
            use quick paycheque entry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-entry-section">
      <div className="quick-entry-header">
        <h2 className="quick-entry-title">⚡ Quick Paycheque Entry</h2>
        <p className="quick-entry-subtitle">
          Quickly update your actual paycheque amounts as you receive them
        </p>
      </div>

      <div className="quick-entry-grid">
        {incomeSources.map((income) => {
          const maxDates = getMaxPayDates(income.frequency);
          const incomeKey = income.id || `name:${income.name}`;

          const projectedMonthly = getMonthAwareMonthlyAmount(
            income,
            'projected'
          );
          const actualMonthly = getMonthAwareMonthlyAmount(income, 'actual');

          return (
            <div key={incomeKey} className="quick-entry-card">
              <div className="quick-entry-card-header">
                <h3 className="quick-entry-source-name">{income.name}</h3>
                <span className="quick-entry-frequency">{income.frequency}</span>
              </div>

              <div className="quick-entry-pay-dates">
                {Array.from({ length: maxDates }).map((_, index) => {
                  const currentDate =
                    quickEntryData[incomeKey]?.payDates?.[index] ??
                    income.payDates?.[index] ??
                    '';
                  const currentAmount =
                    quickEntryData[incomeKey]?.payActuals?.[index] ??
                    (income.payActuals?.[index] !== undefined
                      ? String(income.payActuals[index])
                      : '');

                  const feedbackKey = `${incomeKey}:${index}`;
                  const buttonState = updateFeedback[feedbackKey] || 'idle';
                  const isUpdated = buttonState === 'saved';

                  return (
                    <div
                      key={`${incomeKey}:row:${index}`}
                      className="quick-entry-pay-row"
                    >
                      <input
                        type="date"
                        className={`quick-entry-date-input ${
                          income.payDates?.[index] ? 'has-existing-data' : ''
                        }`}
                        value={currentDate}
                        onChange={(e) =>
                          handleQuickEntryDateChange(
                            incomeKey,
                            index,
                            e.target.value
                          )
                        }
                        placeholder="Pay date"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[-0-9.,]*"
                        autoComplete="off"
                        className={`quick-entry-amount-input ${
                          income.payActuals?.[index] !== undefined &&
                          income.payActuals[index] !== ''
                            ? 'has-existing-data'
                            : ''
                        }`}
                        placeholder="Amount received"
                        value={currentAmount}
                        onChange={(e) =>
                          handleQuickEntryAmountChange(
                            incomeKey,
                            index,
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleQuickEntryAmountBlur(incomeKey, index)
                        }
                      />
                      <button
                        className={`quick-entry-update-btn ${
                          isUpdated ? 'updated' : ''
                        }`}
                        onClick={() => handleQuickEntryUpdate(incomeKey, index)}
                        disabled={!currentDate}
                        style={{
                          background: isUpdated
                            ? 'rgba(16, 185, 129, 0.3)'
                            : '',
                          color: isUpdated ? '#065f46' : ''
                        }}
                      >
                        {isUpdated ? 'Updated!' : 'Update'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="quick-entry-summary">
                <div className="quick-entry-summary-item">
                  <span className="quick-entry-summary-label">Projected:</span>
                  <span className="quick-entry-summary-value">
                    {formatCurrencyUtil(projectedMonthly)}
                  </span>
                </div>
                <div className="quick-entry-summary-item">
                  <span className="quick-entry-summary-label">Actual:</span>
                  <span className="quick-entry-summary-value">
                    {formatCurrencyUtil(actualMonthly)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickEntrySection;

