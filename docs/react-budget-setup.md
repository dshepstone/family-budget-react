# React Budget Application - Complete Setup Guide

## Step-by-Step Setup

### 1. Create React App
```bash
npx create-react-app family-budget-react
cd family-budget-react
```

### 2. Install Required Dependencies
```bash
npm install @lexical/react @lexical/plain-text @lexical/selection @lexical/utils lexical
npm install lucide-react recharts lodash
npm install papaparse
npm install mathjs
```

### 3. Create Directory Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components
│   ├── calculators/     # Calculator plugins
│   └── charts/          # Chart components
├── pages/               # Main application pages
├── context/             # Context providers
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── plugins/             # Plugin system
├── styles/              # CSS modules
└── data/                # Data management
```

## Complete File Directory Structure

### Root Files
- `package.json` - Dependencies and scripts
- `src/index.js` - Application entry point
- `src/App.js` - Main application component

### Context & State Management
- `src/context/BudgetContext.js` - Shared state management
- `src/context/ThemeContext.js` - Theme management
- `src/hooks/useBudgetCalculations.js` - Calculation hooks
- `src/hooks/useLocalStorage.js` - Data persistence

### Pages
- `src/pages/HomePage.js` - Dashboard overview
- `src/pages/IncomePage.js` - Income management
- `src/pages/MonthlyExpensesPage.js` - Monthly expenses
- `src/pages/AnnualExpensesPage.js` - Annual expenses
- `src/pages/WeeklyPlannerPage.js` - Weekly planning
- `src/pages/ImportExportPage.js` - Data management
- `src/pages/LinksPage.js` - Useful links

### Components
- `src/components/Layout/Navigation.js` - Navigation bar
- `src/components/Layout/Header.js` - Application header
- `src/components/ui/Button.js` - Reusable button component
- `src/components/ui/Card.js` - Card container
- `src/components/ui/Modal.js` - Modal dialogs
- `src/components/ui/Input.js` - Form inputs
- `src/components/CategoryManager.js` - Category management
- `src/components/ExpenseItem.js` - Individual expense row
- `src/components/SummaryCards.js` - Dashboard summary
- `src/components/NotificationCenter.js` - Alerts and notifications

### Calculators & Plugins
- `src/plugins/calculators/CurrencyCalculator.js` - Currency calculations
- `src/plugins/calculators/DateCalculator.js` - Date utilities
- `src/plugins/calculators/InterestCalculator.js` - Interest calculations
- `src/plugins/textEditor/LexicalEditor.js` - Rich text editor
- `src/plugins/importExport/JSONHandler.js` - JSON import/export
- `src/plugins/importExport/CSVHandler.js` - CSV import/export
- `src/plugins/printing/PrintManager.js` - Print functionality

### Charts & Visualizations
- `src/components/charts/CashFlowChart.js` - Cash flow visualization
- `src/components/charts/ExpenseBreakdown.js` - Expense pie chart
- `src/components/charts/TrendChart.js` - Trend analysis

### Utilities & Data
- `src/utils/formatters.js` - Data formatting utilities
- `src/utils/validators.js` - Input validation
- `src/utils/constants.js` - Application constants
- `src/data/defaultData.js` - Default application data
- `src/data/categories.js` - Expense categories

### Styles
- `src/styles/globals.css` - Global styles
- `src/styles/themes.css` - Theme definitions
- `src/styles/components.css` - Component styles
- `src/styles/responsive.css` - Responsive design

## Key Features Implementation

### 1. Modular Plugin System
Each calculator and editor is implemented as a separate plugin that can be easily maintained and updated.

### 2. Live Updates via Context
The BudgetContext provides real-time state updates across all components using React's Context API and useReducer.

### 3. Lexical Integration
Rich text editing capabilities for notes and descriptions using Facebook's Lexical editor.

### 4. Import/Export System
Comprehensive data management with JSON/CSV support and application state preservation.

### 5. Responsive Design
Mobile-first approach with CSS Grid and Flexbox for optimal display on all devices.

## Development Workflow

1. Start with `npm start`
2. All components are hot-reloadable
3. State changes propagate automatically
4. Print functionality works in development
5. Export/import preserves all application state

## File Naming Convention
All React files use PascalCase (e.g., `BudgetContext.js`)
All utility files use camelCase (e.g., `formatters.js`)
All style files use kebab-case (e.g., `components.css`)

## Verification Checklist

After setup, verify these components work:

### Core Functionality ✅
- [ ] Dashboard loads with summary cards
- [ ] Income management (add/edit/delete)
- [ ] Monthly expenses by category
- [ ] Annual expenses with frequency options
- [ ] Weekly planner with cash flow
- [ ] Data import/export (JSON/CSV)
- [ ] Links management
- [ ] Real-time calculations across all pages
- [ ] Theme switching (light/dark)
- [ ] Responsive design on mobile/tablet

### Advanced Features ✅
- [ ] Lexical rich text editor for notes
- [ ] Currency calculator with precision
- [ ] Notification system for due dates
- [ ] Print functionality for reports
- [ ] Local storage persistence
- [ ] Data validation and error handling
- [ ] Keyboard shortcuts (Ctrl+S, Ctrl+P)

### Plugin System ✅
- [ ] Modular calculator plugins
- [ ] Rich text editor integration
- [ ] Chart components (Recharts)
- [ ] CSV/JSON handling (Papaparse)
- [ ] Mathematical precision (MathJS)

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Production Deployment

1. Run `npm run build`
2. Deploy the `build` folder to your web server
3. Ensure all routes point to `index.html` for SPA routing
4. Set up HTTPS for security (especially for financial data)

This React version maintains 100% feature parity with your original HTML application while adding modern development practices, better maintainability, and enhanced user experience.