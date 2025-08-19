// src/context/BudgetContext.js - Enhanced with Links Categories Support AND Calculator
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createDefaultData } from '../utils/validators';
import { formatCurrency, parseAmount } from '../utils/formatters';

const BudgetContext = createContext();

// Enhanced action types - Added TOGGLE_CALCULATOR
export const ACTIONS = {
  LOAD_DATA: 'LOAD_DATA',
  UPDATE_DATA: 'UPDATE_DATA',
  UPDATE_INCOME: 'UPDATE_INCOME',
  UPDATE_MONTHLY_EXPENSE: 'UPDATE_MONTHLY_EXPENSE',
  REMOVE_MONTHLY_EXPENSE: 'REMOVE_MONTHLY_EXPENSE',
  ADD_MONTHLY_CATEGORY: 'ADD_MONTHLY_CATEGORY',
  REMOVE_MONTHLY_CATEGORY: 'REMOVE_MONTHLY_CATEGORY',
  UPDATE_ANNUAL_EXPENSE: 'UPDATE_ANNUAL_EXPENSE',
  REMOVE_ANNUAL_EXPENSE: 'REMOVE_ANNUAL_EXPENSE',
  ADD_ANNUAL_CATEGORY: 'ADD_ANNUAL_CATEGORY',
  REMOVE_ANNUAL_CATEGORY: 'REMOVE_ANNUAL_CATEGORY',
  ADD_ACCOUNT: 'ADD_ACCOUNT',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  REMOVE_ACCOUNT: 'REMOVE_ACCOUNT',
  UPDATE_PLANNER: 'UPDATE_PLANNER',
  UPDATE_EXPENSE_STATUS: 'UPDATE_EXPENSE_STATUS',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  RESET_DATA: 'RESET_DATA',
  TOGGLE_THEME: 'TOGGLE_THEME',
  TOGGLE_CALCULATOR: 'TOGGLE_CALCULATOR', // Added this action
  UPDATE_LINKS: 'UPDATE_LINKS',
  UPDATE_LINK_CATEGORIES: 'UPDATE_LINK_CATEGORIES',
  ADD_LINK_CATEGORY: 'ADD_LINK_CATEGORY',
  REMOVE_LINK_CATEGORY: 'REMOVE_LINK_CATEGORY'
};

// Enhanced initial state - Added isCalculatorOpen
const initialState = {
  data: {
    ...createDefaultData(),
    links: {},
    linkCategories: {
      // Start with some basic categories as examples
      banking: { name: 'Banking & Finance', icon: '🏦', color: '#27ae60', createdDate: new Date().toISOString() },
      utilities: { name: 'Utilities', icon: '⚡', color: '#f39c12', createdDate: new Date().toISOString() },
      government: { name: 'Government', icon: '🏛️', color: '#9b59b6', createdDate: new Date().toISOString() }
    }
  },
  currentPage: 'home',
  theme: 'light',
  isLoading: false,
  lastUpdated: new Date().toISOString(),
  plannerState: {},
  currentWeek: 1,
  isCalculatorOpen: false // Added calculator state
};

// Enhanced reducer - Added TOGGLE_CALCULATOR case
function budgetReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          ...action.payload,
          // Ensure linkCategories exists
          linkCategories: action.payload.linkCategories || state.data.linkCategories,
          links: action.payload.links || {}
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          ...action.payload
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_LINKS:
      return {
        ...state,
        data: {
          ...state.data,
          links: action.payload
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_LINK_CATEGORIES:
      return {
        ...state,
        data: {
          ...state.data,
          linkCategories: action.payload
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.ADD_LINK_CATEGORY:
      return {
        ...state,
        data: {
          ...state.data,
          linkCategories: {
            ...state.data.linkCategories,
            [action.categoryKey]: {
              ...action.payload,
              createdDate: new Date().toISOString()
            }
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.REMOVE_LINK_CATEGORY:
      const { [action.categoryKey]: removed, ...remainingCategories } = state.data.linkCategories;
      const { [action.categoryKey]: removedLinks, ...remainingLinks } = state.data.links;
      return {
        ...state,
        data: {
          ...state.data,
          linkCategories: remainingCategories,
          links: remainingLinks
        },
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
      const monthlyCategory = state.data.monthly[action.category] || [];
      const updatedMonthlyCategory = [...monthlyCategory];

      if (action.index >= 0 && action.index < updatedMonthlyCategory.length) {
        updatedMonthlyCategory[action.index] = action.payload;
      } else {
        updatedMonthlyCategory.push(action.payload);
      }

      return {
        ...state,
        data: {
          ...state.data,
          monthly: {
            ...state.data.monthly,
            [action.category]: updatedMonthlyCategory
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.REMOVE_MONTHLY_EXPENSE:
      const monthlyExpenses = state.data.monthly[action.category] || [];
      const filteredMonthlyExpenses = monthlyExpenses.filter((_, i) => i !== action.index);

      return {
        ...state,
        data: {
          ...state.data,
          monthly: {
            ...state.data.monthly,
            [action.category]: filteredMonthlyExpenses
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_ANNUAL_EXPENSE:
      const annualCategory = state.data.annual[action.category] || [];
      const updatedAnnualCategory = [...annualCategory];

      if (action.index >= 0 && action.index < updatedAnnualCategory.length) {
        updatedAnnualCategory[action.index] = action.payload;
      } else {
        updatedAnnualCategory.push(action.payload);
      }

      return {
        ...state,
        data: {
          ...state.data,
          annual: {
            ...state.data.annual,
            [action.category]: updatedAnnualCategory
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.REMOVE_ANNUAL_EXPENSE:
      const annualExpenses = state.data.annual[action.category] || [];
      const filteredAnnualExpenses = annualExpenses.filter((_, i) => i !== action.index);

      return {
        ...state,
        data: {
          ...state.data,
          annual: {
            ...state.data.annual,
            [action.category]: filteredAnnualExpenses
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.ADD_ACCOUNT:
      const accounts = Array.isArray(state.data.accounts) ? [...state.data.accounts] : [];
      accounts.push(action.payload);
      return {
        ...state,
        data: { ...state.data, accounts },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_ACCOUNT:
      const updatedAccounts = Array.isArray(state.data.accounts)
        ? state.data.accounts.map(acc => acc.id === action.payload.id ? { ...acc, ...action.payload } : acc)
        : [];
      return {
        ...state,
        data: { ...state.data, accounts: updatedAccounts },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.REMOVE_ACCOUNT:
      const filteredAccounts = Array.isArray(state.data.accounts)
        ? state.data.accounts.filter(acc => acc.id !== action.id)
        : [];
      return {
        ...state,
        data: { ...state.data, accounts: filteredAccounts },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_PLANNER:
      return {
        ...state,
        data: {
          ...state.data,
          plannerState: action.payload
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
        ...initialState,
        data: createDefaultData()
      };

    case ACTIONS.TOGGLE_THEME:
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light'
      };

    // Added TOGGLE_CALCULATOR case
    case ACTIONS.TOGGLE_CALCULATOR:
      return {
        ...state,
        isCalculatorOpen: !state.isCalculatorOpen
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
        if (parsedData && typeof parsedData === 'object') {
          dispatch({ type: ACTIONS.LOAD_DATA, payload: parsedData });
        }
      }
    } catch (error) {
      // Silently handle errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('family-budget-data', JSON.stringify(state.data));
    } catch (error) {
      // Silently handle errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save data:', error);
      }
    }
  }, [state.data]);

  // Enhanced action creators - Added toggleCalculator
  const actions = {
    loadData: (data) => {
      dispatch({ type: ACTIONS.LOAD_DATA, payload: data });
    },

    updateData: (data) => {
      dispatch({ type: ACTIONS.UPDATE_DATA, payload: data });
    },

    updateIncome: (income) => {
      dispatch({ type: ACTIONS.UPDATE_INCOME, payload: income });
    },

    updateMonthlyExpense: (category, expense, index) => {
      dispatch({ type: ACTIONS.UPDATE_MONTHLY_EXPENSE, payload: expense, category, index });
    },

    removeMonthlyExpense: (category, index) => {
      dispatch({ type: ACTIONS.REMOVE_MONTHLY_EXPENSE, category, index });
    },

    updateAnnualExpense: (category, expense, index) => {
      dispatch({ type: ACTIONS.UPDATE_ANNUAL_EXPENSE, payload: expense, category, index });
    },

    removeAnnualExpense: (category, index) => {
      dispatch({ type: ACTIONS.REMOVE_ANNUAL_EXPENSE, category, index });
    },

    addAccount: (account) => {
      dispatch({ type: ACTIONS.ADD_ACCOUNT, payload: account });
    },

    updateAccount: (account) => {
      dispatch({ type: ACTIONS.UPDATE_ACCOUNT, payload: account });
    },

    removeAccount: (id) => {
      dispatch({ type: ACTIONS.REMOVE_ACCOUNT, id });
    },

    updatePlanner: (plannerData) => {
      dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: plannerData });
    },

    setCurrentPage: (page) => {
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: page });
    },

    resetData: () => {
      dispatch({ type: ACTIONS.RESET_DATA });
    },

    toggleTheme: () => {
      dispatch({ type: ACTIONS.TOGGLE_THEME });
    },

    // Added toggleCalculator action
    toggleCalculator: () => {
      dispatch({ type: ACTIONS.TOGGLE_CALCULATOR });
    },

    // Enhanced Links Actions
    updateLinks: (links) => {
      dispatch({ type: ACTIONS.UPDATE_LINKS, payload: links });
    },

    updateLinkCategories: (categories) => {
      dispatch({ type: ACTIONS.UPDATE_LINK_CATEGORIES, payload: categories });
    },

    addLinkCategory: (categoryKey, categoryData) => {
      dispatch({ type: ACTIONS.ADD_LINK_CATEGORY, categoryKey, payload: categoryData });
    },

    removeLinkCategory: (categoryKey) => {
      dispatch({ type: ACTIONS.REMOVE_LINK_CATEGORY, categoryKey });
    },

    // Convenience methods for links
    addLink: (categoryKey, link) => {
      const currentLinks = state.data.links || {};
      const categoryLinks = currentLinks[categoryKey] || [];

      const newLink = {
        ...link,
        id: link.id || `link-${Date.now()}`,
        addedDate: link.addedDate || new Date().toISOString()
      };

      const updatedLinks = {
        ...currentLinks,
        [categoryKey]: [...categoryLinks, newLink]
      };

      dispatch({ type: ACTIONS.UPDATE_LINKS, payload: updatedLinks });
    },

    updateLink: (categoryKey, linkId, updatedLink) => {
      const currentLinks = state.data.links || {};
      const categoryLinks = currentLinks[categoryKey] || [];

      const updatedCategoryLinks = categoryLinks.map(link =>
        link.id === linkId ? { ...link, ...updatedLink } : link
      );

      const updatedLinks = {
        ...currentLinks,
        [categoryKey]: updatedCategoryLinks
      };

      dispatch({ type: ACTIONS.UPDATE_LINKS, payload: updatedLinks });
    },

    removeLink: (categoryKey, linkId) => {
      const currentLinks = state.data.links || {};
      const categoryLinks = currentLinks[categoryKey] || [];

      const updatedCategoryLinks = categoryLinks.filter(link => link.id !== linkId);

      const updatedLinks = {
        ...currentLinks,
        [categoryKey]: updatedCategoryLinks
      };

      dispatch({ type: ACTIONS.UPDATE_LINKS, payload: updatedLinks });
    },

    // Planner-specific actions
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
            if (!newPlannerState[expense.name]) {
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
          }
        });
      }

      // Process annual expenses (convert to monthly equivalent)
      if (state.data.annual) {
        Object.values(state.data.annual).flat().forEach(expense => {
          if (expense.name && expense.name.trim()) {
            if (!newPlannerState[expense.name]) {
              const annualAmount = parseFloat(expense.actual || expense.amount || 0);
              if (annualAmount > 0) {
                const monthlyAmount = annualAmount / 12;
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
          }
        });
      }

      dispatch({ type: ACTIONS.UPDATE_PLANNER, payload: newPlannerState });
    },

    updateExpenseStatus: (expenseId, expenseName, weekIndex, statusType, checked, _sourceModule) => {
      let updatedMonthly = { ...state.data.monthly };
      let updatedAnnual = { ...state.data.annual };
      let updatedPlanner = { ...state.data.plannerState };

      // Update planner state
      if (expenseName && updatedPlanner[expenseName]) {
        const plannerExpense = { ...updatedPlanner[expenseName] };
        if (!plannerExpense[statusType]) {
          plannerExpense[statusType] = Array(5).fill(false);
        }
        plannerExpense[statusType] = [...plannerExpense[statusType]];
        plannerExpense[statusType][weekIndex] = checked;
        updatedPlanner[expenseName] = plannerExpense;
      }

      // Update matching monthly and annual expenses
      if (expenseId) {
        Object.keys(updatedMonthly).forEach(categoryKey => {
          const categoryExpenses = updatedMonthly[categoryKey] || [];
          const expenseIndex = categoryExpenses.findIndex(exp => exp.id === expenseId);
          if (expenseIndex !== -1) {
            updatedMonthly[categoryKey][expenseIndex] = {
              ...categoryExpenses[expenseIndex],
              [statusType]: checked
            };
          }
        });

        Object.keys(updatedAnnual).forEach(categoryKey => {
          const categoryExpenses = updatedAnnual[categoryKey] || [];
          const expenseIndex = categoryExpenses.findIndex(exp => exp.id === expenseId);
          if (expenseIndex !== -1) {
            updatedAnnual[categoryKey][expenseIndex] = {
              ...categoryExpenses[expenseIndex],
              [statusType]: checked
            };
          }
        });
      }

      // Update all relevant data
      dispatch({
        type: ACTIONS.UPDATE_DATA, payload: {
          ...state.data,
          monthly: updatedMonthly,
          annual: updatedAnnual,
          plannerState: updatedPlanner
        }
      });
    },
  };

  // Enhanced calculations
  const calculations = {
    getTotalIncome: () => {
      if (!Array.isArray(state.data.income)) return 0;
      return state.data.income.reduce((total, source) => {
        return total + (parseFloat(source.amount) || 0);
      }, 0);
    },

    getTotalMonthlyExpenses: () => {
      let total = 0;
      Object.values(state.data.monthly || {}).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            total += parseFloat(expense.actual || expense.amount || 0);
          });
        }
      });
      return total;
    },

    getTotalAnnualExpenses: () => {
      let total = 0;
      Object.values(state.data.annual || {}).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(expense => {
            total += parseFloat(expense.actual || expense.amount || 0);
          });
        }
      });
      return total;
    },

    getMonthlyBalance: () => {
      const income = calculations.getTotalIncome();
      const monthlyExpenses = calculations.getTotalMonthlyExpenses();
      const annualMonthly = calculations.getTotalAnnualExpenses() / 12;
      return income - monthlyExpenses - annualMonthly;
    },

    getNetMonthlyIncome: () => {
      return calculations.getMonthlyBalance();
    },

    getAnnualSavings: () => {
      return calculations.getMonthlyBalance() * 12;
    },

    getCashFlow: () => {
      const totalIncome = calculations.getTotalIncome();
      const totalExpenses = calculations.getTotalMonthlyExpenses() + (calculations.getTotalAnnualExpenses() / 12);
      return {
        income: totalIncome,
        expenses: totalExpenses,
        netIncome: totalIncome - totalExpenses,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
      };
    },

    getSavingsRate: () => {
      const totalIncome = calculations.getTotalIncome();
      const totalExpenses = calculations.getTotalMonthlyExpenses() + (calculations.getTotalAnnualExpenses() / 12);
      if (totalIncome <= 0) return 0;
      return ((totalIncome - totalExpenses) / totalIncome) * 100;
    },

    getUpcomingExpenses: (daysAhead = 30) => {
      const upcoming = [];
      const today = new Date();

      const processExpenses = (collection, type) => {
        Object.entries(collection || {}).forEach(([categoryKey, expenses]) => {
          if (Array.isArray(expenses)) {
            expenses.forEach(expense => {
              if (expense.date && !expense.paid) {
                const dueDate = new Date(expense.date);
                const daysUntil = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
                if (daysUntil >= 0 && daysUntil <= daysAhead) {
                  upcoming.push({
                    ...expense,
                    category: categoryKey,
                    type,
                    daysUntil,
                    amount: parseAmount(expense.actual || expense.amount || 0)
                  });
                }
              }
            });
          }
        });
      };

      processExpenses(state.data.monthly, 'monthly');
      processExpenses(state.data.annual, 'annual');

      return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    },

    getOverdueExpenses: () => {
      const overdue = [];
      const today = new Date();

      // Check monthly expenses
      Object.entries(state.data.monthly || {}).forEach(([categoryKey, expenses]) => {
        expenses.forEach(expense => {
          if (expense.date && expense.name && !expense.paid) {
            const dueDate = new Date(expense.date);
            if (dueDate < today) {
              overdue.push({
                ...expense,
                category: categoryKey,
                type: 'monthly',
                daysOverdue: Math.ceil((today - dueDate) / (24 * 60 * 60 * 1000))
              });
            }
          }
        });
      });

      // Check annual expenses
      Object.entries(state.data.annual || {}).forEach(([categoryKey, expenses]) => {
        expenses.forEach(expense => {
          if (expense.date && expense.name && !expense.paid) {
            const dueDate = new Date(expense.date);
            if (dueDate < today) {
              overdue.push({
                ...expense,
                category: categoryKey,
                type: 'annual',
                daysOverdue: Math.ceil((today - dueDate) / (24 * 60 * 60 * 1000))
              });
            }
          }
        });
      });

      return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
    },

    getExpensesByStatus: (status = 'unpaid') => {
      const expenses = [];

      // Check monthly expenses
      Object.entries(state.data.monthly || {}).forEach(([categoryKey, categoryExpenses]) => {
        categoryExpenses.forEach(expense => {
          if (expense.name) {
            const isPaid = expense.paid || false;
            const isTransferred = expense.transferred || false;

            if (status === 'paid' && isPaid) {
              expenses.push({ ...expense, category: categoryKey, type: 'monthly' });
            } else if (status === 'transferred' && isTransferred) {
              expenses.push({ ...expense, category: categoryKey, type: 'monthly' });
            } else if (status === 'unpaid' && !isPaid) {
              expenses.push({ ...expense, category: categoryKey, type: 'monthly' });
            }
          }
        });
      });

      // Check annual expenses
      Object.entries(state.data.annual || {}).forEach(([categoryKey, categoryExpenses]) => {
        categoryExpenses.forEach(expense => {
          if (expense.name) {
            const isPaid = expense.paid || false;
            const isTransferred = expense.transferred || false;

            if (status === 'paid' && isPaid) {
              expenses.push({ ...expense, category: categoryKey, type: 'annual' });
            } else if (status === 'transferred' && isTransferred) {
              expenses.push({ ...expense, category: categoryKey, type: 'annual' });
            } else if (status === 'unpaid' && !isPaid) {
              expenses.push({ ...expense, category: categoryKey, type: 'annual' });
            }
          }
        });
      });

      return expenses;
    },

    getWeeklyPlannerTotals: () => {
      const weekTotals = [0, 0, 0, 0, 0]; // 5 weeks
      const weeklyIncome = calculations.getWeeklyIncome();
      const plannerData = state.data.plannerState || {};

      // Calculate expense totals for each week
      Object.values(plannerData).forEach(expense => {
        if (expense.weeks && Array.isArray(expense.weeks)) {
          expense.weeks.forEach((amount, weekIndex) => {
            if (weekIndex < 5) {
              weekTotals[weekIndex] += parseFloat(amount) || 0;
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
        expenseCount: Object.values(plannerData).filter(expense =>
          expense.weeks && expense.weeks[index] && parseFloat(expense.weeks[index]) > 0
        ).length
      }));
    },

    getPlannerExpensesByWeek: (weekIndex) => {
      if (weekIndex < 0 || weekIndex >= 5) return [];

      const expenses = [];
      const plannerData = state.data.plannerState || {};

      Object.entries(plannerData).forEach(([expenseName, expenseData]) => {
        if (expenseData.weeks && expenseData.weeks[weekIndex]) {
          const amount = parseFloat(expenseData.weeks[weekIndex]) || 0;
          if (amount > 0) {
            expenses.push({
              name: expenseName,
              amount: amount,
              paid: expenseData.paid ? expenseData.paid[weekIndex] : false,
              transferred: expenseData.transferred ? expenseData.transferred[weekIndex] : false,
              week: weekIndex + 1
            });
          }
        }
      });

      return expenses.sort((a, b) => b.amount - a.amount);
    },

    getTotalPlannedIncome: () => {
      return calculations.getWeeklyIncome().reduce((total, weekIncome) => total + weekIncome, 0);
    },

    getTotalPlannedExpenses: () => {
      let total = 0;
      const plannerData = state.data.plannerState || {};

      Object.values(plannerData).forEach(expense => {
        if (expense.weeks && Array.isArray(expense.weeks)) {
          expense.weeks.forEach(amount => {
            total += parseFloat(amount) || 0;
          });
        }
      });

      return total;
    },

    getPlannerBalance: () => {
      return calculations.getTotalPlannedIncome() - calculations.getTotalPlannedExpenses();
    },

    getCategoryTotal: (categoryKey, isAnnual = false) => {
      const data = isAnnual ? state.data.annual : state.data.monthly;
      const category = data?.[categoryKey] || [];
      return category.reduce((total, expense) => {
        return total + (parseFloat(expense.actual || expense.amount || 0));
      }, 0);
    },

    getMonthlyAnnualImpact: () => {
      return calculations.getTotalAnnualExpenses() / 12;
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

    getWeeklyIncome: () => {
      const totalIncome = calculations.getTotalIncome();
      return Array(5).fill(totalIncome / 4.33); // Average weeks per month
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
    },

    // Links calculations
    getTotalLinksCount: () => {
      return Object.values(state.data.links || {}).reduce((total, categoryLinks) => {
        return total + (Array.isArray(categoryLinks) ? categoryLinks.length : 0);
      }, 0);
    },

    getLinksCategoriesCount: () => {
      return Object.keys(state.data.linkCategories || {}).length;
    },

    getLargestLinkCategory: () => {
      let largest = { name: '', count: 0 };
      Object.entries(state.data.links || {}).forEach(([categoryKey, links]) => {
        const count = Array.isArray(links) ? links.length : 0;
        if (count > largest.count) {
          const categoryInfo = state.data.linkCategories?.[categoryKey];
          largest = {
            name: categoryInfo?.name || categoryKey,
            count
          };
        }
      });
      return largest;
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