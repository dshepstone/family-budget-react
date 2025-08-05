// src/pages/ImportExportPage.js
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
      accounts: Object.keys(state.data.accounts || {}).length
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
      accounts: Object.keys(state.data.accounts || {}).length,
      dataSize: JSON.stringify(state.data).length
    };
  };

  const stats = getDataStats();

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">📂 Data Management</h2>
        <p className="page-description">
          Import, export, and manage your budget data with comprehensive backup and restore options
        </p>
      </div>

      {/* Current Data Overview */}
      <Card title="📊 Current Data Overview" className="overview-card">
        <div className="data-stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.income}</div>
            <div className="stat-label">Income Sources</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.monthlyExpenses}</div>
            <div className="stat-label">Monthly Expenses</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.annualExpenses}</div>
            <div className="stat-label">Annual Expenses</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.categories}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.round(stats.dataSize / 1024)}</div>
            <div className="stat-label">KB Data Size</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{new Date(state.lastUpdated).toLocaleDateString()}</div>
            <div className="stat-label">Last Updated</div>
          </div>
        </div>
      </Card>

      {/* Export Options */}
      <Card title="📤 Export Data" className="export-card">
        <div className="export-section">
          <div className="export-options">
            <div className="export-group">
              <h4>JSON Export (Complete Backup)</h4>
              <p>Export all budget data in JSON format for complete backup and restore capabilities.</p>
              
              <div className="filename-input">
                <Input
                  type="text"
                  placeholder="Custom filename (optional)"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  helperText="Leave empty for auto-generated filename"
                />
              </div>
              
              <Button
                variant="primary"
                onClick={handleExportJSON}
                disabled={isProcessing}
              >
                {isProcessing ? 'Exporting...' : '📁 Export Complete Backup (JSON)'}
              </Button>
            </div>

            <div className="export-group">
              <h4>CSV Export (Spreadsheet Compatible)</h4>
              <p>Export specific data sections in CSV format for use in spreadsheet applications.</p>
              
              <div className="csv-options">
                <Button
                  variant="secondary"
                  onClick={() => handleExportCSV('income')}
                  disabled={isProcessing}
                >
                  💵 Export Income CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExportCSV('monthly')}
                  disabled={isProcessing}
                >
                  💳 Export Monthly Expenses CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExportCSV('annual')}
                  disabled={isProcessing}
                >
                  📅 Export Annual Expenses CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExportCSV('all')}
                  disabled={isProcessing}
                >
                  📊 Export Complete CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Import Options */}
      <Card title="📥 Import Data" className="import-card">
        <div className="import-section">
          <div className="import-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Important:</strong> Importing data will replace your current budget information. 
              Make sure to export a backup before importing new data.
            </div>
          </div>

          <div className="import-options">
            <div className="import-group">
              <h4>JSON Import (Complete Restore)</h4>
              <p>Import a complete budget backup from a JSON file exported from this application.</p>
              
              <Button
                variant="success"
                onClick={handleImportJSON}
                disabled={isProcessing}
              >
                {isProcessing ? 'Importing...' : '📂 Import Budget Data (JSON)'}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div className="import-instructions">
              <h5>Import Instructions:</h5>
              <ul>
                <li>Only JSON files exported from this application are supported</li>
                <li>The import will validate data integrity before proceeding</li>
                <li>You will see a confirmation dialog with import statistics</li>
                <li>All current data will be replaced with the imported data</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management Tools */}
      <Card title="🔧 Data Management Tools" className="tools-card">
        <div className="tools-section">
          <div className="tool-group">
            <h4>System Diagnostics</h4>
            <p>Analyze your current data structure and identify potential issues.</p>
            
            <Button
              variant="outline"
              onClick={handleDataDiagnosis}
              disabled={isProcessing}
            >
              🔍 Run Data Diagnosis
            </Button>
          </div>

          <div className="tool-group danger-zone">
            <h4>⚠️ Danger Zone</h4>
            <p>These actions are irreversible. Use with extreme caution.</p>
            
            <Button
              variant="danger"
              onClick={handleDataReset}
              disabled={isProcessing}
            >
              🗑️ Reset All Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Operation Results */}
      {lastOperation && (
        <Card 
          title={`${lastOperation.success ? '✅' : '❌'} Last Operation Result`} 
          className={`result-card ${lastOperation.success ? 'success' : 'error'}`}
        >
          <div className="operation-result">
            <div className="result-header">
              <div className="result-type">
                {lastOperation.type.charAt(0).toUpperCase() + lastOperation.type.slice(1)} Operation
              </div>
              <div className="result-timestamp">
                {lastOperation.timestamp}
              </div>
            </div>
            
            <div className="result-message">
              {lastOperation.message}
            </div>
            
            {lastOperation.stats && (
              <div className="result-stats">
                <h5>Operation Statistics:</h5>
                <div className="stats-grid">
                  {Object.entries(lastOperation.stats).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-key">{key}:</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Application Information */}
      <Card title="ℹ️ Application Information" className="info-card">
        <div className="app-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Application Version:</span>
              <span className="info-value">{APP_VERSION}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Data Format Version:</span>
              <span className="info-value">2.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Browser Storage:</span>
              <span className="info-value">Local Storage</span>
            </div>
            <div className="info-item">
              <span className="info-label">Backup Recommendation:</span>
              <span className="info-value">Weekly JSON Export</span>
            </div>
          </div>
          
          <div className="compatibility-info">
            <h5>File Compatibility:</h5>
            <ul>
              <li><strong>JSON Files:</strong> Full compatibility with all application features</li>
              <li><strong>CSV Files:</strong> Compatible with Excel, Google Sheets, and other spreadsheet applications</li>
              <li><strong>Legacy Support:</strong> Can import data from previous versions of the application</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImportExportPage;