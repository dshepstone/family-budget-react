// src/utils/formatters.js

// Format currency with proper locale and symbol
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  const numericAmount = parseFloat(amount) || 0;
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    // Fallback formatting
    return `$${numericAmount.toFixed(2)}`;
  }
}

// Parse amount from various input formats
export function parseAmount(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  // Handle string inputs with currency symbols and commas
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and spaces
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Format percentage
export function formatPercentage(value, decimals = 1) {
  const num = parseFloat(value) || 0;
  return `${num.toFixed(decimals)}%`;
}

// Format date for display
export function formatDate(date, format = 'MM/DD/YYYY') {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
    'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
    'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'MMM DD, YYYY': { month: 'short', day: 'numeric', year: 'numeric' },
    'MMMM DD, YYYY': { month: 'long', day: 'numeric', year: 'numeric' }
  };
  
  try {
    if (format === 'YYYY-MM-DD') {
      return dateObj.toISOString().split('T')[0];
    }
    
    const formatter = new Intl.DateTimeFormat('en-US', options[format] || options['MM/DD/YYYY']);
    return formatter.format(dateObj);
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}

// Format relative date (e.g., "3 days ago", "in 5 days")
export function formatRelativeDate(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffTime = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  
  return formatDate(date);
}

// Format time duration
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format account number (mask sensitive info)
export function formatAccountNumber(accountNumber, showLast = 4) {
  if (!accountNumber) return '';
  
  const str = accountNumber.toString();
  if (str.length <= showLast) return str;
  
  const masked = '*'.repeat(str.length - showLast);
  const visible = str.slice(-showLast);
  
  return `${masked}${visible}`;
}

// Format phone number
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if not 10 digits
}

// Capitalize first letter of each word
export function capitalize(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format category names from keys
export function formatCategoryName(categoryKey) {
  if (!categoryKey) return '';
  
  return categoryKey
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format large numbers with appropriate suffixes
export function formatLargeNumber(num, decimals = 1) {
  const number = parseFloat(num) || 0;
  
  if (Math.abs(number) >= 1000000) {
    return (number / 1000000).toFixed(decimals) + 'M';
  }
  
  if (Math.abs(number) >= 1000) {
    return (number / 1000).toFixed(decimals) + 'K';
  }
  
  return number.toFixed(decimals);
}

// Format input value for currency fields
export function formatCurrencyInput(value) {
  const numericValue = parseAmount(value);
  if (numericValue === 0) return '';
  return numericValue.toFixed(2);
}

// Format validation error messages
export function formatValidationError(field, error) {
  const fieldName = formatCategoryName(field);
  
  switch (error.type) {
    case 'required':
      return `${fieldName} is required`;
    case 'invalid':
      return `${fieldName} is invalid`;
    case 'min':
      return `${fieldName} must be at least ${error.min}`;
    case 'max':
      return `${fieldName} cannot exceed ${error.max}`;
    default:
      return `${fieldName} has an error`;
  }
}

// Format export filename with timestamp
export function formatExportFilename(baseName, extension = 'json') {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `${baseName}_${timestamp}.${extension}`;
}

// Format week number
export function formatWeekNumber(date) {
  const dateObj = new Date(date);
  const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Format status badge text
export function formatStatus(status) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'overdue':
      return 'Overdue';
    case 'upcoming':
      return 'Upcoming';
    default:
      return capitalize(status || 'Unknown');
  }
}

// Format frequency for display
export function formatFrequency(frequency) {
  switch (frequency) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'semi-annual':
      return 'Semi-Annual';
    case 'annual':
      return 'Annual';
    case 'one-time':
      return 'One-time';
    default:
      return capitalize(frequency || 'Unknown');
  }
}

// Format CSV data for export
export function formatCSVData(data, headers) {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header] || '';
      
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
      }
      
      return value;
    });
    
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}