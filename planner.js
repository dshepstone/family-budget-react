// Complete Weekly Planner Module with Enhanced Styling and Functionality - UPDATED WITH FIXES
// js/modules/planner.js

const PlannerModule = {
    name: 'planner',

    init(app) {
        this.app = app;
        console.log('PlannerModule: Initializing...');

        // SAFETY: Initialize plannerState immediately during init
        if (!this.app.state.data.plannerState) {
            this.app.state.data.plannerState = {};
            console.log('PlannerModule: Initialized plannerState during init to prevent undefined access.');
        }
        try {
            this.createPlannerPage();
            this.setupEventListeners();

            // Force data load after a short delay
            setTimeout(() => {
                console.log('PlannerModule: Attempting forceDataLoad and populatePlannerTable...');
                this.forceDataLoad();
                this.populatePlannerTable();
                console.log('PlannerModule: Initial data population complete.');
            }, 1000);

            // Listen for data changes from other modules
            app.on('dataChanged', () => {
                console.log('PlannerModule: dataChanged event received, updating planner.');
                this.updatePlanner();
            });
            app.on('monthChanged', () => {
                console.log('PlannerModule: monthChanged event received, updating week headers.');
                this.updateWeekHeaders();
            });
            app.on('pageChanged', (pageId) => {
                if (pageId === 'planner') {
                    console.log('PlannerModule: pageChanged to "planner", repopulating table.');
                    this.populatePlannerTable();
                }
            });
            // Listen for specific monthly expense changes from MonthlyModule
            app.on('monthlyExpenseChanged', (data) => {
                console.log('PlannerModule: monthlyExpenseChanged event received, handling update.');
                this.handleMonthlyExpenseChange(data);
            });
            // Listen for status changes from MonthlyModule
            app.on('monthlyStatusChanged', (data) => {
                console.log('PlannerModule: monthlyStatusChanged event received, updating planner.');
                this.handleMonthlyStatusChange(data);
            });
            console.log('PlannerModule: Initialization complete and event listeners set up.');
        } catch (error) {
            console.error('PlannerModule: Error during init:', error);
        }
    },

    forceDataLoad() {
        console.log('PlannerModule: Forcing data load...');
        if (!this.app.state.data.monthly || Object.keys(this.app.state.data.monthly).length === 0) {
            const categories = ['housing','taxes','utilities','insurance','banking','loans','credit','subscriptions','food','transportation','medical','personal','shopping','dog','maintenance','gifts'];
            this.app.state.data.monthly = {};
            categories.forEach(c => this.app.state.data.monthly[c] = []);
        }

        if (!this.app.state.data.plannerState) {
            this.app.state.data.plannerState = {};
            console.log('PlannerModule: Initialized empty plannerState.');
        }
        console.log('PlannerModule: Data load complete.');
    },

    createPlannerPage() {
        console.log('PlannerModule: Creating planner page HTML...');
        const pageContainer = document.getElementById('page-content');
        if (!pageContainer) {
            console.error('PlannerModule: #page-content element not found. Cannot create page.');
            return;
        }

        const plannerPage = document.createElement('div');
        plannerPage.id = 'planner';
        plannerPage.className = 'page';

        plannerPage.innerHTML = `
            <h2 class="page-title">📋 Weekly Budget Planner</h2>
            
            <div class="page-controls">
                <div id="week-visibility-controls">
                    <span style="font-weight: 600;">Show Weeks:</span>
                    <label><input type="checkbox" class="week-toggle" data-week="1" checked> 1</label>
                    <label><input type="checkbox" class="week-toggle" data-week="2" checked> 2</label>
                    <label><input type="checkbox" class="week-toggle" data-week="3" checked> 3</label>
                    <label><input type="checkbox" class="week-toggle" data-week="4" checked> 4</label>
                    <label class="week-5-toggle-label">
                        <input type="checkbox" class="week-toggle" data-week="5" checked> 5
                    </label>
                </div>
                <div>
                    <button class="btn btn-danger btn-sm" onclick="PlannerModule.resetAllWeeks()">Reset All Weeks</button>
                    <button class="btn btn-success" onclick="PlannerModule.refreshData()">🔄 Refresh Data</button>
                    <button class="btn btn-secondary" onclick="BudgetApp.startPagePrint('#planner')">🖨️ Print this Page</button>
                </div>
            </div>
            
            <div id="planner-table-container" style="overflow-x:auto; width: 100%;">
                <table class="data-table show-week5" id="planner-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Expense Category</th>
                            <th>Monthly Actual</th>
                            <th id="planner-th-week-1" class="week-1-col">Week 1</th>
                            <th class="week-1-status-col status-header">Status</th>
                            <th id="planner-th-week-2" class="week-2-col">Week 2</th>
                            <th class="week-2-status-col status-header">Status</th>
                            <th id="planner-th-week-3" class="week-3-col">Week 3</th>
                            <th class="week-3-status-col status-header">Status</th>
                            <th id="planner-th-week-4" class="week-4-col">Week 4</th>
                            <th class="week-4-status-col status-header">Status</th>
                            <th id="planner-th-week-5" class="week-5-col">Week 5</th>
                            <th class="week-5-status-col status-header">Status</th>
                            <th>Remaining Balance</th>
                        </tr>
                    </thead>
                    <tbody id="planner-body">
                        <!-- Planner rows will be populated here -->
                    </tbody>
                    <tfoot>
                        <tr class="table-footer">
                            <td><strong>Weekly Expense Totals</strong></td>
                            <td></td>
                            <td class="week-1-col">
                                <strong id="planner-week1-total">$0.00</strong>
                                <div id="week1-footer-balance" style="font-size: 0.8em; font-weight: normal;">$0.00</div>
                            </td>
                            <td class="week-1-status-col"></td>
                            <td class="week-2-col">
                                <strong id="planner-week2-total">$0.00</strong>
                                <div id="week2-footer-balance" style="font-size: 0.8em; font-weight: normal;">$0.00</div>
                            </td>
                            <td class="week-2-status-col"></td>
                            <td class="week-3-col">
                                <strong id="planner-week3-total">$0.00</strong>
                                <div id="week3-footer-balance" style="font-size: 0.8em; font-weight: normal;">$0.00</div>
                            </td>
                            <td class="week-3-status-col"></td>
                            <td class="week-4-col">
                                <strong id="planner-week4-total">$0.00</strong>
                                <div id="week4-footer-balance" style="font-size: 0.8em; font-weight: normal;">$0.00</div>
                            </td>
                            <td class="week-4-status-col"></td>
                            <td class="week-5-col">
                                <strong id="planner-week5-total">$0.00</strong>
                                <div id="week5-footer-balance" style="font-size: 0.8em; font-weight: normal;">$0.00</div>
                            </td>
                            <td class="week-5-status-col"></td>
                            <td><strong id="planner-grand-total">$0.00</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 6px;">
                <h3 style="margin-bottom: 10px; color: #2c3e50;">📊 Weekly Cash Flow Analysis</h3>
                <div id="cash-flow-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">
                    <div class="week-1-col" style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Week 1 Balance</div>
                        <div id="week1-balance" style="font-size: 1.2rem; font-weight: bold;">$0.00</div>
                    </div>
                    <div class="week-2-col" style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Week 2 Balance</div>
                        <div id="week2-balance" style="font-size: 1.2rem; font-weight: bold;">$0.00</div>
                    </div>
                    <div class="week-3-col" style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Week 3 Balance</div>
                        <div id="week3-balance" style="font-size: 1.2rem; font-weight: bold;">$0.00</div>
                    </div>
                    <div class="week-4-col" style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Week 4 Balance</div>
                        <div id="week4-balance" style="font-size: 1.2rem; font-weight: bold;">$0.00</div>
                    </div>
                    <div class="week-5-col" style="text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">Week 5 Balance</div>
                        <div id="week5-balance" style="font-size: 1.2rem; font-weight: bold;">$0.00</div>
                    </div>
                </div>
            </div>
        `;

        pageContainer.appendChild(plannerPage);
        this.updateWeekHeaders();
        this.setDefaultWeekVisibility();
        console.log('PlannerModule: Planner page HTML appended to DOM.');
    },

    setupEventListeners() {
        console.log('PlannerModule: Setting up event listeners...');

        // Week visibility toggles
        document.addEventListener('change', (e) => {
            if (e.target.matches('.week-toggle')) {
                try {
                    this.updateColumnVisibility(e.target.dataset.week, e.target.checked);
                } catch (error) {
                    console.error('PlannerModule: Error in week-toggle change listener:', error);
                }
            }
        });

        // FIXED: Planner input changes - prevent page jumping
        document.addEventListener('input', (e) => {
            if (e.target.matches('#planner .table-input')) {
                try {
                    // Prevent page jumping by stopping default behavior
                    e.preventDefault();

                    // Apply cell styling based on value
                    this.applyCellStyling(e.target);

                    this.updatePlannerRow(e.target.closest('tr'));
                    this.savePlannerData();
                } catch (error) {
                    console.error('PlannerModule: Error in table-input event listener:', error);
                }
            }
        });

        // FIXED: Prevent form submission behavior that causes page jumping
        document.addEventListener('submit', (e) => {
            if (e.target.closest('#planner-table')) {
                e.preventDefault();
                return false;
            }
        });

        // FIXED: Prevent Enter key from causing page jumps
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.matches('#planner .table-input')) {
                e.preventDefault();
                e.target.blur(); // Remove focus from input
                return false;
            }
        });

        // Action dropdown handling
        document.addEventListener('change', (e) => {
            if (e.target.matches('.planner-action-select')) {
                try {
                    // Prevent page jumping
                    e.preventDefault();
                    this.handlePlannerAction(e.target);
                } catch (error) {
                    console.error('PlannerModule: Error in planner-action-select change listener:', error);
                }
            }
        });

        // Gear icon triggers dropdown
        document.addEventListener('click', (e) => {
            if (e.target.matches('.planner-input-group .action-icon')) {
                const select = e.target.closest('.planner-input-group').querySelector('.planner-action-select');
                if (select) {
                    if (select.showPicker) {
                        select.showPicker();
                    } else {
                        select.focus();
                        select.click();
                    }
                }
            }
        });

        // Status checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('#planner .transferred-checkbox, #planner .paid-checkbox')) {
                try {
                    this.updatePlannerRow(e.target.closest('tr'));
                    this.savePlannerData();
                    this.notifyStatusChange(e.target);
                } catch (error) {
                    console.error('PlannerModule: Error in checkbox change listener:', error);
                }
            }
        });
        console.log('PlannerModule: All event listeners registered.');
    },

    // NEW: Apply styling to cells based on their values
    applyCellStyling(inputElement) {
        const value = parseFloat(inputElement.value) || 0;

        // Remove existing styling classes
        inputElement.classList.remove('has-value', 'zero-value');

        if (value > 0) {
            inputElement.classList.add('has-value');
            inputElement.style.backgroundColor = '#e8f5e8'; // Light green background
            inputElement.style.borderColor = '#28a745'; // Green border
            inputElement.style.fontWeight = '600'; // Bold text
            inputElement.style.color = '#155724'; // Dark green text
        } else {
            inputElement.classList.add('zero-value');
            inputElement.style.backgroundColor = ''; // Default background
            inputElement.style.borderColor = ''; // Default border
            inputElement.style.fontWeight = ''; // Default font weight
            inputElement.style.color = ''; // Default color
        }
    },

    // NEW: Apply styling to all existing cells
    applyAllCellStyling() {
        document.querySelectorAll('#planner-table .table-input').forEach(input => {
            this.applyCellStyling(input);
        });
    },

    handleMonthlyExpenseChange(data) {
        console.log('PlannerModule: Received monthlyExpenseChanged event.', data);
        // This is where you re-populate or update a specific row based on the change.
        // Find the row in the planner table that matches the changed expense and update it.
        const plannerRows = document.querySelectorAll('#planner-body tr:not(.category-row)');
        const targetRow = Array.from(plannerRows).find(row => {
            const expenseNameEl = row.querySelector('.expense-name');
            return expenseNameEl && expenseNameEl.textContent === data.name;
        });

        if (targetRow) {
            console.log(`PlannerModule: Found planner row for ${data.name}, updating.`);
            // Update the monthly actual value in the planner table
            const monthlyActualCell = targetRow.cells[1];
            if (monthlyActualCell) {
                monthlyActualCell.innerHTML = `<b>${this.app.formatCurrency(parseFloat(data.input.value) || 0)}</b>`;
            }

            // Also, update the distribution for this specific expense if its actual value changed
            // This is handled by core.js:updatePlannerRowFromMonthlyChange, which calls planner's updatePlannerRow
            // So, just ensure updatePlannerRow is called for this row.
            this.updatePlannerRow(targetRow);
            this.savePlannerData();
        } else {
            console.log(`PlannerModule: No matching planner row found for "${data.name}".`);
            // If no row is found, it might mean a new expense was added or it's not yet in planner,
            // so a full repopulation might be needed.
            this.populatePlannerTable();
        }
    },

    notifyStatusChange(checkboxElement) {
        const row = checkboxElement.closest('tr');
        const expenseName = row.querySelector('.expense-name')?.textContent;
        const expenseId = row.dataset.expenseId;
        const week = parseInt(checkboxElement.dataset.week, 10) || window.currentBudgetWeek;

        if (expenseName && this.app.emit) {
            const transferredCheckboxes = row.querySelectorAll('.transferred-checkbox');
            const paidCheckboxes = row.querySelectorAll('.paid-checkbox');

            const hasTransferred = Array.from(transferredCheckboxes).some(cb => cb.checked);
            const hasPaid = Array.from(paidCheckboxes).some(cb => cb.checked);

            const transferred = checkboxElement.classList.contains('transferred-checkbox')
                ? checkboxElement.checked
                : row.querySelector(`td.week-${week}-status-col input.transferred-checkbox`)?.checked;
            const paid = checkboxElement.classList.contains('paid-checkbox')
                ? checkboxElement.checked
                : row.querySelector(`td.week-${week}-status-col input.paid-checkbox`)?.checked;

            this.app.emit('plannerStatusChanged', {
                expenseName,
                expenseId,
                week,
                transferred,
                paid,
                hasTransferred,
                hasPaid,
                source: 'planner'
            });
        }
    },

    handleMonthlyStatusChange(data) {
        if (data.source === 'monthly') {
            const week = data.week || window.currentBudgetWeek;
            const row = document.querySelector(`#planner tr[data-expense-id="${data.expenseId}"]`);
            if (row) {
                const transferredCb = row.querySelector(`td.week-${week}-status-col input.transferred-checkbox`);
                const paidCb = row.querySelector(`td.week-${week}-status-col input.paid-checkbox`);

                if (transferredCb) transferredCb.checked = !!data.transferred;
                if (paidCb) paidCb.checked = !!data.paid;

                this.updatePlannerRow(row);
                this.savePlannerData();
            }
        }
    },

    populatePlannerTable() {
        const tbody = document.getElementById('planner-body');
        if (!tbody) {
            console.warn('PlannerModule: planner-body container not found during populatePlannerTable.');
            return;
        }

        console.log('PlannerModule: Populating planner table with data.');
        tbody.innerHTML = '';

        // Check if we have monthly data
        if (!this.app.state.data.monthly || Object.keys(this.app.state.data.monthly).length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: #666;">No monthly expense data found. Please add expenses in the Monthly Expenses tab first.</td></tr>';
            console.log('PlannerModule: No monthly data, displaying empty message.');
            return;
        }

        // Create rows for each category
        Object.entries(this.app.state.data.monthly).forEach(([categoryKey, expenses]) => {
            // Add category header
            const categoryRow = document.createElement('tr');
            categoryRow.className = 'category-row';
            const categoryName = this.app.categoryNames?.[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
            categoryRow.innerHTML = `<td colspan="13">${categoryName}</td>`;
            tbody.appendChild(categoryRow);

            // Add expense rows
            expenses.forEach(expense => {
                if (expense.name && expense.name.trim() !== '') {
                    try {
                        const row = this.createPlannerRow(expense);
                        tbody.appendChild(row);
                    } catch (error) {
                        console.error(`PlannerModule: Error creating planner row for expense ${expense.name}:`, error);
                    }
                }
            });
        });

        // Apply styling to all cells after population
        setTimeout(() => {
            this.applyAllCellStyling();
        }, 100);

        this.updatePlannerTotals();
        console.log('PlannerModule: Planner table populated.');
    },

    createPlannerRow(expense) {
        const row = document.createElement('tr');
        row.dataset.expenseId = expense.id || '';
        const monthlyAmount = parseFloat(expense.actual || expense.amount || 0);

        // Get saved planner data for this expense
        // Ensure plannerState exists before accessing it
        const savedData = this.app.state.data.plannerState?.[expense.name] || {};
        // If no saved data for weeks, distribute based on expense details
        const weeklyValues = savedData.weeks || this.app.distributeExpenseForPlanner(expense.name, monthlyAmount, expense.date);
        const transferredValues = savedData.transferred || Array(5).fill(false);
        const paidValues = savedData.paid || Array(5).fill(false);

        // ENHANCED: Updated dropdown with reset option and all values
        const weekInputs = weeklyValues.map((value, index) => `
            <td class="week-${index + 1}-col">
                <div class="planner-input-group">
                    <input type="number" class="table-input" 
                           value="${value.toFixed(2)}" 
                           step="0.01" 
                           data-expense="${expense.name}"
                           data-week="${index + 1}">
                    <select class="planner-action-select" title="Quick Actions">
                        <option value="">Quick Fill</option>
                        <option value="reset">Reset to $0</option>
                        <option value="full">Full Amount ($${monthlyAmount.toFixed(2)})</option>
                        <option value="half">Half Amount ($${(monthlyAmount / 2).toFixed(2)})</option>
                        <option value="quarter">Quarter Amount ($${(monthlyAmount / 4).toFixed(2)})</option>
                    </select>
                    <i class="fa fa-cog action-icon" aria-hidden="true"></i>
                </div>
            </td>
            <td class="week-${index + 1}-status-col status-cell">
                <input type="checkbox" class="transferred-checkbox" data-week="${index + 1}" title="Transferred" ${transferredValues[index] ? 'checked' : ''}><br>
                <input type="checkbox" class="paid-checkbox" data-week="${index + 1}" title="Paid" ${paidValues[index] ? 'checked' : ''}>
            </td>
        `).join('');

        const remaining = monthlyAmount - weeklyValues.reduce((sum, val) => sum + val, 0);

        row.innerHTML = `
            <td class="expense-name" style="text-align: left; padding-left: 20px;">${expense.name}</td>
            <td><strong>${this.app.formatCurrency(monthlyAmount)}</strong></td>
            ${weekInputs}
            <td class="remaining-amount" style="font-weight: bold; color: ${Math.abs(remaining) < 0.001 ? 'black' : 'red'};">
                ${this.app.formatCurrency(remaining)}
            </td>
        `;

        return row;
    },

    // This method is now primarily for internal row updates, distribution logic moved to core.js
    // to centralize it for both MonthlyModule changes and initial planner load.
    updatePlannerRow(row) {
        if (!row || row.classList.contains('category-row')) return;

        const expenseName = row.querySelector('.expense-name')?.textContent;
        if (!expenseName) return;

        let weeklySum = 0;
        const weeklyValues = [];
        const transferredValues = [];
        const paidValues = [];

        row.querySelectorAll('.table-input').forEach((input, index) => {
            const value = parseFloat(input.value) || 0;
            weeklyValues.push(value);
            weeklySum += value;

            // Apply styling based on value
            this.applyCellStyling(input);
        });

        row.querySelectorAll('.transferred-checkbox').forEach(cb => {
            transferredValues.push(cb.checked);
        });

        row.querySelectorAll('.paid-checkbox').forEach(cb => {
            paidValues.push(cb.checked);
        });

        const monthlyActual = parseFloat(row.cells[1].textContent.replace(/[^0-9.-]+/g, "")) || 0;
        const difference = monthlyActual - weeklySum;

        const remainingCell = row.querySelector('.remaining-amount');
        if (remainingCell) {
            if (Math.abs(difference) < 0.001) {
                remainingCell.textContent = '$0.00';
                remainingCell.style.color = 'black';
            } else if (difference > 0.001) { // Positive difference, meaning actual > sum of weeks (underspent)
                remainingCell.textContent = '-' + this.app.formatCurrency(difference);
                remainingCell.style.color = 'red';
            } else if (difference < -0.001) { // Negative difference, meaning actual < sum of weeks (overshot)
                remainingCell.textContent = '+' + this.app.formatCurrency(Math.abs(difference));
                remainingCell.style.color = 'red';
            } else {
                remainingCell.textContent = '$0.00';
                remainingCell.style.color = 'black';
            }
        }

        // Save state
        // Ensure plannerState exists
        this.app.state.data.plannerState[expenseName] = {
            weeks: weeklyValues,
            transferred: transferredValues,
            paid: paidValues
        };

        this.updatePlannerTotals();
    },

    handlePlannerAction(selectElement) {
        const action = selectElement.value;
        if (!action) return;

        const row = selectElement.closest('tr');
        const inputField = selectElement.closest('.planner-input-group').querySelector('.table-input');
        const monthlyActualCell = row.cells[1];
        const monthlyActualValue = parseFloat(monthlyActualCell.textContent.replace(/[^0-9.-]+/g, "")) || 0;

        let newValue = 0;

        // ENHANCED: Handle reset option and all amount options
        switch (action) {
            case 'reset':
                newValue = 0;
                break;
            case 'full':
                newValue = monthlyActualValue;
                break;
            case 'half':
                newValue = monthlyActualValue / 2;
                break;
            case 'quarter':
                newValue = monthlyActualValue / 4;
                break;
            default:
                newValue = 0;
        }

        if (inputField) {
            inputField.value = newValue.toFixed(2);
            // Apply styling immediately
            this.applyCellStyling(inputField);
            this.updatePlannerRow(row);
        }

        selectElement.value = ""; // Reset dropdown

        // Prevent any form submission or page navigation
        return false;
    },

    updatePlannerTotals() {
        console.log('PlannerModule: Updating planner totals...');
        const weeklyExpenses = [0, 0, 0, 0, 0];
        const weeklyIncome = this.getWeeklyIncome();

        // Calculate weekly totals
        document.querySelectorAll('#planner-body tr:not(.category-row)').forEach(row => {
            row.querySelectorAll('.table-input').forEach((input, index) => {
                // Ensure the column is visible before including its value in total
                const weekCol = input.closest(`.week-${index + 1}-col`);
                if (weekCol && weekCol.style.display !== 'none') {
                    weeklyExpenses[index] += parseFloat(input.value) || 0;
                }
            });
        });

        // Update weekly total displays
        weeklyExpenses.forEach((total, index) => {
            const totalElement = document.getElementById(`planner-week${index + 1}-total`);
            if (totalElement) {
                totalElement.textContent = this.app.formatCurrency(total);
            }

            // Update footer balance (income - expenses for that week)
            const footerBalanceEl = document.getElementById(`week${index + 1}-footer-balance`);
            if (footerBalanceEl) {
                const footerBalance = weeklyIncome[index] - total;
                if (footerBalance >= 0) {
                    footerBalanceEl.textContent = this.app.formatCurrency(footerBalance);
                    footerBalanceEl.style.color = 'green';
                } else {
                    footerBalanceEl.textContent = '-' + this.app.formatCurrency(Math.abs(footerBalance));
                    footerBalanceEl.style.color = 'red';
                }
            }

            // Update cash flow analysis (also income - expenses)
            const balanceElement = document.getElementById(`week${index + 1}-balance`);
            if (balanceElement) {
                const balance = weeklyIncome[index] - total;
                balanceElement.textContent = this.app.formatCurrency(balance);
                balanceElement.className = balance >= 0 ? 'positive' : 'negative';
            }
        });

        // Update grand total of all expenses planned
        const grandTotal = weeklyExpenses.reduce((sum, week) => sum + week, 0);
        const grandTotalElement = document.getElementById('planner-grand-total');
        if (grandTotalElement) {
            grandTotalElement.textContent = this.app.formatCurrency(grandTotal);
        }
        console.log('PlannerModule: Planner totals updated.');
    },

    getWeeklyIncome() {
        // Get income data from the app state
        const weeklyIncome = [0, 0, 0, 0, 0];

        // Ensure income data exists and is an array
        if (this.app.state.data.income && Array.isArray(this.app.state.data.income)) {
            this.app.state.data.income.forEach(income => {
                if (income.weeks && Array.isArray(income.weeks)) {
                    income.weeks.forEach((amount, index) => {
                        if (index < 5) { // Only consider up to 5 weeks
                            weeklyIncome[index] += parseFloat(amount) || 0;
                        }
                    });
                }
            });
        }
        return weeklyIncome;
    },

    // FIXED: Robust date parsing that handles both formats
    updateWeekHeaders() {
        console.log('PlannerModule: Updating week headers...');
        const budgetMonthSelect = document.getElementById('budget-month');
        if (!budgetMonthSelect) {
            console.warn('PlannerModule: budget-month select element not found.');
            return;
        }
        const budgetMonthValue = budgetMonthSelect.value;

        let year, month;

        try {
            if (budgetMonthValue.includes('-')) {
                // ISO format: "2025-06"
                [year, month] = budgetMonthValue.split('-').map(Number);
            } else {
                // Human format: "June 2025"
                const parts = budgetMonthValue.trim().split(' ');
                if (parts.length !== 2) {
                    console.warn('PlannerModule: Invalid budget month format:', budgetMonthValue);
                    return;
                }

                const [monthName, yearStr] = parts;
                year = Number(yearStr);

                // Convert month name to number
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                month = monthNames.indexOf(monthName) + 1;

                if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
                    console.warn('PlannerModule: Invalid month name or year:', monthName, yearStr);
                    return;
                }
            }

            console.log('PlannerModule: Parsed date for headers:', { budgetMonthValue, year, month });

        } catch (error) {
            console.error('PlannerModule: Error parsing budget month in updateWeekHeaders:', error);
            return;
        }

        for (let week = 1; week <= 5; week++) {
            const headerElement = document.getElementById(`planner-th-week-${week}`);
            if (!headerElement) continue;

            try {
                // Calculate week start date (first day of the month)
                const firstDayOfMonth = new Date(year, month - 1, 1);
                // Adjust for the start of the week: get the day of the week (0 for Sunday, 1 for Monday...)
                // For simplicity, let's assume the first day of the month starts Week 1.
                // Week starts at 1, 8, 15, 22, 29.
                const weekStartDate = new Date(year, month - 1, 1 + (week - 1) * 7);


                const weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekStartDate.getDate() + 6);

                // Ensure week end doesn't go past month end
                const monthEnd = new Date(year, month, 0); // Day 0 of next month is last day of current month
                if (weekEndDate > monthEnd) {
                    weekEndDate.setTime(monthEnd.getTime());
                }

                headerElement.innerHTML = `
                    <div>Week ${week}</div>
                    <div class="week-date-range-inputs">
                        <input type="date" class="week-date-start" value="${weekStartDate.toISOString().split('T')[0]}">
                        <input type="date" class="week-date-end" value="${weekEndDate.toISOString().split('T')[0]}">
                    </div>
                    <button class="btn btn-secondary btn-sm reset-week-btn" data-week="${week}" onclick="PlannerModule.resetWeek(${week})">Reset</button>
                `;

                this.updateColumnVisibility(week, true); // Ensure visibility if it's a valid week

            } catch (error) {
                console.error(`PlannerModule: Error updating week ${week} header:`, error);
            }
        }
        this.updatePlannerTotals(); // Recalculate totals as visibility changes
        console.log('PlannerModule: Week headers updated.');
    },

    updateColumnVisibility(week, isVisible) {
        document.querySelectorAll(`.week-${week}-col, .week-${week}-status-col`).forEach(el => {
            el.classList.toggle('hidden', !isVisible);
        });

        // Update checkbox state in week visibility controls
        const checkbox = document.querySelector(`#week-visibility-controls .week-toggle[data-week="${week}"]`);
        if (checkbox) {
            checkbox.checked = isVisible;
        }

        // Update cash flow grid visibility
        document.querySelectorAll(`#cash-flow-grid .week-${week}-col`).forEach(el => {
            el.style.display = isVisible ? 'block' : 'none';
        });

        // Additional handling when toggling Week 5
        if (week === 5) {
            const week5Label = document.querySelector('.week-5-toggle-label');
            if (week5Label) {
                week5Label.style.display = 'flex'; // Always show label if week 5 is toggleable
            }
            const table = document.getElementById('planner-table');
            if (table) {
                table.classList.toggle('show-week5', isVisible);
            }
        }
    },

    setDefaultWeekVisibility() {
        for (let w = 1; w <= 5; w++) {
            this.updateColumnVisibility(w, true);
        }
    },

    toggleWeek5() {
        console.log('PlannerModule: Toggling Week 5 visibility.');
        const week5Checkbox = document.querySelector('.week-toggle[data-week="5"]');
        const isCurrentlyVisible = week5Checkbox ? week5Checkbox.checked : false; // Check the checkbox state
        this.updateColumnVisibility(5, !isCurrentlyVisible);
    },

    resetWeek(weekNumber) {
        if (!confirm(`Are you sure you want to reset all Week ${weekNumber} planned amounts to zero?`)) {
            return;
        }
        console.log(`PlannerModule: Resetting Week ${weekNumber}.`);

        document.querySelectorAll('#planner-body tr:not(.category-row)').forEach(row => {
            const itemName = row.querySelector('.expense-name')?.textContent;
            if (itemName && this.app.state.data.plannerState?.[itemName]) { // Safe access
                this.app.state.data.plannerState[itemName].weeks[weekNumber - 1] = 0;
            }
            const input = row.querySelector(`.week-${weekNumber}-col .table-input`);
            if (input) {
                input.value = "0.00";
                this.applyCellStyling(input); // Apply styling after reset
                this.updatePlannerRow(row);
            }
        });
        this.savePlannerData();
        console.log(`PlannerModule: Week ${weekNumber} reset and data saved.`);
    },

    resetAllWeeks() {
        if (!confirm('Are you sure you want to reset all weekly planned amounts to zero?')) {
            return;
        }
        console.log('PlannerModule: Resetting all weeks.');

        document.querySelectorAll('#planner-body tr:not(.category-row)').forEach(row => {
            row.querySelectorAll('.table-input').forEach(input => {
                input.value = '0.00';
                this.applyCellStyling(input); // Apply styling after reset
            });
            this.updatePlannerRow(row);
        });
        this.savePlannerData();
        console.log('PlannerModule: All weeks reset and data saved.');
    },

    refreshData() {
        console.log('PlannerModule: Refreshing data...');
        this.forceDataLoad();
        this.populatePlannerTable();
    },

    updatePlanner() {
        console.log('PlannerModule: updatePlanner called due to dataChanged event. Repopulating table.');
        this.populatePlannerTable();
    },

    savePlannerData(emitChange = false) {
        console.log('PlannerModule: Saving planner data.');
        // Ensure plannerState is initialized before saving
        if (!this.app.state.data.plannerState) {
            this.app.state.data.plannerState = {};
        }
        // No direct data collection here, as updatePlannerRow handles saving state per row.
        // Just call app.saveData() and emit.
        if (this.app && typeof this.app.saveData === 'function') {
            this.app.saveData();
        } else {
            console.warn('PlannerModule: app.saveData() is not available.');
        }
        if (emitChange && this.app && typeof this.app.emit === 'function') {
            this.app.emit('dataChanged');
        }
        console.log('PlannerModule: Planner data saved' + (emitChange ? ' and dataChanged emitted.' : '.'));
    }
};

