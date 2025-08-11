// src/pages/LinksPage.js
import React, { useState, useMemo, useEffect } from 'react';
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
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

  // Define default categories FIRST, before any hooks that use it
  const defaultCategories = [
    { name: 'Banking & Finance', icon: '🏦', color: '#27ae60', examples: ['Online banking', 'Credit cards', 'Investment accounts'] },
    { name: 'Utilities', icon: '⚡', color: '#f39c12', examples: ['Electricity', 'Gas', 'Water', 'Internet'] },
    { name: 'Insurance', icon: '🛡️', color: '#e74c3c', examples: ['Health insurance', 'Auto insurance', 'Home insurance'] },
    { name: 'Government', icon: '🏛️', color: '#9b59b6', examples: ['Tax services', 'DMV', 'City services'] },
    { name: 'Shopping', icon: '🛒', color: '#f1c40f', examples: ['Amazon', 'Grocery stores', 'Clothing'] },
    { name: 'Work & Professional', icon: '💼', color: '#34495e', examples: ['Company portal', 'Professional tools', 'Training'] },
    { name: 'Health & Medical', icon: '⚕️', color: '#16a085', examples: ['Doctor portals', 'Pharmacy', 'Health records'] },
    { name: 'Education', icon: '📚', color: '#8e44ad', examples: ['Online courses', 'School portals', 'Research'] },
    { name: 'Home & Garden', icon: '🏡', color: '#2ecc71', examples: ['Home improvement', 'Gardening', 'Real estate'] },
    { name: 'Travel', icon: '✈️', color: '#3498db', examples: ['Airlines', 'Hotels', 'Travel planning'] },
    { name: 'Entertainment', icon: '🎬', color: '#e67e22', examples: ['Streaming services', 'Gaming', 'Music'] },
    { name: 'Social Media', icon: '📱', color: '#9b59b6', examples: ['Facebook', 'Twitter', 'Instagram', 'LinkedIn'] },
    { name: 'News & Media', icon: '📰', color: '#34495e', examples: ['News websites', 'Magazines', 'Blogs'] },
    { name: 'Technology', icon: '💻', color: '#3498db', examples: ['Software tools', 'Tech news', 'Cloud services'] },
    { name: 'Food & Dining', icon: '🍕', color: '#e74c3c', examples: ['Food delivery', 'Restaurants', 'Recipes'] },
    { name: 'Fitness & Sports', icon: '🏃', color: '#27ae60', examples: ['Gym memberships', 'Sports news', 'Fitness apps'] },
    { name: 'Hobbies', icon: '🎨', color: '#f39c12', examples: ['Crafts', 'Photography', 'Music instruments'] },
    { name: 'Reference', icon: '📚', color: '#8e44ad', examples: ['Dictionaries', 'Wikipedia', 'Research tools'] }
  ];

  // Suggested categories to help users get started (same as defaults)
  const suggestedCategories = defaultCategories;

  const linksData = state.data.links || {};
  const categories = state.data.linkCategories || {};

  // Helper: normalize to https and add www for bare domains
  const normalizeUrl = (val) => {
    if (!val) return '';
    let v = String(val).trim();
    // strip spaces inside the URL field only
    v = v.replace(/\s+/g, '');
    
    // already has a scheme -> leave it alone
    if (/^https?:\/\//i.test(v)) return v;
    
    // if it's a bare domain like example.com, try www.
    const host = v.split('/')[0];
    const isBareDomain = host.split('.').length === 2; // e.g., example.com
    
    return isBareDomain ? `https://www.${v}` : `https://${v}`;
  };

  // Keep spaces & punctuation; just strip control chars and angle brackets
  const softSanitize = (s) => 
    typeof s === 'string' 
      ? s.replace(/[\u0000-\u001F\u007F]/g, '').replace(/[<>]/g, '') 
      : s;

  // Normalize legacy data structure - convert old format to new format
  const normalizedLinksData = useMemo(() => {
    const normalized = {};
    
    // Handle both array format (legacy) and object format (current)
    if (Array.isArray(linksData)) {
      // Convert array format to object format
      linksData.forEach(link => {
        let categoryKey = 'uncategorized';
        
        if (link.categoryId) {
          // Map legacy categoryId to new category keys
          const categoryMap = {
            'lc1': 'banking_finance',
            'lc2': 'utilities',
            'lc3': 'insurance'
          };
          categoryKey = categoryMap[link.categoryId] || 'uncategorized';
        } else if (link.category) {
          categoryKey = link.category;
        }
        
        if (!normalized[categoryKey]) {
          normalized[categoryKey] = [];
        }
        
        normalized[categoryKey].push({
          id: link.id || Date.now().toString(),
          name: link.title || link.name || 'Untitled',
          url: link.url || '',
          description: link.description || '',
          tags: link.tags || [],
          addedDate: link.addedDate || new Date().toISOString()
        });
      });
    } else if (typeof linksData === 'object') {
      // Handle numeric keys (another legacy format)
      const linkArray = Object.values(linksData);
      if (linkArray.length > 0 && linkArray[0].categoryId) {
        linkArray.forEach(link => {
          let categoryKey = 'uncategorized';
          
          if (link.categoryId) {
            const categoryMap = {
              'lc1': 'banking_finance',
              'lc2': 'utilities', 
              'lc3': 'insurance'
            };
            categoryKey = categoryMap[link.categoryId] || 'uncategorized';
          } else if (link.category) {
            categoryKey = link.category;
          }
          
          if (!normalized[categoryKey]) {
            normalized[categoryKey] = [];
          }
          
          normalized[categoryKey].push({
            id: link.id || Date.now().toString(),
            name: link.title || link.name || 'Untitled',
            url: link.url || '',
            description: link.description || '',
            tags: link.tags || [],
            addedDate: link.addedDate || new Date().toISOString()
          });
        });
      } else {
        // Already in correct format
        Object.keys(linksData).forEach(categoryKey => {
          if (Array.isArray(linksData[categoryKey])) {
            normalized[categoryKey] = linksData[categoryKey];
          }
        });
      }
    }
    
    return normalized;
  }, [linksData]);

  // Helper function to safely get hostname from URL
  const getHostnameFromUrl = (url) => {
    if (!url || typeof url !== 'string') {
      return 'Invalid URL';
    }
    
    try {
      // Add protocol if missing
      let processedUrl = url;
      if (!url.match(/^https?:\/\//)) {
        processedUrl = 'https://' + url;
      }
      
      const urlObj = new URL(processedUrl);
      return urlObj.hostname;
    } catch (error) {
      console.warn('Invalid URL detected:', url, error);
      return 'Invalid URL';
    }
  };

  // Safe openLink function with better error handling
  const openLink = (url) => {
    if (!url || typeof url !== 'string') {
      alert('Invalid URL');
      return;
    }
    
    try {
      let processedUrl = url.trim();
      
      // Add protocol if missing
      if (!processedUrl.match(/^https?:\/\//)) {
        processedUrl = 'https://' + processedUrl;
      }
      
      // Validate URL before opening
      new URL(processedUrl);
      
      // Open in new tab with security attributes
      const newWindow = window.open(processedUrl, '_blank', 'noopener,noreferrer');
      
      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        alert('Popup blocked. Please allow popups for this site or manually visit: ' + processedUrl);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      alert('Invalid URL: ' + url);
    }
  };

  // Handle backdrop click to close modals
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (showAddForm) {
        resetForm();
        setShowCategoryDropdown(false);
      }
      if (showCategoryForm) {
        setShowCategoryForm(false);
        setCategoryFormData({ name: '', icon: '🔗', color: '#3498db' });
      }
    }
  };

  // Create default categories for existing links (safer implementation)
  useEffect(() => {
    if (Object.keys(normalizedLinksData).length > 0) {
      const updatedCategories = { ...categories };
      let shouldUpdate = false;
      
      // Auto-create categories for existing links
      Object.keys(normalizedLinksData).forEach(categoryKey => {
        if (!updatedCategories[categoryKey]) {
          const defaultCategory = defaultCategories.find(cat => 
            cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === categoryKey
          );
          
          if (defaultCategory) {
            updatedCategories[categoryKey] = {
              name: defaultCategory.name,
              icon: defaultCategory.icon,
              color: defaultCategory.color,
              createdDate: new Date().toISOString()
            };
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        // Only update categories, preserve existing links
        actions.updateData({
          ...state.data,
          links: normalizedLinksData, // Preserve current links
          linkCategories: updatedCategories
        });
      }
    }
  }, [normalizedLinksData, categories, defaultCategories, actions, state.data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCategoryDropdown && !event.target.closest('.custom-select-wrapper')) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'name' || field === 'description' || field === 'tags' 
        ? softSanitize(value) // preserves spaces
        : value
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
    
    // Use the normalized URL for validation
    const normalizedUrl = normalizeUrl(link.url);
    
    try {
      new URL(normalizedUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Debug: Log the form data to see what's being submitted
    console.log('Form data being submitted:', formData);

    if (!validateLink(formData)) {
      alert('Please provide a valid name, URL, and category.');
      return;
    }

    const category = formData.category;
    const newLinksData = { ...normalizedLinksData };

    if (!newLinksData[category]) {
      newLinksData[category] = [];
    }

    // Normalize URL before saving
    const normalizedUrlValue = normalizeUrl(formData.url);

    const linkItem = {
      ...formData,
      url: normalizedUrlValue, // Use normalized URL
      id: editingLink ? editingLink.id : Date.now().toString(),
      addedDate: editingLink ? editingLink.addedDate : new Date().toISOString(),
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
    };

    console.log('Link item created:', linkItem);

    if (editingLink) {
      const linkIndex = newLinksData[category].findIndex(link => link.id === editingLink.id);
      if (linkIndex !== -1) {
        newLinksData[category][linkIndex] = linkItem;
      }
    } else {
      newLinksData[category].push(linkItem);
    }

    console.log('Updated links data:', newLinksData);

    // Build categories if needed
    const updatedCategories = { ...categories };
    if (!updatedCategories[category]) {
      const defaultCategory = defaultCategories.find(cat => 
        cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === category
      );
      
      if (defaultCategory) {
        updatedCategories[category] = {
          name: defaultCategory.name,
          icon: defaultCategory.icon,
          color: defaultCategory.color,
          createdDate: new Date().toISOString()
        };
      }
    }

    // Single atomic write: update BOTH links and categories
    actions.updateData({
      ...state.data,
      links: newLinksData,
      linkCategories: updatedCategories
    });
    
    // Show success message
    alert(`Link "${linkItem.name}" ${editingLink ? 'updated' : 'added'} successfully!`);
    
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
    setShowCategoryDropdown(false);
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
    // First check user-created categories
    if (categories[categoryKey]) {
      return categories[categoryKey];
    }
    
    // Then check default categories
    const defaultCategory = defaultCategories.find(cat => 
      cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === categoryKey
    );
    
    if (defaultCategory) {
      return {
        name: defaultCategory.name,
        icon: defaultCategory.icon,
        color: defaultCategory.color
      };
    }
    
    // Fallback for unknown categories
    return {
      name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
      icon: '🔗',
      color: '#3498db'
    };
  };

  // Get all available categories for dropdown (user-created + defaults)
  const getAllAvailableCategories = () => {
    const allCategories = {};
    
    // Add default categories
    defaultCategories.forEach(category => {
      const categoryKey = category.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      allCategories[categoryKey] = {
        name: category.name,
        icon: category.icon,
        color: category.color,
        isDefault: true
      };
    });
    
    // Add user-created categories (they override defaults if same key)
    Object.keys(categories).forEach(categoryKey => {
      allCategories[categoryKey] = {
        ...categories[categoryKey],
        isDefault: false
      };
    });
    
    return allCategories;
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
              Choose from our suggested categories below or create your own.
            </p>
            <div className="empty-actions">
              <Button
                variant="primary"
                onClick={() => setShowAddForm(true)}
                size="lg"
              >
                Add Your First Link
              </Button>
            </div>
          </div>

          {/* Suggested Categories */}
          <div className="suggested-categories">
            <h4>Suggested Categories</h4>
            <div className="suggestions-grid">
              {suggestedCategories.map((category, index) => {
                // Create a category key for data attribute
                const categoryKey = category.name.toLowerCase()
                  .replace(/[^a-z0-9]/g, '')
                  .replace(/finance|medical|professional|garden/, '');
                
                return (
                  <div
                    key={index}
                    className="suggestion-card"
                    data-category={categoryKey}
                    onClick={() => addSuggestedCategory(category)}
                    style={{
                      '--suggestion-color': category.color,
                      '--suggestion-color-light': category.color + '90'
                    }}
                  >
                    <div className="suggestion-header">
                      <span className="suggestion-icon" style={{ color: category.color }}>
                        {category.icon}
                      </span>
                      <span className="suggestion-name">{category.name}</span>
                    </div>
                    <div className="suggestion-examples">
                      {category.examples.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <Card className="form-modal">
            <div className="form-header">
              <h3>Create New Category</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryForm(false)}
              >
                ✕
              </Button>
            </div>
            <form onSubmit={handleCategorySubmit} className="category-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Category Name *</label>
                  <Input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => handleCategoryInputChange('name', e.target.value)}
                    placeholder="e.g., Banking & Finance"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <Input
                    type="text"
                    value={categoryFormData.icon}
                    onChange={(e) => handleCategoryInputChange('icon', e.target.value)}
                    placeholder="🔗"
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <Input
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => handleCategoryInputChange('color', e.target.value)}
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
        </div>
      )}

      {/* Link Form Modal */}
      {showAddForm && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <Card className="form-modal">
            <div className="form-header">
              <h3>{editingLink ? 'Edit Link' : 'Add New Link'}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
              >
                ✕
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="link-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Link Name *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., TD Canada Trust"
                    required
                  />
                  <small className="form-help">
                    Enter any name - spaces and special characters are allowed
                  </small>
                </div>
                <div className="form-group">
                  <label>URL *</label>
                  <Input
                    type="text"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    placeholder="example.com or https://example.com"
                    required
                  />
                  <small className="form-help">
                    Enter a domain (e.g., google.com) or full URL (e.g., https://google.com)
                  </small>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <div className="custom-select-wrapper">
                    <div 
                      className={`custom-select ${showCategoryDropdown ? 'open' : ''} ${!formData.category ? 'error' : ''}`}
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    >
                      <div className="select-display">
                        {formData.category ? (
                          <>
                            <span className="category-icon">
                              {getAllAvailableCategories()[formData.category]?.icon}
                            </span>
                            <span>{getAllAvailableCategories()[formData.category]?.name}</span>
                          </>
                        ) : (
                          <span className={`placeholder ${!formData.category ? 'error' : ''}`}>
                            Select a category *
                          </span>
                        )}
                        <span className={`dropdown-arrow ${showCategoryDropdown ? 'up' : 'down'}`}>
                          ▼
                        </span>
                      </div>
                      
                      {showCategoryDropdown && (
                        <div className="custom-dropdown">
                          <div className="dropdown-list">
                            {Object.keys(getAllAvailableCategories())
                              .sort((a, b) => {
                                const catA = getAllAvailableCategories()[a];
                                const catB = getAllAvailableCategories()[b];
                                if (catA.isDefault && !catB.isDefault) return -1;
                                if (!catA.isDefault && catB.isDefault) return 1;
                                return catA.name.localeCompare(catB.name);
                              })
                              .map(categoryKey => {
                                const categoryInfo = getAllAvailableCategories()[categoryKey];
                                return (
                                  <div
                                    key={categoryKey}
                                    className={`dropdown-option ${formData.category === categoryKey ? 'selected' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('Selected category:', categoryKey); // Debug log
                                      handleInputChange('category', categoryKey);
                                      setShowCategoryDropdown(false);
                                    }}
                                  >
                                    <span className="option-icon">{categoryInfo.icon}</span>
                                    <span className="option-text">{categoryInfo.name}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Hidden input to ensure form validation works */}
                    <input
                      type="hidden"
                      value={formData.category}
                      required
                      onChange={() => {}} // Controlled by dropdown
                    />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Tags</label>
                  <Input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    placeholder="banking, finance, credit (comma separated)"
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
        </div>
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
                        // Auto-create default category if it doesn't exist
                        const defaultCategory = defaultCategories.find(cat => 
                          cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === categoryKey
                        );
                        
                        if (defaultCategory && !categories[categoryKey]) {
                          const updatedCategories = {
                            ...categories,
                            [categoryKey]: {
                              name: defaultCategory.name,
                              icon: defaultCategory.icon,
                              color: defaultCategory.color,
                              createdDate: new Date().toISOString()
                            }
                          };
                          
                          actions.updateData({
                            ...state.data,
                            linkCategories: updatedCategories
                          });
                        }
                        
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
                              title={`Click to visit ${link.name}`}
                            >
                              <span className="link-icon">🔗</span>
                              <div className="link-info">
                                <div className="link-name">{link.name}</div>
                                <div className="link-url">{getHostnameFromUrl(link.url)}</div>
                              </div>
                            </button>

                            {link.description && (
                              <div className="link-description">{link.description}</div>
                            )}

                            {link.tags && link.tags.length > 0 && (
                              <div className="link-tags">
                                {link.tags.map((tag, index) => (
                                  <span key={index} className="tag">{tag}</span>
                                ))}
                              </div>
                            )}

                            <div className="link-metadata">
                              Added {new Date(link.addedDate).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="link-actions">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLink(link.url);
                              }}
                            >
                              Visit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(categoryKey, link);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(categoryKey, link.id);
                              }}
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
            {Object.keys(normalizedLinksData).map(categoryKey => {
              const categoryLinks = normalizedLinksData[categoryKey] || [];
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
                        title={`Visit ${link.name} - ${link.url}`}
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