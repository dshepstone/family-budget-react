// src/utils/constants.js

// Application version and metadata
export const APP_VERSION = '3.0.0';
export const APP_NAME = 'Family Budget';
export const STORAGE_KEY = 'family-budget-data';

// Expense categories configuration
export const EXPENSE_CATEGORIES = {
  MONTHLY: [
    { key: 'housing', name: '🏠 Housing', icon: '🏠' },
    { key: 'taxes', name: '💸 Taxes', icon: '💸' },
    { key: 'utilities', name: '⚡ Utilities', icon: '⚡' },
    { key: 'insurance', name: '🛡️ Insurance', icon: '🛡️' },
    { key: 'banking', name: '🏦 Banking', icon: '🏦' },
    { key: 'loans', name: '💳 Loans', icon: '💳' },
    { key: 'credit', name: '💰 Credit', icon: '💰' },
    { key: 'subscriptions', name: '📱 Subscriptions', icon: '📱' },
    { key: 'food', name: '🍔 Food', icon: '🍔' },
    { key: 'transportation', name: '🚗 Transportation', icon: '🚗' },
    { key: 'medical', name: '⚕️ Medical', icon: '⚕️' },
    { key: 'personal', name: '👤 Personal', icon: '👤' },
    { key: 'shopping', name: '🛒 Shopping', icon: '🛒' },
    { key: 'dog', name: '🐕 Pet Care', icon: '🐕' },
    { key: 'maintenance', name: '🔧 Maintenance', icon: '🔧' },
    { key: 'gifts', name: '🎁 Gifts', icon: '🎁' }
  ],
  ANNUAL: [
    { key: 'yearly-subs', name: '📅 Annual Subscriptions', icon: '📅' },
    { key: 'yearly-car', name: '🚙 Annual Car Expenses', icon: '🚙' },
    { key: 'yearly-bank', name: '🏛️ Annual Banking', icon: '🏛️' },
    { key: 'yearly-insurance', name: '🛡️ Annual Insurance', icon: '🛡️' },
    { key: 'yearly-taxes', name: '📊 Annual Taxes', icon: '📊' },
    { key: 'yearly-travel', name: '✈️ Travel & Vacation', icon: '✈️' },
    { key: 'yearly-education', name: '🎓 Education', icon: '🎓' },
    { key: 'yearly-professional', name: '💼 Professional Development', icon: '💼' }
  ]
};

// Account types
export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit',
  'investment',
  'retirement',
  'loan',
  'other'
];

// Account type display names
export const ACCOUNT_TYPE_NAMES = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  credit: 'Credit Card',
  investment: 'Investment Account',
  retirement: 'Retirement Account',
  loan: 'Loan Account',
  other: 'Other Account'
};

// Default account options for dropdowns
export const DEFAULT_ACCOUNTS = [
  'Main Checking',
  'Savings Account',
  'Emergency Fund',
  'Credit Card',
  'Cash',
  'Investment Account'
];

// Frequency options for annual expenses
export const FREQUENCY_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one-time', label: 'One-time' }
];

// Payment status options
export const PAYMENT_STATUS = [
  { value: 'unpaid', label: 'Unpaid', color: '#e74c3c' },
  { value: 'pending', label: 'Pending', color: '#f39c12' },
  { value: 'paid', label: 'Paid', color: '#27ae60' },
  { value: 'overdue', label: 'Overdue', color: '#c0392b' }
];

// Transfer status options
export const TRANSFER_STATUS = [
  { value: 'none', label: 'No Transfer' },
  { value: 'pending', label: 'Transfer Pending' },
  { value: 'completed', label: 'Transfer Completed' },
  { value: 'failed', label: 'Transfer Failed' }
];

// Currency options
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

// Date format options
export const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'MMM DD, YYYY', label: 'Jan 15, 2024' },
  { value: 'MMMM DD, YYYY', label: 'January 15, 2024' }
];

// Theme options
export const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'auto', label: 'Auto', icon: '🌓' }
];

