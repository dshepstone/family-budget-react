// src/hooks/useBudgetCalculations.js
import { useMemo } from 'react';
import { currencyCalculator } from '../plugins/calculators/CurrencyCalculator';
import { DUE_DATE_THRESHOLDS } from '../utils/constants';

/**
 * Custom hook that provides budget calculation utilities
 * @param {Object} budgetData - The budget data object
 */
export function useBudgetCalculations(budgetData) {
  
  // Memoized calculations to prevent unnecessary recalculations
  const calculations = useMemo(() => {
    if (!budgetData) {
      return {
        getTotalIncome: () => 0,
        getTotalMonthlyExpenses: () => 0,
        getTotalAnnualExpenses: () => 0,
        getMonthlyAnnualImpact: () => 0,
        getNetMonthlyIncome: () => 0,
        getSavingsRate: () => 0,
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

    // Basic totals
    const getTotalIncome = () => {
      return income.reduce((total, item) => 
        currencyCalculator.add(total, item.amount || 0), 0);
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

    const getNetMonthlyIncome = () => {
      const totalIncome = getTotalIncome();
      const monthlyExpenses = getTotalMonthlyExpenses();
      const annualImpact = getMonthlyAnnualImpact();
      return currencyCalculator.subtract(totalIncome, currencyCalculator.add(monthlyExpenses, annualImpact));
    };

    const getSavingsRate = () => {
      const totalIncome = getTotalIncome();
      const netIncome = getNetMonthlyIncome();
      return totalIncome > 0 ? currencyCalculator.percentageOf(netIncome, totalIncome) : 0;
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
          const account = expense.account || 'Unassigned';
          const amount = currencyCalculator.parseAmount(expense.actual || expense.amount);
          allocations[account] = currencyCalculator.add(allocations[account] || 0, amount);
        });
      });

      // Process annual expenses (as monthly equivalent)
      Object.values(annual).forEach(category => {
        category.forEach(expense => {
          const account = expense.account || 'Unassigned';
          const amount = currencyCalculator.parseAmount(expense.actual || expense.amount);
          const monthlyAmount = currencyCalculator.divide(amount, 12);
          allocations[account] = currencyCalculator.add(allocations[account] || 0, monthlyAmount);
        });
      });

      return allocations;
    };

    // Budget health metrics
    const getBudgetHealth = () => {
      const totalIncome = getTotalIncome();
      const totalExpenses = currencyCalculator.add(getTotalMonthlyExpenses(), getMonthlyAnnualImpact());
      const netIncome = getNetMonthlyIncome();
      const savingsRate = getSavingsRate();
      const upcomingExpenses = getUpcomingExpenses();

      return {
        incomeToExpenseRatio: totalIncome > 0 ? currencyCalculator.divide(totalIncome, totalExpenses) : 0,
        debtToIncomeRatio: totalIncome > 0 ? currencyCalculator.percentageOf(totalExpenses, totalIncome) : 0,
        savingsRate,
        emergencyFundWeeks: netIncome > 0 ? currencyCalculator.divide(netIncome * 4, totalExpenses) : 0,
        upcomingExpensesCount: upcomingExpenses.length,
        overdueExpensesCount: upcomingExpenses.filter(exp => exp.daysUntil < 0).length,
        budgetUtilization: totalIncome > 0 ? currencyCalculator.percentageOf(totalExpenses, totalIncome) : 0,
        cashFlowStatus: netIncome >= 0 ? 'positive' : 'negative'
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
      const baseIncome = getTotalIncome();
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

    // Variance analysis between planned and actual
    const getVarianceAnalysis = () => {
      const plannedIncome = (plannerState.weeklyIncome || []).reduce((sum, income) => 
        currencyCalculator.add(sum, income), 0);
      const plannedExpenses = (plannerState.weeklyExpenses || []).reduce((sum, expense) => 
        currencyCalculator.add(sum, expense), 0);
      
      const actualIncome = getTotalIncome();
      const actualExpenses = getTotalMonthlyExpenses();

      return {
        incomeVariance: currencyCalculator.subtract(actualIncome, plannedIncome),
        expenseVariance: currencyCalculator.subtract(actualExpenses, plannedExpenses),
        netVariance: currencyCalculator.subtract(
          currencyCalculator.subtract(actualIncome, actualExpenses),
          currencyCalculator.subtract(plannedIncome, plannedExpenses)
        ),
        incomeVariancePercent: plannedIncome > 0 ? 
          currencyCalculator.percentageOf(currencyCalculator.subtract(actualIncome, plannedIncome), plannedIncome) : 0,
        expenseVariancePercent: plannedExpenses > 0 ? 
          currencyCalculator.percentageOf(currencyCalculator.subtract(actualExpenses, plannedExpenses), plannedExpenses) : 0
      };
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
      getTotalIncome,
      getTotalMonthlyExpenses,
      getTotalAnnualExpenses,
      getMonthlyAnnualImpact,
      getNetMonthlyIncome,
      getSavingsRate,
      getUpcomingExpenses,
      getCategoryTotals,
      getAccountAllocations,
      getBudgetHealth,
      getExpensesByFrequency,
      getMonthlyProjections,
      getCashFlowProjection,
      getVarianceAnalysis,
      getTopExpenseCategories
    };
  }, [budgetData]);

  return calculations;
}

export default useBudgetCalculations;