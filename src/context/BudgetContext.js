// src/context/BudgetContext.js - Complete Enhanced Context with ALL Calculation Functions
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { validateBudgetData, createDefaultData } from '../utils/validators';
import { formatCurrency, parseAmount } from '../utils/formatters';
import { ACTIONS, budgetReducer } from './budgetReducer';

const BudgetContext = createContext();

// Initial state with enhanced structure
const initialState = {
  data: createDefaultData(),
  currentPage: 'home',
  theme: 'light',
  isLoading: false,
  lastUpdated: new Date().toISOString(),
  plannerState: {},
  currentWeek: 1
};

// Context Provider Component
export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('family-budget-data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (validateBudgetData(parsedData)) {
          dispatch({ type: ACTIONS.LOAD_DATA, payload: parsedData });
        }
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('family-budget-data', JSON.stringify(state.data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }, [state.data]);

  // Enhanced action creators with cross-page syncing
  const actions = {
    loadData: (data) => {
      if (validateBudgetData(data)) {
        dispatch({ type: ACTIONS.LOAD_DATA, payload: data });
      } else {
        console.error('Invalid budget data provided to loadData');
      }
    },
    updateIncome: (income) =>
      dispatch({ type: ACTIONS.UPDATE_INCOME, payload: income }),

    updateMonthlyExpense: (category, expense, index) =>
      dispatch({ type: ACTIONS.UPDATE_MONTHLY_EXPENSE, payload: expense, category, index }),

    updateAnnualExpense: (category, expense, index) =>
      dispatch({ type: ACTIONS.UPDATE_ANNUAL_EXPENSE, payload: expense, category, index }),

    updatePlanner: (plannerData) =>
      dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: plannerData }),

    updateExpenseStatus: (expenseId, expenseName, weekIndex, statusType, checked, sourceModule) =>
      dispatch({
        type: ACTIONS.UPDATE_EXPENSE_STATUS,
        payload: { expenseId, expenseName, weekIndex, statusType, checked, sourceModule }
      }),

    setCurrentPage: (page) =>
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: page }),

    resetData: () =>
      dispatch({ type: ACTIONS.RESET_DATA }),

    toggleTheme: () =>
      dispatch({ type: ACTIONS.TOGGLE_THEME }),

    distributeMonthlyToWeekly: (expenseName, monthlyAmount, dueDate) => {
      const existingData = state.data.plannerState[expenseName] || {
        weeks: Array(5).fill(0),
        transferred: Array(5).fill(false),
        paid: Array(5).fill(false)
      };

      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        const dueDateOfMonth = dueDateObj.getDate();

        let targetWeek = Math.ceil(dueDateOfMonth / 7) - 1;
        targetWeek = Math.max(0, Math.min(4, targetWeek));

        const newWeeks = [...existingData.weeks];
        newWeeks[targetWeek] = monthlyAmount;

        const updatedData = {
          ...existingData,
          weeks: newWeeks
        };

        const newPlannerState = {
          ...state.data.plannerState,
          [expenseName]: updatedData
        };

        dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: newPlannerState });
      }
    },

    autoPopulatePlanner: () => {
      const newPlannerState = { ...state.data.plannerState };

      // Process monthly expenses
      if (state.data.monthly) {
        Object.values(state.data.monthly).flat().forEach(expense => {
          if (expense.name && expense.name.trim()) {
            const monthlyAmount = parseFloat(expense.actual || expense.amount || 0);
            if (monthlyAmount > 0) {
              let weeklyAmounts = Array(5).fill(0);

              if (expense.date) {
                const dueDateObj = new Date(expense.date);
                const dueDateOfMonth = dueDateObj.getDate();
                let targetWeek = Math.ceil(dueDateOfMonth / 7) - 1;
                targetWeek = Math.max(0, Math.min(4, targetWeek));
                weeklyAmounts[targetWeek] = monthlyAmount;
              } else {
                const weeklyAmount = monthlyAmount / 5;
                weeklyAmounts = Array(5).fill(weeklyAmount);
              }

              newPlannerState[expense.name] = {
                weeks: weeklyAmounts,
                transferred: expense.transferred ? Array(5).fill(expense.transferred) : Array(5).fill(false),
                paid: expense.paid ? Array(5).fill(expense.paid) : Array(5).fill(false)
              };
            }
          }
        });
      }

      // Process annual expenses (convert to monthly equivalent)
      if (state.data.annual) {
        Object.values(state.data.annual).flat().forEach(expense => {
          if (expense.name && expense.name.trim()) {
            const annualAmount = parseFloat(expense.actual || expense.amount || 0);
            const monthlyEquivalent = annualAmount / 12;

            if (monthlyEquivalent > 0) {
              let weeklyAmounts = Array(5).fill(0);

              if (expense.date) {
                const dueDateObj = new Date(expense.date);
                const dueDateOfMonth = dueDateObj.getDate();
                let targetWeek = Math.ceil(dueDateOfMonth / 7) - 1;
                targetWeek = Math.max(0, Math.min(4, targetWeek));
                weeklyAmounts[targetWeek] = monthlyEquivalent;
              } else {
                const weeklyAmount = monthlyEquivalent / 5;
                weeklyAmounts = Array(5).fill(weeklyAmount);
              }

              newPlannerState[expense.name] = {
                weeks: weeklyAmounts,
                transferred: expense.transferred ? Array(5).fill(expense.transferred) : Array(5).fill(false),
                paid: expense.paid ? Array(5).fill(expense.paid) : Array(5).fill(false)
              };
            }
          }
        });
      }

      dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: newPlannerState });
    }
  };

  // COMPLETE Enhanced calculations with ALL functions
  const calculations = {
    getTotalIncome: () => {
      if (!state.data.income || !Array.isArray(state.data.income)) return 0;

      return state.data.income.reduce((total, income) => {
        if (income.weeks && Array.isArray(income.weeks)) {
          return total + income.weeks.reduce((sum, week) => sum + (parseFloat(week) || 0), 0);
        }
        return total;
      }, 0);
    },

    getWeeklyIncome: () => {
      const weeklyTotals = Array(5).fill(0);

      if (state.data.income && Array.isArray(state.data.income)) {
        state.data.income.forEach(income => {
          if (income.weeks && Array.isArray(income.weeks)) {
            income.weeks.forEach((amount, index) => {
              if (index < 5) {
                weeklyTotals[index] += parseFloat(amount) || 0;
              }
            });
          }
        });
      }

      return weeklyTotals;
    },

    getTotalMonthlyExpenses: () => {
      if (!state.data.monthly) return 0;

      return Object.values(state.data.monthly).reduce((total, category) => {
        if (Array.isArray(category)) {
          return total + category.reduce((catTotal, expense) => {
            return catTotal + (parseFloat(expense.actual || expense.amount || 0));
          }, 0);
        }
        return total;
      }, 0);
    },

    getTotalAnnualExpenses: () => {
      if (!state.data.annual) return 0;

      return Object.values(state.data.annual).reduce((total, category) => {
        if (Array.isArray(category)) {
          return total + category.reduce((catTotal, expense) => {
            return catTotal + (parseFloat(expense.actual || expense.amount || 0));
          }, 0);
        }
        return total;
      }, 0);
    },

    getWeeklyPlannerTotals: () => {
      const weeklyTotals = Array(5).fill(0);

      if (state.data.plannerState) {
        Object.values(state.data.plannerState).forEach(expense => {
          if (expense.weeks && Array.isArray(expense.weeks)) {
            expense.weeks.forEach((amount, index) => {
              if (index < 5) {
                weeklyTotals[index] += parseFloat(amount) || 0;
              }
            });
          }
        });
      }

      return weeklyTotals;
    },

    getCashFlowByWeek: () => {
      const weeklyIncome = calculations.getWeeklyIncome();
      const weeklyExpenses = calculations.getWeeklyPlannerTotals();

      return weeklyIncome.map((income, index) => income - weeklyExpenses[index]);
    },

    getMonthlyAnnualImpact: () => {
      const totalAnnual = calculations.getTotalAnnualExpenses();
      return totalAnnual / 12;
    },

    getNetMonthlyIncome: () => {
      const totalIncome = calculations.getTotalIncome();
      const monthlyExpenses = calculations.getTotalMonthlyExpenses();
      const annualImpact = calculations.getMonthlyAnnualImpact();
      return totalIncome - monthlyExpenses - annualImpact;
    },

    getSavingsRate: () => {
      const net = calculations.getNetMonthlyIncome();
      const income = calculations.getTotalIncome();

      return income > 0 ? (net / income) * 100 : 0;
    },

    getAccountBalances: () => {
      return state.data.accounts || {
        checking: 0,
        savings: 0,
        creditCard: 0,
        cash: 0,
        investment: 0,
        other: 0
      };
    },

    getCategoryTotals: () => {
      const monthlyTotals = {};
      const annualTotals = {};

      // Calculate monthly category totals
      if (state.data.monthly) {
        Object.entries(state.data.monthly).forEach(([category, expenses]) => {
          if (Array.isArray(expenses)) {
            monthlyTotals[category] = expenses.reduce((total, expense) => {
              return total + (parseFloat(expense.actual || expense.amount || 0));
            }, 0);
          }
        });
      }

      // Calculate annual category totals
      if (state.data.annual) {
        Object.entries(state.data.annual).forEach(([category, expenses]) => {
          if (Array.isArray(expenses)) {
            annualTotals[category] = expenses.reduce((total, expense) => {
              return total + (parseFloat(expense.actual || expense.amount || 0));
            }, 0);
          }
        });
      }

      return { monthly: monthlyTotals, annual: annualTotals };
    },

    getBudgetHealth: () => {
      const income = calculations.getTotalIncome();
      const monthlyExpenses = calculations.getTotalMonthlyExpenses();
      const annualMonthlyImpact = calculations.getMonthlyAnnualImpact();
      const totalExpenses = monthlyExpenses + annualMonthlyImpact;
      const netIncome = income - totalExpenses;

      let status = 'good';
      if (netIncome < 0) {
        status = 'critical';
      } else if (netIncome < income * 0.1) {
        status = 'warning';
      }

      return {
        status,
        netIncome,
        totalExpenses,
        savingsRate: income > 0 ? (netIncome / income) * 100 : 0,
        message: status === 'critical' ? 'Expenses exceed income' :
          status === 'warning' ? 'Low savings rate' : 'Budget looks healthy'
      };
    },

    getUpcomingExpenses: () => {
      const upcoming = [];
      const today = new Date();

      // Check monthly expenses
      if (state.data.monthly) {
        Object.values(state.data.monthly).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(expense => {
              if (expense.date && !expense.paid) {
                const dueDate = new Date(expense.date);
                const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntil <= 7 && daysUntil >= 0) {
                  upcoming.push({
                    ...expense,
                    daysUntil,
                    type: 'monthly'
                  });
                }
              }
            });
          }
        });
      }

      // Check annual expenses
      if (state.data.annual) {
        Object.values(state.data.annual).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(expense => {
              if (expense.date && !expense.paid) {
                const dueDate = new Date(expense.date);
                const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntil <= 30 && daysUntil >= 0) {
                  upcoming.push({
                    ...expense,
                    daysUntil,
                    type: 'annual'
                  });
                }
              }
            });
          }
        });
      }

      return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    },

    // Additional helper functions
    getCategoryTotal: (categoryKey, type = 'monthly') => {
      const data = type === 'monthly' ? state.data.monthly : state.data.annual;
      const category = data?.[categoryKey] || [];

      return category.reduce((total, expense) => {
        return total + (parseFloat(expense.actual || expense.amount || 0));
      }, 0);
    },

    getExpenseById: (expenseId) => {
      // Search in monthly expenses
      for (const [categoryKey, expenses] of Object.entries(state.data.monthly || {})) {
        const expense = expenses.find(exp => exp.id === expenseId);
        if (expense) return { ...expense, category: categoryKey, type: 'monthly' };
      }

      // Search in annual expenses
      for (const [categoryKey, expenses] of Object.entries(state.data.annual || {})) {
        const expense = expenses.find(exp => exp.id === expenseId);
        if (expense) return { ...expense, category: categoryKey, type: 'annual' };
      }

      return null;
    },

    getTotalPlannedForWeek: (weekIndex) => {
      if (weekIndex < 0 || weekIndex >= 5) return 0;

      let total = 0;
      Object.values(state.data.plannerState || {}).forEach(expense => {
        if (expense.weeks && expense.weeks[weekIndex]) {
          total += parseFloat(expense.weeks[weekIndex]) || 0;
        }
      });

      return total;
    },

    getWeeklyBalance: (weekIndex) => {
      const income = calculations.getWeeklyIncome()[weekIndex] || 0;
      const expenses = calculations.getTotalPlannedForWeek(weekIndex);
      return income - expenses;
    }
  };

  const contextValue = {
    state,
    actions,
    calculations,
    formatCurrency,
    parseAmount
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
}

// Custom hook to use the Budget context
export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}

export { ACTIONS };