// CSS Styles for improved cell styling and preventing page jumping
const plannerStyles = document.createElement('style');
plannerStyles.textContent = `
    /* Cell styling for values > 0 */
    .table-input.has-value {
        background-color: #e8f5e8 !important;
        border-color: #28a745 !important;
        font-weight: 600 !important;
        color: #155724 !important;
    }
    
    .table-input.zero-value {
        background-color: transparent;
        border-color: #dee2e6;
        font-weight: normal;
    }
    
    /* Prevent page jumping on input focus */
    .table-input:focus {
        outline: 2px solid #007bff;
        outline-offset: -1px;
    }
    
    /* Smooth transitions for styling changes */
    .table-input {
        transition: all 0.2s ease;
    }
    
    /* Dropdown styling improvements */
    .planner-input-group {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        position: relative;
    }

    .planner-action-select {
        font-size: 0.75rem;
        padding: 2px 4px;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        background-color: #f8f9fa;
        position: absolute;
        right: 0;
        bottom: 0;
        opacity: 0;
    }

    .planner-input-group .action-icon {
        position: relative;
        align-self: flex-end;
    }
    
    /* Category row styling */
    .category-row {
        background-color: #f8f9fa !important;
        font-weight: bold;
    }
    
    /* Status controls styling */
    .status-cell {
        text-align: center;
        padding: 4px;
    }
    
    .status-cell input[type="checkbox"] {
        margin: 2px;
    }

    .transferred-checkbox:checked {
        accent-color: #ffc107;
    }

    .paid-checkbox:checked {
        accent-color: #28a745;
    }
    
    /* Week date inputs styling */
    .week-date-range-inputs {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 4px 0;
    }
    
    .week-date-start, .week-date-end {
        font-size: 0.7rem;
        padding: 1px 2px;
        border: 1px solid #ccc;
        border-radius: 2px;
    }
    
    /* Reset button styling */
    .reset-week-btn {
        font-size: 0.7rem;
        padding: 2px 4px;
        margin-top: 2px;
    }
    
    /* Cash flow analysis styling */
    .positive {
        color: #27ae60;
    }
    
    .negative {
        color: #e74c3c;
    }
    
    /* Remaining amount styling */
    .remaining-amount {
        font-weight: 600;
    }
`;

// Inject styles when module loads
if (typeof document !== 'undefined') {
    document.head.appendChild(plannerStyles);
}

// Register the module
(function () {
    function registerModule() {
        if (typeof BudgetApp !== 'undefined') {
            console.log('PlannerModule: Registering with BudgetApp...');
            BudgetApp.registerModule('planner', PlannerModule);
        } else {
            console.warn('PlannerModule: BudgetApp not found, retrying registration in 100ms.');
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
window.PlannerModule = PlannerModule;