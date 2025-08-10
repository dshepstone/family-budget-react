// src/components/QuickActions.js - Updated with proper button styling and Reset functionality
import React, { useRef, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import Button from './ui/Button';
import { useExportImport } from '../hooks/useExportImport';

const QuickActions = () => {
  const { actions } = useBudget();
  const { exportToJSON, importFromJSON } = useExportImport();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Apply button styling when component mounts
  useEffect(() => {
    const applyButtonStyling = () => {
      if (containerRef.current) {
        const buttons = containerRef.current.querySelectorAll('button, .btn, .action-btn');
        
        buttons.forEach(button => {
          const buttonText = button.textContent || '';
          const hasExportIcon = buttonText.includes('📁');
          const hasImportIcon = buttonText.includes('📂');
          const hasExportText = buttonText.toLowerCase().includes('export');
          const hasImportText = buttonText.toLowerCase().includes('import');
          const hasResetIcon = buttonText.includes('🔄');
          const hasResetText = buttonText.toLowerCase().includes('reset');
          
          // Style Export buttons
          if (hasExportIcon || hasExportText) {
            button.classList.add('js-export-btn');
            button.setAttribute('data-action', 'export');
            console.log('Applied export styling to:', buttonText);
          }
          
          // Style Import buttons
          if (hasImportIcon || hasImportText) {
            button.classList.add('js-import-btn');
            button.setAttribute('data-action', 'import');
            console.log('Applied import styling to:', buttonText);
          }

          // Style Reset buttons
          if (hasResetIcon || hasResetText) {
            button.classList.add('js-reset-btn');
            button.setAttribute('data-action', 'reset');
            console.log('Applied reset styling to:', buttonText);
          }
        });
      }
    };

    // Apply styling immediately
    applyButtonStyling();
    
    // Apply styling after a short delay to ensure all buttons are rendered
    const timeout = setTimeout(applyButtonStyling, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  const handleExport = async () => {
    try {
      await exportToJSON();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await importFromJSON(file);
        event.target.value = ''; // Reset file input
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please check the file format and try again.');
      }
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL your budget data!\n\n' +
      'This includes:\n' +
      '• All income entries\n' +
      '• All monthly and annual expenses\n' +
      '• All accounts and balances\n' +
      '• Weekly planner data\n' +
      '• All saved links and categories\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you absolutely sure you want to reset everything to default?'
    );

    if (confirmed) {
      const doubleConfirmed = window.confirm(
        '🚨 FINAL CONFIRMATION\n\n' +
        'You are about to lose ALL your data permanently!\n\n' +
        'Click OK to proceed with the reset, or Cancel to keep your data.'
      );

      if (doubleConfirmed) {
        try {
          // Call the existing resetData action from the context
          actions.resetData();
          
          // Show success message
          alert('✅ Application has been reset to default state.\n\nAll data has been cleared and you can start fresh.');
          
          // Navigate back to home page after reset
          actions.setCurrentPage('home');
          
        } catch (error) {
          console.error('Reset failed:', error);
          alert('❌ Reset failed. Please try again or refresh the page.');
        }
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddIncome = () => {
    actions.setCurrentPage('income');
  };

  const handleAddExpense = () => {
    actions.setCurrentPage('monthly');
  };

  const handleViewPlanner = () => {
    actions.setCurrentPage('planner');
  };

  return (
    <div className="quick-actions" ref={containerRef}>
      <style jsx>{`
        /* Inline styles to ensure styling is applied */
        .quick-actions .js-export-btn,
        .quick-actions [data-action="export"] {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          border: 2px solid #7c3aed !important;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
        }
        
        .quick-actions .js-export-btn:hover,
        .quick-actions [data-action="export"]:hover {
          background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4) !important;
        }
        
        .quick-actions .js-import-btn,
        .quick-actions [data-action="import"] {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          border: 2px solid #059669 !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3) !important;
        }
        
        .quick-actions .js-import-btn:hover,
        .quick-actions [data-action="import"]:hover {
          background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4) !important;
        }

        .quick-actions .js-reset-btn,
        .quick-actions [data-action="reset"] {
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          border: 2px solid #dc2626 !important;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
        }
        
        .quick-actions .js-reset-btn:hover,
        .quick-actions [data-action="reset"]:hover {
          background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4) !important;
        }

        /* Add warning pulse animation for reset button */
        .quick-actions .js-reset-btn,
        .quick-actions [data-action="reset"] {
          animation: subtle-pulse 3s ease-in-out infinite;
        }

        @keyframes subtle-pulse {
          0%, 100% { 
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          }
          50% { 
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
          }
        }
      `}</style>

      <div className="actions-header">
        <h3>Quick Actions</h3>
        <p>Common tasks and shortcuts</p>
      </div>

      <div className="actions-grid">
        <Button
          variant="primary"
          onClick={handleAddIncome}
          className="action-btn"
          data-action="add-income"
        >
          <span className="btn-icon">💵</span>
          Add Income
        </Button>

        <Button
          variant="primary"
          onClick={handleAddExpense}
          className="action-btn"
          data-action="add-expense"
        >
          <span className="btn-icon">💳</span>
          Add Expense
        </Button>

        <Button
          variant="secondary"
          onClick={handleViewPlanner}
          className="action-btn"
          data-action="view-planner"
        >
          <span className="btn-icon">📋</span>
          Weekly Planner
        </Button>

        <Button
          variant="secondary"
          onClick={handleExport}
          className="action-btn export-data-btn js-export-btn"
          data-action="export"
        >
          <span className="btn-icon">📁</span>
          Export Data
        </Button>

        <Button
          variant="secondary"
          onClick={handleImport}
          className="action-btn import-data-btn js-import-btn"
          data-action="import"
        >
          <span className="btn-icon">📂</span>
          Import Data
        </Button>

        <Button
          variant="secondary"
          onClick={actions.toggleCalculator}
          className="action-btn"
          data-action="calculator"
        >
          <span className="btn-icon">🧮</span>
          Calculator
        </Button>

        <Button
          variant="danger"
          onClick={handleReset}
          className="action-btn reset-data-btn js-reset-btn"
          data-action="reset"
          title="Reset all application data to default state"
        >
          <span className="btn-icon">🔄</span>
          Reset App
        </Button>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default QuickActions;