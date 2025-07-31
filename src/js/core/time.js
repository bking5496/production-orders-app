/**
 * Core Time Module for Production Orders App
 * Handles all timezone operations for SAST (UTC+2)
 * Version: 2.0.0 - Comprehensive timezone management
 */

// SAST Timezone configuration
export const TIMEZONE_CONFIG = {
  name: 'SAST',
  fullName: 'South African Standard Time',
  offset: '+02:00',
  offsetMinutes: 120, // 2 hours * 60 minutes
  offsetHours: 2,
  offsetMS: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
};

/**
 * Get current SAST time as Date object
 * @returns {Date} Current time in SAST
 */
export function getCurrentSASTTime() {
  return new Date(Date.now() + TIMEZONE_CONFIG.offsetMS);
}

/**
 * Convert any date/time to SAST
 * @param {string|Date} dateTime - Input date/time
 * @returns {Date} Date object adjusted to SAST
 */
export function toSAST(dateTime) {
  if (!dateTime) return null;
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return null;
  return new Date(date.getTime() + TIMEZONE_CONFIG.offsetMS);
}

/**
 * Convert SAST date to UTC
 * @param {Date|string} sastDate - SAST date to convert
 * @returns {Date} Date converted to UTC
 */
export function convertSASTToUTC(sastDate) {
  if (!sastDate) return null;
  const date = new Date(sastDate);
  if (isNaN(date.getTime())) return null;
  return new Date(date.getTime() - TIMEZONE_CONFIG.offsetMS);
}

/**
 * Format date/time for display in SAST
 * @param {string|Date} dateTime - Input date/time
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date/time string
 */
export function formatSASTDateTime(dateTime, options = {}) {
  if (!dateTime) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  const sastDate = toSAST(dateTime);
  
  if (!sastDate) return 'N/A';
  return sastDate.toLocaleString('en-ZA', formatOptions);
}

/**
 * Format date only in SAST
 * @param {string|Date} dateTime - Input date/time
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatSASTDate(dateTime) {
  if (!dateTime) return '';
  
  const sastDate = toSAST(dateTime);
  if (!sastDate) return '';
  return sastDate.toISOString().split('T')[0];
}

/**
 * Format time only in SAST
 * @param {string|Date} dateTime - Input date/time
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function formatSASTTime(dateTime) {
  if (!dateTime) return 'N/A';
  
  const sastDate = toSAST(dateTime);
  if (!sastDate) return 'N/A';
  
  return sastDate.toLocaleString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get SAST time for HTML datetime-local input
 * @param {Date|string} date - Date to format (optional, defaults to current time)
 * @returns {string} ISO string formatted for datetime-local input in SAST
 */
export function getSASTDateTimeLocal(date = null) {
  const sastDate = date ? toSAST(date) : getCurrentSASTTime();
  if (!sastDate) return '';
  
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = sastDate.getFullYear();
  const month = String(sastDate.getMonth() + 1).padStart(2, '0');
  const day = String(sastDate.getDate()).padStart(2, '0');
  const hours = String(sastDate.getHours()).padStart(2, '0');
  const minutes = String(sastDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get SAST date for HTML date input
 * @param {Date|string} date - Date to format (optional, defaults to current time)
 * @returns {string} ISO date string formatted for date input in SAST
 */
export function getSASTDateOnly(date = null) {
  return formatSASTDate(date || getCurrentSASTTime());
}

/**
 * Get current SAST time as ISO string for database storage
 * @returns {string} ISO string with SAST offset applied
 */
export function getCurrentSASTISOString() {
  return getCurrentSASTTime().toISOString();
}

/**
 * Convert SAST date to database format (with +2 hours for storage)
 * Used for datetime('now', '+2 hours') equivalent
 * @param {Date} date - Date in SAST
 * @returns {string} ISO string for database storage
 */
export function toSASTDatabaseString(date = null) {
  const targetDate = date || new Date();
  return new Date(targetDate.getTime() + TIMEZONE_CONFIG.offsetMS).toISOString();
}

/**
 * Calculate duration between two dates in minutes
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time (defaults to current SAST time)
 * @returns {number} Duration in minutes
 */
export function calculateDurationMinutes(startTime, endTime = null) {
  if (!startTime) return 0;
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : getCurrentSASTTime();
  
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Get current SAST timestamp for production timers
 * @returns {number} Timestamp with SAST offset
 */
export function getSASTTimestamp() {
  return Date.now() + TIMEZONE_CONFIG.offsetMS;
}

/**
 * Check if a date is today in SAST
 * @param {string|Date} dateTime - Date to check
 * @returns {boolean} True if date is today in SAST
 */
export function isSASTToday(dateTime) {
  if (!dateTime) return false;
  
  const inputDate = formatSASTDate(dateTime);
  const todayDate = formatSASTDate(getCurrentSASTTime());
  
  return inputDate === todayDate;
}

/**
 * Get start and end of day in SAST for database queries
 * @param {string|Date} date - Target date (defaults to today)
 * @returns {Object} { startOfDay, endOfDay } in ISO format
 */
export function getSASTDayRange(date = null) {
  const targetDate = date ? new Date(date) : getCurrentSASTTime();
  const sastDate = toSAST(targetDate);
  
  const startOfDay = new Date(sastDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(sastDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString()
  };
}

/**
 * Format duration in a human-readable way
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(milliseconds) {
  if (milliseconds < 0) return '0 seconds';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds % 60} second${(seconds % 60) !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Get relative time string in SAST
 * @param {Date|string} date - Date to get relative time for
 * @returns {string} Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getSASTRelativeTime(date) {
  const sastDate = toSAST(date);
  const now = getCurrentSASTTime();
  const diffMs = now.getTime() - sastDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (Math.abs(diffMinutes) < 1) {
    return 'just now';
  } else if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `${diffMinutes} minutes ago` : `in ${Math.abs(diffMinutes)} minutes`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours} hours ago` : `in ${Math.abs(diffHours)} hours`;
  } else if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `${diffDays} days ago` : `in ${Math.abs(diffDays)} days`;
  } else {
    return formatSASTDate(date);
  }
}

// Default export for convenience
export default {
  TIMEZONE_CONFIG,
  getCurrentSASTTime,
  toSAST,
  convertSASTToUTC,
  formatSASTDateTime,
  formatSASTDate,
  formatSASTTime,
  getSASTDateTimeLocal,
  getSASTDateOnly,
  getCurrentSASTISOString,
  toSASTDatabaseString,
  calculateDurationMinutes,
  getSASTTimestamp,
  isSASTToday,
  getSASTDayRange,
  formatDuration,
  getSASTRelativeTime
};