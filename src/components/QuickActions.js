// src/components/QuickActions.js
import React, { useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import Button from './ui/Button';
import { useExportImport } from '../hooks/useExportImport';

const QuickActions = () => {
  const { actions } = useBudget();
  const { exportToJSON, importFromJSON } = useExportImport();
  const fileInputRef = useRef(null);

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
    <div className="quick-actions">
      <div className="actions-header">
        <h3>Quick Actions</h3>
        <p>Common tasks and shortcuts</p>
      </div>
      
      <div className="actions-grid">
        <Button
          variant="primary"
          onClick={handleAddIncome}
          className="action-btn"
        >
          <span className="btn-icon">💵</span>
          Add Income
        </Button>

        <Button
          variant="primary"
          onClick={handleAddExpense}
          className="action-btn"
        >
          <span className="btn-icon">💳</span>
          Add Expense
        </Button>

        <Button
          variant="secondary"
          onClick={handleViewPlanner}
          className="action-btn"
        >
          <span className="btn-icon">📋</span>
          Weekly Planner
        </Button>

        <Button
          variant="success"
          onClick={handleExport}
          className="action-btn"
        >
          <span className="btn-icon">📁</span>
          Export Data
        </Button>

        <Button
          variant="secondary"
          onClick={handleImport}
          className="action-btn"
        >
          <span className="btn-icon">📂</span>
          Import Data
        </Button>

        <Button
          variant="outline"
          onClick={handlePrint}
          className="action-btn"
        >
          <span className="btn-icon">🖨️</span>
          Print Budget
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