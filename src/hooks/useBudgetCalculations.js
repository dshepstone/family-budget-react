// src/hooks/useBudgetCalculations.js - Updated with Month-Aware Income Calculations
import { useMemo } from 'react';
import { currencyCalculator } from '../plugins/calculators/CurrencyCalculator';
import { DUE_DATE_THRESHOLDS } from '../utils/constants';

/**
 * Custom hook that provides budget calculation utilities with proper actual vs projected income tracking
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
        getTopExpenseCategories: () => ([])
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

    // Month-aware income calculation (mirrors IncomePage.js logic)
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

    // NEW: Get total projected income for the month
    const getTotalProjectedIncome = () => {
      return income.reduce((total, item) => {
        return total + getMonthAwareMonthlyAmount(item, 'projected');
      }, 0);
    };

    // NEW: Get total actual income received so far this month
    const getTotalActualIncome = () => {
      return income.reduce((total, item) => {
        return total + getMonthAwareMonthlyAmount(item, 'actual');
      }, 0);
    };

    // LEGACY: Keep for backward compatibility (now uses projected)
    const getTotalIncome = () => {
      return getTotalProjectedIncome();
    };

    // NEW: Income progress tracking
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
      const expectedAtThisPoint = (projected * monthProgress) / 100;
      const progressVariance = actual - expectedAtThisPoint;

      return {
        projected,
        actual,
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
        category.forEach(expense => {
          total = currencyCalculator.add(total, expense.actual || expense.amount || 0);
        });
      });
      return total;
    };

    const getTotalAnnualExpenses = () => {
      let total = 0;
      Object.values(annual).forEach(category => {
        category.forEach(expense => {
          total = currencyCalculator.add(total, expense.actual || expense.amount || 0);
        });
      });
      return total;
    };

    const getMonthlyAnnualImpact = () => {
      return currencyCalculator.divide(getTotalAnnualExpenses(), 12);
    };

    // UPDATED: Net income using projected income (for budget planning)
    const getNetMonthlyIncome = () => {
      const projectedIncome = getTotalProjectedIncome();
      const monthlyExpenses = getTotalMonthlyExpenses();
      const annualImpact = getMonthlyAnnualImpact();
      return currencyCalculator.subtract(projectedIncome, currencyCalculator.add(monthlyExpenses, annualImpact));
    };

    // NEW: Actual net income using actual income received so far
    const getActualNetIncome = () => {
      const actualIncome = getTotalActualIncome();
      const monthlyExpenses = getTotalMonthlyExpenses();
      const annualImpact = getMonthlyAnnualImpact();
      return currencyCalculator.subtract(actualIncome, currencyCalculator.add(monthlyExpenses, annualImpact));
    };

    // UPDATED: Savings rate using projected income (for planning)
    const getSavingsRate = () => {
      const projectedIncome = getTotalProjectedIncome();
      const netIncome = getNetMonthlyIncome();
      return projectedIncome > 0 ? currencyCalculator.percentageOf(netIncome, projectedIncome) : 0;
    };

    // NEW: Actual savings rate based on income received so far
    const getActualSavingsRate = () => {
      const actualIncome = getTotalActualIncome();
      const actualNetIncome = getActualNetIncome();
      return actualIncome > 0 ? currencyCalculator.percentageOf(actualNetIncome, actualIncome) : 0;
    };

    // Upcoming expenses analysis
    const getUpcomingExpenses = () => {
      const upcoming = [];
      const today = new Date();
      
      // Check monthly expenses
      Object.values(monthly).forEach(category => {
        category.forEach(expense => {
          if (expense.date && !expense.paid) {
            const dueDate = new Date(expense.date);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= DUE_DATE_THRESHOLDS.UPCOMING) {
              upcoming.push({
                ...expense,
                daysUntil,
                type: 'monthly'
              });
            }
          }
        });
      });

      // Check annual expenses
      Object.values(annual).forEach(category => {
        category.forEach(expense => {
          if (expense.date && !expense.paid) {
            const dueDate = new Date(expense.date);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= DUE_DATE_THRESHOLDS.UPCOMING) {
              upcoming.push({
                ...expense,
                daysUntil,
                type: 'annual'
              });
            }
          }
        });
      });

      return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    };

    // Category analysis
    const getCategoryTotals = () => {
      const totals = { monthly: {}, annual: {} };
      
      Object.entries(monthly).forEach(([categoryKey, expenses]) => {
        totals.monthly[categoryKey] = expenses.reduce((sum, expense) => 
          currencyCalculator.add(sum, expense.actual || expense.amount || 0), 0);
      });

      Object.entries(annual).forEach(([categoryKey, expenses]) => {
        totals.annual[categoryKey] = expenses.reduce((sum, expense) => 
          currencyCalculator.add(sum, expense.actual || expense.amount || 0), 0);
      });

      return totals;
    };

    // Account allocation analysis
    const getAccountAllocations = () => {
      const allocations = {};
      
      // Process monthly expenses
      Object.values(monthly).forEach(category => {
        category.forEach(expense => {
          const account = expense.accountId || 'Unassigned';
          const amount = currencyCalculator.parseAmount(expense.actual || expense.amount);
          allocations[account] = currencyCalculator.add(allocations[account] || 0, amount);
        });
      });

      // Process annual expenses (as monthly equivalent)
      Object.values(annual).forEach(category => {
        category.forEach(expense => {
          const account = expense.accountId || 'Unassigned';
          const amount = currencyCalculator.parseAmount(expense.actual || expense.amount);
          const monthlyAmount = currencyCalculator.divide(amount, 12);
          allocations[account] = currencyCalculator.add(allocations[account] || 0, monthlyAmount);
        });
      });

      return allocations;
    };

    // UPDATED: Budget health metrics with actual vs projected
    const getBudgetHealth = () => {
      const projectedIncome = getTotalProjectedIncome();
      const actualIncome = getTotalActualIncome();
      const totalExpenses = currencyCalculator.add(getTotalMonthlyExpenses(), getMonthlyAnnualImpact());
      const projectedNetIncome = getNetMonthlyIncome();
      const actualNetIncome = getActualNetIncome();
      const savingsRate = getSavingsRate();
      const actualSavingsRate = getActualSavingsRate();
      const upcomingExpenses = getUpcomingExpenses();
      const incomeProgress = getIncomeProgress();

      return {
        // Traditional metrics (projected)
        incomeToExpenseRatio: projectedIncome > 0 ? currencyCalculator.divide(projectedIncome, totalExpenses) : 0,
        debtToIncomeRatio: projectedIncome > 0 ? currencyCalculator.percentageOf(totalExpenses, projectedIncome) : 0,
        savingsRate,
        emergencyFundWeeks: projectedNetIncome > 0 ? currencyCalculator.divide(projectedNetIncome * 4, totalExpenses) : 0,
        
        // NEW: Actual performance metrics
        actualIncomeToExpenseRatio: actualIncome > 0 ? currencyCalculator.divide(actualIncome, totalExpenses) : 0,
        actualSavingsRate,
        incomeProgress: incomeProgress.percentReceived,
        isIncomeOnTrack: incomeProgress.isOnTrack,
        
        // Expense tracking
        upcomingExpensesCount: upcomingExpenses.length,
        overdueExpensesCount: upcomingExpenses.filter(exp => exp.daysUntil < 0).length,
        budgetUtilization: projectedIncome > 0 ? currencyCalculator.percentageOf(totalExpenses, projectedIncome) : 0,
        cashFlowStatus: projectedNetIncome >= 0 ? 'positive' : 'negative',
        actualCashFlowStatus: actualNetIncome >= 0 ? 'positive' : 'negative'
      };
    };

    // Variance analysis between planned and actual
    const getVarianceAnalysis = () => {
      const incomeProgress = getIncomeProgress();
      const projectedExpenses = currencyCalculator.add(getTotalMonthlyExpenses(), getMonthlyAnnualImpact());
      
      return {
        incomeVariance: incomeProgress.variance,
        incomeProgressVariance: incomeProgress.progressVariance,
        incomeVariancePercent: incomeProgress.projected > 0 ? 
          currencyCalculator.percentageOf(incomeProgress.variance, incomeProgress.projected) : 0,
        monthProgress: incomeProgress.monthProgress,
        isIncomeOnTrack: incomeProgress.isOnTrack,
        projectedNetFlow: getNetMonthlyIncome(),
        actualNetFlow: getActualNetIncome()
      };
    };

    // Frequency-based expense analysis
    const getExpensesByFrequency = () => {
      const frequencies = { monthly: 0, quarterly: 0, 'semi-annual': 0, annual: 0, 'one-time': 0 };
      
      Object.values(annual).forEach(category => {
        category.forEach(expense => {
          const frequency = expense.frequency || 'annual';
          const amount = currencyCalculator.parseAmount(expense.actual || expense.amount);
          frequencies[frequency] = currencyCalculator.add(frequencies[frequency] || 0, amount);
        });
      });

      // Add monthly expenses
      frequencies.monthly = currencyCalculator.add(frequencies.monthly, getTotalMonthlyExpenses());

      return frequencies;
    };

    // Monthly projections
    const getMonthlyProjections = () => {
      const months = [];
      const baseIncome = getTotalProjectedIncome();
      const baseExpenses = currencyCalculator.add(getTotalMonthlyExpenses(), getMonthlyAnnualImpact());
      
      for (let i = 0; i < 12; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        
        months.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          income: baseIncome,
          expenses: baseExpenses,
          netFlow: currencyCalculator.subtract(baseIncome, baseExpenses),
          cumulative: i === 0 ? 
            currencyCalculator.subtract(baseIncome, baseExpenses) :
            currencyCalculator.add(months[i-1].cumulative, currencyCalculator.subtract(baseIncome, baseExpenses))
        });
      }
      
      return months;
    };

    // Cash flow projection using planner data
    const getCashFlowProjection = () => {
      const weeklyIncome = plannerState.weeklyIncome || [0, 0, 0, 0];
      const weeklyExpenses = plannerState.weeklyExpenses || [0, 0, 0, 0];
      
      return weeklyIncome.map((income, index) => {
        const expenses = weeklyExpenses[index] || 0;
        const netFlow = currencyCalculator.subtract(income, expenses);
        
        return {
          week: index + 1,
          income,
          expenses,
          netFlow,
          status: netFlow >= 0 ? 'positive' : 'negative'
        };
      });
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
        const monthlyEquivalent = currencyCalculator.divide(total, 12);
        allCategories.push({ key, total: monthlyEquivalent, type: 'annual' });
      });

      return allCategories
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    };

    return {
      // Income calculations (NEW and UPDATED)
      getTotalIncome, // Legacy - returns projected for compatibility
      getTotalProjectedIncome,
      getTotalActualIncome,
      getIncomeProgress,
      
      // Expense calculations
      getTotalMonthlyExpenses,
      getTotalAnnualExpenses,
      getMonthlyAnnualImpact,
      
      // Net income calculations (UPDATED)
      getNetMonthlyIncome, // Uses projected income
      getActualNetIncome, // NEW - uses actual income
      
      // Savings rate calculations (UPDATED)
      getSavingsRate, // Uses projected income
      getActualSavingsRate, // NEW - uses actual income
      
      // Analysis functions
      getUpcomingExpenses,
      getCategoryTotals,
      getAccountAllocations,
      getBudgetHealth, // UPDATED with actual vs projected metrics
      getExpensesByFrequency,
      getMonthlyProjections,
      getCashFlowProjection,
      getVarianceAnalysis, // UPDATED with income progress tracking
      getTopExpenseCategories
    };
  }, [budgetData]);

  return calculations;
}

export default useBudgetCalculations;