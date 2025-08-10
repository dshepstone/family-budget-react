// src/pages/WeeklyPlannerPage.js - Enhanced with Actual vs Projected Income Logic
import React, { useState, useEffect, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext';
import { WeeklyPlannerPrint } from '../utils/printUtils';

const WeeklyPlannerPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [weekVisibility, setWeekVisibility] = useState(Array(5).fill(true));
  const [hideZeroRows, setHideZeroRows] = useState(false);

  // Get month/year from first pay date instead of current date - FIXED DATE PARSING
  const getBudgetMonthYear = useCallback(() => {
    // Find the first income source with pay dates to determine the budget month/year
    for (const income of (state.data.income || [])) {
      if (income.payDates && income.payDates.length > 0) {
        const dateString = income.payDates[0];
        // Parse date string manually to avoid timezone issues
        // Format: "YYYY-MM-DD"
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        return {
          month: month - 1, // Convert to 0-indexed month (August = 7)
          year: year
        };
      }
    }
    // Fallback to current date if no pay dates found
    return {
      month: new Date().getMonth(),
      year: new Date().getFullYear()
    };
  }, [state.data.income]);

  const { month: currentMonth, year: currentYear } = getBudgetMonthYear();

  // ENHANCED: Get weekly income amounts using ACTUAL vs PROJECTED logic
  const getWeeklyIncomeAmounts = useCallback(() => {
    const weeklyIncome = [0, 0, 0, 0, 0];

    // Helper function to parse amounts (same as IncomePage.js)
    const parseAmount = (value) => {
      if (typeof value === 'number') return value;
      if (!value && value !== 0) return 0;
      const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    // Process each income source with ACTUAL vs PROJECTED priority
    (state.data.income || []).forEach(income => {
      const payDates = Array.isArray(income.payDates) ? income.payDates : [];
      const perPayProjected = parseAmount(income.projectedAmount || income.amount);
      const perPayActual = parseAmount(income.actualAmount);

      // PRIORITY 1: Use actual pay dates with actual amounts if available (most accurate)
      if (payDates.length > 0 && Array.isArray(income.payActuals) && income.payActuals.length > 0) {
        payDates.forEach((dateStr, index) => {
          if (income.payActuals[index] !== undefined && income.payActuals[index] !== null) {
            // Parse date string manually to avoid timezone issues
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const payMonth = month - 1; // Convert to 0-indexed month
            const payYear = year;
            const dayOfMonth = day;
            
            // Only process dates that are in the current month being viewed
            if (payMonth === currentMonth && payYear === currentYear) {
              // Calculate which week this date falls into
              let weekIndex;
              if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                weekIndex = 0; // Week 1: days 1-7
              } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                weekIndex = 1; // Week 2: days 8-14
              } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                weekIndex = 2; // Week 3: days 15-21
              } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
                weekIndex = 3; // Week 4: days 22-28
              } else if (dayOfMonth >= 29) {
                weekIndex = 4; // Week 5: days 29+
              }
              
              if (weekIndex >= 0 && weekIndex < 5) {
                const actualAmount = parseAmount(income.payActuals[index]);
                weeklyIncome[weekIndex] += actualAmount;
              }
            }
          } else {
            // Fall back to projected for this specific pay date
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const payMonth = month - 1;
            const payYear = year;
            const dayOfMonth = day;
            
            if (payMonth === currentMonth && payYear === currentYear) {
              let weekIndex;
              if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                weekIndex = 0;
              } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                weekIndex = 1;
              } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                weekIndex = 2;
              } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
                weekIndex = 3;
              } else if (dayOfMonth >= 29) {
                weekIndex = 4;
              }
              
              if (weekIndex >= 0 && weekIndex < 5) {
                weeklyIncome[weekIndex] += perPayProjected;
              }
            }
          }
        });
      }
      // PRIORITY 2: Use actual mode with overall actual amount
      else if (income.actualMode === 'monthly-total' && perPayActual > 0) {
        // Distribute the monthly actual total across pay periods based on frequency
        if (payDates.length > 0) {
          // Distribute actual amount across specific pay dates
          const actualPerCheck = perPayActual / payDates.length;
          payDates.forEach(dateStr => {
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const payMonth = month - 1;
            const payYear = year;
            const dayOfMonth = day;
            
            if (payMonth === currentMonth && payYear === currentYear) {
              let weekIndex;
              if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                weekIndex = 0;
              } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                weekIndex = 1;
              } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                weekIndex = 2;
              } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
                weekIndex = 3;
              } else if (dayOfMonth >= 29) {
                weekIndex = 4;
              }
              
              if (weekIndex >= 0 && weekIndex < 5) {
                weeklyIncome[weekIndex] += actualPerCheck;
              }
            }
          });
        } else {
          // Distribute evenly across 4 weeks if no specific dates
          const weeklyAmount = perPayActual / 4;
          for (let i = 0; i < 4; i++) {
            weeklyIncome[i] += weeklyAmount;
          }
        }
      }
      // PRIORITY 3: Use per-paycheck actual amount
      else if (perPayActual > 0) {
        if (payDates.length > 0) {
          payDates.forEach(dateStr => {
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const payMonth = month - 1;
            const payYear = year;
            const dayOfMonth = day;
            
            if (payMonth === currentMonth && payYear === currentYear) {
              let weekIndex;
              if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                weekIndex = 0;
              } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                weekIndex = 1;
              } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                weekIndex = 2;
              } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
                weekIndex = 3;
              } else if (dayOfMonth >= 29) {
                weekIndex = 4;
              }
              
              if (weekIndex >= 0 && weekIndex < 5) {
                weeklyIncome[weekIndex] += perPayActual;
              }
            }
          });
        } else {
          // Distribute based on frequency pattern
          switch (income.frequency) {
            case 'weekly':
              for (let i = 0; i < 4; i++) {
                weeklyIncome[i] += perPayActual;
              }
              break;
            case 'bi-weekly':
              weeklyIncome[0] += perPayActual;
              weeklyIncome[2] += perPayActual;
              break;
            case 'semi-monthly':
              weeklyIncome[0] += perPayActual;
              weeklyIncome[2] += perPayActual;
              break;
            case 'monthly':
              weeklyIncome[0] += perPayActual;
              break;
            default:
              const weeklyAmount = perPayActual / 4;
              for (let i = 0; i < 4; i++) {
                weeklyIncome[i] += weeklyAmount;
              }
          }
        }
      }
      // PRIORITY 4: Use projected amounts as fallback when no actual amounts available
      else {
        if (payDates.length > 0) {
          payDates.forEach(dateStr => {
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const payMonth = month - 1;
            const payYear = year;
            const dayOfMonth = day;
            
            if (payMonth === currentMonth && payYear === currentYear) {
              let weekIndex;
              if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                weekIndex = 0;
              } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                weekIndex = 1;
              } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                weekIndex = 2;
              } else if (dayOfMonth >= 22 && dayOfMonth <= 28) {
                weekIndex = 3;
              } else if (dayOfMonth >= 29) {
                weekIndex = 4;
              }
              
              if (weekIndex >= 0 && weekIndex < 5) {
                weeklyIncome[weekIndex] += perPayProjected;
              }
            }
          });
        } else if (income.weeks && Array.isArray(income.weeks)) {
          // Use manually set weekly amounts if no pay dates
          income.weeks.forEach((amount, index) => {
            if (index < 5) {
              weeklyIncome[index] += parseAmount(amount);
            }
          });
        } else {
          // Fallback: Distribute based on frequency pattern when no specific dates
          let monthlyAmount = 0;
          
          // Calculate monthly amount using same logic as IncomePage.js
          switch (income.frequency) {
            case 'weekly':
              monthlyAmount = perPayProjected * (52 / 12);
              break;
            case 'bi-weekly':
              monthlyAmount = perPayProjected * (26 / 12);
              break;
            case 'monthly':
              monthlyAmount = perPayProjected;
              break;
            case 'quarterly':
              monthlyAmount = perPayProjected / 3;
              break;
            case 'semi-annual':
              monthlyAmount = perPayProjected / 6;
              break;
            case 'annual':
              monthlyAmount = perPayProjected / 12;
              break;
            case 'one-time':
              monthlyAmount = 0;
              break;
            default:
              monthlyAmount = perPayProjected;
          }

          // Distribute based on frequency pattern
          switch (income.frequency) {
            case 'weekly':
              const weeklyAmount = monthlyAmount / 4.33;
              for (let i = 0; i < 4; i++) {
                weeklyIncome[i] += weeklyAmount;
              }
              break;
              
            case 'bi-weekly':
              weeklyIncome[0] += perPayProjected;
              weeklyIncome[2] += perPayProjected;
              if (monthlyAmount > perPayProjected * 2) {
                weeklyIncome[4] += (monthlyAmount - perPayProjected * 2);
              }
              break;
              
            case 'monthly':
              weeklyIncome[0] += monthlyAmount;
              break;
              
            default:
              const evenAmount = monthlyAmount / 4;
              for (let i = 0; i < 4; i++) {
                weeklyIncome[i] += evenAmount;
              }
          }
        }
      }
    });

    return weeklyIncome;
  }, [state.data.income, currentMonth, currentYear]);

  // Auto-populate planner when component mounts or when monthly/annual data changes
  useEffect(() => {
    actions.autoPopulatePlanner();
  }, [state.data.monthly, state.data.annual]);

  // Get all expenses from monthly and annual data
  const getAllExpenses = useCallback(() => {
    const allExpenses = [];

    // Process monthly expenses
    if (state.data.monthly) {
      Object.entries(state.data.monthly).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          expenses.forEach(expense => {
            if (expense.name && expense.name.trim()) {
              allExpenses.push({
                ...expense,
                categoryKey,
                categoryName: getCategoryName(categoryKey),
                monthlyAmount: parseFloat(expense.actual || expense.amount || 0),
                type: 'monthly',
                isAnnual: false
              });
            }
          });
        }
      });
    }

    // Process annual expenses (convert to monthly equivalent)
    if (state.data.annual) {
      Object.entries(state.data.annual).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          expenses.forEach(expense => {
            if (expense.name && expense.name.trim()) {
              const annualAmount = parseFloat(expense.actual || expense.amount || 0);
              allExpenses.push({
                ...expense,
                categoryKey: `annual-${categoryKey}`,
                categoryName: `${getCategoryName(categoryKey)} (Annual)`,
                monthlyAmount: annualAmount / 12,
                type: 'annual',
                isAnnual: true,
                originalAnnualAmount: annualAmount
              });
            }
          });
        }
      });
    }

    return allExpenses;
  }, [state.data.monthly, state.data.annual]);

  // Get category name
  const getCategoryName = (categoryKey) => {
    const categoryNames = {
      housing: 'Housing',
      taxes: 'Taxes',
      utilities: 'Utilities',
      insurance: 'Insurance',
      banking: 'Banking',
      loans: 'Loans',
      credit: 'Credit',
      subscriptions: 'Subscriptions',
      food: 'Food',
      transportation: 'Transportation',
      medical: 'Medical',
      personal: 'Personal',
      shopping: 'Shopping',
      dog: 'Dog',
      maintenance: 'Maintenance',
      gifts: 'Gifts',
      'yearly-subs': 'Yearly Subscriptions',
      'yearly-car': 'Yearly Car',
      'yearly-bank': 'Yearly Banking'
    };

    return categoryNames[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  };

  // Get planner data for expense
  const getExpensePlannerData = (expenseName) => {
    return state.data.plannerState?.[expenseName] || {
      weeks: Array(5).fill(0),
      transferred: Array(5).fill(false),
      paid: Array(5).fill(false)
    };
  };

  const handlePrint = () => {
    const printContent = WeeklyPlannerPrint.generatePrintContent(
      state.data,
      calculations,
      formatCurrency
    );
    WeeklyPlannerPrint.openPrintWindow(printContent, 'Weekly Budget Planner');
  };

  // Update planner data for expense
  const updateExpensePlannerData = (expenseName, newData) => {
    const updatedPlannerState = {
      ...state.data.plannerState,
      [expenseName]: newData
    };
    actions.updatePlanner(updatedPlannerState);
  };

  // Handle week amount change
  const handleWeekAmountChange = (expenseName, weekIndex, value) => {
    const currentData = getExpensePlannerData(expenseName);
    const newWeeks = [...currentData.weeks];
    newWeeks[weekIndex] = parseFloat(value) || 0;

    updateExpensePlannerData(expenseName, {
      ...currentData,
      weeks: newWeeks
    });
  };

  // Handle status change with cross-page syncing
  const handleStatusChange = (expense, weekIndex, type, checked) => {
    actions.updateExpenseStatus(
      expense.id,
      expense.name,
      weekIndex,
      type,
      checked,
      'weekly'
    );
  };

  // Handle quick actions
  const handleQuickAction = (expenseName, weekIndex, action, monthlyAmount) => {
    let newValue = 0;

    switch (action) {
      case 'reset':
        newValue = 0;
        break;
      case 'full':
        newValue = monthlyAmount;
        break;
      case 'half':
        newValue = monthlyAmount / 2;
        break;
      case 'quarter':
        newValue = monthlyAmount / 4;
        break;
      default:
        return;
    }

    handleWeekAmountChange(expenseName, weekIndex, newValue);
  };

  // Calculate week totals - FIXED to only use planner week data
  const calculateWeekTotals = () => {
    const weekTotals = [0, 0, 0, 0, 0]; // Initialize 5 weeks
    const plannerData = state.data.plannerState || {};

    // Calculate expense totals for each week
    Object.entries(plannerData).forEach(([expenseName, expenseData]) => {
      // Skip non-expense entries like 'weeklyIncome', 'weeklyExpenses', etc.
      if (expenseName === 'weeklyIncome' || expenseName === 'weeklyExpenses' || expenseName === 'monthlyTargets') {
        return; // Skip these system entries
      }

      if (expenseData && expenseData.weeks && Array.isArray(expenseData.weeks)) {
        expenseData.weeks.forEach((amount, weekIndex) => {
          if (weekIndex < 5) {
            const parsedAmount = parseFloat(amount) || 0;
            weekTotals[weekIndex] += parsedAmount;
          }
        });
      }
    });

    return weekTotals;
  };

  // Check if an expense row has all zero values
  const hasAllZeroValues = (expense) => {
    const expenseData = getExpensePlannerData(expense.name);
    const monthlyAmount = expense.monthlyAmount || 0;
    const weeklySum = expenseData.weeks.reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    
    // Hide if monthly amount is 0 AND all weekly amounts are 0
    return monthlyAmount === 0 && weeklySum === 0;
  };

  // Toggle zero rows visibility
  const toggleZeroRows = () => {
    setHideZeroRows(!hideZeroRows);
  };

  // Calculate remaining balance for expense
  const calculateRemainingBalance = (expense, weeklyAmounts) => {
    const monthlyAmount = expense.monthlyAmount;
    const weeklySum = weeklyAmounts.reduce((sum, amount) => sum + amount, 0);
    return monthlyAmount - weeklySum;
  };

  // Toggle week visibility
  const toggleWeekVisibility = (weekIndex) => {
    const newVisibility = [...weekVisibility];
    newVisibility[weekIndex] = !newVisibility[weekIndex];
    setWeekVisibility(newVisibility);
  };

  // Reset week - FIXED to work with actual planner data
  const resetWeek = (weekIndex) => {
    if (!window.confirm(`Are you sure you want to reset all Week ${weekIndex + 1} planned amounts to zero?`)) {
      return;
    }

    const plannerData = state.data.plannerState || {};
    const updatedPlannerState = { ...plannerData };

    // Reset the specific week for all expenses in planner state
    Object.entries(plannerData).forEach(([expenseName, expenseData]) => {
      // Skip non-expense entries
      if (expenseName === 'weeklyIncome' || expenseName === 'weeklyExpenses' || expenseName === 'monthlyTargets') {
        return;
      }

      if (expenseData && expenseData.weeks && Array.isArray(expenseData.weeks)) {
        const newWeeks = [...expenseData.weeks];
        newWeeks[weekIndex] = 0;
        
        updatedPlannerState[expenseName] = {
          ...expenseData,
          weeks: newWeeks
        };
      }
    });

    actions.updatePlanner(updatedPlannerState);
  };

  // Reset all weeks - FIXED to work with actual planner data
  const resetAllWeeks = () => {
    if (!window.confirm('Are you sure you want to reset all weekly planned amounts to zero?')) {
      return;
    }

    const plannerData = state.data.plannerState || {};
    const updatedPlannerState = { ...plannerData };

    // Reset all expense entries in planner state
    Object.entries(plannerData).forEach(([expenseName, expenseData]) => {
      // Skip non-expense entries
      if (expenseName === 'weeklyIncome' || expenseName === 'weeklyExpenses' || expenseName === 'monthlyTargets') {
        return;
      }

      if (expenseData && expenseData.weeks && Array.isArray(expenseData.weeks)) {
        updatedPlannerState[expenseName] = {
          ...expenseData,
          weeks: Array(5).fill(0)
        };
      }
    });

    actions.updatePlanner(updatedPlannerState);
  };

  // Calculate week date ranges using budget month/year - FIXED DATE PARSING
  const getWeekDateRange = (weekIndex) => {
    const { month: budgetMonth, year: budgetYear } = getBudgetMonthYear();
    
    // Create dates manually to avoid timezone issues
    const weekStartDay = 1 + weekIndex * 7;
    const weekStartDate = new Date(budgetYear, budgetMonth, weekStartDay);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    // Ensure week end doesn't go past month end
    const monthEnd = new Date(budgetYear, budgetMonth + 1, 0);
    if (weekEndDate > monthEnd) {
      weekEndDate.setTime(monthEnd.getTime());
    }

    // Format dates as YYYY-MM-DD to match input format
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(weekStartDate),
      end: formatDate(weekEndDate)
    };
  };

  // Auto-distribute expenses evenly across weeks
  const autoDistributeExpenses = () => {
    if (!window.confirm('Auto-distribute all expenses evenly across weeks? This will overwrite current weekly planning.')) {
      return;
    }

    const allExpenses = getAllExpenses();
    allExpenses.forEach(expense => {
      const weeklyAmount = expense.monthlyAmount / 5;
      const currentData = getExpensePlannerData(expense.name);
      updateExpensePlannerData(expense.name, {
        ...currentData,
        weeks: Array(5).fill(weeklyAmount)
      });
    });
  };

  // Group expenses by category for display
  const groupExpensesByCategory = () => {
    const allExpenses = getAllExpenses();
    const grouped = {};

    allExpenses.forEach(expense => {
      if (!grouped[expense.categoryKey]) {
        grouped[expense.categoryKey] = {
          name: expense.categoryName,
          expenses: []
        };
      }
      grouped[expense.categoryKey].expenses.push(expense);
    });

    return grouped;
  };

  const weekTotals = calculateWeekTotals();
  // ENHANCED: Use the improved weekly income calculation with actual vs projected logic
  const weeklyIncome = getWeeklyIncomeAmounts();
  const groupedExpenses = groupExpensesByCategory();

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* All the existing styles from your original file */}
      <style>{`
        .weekly-planner-page {
          padding: 20px;
          background-color: #fff;
          min-height: 100vh;
        }

        .page-title {
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 1.8rem;
          font-weight: 600;
        }

        .page-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          flex-wrap: wrap;
          gap: 15px;
        }

        .week-visibility-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .week-visibility-controls label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
          cursor: pointer;
        }

        .action-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .planner-table-container {
          overflow-x: auto;
          width: 100%;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .planner-table {
          width: 100%;
          border-collapse: collapse;
          background-color: #fff;
          font-size: 0.9rem;
          min-width: 1200px;
        }

        .planner-table th,
        .planner-table td {
          padding: 8px;
          border: 1px solid #dee2e6;
          text-align: center;
          vertical-align: middle;
        }

        .planner-table th {
          background-color: #007bff;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .planner-table th:first-child {
          text-align: left;
          width: 25%;
        }

        .planner-table th.status-header {
          min-width: 60px;
          font-size: 0.8rem;
        }

        .week-date-range-inputs {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 4px 0;
        }

        /* Fixed date input styles with proper specificity */
        .planner-table th .week-date-start,
        .planner-table th .week-date-end {
          font-size: 0.7rem !important;
          padding: 1px 2px !important;
          border: 1px solid rgba(255,255,255,0.5) !important;
          border-radius: 2px !important;
          background-color: rgba(255,255,255,0.9) !important;
          color: #495057 !important;
          transition: all 0.2s ease;
          cursor: default;
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: textfield;
          appearance: none;
        }

        /* Ensure readability on hover */
        .planner-table th .week-date-start:hover,
        .planner-table th .week-date-end:hover {
          background-color: white !important;
          border-color: #007bff !important;
          color: #495057 !important;
        }

        /* Even when disabled/readonly, keep readable */
        .planner-table th .week-date-start:disabled,
        .planner-table th .week-date-start[readonly],
        .planner-table th .week-date-end:disabled,
        .planner-table th .week-date-end[readonly] {
          background-color: rgba(255,255,255,0.9) !important;
          color: #495057 !important;
          opacity: 1 !important;
        }

        .category-row {
          background-color: #f8f9fa !important;
          font-weight: bold;
          color: #2c3e50;
        }

        .category-row td {
          text-align: left;
          padding-left: 15px;
          font-size: 1rem;
          background-color: #f8f9fa;
        }

        .expense-name {
          text-align: left !important;
          padding-left: 20px !important;
          font-weight: 500;
          color: #495057;
        }

        .annual-indicator {
          font-size: 0.7rem;
          color: #6c757d;
          font-style: italic;
        }

        .planner-input-group {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          position: relative;
          width: 100%;
        }

        .table-input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.85rem;
          text-align: right;
          background-color: #fff;
          color: #495057;
          transition: all 0.2s ease;
        }

        .table-input:focus {
          outline: 2px solid #007bff;
          outline-offset: -1px;
          border-color: #007bff;
        }

        .table-input.has-value {
          background-color: #e8f5e8 !important;
          border-color: #28a745 !important;
          font-weight: 600 !important;
          color: #155724 !important;
        }

        .table-input.zero-value {
          background-color: #fff;
          border-color: #dee2e6;
          font-weight: normal;
        }

        .planner-action-select {
          font-size: 0.75rem;
          padding: 2px 4px;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          background-color: #f8f9fa;
          color: #495057;
          cursor: pointer;
          max-width: 100%;
        }

        .planner-action-select:hover {
          background-color: #e9ecef;
        }

        .status-cell {
          text-align: center !important;
          padding: 4px !important;
          min-width: 60px;
          vertical-align: middle;
        }

        .status-checkboxes {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .transferred-checkbox,
        .paid-checkbox {
          margin: 2px;
          transform: scale(1.1);
          cursor: pointer;
        }

        .transferred-checkbox:checked {
          accent-color: #ffc107;
        }

        .paid-checkbox:checked {
          accent-color: #28a745;
        }

        .remaining-amount {
          font-weight: 600 !important;
          text-align: right;
          padding-right: 12px !important;
        }

        .table-footer {
          background-color: #f8f9fa;
          font-weight: bold;
          border-top: 2px solid #007bff;
        }

        .table-footer td {
          padding: 12px 8px;
          font-size: 0.85rem;
          vertical-align: top;
        }

        .table-footer .cash-flow-positive {
          color: #28a745;
        }

        .table-footer .cash-flow-negative {
          color: #dc3545;
        }

        .cash-flow-analysis {
          margin-top: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 100%);
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .cash-flow-analysis h3 {
          margin-bottom: 15px;
          color: #2c3e50;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .cash-flow-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
        }

        .cash-flow-grid > div {
          text-align: center;
          padding: 12px;
          background-color: rgba(255,255,255,0.8);
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .week-label {
          font-size: 0.9rem;
          color: #7f8c8d;
          margin-bottom: 5px;
        }

        .balance-amount {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .balance-amount.positive {
          color: #27ae60;
        }

        .balance-amount.negative {
          color: #e74c3c;
        }

        .hidden {
          display: none !important;
        }

        .income-section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #e8f5e8;
          border-radius: 8px;
          border: 1px solid #28a745;
        }

        .income-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .income-week {
          text-align: center;
          padding: 8px;
          background-color: rgba(255,255,255,0.8);
          border-radius: 4px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover {
          background-color: #1e7e34;
        }

        .btn-success.active {
          background-color: #155724;
          border-color: #155724;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
        }

        /* Enhanced income section with actual/projected indicator */
        .income-indicator {
          font-size: 0.75rem;
          color: #155724;
          margin-top: 2px;
          font-style: italic;
        }

        .actual-income {
          border-left: 3px solid #28a745;
        }

        .projected-income {
          border-left: 3px solid #ffc107;
        }

        @media (max-width: 768px) {
          .page-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .cash-flow-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .income-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <h2 className="page-title">📋 Weekly Budget Planner</h2>

      {/* Enhanced Income Section with Actual vs Projected Indicator */}
      <div className="income-section">
        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>💵 Weekly Income (Actual vs Projected)</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#155724' }}>
          ✨ <strong>Smart Income Tracking:</strong> Shows actual amounts when available, falls back to projected amounts as placeholders
        </p>
        <div className="income-summary">
          {weeklyIncome.map((income, index) => {
            // Determine if this week has actual or projected data
            const hasActualData = (state.data.income || []).some(incomeSource => {
              const payDates = Array.isArray(incomeSource.payDates) ? incomeSource.payDates : [];
              const payActuals = Array.isArray(incomeSource.payActuals) ? incomeSource.payActuals : [];
              
              return payDates.some((dateStr, payIndex) => {
                const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
                const payMonth = month - 1;
                const payYear = year;
                const dayOfMonth = day;
                
                if (payMonth === currentMonth && payYear === currentYear) {
                  let weekIndex;
                  if (dayOfMonth >= 1 && dayOfMonth <= 7) weekIndex = 0;
                  else if (dayOfMonth >= 8 && dayOfMonth <= 14) weekIndex = 1;
                  else if (dayOfMonth >= 15 && dayOfMonth <= 21) weekIndex = 2;
                  else if (dayOfMonth >= 22 && dayOfMonth <= 28) weekIndex = 3;
                  else if (dayOfMonth >= 29) weekIndex = 4;
                  
                  return weekIndex === index && (
                    (payActuals[payIndex] !== undefined && payActuals[payIndex] !== null) ||
                    incomeSource.actualAmount > 0
                  );
                }
                return false;
              });
            });

            return (
              <div 
                key={index} 
                className={`income-week ${!weekVisibility[index] ? 'hidden' : ''} ${hasActualData ? 'actual-income' : 'projected-income'}`}
              >
                <div className="week-label">Week {index + 1}</div>
                <div style={{ fontWeight: 'bold', color: '#155724' }}>
                  {formatCurrency(income)}
                </div>
                <div className="income-indicator">
                  {hasActualData ? '✅ Actual' : '📊 Projected'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rest of your existing component with all the controls and table */}
      <div className="page-controls">
        <div className="week-visibility-controls">
          <span style={{ fontWeight: '600' }}>Show Weeks:</span>
          {Array.from({ length: 5 }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={weekVisibility[i]}
                onChange={() => toggleWeekVisibility(i)}
              />
              {i + 1}
            </label>
          ))}
        </div>

        <div className="action-controls">
          <button 
            className={`btn ${hideZeroRows ? 'btn-success active' : 'btn-secondary'}`}
            onClick={toggleZeroRows}
            title={hideZeroRows ? 'Currently hiding rows with $0.00 values. Click to show all rows.' : 'Currently showing all rows. Click to hide rows with $0.00 values.'}
          >
            {hideZeroRows ? '👁️ Show $0 Rows' : '🚫 Hide $0 Rows'}
          </button>
          <button className="btn btn-primary" onClick={autoDistributeExpenses}>
            Auto-Distribute
          </button>
          <button className="btn btn-danger btn-sm" onClick={resetAllWeeks}>
            Reset All Weeks
          </button>
          <button className="btn btn-success" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
          <button className="btn btn-secondary" onClick={() => handlePrint()}>
            🖨️ Print this Page
          </button>
        </div>
      </div>

      {/* All your existing table and analysis components remain exactly the same */}
      <div className="planner-table-container">
        {hideZeroRows && (
          <div style={{ 
            padding: '8px 15px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            color: '#856404'
          }}>
            ℹ️ Filtering: Rows with $0.00 values are hidden. Click "Show $0 Rows" to see all expenses.
          </div>
        )}
        <table className="planner-table" id="planner-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Expense Category</th>
              <th>Monthly Actual</th>
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  <th
                    className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}
                  >
                    <div>Week {weekIndex + 1}</div>
                    <div className="week-date-range-inputs">
                      <input
                        type="date"
                        className="week-date-start"
                        value={getWeekDateRange(weekIndex).start}
                        readOnly
                      />
                      <input
                        type="date"
                        className="week-date-end"
                        value={getWeekDateRange(weekIndex).end}
                        readOnly
                      />
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => resetWeek(weekIndex)}
                    >
                      Reset
                    </button>
                  </th>
                  <th className={`week-${weekIndex + 1}-status-col status-header ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                    Status
                  </th>
                </React.Fragment>
              ))}
              <th>Remaining Balance</th>
            </tr>
          </thead>

          <tbody>
            {Object.keys(groupedExpenses).length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No expense data found. Please add expenses in the Monthly and Annual Expenses tabs first.
                </td>
              </tr>
            ) : (
              Object.entries(groupedExpenses).map(([categoryKey, category]) => {
                // Filter visible expenses for this category
                const visibleExpenses = category.expenses.filter(expense => 
                  !hideZeroRows || !hasAllZeroValues(expense)
                );
                
                // Don't render category if no visible expenses
                if (visibleExpenses.length === 0) {
                  return null;
                }

                return (
                  <React.Fragment key={categoryKey}>
                    {/* Category Header */}
                    <tr className="category-row">
                      <td colSpan="13">{category.name}</td>
                    </tr>

                    {/* Expense Rows */}
                    {visibleExpenses.map((expense, index) => {
                      const expenseData = getExpensePlannerData(expense.name);
                      const remaining = calculateRemainingBalance(expense, expenseData.weeks);

                      return (
                        <tr key={`${categoryKey}-${index}`} data-expense-id={expense.id}>
                          <td className="expense-name" style={{ textAlign: 'left', paddingLeft: '20px' }}>
                            {expense.name}
                            {expense.isAnnual && (
                              <div className="annual-indicator">
                                (Annual: {formatCurrency(expense.originalAnnualAmount)})
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{formatCurrency(expense.monthlyAmount)}</strong>
                          </td>

                          {/* Week Columns */}
                          {Array.from({ length: 5 }, (_, weekIndex) => (
                            <React.Fragment key={weekIndex}>
                              <td className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                                <div className="planner-input-group">
                                  <input
                                    type="number"
                                    className={`table-input ${expenseData.weeks[weekIndex] > 0 ? 'has-value' : 'zero-value'}`}
                                    value={expenseData.weeks[weekIndex].toFixed(2)}
                                    step="0.01"
                                    onChange={(e) => handleWeekAmountChange(expense.name, weekIndex, e.target.value)}
                                  />
                                  <select
                                    className="planner-action-select"
                                    onChange={(e) => {
                                      handleQuickAction(expense.name, weekIndex, e.target.value, expense.monthlyAmount);
                                      e.target.value = '';
                                    }}
                                  >
                                    <option value="">Quick Fill</option>
                                    <option value="reset">Reset to $0</option>
                                    <option value="full">Full Amount ({formatCurrency(expense.monthlyAmount)})</option>
                                    <option value="half">Half Amount ({formatCurrency(expense.monthlyAmount / 2)})</option>
                                    <option value="quarter">Quarter Amount ({formatCurrency(expense.monthlyAmount / 4)})</option>
                                  </select>
                                </div>
                              </td>
                              <td className={`week-${weekIndex + 1}-status-col status-cell ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                                <div className="status-checkboxes">
                                  <input
                                    type="checkbox"
                                    className="transferred-checkbox"
                                    title="Transferred"
                                    checked={expenseData.transferred[weekIndex]}
                                    onChange={(e) => handleStatusChange(expense, weekIndex, 'transferred', e.target.checked)}
                                  />
                                  <br />
                                  <input
                                    type="checkbox"
                                    className="paid-checkbox"
                                    title="Paid"
                                    checked={expenseData.paid[weekIndex]}
                                    onChange={(e) => handleStatusChange(expense, weekIndex, 'paid', e.target.checked)}
                                  />
                                </div>
                              </td>
                            </React.Fragment>
                          ))}

                          <td
                            className="remaining-amount"
                            style={{
                              fontWeight: 'bold',
                              color: Math.abs(remaining) < 0.001 ? 'black' : 'red'
                            }}
                          >
                            {formatCurrency(remaining)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          <tfoot>
            <tr className="table-footer">
              <td><strong>Weekly Totals</strong></td>
              <td></td>
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  <td className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Income: {formatCurrency(weeklyIncome[weekIndex] || 0)}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Expenses: {formatCurrency(weekTotals[weekIndex] || 0)}</strong>
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 'bold',
                      color: ((weeklyIncome[weekIndex] || 0) - (weekTotals[weekIndex] || 0)) >= 0 ? '#28a745' : '#dc3545',
                      borderTop: '1px solid #dee2e6',
                      paddingTop: '4px'
                    }}>
                      Cash Flow: {formatCurrency((weeklyIncome[weekIndex] || 0) - (weekTotals[weekIndex] || 0))}
                    </div>
                  </td>
                  <td className={`week-${weekIndex + 1}-status-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}></td>
                </React.Fragment>
              ))}
              <td style={{ fontSize: '0.9rem' }}>
                <div><strong>Total Income: {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0))}</strong></div>
                <div><strong>Total Expenses: {formatCurrency(weekTotals.reduce((sum, total) => sum + (total || 0), 0))}</strong></div>
                <div style={{ 
                  fontWeight: 'bold',
                  color: (weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0)) >= 0 ? '#28a745' : '#dc3545',
                  borderTop: '1px solid #dee2e6',
                  paddingTop: '4px'
                }}>
                  Net Cash Flow: {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0))}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Enhanced Cash Flow Analysis */}
      <div className="cash-flow-analysis">
        <h3>📊 Weekly Cash Flow Summary (Actual vs Projected Income)</h3>
        <div className="cash-flow-grid">
          {Array.from({ length: 5 }, (_, weekIndex) => {
            const income = weeklyIncome[weekIndex] || 0;
            const expenses = weekTotals[weekIndex] || 0;
            const cashFlow = income - expenses;
            
            return (
              <div
                key={weekIndex}
                className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}
              >
                <div className="week-label"><strong>Week {weekIndex + 1}</strong></div>
                <div className="week-label" style={{ color: '#28a745', fontWeight: '600' }}>
                  📈 Income: {formatCurrency(income)}
                </div>
                <div className="week-label" style={{ color: '#dc3545', fontWeight: '600' }}>
                  📉 Expenses: {formatCurrency(expenses)}
                </div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  color: cashFlow >= 0 ? '#28a745' : '#dc3545',
                  borderTop: '2px solid #dee2e6',
                  paddingTop: '8px',
                  marginTop: '8px'
                }}>
                  💰 Cash Flow: {formatCurrency(cashFlow)}
                </div>
                {cashFlow < 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '4px', fontStyle: 'italic' }}>
                    ⚠️ Deficit
                  </div>
                )}
                {cashFlow > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#28a745', marginTop: '4px', fontStyle: 'italic' }}>
                    ✅ Surplus
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Monthly Summary */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: 'rgba(255,255,255,0.9)', 
          borderRadius: '8px',
          border: '2px solid #007bff',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>📋 Monthly Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total Monthly Income</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>
                {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total Planned Expenses</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc3545' }}>
                {formatCurrency(weekTotals.reduce((sum, total) => sum + (total || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Net Monthly Cash Flow</div>
              <div style={{ 
                fontSize: '1.3rem', 
                fontWeight: 'bold', 
                color: (weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0)) >= 0 ? '#28a745' : '#dc3545'
              }}>
                {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerPage;