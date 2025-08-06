import { createDefaultData } from '../utils/validators';

// Action types for reducer
export const ACTIONS = {
  LOAD_DATA: 'LOAD_DATA',
  UPDATE_INCOME: 'UPDATE_INCOME',
  UPDATE_MONTHLY_EXPENSE: 'UPDATE_MONTHLY_EXPENSE',
  UPDATE_ANNUAL_EXPENSE: 'UPDATE_ANNUAL_EXPENSE',
  UPDATE_PLANNER: 'UPDATE_PLANNER',
  UPDATE_EXPENSE_STATUS: 'UPDATE_EXPENSE_STATUS',
  SYNC_WEEKLY_TO_MONTHLY: 'SYNC_WEEKLY_TO_MONTHLY',
  SYNC_WEEKLY_TO_ANNUAL: 'SYNC_WEEKLY_TO_ANNUAL',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  RESET_DATA: 'RESET_DATA',
  TOGGLE_THEME: 'TOGGLE_THEME'
};

// Helper to migrate old planner data format to new weekly status structure
export function migratePlannerDataToWeeklyStatus(plannerData = {}, weeklyStatus = {}) {
  const result = {};
  const keys = new Set([
    ...Object.keys(plannerData || {}),
    ...Object.keys(weeklyStatus || {})
  ]);

  keys.forEach(name => {
    const plannerEntry = plannerData[name] || {};
    const statusEntry = weeklyStatus[name] || {};

    let weeks;
    if (Array.isArray(plannerEntry)) {
      weeks = plannerEntry.slice();
    } else if (Array.isArray(plannerEntry.weeks)) {
      weeks = plannerEntry.weeks.slice();
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
      const { expenseId, expenseName, weekIndex, statusType, checked, sourceModule } = action.payload;

      let updatedMonthly = { ...state.data.monthly };
      let updatedAnnual = { ...state.data.annual };
      let updatedPlanner = { ...state.data.plannerState };

      // Update monthly expenses
      Object.keys(updatedMonthly).forEach(category => {
        updatedMonthly[category] = updatedMonthly[category].map(expense => {
          if (expense.id === expenseId || expense.name === expenseName) {
            return { ...expense, [statusType]: checked };
          }
          return expense;
        });
      });

      // Update annual expenses
      Object.keys(updatedAnnual).forEach(category => {
        updatedAnnual[category] = updatedAnnual[category].map(expense => {
          if (expense.id === expenseId || expense.name === expenseName) {
            return { ...expense, [statusType]: checked };
          }
          return expense;
        });
      });

      // Update planner state
      if (expenseName && updatedPlanner[expenseName]) {
        const plannerExpense = { ...updatedPlanner[expenseName] };
        if (!plannerExpense[statusType]) {
          plannerExpense[statusType] = Array(5).fill(false);
        }
        if (weekIndex !== undefined && weekIndex >= 0 && weekIndex < 5) {
          plannerExpense[statusType][weekIndex] = checked;
        }
        updatedPlanner[expenseName] = plannerExpense;
      }

      return {
        ...state,
        data: {
          ...state.data,
          monthly: updatedMonthly,
          annual: updatedAnnual,
          plannerState: updatedPlanner
        },
        lastUpdated: new Date().toISOString()
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

    default:
      return state;
  }
}

export default budgetReducer;
