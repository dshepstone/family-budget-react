// src/pages/ImportExportPage.js - Redesigned Layout
import React, { useState, useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useExportImport } from '../hooks/useExportImport';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { APP_VERSION, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';

const ImportExportPage = () => {
  const { state, actions } = useBudget();
  const { exportToJSON, importFromJSON, exportToCSV, getCurrentState } = useExportImport();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOperation, setLastOperation] = useState(null);
  const [customFilename, setCustomFilename] = useState('');
  const fileInputRef = useRef(null);

  const handleExportJSON = async () => {
    setIsProcessing(true);
    try {
      const result = await exportToJSON(customFilename);
      if (result.success && !result.cancelled) {
        setLastOperation({
          type: 'export',
          success: true,
          message: `Data exported successfully as ${result.filename}`,
          timestamp: new Date().toLocaleString()
        });
      }
    } catch (error) {
      setLastOperation({
        type: 'export',
        success: false,
        message: error.message,
        timestamp: new Date().toLocaleString()
      });
    }
    setIsProcessing(false);
  };

  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsProcessing(true);
      try {
        const result = await importFromJSON(file);
        if (result.success && !result.cancelled) {
          setLastOperation({
            type: 'import',
            success: true,
            message: `Data imported successfully from ${result.filename}`,
            stats: result.stats,
            timestamp: new Date().toLocaleString()
          });
        }
      } catch (error) {
        setLastOperation({
          type: 'import',
          success: false,
          message: error.message,
          timestamp: new Date().toLocaleString()
        });
      }
      setIsProcessing(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleExportCSV = async (dataType) => {
    setIsProcessing(true);
    try {
      const result = await exportToCSV(dataType);
      if (result.success) {
        setLastOperation({
          type: 'export',
          success: true,
          message: `${dataType} data exported successfully as ${result.filename}`,
          timestamp: new Date().toLocaleString()
        });
      }
    } catch (error) {
      setLastOperation({
        type: 'export',
        success: false,
        message: error.message,
        timestamp: new Date().toLocaleString()
      });
    }
    setIsProcessing(false);
  };

  const handleDataReset = () => {
    if (window.confirm('Are you sure you want to reset ALL budget data? This action cannot be undone.')) {
      actions.resetData();
      setLastOperation({
        type: 'reset',
        success: true,
        message: 'All budget data has been reset',
        timestamp: new Date().toLocaleString()
      });
    }
  };

  const handleDataDiagnosis = () => {
    const currentData = getCurrentState();
    const stats = {
      totalIncome: state.data.income?.length || 0,
      totalMonthlyExpenses: Object.values(state.data.monthly || {}).reduce((total, cat) => total + cat.length, 0),
      totalAnnualExpenses: Object.values(state.data.annual || {}).reduce((total, cat) => total + cat.length, 0),
      dataSize: JSON.stringify(currentData).length,
      lastUpdated: state.lastUpdated,
      accounts: Array.isArray(state.data.accounts) ? state.data.accounts.length : 0
    };

    setLastOperation({
      type: 'diagnosis',
      success: true,
      message: 'Data diagnosis completed',
      stats: stats,
      timestamp: new Date().toLocaleString()
    });
  };

  const getDataStats = () => {
    const monthlyExpenses = Object.values(state.data.monthly || {}).reduce((total, cat) => total + cat.length, 0);
    const annualExpenses = Object.values(state.data.annual || {}).reduce((total, cat) => total + cat.length, 0);

    return {
      income: state.data.income?.length || 0,
      monthlyExpenses,
      annualExpenses,
      totalExpenses: monthlyExpenses + annualExpenses,
      categories: Object.keys(state.data.monthly || {}).length + Object.keys(state.data.annual || {}).length,
      accounts: Array.isArray(state.data.accounts) ? state.data.accounts.length : 0,
      dataSize: JSON.stringify(state.data).length
    };
  };

  const stats = getDataStats();

  return (
    <div className="import-export-redesigned">
      <div className="page-header">
        <h2 className="page-title">📂 Data Management</h2>
        <p className="page-description">
          Import, export, and manage your budget data with comprehensive backup and restore options
        </p>
      </div>

      {/* Data Overview Dashboard */}
      <div className="data-overview-dashboard">
        <div className="overview-stats">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalExpenses}</div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-detail">{stats.monthlyExpenses} monthly • {stats.annualExpenses} annual</div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-number">{stats.income}</div>
              <div className="stat-label">Income Sources</div>
              <div className="stat-detail">Active revenue streams</div>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">🏷️</div>
            <div className="stat-content">
              <div className="stat-number">{stats.categories}</div>
              <div className="stat-label">Categories</div>
              <div className="stat-detail">Budget organization</div>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">💾</div>
            <div className="stat-content">
              <div className="stat-number">{Math.round(stats.dataSize / 1024)}</div>
              <div className="stat-label">KB Data Size</div>
              <div className="stat-detail">Storage footprint</div>
            </div>
          </div>
        </div>

        <div className="last-updated-info">
          <div className="update-indicator">
            <span className="update-dot"></span>
            <span className="update-text">
              Last updated: {new Date(state.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="main-actions-grid">

        {/* Export Section */}
        <div className="action-section export-section">
          <div className="section-header">
            <div className="section-icon export">📤</div>
            <div className="section-title">Export Data</div>
            <div className="section-subtitle">Backup your budget data</div>
          </div>

          <div className="primary-action-card">
            <div className="action-header">
              <div className="action-icon">🗂️</div>
              <div className="action-info">
                <h4>Complete Backup</h4>
                <p>Export all data as JSON for full backup</p>
              </div>
            </div>

            <div className="action-form">
              <Input
                type="text"
                placeholder="Custom filename (optional)"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="filename-input"
              />

              <Button
                variant="primary"
                onClick={handleExportJSON}
                disabled={isProcessing}
                className="primary-action-btn"
              >
                {isProcessing ? 'Exporting...' : 'Create Backup'}
              </Button>
            </div>
          </div>

          <div className="secondary-actions">
            <div className="secondary-header">
              <h5>📋 Spreadsheet Exports</h5>
              <p>Export data in CSV format for Excel/Sheets</p>
            </div>

            <div className="csv-export-grid">
              <Button
                variant="outline"
                onClick={() => handleExportCSV('income')}
                disabled={isProcessing}
                className="csv-btn"
              >
                <span className="btn-icon">💵</span>
                <span>Income</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExportCSV('monthly')}
                disabled={isProcessing}
                className="csv-btn"
              >
                <span className="btn-icon">📅</span>
                <span>Monthly</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExportCSV('annual')}
                disabled={isProcessing}
                className="csv-btn"
              >
                <span className="btn-icon">📆</span>
                <span>Annual</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExportCSV('all')}
                disabled={isProcessing}
                className="csv-btn featured"
              >
                <span className="btn-icon">📊</span>
                <span>Complete</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="action-section import-section">
          <div className="section-header">
            <div className="section-icon import">📥</div>
            <div className="section-title">Import Data</div>
            <div className="section-subtitle">Restore from backup</div>
          </div>

          <div className="warning-banner">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Data Replacement Warning</strong>
              <p>Importing will replace all current data. Export a backup first!</p>
            </div>
          </div>

          <div className="primary-action-card">
            <div className="action-header">
              <div className="action-icon">📂</div>
              <div className="action-info">
                <h4>Restore Backup</h4>
                <p>Import complete data from JSON file</p>
              </div>
            </div>

            <div className="action-form">
              <Button
                variant="success"
                onClick={handleImportJSON}
                disabled={isProcessing}
                className="primary-action-btn"
              >
                {isProcessing ? 'Importing...' : 'Select Backup File'}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="import-requirements">
            <h5>📋 Import Requirements</h5>
            <ul>
              <li>JSON files from this application only</li>
              <li>Data validation before import</li>
              <li>Confirmation dialog with statistics</li>
              <li>Complete data replacement</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Management Tools */}
      <div className="management-tools-grid">
        <Card className="diagnostic-card">
          <div className="tool-header">
            <div className="tool-icon">🔍</div>
            <div className="tool-info">
              <h4>System Diagnostics</h4>
              <p>Analyze data structure and identify issues</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleDataDiagnosis}
            disabled={isProcessing}
            className="diagnostic-btn"
          >
            Run Diagnosis
          </Button>
        </Card>

        <Card className="danger-card">
          <div className="tool-header">
            <div className="tool-icon">⚠️</div>
            <div className="tool-info">
              <h4>Reset Data</h4>
              <p>Permanently delete all budget data</p>
            </div>
          </div>

          <Button
            variant="danger"
            onClick={handleDataReset}
            disabled={isProcessing}
            className="danger-btn"
          >
            Reset All Data
          </Button>
        </Card>

        <Card className="info-card">
          <div className="tool-header">
            <div className="tool-icon">ℹ️</div>
            <div className="tool-info">
              <h4>App Information</h4>
              <p>Version {APP_VERSION} • Local Storage</p>
            </div>
          </div>

          <div className="app-details">
            <div className="detail-row">
              <span>Data Format:</span>
              <span>v2.0</span>
            </div>
            <div className="detail-row">
              <span>Backup Frequency:</span>
              <span>Weekly</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Operation Results */}
      {lastOperation && (
        <div className={`operation-result-banner ${lastOperation.success ? 'success' : 'error'}`}>
          <div className="result-content">
            <div className="result-icon">
              {lastOperation.success ? '✅' : '❌'}
            </div>

            <div className="result-info">
              <div className="result-title">
                {lastOperation.type.charAt(0).toUpperCase() + lastOperation.type.slice(1)}
                {lastOperation.success ? ' Completed' : ' Failed'}
              </div>
              <div className="result-message">
                {lastOperation.message}
              </div>
              {lastOperation.timestamp && (
                <div className="result-timestamp">
                  {lastOperation.timestamp}
                </div>
              )}
            </div>

            {lastOperation.stats && (
              <div className="result-stats">
                <div className="stats-summary">
                  {Object.entries(lastOperation.stats).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="stat-summary-item">
                      <span className="stat-key">{key}:</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLastOperation(null)}
            className="close-result-btn"
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportExportPage;