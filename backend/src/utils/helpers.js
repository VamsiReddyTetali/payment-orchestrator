const crypto = require('crypto');

// Generate ID: prefix + 16 alphanumeric chars
const generateId = (prefix) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
};

// Luhn Algorithm
const validateLuhn = (cardNumber) => {
  const sanitized = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
};

// Card Network Detection
const detectCardNetwork = (cardNumber) => {
  const sanitized = cardNumber.replace(/[\s-]/g, '');
  
  if (/^4/.test(sanitized)) return 'visa';
  if (/^5[1-5]/.test(sanitized)) return 'mastercard';
  if (/^3[47]/.test(sanitized)) return 'amex';
  if (/^60|^65|^8[1-9]/.test(sanitized)) return 'rupay';
  
  return 'unknown';
};

// VPA Validation
const validateVpa = (vpa) => {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(vpa);
};

// Expiry Validation
const validateExpiry = (month, year) => {
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth() + 1;

  let expYear = parseInt(year);
  const expMonth = parseInt(month);

  if (expMonth < 1 || expMonth > 12) return false;

  // Handle 2 digit year
  if (expYear < 100) expYear += 2000;

  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;

  return true;
};

module.exports = {
  generateId,
  validateLuhn,
  detectCardNetwork,
  validateVpa,
  validateExpiry
};