// Budget calculation constants
export const CALCULATION_CONSTANTS = {
  MONTHS_PER_YEAR: 12,
  WEEKS_PER_MONTH: 4.33,
  DAYS_PER_WEEK: 7,
  DAYS_PER_MONTH: 30.44,
  DAYS_PER_YEAR: 365.25
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Due date warning thresholds (in days)
export const DUE_DATE_THRESHOLDS = {
  OVERDUE: 0,
  DUE_SOON: 7,
  UPCOMING: 30
};

// Chart color schemes
export const CHART_COLORS = {
  PRIMARY: [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
  ],
  EXPENSES: [
    '#e74c3c', '#c0392b', '#a93226', '#922b21', '#7b241c',
    '#641e16', '#58181a', '#4a1c1d', '#3b1f20', '#2d2223'
  ],
  INCOME: [
    '#2ecc71', '#27ae60', '#229954', '#1e8449', '#196f3d',
    '#145a32', '#0f4c26', '#0a3d1b', '#052e0f', '#001f04'
  ]
};

// Export formats
export const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', extension: 'json', mime: 'application/json' },
  { value: 'csv', label: 'CSV', extension: 'csv', mime: 'text/csv' },
  { value: 'pdf', label: 'PDF', extension: 'pdf', mime: 'application/pdf' },
  { value: 'excel', label: 'Excel', extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
];

// Validation rules
export const VALIDATION_RULES = {
  EXPENSE_NAME: {
    minLength: 1,
    maxLength: 100,
    required: true
  },
  AMOUNT: {
    min: 0,
    max: 999999999,
    required: false
  },
  ACCOUNT_NAME: {
    minLength: 1,
    maxLength: 50,
    required: true
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: false
  }
};

// Default links categories
export const DEFAULT_LINK_CATEGORIES = [
  { key: 'banking', name: '🏦 Banking & Finance', icon: '🏦' },
  { key: 'utilities', name: '⚡ Utilities', icon: '⚡' },
  { key: 'insurance', name: '🛡️ Insurance', icon: '🛡️' },
  { key: 'shopping', name: '🛒 Shopping', icon: '🛒' },
  { key: 'government', name: '🏛️ Government', icon: '🏛️' },
  { key: 'tools', name: '🔧 Budget Tools', icon: '🔧' }
];

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  PRINT: 'Ctrl+P',
  EXPORT: 'Ctrl+E',
  NEW_EXPENSE: 'Ctrl+N',
  SEARCH: 'Ctrl+F',
  TOGGLE_THEME: 'Ctrl+T'
};

// File size limits
export const FILE_SIZE_LIMITS = {
  IMPORT_JSON: 10 * 1024 * 1024, // 10MB
  IMPORT_CSV: 5 * 1024 * 1024,   // 5MB
  EXPORT_MAX: 50 * 1024 * 1024   // 50MB
};

// Local storage keys
export const STORAGE_KEYS = {
  BUDGET_DATA: 'family-budget-data',
  USER_PREFERENCES: 'family-budget-preferences',
  THEME: 'family-budget-theme',
  LAST_BACKUP: 'family-budget-last-backup'
};

// API endpoints (if using backend in future)
export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || '',
  BUDGET: '/api/budget',
  EXPORT: '/api/export',
  IMPORT: '/api/import',
  BACKUP: '/api/backup'
};

// Error messages
export const ERROR_MESSAGES = {
  INVALID_JSON: 'Invalid JSON file format',
  FILE_TOO_LARGE: 'File size exceeds limit',
  NETWORK_ERROR: 'Network connection error',
  SAVE_FAILED: 'Failed to save data',
  LOAD_FAILED: 'Failed to load data',
  EXPORT_FAILED: 'Export operation failed',
  IMPORT_FAILED: 'Import operation failed'
};

// Success messages
export const SUCCESS_MESSAGES = {
  DATA_SAVED: 'Data saved successfully',
  DATA_LOADED: 'Data loaded successfully',
  EXPORTED: 'Data exported successfully',
  IMPORTED: 'Data imported successfully',
  BACKUP_CREATED: 'Backup created successfully'
};