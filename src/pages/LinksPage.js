// src/pages/LinksPage.js
import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { DEFAULT_LINK_CATEGORIES } from '../utils/constants';
import { sanitizeInput, validateEmail } from '../utils/validators';

const LinksPage = () => {
  const { state, actions } = useBudget();
  const [activeCategory, setActiveCategory] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: DEFAULT_LINK_CATEGORIES[0].key
  });

  const linksData = state.data.links || {};

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' || field === 'description' ? sanitizeInput(value) : value
    }));
  };

  const validateLink = (link) => {
    if (!link.name || !link.url) return false;
    
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
      alert('Please provide a valid name and URL.');
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
      addedDate: editingLink ? editingLink.addedDate : new Date().toISOString()
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

  const handleEdit = (category, link) => {
    setFormData({
      name: link.name || '',
      url: link.url || '',
      description: link.description || '',
      category: category
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
      category: DEFAULT_LINK_CATEGORIES[0].key
    });
    setShowAddForm(false);
    setEditingLink(null);
  };

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openAllLinksInCategory = (category) => {
    const links = linksData[category] || [];
    if (links.length === 0) {
      alert('No links in this category.');
      return;
    }

    if (links.length > 5 && !window.confirm(`This will open ${links.length} links. Continue?`)) {
      return;
    }

    links.forEach(link => openLink(link.url));
  };

  const exportLinks = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      links: linksData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-links-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryStats = () => {
    const stats = {};
    let totalLinks = 0;

    DEFAULT_LINK_CATEGORIES.forEach(category => {
      const categoryLinks = linksData[category.key] || [];
      stats[category.key] = categoryLinks.length;
      totalLinks += categoryLinks.length;
    });

    return { ...stats, total: totalLinks };
  };

  const stats = getCategoryStats();

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">🔗 Useful Links</h2>
        <p className="page-description">
          Organize and manage important financial and utility links for quick access
        </p>
      </div>

      {/* Page Actions */}
      <div className="page-actions">
        <Button
          variant="success"
          onClick={() => setShowAddForm(true)}
        >
          + Add New Link
        </Button>
        <Button
          variant="outline"
          onClick={exportLinks}
        >
          📁 Export Links
        </Button>
      </div>

      {/* Links Summary */}
      <Card title="Links Summary" className="summary-card">
        <div className="links-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Links</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Object.keys(linksData).length}</div>
              <div className="stat-label">Active Categories</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {Math.max(...Object.values(stats).filter(v => typeof v === 'number' && v !== stats.total))}
              </div>
              <div className="stat-label">Largest Category</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Add/Edit Link Form */}
      {showAddForm && (
        <Card 
          title={editingLink ? 'Edit Link' : 'Add New Link'}
          className="form-card"
        >
          <form onSubmit={handleSubmit} className="link-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="link-name">Link Name *</label>
                <Input
                  id="link-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Bank of America Login"
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
                <label htmlFor="link-category">Category</label>
                <select
                  id="link-category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="form-select"
                >
                  {DEFAULT_LINK_CATEGORIES.map(category => (
                    <option key={category.key} value={category.key}>
                      {category.name}
                    </option>
                  ))}
                </select>
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

      {/* Links Categories */}
      <div className="links-section">
        {DEFAULT_LINK_CATEGORIES.map(category => {
          const categoryLinks = linksData[category.key] || [];
          const isExpanded = activeCategory === category.key;

          return (
            <Card key={category.key} className="category-card">
              <div className="category-header">
                <div className="category-info">
                  <button
                    className="category-toggle"
                    onClick={() => setActiveCategory(isExpanded ? null : category.key)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">({categoryLinks.length})</span>
                    <span className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                </div>
                
                <div className="category-actions">
                  {categoryLinks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAllLinksInCategory(category.key)}
                    >
                      Open All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category: category.key }));
                      setShowAddForm(true);
                    }}
                  >
                    + Add Link
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="category-content">
                  {categoryLinks.length === 0 ? (
                    <div className="empty-category">
                      <p>No links in this category yet.</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category: category.key }));
                          setShowAddForm(true);
                        }}
                      >
                        Add First Link
                      </Button>
                    </div>
                  ) : (
                    <div className="links-list">
                      {categoryLinks.map(link => (
                        <div key={link.id} className="link-item">
                          <div className="link-content">
                            <div className="link-main">
                              <div className="link-name">
                                <button
                                  className="link-button"
                                  onClick={() => openLink(link.url)}
                                >
                                  🔗 {link.name}
                                </button>
                              </div>
                              <div className="link-url">
                                {link.url}
                              </div>
                              {link.description && (
                                <div className="link-description">
                                  {link.description}
                                </div>
                              )}
                              <div className="link-metadata">
                                Added: {new Date(link.addedDate).toLocaleDateString()}
                              </div>
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
                              onClick={() => handleEdit(category.key, link)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(category.key, link.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Access */}
      {stats.total > 0 && (
        <Card title="🚀 Quick Access" className="quick-access-card">
          <div className="quick-access-grid">
            {DEFAULT_LINK_CATEGORIES.map(category => {
              const categoryLinks = linksData[category.key] || [];
              if (categoryLinks.length === 0) return null;

              return (
                <div key={category.key} className="quick-access-category">
                  <div className="quick-category-header">
                    <span className="quick-category-icon">{category.icon}</span>
                    <span className="quick-category-name">{category.name}</span>
                  </div>
                  <div className="quick-links">
                    {categoryLinks.slice(0, 3).map(link => (
                      <button
                        key={link.id}
                        className="quick-link-btn"
                        onClick={() => openLink(link.url)}
                        title={link.description || link.url}
                      >
                        {link.name}
                      </button>
                    ))}
                    {categoryLinks.length > 3 && (
                      <button
                        className="quick-link-more"
                        onClick={() => setActiveCategory(category.key)}
                      >
                        +{categoryLinks.length - 3} more
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