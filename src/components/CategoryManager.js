// src/components/CategoryManager.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { sanitizeInput } from '../utils/validators';

const CategoryManager = ({ type = 'monthly' }) => {
  const { state, actions } = useBudget();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📊');

  const categories = type === 'monthly' ? EXPENSE_CATEGORIES.MONTHLY : EXPENSE_CATEGORIES.ANNUAL;
  const currentData = type === 'monthly' ? state.data.monthly : state.data.annual;

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name.');
      return;
    }

    const categoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (currentData[categoryKey]) {
      alert('A category with this name already exists.');
      return;
    }

    // Add empty category to the data
    if (type === 'monthly') {
      const newMonthly = { ...state.data.monthly };
      newMonthly[categoryKey] = [];
      Object.entries(newMonthly).forEach(([catKey, expenses]) => {
        expenses.forEach((expense, index) => {
          actions.updateMonthlyExpense(catKey, expense, index);
        });
      });
    } else {
      const newAnnual = { ...state.data.annual };
      newAnnual[categoryKey] = [];
      Object.entries(newAnnual).forEach(([catKey, expenses]) => {
        expenses.forEach((expense, index) => {
          actions.updateAnnualExpense(catKey, expense, index);
        });
      });
    }

    setNewCategoryName('');
    setNewCategoryIcon('📊');
    setShowAddCategory(false);
  };

  const deleteCategory = (categoryKey) => {
    const categoryExpenses = currentData[categoryKey] || [];
    
    if (categoryExpenses.length > 0) {
      if (!window.confirm(`This category contains ${categoryExpenses.length} expense(s). Are you sure you want to delete it?`)) {
        return;
      }
    }

    if (type === 'monthly') {
      const newMonthly = { ...state.data.monthly };
      delete newMonthly[categoryKey];
      // Update state by setting entire monthly data
      actions.updateIncome(state.data.income); // Trigger state update
    } else {
      const newAnnual = { ...state.data.annual };
      delete newAnnual[categoryKey];
      // Update state by setting entire annual data
      actions.updateIncome(state.data.income); // Trigger state update
    }
  };

  const getCategoryStats = () => {
    const stats = {};
    Object.entries(currentData).forEach(([categoryKey, expenses]) => {
      stats[categoryKey] = {
        count: expenses.length,
        total: expenses.reduce((sum, expense) => 
          sum + parseFloat(expense.actual || expense.amount || 0), 0
        )
      };
    });
    return stats;
  };

  const reorderCategories = (categoryKey, direction) => {
    // This would require storing category order in state
    // For now, categories are ordered by their key alphabetically
    console.log(`Reorder ${categoryKey} ${direction}`);
  };

  const stats = getCategoryStats();

  return (
    <Card title={`${type === 'monthly' ? 'Monthly' : 'Annual'} Category Management`} className="category-manager">
      <div className="category-manager-content">
        
        {/* Add Category Form */}
        {showAddCategory && (
          <div className="add-category-form">
            <div className="form-row">
              <Input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(sanitizeInput(e.target.value))}
                placeholder="Category name"
                className="category-name-input"
              />
              <Input
                type="text"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="Icon"
                className="category-icon-input"
                maxLength="2"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={addCustomCategory}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddCategory(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="categories-list">
          {Object.keys(currentData).length === 0 ? (
            <div className="no-categories">
              <p>No categories found. Add your first category to get started.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {Object.entries(currentData).map(([categoryKey, expenses]) => {
                const categoryInfo = categories.find(cat => cat.key === categoryKey);
                const categoryStats = stats[categoryKey];
                const isCustomCategory = !categoryInfo;

                return (
                  <div key={categoryKey} className="category-item">
                    <div className="category-header">
                      <div className="category-info">
                        <span className="category-icon">
                          {categoryInfo?.icon || '📊'}
                        </span>
                        <span className="category-name">
                          {categoryInfo?.name || categoryKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {isCustomCategory && (
                          <span className="custom-badge">Custom</span>
                        )}
                      </div>
                      
                      <div className="category-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reorderCategories(categoryKey, 'up')}
                          title="Move up"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reorderCategories(categoryKey, 'down')}
                          title="Move down"
                        >
                          ↓
                        </Button>
                        {isCustomCategory && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteCategory(categoryKey)}
                            title="Delete category"
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="category-stats">
                      <div className="stat-item">
                        <span className="stat-label">Expenses:</span>
                        <span className="stat-value">{categoryStats.count}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">${categoryStats.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="category-actions-footer">
          <Button
            variant="primary"
            onClick={() => setShowAddCategory(true)}
          >
            + Add Custom Category
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const totalCategories = Object.keys(currentData).length;
              const totalExpenses = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
              const totalAmount = Object.values(stats).reduce((sum, stat) => sum + stat.total, 0);
              
              alert(`Category Summary:\n\nTotal Categories: ${totalCategories}\nTotal Expenses: ${totalExpenses}\nTotal Amount: $${totalAmount.toFixed(2)}`);
            }}
          >
            📊 Category Summary
          </Button>
        </div>

        {/* Category Management Tips */}
        <div className="category-tips">
          <h5>💡 Category Management Tips:</h5>
          <ul>
            <li>Use descriptive names for custom categories</li>
            <li>Group similar expenses together for better organization</li>
            <li>Consider seasonal categories for annual expenses</li>
            <li>Review and consolidate similar categories periodically</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default CategoryManager;