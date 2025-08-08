import { createDefaultData } from '../utils/validators';

// Action types for reducer
export const ACTIONS = {
  LOAD_DATA: 'LOAD_DATA',
  UPDATE_INCOME: 'UPDATE_INCOME',
  UPDATE_MONTHLY_EXPENSE: 'UPDATE_MONTHLY_EXPENSE',
  UPDATE_ANNUAL_EXPENSE: 'UPDATE_ANNUAL_EXPENSE',
  REMOVE_MONTHLY_EXPENSE: 'REMOVE_MONTHLY_EXPENSE',
  REMOVE_ANNUAL_EXPENSE: 'REMOVE_ANNUAL_EXPENSE',
  ADD_MONTHLY_CATEGORY: 'ADD_MONTHLY_CATEGORY',
  REMOVE_MONTHLY_CATEGORY: 'REMOVE_MONTHLY_CATEGORY',
  ADD_ANNUAL_CATEGORY: 'ADD_ANNUAL_CATEGORY',
  REMOVE_ANNUAL_CATEGORY: 'REMOVE_ANNUAL_CATEGORY',
  ADD_ACCOUNT: 'ADD_ACCOUNT',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  REMOVE_ACCOUNT: 'REMOVE_ACCOUNT',
  UPDATE_PLANNER: 'UPDATE_PLANNER',
  UPDATE_EXPENSE_STATUS: 'UPDATE_EXPENSE_STATUS',
  SYNC_WEEKLY_TO_MONTHLY: 'SYNC_WEEKLY_TO_MONTHLY',
  SYNC_WEEKLY_TO_ANNUAL: 'SYNC_WEEKLY_TO_ANNUAL',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  RESET_DATA: 'RESET_DATA',
  TOGGLE_THEME: 'TOGGLE_THEME',
  TOGGLE_CALCULATOR: 'TOGGLE_CALCULATOR'
};

// Helper to migrate old planner data format to new weekly status structure
export function migratePlannerDataToWeeklyStatus(plannerData = {}, weeklyStatus = {}) {
  const result = {};
  const specialKeys = ['weeklyIncome', 'weeklyExpenses', 'monthlyTargets'];

  specialKeys.forEach(key => {
    if (weeklyStatus[key] !== undefined) {
      result[key] = Array.isArray(weeklyStatus[key])
        ? weeklyStatus[key].slice()
        : { ...weeklyStatus[key] };
    } else if (plannerData[key] !== undefined) {
      result[key] = Array.isArray(plannerData[key])
        ? plannerData[key].slice()
        : { ...plannerData[key] };
    }
  });

  const keys = new Set([
    ...Object.keys(plannerData || {}).filter(k => !specialKeys.includes(k)),
    ...Object.keys(weeklyStatus || {}).filter(k => !specialKeys.includes(k))
  ]);

  keys.forEach(name => {
    const plannerEntry = plannerData[name] || {};
    const statusEntry = weeklyStatus[name] || {};

    let weeks;
    if (Array.isArray(plannerEntry)) {
      weeks = plannerEntry.slice();
    } else if (Array.isArray(plannerEntry.weeks)) {
      weeks = plannerEntry.weeks.slice();
    } else if (Array.isArray(statusEntry.weeks)) {
      weeks = statusEntry.weeks.slice();
    } else {
      weeks = Array(5).fill(0);
    }

    const transferred = Array.isArray(statusEntry.transferred)
      ? statusEntry.transferred.slice()
      : Array.isArray(plannerEntry.transferred)
        ? plannerEntry.transferred.slice()
        : Array(5).fill(false);

    const paid = Array.isArray(statusEntry.paid)
      ? statusEntry.paid.slice()
      : Array.isArray(plannerEntry.paid)
        ? plannerEntry.paid.slice()
        : Array(5).fill(false);

    result[name] = { weeks, transferred, paid };
  });

  return result;
}

