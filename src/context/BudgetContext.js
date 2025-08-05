// src/context/BudgetContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { validateBudgetData, createDefaultData } from '../utils/validators';
import { formatCurrency, parseAmount } from '../utils/formatters';

const BudgetContext = createContext();

// Action types for reducer
const ACTIONS = {
  LOAD_DATA: 'LOAD_DATA',
  UPDATE_INCOME: 'UPDATE_INCOME',
  UPDATE_MONTHLY_EXPENSE: 'UPDATE_MONTHLY_EXPENSE',
  UPDATE_ANNUAL_EXPENSE: 'UPDATE_ANNUAL_EXPENSE',
  UPDATE_ACCOUNTS: 'UPDATE_ACCOUNTS',
  UPDATE_PLANNER: 'UPDATE_PLANNER',
  UPDATE_LINKS: 'UPDATE_LINKS',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  RESET_DATA: 'RESET_DATA',
  TOGGLE_THEME: 'TOGGLE_THEME'
};

// Initial state
const initialState = {
  data: createDefaultData(),
  currentPage: 'home',
  theme: 'light',
  isLoading: false,
  lastUpdated: new Date().toISOString()
};

// Reducer function for state management
function budgetReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_DATA:
      return {
        ...state,
        data: { ...state.data, ...action.payload },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_INCOME:
      return {
        ...state,
        data: {
          ...state.data,
          income: action.payload
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_MONTHLY_EXPENSE:
      const newMonthly = { ...state.data.monthly };
      if (!newMonthly[action.category]) {
        newMonthly[action.category] = [];
      }
      
      if (action.index !== undefined) {
        newMonthly[action.category][action.index] = action.payload;
      } else {
        newMonthly[action.category].push(action.payload);
      }

      return {
        ...state,
        data: {
          ...state.data,
          monthly: newMonthly
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_ANNUAL_EXPENSE:
      const newAnnual = { ...state.data.annual };
      if (!newAnnual[action.category]) {
        newAnnual[action.category] = [];
      }
      
      if (action.index !== undefined) {
        newAnnual[action.category][action.index] = action.payload;
      } else {
        newAnnual[action.category].push(action.payload);
      }

      return {
        ...state,
        data: {
          ...state.data,
          annual: newAnnual
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_ACCOUNTS:
      return {
        ...state,
        data: {
          ...state.data,
          accounts: { ...state.data.accounts, ...action.payload }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_PLANNER:
      return {
        ...state,
        data: {
          ...state.data,
          plannerState: { ...state.data.plannerState, ...action.payload }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_LINKS:
      return {
        ...state,
        data: {
          ...state.data,
          links: { ...state.data.links, ...action.payload }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.SET_CURRENT_PAGE:
      return {
        ...state,
        currentPage: action.payload
      };

    case ACTIONS.RESET_DATA:
      return {
        ...state,
        data: createDefaultData(),
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.TOGGLE_THEME:
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light'
      };

    default:
      return state;
  }
}

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

  // Action creators
  const actions = {
    updateIncome: (income) => 
      dispatch({ type: ACTIONS.UPDATE_INCOME, payload: income }),

    updateMonthlyExpense: (category, expense, index) =>
      dispatch({ 
        type: ACTIONS.UPDATE_MONTHLY_EXPENSE, 
        category, 
        payload: expense, 
        index 
      }),

    updateAnnualExpense: (category, expense, index) =>
      dispatch({ 
        type: ACTIONS.UPDATE_ANNUAL_EXPENSE, 
        category, 
        payload: expense, 
        index 
      }),

    updateAccounts: (accounts) =>
      dispatch({ type: ACTIONS.UPDATE_ACCOUNTS, payload: accounts }),

    updatePlanner: (plannerData) =>
      dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: plannerData }),

    updateLinks: (links) =>
      dispatch({ type: ACTIONS.UPDATE_LINKS, payload: links }),

    setCurrentPage: (page) =>
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: page }),

    resetData: () =>
      dispatch({ type: ACTIONS.RESET_DATA }),

    toggleTheme: () =>
      dispatch({ type: ACTIONS.TOGGLE_THEME }),

    loadData: (data) =>
      dispatch({ type: ACTIONS.LOAD_DATA, payload: data })
  };

  // Calculated values
  const calculations = {
    getTotalIncome: () => {
      return state.data.income.reduce((total, item) => 
        total + parseAmount(item.amount), 0);
    },

    getTotalMonthlyExpenses: () => {
      let total = 0;
      Object.values(state.data.monthly).forEach(category => {
        category.forEach(expense => {
          total += parseAmount(expense.actual || expense.amount);
        });
      });
      return total;
    },

    getTotalAnnualExpenses: () => {
      let total = 0;
      Object.values(state.data.annual).forEach(category => {
        category.forEach(expense => {
          total += parseAmount(expense.actual || expense.amount);
        });
      });
      return total;
    },

    getMonthlyAnnualImpact: () => {
      return calculations.getTotalAnnualExpenses() / 12;
    },

    getNetMonthlyIncome: () => {
      const income = calculations.getTotalIncome();
      const monthlyExpenses = calculations.getTotalMonthlyExpenses();
      const annualImpact = calculations.getMonthlyAnnualImpact();
      return income - monthlyExpenses - annualImpact;
    },

    getSavingsRate: () => {
      const income = calculations.getTotalIncome();
      const net = calculations.getNetMonthlyIncome();
      return income > 0 ? (net / income) * 100 : 0;
    },

    getUpcomingExpenses: () => {
      const upcoming = [];
      const today = new Date();
      
      // Check monthly expenses
      Object.values(state.data.monthly).forEach(category => {
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
      });

      // Check annual expenses
      Object.values(state.data.annual).forEach(category => {
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
      });

      return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
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