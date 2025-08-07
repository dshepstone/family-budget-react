// src/pages/LinksPage.js
import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { sanitizeInput } from '../utils/validators';
import './LinksPage.css';

const LinksPage = () => {
  const { state, actions } = useBudget();
  const [activeCategory, setActiveCategory] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: '',
    tags: ''
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    icon: '🔗',
    color: '#3498db'
  });

  const linksData = state.data.links || {};
  const categories = state.data.linkCategories || {};

  // Suggested categories to help users get started
  const suggestedCategories = [
    { name: 'Banking & Finance', icon: '🏦', color: '#27ae60', examples: ['Online banking', 'Credit cards', 'Investment accounts'] },
    { name: 'Utilities', icon: '⚡', color: '#f39c12', examples: ['Electricity', 'Gas', 'Water', 'Internet'] },
    { name: 'Insurance', icon: '🛡️', color: '#e74c3c', examples: ['Health insurance', 'Auto insurance', 'Home insurance'] },
    { name: 'Government', icon: '🏛️', color: '#9b59b6', examples: ['Tax services', 'DMV', 'City services'] },
    { name: 'Shopping', icon: '🛒', color: '#f1c40f', examples: ['Amazon', 'Grocery stores', 'Clothing'] },
    { name: 'Work & Professional', icon: '💼', color: '#34495e', examples: ['Company portal', 'Professional tools', 'Training'] },
    { name: 'Health & Medical', icon: '⚕️', color: '#16a085', examples: ['Doctor portals', 'Pharmacy', 'Health records'] },
    { name: 'Education', icon: '📚', color: '#8e44ad', examples: ['Online courses', 'School portals', 'Research'] },
    { name: 'Home & Garden', icon: '🏡', color: '#2ecc71', examples: ['Home improvement', 'Gardening', 'Real estate'] },
    { name: 'Travel', icon: '✈️', color: '#3498db', examples: ['Airlines', 'Hotels', 'Travel planning'] }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' || field === 'description' || field === 'tags' ? sanitizeInput(value) : value
    }));
  };

  const handleCategoryInputChange = (field, value) => {
    setCategoryFormData(prev => ({
      ...prev,
      [field]: field === 'name' ? sanitizeInput(value) : value
    }));
  };

  const validateLink = (link) => {
    if (!link.name || !link.url || !link.category) return false;

    try {
      new URL(link.url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateLink(formData)) {
      alert('Please provide a valid name, URL, and category.');
      return;
    }

    const category = formData.category;
    const newLinksData = { ...linksData };

    if (!newLinksData[category]) {
      newLinksData[category] = [];
    }

    const linkItem = {
      ...formData,
      id: editingLink ? editingLink.id : Date.now().toString(),
      addedDate: editingLink ? editingLink.addedDate : new Date().toISOString(),
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
    };

    if (editingLink) {
      const linkIndex = newLinksData[category].findIndex(link => link.id === editingLink.id);
      if (linkIndex !== -1) {
        newLinksData[category][linkIndex] = linkItem;
      }
    } else {
      newLinksData[category].push(linkItem);
    }

    actions.updateLinks(newLinksData);
    resetForm();
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();

    if (!categoryFormData.name) {
      alert('Please provide a category name.');
      return;
    }

    const categoryKey = categoryFormData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCategories = {
      ...categories,
      [categoryKey]: {
        name: categoryFormData.name,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
        createdDate: new Date().toISOString()
      }
    };

    actions.updateData({
      ...state.data,
      linkCategories: newCategories
    });

    setCategoryFormData({ name: '', icon: '🔗', color: '#3498db' });
    setShowCategoryForm(false);
    setFormData(prev => ({ ...prev, category: categoryKey }));
    setShowAddForm(true);
  };

  const handleEdit = (category, link) => {
    setFormData({
      name: link.name || '',
      url: link.url || '',
      description: link.description || '',
      category: category,
      tags: link.tags ? link.tags.join(', ') : ''
    });
    setEditingLink({ ...link, category });
    setShowAddForm(true);
  };

  const handleDelete = (category, linkId) => {
    if (window.confirm('Are you sure you want to delete this link?')) {
      const newLinksData = { ...linksData };
      newLinksData[category] = newLinksData[category].filter(link => link.id !== linkId);
      actions.updateLinks(newLinksData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      category: '',
      tags: ''
    });
    setShowAddForm(false);
    setEditingLink(null);
  };

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredLinks = useMemo(() => {
    if (!searchTerm) return linksData;

    const filtered = {};
    Object.keys(linksData).forEach(category => {
      const categoryLinks = linksData[category].filter(link =>
        link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
      if (categoryLinks.length > 0) {
        filtered[category] = categoryLinks;
      }
    });
    return filtered;
  }, [linksData, searchTerm]);

  const stats = useMemo(() => {
    let totalLinks = 0;
    let totalCategories = Object.keys(linksData).length;
    let largestCategorySize = 0;

    Object.values(linksData).forEach(categoryLinks => {
      totalLinks += categoryLinks.length;
      largestCategorySize = Math.max(largestCategorySize, categoryLinks.length);
    });

    return {
      totalLinks,
      totalCategories,
      largestCategorySize: largestCategorySize || 0
    };
  }, [linksData]);

  const addSuggestedCategory = (suggested) => {
    setCategoryFormData({
      name: suggested.name,
      icon: suggested.icon,
      color: suggested.color
    });
    setShowCategoryForm(true);
  };

  const getCategoryInfo = (categoryKey) => {
    return categories[categoryKey] || {
      name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
      icon: '🔗',
      color: '#3498db'
    };
  };

  const exportLinks = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      links: linksData,
      categories: categories
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `my-links-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="links-page">
      {/* Header Section */}
      <div className="links-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">
              <span className="title-icon">🔗</span>
              My Links Hub
            </h1>
            <p className="page-description">
              Organize and access all your important websites in one place. From banking and utilities
              to shopping and work resources - keep everything at your fingertips.
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.totalLinks}</div>
              <div className="stat-label">Total Links</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalCategories}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="primary-actions">
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
            className="add-link-btn"
          >
            <span>+</span> Add New Link
          </Button>
          <Button
            variant="success"
            onClick={() => setShowCategoryForm(true)}
            className="add-category-btn"
          >
            <span>📁</span> New Category
          </Button>
        </div>

        <div className="secondary-actions">
          <div className="search-box">
            <Input
              type="text"
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <Button
            variant="outline"
            onClick={exportLinks}
            className="export-btn"
          >
            <span>📤</span> Export
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {stats.totalLinks === 0 && (
        <div className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">🚀</div>
            <h2>Let's Get Started!</h2>
            <p>
              Create your first category and add links to websites you visit frequently.
              Here are some popular categories to get you started:
            </p>

            <div className="suggested-categories">
              {suggestedCategories.slice(0, 6).map((suggested, index) => (
                <button
                  key={index}
                  className="suggested-category"
                  onClick={() => addSuggestedCategory(suggested)}
                  style={{ borderLeft: `4px solid ${suggested.color}` }}
                >
                  <span className="suggested-icon">{suggested.icon}</span>
                  <div className="suggested-info">
                    <div className="suggested-name">{suggested.name}</div>
                    <div className="suggested-examples">
                      {suggested.examples.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      {showCategoryForm && (
        <Card className="form-overlay">
          <div className="form-header">
            <h3>Create New Category</h3>
            <button
              className="close-btn"
              onClick={() => setShowCategoryForm(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCategorySubmit} className="category-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="category-name">Category Name *</label>
                <Input
                  id="category-name"
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => handleCategoryInputChange('name', e.target.value)}
                  placeholder="e.g., Banking & Finance"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category-icon">Icon</label>
                <div className="icon-input-group">
                  <Input
                    id="category-icon"
                    type="text"
                    value={categoryFormData.icon}
                    onChange={(e) => handleCategoryInputChange('icon', e.target.value)}
                    placeholder="🔗"
                    className="icon-input"
                  />
                  <div className="icon-preview">{categoryFormData.icon}</div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category-color">Color</label>
                <input
                  id="category-color"
                  type="color"
                  value={categoryFormData.color}
                  onChange={(e) => handleCategoryInputChange('color', e.target.value)}
                  className="color-input"
                />
              </div>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary">
                Create Category
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCategoryForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Add/Edit Link Form */}
      {showAddForm && (
        <Card className="form-overlay">
          <div className="form-header">
            <h3>{editingLink ? 'Edit Link' : 'Add New Link'}</h3>
            <button
              className="close-btn"
              onClick={resetForm}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="link-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="link-name">Link Name *</label>
                <Input
                  id="link-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Chase Online Banking"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="link-url">URL *</label>
                <Input
                  id="link-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="link-category">Category *</label>
                <select
                  id="link-category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select a category</option>
                  {Object.keys(categories).map(categoryKey => {
                    const category = getCategoryInfo(categoryKey);
                    return (
                      <option key={categoryKey} value={categoryKey}>
                        {category.icon} {category.name}
                      </option>
                    );
                  })}
                </select>
                {Object.keys(categories).length === 0 && (
                  <p className="form-help">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCategoryForm(true)}
                    >
                      Create your first category
                    </Button>
                  </p>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="link-description">Description</label>
                <textarea
                  id="link-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description or notes about this link..."
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="link-tags">Tags</label>
                <Input
                  id="link-tags"
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="e.g., checking, primary, mobile"
                />
                <p className="form-help">Separate tags with commas for easier searching</p>
              </div>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary">
                {editingLink ? 'Update Link' : 'Add Link'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Links Grid */}
      {stats.totalLinks > 0 && (
        <div className="links-grid">
          {Object.keys(filteredLinks).map(categoryKey => {
            const categoryLinks = filteredLinks[categoryKey];
            const categoryInfo = getCategoryInfo(categoryKey);
            const isExpanded = activeCategory === categoryKey;

            return (
              <Card key={categoryKey} className="category-card">
                <div
                  className="category-header"
                  style={{ borderLeft: `4px solid ${categoryInfo.color}` }}
                >
                  <button
                    className="category-toggle"
                    onClick={() => setActiveCategory(isExpanded ? null : categoryKey)}
                  >
                    <span
                      className="category-icon"
                      style={{ color: categoryInfo.color }}
                    >
                      {categoryInfo.icon}
                    </span>
                    <div className="category-info">
                      <span className="category-name">{categoryInfo.name}</span>
                      <span className="category-count">
                        {categoryLinks.length} {categoryLinks.length === 1 ? 'link' : 'links'}
                      </span>
                    </div>
                    <span className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  <div className="category-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, category: categoryKey }));
                        setShowAddForm(true);
                      }}
                    >
                      + Add
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="category-content">
                    <div className="links-list">
                      {categoryLinks.map(link => (
                        <div key={link.id} className="link-item">
                          <div className="link-main">
                            <button
                              className="link-button"
                              onClick={() => openLink(link.url)}
                              style={{ color: categoryInfo.color }}
                            >
                              <span className="link-icon">🔗</span>
                              <div className="link-info">
                                <div className="link-name">{link.name}</div>
                                <div className="link-url">{new URL(link.url).hostname}</div>
                              </div>
                            </button>

                            {link.description && (
                              <div className="link-description">{link.description}</div>
                            )}

                            {link.tags && link.tags.length > 0 && (
                              <div className="link-tags">
                                {link.tags.map(tag => (
                                  <span key={tag} className="tag">{tag}</span>
                                ))}
                              </div>
                            )}

                            <div className="link-metadata">
                              Added {new Date(link.addedDate).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="link-actions">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLink(link.url)}
                            >
                              Visit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(categoryKey, link)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(categoryKey, link.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Access Section */}
      {stats.totalLinks > 0 && (
        <Card className="quick-access-section">
          <h3>
            <span>⚡</span>
            Quick Access
          </h3>
          <div className="quick-links-grid">
            {Object.keys(linksData).map(categoryKey => {
              const categoryLinks = linksData[categoryKey] || [];
              const categoryInfo = getCategoryInfo(categoryKey);

              if (categoryLinks.length === 0) return null;

              return (
                <div key={categoryKey} className="quick-category">
                  <div className="quick-category-header">
                    <span
                      className="quick-icon"
                      style={{ color: categoryInfo.color }}
                    >
                      {categoryInfo.icon}
                    </span>
                    <span className="quick-name">{categoryInfo.name}</span>
                  </div>
                  <div className="quick-links">
                    {categoryLinks.slice(0, 4).map(link => (
                      <button
                        key={link.id}
                        className="quick-link"
                        onClick={() => openLink(link.url)}
                        title={`${link.name} - ${link.url}`}
                      >
                        {link.name}
                      </button>
                    ))}
                    {categoryLinks.length > 4 && (
                      <button
                        className="quick-more"
                        onClick={() => setActiveCategory(categoryKey)}
                      >
                        +{categoryLinks.length - 4} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LinksPage;