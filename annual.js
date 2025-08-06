// Complete Annual Expenses Module - Updated to Match Original
// js/modules/annual.js

const AnnualModule = {
    name: 'annual',

    init(app) {
        this.app = app;
        this.createAnnualPage();
        this.setupEventListeners();

        // Persist edits before refresh to avoid losing changes
        // Root cause: data wasn't saved when the page was refreshed,
        // so exports sometimes missed the latest entries.
        window.addEventListener('beforeunload', () => this.saveAnnualData());

        // Force load data after short delay
        setTimeout(() => {
            this.forceDataLoad();
            this.populateCategories();
        }, 500);

        // Listen for data changes
        app.on('dataChanged', () => this.updateTotals());
        app.on('pageChanged', (pageId) => {
            if (pageId === 'annual') {
                this.populateCategories();
                this.updateTotals();
            }
        });
    },

    forceDataLoad() {
        if (!this.app.state.data.annual || Object.keys(this.app.state.data.annual).length === 0) {
            console.log('Loading default annual categories...');
            const categories = ['yearly-subs','yearly-car','yearly-bank'];
            this.app.state.data.annual = {};
            categories.forEach(c => this.app.state.data.annual[c] = []);
            this.app.saveData();
        }
    },

    createAnnualPage() {
        const pageContainer = document.getElementById('page-content');

        const annualPage = document.createElement('div');
        annualPage.id = 'annual';
        annualPage.className = 'page';

        annualPage.innerHTML = `
            <h2 class="page-title">📅 Annual Expenses</h2>
            
            <div class="page-controls">
                <div></div>
                <div>
                    <button class="btn btn-secondary" onclick="AnnualModule.resetFunding()">Reset Funding</button>
                    <button class="btn btn-danger" onclick="AnnualModule.resetStatuses()">Reset Statuses</button>
                    <button class="btn btn-success" onclick="AnnualModule.refreshData()">🔄 Refresh Data</button>
                </div>
            </div>
            
            <div class="yearly-note">
                💡 Annual expenses are divided by 12 to show their monthly impact on the budget.
            </div>
            
            <div id="annual-expense-categories">
                </div>
            
            <div class="page-actions">
                <button class="btn btn-secondary" onclick="BudgetApp.startPagePrint('#annual')">🖨️ Print this Page</button>
                <button class="btn btn-primary" onclick="AnnualModule.exportAnnualCSV()">📁 Export Annual CSV</button>
            </div>
            
            <div class="total yearly-total" id="annual-total">Total Annual Expenses: $0.00/yr ($0.00/mo)</div>
            
            <div class="category" style="margin-top: 20px;">
                <div class="category-header">
                    <span class="category-name">🏦 Funds to Set Aside by Account</span>
                </div>
                <div id="annual-funds-summary">
                    </div>
            </div>
            
            <div class="category" style="margin-top: 20px;">
                <div class="category-header">
                    <span class="category-name">📊 Monthly Savings Plan</span>
                </div>
                <div id="annual-savings-plan">
                    </div>
            </div>
        `;

        pageContainer.appendChild(annualPage);
    },

    setupEventListeners() {
        // Add event listeners for expense management
        document.addEventListener('input', (e) => {
            if (e.target.matches('#annual .amount-input, #annual .due-date-input, #annual .subcategory-name-input')) {
                this.updateTotals();
                this.saveAnnualData();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('#annual .frequency-dropdown, #annual .paid-checkbox, #annual .transferred-checkbox, #annual .account-select')) {
                this.setTransferStatusStyle(e.target);
                this.updateTotals();
                this.saveAnnualData();

                // Sync status checkboxes with Monthly and Weekly modules
                if (e.target.matches('#annual .paid-checkbox, #annual .transferred-checkbox')) {
                    const cb = e.target;
                    const rowId = cb.closest('.subcategory')?.dataset.expenseId;
                    const type = cb.classList.contains('paid-checkbox') ? 'paid' : 'transferred';
                    const checked = cb.checked;

                    // Update Monthly page
                    const monthlySelector = `#monthly .subcategory[data-expense-id="${rowId}"] input.monthly-${type}-checkbox`;
                    const monthlyCb = document.querySelector(monthlySelector);
                    if (monthlyCb) {
                        monthlyCb.checked = checked;
                        const statusSelect = monthlyCb.closest('.status-control-group')?.querySelector('.transfer-status-select');
                        if (statusSelect && window.MonthlyModule && typeof MonthlyModule.setTransferStatusStyle === 'function') {
                            MonthlyModule.setTransferStatusStyle(statusSelect);
                        }
                    }

                    // Update Weekly planner (current week)
                    const week = window.currentBudgetWeek;
                    const plannerSelector = `#planner tr[data-expense-id="${rowId}"] td.week-${week}-status-col input.${type}-checkbox`;
                    const plannerCb = document.querySelector(plannerSelector);
                    if (plannerCb) {
                        plannerCb.checked = checked;
                        if (window.PlannerModule) {
                            PlannerModule.updatePlannerRow(plannerCb.closest('tr'));
                            PlannerModule.savePlannerData();
                        }
                    }
                }
            }
        });

        // Copy to actual button functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('#annual .copy-to-actual-btn')) {
                e.preventDefault();
                const group = e.target.parentElement;
                const projectedInput = group.querySelector('.projected-input');
                const actualInput = group.querySelector('.actual-input');
                if (projectedInput && actualInput) {
                    actualInput.value = projectedInput.value;
                    actualInput.classList.add('has-value');
                    this.updateTotals();
                    this.saveAnnualData();
                }
            }
            const linkBtn = e.target.closest('#annual .link-btn');
            if (linkBtn) {
                this.handleLinkClick({
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation(),
                    currentTarget: linkBtn
                });
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const linkIcon = e.target.closest('#annual a.link-icon');
            if (linkIcon) {
                this.handleLinkReedit(e, linkIcon.dataset.expenseId);
            }
        });
    },

    populateCategories() {
        const container = document.getElementById('annual-expense-categories');
        if (!container) return;

        console.log('Populating annual categories...');
        container.innerHTML = '';

        // Create categories from data
        if (this.app.state.data.annual) {
            Object.entries(this.app.state.data.annual).forEach(([categoryKey, expenses]) => {
                const categoryDiv = this.createCategoryElement(categoryKey, expenses);
                container.appendChild(categoryDiv);
            });
        }

        this.updateTotals();
        this.app.emit('dataChanged');
    },

    createCategoryElement(categoryKey, expenses) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.dataset.category = categoryKey;

        const categoryName = this.app.categoryNames[categoryKey] || categoryKey;

        let total = 0;
        const expenseItems = expenses.map((expense, index) => {
            const expId = expense.id || `${categoryKey}-${index}`;
            expense.id = expId;
            const amount = parseFloat(expense.actual || expense.amount || 0);
            total += amount;

            const linkIcon = this.createLinkIcon(expense);

            return `
                <div class="subcategory" data-link="${expense.link || ''}" data-expense-id="${expId}">
                    <input type="date" class="due-date-input" value="${expense.date || ''}">
                    <input class="subcategory-name-input" value="${expense.name || ''}" placeholder="Expense name">
                    <span class="link-container">${linkIcon}</span>
                    ${this.app.createAccountSelect(expense.account)}
                    <div class="status-control-group">
                        <input type="checkbox" class="paid-checkbox" ${expense.paid ? 'checked' : ''}>
                        <input type="checkbox" class="transferred-checkbox" ${expense.transferred ? 'checked' : ''}>
                        <select class="frequency-dropdown${expense.paid ? ' paid' : ''}">
                            <option value="full" ${expense.transferStatus === 'full' ? 'selected' : ''}>Full</option>
                            <option value="quarter" ${expense.transferStatus === 'quarter' ? 'selected' : ''}>¼</option>
                            <option value="half" ${expense.transferStatus === 'half' ? 'selected' : ''}>½</option>
                        </select>
                    </div>
                    <div class="amount-input-group">
                        <input type="number" class="amount-input projected-input ${(expense.projected || 0) > 0 ? 'has-value' : ''}" value="${(expense.projected || amount).toFixed(2)}" step="0.01" placeholder="Projected">
                        <button class="copy-to-actual-btn" title="Copy Projected to Actual">→</button>
                        <input type="number" class="amount-input actual-input ${amount > 0 ? 'has-value' : ''}" value="${amount.toFixed(2)}" step="0.01" placeholder="Actual">
                    </div>
                    <div class="monthly-equivalent">
                        ${this.app.formatCurrency(amount / 12)}/mo
                    </div>
                    <button class="item-delete-btn" onclick="AnnualModule.removeItem(this)">×</button>
                </div>
            `;
        }).join('');

        categoryDiv.innerHTML = `
            <div class="category-header">
                <span class="category-name">${categoryName}</span>
                <div class="category-controls">
                    <span class="category-total">${this.app.formatCurrency(total)}/yr</span>
                    <button class="add-item-btn" onclick="AnnualModule.addItem('${categoryKey}')">+</button>
                </div>
            </div>
            <div class="subcategory-header">
                <span class="header-date">Due Date</span>
                <span class="header-name">Expense Name</span>
                <span style="flex:1.2; text-align:center;">Funds Source</span>
                <span class="header-status">Status</span>
                <div class="header-amounts"><span>Projected</span><span>Actual</span></div>
                <span style="width: 60px; text-align: center;">Monthly</span>
                <span style="width: 22px;"></span>
            </div>
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

    setTransferStatusStyle(element) {
        const row = element.closest('.subcategory');
        if (!row) return;
        const dropdown = row.querySelector('.frequency-dropdown');
        if (!dropdown) return;

        if (element.matches('.frequency-dropdown')) {
            dropdown.className = 'frequency-dropdown';
        }

        const paidChecked = row.querySelector('.paid-checkbox')?.checked;
        const transferredChecked = row.querySelector('.transferred-checkbox')?.checked;

        dropdown.classList.toggle('paid', paidChecked);
        dropdown.classList.toggle('transferred', !paidChecked && transferredChecked);
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
            for (const [cat, list] of Object.entries(this.app.state.data.annual || {})) {
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
                const row = document.querySelector(`#annual .subcategory[data-expense-id="${id}"]`);
                if (row) {
                    row.dataset.link = url;
                    const container = row.querySelector('.link-container');
                    if (container) {
                        container.innerHTML = url
                            ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-icon" title="Click to open, right-click to edit" data-expense-id="${id}">🔗</a>`
                            : this.createLinkIcon({ id });
                    }
                }
                // Save after DOM updates so link persists on navigation
                // Root cause: saving before updating dataset.link lost the new value
                this.saveAnnualData();
            }
        };
        LinkModal.show(expenseId, getUrl, setUrl);
    },

    addItem(categoryKey) {
        const category = document.querySelector(`[data-category="${categoryKey}"]`);
        if (!category) return;

        const subcategoryList = category.querySelector('.subcategory-list');
        if (!subcategoryList) return;

        const newItem = document.createElement('div');
        newItem.className = 'subcategory';
        newItem.dataset.link = '';
        const newId = `${categoryKey}-${Date.now()}`;
        newItem.dataset.expenseId = newId;
        newItem.innerHTML = `
            <input type="date" class="due-date-input" value="">
            <input class="subcategory-name-input" value="" placeholder="New expense name">
            <span class="link-container">${this.createLinkIcon({ id: newId })}</span>
            ${this.app.createAccountSelect()}
            <div class="status-control-group">
                <input type="checkbox" class="paid-checkbox">
                <input type="checkbox" class="transferred-checkbox">
                <select class="frequency-dropdown">
                    <option value="full">Full</option>
                    <option value="quarter">¼</option>
                    <option value="half">½</option>
                </select>
            </div>
            <div class="amount-input-group">
                <input type="number" class="amount-input projected-input" value="0.00" step="0.01" placeholder="Projected">
                <button class="copy-to-actual-btn" title="Copy Projected to Actual">→</button>
                <input type="number" class="amount-input actual-input" value="0.00" step="0.01" placeholder="Actual">
            </div>
            <div class="monthly-equivalent">
                $0.00/mo
            </div>
            <button class="item-delete-btn" onclick="AnnualModule.removeItem(this)">×</button>
        `;

        subcategoryList.appendChild(newItem);

        // Focus on the name input
        const nameInput = newItem.querySelector('.subcategory-name-input');
        if (nameInput) {
            nameInput.focus();
        }

        this.updateTotals();
        this.saveAnnualData();
    },

    removeItem(button) {
        const subcategory = button.closest('.subcategory');
        if (subcategory) {
            subcategory.remove();
            this.updateTotals();
            this.saveAnnualData();
            this.app.emit('dataChanged');
        }
    },

    updateTotals() {
        let totalAnnualExpenses = 0;

        // Update category totals and calculate overall total
        document.querySelectorAll('#annual .category').forEach(categoryEl => {
            const categoryTotal = Array.from(categoryEl.querySelectorAll('.actual-input'))
                .reduce((sum, input) => {
                    const value = parseFloat(input.value) || 0;
                    // Add visual feedback for non-zero values
                    input.classList.toggle('has-value', value > 0);
                    return sum + value;
                }, 0);

            const categoryTotalEl = categoryEl.querySelector('.category-total');
            if (categoryTotalEl) {
                categoryTotalEl.textContent = `${this.app.formatCurrency(categoryTotal)}/yr`;
            }

            totalAnnualExpenses += categoryTotal;
        });

        // Update projected input styling
        document.querySelectorAll('#annual .projected-input').forEach(input => {
            const value = parseFloat(input.value) || 0;
            input.classList.toggle('has-value', value > 0);
        });

        // Update monthly equivalents
        document.querySelectorAll('#annual .monthly-equivalent').forEach(el => {
            const subcategory = el.closest('.subcategory');
            const actualInput = subcategory.querySelector('.actual-input');
            if (actualInput) {
                const annualAmount = parseFloat(actualInput.value) || 0;
                el.textContent = `${this.app.formatCurrency(annualAmount / 12)}/mo`;
            }
        });

        // Update main total
        const monthlyEquivalent = totalAnnualExpenses / 12;
        const totalElement = document.getElementById('annual-total');
        if (totalElement) {
            totalElement.textContent = `Total Annual Expenses: ${this.app.formatCurrency(totalAnnualExpenses)}/yr (${this.app.formatCurrency(monthlyEquivalent)}/mo)`;
        }

        this.updateFundsSummary();
        this.updateSavingsPlan();

        // Emit data change event
        this.app.emit('annualChanged', { totalAnnualExpenses, monthlyEquivalent });
        recalcAnnualTotal();
    },

    updateFundsSummary() {
        const container = document.getElementById('annual-funds-summary');
        if (!container) return;

        const accountTotals = {};
        const multipliers = { none: 0, quarter: 0.25, half: 0.5, full: 1 };

        document.querySelectorAll('#annual .subcategory').forEach(item => {
            const accountSelect = item.querySelector('.account-select');
            const statusSelect = item.querySelector('.frequency-dropdown');
            const projectedInput = item.querySelector('.projected-input');
            const paidCheckbox = item.querySelector('.paid-checkbox');

            if (accountSelect && statusSelect && projectedInput && !paidCheckbox?.checked) {
                const account = accountSelect.value;
                const status = statusSelect.value;
                const amount = parseFloat(projectedInput.value) || 0;

                if (account && !["None", "Split", "TBD"].includes(account) && amount > 0) {
                    const multiplier = multipliers[status] || 0;
                    const monthlyAmount = (amount * multiplier) / 12;

                    if (monthlyAmount > 0) {
                        accountTotals[account] = (accountTotals[account] || 0) + monthlyAmount;
                    }
                }
            }
        });

        let summaryHTML = '<table class="funds-summary-table">';
        if (Object.keys(accountTotals).length === 0) {
            summaryHTML += '<tr><td>No funds need to be set aside based on current statuses.</td></tr>';
        } else {
            Object.entries(accountTotals).forEach(([account, monthlyAmount]) => {
                summaryHTML += `<tr><td>${account}</td><td>${this.app.formatCurrency(monthlyAmount)}/mo</td></tr>`;
            });
        }
        summaryHTML += '</table>';

        container.innerHTML = summaryHTML;
    },

    updateSavingsPlan() {
        const container = document.getElementById('annual-savings-plan');
        if (!container) return;

        const currentISO = this.app.state.currentMonth || new Date().toISOString().substring(0,7);
        const currentMonth = parseInt(currentISO.split('-')[1], 10); // 1-12
        const expensesByMonth = {};

        // Group expenses by month
        document.querySelectorAll('#annual .subcategory').forEach(item => {
            const dateInput = item.querySelector('.due-date-input');
            const nameInput = item.querySelector('.subcategory-name-input');
            const actualInput = item.querySelector('.actual-input');

            if (dateInput && nameInput && actualInput && dateInput.value) {
                const dueDate = new Date(dateInput.value);
                const month = dueDate.getMonth() + 1;
                const amount = parseFloat(actualInput.value) || 0;

                if (amount > 0) {
                    if (!expensesByMonth[month]) {
                        expensesByMonth[month] = [];
                    }
                    expensesByMonth[month].push({
                        name: nameInput.value,
                        amount: amount,
                        monthsToSave: Math.max(1, (month - currentMonth + 12) % 12) || 1 // Ensure positive months to save
                    });
                }
            }
        });

        // Create savings plan table
        let planHTML = '<table class="data-table" style="margin-top: 10px;"><thead><tr><th>Month</th><th>Expenses Due</th><th>Monthly Savings Needed</th></tr></thead><tbody>';

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < 12; i++) {
            const month = (currentMonth + i - 1) % 12 + 1; // Start from current month
            const monthExpenses = expensesByMonth[month] || [];
            const monthName = monthNames[month - 1];

            if (monthExpenses.length > 0) {
                const totalAmount = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const monthsToSave = monthExpenses[0].monthsToSave; // Use monthsToSave from the first expense
                const monthlySavings = totalAmount / monthsToSave;

                const expensesList = monthExpenses.map(exp =>
                    `${exp.name} (${this.app.formatCurrency(exp.amount)})`
                ).join(', ');

                planHTML += `
                    <tr>
                        <td><strong>${monthName}</strong></td>
                        <td style="text-align: left;">${expensesList}</td>
                        <td><strong>${this.app.formatCurrency(monthlySavings)}</strong></td>
                    </tr>
                `;
            }
        }

        if (Object.keys(expensesByMonth).length === 0) {
            planHTML += '<tr><td colspan="3" style="text-align: center; color: #666;">No annual expenses with due dates set.</td></tr>';
        }

        planHTML += '</tbody></table>';
        container.innerHTML = planHTML;
    },

    resetFunding() {
        document.querySelectorAll('#annual .projected-input').forEach(input => {
            input.value = "0.00";
            input.classList.remove('has-value');
        });
        this.updateTotals();
        this.saveAnnualData();
    },

    resetStatuses() {
        document.querySelectorAll('#annual .frequency-dropdown').forEach(select => {
            select.value = "full";
            this.setTransferStatusStyle(select);
        });
        document.querySelectorAll('#annual .paid-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateTotals();
        this.saveAnnualData();
    },

    refreshData() {
        console.log('Refreshing annual data...');
        this.forceDataLoad();
        this.populateCategories();
    },

    saveAnnualData() {
        const annualData = {};

        document.querySelectorAll('#annual .category').forEach(categoryEl => {
            const categoryKey = categoryEl.dataset.category;
            if (!categoryKey) return;

            const expenses = [];
            categoryEl.querySelectorAll('.subcategory').forEach(item => {
                const dateInput = item.querySelector('.due-date-input');
                const nameInput = item.querySelector('.subcategory-name-input');
                const accountSelect = item.querySelector('.account-select');
                const statusSelect = item.querySelector('.frequency-dropdown');
                const projectedInput = item.querySelector('.projected-input');
                const actualInput = item.querySelector('.actual-input');
                const paidCheckbox = item.querySelector('.paid-checkbox');
                const transferredCheckbox = item.querySelector('.transferred-checkbox');

                if (nameInput && nameInput.value.trim()) {
                    expenses.push({
                        id: item.dataset.expenseId || `${categoryKey}-${Date.now()}`,
                        date: dateInput ? dateInput.value : '',
                        name: nameInput.value,
                        account: accountSelect ? accountSelect.value : '',
                        link: item.dataset.link || '',
                        transferStatus: statusSelect ? statusSelect.value : 'full',
                        projected: parseFloat(projectedInput.value) || 0,
                        actual: parseFloat(actualInput.value) || 0,
                        amount: parseFloat(actualInput.value) || 0, // For backward compatibility
                        paid: paidCheckbox ? paidCheckbox.checked : false,
                        transferred: transferredCheckbox ? transferredCheckbox.checked : false
                    });
                }
            });

            annualData[categoryKey] = expenses;
        });

        this.app.state.data.annual = annualData;
        this.app.saveData();
        this.app.emit('dataChanged');
    },

    exportAnnualCSV() {
        // Ensure we capture latest input before exporting
        this.saveAnnualData();
        let csvContent = 'Category,Due Date,Expense Name,Account,Status,Projected,Actual,Monthly Equivalent,Paid\n';

        Object.entries(this.app.state.data.annual || {}).forEach(([categoryKey, expenses]) => {
            const categoryName = this.app.categoryNames[categoryKey] || categoryKey;

            expenses.forEach(expense => {
                const monthlyEquivalent = (parseFloat(expense.actual || expense.amount || 0) / 12).toFixed(2);
                csvContent += `"${categoryName}","${expense.date || ''}","${expense.name || ''}","${expense.account || ''}","${expense.transferStatus || 'none'}",${(expense.projected || 0).toFixed(2)},${(expense.actual || expense.amount || 0).toFixed(2)},${monthlyEquivalent},${expense.paid ? 'Yes' : 'No'}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annual-expenses-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Register the module
(function () {
    function registerModule() {
        if (typeof BudgetApp !== 'undefined') {
            console.log('Registering AnnualModule...');
            BudgetApp.registerModule('annual', AnnualModule);
        } else {
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
window.AnnualModule = AnnualModule;

// Toggle dropdown color & recalc total when “Paid” changes
function onAnnualPaidChange(e) {
    AnnualModule.setTransferStatusStyle(e.target);
    recalcAnnualTotal();
}

function onAnnualTransferredChange(e) {
    AnnualModule.setTransferStatusStyle(e.target);
    recalcAnnualTotal();
}

function recalcAnnualTotal() {
    let total = 0;
    document.querySelectorAll('#annual-expense-categories .subcategory').forEach(row => {
        const paid = row.querySelector('.paid-checkbox');
        if (!paid || !paid.checked) {
            const amt = parseFloat(row.querySelector('.actual-input')?.value) || 0;
            total += amt;
        }
    });
    const totalEl = document.getElementById('annual-total');
    if (totalEl) totalEl.innerText = total.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#annual-expense-categories .paid-checkbox')
        .forEach(cb => {
            AnnualModule.setTransferStatusStyle(cb);
            cb.addEventListener('change', onAnnualPaidChange);
        });
    document.querySelectorAll('#annual-expense-categories .transferred-checkbox')
        .forEach(cb => {
            AnnualModule.setTransferStatusStyle(cb);
            cb.addEventListener('change', onAnnualTransferredChange);
        });
    recalcAnnualTotal();
});
