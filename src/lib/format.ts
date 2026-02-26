/**
 * Formatting utilities for consistent display across the application
 */

/**
 * Format currency amount with proper spacing
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'UZS')
 * @returns Formatted string like "1 000 000 UZS"
 */
export const formatCurrency = (amount: number, currency: string = 'UZS'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 UZS';
  }

  // Use space as thousand separator (Uzbekistan standard)
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount).replace(/,/g, ' ') + ` ${currency}`;
};

/**
 * Format phone number in Uzbekistan format
 * @param phone - Phone number (can be with or without +998)
 * @returns Formatted string like "+998 90 123 45 67"
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) {
    return 'N/A';
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already has +, keep it
  if (cleaned.startsWith('+998')) {
    cleaned = cleaned.substring(4); // Remove +998
  } else if (cleaned.startsWith('998')) {
    cleaned = cleaned.substring(3); // Remove 998
  } else if (cleaned.startsWith('8') && cleaned.length === 10) {
    cleaned = cleaned.substring(1); // Remove leading 8
  } else if (cleaned.startsWith('+')) {
    // If has + but not 998, remove it
    cleaned = cleaned.substring(1);
  }

  // Now cleaned should be 9 digits (operator code + number)
  if (cleaned.length === 9) {
    return `+998 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`;
  }

  // If doesn't match expected format, return original with basic formatting
  if (cleaned.length >= 7) {
    // Try to format anyway
    return `+998 ${cleaned.substring(0, Math.min(2, cleaned.length))} ${cleaned.substring(2, Math.min(5, cleaned.length))} ${cleaned.substring(5, Math.min(7, cleaned.length))}${cleaned.length > 7 ? ' ' + cleaned.substring(7) : ''}`;
  }

  // Return original if can't format
  return phone;
};

/**
 * Format number with thousand separators
 * @param value - Number to format
 * @returns Formatted string like "1 000 000"
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value).replace(/,/g, ' ');
};

