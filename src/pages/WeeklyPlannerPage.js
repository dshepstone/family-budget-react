// src/pages/WeeklyPlannerPage.js - Enhanced with Actual vs Projected Income Logic (CSS Fixed)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import { WeeklyPlannerPrint } from '../utils/printUtils';


const WeeklyPlannerPage = () => {
  const { state, actions, calculations, formatCurrency } = useBudget();
  const [weekVisibility, setWeekVisibility] = useState(Array(5).fill(true));
  const [hideZeroRows, setHideZeroRows] = useState(false);

  // Table horizontal scroll controls
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScrollControls, setShowScrollControls] = useState(false);
  const tableContainerRef = useRef(null);

  // == Horizontal Scroll Helpers ==
  const checkScrollNeeded = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollWidth, clientWidth } = tableContainerRef.current;
      setShowScrollControls(scrollWidth > clientWidth);
    }
  }, [weekVisibility]);

  const handleScroll = (e) => {
    setScrollPosition(e.target.scrollLeft);
  };

  const scrollLeft = () => {
    if (tableContainerRef.current) {
      const scrollAmount = 200;
      tableContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tableContainerRef.current) {
      const scrollAmount = 200;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToWeek = (weekIndex) => {
    if (tableContainerRef.current) {
      const weekColumns = tableContainerRef.current.querySelectorAll(`.week-${weekIndex + 1}-col`);
      if (weekColumns.length > 0) {
        const firstWeekColumn = weekColumns[0];
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const columnRect = firstWeekColumn.getBoundingClientRect();
        const scrollAmount = columnRect.left - containerRect.left + tableContainerRef.current.scrollLeft - 50;
        tableContainerRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };



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

  // Check scroll needed on mount and window resize
  useEffect(() => {
    checkScrollNeeded();
    const onResize = () => checkScrollNeeded();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [checkScrollNeeded]);

  // Recompute scroll-need when week visibility toggles
  useEffect(() => {
    checkScrollNeeded();
  }, [weekVisibility, checkScrollNeeded]);


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

  // FIXED: Get planner data for expense - Always return well-formed object with safe arrays
  const getExpensePlannerData = (expenseName) => {
    const entry = state.data.plannerState?.[expenseName];
    const safe = (arr, len, fill) =>
      Array.isArray(arr) ? arr.slice(0, len).concat(Array(Math.max(0, len - arr.length)).fill(fill))
        : Array(len).fill(fill);

    return {
      weeks: safe(entry?.weeks, 5, 0),
      transferred: safe(entry?.transferred, 5, false),
      paid: safe(entry?.paid, 5, false)
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

  // FIXED: Check if an expense row has all zero values - Guard the reducer
  const hasAllZeroValues = (expense) => {
    const expenseData = getExpensePlannerData(expense.name);
    const monthlyAmount = expense.monthlyAmount || 0;
    const weeklySum = (Array.isArray(expenseData.weeks) ? expenseData.weeks : [])
      .reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    
    // Hide if monthly amount is 0 AND all weekly amounts are 0
    return monthlyAmount === 0 && weeklySum === 0;
  };

  // Toggle zero rows visibility
  const toggleZeroRows = () => {
    setHideZeroRows(!hideZeroRows);
  };

  // FIXED: Calculate remaining balance for expense - Tolerant of bad input
  const calculateRemainingBalance = (expense, weeklyAmounts) => {
    const monthlyAmount = Number(expense?.monthlyAmount) || 0;
    const arr = Array.isArray(weeklyAmounts) ? weeklyAmounts : [];
    const weeklySum = arr.reduce((sum, amount) => sum + (Number(amount) || 0), 0);
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



  // effects below will ensure nav shows appropriately
  return (
    <div className="main-content weekly-planner-page no-top-gap">

      <style>{`
      /* Remove inherited top spacing from global/components CSS just on these pages */
        .main-content.no-top-gap { 
          margin-top: 0 !important; 
          padding-top: 8px !important; /* tweak to 0–12px if you want tighter/looser */
        }

        /* Make sure the first heading doesn't add extra space */
        .monthly-expenses-page .page-title,
        .weekly-planner-page .page-title,
        .annual-expenses-page .page-title {
          margin-top: 0 !important;
        }

        .weekly-planner-page {
          background-color: var(--bg-primary);
          min-height: 100vh;
        }

        .page-title {
          color: var(--text-primary);
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
          background-color: var(--card-bg);
          border-radius: 8px;
          border: 1px solid var(--card-border);
          flex-wrap: wrap;
          gap: 15px;
          box-shadow: var(--card-shadow);
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
          color: var(--text-primary);
        }

        .action-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .planner-table-container {
          overflow-x: auto;
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          margin-bottom: 20px;
          background: var(--card-bg);
        }

        .planner-table {
          width: 100%;
          border-collapse: collapse;
          background-color: var(--card-bg);
          font-size: 0.85rem;
          min-width: 1400px;
          table-layout: fixed;
        }

        .planner-table th,
        .planner-table td {
          padding: 10px 8px;
          border: 1px solid var(--border-light);
          text-align: center;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .planner-table th {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: nowrap;
        }

        .planner-table th:first-child {
          text-align: left;
          width: 240px;
          min-width: 240px;
        }

        .planner-table th:nth-child(2) {
          width: 120px;
          min-width: 120px;
        }

        .planner-table th.week-1-col,
        .planner-table th.week-2-col,
        .planner-table th.week-3-col,
        .planner-table th.week-4-col,
        .planner-table th.week-5-col {
          width: 140px;
          min-width: 140px;
        }

        .planner-table th.status-header {
          width: 70px;
          min-width: 70px;
          font-size: 0.7rem;
        }

        .planner-table th:last-child {
          width: 120px;
          min-width: 120px;
        }

        .week-date-range-inputs {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 4px 0;
        }

        .week-date-start,
        .week-date-end {
          font-size: 0.65rem !important;
          padding: 2px 4px !important;
          border: 1px solid rgba(255,255,255,0.5) !important;
          border-radius: 3px !important;
          background-color: rgba(255,255,255,0.9) !important;
          color: #495057 !important;
          transition: all 0.2s ease;
          cursor: default;
          outline: none;
          width: 100%;
          text-align: center;
        }

        .week-date-start:hover,
        .week-date-end:hover {
          background-color: white !important;
          border-color: rgba(255,255,255,0.8) !important;
        }

        .category-row {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--hover-bg) 100%) !important;
          font-weight: bold;
          color: var(--text-primary);
        }

        .category-row td {
          text-align: left !important;
          padding-left: 15px !important;
          font-size: 0.9rem !important;
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--hover-bg) 100%) !important;
        }

        .expense-name {
          text-align: left !important;
          padding-left: 20px !important;
          font-weight: 500;
          color: var(--text-primary);
          width: 240px;
          max-width: 240px;
        }

        .annual-indicator {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-style: italic;
          margin-top: 2px;
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
          border: 1px solid var(--input-border);
          border-radius: 4px;
          font-size: 0.8rem;
          text-align: right;
          background-color: var(--input-bg);
          color: var(--text-primary);
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .table-input:focus {
          outline: 2px solid var(--primary);
          outline-offset: -1px;
          border-color: var(--primary);
        }

        .table-input.has-value {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%) !important;
          border-color: var(--success) !important;
          font-weight: 600 !important;
          color: #155724 !important;
        }

        .table-input.zero-value {
          background-color: var(--input-bg);
          border-color: var(--input-border);
          font-weight: normal;
        }

        .planner-action-select {
          font-size: 0.7rem;
          padding: 2px 4px;
          border: 1px solid var(--input-border);
          border-radius: 3px;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          width: 100%;
          box-sizing: border-box;
        }

        .planner-action-select:hover {
          background-color: var(--hover-bg);
        }

        .status-cell {
          text-align: center !important;
          padding: 6px 4px !important;
          width: 70px;
          max-width: 70px;
          vertical-align: middle;
        }

        .status-checkboxes {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .transferred-checkbox,
        .paid-checkbox {
          margin: 1px;
          transform: scale(1.1);
          cursor: pointer;
        }

        .transferred-checkbox:checked {
          accent-color: #ffc107;
        }

        .paid-checkbox:checked {
          accent-color: var(--success);
        }

        .remaining-amount {
          font-weight: 600 !important;
          text-align: right !important;
          padding-right: 12px !important;
          color: var(--text-primary);
          width: 120px;
          max-width: 120px;
        }

        .table-footer {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--hover-bg) 100%);
          font-weight: bold;
          border-top: 2px solid var(--primary);
        }

        .table-footer td {
          padding: 12px 8px;
          font-size: 0.8rem;
          vertical-align: top;
          color: var(--text-primary);
        }

        .table-footer .cash-flow-positive {
          color: var(--success);
        }

        .table-footer .cash-flow-negative {
          color: var(--danger);
        }

        .cash-flow-analysis {
          margin-top: 20px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%);
          border-radius: 12px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        }

        .cash-flow-analysis h3 {
          margin-bottom: 15px;
          color: var(--text-primary);
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
          padding: 15px 12px;
          background: rgba(255,255,255,0.8);
          border-radius: 8px;
          border: 1px solid rgba(33, 150, 243, 0.2);
          transition: all 0.2s ease;
        }

        .cash-flow-grid > div:hover {
          background: rgba(255,255,255,0.95);
          transform: translateY(-1px);
        }

        .week-label {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 5px;
          font-weight: 500;
        }

        .balance-amount {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .balance-amount.positive {
          color: var(--success);
        }

        .balance-amount.negative {
          color: var(--danger);
        }

        .hidden {
          display: none !important;
        }

        .income-section {
          margin-bottom: 20px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
          border-radius: 8px;
          border: 1px solid rgba(40, 167, 69, 0.3);
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.1);
        }

        .income-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .income-week {
          text-align: center;
          padding: 12px 8px;
          background: rgba(255,255,255,0.8);
          border-radius: 6px;
          border: 1px solid rgba(40, 167, 69, 0.2);
          transition: all 0.2s ease;
        }

        .income-week:hover {
          background: rgba(255,255,255,0.95);
          transform: translateY(-1px);
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          text-transform: none;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
        }

        .btn-secondary {
          background: linear-gradient(135deg, var(--btn-secondary-bg) 0%, #545b62 100%);
          color: white;
        }

        .btn-success {
          background: linear-gradient(135deg, var(--success) 0%, #1e7e34 100%);
          color: white;
        }

        .btn-success.active {
          background: linear-gradient(135deg, #155724 0%, #0d4521 100%);
        }

        .btn-danger {
          background: linear-gradient(135deg, var(--danger) 0%, #c82333 100%);
          color: white;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.75rem;
        }

        .income-indicator {
          font-size: 0.75rem;
          color: #155724;
          margin-top: 2px;
          font-style: italic;
        }

        .actual-income {
          border-left: 3px solid var(--success);
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

          .planner-table {
            min-width: 1000px;
            font-size: 0.75rem;
          }

          .planner-table th,
          .planner-table td {
            padding: 6px 4px;
          }

          .table-input {
            font-size: 0.7rem;
            padding: 4px 6px;
          }

          .planner-action-select {
            font-size: 0.65rem;
          }
        }

        @media (max-width: 480px) {
          .cash-flow-grid,
          .income-summary {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .planner-table {
            min-width: 800px;
            font-size: 0.7rem;
          }

          .btn {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
        }
          /* Enhanced CSS for Weekly Planner Income Section - Scoped to weekly-planner-page only */

.weekly-planner-page .income-section {
  margin-bottom: 25px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.08) 0%, rgba(40, 167, 69, 0.03) 100%);
  border-radius: 12px;
  border: 2px solid rgba(40, 167, 69, 0.25);
  box-shadow: 0 4px 16px rgba(40, 167, 69, 0.1);
  position: relative;
  overflow: hidden;
}

.weekly-planner-page .income-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #17a2b8 100%);
}

.weekly-planner-page .income-section h3 {
  margin: 0 0 8px 0;
  color: #155724;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weekly-planner-page .income-section p {
  margin: 0 0 16px 0;
  fontSize: 0.95rem;
  color: #155724;
  background: rgba(255, 255, 255, 0.7);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 4px solid #28a745;
  font-weight: 500;
}

.weekly-planner-page .income-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.weekly-planner-page .income-week {
  text-align: center;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.weekly-planner-page .income-week:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.weekly-planner-page .income-week.actual-income {
  border-color: #28a745;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.weekly-planner-page .income-week.projected-income {
  border-color: #ffc107;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.weekly-planner-page .income-week.future-pay-income {
  border-color: #17a2b8;
  background: linear-gradient(135deg, rgba(23, 162, 184, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.weekly-planner-page .income-week .week-label {
  font-size: 0.85rem;
  color: #495057;
  margin-bottom: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.weekly-planner-page .income-week .income-amount {
  font-size: 1.4rem;
  font-weight: 800;
  color: #155724;
  margin: 8px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.weekly-planner-page .income-week .income-indicator {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  margin: 8px auto 0;
  display: inline-block;
  min-width: 80px;
  text-align: center;
  border: 1px solid currentColor;
  background: rgba(255, 255, 255, 0.8);
}

.weekly-planner-page .income-week.actual-income .income-indicator {
  color: #155724;
  background: rgba(40, 167, 69, 0.15);
  border-color: #28a745;
}

.weekly-planner-page .income-week.projected-income .income-indicator {
  color: #856404;
  background: rgba(255, 193, 7, 0.15);
  border-color: #ffc107;
}

.weekly-planner-page .income-week.future-pay-income .income-indicator {
  color: #0c5460;
  background: rgba(23, 162, 184, 0.15);
  border-color: #17a2b8;
}

.weekly-planner-page .income-week .pay-dates-container {
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(248, 249, 250, 0.9);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.7rem;
  line-height: 1.3;
}

.weekly-planner-page .income-week .pay-date-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 2px 0;
  font-weight: 500;
}

.weekly-planner-page .income-week .pay-date-item.past-date {
  color: #155724;
  font-weight: 700;
}

.weekly-planner-page .income-week .pay-date-item.future-date {
  color: #6c757d;
  font-weight: 500;
}

.weekly-planner-page .income-week .pay-date-item .date-text {
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.8);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments for income section */
@media (max-width: 1200px) {
  .weekly-planner-page .income-summary {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  
  .weekly-planner-page .income-week {
    padding: 14px 10px;
    min-height: 120px;
  }
  
  .weekly-planner-page .income-week .income-amount {
    font-size: 1.2rem;
  }
}

@media (max-width: 768px) {
  .weekly-planner-page .income-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .weekly-planner-page .income-week {
    padding: 12px 8px;
    min-height: 100px;
  }
  
  .weekly-planner-page .income-week .income-amount {
    font-size: 1.1rem;
  }
  
  .weekly-planner-page .income-week .week-label {
    font-size: 0.8rem;
  }
  
  .weekly-planner-page .income-week .income-indicator {
    font-size: 0.75rem;
    padding: 3px 6px;
    min-width: 70px;
  }
}

@media (max-width: 480px) {
  .weekly-planner-page .income-summary {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .weekly-planner-page .income-section {
    padding: 16px;
  }
  
  .weekly-planner-page .income-section h3 {
    font-size: 1.2rem;
  }
  
  .weekly-planner-page .income-week {
    padding: 10px 8px;
    min-height: 90px;
  }
}

/* Animation for status changes */
.weekly-planner-page .income-week .income-indicator {
  transition: all 0.3s ease;
}

.weekly-planner-page .income-week:hover .income-indicator {
  transform: scale(1.05);
}

/* Enhanced visual hierarchy */
.weekly-planner-page .income-section strong {
  color: #155724;
  font-weight: 700;
}

/* Print-friendly styles */
@media print {
  .weekly-planner-page .income-section {
    background: white !important;
    border: 2px solid #ccc !important;
    box-shadow: none !important;
  }
  
  .weekly-planner-page .income-week {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
  }
}
      
        /* === Table Navigation Controls (Horizontal Scroll) === */
        .weekly-planner-page .table-navigation-container {
          position: relative;
          margin-bottom: 20px;
        }
        .weekly-planner-page .table-scroll-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--hover-bg) 100%);
          border: 1px solid var(--card-border);
          border-bottom: none;
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
          box-shadow: var(--card-shadow);
        }
        .weekly-planner-page .scroll-navigation {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .weekly-planner-page .scroll-btn {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 80px;
          justify-content: center;
        }
        .weekly-planner-page .scroll-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .weekly-planner-page .scroll-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.6;
        }
        .weekly-planner-page .week-jump-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .weekly-planner-page .week-jump-btn {
          background: linear-gradient(135deg, var(--btn-secondary-bg) 0%, #545b62 100%);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
          min-width: 30px;
        }
        .weekly-planner-page .week-jump-btn:hover {
          background: linear-gradient(135deg, #545b62 0%, #495057 100%);
          transform: translateY(-1px);
        }
        .weekly-planner-page .scroll-indicator {
          font-size: 0.8rem;
          color: var(--text-secondary);
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 4px;
          border: 1px solid var(--border-light);
          min-width: 100px;
          text-align: center;
          font-weight: 500;
        }
        .weekly-planner-page .planner-table-container.has-scroll-controls {
          border-radius: 0 0 12px 12px;
          border-top: none;
        }
        /* Enhanced scrollbar styling */
        .weekly-planner-page .planner-table-container::-webkit-scrollbar {
          height: 12px;
        }
        .weekly-planner-page .planner-table-container::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 6px;
          margin: 0 4px;
        }
        .weekly-planner-page .planner-table-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 6px;
          border: 2px solid var(--bg-secondary);
        }
        .weekly-planner-page .planner-table-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
        }
        @media (max-width: 768px) {
          .weekly-planner-page .table-scroll-controls {
            flex-direction: column;
            gap: 10px;
            padding: 8px 12px;
          }
          .weekly-planner-page .scroll-navigation {
            width: 100%;
            justify-content: space-between;
          }
          .weekly-planner-page .week-jump-controls {
            justify-content: center;
          }
          .weekly-planner-page .scroll-btn {
            padding: 6px 10px;
            font-size: 0.8rem;
            min-width: 70px;
          }
          .weekly-planner-page .week-jump-btn {
            padding: 3px 6px;
            font-size: 0.75rem;
          }
        }
    `}</style>

      <h2 className="page-title">📋 Weekly Budget Planner</h2>

      // Updated section of WeeklyPlannerPage.js - Enhanced Actual vs Projected Logic with Date Checking

/* Updated Income Section JSX for WeeklyPlannerPage.js with Enhanced Styling */

{/* Enhanced Income Section with Date-based Actual vs Projected Indicator */}
<div className="income-section">
  <h3>
    💵 Weekly Income (Date-based Actual vs Projected)
  </h3>
  <p>
    ✨ <strong>Smart Income Tracking:</strong> Shows actual amounts only after pay dates have passed, projected amounts for future dates
  </p>
  <div className="income-summary">
    {weeklyIncome.map((income, index) => {
      // Enhanced logic: Check if actual data exists AND if pay date has passed
      const hasActualData = (state.data.income || []).some(incomeSource => {
        const payDates = Array.isArray(incomeSource.payDates) ? incomeSource.payDates : [];
        const payActuals = Array.isArray(incomeSource.payActuals) ? incomeSource.payActuals : [];
        const currentDate = new Date();
        
        return payDates.some((dateStr, payIndex) => {
          const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
          const payMonth = month - 1;
          const payYear = year;
          const dayOfMonth = day;
          
          // Check if this pay date falls in the current budget month/year and specific week
          if (payMonth === currentMonth && payYear === currentYear) {
            let weekIndex;
            if (dayOfMonth >= 1 && dayOfMonth <= 7) weekIndex = 0;
            else if (dayOfMonth >= 8 && dayOfMonth <= 14) weekIndex = 1;
            else if (dayOfMonth >= 15 && dayOfMonth <= 21) weekIndex = 2;
            else if (dayOfMonth >= 22 && dayOfMonth <= 28) weekIndex = 3;
            else if (dayOfMonth >= 29) weekIndex = 4;
            
            if (weekIndex === index) {
              // Create the actual pay date for comparison
              const payDate = new Date(year, month - 1, day); // month - 1 because Date constructor expects 0-indexed month
              
              // Only consider it "actual" if:
              // 1. Actual data exists (either individual pay actual or overall actual amount)
              // 2. Current date is on or after the pay date
              const hasActualAmount = (
                (payActuals[payIndex] !== undefined && payActuals[payIndex] !== null) ||
                (incomeSource.actualAmount > 0)
              );
              
              const payDateHasPassed = currentDate >= payDate;
              
              return hasActualAmount && payDateHasPassed;
            }
          }
          return false;
        });
      });

      // Determine the status for display
      let statusText = '📊 Projected';
      let statusColor = '#ffc107';
      
      if (hasActualData) {
        statusText = '✅ Actual';
        statusColor = '#28a745';
      } else {
        // Check if there are any pay dates in this week that haven't passed yet
        const hasFuturePayDates = (state.data.income || []).some(incomeSource => {
          const payDates = Array.isArray(incomeSource.payDates) ? incomeSource.payDates : [];
          const currentDate = new Date();
          
          return payDates.some(dateStr => {
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
              
              if (weekIndex === index) {
                const payDate = new Date(year, month - 1, day);
                return currentDate < payDate; // Pay date is in the future
              }
            }
            return false;
          });
        });
        
        if (hasFuturePayDates) {
          statusText = '🔮 Future Pay Date';
          statusColor = '#17a2b8';
        }
      }

      // Determine CSS class based on status
      let statusClass = 'projected-income';
      if (hasActualData) {
        statusClass = 'actual-income';
      } else if (statusText === '🔮 Future Pay Date') {
        statusClass = 'future-pay-income';
      }

      // Collect pay dates for this week
      const weekPayDates = [];
      (state.data.income || []).forEach(incomeSource => {
        const payDates = Array.isArray(incomeSource.payDates) ? incomeSource.payDates : [];
        payDates.forEach((dateStr, payIndex) => {
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
            
            if (weekIndex === index) {
              const payDate = new Date(year, month - 1, day);
              const currentDate = new Date();
              const isPast = currentDate >= payDate;
              weekPayDates.push({
                date: dateStr,
                isPast,
                sourceName: incomeSource.name || 'Income'
              });
            }
          }
        });
      });

      return (
        <div 
          key={index} 
          className={`income-week ${!weekVisibility[index] ? 'hidden' : ''} ${statusClass}`}
        >
          <div className="week-label">Week {index + 1}</div>
          
          <div className="income-amount">
            {formatCurrency(income)}
          </div>
          
          <div className="income-indicator">
            {statusText}
          </div>
          
          {/* Enhanced pay dates display */}
          {weekPayDates.length > 0 && (
            <div className="pay-dates-container">
              {weekPayDates.map((payInfo, idx) => (
                <div 
                  key={idx} 
                  className={`pay-date-item ${payInfo.isPast ? 'past-date' : 'future-date'}`}
                >
                  <span>{payInfo.isPast ? '✅' : '📅'}</span>
                  <span className="date-text">{payInfo.date}</span>
                </div>
              ))}
            </div>
          )}
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
      
      <div className="table-navigation-container">
        {showScrollControls && (
          <div className="table-scroll-controls">
            <div className="scroll-navigation">
              <button
                className="scroll-btn"
                onClick={scrollLeft}
                disabled={scrollPosition <= 0}
                title="Scroll Left"
              >
                ⬅️ Left
              </button>

              <div className="scroll-indicator">
                Scroll: {tableContainerRef.current ? Math.round((scrollPosition / Math.max(tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth, 1)) * 100) : 0}%
              </div>

              <button
                className="scroll-btn"
                onClick={scrollRight}
                disabled={tableContainerRef.current && scrollPosition >= (tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth)}
                title="Scroll Right"
              >
                Right ➡️
              </button>
            </div>

            <div className="week-jump-controls">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Jump to:
              </span>
              {Array.from({ length: 5 }, (_, i) => (
                weekVisibility[i] && (
                  <button
                    key={i}
                    className="week-jump-btn"
                    onClick={() => scrollToWeek(i)}
                    title={`Scroll to Week ${i + 1}`}
                  >
                    W{i + 1}
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        <div
          className={`planner-table-container ${showScrollControls ? 'has-scroll-controls' : ''}`}
          ref={tableContainerRef}
          onScroll={handleScroll}
        >
          {hideZeroRows && (
            <div style={{
              padding: '8px 15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderBottom: 'none',
              borderRadius: showScrollControls ? '0' : '8px 8px 0 0',
              fontSize: '0.9rem',
              color: '#856404'
            }}>
              ℹ️ Filtering: Rows with $0.00 values are hidden. Click "Show $0 Rows" to see all expenses.
            </div>
          )}

          {/* Existing table remains unchanged - inserted below */}
<table className="planner-table" id="planner-table">
          <thead>
            <tr>
              <th style={{ width: '240px' }}>Expense Category</th>
              <th style={{ width: '120px' }}>Monthly Actual</th>
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  <th
                    className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}
                    style={{ width: '140px' }}
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
                  <th className={`week-${weekIndex + 1}-status-col status-header ${!weekVisibility[weekIndex] ? 'hidden' : ''}`} style={{ width: '70px' }}>
                    Status
                  </th>
                </React.Fragment>
              ))}
              <th style={{ width: '120px' }}>Remaining Balance</th>
            </tr>
          </thead>

          <tbody>
            {Object.keys(groupedExpenses).length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
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
                          <td className="expense-name">
                            {expense.name}
                            {expense.isAnnual && (
                              <div className="annual-indicator">
                                (Annual: {formatCurrency(expense.originalAnnualAmount)})
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong>{formatCurrency(expense.monthlyAmount)}</strong>
                          </td>

                          {/* Week Columns */}
                          {Array.from({ length: 5 }, (_, weekIndex) => (
                            <React.Fragment key={weekIndex}>
                              <td className={`week-${weekIndex + 1}-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}>
                                <div className="planner-input-group">
                                  <input
                                    type="number"
                                    className={`table-input ${Number(expenseData.weeks[weekIndex] || 0) > 0 ? 'has-value' : 'zero-value'}`}
                                    value={Number(expenseData.weeks[weekIndex] || 0).toFixed(2)}
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
                              color: Math.abs(remaining) < 0.001 ? 'var(--text-primary)' : 'var(--danger)'
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
                    <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                      <strong>Income: {formatCurrency(weeklyIncome[weekIndex] || 0)}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                      <strong>Expenses: {formatCurrency(weekTotals[weekIndex] || 0)}</strong>
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                      color: ((weeklyIncome[weekIndex] || 0) - (weekTotals[weekIndex] || 0)) >= 0 ? 'var(--success)' : 'var(--danger)',
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '4px'
                    }}>
                      Cash Flow: {formatCurrency((weeklyIncome[weekIndex] || 0) - (weekTotals[weekIndex] || 0))}
                    </div>
                  </td>
                  <td className={`week-${weekIndex + 1}-status-col ${!weekVisibility[weekIndex] ? 'hidden' : ''}`}></td>
                </React.Fragment>
              ))}
              <td style={{ fontSize: '0.8rem' }}>
                <div><strong>Total Income: {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0))}</strong></div>
                <div><strong>Total Expenses: {formatCurrency(weekTotals.reduce((sum, total) => sum + (total || 0), 0))}</strong></div>
                <div style={{ 
                  fontWeight: 'bold',
                  color: (weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0)) >= 0 ? 'var(--success)' : 'var(--danger)',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '4px'
                }}>
                  Net Cash Flow: {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0))}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
          </div>
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
                <div className="week-label" style={{ color: 'var(--success)', fontWeight: '600' }}>
                  📈 Income: {formatCurrency(income)}
                </div>
                <div className="week-label" style={{ color: 'var(--danger)', fontWeight: '600' }}>
                  📉 Expenses: {formatCurrency(expenses)}
                </div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  color: cashFlow >= 0 ? 'var(--success)' : 'var(--danger)',
                  borderTop: '2px solid var(--border-light)',
                  paddingTop: '8px',
                  marginTop: '8px'
                }}>
                  💰 Cash Flow: {formatCurrency(cashFlow)}
                </div>
                {cashFlow < 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', fontStyle: 'italic' }}>
                    ⚠️ Deficit
                  </div>
                )}
                {cashFlow > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px', fontStyle: 'italic' }}>
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
          border: '2px solid var(--primary)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>📋 Monthly Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Monthly Income</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {formatCurrency(weeklyIncome.reduce((sum, income) => sum + (income || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Planned Expenses</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                {formatCurrency(weekTotals.reduce((sum, total) => sum + (total || 0), 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Net Monthly Cash Flow</div>
              <div style={{ 
                fontSize: '1.3rem', 
                fontWeight: 'bold', 
                color: (weeklyIncome.reduce((sum, income) => sum + (income || 0), 0) - weekTotals.reduce((sum, total) => sum + (total || 0), 0)) >= 0 ? 'var(--success)' : 'var(--danger)'
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