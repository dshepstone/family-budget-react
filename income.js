// Income Module - FIXED
// js/modules/income.js

const IncomeModule = {
    name: 'income',

    init(app) {
        this.app = app;
        this.createIncomePage();
        this.setupEventListeners();
       
  

        // Listen for data changes
        app.on('dataChanged', () => {
            // Refresh the table when data is loaded from a project file
            this.populateIncomeTable();
            this.updateTotals();
        });
        app.on('monthChanged', () => this.updateWeekHeaders());
        app.on('pageChanged', (pageId) => {
            if (pageId === 'income') {
                this.updateTotals();
            }
        });
    },

    createIncomePage() {
        const pageContainer = document.getElementById('page-content');

        const incomePage = document.createElement('div');
        incomePage.id = 'income';
        incomePage.className = 'page';

        incomePage.innerHTML = `
            <h2 class="page-title">💵 Monthly Income</h2>
            
            <div class="page-controls">
                <div>
                    <label><input type="checkbox" class="week-toggle" data-week="5"> Show Week 5</label>
                </div>
                <div>
                    <button class="btn btn-secondary" onclick="BudgetApp.startPagePrint('#income')">🖨️ Print this Page</button>
                </div>
            </div>
            
            <div style="overflow-x:auto;">
                <table class="data-table" id="income-table">
                    <thead>
                        <tr>
                            <th style="width: 30%;">Pay Source</th>
                            <th class="week-1-col" id="income-week-1-header">Week 1</th>
                            <th class="week-2-col" id="income-week-2-header">Week 2</th>
                            <th class="week-3-col" id="income-week-3-header">Week 3</th>
                            <th class="week-4-col" id="income-week-4-header">Week 4</th>
                            <th class="week-5-col" id="income-week-5-header" style="display: none;">Week 5</th>
                            <th style="width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody id="income-body">
                        </tbody>
                    <tfoot>
                        <tr class="table-footer">
                            <td><strong>Weekly Totals</strong></td>
                            <td class="week-1-col"><strong id="income-week1-total">$0.00</strong></td>
                            <td class="week-2-col"><strong id="income-week2-total">$0.00</strong></td>
                            <td class="week-3-col"><strong id="income-week3-total">$0.00</strong></td>
                            <td class="week-4-col"><strong id="income-week4-total">$0.00</strong></td>
                            <td class="week-5-col" style="display:none;"><strong id="income-week5-total">$0.00</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="page-actions">
                <button class="btn btn-success" onclick="IncomeModule.addIncomeRow()">+ Add Income Source</button>
            </div>
            
            <div class="total income-total" id="total-income">Total Monthly Income: $0.00</div>
        `;

        pageContainer.appendChild(incomePage);
        this.populateIncomeTable();
        this.updateWeekHeaders();
        this.setupWeekToggle();
    },

    setupEventListeners() {
        // Listen for income input changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('#income .income-input, #income .income-source-input')) {
                this.updateTotals();
                this.saveIncomeData();
            }
        });

        // Week 5 toggle
        document.addEventListener('change', (e) => {
            if (e.target.matches('.week-toggle[data-week="5"]')) {
                this.toggleWeek5(e.target.checked);
            }
        });
    },

    populateIncomeTable() {
        const tbody = document.getElementById('income-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Populate from saved data
        if (this.app.state.data.income && this.app.state.data.income.length > 0) {
            this.app.state.data.income.forEach(incomeItem => {
                const row = this.createIncomeRow(incomeItem);
                tbody.appendChild(row);
            });
        }

        this.updateTotals();
    },

    createIncomeRow(incomeData) {
        const row = document.createElement('tr');

        const weeks = incomeData.weeks || [0, 0, 0, 0, 0];

        row.innerHTML = `
            <td class="income-source">
                <input class="income-source-input" value="${incomeData.source || ''}" placeholder="Income Source">
            </td>
            ${weeks.map((amount, index) => `
                <td class="week-${index + 1}-col">
                    <input type="number" class="table-input income-input" 
                           data-week="${index + 1}" 
                           value="${parseFloat(amount || 0).toFixed(2)}" 
                           step="0.01" 
                           placeholder="0.00">
                </td>
            `).join('')}
            <td>
                <button class="item-delete-btn" onclick="IncomeModule.removeIncomeRow(this)">×</button>
            </td>
        `;

        return row;
    },

    addIncomeRow() {
        const tbody = document.getElementById('income-body');
        if (!tbody) return;

        const newIncomeData = { source: '', weeks: [0, 0, 0, 0, 0] };
        const row = this.createIncomeRow(newIncomeData);
        tbody.appendChild(row);

        // Focus on the source input
        const sourceInput = row.querySelector('.income-source-input');
        if (sourceInput) {
            sourceInput.focus();
        }

        this.saveIncomeData();
    },

    removeIncomeRow(button) {
        const row = button.closest('tr');
        if (row) {
            row.remove();
            this.updateTotals();
            this.saveIncomeData();
        }
    },

    updateTotals() {
        const weeklyTotals = [0, 0, 0, 0, 0];

        // Calculate totals for each week
        document.querySelectorAll('#income .income-input').forEach(input => {
            const week = parseInt(input.dataset.week) - 1;
            const amount = parseFloat(input.value) || 0;
            if (week >= 0 && week < 5) { // Ensure week index is valid
                 weeklyTotals[week] += amount;
            }
        });

        // Update week total displays
        weeklyTotals.forEach((total, index) => {
            const totalElement = document.getElementById(`income-week${index + 1}-total`);
            if (totalElement) {
                totalElement.textContent = this.app.formatCurrency(total);
            }
        });

        // Calculate and display monthly total
        const monthlyTotal = weeklyTotals.reduce((sum, week) => sum + week, 0);
        const totalElement = document.getElementById('total-income');
        if (totalElement) {
            totalElement.textContent = `Total Monthly Income: ${this.app.formatCurrency(monthlyTotal)}`;
        }

        // Emit data change event for other modules
        this.app.emit('incomeChanged', { weeklyTotals, monthlyTotal });
    },

    // FIXED: Robust date parsing that handles both formats
    updateWeekHeaders() {
        const budgetMonthSelect = document.getElementById('budget-month');
        if (!budgetMonthSelect) return;

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
                    console.warn('Invalid budget month format:', budgetMonthValue);
                    return;
                }

                const [monthName, yearStr] = parts;
                year = Number(yearStr);

                // Convert month name to number
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                month = monthNames.indexOf(monthName) + 1;

                if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
                    console.warn('Invalid month name or year:', monthName, yearStr);
                    return;
                }
            }

            console.log('💵 Income parsed date:', { budgetMonthValue, year, month });

        } catch (error) {
            console.error('❌ Error parsing budget month in income:', error);
            return;
        }

        for (let week = 1; week <= 5; week++) {
            const headerElement = document.getElementById(`income-week-${week}-header`);
            if (!headerElement) continue;

            try {
                // Calculate week start date (first day of the month)
                const firstDayOfMonth = new Date(year, month - 1, 1);
                // Calculate the start of the week for the current week number.
                // Assuming weeks start on the 1st, 8th, 15th, 22nd, 29th for simplicity.
                const weekStartDate = new Date(year, month - 1, 1 + (week - 1) * 7);

                // Check if this week falls within the currently selected month
                // Only display if the start date is in the selected month OR if it's week 1.
                // This prevents displaying parts of the next month if week 5 starts late.
                if (weekStartDate.getMonth() !== month - 1 && week > 1) {
                    // Hide weeks that do not fully start in the current month
                    document.querySelectorAll(`.week-${week}-col`).forEach(el => {
                        el.style.display = 'none';
                    });
                    continue;
                }

                // Calculate week end date
                const weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekStartDate.getDate() + 6);

                // Ensure week end does not go past month end
                const lastDayOfMonth = new Date(year, month, 0); // Day 0 of next month is last day of current month
                if (weekEndDate > lastDayOfMonth) {
                    weekEndDate.setTime(lastDayOfMonth.getTime());
                }

                // Format dates
                const startStr = weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endStr = weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                headerElement.innerHTML = `
                    <div>Week ${week}</div>
                    <div style="font-size: 0.8rem; font-weight: normal; color: var(--table-header-text-muted);">
                        ${startStr} - ${endStr}
                    </div>
                `;

                // Show the week columns
                document.querySelectorAll(`.week-${week}-col`).forEach(el => {
                    el.style.display = 'table-cell';
                });

            } catch (error) {
                console.error(`❌ Error updating income week ${week}:`, error);
            }
        }
    },

    setupWeekToggle() {
        const toggle = document.querySelector('.week-toggle[data-week="5"]');
        if (toggle) {
            // Set initial state from localStorage
            const week5Visible = localStorage.getItem('income-week5-visible') === 'true';
            toggle.checked = week5Visible;
            this.toggleWeek5(week5Visible);
        }
    },

    toggleWeek5(show) {
        const displayStyle = show ? 'table-cell' : 'none';
        document.querySelectorAll('.week-5-col').forEach(el => {
            el.style.display = displayStyle;
        });

        // Save preference to localStorage
        localStorage.setItem('income-week5-visible', show.toString());
    },

    saveIncomeData() {
        const incomeData = [];

        document.querySelectorAll('#income-body tr').forEach(row => {
            const sourceInput = row.querySelector('.income-source-input');
            const weekInputs = row.querySelectorAll('.income-input');

            if (sourceInput) {
                const weeks = Array.from(weekInputs).map(input => parseFloat(input.value) || 0);
                incomeData.push({
                    source: sourceInput.value || '',
                    weeks: weeks
                });
            }
        });

        this.app.state.data.income = incomeData;
        this.app.saveData();
        this.app.emit('dataChanged');
        this.app.emit('incomeChanged');
    },

    // Export income data to CSV
    exportIncomeCSV() {
        let csvContent = 'Income Source,Week 1,Week 2,Week 3,Week 4,Week 5,Monthly Total\n';

        const incomeData = this.app.state.data.income || [];
        incomeData.forEach(income => {
            const weeks = income.weeks || [0, 0, 0, 0, 0];
            const monthlyTotal = weeks.reduce((sum, week) => sum + week, 0);

            csvContent += `"${income.source.replace(/"/g, '""')}",${weeks.map(w => w.toFixed(2)).join(',')},${monthlyTotal.toFixed(2)}\n`;
        });

        // Add totals row
        const weeklyTotals = [0, 0, 0, 0, 0];
        incomeData.forEach(income => {
            (income.weeks || []).forEach((week, index) => {
                weeklyTotals[index] += parseFloat(week) || 0;
            });
        });
        const grandTotal = weeklyTotals.reduce((sum, week) => sum + week, 0);

        csvContent += `"TOTALS",${weeklyTotals.map(t => t.toFixed(2)).join(',')},${grandTotal.toFixed(2)}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'income-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    },

    // Import income data from CSV
    importIncomeCSV(file) {
        if (typeof Papa === 'undefined') {
            alert('CSV parsing library not loaded. Please refresh the page and try again.');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.processIncomeCSV(results.data);
            },
            error: (error) => {
                alert('Error parsing CSV: ' + error.message);
            }
        });
    },

    processIncomeCSV(data) {
        if (!data || data.length === 0) {
            alert('No data found in CSV file.');
            return;
        }

        const newIncomeData = [];

        data.forEach(row => {
            if (row['Income Source'] && row['Income Source'].toUpperCase() !== 'TOTALS') {
                const weeks = [
                    parseFloat(row['Week 1']) || 0,
                    parseFloat(row['Week 2']) || 0,
                    parseFloat(row['Week 3']) || 0,
                    parseFloat(row['Week 4']) || 0,
                    parseFloat(row['Week 5']) || 0
                ];

                newIncomeData.push({
                    source: row['Income Source'],
                    weeks: weeks
                });
            }
        });

        if (newIncomeData.length === 0) {
            alert('No valid income data found in CSV.');
            return;
        }

        // Confirm import
        if (!confirm(`Import ${newIncomeData.length} income sources? This will replace existing income data.`)) {
            return;
        }

        // Update data and refresh display
        this.app.state.data.income = newIncomeData;
        this.app.saveData();
        this.populateIncomeTable();

        alert(`Successfully imported ${newIncomeData.length} income sources.`);
    }
};

// Register the module
if (typeof BudgetApp !== 'undefined') {
    BudgetApp.registerModule('income', IncomeModule);
} else {
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof BudgetApp !== 'undefined') {
            BudgetApp.registerModule('income', IncomeModule);
        }
    });
}

// Make module globally available
window.IncomeModule = IncomeModule;