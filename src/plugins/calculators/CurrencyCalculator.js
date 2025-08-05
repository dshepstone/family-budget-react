// src/plugins/calculators/CurrencyCalculator.js
import * as math from 'mathjs';

// Configure mathjs for precise decimal calculations
const mathConfig = math.create(math.all, {
  number: 'BigNumber',
  precision: 64
});

export class CurrencyCalculator {
  constructor(precision = 2) {
    this.precision = precision;
    this.math = mathConfig;
  }

  // Basic arithmetic operations
  add(...amounts) {
    try {
      const values = amounts.map(amount => this.math.bignumber(this.parseAmount(amount)));
      const result = values.reduce((sum, value) => this.math.add(sum, value));
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Currency addition error:', error);
      return 0;
    }
  }

  subtract(amount1, amount2) {
    try {
      const val1 = this.math.bignumber(this.parseAmount(amount1));
      const val2 = this.math.bignumber(this.parseAmount(amount2));
      const result = this.math.subtract(val1, val2);
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Currency subtraction error:', error);
      return 0;
    }
  }

  multiply(amount, multiplier) {
    try {
      const val1 = this.math.bignumber(this.parseAmount(amount));
      const val2 = this.math.bignumber(multiplier);
      const result = this.math.multiply(val1, val2);
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Currency multiplication error:', error);
      return 0;
    }
  }

  divide(amount, divisor) {
    try {
      if (divisor === 0) return 0;
      const val1 = this.math.bignumber(this.parseAmount(amount));
      const val2 = this.math.bignumber(divisor);
      const result = this.math.divide(val1, val2);
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Currency division error:', error);
      return 0;
    }
  }

  // Calculate percentage
  percentage(amount, percent) {
    try {
      const val = this.math.bignumber(this.parseAmount(amount));
      const pct = this.math.bignumber(percent);
      const result = this.math.multiply(val, this.math.divide(pct, 100));
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Percentage calculation error:', error);
      return 0;
    }
  }

  // Calculate what percentage one amount is of another
  percentageOf(part, whole) {
    try {
      if (whole === 0) return 0;
      const partVal = this.math.bignumber(this.parseAmount(part));
      const wholeVal = this.math.bignumber(this.parseAmount(whole));
      const result = this.math.multiply(this.math.divide(partVal, wholeVal), 100);
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Percentage of calculation error:', error);
      return 0;
    }
  }

  // Compound interest calculation
  compoundInterest(principal, rate, time, compoundingFrequency = 12) {
    try {
      const p = this.math.bignumber(this.parseAmount(principal));
      const r = this.math.bignumber(rate / 100);
      const n = this.math.bignumber(compoundingFrequency);
      const t = this.math.bignumber(time);

      // A = P(1 + r/n)^(nt)
      const ratePerPeriod = this.math.divide(r, n);
      const onePlusRate = this.math.add(1, ratePerPeriod);
      const exponent = this.math.multiply(n, t);
      const compoundFactor = this.math.pow(onePlusRate, exponent);
      const result = this.math.multiply(p, compoundFactor);

      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Compound interest calculation error:', error);
      return 0;
    }
  }

  // Simple interest calculation
  simpleInterest(principal, rate, time) {
    try {
      const p = this.math.bignumber(this.parseAmount(principal));
      const r = this.math.bignumber(rate / 100);
      const t = this.math.bignumber(time);

      // I = P * r * t
      const interest = this.math.multiply(this.math.multiply(p, r), t);
      return this.roundToPrecision(interest);
    } catch (error) {
      console.error('Simple interest calculation error:', error);
      return 0;
    }
  }

  // Monthly payment calculation for loans
  monthlyPayment(principal, annualRate, years) {
    try {
      if (annualRate === 0) {
        return this.divide(principal, years * 12);
      }

      const p = this.math.bignumber(this.parseAmount(principal));
      const monthlyRate = this.math.bignumber(annualRate / 100 / 12);
      const numPayments = this.math.bignumber(years * 12);

      // M = P * [r(1+r)^n] / [(1+r)^n - 1]
      const onePlusRate = this.math.add(1, monthlyRate);
      const powered = this.math.pow(onePlusRate, numPayments);
      const numerator = this.math.multiply(monthlyRate, powered);
      const denominator = this.math.subtract(powered, 1);
      const payment = this.math.multiply(p, this.math.divide(numerator, denominator));

      return this.roundToPrecision(payment);
    } catch (error) {
      console.error('Monthly payment calculation error:', error);
      return 0;
    }
  }

  // Budget allocation calculations
  allocateByPercentage(totalAmount, percentages) {
    try {
      const total = this.math.bignumber(this.parseAmount(totalAmount));
      const allocations = {};

      Object.entries(percentages).forEach(([category, percentage]) => {
        const pct = this.math.bignumber(percentage);
        const allocation = this.math.multiply(total, this.math.divide(pct, 100));
        allocations[category] = this.roundToPrecision(allocation);
      });

      return allocations;
    } catch (error) {
      console.error('Budget allocation error:', error);
      return {};
    }
  }

