/**
 * Core Time Module for Production Orders App
 * Handles all timezone operations for SAST (UTC+2)
 * Version: 1.0.0
 */

// SAST Timezone offset in milliseconds (2 hours)
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Get current SAST time as Date object
 * @returns {Date} Current time in SAST
 */
export function getCurrentSASTTime() {
  return new Date(Date.now() + SAST_OFFSET_MS);
}

/**
 * Convert any date/time to SAST
 * @param {string|Date} dateTime - Input date/time
 * @returns {Date} Date object adjusted to SAST
 */
export function toSAST(dateTime) {
  if (!dateTime) return null;
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  return new Date(date.getTime() + SAST_OFFSET_MS);
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
  return sastDate.toISOString().split('T')[0];
}

/**
 * Format time only in SAST
 * @param {string|Date} dateTime - Input date/time
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function formatSASTTime(dateTime) {
  if (!dateTime) return '';
  
  return formatSASTDateTime(dateTime, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
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
  return new Date(targetDate.getTime() + SAST_OFFSET_MS).toISOString();
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
  return Date.now() + SAST_OFFSET_MS;
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

// Default export for convenience
export default {
  getCurrentSASTTime,
  toSAST,
  formatSASTDateTime,
  formatSASTDate,
  formatSASTTime,
  getCurrentSASTISOString,
  toSASTDatabaseString,
  calculateDurationMinutes,
  getSASTTimestamp,
  isSASTToday,
  getSASTDayRange,
  SAST_OFFSET_MS
};