// Reducer function
export function budgetReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_DATA: {
      const incoming = { ...action.payload };
      if (!Array.isArray(incoming.accounts)) {
        incoming.accounts = incoming.accounts && typeof incoming.accounts === 'object'
          ? Object.values(incoming.accounts)
          : [];
      }
      if (incoming.plannerData && !incoming.plannerState) {
        incoming.plannerState = incoming.plannerData;
        delete incoming.plannerData;
      }
      if (incoming.plannerState) {
        incoming.plannerState = migratePlannerDataToWeeklyStatus(
          incoming.plannerState,
          incoming.plannerState
        );
      }
      // FIX: Preserve the existing state for properties not in the payload
      return {
        ...state,
        data: { ...state.data, ...incoming },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.UPDATE_INCOME:
      return {
        ...state,
        data: {
          ...state.data,
          income: action.payload
        },
        lastUpdated: new Date().toISOString()
      };

    case ACTIONS.UPDATE_MONTHLY_EXPENSE: {
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
    }

    case ACTIONS.UPDATE_ANNUAL_EXPENSE: {
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
    }

    case ACTIONS.REMOVE_MONTHLY_EXPENSE: {
      const newMonthly = { ...state.data.monthly };
      if (newMonthly[action.category]) {
        newMonthly[action.category] = newMonthly[action.category].filter(
          (_, idx) => idx !== action.index
        );
      }
      return {
        ...state,
        data: {
          ...state.data,
          monthly: newMonthly
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.REMOVE_ANNUAL_EXPENSE: {
      const newAnnual = { ...state.data.annual };
      if (newAnnual[action.category]) {
        newAnnual[action.category] = newAnnual[action.category].filter(
          (_, idx) => idx !== action.index
        );
      }
      return {
        ...state,
        data: {
          ...state.data,
          annual: newAnnual
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.ADD_MONTHLY_CATEGORY: {
      const newMonthly = { ...state.data.monthly };
      if (!newMonthly[action.categoryKey]) {
        newMonthly[action.categoryKey] = [];
      }
      return {
        ...state,
        data: {
          ...state.data,
          monthly: newMonthly
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.REMOVE_MONTHLY_CATEGORY: {
      const newMonthly = { ...state.data.monthly };
      delete newMonthly[action.categoryKey];
      return {
        ...state,
        data: {
          ...state.data,
          monthly: newMonthly
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.ADD_ANNUAL_CATEGORY: {
      const newAnnual = { ...state.data.annual };
      if (!newAnnual[action.categoryKey]) {
        newAnnual[action.categoryKey] = [];
      }
      return {
        ...state,
        data: {
          ...state.data,
          annual: newAnnual
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.REMOVE_ANNUAL_CATEGORY: {
      const newAnnual = { ...state.data.annual };
      delete newAnnual[action.categoryKey];
      return {
        ...state,
        data: {
          ...state.data,
          annual: newAnnual
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.ADD_ACCOUNT: {
      const accounts = Array.isArray(state.data.accounts)
        ? [...state.data.accounts]
        : [];
      accounts.push(action.payload);
      return {
        ...state,
        data: { ...state.data, accounts },
        lastUpdated: new Date().toISOString(),
      };
    }

    case ACTIONS.UPDATE_ACCOUNT: {
      const accounts = Array.isArray(state.data.accounts)
        ? state.data.accounts.map((acc) =>
          acc.id === action.payload.id ? { ...acc, ...action.payload } : acc
        )
        : [];
      return {
        ...state,
        data: { ...state.data, accounts },
        lastUpdated: new Date().toISOString(),
      };
    }

    case ACTIONS.REMOVE_ACCOUNT: {
      const accounts = Array.isArray(state.data.accounts)
        ? state.data.accounts.filter((acc) => acc.id !== action.id)
        : [];
      return {
        ...state,
        data: { ...state.data, accounts },
        lastUpdated: new Date().toISOString(),
      };
    }

    case ACTIONS.UPDATE_PLANNER: {
      const mergedPlanner = migratePlannerDataToWeeklyStatus(
        state.data.plannerState,
        action.payload
      );
      return {
        ...state,
        data: {
          ...state.data,
          plannerState: mergedPlanner
        },
        lastUpdated: new Date().toISOString()
      };
    }

    case ACTIONS.UPDATE_EXPENSE_STATUS: {
      const { expenseId, expenseName, weekIndex, statusType, checked } = action.payload;

      let updatedMonthly = { ...state.data.monthly };
      let updatedAnnual = { ...state.data.annual };
      let updatedPlanner = { ...state.data.plannerState };

      let overallStatus = checked;

      if (expenseName) {
        let plannerExpense = updatedPlanner[expenseName];

        if (!plannerExpense) {
          let weeks = Array(5).fill(0);

          const findExpense = (collections) => {
            for (const expenses of Object.values(collections || {})) {
              const found = (expenses || []).find(
                (exp) => exp.id === expenseId || exp.name === expenseName
              );
              if (found) return found;
            }
            return null;
          };

          const monthlyExpense = findExpense(state.data.monthly);
          const annualExpense = findExpense(state.data.annual);

          if (monthlyExpense) {
            const monthlyAmount = parseFloat(monthlyExpense.actual || monthlyExpense.amount || 0);
            if (monthlyAmount > 0) {
              if (monthlyExpense.date) {
                const dueDateObj = new Date(monthlyExpense.date);
                let targetWeek = Math.ceil(dueDateObj.getDate() / 7) - 1;
                targetWeek = Math.max(0, Math.min(4, targetWeek));
                weeks[targetWeek] = monthlyAmount;
              } else {
                const weeklyAmount = monthlyAmount / 5;
                weeks = Array(5).fill(weeklyAmount);
              }
            }
          } else if (annualExpense) {
            const annualAmount = parseFloat(annualExpense.actual || annualExpense.amount || 0);
            const monthlyEquivalent = annualAmount / 12;
            if (monthlyEquivalent > 0) {
              if (annualExpense.date) {
                const dueDateObj = new Date(annualExpense.date);
                let targetWeek = Math.ceil(dueDateObj.getDate() / 7) - 1;
                targetWeek = Math.max(0, Math.min(4, targetWeek));
                weeks[targetWeek] = monthlyEquivalent;
              } else {
                const weeklyAmount = monthlyEquivalent / 5;
                weeks = Array(5).fill(weeklyAmount);
              }
            }
          }

          plannerExpense = {
            weeks,
            transferred: Array(5).fill(false),
            paid: Array(5).fill(false)
          };
        } else {
          plannerExpense = { ...plannerExpense };
        }

        if (!plannerExpense[statusType]) {
          plannerExpense[statusType] = Array(5).fill(false);
        }

        if (weekIndex !== undefined && weekIndex >= 0 && weekIndex < 5) {
          plannerExpense[statusType][weekIndex] = checked;
        }

        updatedPlanner[expenseName] = plannerExpense;
        overallStatus = plannerExpense[statusType].every(Boolean);
      }

      Object.keys(updatedMonthly).forEach((category) => {
        updatedMonthly[category] = updatedMonthly[category].map((expense) => {
          if (expense.id === expenseId || expense.name === expenseName) {
            return { ...expense, [statusType]: overallStatus };
          }
          return expense;
        });
      });

      Object.keys(updatedAnnual).forEach((category) => {
        updatedAnnual[category] = updatedAnnual[category].map((expense) => {
          if (expense.id === expenseId || expense.name === expenseName) {
            return { ...expense, [statusType]: overallStatus };
          }
          return expense;
        });
      });

      return {
        ...state,
        data: {
          ...state.data,
          monthly: updatedMonthly,
          annual: updatedAnnual,
          plannerState: updatedPlanner,
        },
        lastUpdated: new Date().toISOString(),
      };
    }

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

    case ACTIONS.TOGGLE_CALCULATOR:
      return {
        ...state,
        isCalculatorOpen: !state.isCalculatorOpen,
      };

    default:
      return state;
  }
}

export default budgetReducer;