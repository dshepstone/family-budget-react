// src/utils/validators.js
import { EXPENSE_CATEGORIES, ACCOUNT_TYPES } from './constants';

// Validate budget data structure
export function validateBudgetData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required top-level properties
  const requiredProps = ['income', 'monthly', 'annual', 'accounts'];
  for (const prop of requiredProps) {
    if (!data.hasOwnProperty(prop)) {
      console.warn(`Missing required property: ${prop}`);
      return false;
    }
  }

  // Validate income array
  if (!Array.isArray(data.income)) {
    console.warn('Income must be an array');
    return false;
  }

  // Validate monthly and annual expense objects
  if (typeof data.monthly !== 'object' || typeof data.annual !== 'object') {
    console.warn('Monthly and annual expenses must be objects');
    return false;
  }

  // Validate accounts object
  if (typeof data.accounts !== 'object') {
    console.warn('Accounts must be an object');
    return false;
  }

  return true;
}

// Validate individual expense item
export function validateExpenseItem(expense) {
  if (!expense || typeof expense !== 'object') {
    return false;
  }

  // Required fields
  if (!expense.name || typeof expense.name !== 'string') {
    return false;
  }

  // Amount validation (either amount, actual, or projected)
  const hasValidAmount = 
    (expense.amount !== undefined && !isNaN(parseFloat(expense.amount))) ||
    (expense.actual !== undefined && !isNaN(parseFloat(expense.actual))) ||
    (expense.projected !== undefined && !isNaN(parseFloat(expense.projected)));

  if (!hasValidAmount) {
    return false;
  }

  return true;
}

// Validate income item
export function validateIncomeItem(income) {
  if (!income || typeof income !== 'object') {
    return false;
  }

  if (!income.name || typeof income.name !== 'string') {
    return false;
  }

  if (income.amount === undefined || isNaN(parseFloat(income.amount))) {
    return false;
  }

  return true;
}

// Validate account data
export function validateAccount(account) {
  if (!account || typeof account !== 'object') {
    return false;
  }

  if (!account.name || typeof account.name !== 'string') {
    return false;
  }

  if (!account.type || !ACCOUNT_TYPES.includes(account.type)) {
    return false;
  }

  if (account.balance !== undefined && isNaN(parseFloat(account.balance))) {
    return false;
  }

  return true;
}

// Validate date string
export function validateDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Validate email format
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate currency amount
export function validateCurrency(amount) {
  if (amount === '' || amount === null || amount === undefined) {
    return true; // Allow empty values
  }
  
  const numericAmount = parseFloat(amount);
  return !isNaN(numericAmount) && numericAmount >= 0;
}

// Validate percentage
export function validatePercentage(percentage) {
  const num = parseFloat(percentage);
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Create default data structure
export function createDefaultData() {
  const defaultMonthly = {};
  const defaultAnnual = {};

  // Initialize monthly categories
  EXPENSE_CATEGORIES.MONTHLY.forEach(category => {
    defaultMonthly[category.key] = [];
  });

  // Initialize annual categories
  EXPENSE_CATEGORIES.ANNUAL.forEach(category => {
    defaultAnnual[category.key] = [];
  });

  return {
    income: [],
    monthly: defaultMonthly,
    annual: defaultAnnual,
    accounts: {
      balances: {},
      availableBalances: {},
      lastUpdated: {},
      transactions: {},
      accountInfo: {}
    },
    plannerState: {
      weeklyIncome: [0, 0, 0, 0],
      weeklyExpenses: [0, 0, 0, 0],
      monthlyTargets: {}
    },
    links: {},
    exportVersion: 1,
    preferences: {
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      theme: 'light',
      notifications: true
    }
  };
}

// Sanitize user input
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

// Validate import data
export function validateImportData(data) {
  try {
    // Check if it's a valid JSON structure
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Invalid data format' };
    }

    // Check for data property (exported format)
    const budgetData = data.data || data;

    // Validate the budget data structure
    if (!validateBudgetData(budgetData)) {
      return { valid: false, error: 'Invalid budget data structure' };
    }

    // Additional checks for import
    let totalExpenses = 0;
    
    // Count monthly expenses
    if (budgetData.monthly) {
      Object.values(budgetData.monthly).forEach(category => {
        if (Array.isArray(category)) {
          totalExpenses += category.length;
        }
      });
    }

    // Count annual expenses
    if (budgetData.annual) {
      Object.values(budgetData.annual).forEach(category => {
        if (Array.isArray(category)) {
          totalExpenses += category.length;
        }
      });
    }

    return { 
      valid: true, 
      data: budgetData,
      stats: {
        totalExpenses,
        hasIncome: Array.isArray(budgetData.income) && budgetData.income.length > 0,
        hasAccounts: budgetData.accounts && Object.keys(budgetData.accounts).length > 0
      }
    };

  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Input sanitization for expense names
export function sanitizeExpenseName(name) {
  return sanitizeInput(name)
    .replace(/[^a-zA-Z0-9\s\-_.,&()]/g, '')
    .substring(0, 100); // Limit length
}

// Validate frequency for annual expenses
export function validateFrequency(frequency) {
  const validFrequencies = ['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time'];
  return validFrequencies.includes(frequency);
}