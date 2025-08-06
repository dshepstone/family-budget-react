// Complete Monthly Expenses Module with Enhanced Functionality - FIXED & ENHANCED FOR DEBUGGING
// js/modules/monthly.js

const MonthlyModule = {
    name: 'monthly',

    init(app) {
        this.app = app;
        console.log('MonthlyModule: Initializing...');

        try {
            this.createMonthlyPage();
            this.setupEventListeners();

            // Persist edits if the page is refreshed before leaving
            // Root cause: unsaved input fields were lost on refresh, leading to
            // exports missing recent changes.
            window.addEventListener('beforeunload', () => this.saveMonthlyData());

            // Force load data after short delay
            setTimeout(() => {
                console.log('MonthlyModule: Attempting forceDataLoad and populateCategories...');
                this.forceDataLoad();
                this.populateCategories();
                console.log('MonthlyModule: Initial data population complete.');
            }, 500);

            // Listen for data changes
            app.on('dataChanged', () => {
                console.log('MonthlyModule: dataChanged event received, updating totals.');
                this.updateTotals();
            });
            app.on('pageChanged', (pageId) => {
                if (pageId === 'monthly') {
                    console.log('MonthlyModule: pageChanged to "monthly", refreshing categories and totals.');
                    this.populateCategories();
                    this.updateTotals();
                }
            });
            // Sync status changes coming from planner
            app.on('plannerStatusChanged', (data) => {
                console.log('MonthlyModule: plannerStatusChanged event received, updating monthly status.');
                this.handlePlannerStatusChange(data);
            });
            console.log('MonthlyModule: Initialization complete and event listeners set up.');
        } catch (error) {
            console.error('MonthlyModule: Error during init:', error);
            // Optionally, show a user-friendly message if init fails
            // this.app.showToast('Error loading Monthly Expenses module.', 'error');
        }
    },

    forceDataLoad() {
        if (!this.app.state.data.monthly || Object.keys(this.app.state.data.monthly).length === 0) {
            console.log('MonthlyModule: Initializing empty monthly categories...');
            const categories = ['housing','taxes','utilities','insurance','banking','loans','credit','subscriptions','food','transportation','medical','personal','shopping','dog','maintenance','gifts'];
            this.app.state.data.monthly = {};
            categories.forEach(c => this.app.state.data.monthly[c] = []);
            this.app.saveData();
        }
    },

    createMonthlyPage() {
        const pageContainer = document.getElementById('page-content');
        if (!pageContainer) {
            console.error('MonthlyModule: #page-content element not found. Cannot create page.');
            return; // Exit if the container is not found
        }
        console.log('MonthlyModule: #page-content found, creating monthly page HTML.');

        const monthlyPage = document.createElement('div');
        monthlyPage.id = 'monthly';
        monthlyPage.className = 'page';

        monthlyPage.innerHTML = `
            <h2 class="page-title">💳 Monthly Expenses</h2>
            
            <div class="page-controls">
                <div class="toggle-container">
                    <label class="toggle-label" for="toggle-zero-expenses">Show Zero-Value Items</label>
                    <input type="checkbox" id="toggle-zero-expenses" checked>
                </div>
                <div>
                    <button class="btn btn-secondary" onclick="MonthlyModule.resetFunding()">Reset Funding</button>
                    <button class="btn btn-danger" onclick="MonthlyModule.resetStatuses()">Reset Statuses</button>
                    <button class="btn btn-success" onclick="MonthlyModule.refreshData()">🔄 Refresh Data</button>
                </div>
            </div>
            
            <div id="monthly-expense-categories">
                <!-- Categories will be populated here -->
            </div>
            
            <div class="page-actions">
                <button class="btn btn-secondary" onclick="BudgetApp.startPagePrint('#monthly')">🖨️ Print this Page</button>
                <button class="btn btn-primary" onclick="MonthlyModule.exportMonthlyCSV()">📁 Export Monthly CSV</button>
            </div>
            
            <div class="total" id="total-expenses">Total Monthly Expenses: $0.00</div>
            
            <div class="category" style="margin-top: 20px;">
                <div class="category-header">
                    <span class="category-name">🏦 Funds to Set Aside by Account</span>
                </div>
                <div id="monthly-funds-summary">
                    <!-- Funds summary will be populated here -->
                </div>
            </div>
        `;

        pageContainer.appendChild(monthlyPage);
        console.log('MonthlyModule: Monthly page HTML appended to DOM.');
    },

    setupEventListeners() {
        console.log('MonthlyModule: Setting up event listeners...');
        // Add event listeners for expense management
        document.addEventListener('input', (e) => {
            if (e.target.matches('#monthly .amount-input, #monthly .date-input-item, #monthly .subcategory-name-input, #monthly .balance-input')) {
                // Wrap in try-catch to catch errors during input handling
                try {
                    this.updateTotals();
                    this.saveMonthlyData();

                    // If this is an actual input change, also update planner
                    if (e.target.matches('#monthly .actual-input')) {
                        this.notifyPlannerOfChange(e.target);
                    }
                } catch (error) {
                    console.error('MonthlyModule: Error in input event listener:', error);
                }
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'toggle-zero-expenses') {
                try {
                    this.toggleZeroValueItems();
                } catch (error) {
                    console.error('MonthlyModule: Error in toggle-zero-expenses change listener:', error);
                }
            }
            if (e.target.matches('#monthly .transfer-status-select, #monthly .monthly-paid-checkbox, #monthly .monthly-transferred-checkbox, #monthly .account-select')) {
                try {
                    // Always apply style using the related select element
                    const controlGroup = e.target.closest('.status-control-group');
                    const statusSelect = controlGroup ? controlGroup.querySelector('.transfer-status-select') : null;
                    if (statusSelect) {
                        this.setTransferStatusStyle(statusSelect);
                    }

                    this.updateTotals();
                    this.saveMonthlyData();
                    this.notifyPlannerOfStatusChange(e.target);
                } catch (error) {
                    console.error('MonthlyModule: Error in transfer/paid/account change listener:', error);
                }
            }
        });

        // Copy to actual button functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('#monthly .copy-to-actual-btn')) {
                try {
                    e.preventDefault();
                    const group = e.target.parentElement;
                    const projectedInput = group.querySelector('.projected-input');
                    const actualInput = group.querySelector('.actual-input');
                    if (projectedInput && actualInput) {
                        actualInput.value = projectedInput.value;
                        actualInput.classList.add('has-value');
                        this.updateTotals();
                        this.saveMonthlyData();
                        this.notifyPlannerOfChange(actualInput);
                    }
                } catch (error) {
                    console.error('MonthlyModule: Error in copy-to-actual-btn click listener:', error);
                }
            }
            const linkBtn = e.target.closest('#monthly .link-btn');
            if (linkBtn) {
                this.handleLinkClick({
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation(),
                    currentTarget: linkBtn
                });
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const linkIcon = e.target.closest('#monthly a.link-icon');
            if (linkIcon) {
                this.handleLinkReedit(e, linkIcon.dataset.expenseId);
            }
        });
        console.log('MonthlyModule: All event listeners registered.');
    },

    notifyPlannerOfChange(actualInput) {
        // This will trigger the global listener in core.js that updates the planner
        // Added check for this.app.emit to prevent errors if app is not fully ready
        if (this.app && typeof this.app.emit === 'function') {
            setTimeout(() => {
                this.app.emit('monthlyExpenseChanged', {
                    input: actualInput,
                    category: actualInput.closest('.category')?.dataset.category,
                    name: actualInput.closest('.subcategory')?.querySelector('.subcategory-name-input')?.value
                });
            }, 10);
        } else {
            console.warn('MonthlyModule: App.emit not available for planner notification.');
        }
    },

    handleLinkClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const expenseId = event.currentTarget.dataset.expenseId;
        this.showLinkModal(expenseId);
    },

    handleLinkReedit(event, expenseId) {
        event.preventDefault();
        this.showLinkModal(expenseId);
    },

    showLinkModal(expenseId) {
        if (!window.LinkModal) return;
        const find = (id) => {
            for (const [cat, list] of Object.entries(this.app.state.data.monthly || {})) {
                const exp = list.find(e => e.id === id);
                if (exp) return {exp, cat};
            }
            return {};
        };
        const getUrl = (id) => {
            const f = find(id);
            return f.exp ? f.exp.link || '' : '';
        };
        const setUrl = (id, url) => {
            const f = find(id);
            if (f.exp) {
                f.exp.link = url;
                const row = document.querySelector(`#monthly .subcategory[data-expense-id="${id}"]`);
                if (row) {
                    row.dataset.link = url;
                    const container = row.querySelector('.link-container');
                    if (container) {
                        container.innerHTML = url
                            ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-icon" title="Click to open, right-click to edit" data-expense-id="${id}">🔗</a>`
                            : this.createLinkIcon({ id });
                    }
                }
                // Save after DOM updates so new link persists when leaving page
                // Root cause: previous implementation saved before setting dataset.link
                this.saveMonthlyData();
            }
        };
        LinkModal.show(expenseId, getUrl, setUrl);
    },

    notifyPlannerOfStatusChange(checkboxElement) {
        const expenseRow = checkboxElement.closest('.subcategory');
        const expenseName = expenseRow.querySelector('.subcategory-name-input')?.value;
        const expenseId = expenseRow.dataset.expenseId;
        const week = window.currentBudgetWeek;

        if (expenseName && this.app.emit) {
            const transferredState = expenseRow.querySelector('.monthly-transferred-checkbox')?.checked || false;
            const paidState = expenseRow.querySelector('.monthly-paid-checkbox')?.checked || false;

            this.app.emit('monthlyStatusChanged', {
                expenseName,
                expenseId,
                transferred: transferredState,
                paid: paidState,
                week,
                source: 'monthly'
            });
        }
    },

    handlePlannerStatusChange(data) {
        if (data.source === 'planner') {
            console.log('MonthlyModule: Received planner status change:', data);
            this.updateExpenseStatusFromPlanner(data);
        }
    },

    updateExpenseStatusFromPlanner(data) {
        const expenseRows = document.querySelectorAll('#monthly .subcategory');
        expenseRows.forEach(row => {
            const nameInput = row.querySelector('.subcategory-name-input');
            if (nameInput && nameInput.value === data.expenseName) {
                const transferredCheckbox = row.querySelector('.monthly-transferred-checkbox');
                const paidCheckbox = row.querySelector('.monthly-paid-checkbox');
                const statusSelect = row.querySelector('.transfer-status-select');

                if (transferredCheckbox) {
                    transferredCheckbox.checked = !!data.hasTransferred;
                }
                if (paidCheckbox) {
                    paidCheckbox.checked = !!data.hasPaid;
                }

                if (statusSelect) {
                    this.setTransferStatusStyle(statusSelect);
                }

                this.saveMonthlyData(false);
                this.updateTotals();
            }
        });
    },

    populateCategories() {
        const container = document.getElementById('monthly-expense-categories');
        if (!container) {
            console.warn('MonthlyModule: monthly-expense-categories container not found during populateCategories.');
            return;
        }

        console.log('MonthlyModule: Populating monthly categories...');
        container.innerHTML = '';

        // Create categories from data
        if (this.app.state.data.monthly) {
            Object.entries(this.app.state.data.monthly).forEach(([categoryKey, expenses]) => {
                try {
                    const categoryDiv = this.createCategoryElement(categoryKey, expenses);
                    container.appendChild(categoryDiv);
                } catch (error) {
                    console.error(`MonthlyModule: Error creating element for category ${categoryKey}:`, error);
                }
            });
        } else {
            console.log('MonthlyModule: No monthly data found in app.state.data.monthly.');
            container.innerHTML = '<p style="padding:20px; text-align:center; color:#777;">No monthly expense data available. Add some items or check data loading.</p>';
        }

        this.updateTotals();
        if (this.app && typeof this.app.emit === 'function') {
            this.app.emit('dataChanged');
        }
        console.log('MonthlyModule: Categories populated and dataChanged emitted.');

        // Sync checkboxes to planner for the current week
        const syncMonthlyStatus = (event) => {
            const cb = event.target;
            const rowId = cb.closest('.subcategory')?.dataset.expenseId;
            const type = cb.classList.contains('monthly-paid-checkbox') ? 'paid' : 'transferred';
            const checked = cb.checked;
            const week = window.currentBudgetWeek;

            // Update Weekly planner for current week
            const plannerSelector = `#planner tr[data-expense-id="${rowId}"] td.week-${week}-status-col input.${type}-checkbox`;
            const wpCb = document.querySelector(plannerSelector);
            if (wpCb) {
                wpCb.checked = checked;
                if (window.PlannerModule) {
                    PlannerModule.updatePlannerRow(wpCb.closest('tr'));
                    PlannerModule.savePlannerData();
                }
            }

            // Update Annual page
            const annualSelector = `#annual .subcategory[data-expense-id="${rowId}"] input.${type}-checkbox`;
            const annualCb = document.querySelector(annualSelector);
            if (annualCb) {
                annualCb.checked = checked;
                if (window.AnnualModule && typeof AnnualModule.setTransferStatusStyle === 'function') {
                    AnnualModule.setTransferStatusStyle(annualCb);
                }
            }
        };

        document.querySelectorAll('#monthly-expense-categories .monthly-paid-checkbox, #monthly-expense-categories .monthly-transferred-checkbox')
            .forEach(cb => cb.addEventListener('change', syncMonthlyStatus));
    },

    createCategoryElement(categoryKey, expenses) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.dataset.category = categoryKey;

        // Ensure app.categoryNames exists, otherwise fallback
        const categoryName = this.app.categoryNames?.[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);

        let total = 0;
        const expenseItems = expenses.map((expense, index) => {
            const expId = expense.id || `${categoryKey}-${index}`;
            expense.id = expId;
            const amount = parseFloat(expense.actual || expense.amount || 0);
            total += amount;

            // Balance input for loans/credit
            let balanceInputHTML = '';
            if ((categoryKey === 'loans' || categoryKey === 'credit') && expense.balance !== undefined) {
                balanceInputHTML = `<div class="balance-input-group"><input type="number" class="amount-input balance-input" value="${(expense.balance || 0).toFixed(2)}" placeholder="Balance"></div>`;
            }

            // Ensure this.app.createAccountSelect is safe
            const accountSelectHtml = (this.app && typeof this.app.createAccountSelect === 'function') ? this.app.createAccountSelect(expense.account) : '<select class="account-select"><option value="">N/A</option></select>';
            const linkIconHtml = this.createLinkIcon(expense);

            return `
                <div class="subcategory" data-link="${expense.link || ''}" data-expense-id="${expId}">
                    <input type="date" class="date-input-item" value="${expense.date || ''}">
                    <input class="subcategory-name-input" value="${expense.name || ''}" placeholder="Expense name">
                    <span class="link-container">${linkIconHtml}</span>
                    ${accountSelectHtml}
                    <div class="status-control-group">
                        <select class="transfer-status-select status-${expense.transferStatus || 'none'}${expense.paid ? ' status-paid' : ''}" title="Set Transfer Status">
                            <option value="none" ${!expense.transferStatus || expense.transferStatus === 'none' ? 'selected' : ''}>--</option>
                            <option value="quarter" ${expense.transferStatus === 'quarter' ? 'selected' : ''}>¼</option>
                            <option value="half" ${expense.transferStatus === 'half' ? 'selected' : ''}>½</option>
                            <option value="full" ${expense.transferStatus === 'full' ? 'selected' : ''}>Full</option>
                        </select>
                        <div class="expense-status-checkboxes">
                            <label title="Transferred" class="status-checkbox-label">
                                <input type="checkbox" class="monthly-transferred-checkbox" ${expense.transferred ? 'checked' : ''}>
                                <span class="checkbox-label">T</span>
                            </label>
                            <label title="Paid" class="status-checkbox-label">
                                <input type="checkbox" class="monthly-paid-checkbox" ${expense.paid ? 'checked' : ''}>
                                <span class="checkbox-label">P</span>
                            </label>
                        </div>
                    </div>
                    ${balanceInputHTML}
                    <div class="amount-input-group">
                        <input type="number" class="amount-input projected-input ${(expense.projected || 0) > 0 ? 'has-value' : ''}" value="${(expense.projected || amount).toFixed(2)}" step="0.01" placeholder="Projected">
                        <button class="copy-to-actual-btn" title="Copy Projected to Actual"><i class="fa fa-arrow-right"></i></button>
                        <input type="number" class="amount-input actual-input ${amount > 0 ? 'has-value' : ''}" value="${amount.toFixed(2)}" step="0.01" placeholder="Actual">
                    </div>
                    <button class="item-delete-btn" onclick="MonthlyModule.removeItem(this)"><i class="fa fa-times"></i></button>
                </div>
            `;
        }).join('');

        let subheaderHTML = '';
        if (categoryKey === 'loans' || categoryKey === 'credit') {
            subheaderHTML = `<div class="subcategory-header">
                <span class="header-date">Date</span>
                <span class="header-name">Expense Name</span>
                <span style="flex:1.2; text-align:center;">Funds Source</span>
                <span class="header-status">Status</span>
                <span class="header-balance">Balance</span>
                <div class="header-amounts"><span>Projected</span><span>Actual</span></div>
                <span style="width: 22px;"></span>
            </div>`;
        } else {
            subheaderHTML = `<div class="subcategory-header">
                <span class="header-date">Date</span>
                <span class="header-name">Expense Name</span>
                <span style="flex:1.2; text-align:center;">Funds Source</span>
                <span class="header-status">Status</span>
                <div class="header-amounts"><span>Projected</span><span>Actual</span></div>
                <span style="width: 22px;"></span>
            </div>`;
        }

        categoryDiv.innerHTML = `
            <div class="category-header">
                <span class="category-name">${categoryName}</span>
                <div class="category-controls">
                    <span class="category-total">${this.app.formatCurrency(total)}</span>
                    <button class="add-item-btn" onclick="MonthlyModule.addItem('${categoryKey}')">+</button>
                </div>
            </div>
            ${subheaderHTML}
            <div class="subcategory-list">${expenseItems}</div>
        `;

        return categoryDiv;
    },


    createLinkIcon(expense) {
        if (expense.link) {
            return `<a href="${expense.link}" target="_blank" rel="noopener noreferrer" class="link-icon" title="Click to open, right-click to edit" data-expense-id="${expense.id}">🔗</a>`;
        }
        return `<button type="button" class="link-btn" data-expense-id="${expense.id}" aria-label="Add/edit link">🔗</button>`;
    },

    setTransferStatusStyle(selectElement) {
        if (selectElement.matches('.transfer-status-select')) {
            selectElement.className = 'transfer-status-select';
            selectElement.classList.add(`status-${selectElement.value}`);

            const paidCheckbox = selectElement.closest('.status-control-group')?.querySelector('.monthly-paid-checkbox');
            if (paidCheckbox && paidCheckbox.checked) {
                selectElement.classList.add('status-paid');
            }
        }
    },

    addItem(categoryKey) {
        console.log(`MonthlyModule: Adding item to category ${categoryKey}`);
        const category = document.querySelector(`[data-category="${categoryKey}"]`);
        if (!category) {
            console.warn(`MonthlyModule: Category element not found for ${categoryKey}. Cannot add item.`);
            return;
        }

        const subcategoryList = category.querySelector('.subcategory-list');
        if (!subcategoryList) {
            console.warn(`MonthlyModule: Subcategory list not found for ${categoryKey}. Cannot add item.`);
            return;
        }

        const newItem = document.createElement('div');
        newItem.className = 'subcategory';
        newItem.dataset.link = '';
        const newId = `${categoryKey}-${Date.now()}`;
        newItem.dataset.expenseId = newId;

        const balanceInputHTML = (categoryKey === 'loans' || categoryKey === 'credit') ?
            `<div class="balance-input-group"><input type="number" class="amount-input balance-input" value="0.00" placeholder="Balance"></div>` : '';

        // Ensure app.createAccountSelect is safe here too
        const accountSelectHtml = (this.app && typeof this.app.createAccountSelect === 'function') ? this.app.createAccountSelect() : '<select class="account-select"><option value="">N/A</option></select>';

        newItem.innerHTML = `
            <input type="date" class="date-input-item" value="">
            <input class="subcategory-name-input" value="" placeholder="New expense name">
            <span class="link-container">${this.createLinkIcon({ id: newId })}</span>
            ${accountSelectHtml}
            <div class="status-control-group">
                <select class="transfer-status-select status-none" title="Set Transfer Status">
                    <option value="none" selected>--</option>
                    <option value="quarter">¼</option>
                    <option value="half">½</option>
                    <option value="full">Full</option>
                </select>
                <div class="expense-status-checkboxes">
                    <label title="Transferred" class="status-checkbox-label">
                        <input type="checkbox" class="monthly-transferred-checkbox">
                        <span class="checkbox-label">T</span>
                    </label>
                    <label title="Paid" class="status-checkbox-label">
                        <input type="checkbox" class="monthly-paid-checkbox">
                        <span class="checkbox-label">P</span>
                    </label>
                </div>
            </div>
            ${balanceInputHTML}
            <div class="amount-input-group">
                <input type="number" class="amount-input projected-input" value="0.00" step="0.01" placeholder="Projected">
                <button class="copy-to-actual-btn" title="Copy Projected to Actual"><i class="fa fa-arrow-right"></i></button>
                <input type="number" class="amount-input actual-input" value="0.00" step="0.01" placeholder="Actual">
            </div>
            <button class="item-delete-btn" onclick="MonthlyModule.removeItem(this)"><i class="fa fa-times"></i></button>
        `;

        subcategoryList.appendChild(newItem);

        // Focus on the name input
        const nameInput = newItem.querySelector('.subcategory-name-input');
        if (nameInput) {
            nameInput.focus();
        }

        this.updateTotals();
        this.saveMonthlyData();
    },

    removeItem(button) {
        console.log('MonthlyModule: Removing item.');
        const subcategory = button.closest('.subcategory');
        if (subcategory) {
            // Get the name before removing for planner cleanup
            const nameInput = subcategory.querySelector('.subcategory-name-input');
            const expenseName = nameInput ? nameInput.value : '';

            subcategory.remove();

            // Clean up planner state for this item
            if (expenseName && this.app.state.data.plannerState && this.app.state.data.plannerState[expenseName]) {
                delete this.app.state.data.plannerState[expenseName];
                console.log(`MonthlyModule: Cleaned up plannerState for "${expenseName}".`);
            }

            this.updateTotals();
            this.saveMonthlyData();
            if (this.app && typeof this.app.emit === 'function') {
                this.app.emit('dataChanged');
            }
            console.log('MonthlyModule: Item removed and dataChanged emitted.');
        } else {
            console.warn('MonthlyModule: Could not find subcategory to remove.');
        }
    },

    updateTotals() {
        console.log('MonthlyModule: Updating totals...');
        let totalExpenses = 0;

        // Update category totals and calculate overall total
        document.querySelectorAll('#monthly .category').forEach(categoryEl => {
            const categoryTotal = Array.from(categoryEl.querySelectorAll('.actual-input'))
                .reduce((sum, input) => {
                    const value = parseFloat(input.value) || 0;
                    // Add visual feedback for non-zero values
                    input.classList.toggle('has-value', value > 0);
                    return sum + value;
                }, 0);

            const categoryTotalEl = categoryEl.querySelector('.category-total');
            if (categoryTotalEl) {
                // Ensure this.app.formatCurrency exists
                categoryTotalEl.textContent = (this.app && typeof this.app.formatCurrency === 'function') ? this.app.formatCurrency(categoryTotal) : `$${categoryTotal.toFixed(2)}`;
            }

            totalExpenses += categoryTotal;
        });

        // Update projected input styling
        document.querySelectorAll('#monthly .projected-input').forEach(input => {
            const value = parseFloat(input.value) || 0;
            input.classList.toggle('has-value', value > 0);
        });

        const totalElement = document.getElementById('total-expenses');
        if (totalElement) {
            totalElement.textContent = `Total Monthly Expenses: ${(this.app && typeof this.app.formatCurrency === 'function') ? this.app.formatCurrency(totalExpenses) : `$${totalExpenses.toFixed(2)}`}`;
        }

        this.updateFundsSummary();
        if (this.app && typeof this.app.emit === 'function') {
            this.app.emit('monthlyChanged', { totalExpenses });
        }
        console.log('MonthlyModule: Totals updated and monthlyChanged emitted.');
    },

    updateFundsSummary() {
        const container = document.getElementById('monthly-funds-summary');
        if (!container) {
            console.warn('MonthlyModule: monthly-funds-summary container not found during updateFundsSummary.');
            return;
        }

        const accountTotals = {};
        const multipliers = { none: 0, quarter: 0.25, half: 0.5, full: 1 };

        document.querySelectorAll('#monthly .subcategory').forEach(item => {
            const accountSelect = item.querySelector('.account-select');
            const statusSelect = item.querySelector('.transfer-status-select');
            const projectedInput = item.querySelector('.projected-input');
            const paidCheckbox = item.querySelector('.monthly-paid-checkbox');

            if (accountSelect && statusSelect && projectedInput) {
                if (paidCheckbox && paidCheckbox.checked) {
                    return; // exclude paid expenses from fund totals
                }

                const account = accountSelect.value;
                const status = statusSelect.value;
                const amount = parseFloat(projectedInput.value) || 0;

                if (account && !["None", "Split", "TBD"].includes(account) && amount > 0) {
                    const multiplier = multipliers[status] || 0;
                    const amountToSetAside = amount * multiplier;

                    if (amountToSetAside > 0) {
                        accountTotals[account] = (accountTotals[account] || 0) + amountToSetAside;
                    }
                }
            }
        });

        let summaryHTML = '<table class="funds-summary-table">';
        if (Object.keys(accountTotals).length === 0) {
            summaryHTML += '<tr><td>No funds need to be set aside based on current statuses.</td></tr>';
        } else {
            Object.entries(accountTotals).forEach(([account, total]) => {
                summaryHTML += `<tr><td>${account}</td><td>${(this.app && typeof this.app.formatCurrency === 'function') ? this.app.formatCurrency(total) : `$${total.toFixed(2)}`}</td></tr>`;
            });
        }
        summaryHTML += '</table>';

        container.innerHTML = summaryHTML;
        console.log('MonthlyModule: Funds summary updated.');
    },

    toggleZeroValueItems() {
        console.log('MonthlyModule: Toggling zero value items.');
        const show = document.getElementById('toggle-zero-expenses').checked;
        document.querySelectorAll('#monthly .subcategory').forEach(item => {
            const actualInput = item.querySelector('.actual-input');
            const value = parseFloat(actualInput.value) || 0;
            if (value === 0) {
                item.style.display = show ? 'flex' : 'none';
            }
        });
    },

    resetFunding() {
        console.log('MonthlyModule: Resetting funding.');
        document.querySelectorAll('#monthly .projected-input').forEach(input => {
            input.value = "0.00";
            input.classList.remove('has-value');
        });
        this.updateTotals();
        this.saveMonthlyData();
    },

    resetStatuses() {
        console.log('MonthlyModule: Resetting statuses.');
        document.querySelectorAll('#monthly .transfer-status-select').forEach(select => {
            select.value = "none";
            this.setTransferStatusStyle(select);
        });
        document.querySelectorAll('#monthly .monthly-paid-checkbox').forEach(cb => {
            cb.checked = false;
        });
        this.updateTotals();
        this.saveMonthlyData();
    },

    refreshData() {
        console.log('MonthlyModule: Refreshing data...');
        this.forceDataLoad();
        this.populateCategories();
    },

    saveMonthlyData(emitChange = true) {
        console.log('MonthlyModule: Saving monthly data.');
        const monthlyData = {};

        document.querySelectorAll('#monthly .category').forEach(categoryEl => {
            const categoryKey = categoryEl.dataset.category;
            if (!categoryKey) return;

            const expenses = [];
            categoryEl.querySelectorAll('.subcategory').forEach(item => {
                const dateInput = item.querySelector('.date-input-item');
                const nameInput = item.querySelector('.subcategory-name-input');
                const accountSelect = item.querySelector('.account-select');
                const statusSelect = item.querySelector('.transfer-status-select');
                const projectedInput = item.querySelector('.projected-input');
                const actualInput = item.querySelector('.actual-input');
                const balanceInput = item.querySelector('.balance-input');
                const paidCheckbox = item.querySelector('.monthly-paid-checkbox');
                const transferredCheckbox = item.querySelector('.monthly-transferred-checkbox');

                if (nameInput && nameInput.value.trim()) {
                    const expenseData = {
                        id: item.dataset.expenseId || `${categoryKey}-${Date.now()}`,
                        date: dateInput ? dateInput.value : '',
                        name: nameInput.value,
                        account: accountSelect ? accountSelect.value : '',
                        link: item.dataset.link || '',
                        transferStatus: statusSelect ? statusSelect.value : 'none',
                        projected: parseFloat(projectedInput.value) || 0,
                        actual: parseFloat(actualInput.value) || 0,
                        transferred: transferredCheckbox ? transferredCheckbox.checked : false,
                        paid: paidCheckbox ? paidCheckbox.checked : false
                    };

                    if (balanceInput) {
                        expenseData.balance = parseFloat(balanceInput.value) || 0;
                    }

                    expenses.push(expenseData);
                }
            });

            monthlyData[categoryKey] = expenses;
        });

        this.app.state.data.monthly = monthlyData;
        if (this.app && typeof this.app.saveData === 'function') {
            this.app.saveData();
        } else {
            console.warn('MonthlyModule: app.saveData() is not available.');
        }
        if (emitChange && this.app && typeof this.app.emit === 'function') {
            this.app.emit('dataChanged');
        }
        console.log('MonthlyModule: Monthly data saved.');
    },

    exportMonthlyCSV() {
        console.log('MonthlyModule: Exporting monthly CSV.');
        // Ensure latest edits are captured in the export
        this.saveMonthlyData();
        if (this.app.state.data.monthly && Object.keys(this.app.state.data.monthly).length === 0) {
            alert('No monthly expenses to export.');
            return;
        }

        let csvContent = 'Category,Date,Expense Name,Account,Status,Projected,Actual,Paid\n';

        Object.entries(this.app.state.data.monthly || {}).forEach(([categoryKey, expenses]) => {
            const categoryName = this.app.categoryNames?.[categoryKey] || categoryKey; // Safe access

            expenses.forEach(expense => {
                csvContent += `"${categoryName}","${expense.date || ''}","${expense.name || ''}","${expense.account || ''}","${expense.transferStatus || 'none'}",${(expense.projected || 0).toFixed(2)},${(expense.actual || expense.amount || 0).toFixed(2)},${expense.paid ? 'Yes' : 'No'}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monthly-expenses-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        console.log('MonthlyModule: CSV export initiated.');
    }
};

// Register the module
(function () {
    function registerModule() {
        if (typeof BudgetApp !== 'undefined') {
            console.log('MonthlyModule: Registering with BudgetApp...');
            BudgetApp.registerModule('monthly', MonthlyModule);
        } else {
            console.warn('MonthlyModule: BudgetApp not found, retrying registration in 100ms.');
            setTimeout(registerModule, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerModule);
    } else {
        registerModule();
    }
})();

// Make module globally available
window.MonthlyModule = MonthlyModule;
