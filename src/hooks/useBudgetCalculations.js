// src/hooks/useBudgetCalculations.js - Enhanced with Weekly Income Logic and Full Compatibility
import { useMemo } from 'react';
import { currencyCalculator } from '../plugins/calculators/CurrencyCalculator';
import { DUE_DATE_THRESHOLDS } from '../utils/constants';

/**
 * Custom hook that provides budget calculation utilities with proper actual vs projected income tracking
 * Enhanced to work seamlessly with WeeklyPlannerPage actual income logic
 * @param {Object} budgetData - The budget data object
 */
export function useBudgetCalculations(budgetData) {
  
  // Memoized calculations to prevent unnecessary recalculations
  const calculations = useMemo(() => {
    if (!budgetData) {
      return {
        getTotalIncome: () => 0,
        getTotalActualIncome: () => 0,
        getTotalProjectedIncome: () => 0,
        getTotalMonthlyExpenses: () => 0,
        getTotalAnnualExpenses: () => 0,
        getMonthlyAnnualImpact: () => 0,
        getNetMonthlyIncome: () => 0,
        getActualNetIncome: () => 0,
        getSavingsRate: () => 0,
        getActualSavingsRate: () => 0,
        getIncomeProgress: () => ({}),
        getUpcomingExpenses: () => [],
        getCategoryTotals: () => ({}),
        getAccountAllocations: () => ({}),
        getBudgetHealth: () => ({}),
        getExpensesByFrequency: () => ({}),
        getMonthlyProjections: () => ([]),
        getCashFlowProjection: () => ([]),
        getVarianceAnalysis: () => ({}),
        getTopExpenseCategories: () => ([]),
        getWeeklyIncome: () => [0, 0, 0, 0, 0],
        getWeeklyPlannerTotals: () => [],
        getExpectedIncomeByNow: () => 0
      };
    }

    const { income = [], monthly = {}, annual = {}, plannerState = {} } = budgetData;

    // Helper function to parse amounts safely
    const parseAmount = (value) => {
      if (typeof value === 'number') return value;
      if (!value && value !== 0) return 0;
      const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    // ENHANCED: Month-aware income calculation that mirrors IncomePage.js and WeeklyPlannerPage.js logic
    const getMonthAwareMonthlyAmount = (income, which = 'projected') => {
      const hasDates = Array.isArray(income.payDates) && income.payDates.length > 0;
      const perCheckProjected = parseAmount(income.projectedAmount || income.amount);
      const perCheckActual = parseAmount(income.actualAmount);

      if (which === 'actual') {
        // 1) If per-date actuals exist, sum them (these are month-aware)
        if (Array.isArray(income.payActuals) && income.payActuals.length > 0) {
          return income.payActuals.reduce((sum, v) => sum + (parseAmount(v) || 0), 0);
        }
        // 2) If user says "overall actual is monthly total", just use it
        if (income.actualMode === 'monthly-total') {
          return perCheckActual || 0;
        }
        // 3) Otherwise treat overall actual as per-paycheck
        switch (income.frequency) {
          case 'weekly':
            return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (52 / 12);
          case 'bi-weekly':
            return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * (26 / 12);
          case 'semi-monthly':
            return hasDates ? (perCheckActual || 0) * income.payDates.length : (perCheckActual || 0) * 2;
          case 'monthly':
            return perCheckActual || 0;
          case 'quarterly':
            return (perCheckActual || 0) / 3;
          case 'semi-annual':
            return (perCheckActual || 0) / 6;
          case 'annual':
            return (perCheckActual || 0) / 12;
          case 'one-time':
            return 0;
          default:
            return perCheckActual || 0;
        }
      }

      // PROJECTED path
      switch (income.frequency) {
        case 'weekly':
          return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * (52 / 12);
        case 'bi-weekly':
          return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * (26 / 12);
        case 'semi-monthly':
          return hasDates ? (perCheckProjected || 0) * income.payDates.length : (perCheckProjected || 0) * 2;
        case 'monthly':
          return perCheckProjected || 0;
        case 'quarterly':
          return (perCheckProjected || 0) / 3;
        case 'semi-annual':
          return (perCheckProjected || 0) / 6;
        case 'annual':
          return (perCheckProjected || 0) / 12;
        case 'one-time':
          return 0;
        default:
          return perCheckProjected || 0;
      }
    };

    // Get current month/year for weekly calculations
    const getCurrentMonthYear = () => {
      // Find the first income source with pay dates to determine the budget month/year
      for (const incomeSource of income) {
        if (incomeSource.payDates && incomeSource.payDates.length > 0) {
          const dateString = incomeSource.payDates[0];
          const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
          return {
            month: month - 1, // Convert to 0-indexed month
            year: year
          };
        }
      }
      // Fallback to current date if no pay dates found
      return {
        month: new Date().getMonth(),
        year: new Date().getFullYear()
      };
    };

    
    // ---- Expected-by-Now helpers ----
    const _parseBudgetDate = (val) => {
      if (val instanceof Date) return val;
      if (!val && val !== 0) return null;
      const s = String(val).trim();
      let dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt;
      const nums = s.split(/[^0-9]+/).filter(Boolean).map(n => parseInt(n,10));
      if (nums.length >= 3) {
        let mm, dd, yyyy;
        if (nums[0] > 1900) { yyyy = nums[0]; mm = nums[1]; dd = nums[2]; }
        else { mm = nums[0]; dd = nums[1]; yyyy = nums[2] < 100 ? 2000 + nums[2] : nums[2]; }
        dt = new Date(yyyy, (mm||1)-1, dd||1);
        return isNaN(dt.getTime()) ? null : dt;
      }
      return null;
    };

    const _getActiveYearMonth = () => {
      // try plannerState or meta-like fields if present
      const ps = plannerState || {};
      if (typeof ps.year === 'number' && typeof ps.month === 'number') {
        return { year: ps.year, month: ps.month };
      }
      if (typeof budgetData?.year === 'number' && typeof budgetData?.month === 'number') {
        return { year: budgetData.year, month: budgetData.month };
      }
      // fallback to "today"
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    };

    const getExpectedIncomeByNow = (incomeData, currentDay) => {
  // Helper function to parse amounts safely
  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value && value !== 0) return 0;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Get current month and year from the first pay date
  const getCurrentMonthYear = () => {
    for (const income of incomeData) {
      if (income.payDates && income.payDates.length > 0) {
        const dateString = income.payDates[0];
        const [year, month] = dateString.split('-').map(num => parseInt(num, 10));
        return { month: month - 1, year }; // Convert to 0-indexed month
      }
    }
    return { month: new Date().getMonth(), year: new Date().getFullYear() };
  };

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  let expectedByNow = 0;

  incomeData.forEach(income => {
    const payDates = Array.isArray(income.payDates) ? income.payDates : [];
    const payActuals = Array.isArray(income.payActuals) ? income.payActuals : [];
    const projectedAmount = parseAmount(income.projectedAmount || income.amount || 0);

    // Process each pay date to see if it should have occurred by now
    payDates.forEach((dateStr, index) => {
      const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
      const payMonth = month - 1; // Convert to 0-indexed
      const payDay = day;

      // Check if this pay date is in the current month and should have occurred by now
      if (payMonth === currentMonth && year === currentYear && payDay <= currentDay) {
        // Use actual amount if available, otherwise use projected
        if (payActuals[index] !== undefined && payActuals[index] !== null && payActuals[index] !== '') {
          expectedByNow += parseAmount(payActuals[index]);
        } else {
          expectedByNow += projectedAmount;
        }
      }
    });

    // Handle frequencies without specific pay dates
    if (payDates.length === 0) {
      // Estimate based on frequency and current day
      const monthlyAmount = projectedAmount;
      const progressRatio = currentDay / 31; // Rough estimate for month progress

      switch (income.frequency) {
        case 'weekly':
          expectedByNow += (monthlyAmount * (52/12)) * progressRatio;
          break;
        case 'bi-weekly':
          expectedByNow += (monthlyAmount * (26/12)) * progressRatio;
          break;
        case 'monthly':
          // For monthly income, typically received at start or end of month
          // Assume if we're past day 15, monthly income should be received
          if (currentDay >= 15) {
            expectedByNow += monthlyAmount;
          }
          break;
        default:
          expectedByNow += monthlyAmount * progressRatio;
      }
    }
  });

  return expectedByNow;
};

    // ENHANCED: Weekly income calculation with actual vs projected priority (mirrors WeeklyPlannerPage logic)
    const getWeeklyIncome = () => {
      const weeklyIncome = [0, 0, 0, 0, 0];
      const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

      income.forEach(incomeSource => {
        const payDates = Array.isArray(incomeSource.payDates) ? incomeSource.payDates : [];
        const perPayProjected = parseAmount(incomeSource.projectedAmount || incomeSource.amount);
        const perPayActual = parseAmount(incomeSource.actualAmount);

        // PRIORITY 1: Use actual pay dates with actual amounts if available (most accurate)
        if (payDates.length > 0 && Array.isArray(incomeSource.payActuals) && incomeSource.payActuals.length > 0) {
          payDates.forEach((dateStr, index) => {
            if (incomeSource.payActuals[index] !== undefined && incomeSource.payActuals[index] !== null) {
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
                
                if (weekIndex >= 0 && weekIndex < 5) {
                  const actualAmount = parseAmount(incomeSource.payActuals[index]);
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
                if (dayOfMonth >= 1 && dayOfMonth <= 7) weekIndex = 0;
                else if (dayOfMonth >= 8 && dayOfMonth <= 14) weekIndex = 1;
                else if (dayOfMonth >= 15 && dayOfMonth <= 21) weekIndex = 2;
                else if (dayOfMonth >= 22 && dayOfMonth <= 28) weekIndex = 3;
                else if (dayOfMonth >= 29) weekIndex = 4;
                
                if (weekIndex >= 0 && weekIndex < 5) {
                  weeklyIncome[weekIndex] += perPayProjected;
                }
              }
            }
          });
        }
        // PRIORITY 2: Use actual mode with overall actual amount
        else if (incomeSource.actualMode === 'monthly-total' && perPayActual > 0) {
          if (payDates.length > 0) {
            const actualPerCheck = perPayActual / payDates.length;
            payDates.forEach(dateStr => {
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
                
                if (weekIndex >= 0 && weekIndex < 5) {
                  weeklyIncome[weekIndex] += actualPerCheck;
                }
              }
            });
          } else {
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
                if (dayOfMonth >= 1 && dayOfMonth <= 7) weekIndex = 0;
                else if (dayOfMonth >= 8 && dayOfMonth <= 14) weekIndex = 1;
                else if (dayOfMonth >= 15 && dayOfMonth <= 21) weekIndex = 2;
                else if (dayOfMonth >= 22 && dayOfMonth <= 28) weekIndex = 3;
                else if (dayOfMonth >= 29) weekIndex = 4;
                
                if (weekIndex >= 0 && weekIndex < 5) {
                  weeklyIncome[weekIndex] += perPayActual;
                }
              }
            });
          } else {
            // Distribute based on frequency pattern
            switch (incomeSource.frequency) {
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
        // PRIORITY 4: Fall back to projected amounts when no actual amounts available
        else {
          if (payDates.length > 0) {
            payDates.forEach(dateStr => {
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
                
                if (weekIndex >= 0 && weekIndex < 5) {
                  weeklyIncome[weekIndex] += perPayProjected;
                }
              }
            });
          } else if (incomeSource.weeks && Array.isArray(incomeSource.weeks)) {
            // Use manually set weekly amounts if no pay dates
            incomeSource.weeks.forEach((amount, index) => {
              if (index < 5) {
                weeklyIncome[index] += parseAmount(amount);
              }
            });
          } else {
            // Fallback: Distribute based on frequency pattern when no specific dates
            let monthlyAmount = 0;
            
            switch (incomeSource.frequency) {
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
            switch (incomeSource.frequency) {
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
    };

    // Get total projected income for the month
    const getTotalProjectedIncome = () => {
      return income.reduce((total, item) => {
        return total + getMonthAwareMonthlyAmount(item, 'projected');
      }, 0);
    };

    // Get total actual income received so far this month
    const getTotalActualIncome = () => {
      return income.reduce((total, item) => {
        return total + getMonthAwareMonthlyAmount(item, 'actual');
      }, 0);
    };

    // LEGACY: Keep for backward compatibility (now uses projected)
    const getTotalIncome = () => {
      return getTotalProjectedIncome();
    };

    // ENHANCED: Income progress tracking with better calculations
    const getIncomeProgress = () => {
      const projected = getTotalProjectedIncome();
      const actual = getTotalActualIncome();
      const variance = actual - projected;
      const percentReceived = projected > 0 ? (actual / projected) * 100 : 0;
      
      // Calculate expected income based on how far through the month we are
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();
      const dayOfMonth = now.getDate();
      const monthProgress = (dayOfMonth / daysInMonth) * 100;
      const expectedAtThisPoint = getExpectedIncomeByNow();
      const progressVariance = actual - expectedAtThisPoint;

      return {
        totalProjectedIncome: projected,
        totalActualIncome: actual,
        variance,
        percentReceived,
        monthProgress,
        expectedAtThisPoint,
        progressVariance,
        isOnTrack: progressVariance >= 0
      };
    };

    const getTotalMonthlyExpenses = () => {
      let total = 0;
      Object.values(monthly).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            total += parseAmount(expense.actual || expense.amount);
          });
        }
      });
      return total;
    };

    const getTotalAnnualExpenses = () => {
      let total = 0;
      Object.values(annual).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            total += parseAmount(expense.actual || expense.amount);
          });
        }
      });
      return total;
    };

    const getMonthlyAnnualImpact = () => {
      return getTotalAnnualExpenses() / 12;
    };

    // Net income using projected income (for budget planning)
    const getNetMonthlyIncome = () => {
      const projectedIncome = getTotalProjectedIncome();
      const monthlyExpenses = getTotalMonthlyExpenses();
      const annualImpact = getMonthlyAnnualImpact();
      return projectedIncome - monthlyExpenses - annualImpact;
    };

    // Actual net income using actual income received so far
    const getActualNetIncome = () => {
      const actualIncome = getTotalActualIncome();
      const monthlyExpenses = getTotalMonthlyExpenses();
      const annualImpact = getMonthlyAnnualImpact();
      return actualIncome - monthlyExpenses - annualImpact;
    };

    // Savings rate using projected income (for planning)
    const getSavingsRate = () => {
      const projectedIncome = getTotalProjectedIncome();
      const netIncome = getNetMonthlyIncome();
      return projectedIncome > 0 ? (netIncome / projectedIncome) * 100 : 0;
    };

    // Actual savings rate based on income received so far
    const getActualSavingsRate = () => {
      const actualIncome = getTotalActualIncome();
      const actualNetIncome = getActualNetIncome();
      return actualIncome > 0 ? (actualNetIncome / actualIncome) * 100 : 0;
    };

    // ENHANCED: Weekly Planner Totals with proper integration
    const getWeeklyPlannerTotals = () => {
      const weekTotals = [0, 0, 0, 0, 0]; // 5 weeks
      const weeklyIncome = getWeeklyIncome();

      // Calculate expense totals for each week from planner state
      Object.entries(plannerState).forEach(([expenseName, expenseData]) => {
        // Skip non-expense entries like 'weeklyIncome', 'weeklyExpenses', etc.
        if (expenseName === 'weeklyIncome' || expenseName === 'weeklyExpenses' || expenseName === 'monthlyTargets') {
          return;
        }

        if (expenseData && expenseData.weeks && Array.isArray(expenseData.weeks)) {
          expenseData.weeks.forEach((amount, weekIndex) => {
            if (weekIndex < 5) {
              weekTotals[weekIndex] += parseAmount(amount);
            }
          });
        }
      });

      // Return detailed weekly information
      return weekTotals.map((weekExpenses, index) => ({
        week: index + 1,
        income: weeklyIncome[index] || 0,
        expenses: weekExpenses,
        balance: (weeklyIncome[index] || 0) - weekExpenses,
        expenseCount: Object.values(plannerState).filter(expense =>
          expense.weeks && expense.weeks[index] && parseAmount(expense.weeks[index]) > 0
        ).length
      }));
    };

    // Upcoming expenses analysis
    const getUpcomingExpenses = () => {
      const upcoming = [];
      const today = new Date();
      
      // Check monthly expenses
      Object.values(monthly).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            if (expense.date && !expense.paid) {
              const dueDate = new Date(expense.date);
              const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              
              if (daysUntil <= DUE_DATE_THRESHOLDS.UPCOMING) {
                upcoming.push({
                  ...expense,
                  daysUntil,
                  type: 'monthly',
                  amount: parseAmount(expense.actual || expense.amount)
                });
              }
            }
          });
        }
      });

      // Check annual expenses
      Object.values(annual).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            if (expense.date && !expense.paid) {
              const dueDate = new Date(expense.date);
              const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              
              if (daysUntil <= DUE_DATE_THRESHOLDS.UPCOMING) {
                upcoming.push({
                  ...expense,
                  daysUntil,
                  type: 'annual',
                  amount: parseAmount(expense.actual || expense.amount)
                });
              }
            }
          });
        }
      });

      return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    };

    // Category analysis
    const getCategoryTotals = () => {
      const totals = { monthly: {}, annual: {} };
      
      Object.entries(monthly).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          totals.monthly[categoryKey] = expenses.reduce((sum, expense) => 
            sum + parseAmount(expense.actual || expense.amount), 0);
        }
      });

      Object.entries(annual).forEach(([categoryKey, expenses]) => {
        if (Array.isArray(expenses)) {
          totals.annual[categoryKey] = expenses.reduce((sum, expense) => 
            sum + parseAmount(expense.actual || expense.amount), 0);
        }
      });

      return totals;
    };

    // Account allocation analysis
    const getAccountAllocations = () => {
      const allocations = {};
      
      // Process monthly expenses
      Object.values(monthly).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            const account = expense.accountId || expense.account || 'Unassigned';
            const amount = parseAmount(expense.actual || expense.amount);
            allocations[account] = (allocations[account] || 0) + amount;
          });
        }
      });

      // Process annual expenses (as monthly equivalent)
      Object.values(annual).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            const account = expense.accountId || expense.account || 'Unassigned';
            const amount = parseAmount(expense.actual || expense.amount);
            const monthlyAmount = amount / 12;
            allocations[account] = (allocations[account] || 0) + monthlyAmount;
          });
        }
      });

      return allocations;
    };

    // ENHANCED: Budget health metrics with actual vs projected
    const getBudgetHealth = () => {
      const projectedIncome = getTotalProjectedIncome();
      const actualIncome = getTotalActualIncome();
      const totalExpenses = getTotalMonthlyExpenses() + getMonthlyAnnualImpact();
      const projectedNetIncome = getNetMonthlyIncome();
      const actualNetIncome = getActualNetIncome();
      const savingsRate = getSavingsRate();
      const actualSavingsRate = getActualSavingsRate();
      const upcomingExpenses = getUpcomingExpenses();
      const incomeProgress = getIncomeProgress();

      let status = 'good';
      if (projectedNetIncome < 0 || actualNetIncome < 0) {
        status = 'critical';
      } else if (savingsRate < 10 || actualSavingsRate < 10) {
        status = 'warning';
      }

      return {
        status,
        // Traditional metrics (projected)
        incomeToExpenseRatio: projectedIncome > 0 ? projectedIncome / totalExpenses : 0,
        debtToIncomeRatio: projectedIncome > 0 ? (totalExpenses / projectedIncome) * 100 : 0,
        savingsRate,
        emergencyFundWeeks: projectedNetIncome > 0 ? (projectedNetIncome * 4) / totalExpenses : 0,
        
        // Actual performance metrics
        actualIncomeToExpenseRatio: actualIncome > 0 ? actualIncome / totalExpenses : 0,
        actualSavingsRate,
        incomeProgress: incomeProgress.percentReceived,
        isIncomeOnTrack: incomeProgress.isOnTrack,
        
        // Expense tracking
        upcomingExpensesCount: upcomingExpenses.length,
        overdueExpensesCount: upcomingExpenses.filter(exp => exp.daysUntil < 0).length,
        budgetUtilization: projectedIncome > 0 ? (totalExpenses / projectedIncome) * 100 : 0,
        cashFlowStatus: projectedNetIncome >= 0 ? 'positive' : 'negative',
        actualCashFlowStatus: actualNetIncome >= 0 ? 'positive' : 'negative',
        
        // Weekly planner integration
        weeklyPlannerTotals: getWeeklyPlannerTotals(),
        totalPlannedIncome: getWeeklyIncome().reduce((sum, week) => sum + week, 0),
        totalPlannedExpenses: getWeeklyPlannerTotals().reduce((sum, week) => sum + week.expenses, 0),
        
        recommendations: generateHealthRecommendations(status, savingsRate, actualSavingsRate, incomeProgress)
      };
    };

    // Generate health recommendations
    const generateHealthRecommendations = (status, savingsRate, actualSavingsRate, incomeProgress) => {
      const recommendations = [];

      if (status === 'critical') {
        recommendations.push('🚨 Your expenses exceed your income. Consider reducing non-essential spending.');
        recommendations.push('💡 Review your largest expense categories for potential cuts.');
        recommendations.push('📊 Use the Weekly Planner to better distribute expenses throughout the month.');
      } else if (status === 'warning') {
        recommendations.push('⚠️ Your savings rate is below 10%. Try to increase it gradually.');
        recommendations.push('💡 Look for ways to reduce expenses or increase income.');
        recommendations.push('📋 The Weekly Planner can help you identify weeks with excess cash flow for savings.');
      } else {
        recommendations.push('✅ Your budget is healthy! Keep up the good work.');
        if (savingsRate >= 20) {
          recommendations.push('🎉 Excellent savings rate! Consider investing for long-term goals.');
        }
      }

      if (!incomeProgress.isOnTrack) {
        recommendations.push('📈 Your income is behind schedule this month. Monitor actual vs projected closely.');
      }

      return recommendations;
    };

    // Variance analysis between planned and actual
    const getVarianceAnalysis = () => {
      const incomeProgress = getIncomeProgress();
      const projectedExpenses = getTotalMonthlyExpenses() + getMonthlyAnnualImpact();
      
      return {
        incomeVariance: incomeProgress.variance,
        incomeProgressVariance: incomeProgress.progressVariance,
        incomeVariancePercent: incomeProgress.totalProjectedIncome > 0 ? 
          (incomeProgress.variance / incomeProgress.totalProjectedIncome) * 100 : 0,
        monthProgress: incomeProgress.monthProgress,
        isIncomeOnTrack: incomeProgress.isOnTrack,
        projectedNetFlow: getNetMonthlyIncome(),
        actualNetFlow: getActualNetIncome(),
        weeklyVariance: getWeeklyPlannerTotals().map(week => ({
          week: week.week,
          variance: week.balance,
          status: week.balance >= 0 ? 'surplus' : 'deficit'
        }))
      };
    };

    // Frequency-based expense analysis
    const getExpensesByFrequency = () => {
      const frequencies = { monthly: 0, quarterly: 0, 'semi-annual': 0, annual: 0, 'one-time': 0 };
      
      Object.values(annual).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            const frequency = expense.frequency || 'annual';
            const amount = parseAmount(expense.actual || expense.amount);
            frequencies[frequency] = (frequencies[frequency] || 0) + amount;
          });
        }
      });

      // Add monthly expenses
      frequencies.monthly = getTotalMonthlyExpenses();

      return frequencies;
    };

    // Monthly projections
    const getMonthlyProjections = () => {
      const months = [];
      const baseIncome = getTotalProjectedIncome();
      const baseExpenses = getTotalMonthlyExpenses() + getMonthlyAnnualImpact();
      
      for (let i = 0; i < 12; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        
        months.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          income: baseIncome,
          expenses: baseExpenses,
          netFlow: baseIncome - baseExpenses,
          cumulative: i === 0 ? 
            baseIncome - baseExpenses :
            months[i-1].cumulative + (baseIncome - baseExpenses)
        });
      }
      
      return months;
    };

    // ENHANCED: Cash flow projection using weekly planner data
    const getCashFlowProjection = () => {
      const weeklyTotals = getWeeklyPlannerTotals();
      
      return weeklyTotals.map(weekData => ({
        week: weekData.week,
        income: weekData.income,
        expenses: weekData.expenses,
        netFlow: weekData.balance,
        status: weekData.balance >= 0 ? 'positive' : 'negative',
        expenseCount: weekData.expenseCount
      }));
    };

    // Top expense categories
    const getTopExpenseCategories = (limit = 5) => {
      const categoryTotals = getCategoryTotals();
      const allCategories = [];

      // Combine monthly and annual categories
      Object.entries(categoryTotals.monthly).forEach(([key, total]) => {
        allCategories.push({ key, total, type: 'monthly' });
      });

      Object.entries(categoryTotals.annual).forEach(([key, total]) => {
        const monthlyEquivalent = total / 12;
        allCategories.push({ key, total: monthlyEquivalent, type: 'annual' });
      });

      return allCategories
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    };

    return {
      // Income calculations (ENHANCED with actual vs projected)
      getTotalIncome, // Legacy - returns projected for compatibility
      getTotalProjectedIncome,
      getTotalActualIncome,
      getIncomeProgress,
      getExpectedIncomeByNow,
      
      // Expense calculations
      getTotalMonthlyExpenses,
      getTotalAnnualExpenses,
      getMonthlyAnnualImpact,
      
      // Net income calculations (ENHANCED)
      getNetMonthlyIncome, // Uses projected income
      getActualNetIncome, // Uses actual income
      
      // Savings rate calculations (ENHANCED)
      getSavingsRate, // Uses projected income
      getActualSavingsRate, // Uses actual income
      
      // ENHANCED: Weekly calculations for planner integration
      getWeeklyIncome, // Uses actual vs projected priority logic
      getWeeklyPlannerTotals, // Detailed weekly breakdown
      
      // Analysis functions (ALL ENHANCED)
      getUpcomingExpenses,
      getCategoryTotals,
      getAccountAllocations,
      getBudgetHealth, // ENHANCED with actual vs projected metrics and weekly integration
      getExpensesByFrequency,
      getMonthlyProjections,
      getCashFlowProjection, // ENHANCED with weekly planner data
      getVarianceAnalysis, // ENHANCED with income progress and weekly variance
      getTopExpenseCategories
    };
  }, [budgetData, new Date().toDateString()]);

  return calculations;
}

export default useBudgetCalculations;