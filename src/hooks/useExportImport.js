// src/hooks/useExportImport.js
import { useBudget } from '../context/BudgetContext';
import { validateImportData } from '../utils/validators';
import { formatExportFilename } from '../utils/formatters';
import { APP_VERSION } from '../utils/constants';

export function useExportImport() {
  const { state, actions } = useBudget();

  // Export data to JSON
  const exportToJSON = async (customFilename) => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: APP_VERSION,
        appName: 'Family Budget React',
        data: state.data
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Generate filename
      const filename = customFilename || formatExportFilename('family-budget', 'json');
      
      // Check if browser supports File System Access API
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          return { success: true, filename: fileHandle.name };
        } catch (error) {
          if (error.name === 'AbortError') {
            return { success: false, cancelled: true };
          }
          throw error;
        }
      } else {
        // Fallback for browsers without File System Access API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, filename };
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  };

  // Import data from JSON file
  const importFromJSON = async (file) => {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Invalid file type. Please select a JSON file.');
      }

      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate the imported data
      const validation = validateImportData(importedData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Confirm import with user
      const confirmMessage = `Import budget data from ${file.name}?\n\n` +
        `Stats:\n` +
        `- Total Expenses: ${validation.stats.totalExpenses}\n` +
        `- Has Income Data: ${validation.stats.hasIncome ? 'Yes' : 'No'}\n` +
        `- Has Account Data: ${validation.stats.hasAccounts ? 'Yes' : 'No'}\n\n` +
        `This will replace your current budget data.`;

      if (!window.confirm(confirmMessage)) {
        return { success: false, cancelled: true };
      }

      // Load the data
      actions.loadData(validation.data);

      return { 
        success: true, 
        filename: file.name,
        stats: validation.stats
      };
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  };

  // Export to CSV format
  const exportToCSV = async (dataType = 'all') => {
    try {
      let csvData = [];
      let filename = '';

      switch (dataType) {
        case 'monthly':
          csvData = generateMonthlyCSV();
          filename = formatExportFilename('monthly-expenses', 'csv');
          break;
        case 'annual':
          csvData = generateAnnualCSV();
          filename = formatExportFilename('annual-expenses', 'csv');
          break;
        case 'income':
          csvData = generateIncomeCSV();
          filename = formatExportFilename('income', 'csv');
          break;
        default:
          csvData = generateCompleteCSV();
          filename = formatExportFilename('complete-budget', 'csv');
      }

      const blob = new Blob([csvData], { type: 'text/csv' });
      
      if ('showSaveFilePicker' in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'CSV files',
            accept: { 'text/csv': ['.csv'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        return { success: true, filename: fileHandle.name };
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, filename };
      }
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error(`CSV export failed: ${error.message}`);
    }
  };

  // Generate CSV for monthly expenses
  const generateMonthlyCSV = () => {
    const headers = ['Category', 'Name', 'Amount', 'Account', 'Date', 'Paid', 'Notes'];
    const rows = [headers.join(',')];

    Object.entries(state.data.monthly).forEach(([category, expenses]) => {
      expenses.forEach(expense => {
        const row = [
          category,
          expense.name || '',
          expense.actual || expense.amount || 0,
          expense.accountId || '',
          expense.date || '',
          expense.paid ? 'Yes' : 'No',
          expense.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  };

  // Generate CSV for annual expenses
  const generateAnnualCSV = () => {
    const headers = ['Category', 'Name', 'Amount', 'Account', 'Due Date', 'Frequency', 'Paid', 'Notes'];
    const rows = [headers.join(',')];

    Object.entries(state.data.annual).forEach(([category, expenses]) => {
      expenses.forEach(expense => {
        const row = [
          category,
          expense.name || '',
          expense.actual || expense.amount || 0,
          expense.accountId || '',
          expense.date || '',
          expense.frequency || 'annual',
          expense.paid ? 'Yes' : 'No',
          expense.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  };

  // Generate CSV for income
  const generateIncomeCSV = () => {
    const headers = ['Source', 'Amount', 'Frequency', 'Account', 'Notes'];
    const rows = [headers.join(',')];

    state.data.income.forEach(income => {
      const row = [
        income.name || '',
        income.amount || 0,
        income.frequency || 'monthly',
        income.account || '',
        income.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);
      
      rows.push(row.join(','));
    });

    return rows.join('\n');
  };

  // Generate complete CSV export
  const generateCompleteCSV = () => {
    const sections = [
      '# INCOME DATA',
      generateIncomeCSV(),
      '',
      '# MONTHLY EXPENSES',
      generateMonthlyCSV(),
      '',
      '# ANNUAL EXPENSES',
      generateAnnualCSV()
    ];

    return sections.join('\n');
  };

  // Get current application state as exportable object
  const getCurrentState = () => {
    return {
      exportDate: new Date().toISOString(),
      version: APP_VERSION,
      data: state.data
    };
  };

  return {
    exportToJSON,
    importFromJSON,
    exportToCSV,
    getCurrentState
  };
}