  // Calculate savings needed for a goal
  savingsGoal(targetAmount, currentSavings, monthsToGoal) {
    try {
      const target = this.math.bignumber(this.parseAmount(targetAmount));
      const current = this.math.bignumber(this.parseAmount(currentSavings));
      const months = this.math.bignumber(monthsToGoal);

      const remaining = this.math.subtract(target, current);
      const monthlyRequired = this.math.divide(remaining, months);

      return this.roundToPrecision(monthlyRequired);
    } catch (error) {
      console.error('Savings goal calculation error:', error);
      return 0;
    }
  }

  // Currency conversion
  convertCurrency(amount, exchangeRate) {
    try {
      const val = this.math.bignumber(this.parseAmount(amount));
      const rate = this.math.bignumber(exchangeRate);
      const result = this.math.multiply(val, rate);
      return this.roundToPrecision(result);
    } catch (error) {
      console.error('Currency conversion error:', error);
      return 0;
    }
  }

  // Tax calculations
  calculateTax(amount, taxRate) {
    try {
      const val = this.math.bignumber(this.parseAmount(amount));
      const rate = this.math.bignumber(taxRate / 100);
      const tax = this.math.multiply(val, rate);
      return this.roundToPrecision(tax);
    } catch (error) {
      console.error('Tax calculation error:', error);
      return 0;
    }
  }

  // After-tax amount
  afterTax(amount, taxRate) {
    try {
      const val = this.parseAmount(amount);
      const tax = this.calculateTax(val, taxRate);
      return this.subtract(val, tax);
    } catch (error) {
      console.error('After-tax calculation error:', error);
      return 0;
    }
  }

  // Annual to monthly conversion
  annualToMonthly(annualAmount) {
    return this.divide(annualAmount, 12);
  }

  // Monthly to annual conversion
  monthlyToAnnual(monthlyAmount) {
    return this.multiply(monthlyAmount, 12);
  }

  // Weekly to monthly conversion
  weeklyToMonthly(weeklyAmount) {
    return this.multiply(weeklyAmount, 52 / 12);
  }

  // Daily to monthly conversion
  dailyToMonthly(dailyAmount) {
    return this.multiply(dailyAmount, 365.25 / 12);
  }

  // Statistical calculations for budgets
  calculateAverage(amounts) {
    try {
      if (amounts.length === 0) return 0;
      const total = this.add(...amounts);
      return this.divide(total, amounts.length);
    } catch (error) {
      console.error('Average calculation error:', error);
      return 0;
    }
  }

  calculateMedian(amounts) {
    try {
      if (amounts.length === 0) return 0;
      const sorted = amounts.map(a => this.parseAmount(a)).sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      
      if (sorted.length % 2 === 0) {
        return this.divide(this.add(sorted[middle - 1], sorted[middle]), 2);
      } else {
        return sorted[middle];
      }
    } catch (error) {
      console.error('Median calculation error:', error);
      return 0;
    }
  }

  // Utility methods
  parseAmount(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  roundToPrecision(value) {
    try {
      const rounded = this.math.round(value, this.precision);
      return parseFloat(rounded.toString());
    } catch (error) {
      console.error('Rounding error:', error);
      return 0;
    }
  }

  formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    try {
      const numericAmount = this.parseAmount(amount);
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: this.precision,
        maximumFractionDigits: this.precision
      }).format(numericAmount);
    } catch (error) {
      return `$${this.parseAmount(amount).toFixed(this.precision)}`;
    }
  }

  // Validation methods
  isValidAmount(amount) {
    const parsed = this.parseAmount(amount);
    return !isNaN(parsed) && parsed >= 0;
  }

  isPositive(amount) {
    return this.parseAmount(amount) > 0;
  }

  isNegative(amount) {
    return this.parseAmount(amount) < 0;
  }

  isZero(amount) {
    return this.parseAmount(amount) === 0;
  }

  // Comparison methods
  isEqual(amount1, amount2) {
    const val1 = this.parseAmount(amount1);
    const val2 = this.parseAmount(amount2);
    return Math.abs(val1 - val2) < Math.pow(10, -this.precision);
  }

  isGreater(amount1, amount2) {
    return this.parseAmount(amount1) > this.parseAmount(amount2);
  }

  isLess(amount1, amount2) {
    return this.parseAmount(amount1) < this.parseAmount(amount2);
  }
}

// Create a default instance
export const currencyCalculator = new CurrencyCalculator();

// Export individual functions for convenience
export const {
  add,
  subtract,
  multiply,
  divide,
  percentage,
  percentageOf,
  compoundInterest,
  simpleInterest,
  monthlyPayment,
  allocateByPercentage,
  savingsGoal,
  convertCurrency,
  calculateTax,
  afterTax,
  annualToMonthly,
  monthlyToAnnual,
  weeklyToMonthly,
  dailyToMonthly,
  calculateAverage,
  calculateMedian,
  parseAmount,
  formatCurrency,
  isValidAmount,
  isPositive,
  isNegative,
  isZero,
  isEqual,
  isGreater,
  isLess
} = currencyCalculator;