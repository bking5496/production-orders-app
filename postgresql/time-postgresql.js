// Updated Time Module for PostgreSQL Integration
// Replaces manual SAST handling with PostgreSQL timezone support

/**
 * Time utility module for Production Orders App with PostgreSQL
 * Handles South African Standard Time (SAST) timezone operations
 * 
 * Key Changes from SQLite version:
 * - Removed manual +2 hour offset calculations
 * - Uses PostgreSQL's native timezone handling
 * - Simplified timezone conversion logic
 * - Enhanced date formatting with Intl API
 */

// SAST Configuration
const SAST_TIMEZONE = 'Africa/Johannesburg';
const SAST_OFFSET_HOURS = 2;

/**
 * Format date in SAST timezone for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatSASTDate = (date, options = {}) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatSASTDate:', date);
        return '';
    }
    
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: options.includeSeconds ? '2-digit' : undefined,
        timeZone: SAST_TIMEZONE,
        hour12: false
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    try {
        return dateObj.toLocaleString('en-ZA', formatOptions);
    } catch (error) {
        console.error('Date formatting error:', error);
        return dateObj.toISOString();
    }
};

/**
 * Format date for HTML datetime-local input (SAST)
 * @param {Date|string} date - Date to format
 * @returns {string} ISO string formatted for datetime-local input
 */
export const formatForDateTimeInput = (date) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    // Convert to SAST and format for datetime-local input
    try {
        const sastDate = new Date(dateObj.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
        return sastDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    } catch (error) {
        console.error('DateTime input formatting error:', error);
        return '';
    }
};

/**
 * Get current SAST time as ISO string
 * @returns {string} Current SAST time
 */
export const getCurrentSASTTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: SAST_TIMEZONE })).toISOString();
};

/**
 * Calculate duration between two dates in minutes
 * Works with PostgreSQL TIMESTAMPTZ values
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time (defaults to now)
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (startTime, endTime = null) => {
    if (!startTime) return 0;
    
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }
    
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60))); // Convert to minutes
};

/**
 * Format duration in human-readable format
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (durationMinutes) => {
    if (!durationMinutes || durationMinutes < 0) return '0 min';
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
        return `${minutes} min`;
    }
    
    if (minutes === 0) {
        return `${hours}h`;
    }
    
    return `${hours}h ${minutes}m`;
};

/**
 * Check if a date is today (SAST timezone)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today in SAST
 */
export const isToday = (date) => {
    if (!date) return false;
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Compare dates in SAST timezone
    const dateInSAST = new Date(dateObj.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
    const nowInSAST = new Date(now.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
    
    return dateInSAST.toDateString() === nowInSAST.toDateString();
};

/**
 * Parse datetime-local input value and return UTC timestamp
 * @param {string} datetimeLocalValue - Value from datetime-local input
 * @returns {string|null} UTC ISO string for database storage
 */
export const parseDateTimeInput = (datetimeLocalValue) => {
    if (!datetimeLocalValue) return null;
    
    try {
        // Parse as local SAST time and convert to UTC for database
        const sastDate = new Date(datetimeLocalValue);
        
        // Since PostgreSQL handles timezone conversion, we can send the timestamp as-is
        // PostgreSQL will interpret it correctly based on the session timezone setting
        return sastDate.toISOString();
    } catch (error) {
        console.error('DateTime input parsing error:', error);
        return null;
    }
};

/**
 * Format time for display in production timers
 * Shows running time with proper SAST handling
 * @param {Date|string} startTime - Production start time
 * @returns {string} Formatted running time
 */
export const formatProductionTimer = (startTime) => {
    if (!startTime) return '00:00:00';
    
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    
    if (isNaN(start.getTime())) {
        return '00:00:00';
    }
    
    // Calculate duration without manual timezone offset
    // PostgreSQL timestamps are already timezone-aware
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get date range for reports (start and end of day in SAST)
 * @param {Date|string} date - Target date
 * @returns {Object} Start and end timestamps for the day
 */
export const getDayRange = (date) => {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    // Get start and end of day in SAST timezone
    const startOfDay = new Date(targetDate.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
    };
};

/**
 * Enhanced date formatting with relative time
 * @param {Date|string} date - Date to format
 * @param {boolean} includeRelative - Include relative time (e.g., "2 hours ago")
 * @returns {string} Formatted date with optional relative time
 */
export const formatDateWithRelative = (date, includeRelative = true) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formatted = formatSASTDate(dateObj);
    
    if (!includeRelative) return formatted;
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    let relative = '';
    if (diffMinutes < 1) {
        relative = 'just now';
    } else if (diffMinutes < 60) {
        relative = `${diffMinutes} min ago`;
    } else if (diffMinutes < 1440) { // 24 hours
        const hours = Math.floor(diffMinutes / 60);
        relative = `${hours}h ago`;
    } else {
        const days = Math.floor(diffMinutes / 1440);
        relative = `${days}d ago`;
    }
    
    return `${formatted} (${relative})`;
};

/**
 * Timezone configuration for API calls
 * @returns {Object} Timezone configuration
 */
export const getTimezoneConfig = () => {
    return {
        timezone: SAST_TIMEZONE,
        offset: SAST_OFFSET_HOURS,
        displayFormat: 'YYYY-MM-DD HH:mm:ss',
        isoFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    };
};

/**
 * Validate and normalize timestamp from API
 * @param {string} timestamp - Timestamp from PostgreSQL
 * @returns {Date|null} Normalized Date object
 */
export const normalizeTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    try {
        // PostgreSQL returns timezone-aware timestamps
        // Parse directly without manual offset adjustments
        return new Date(timestamp);
    } catch (error) {
        console.error('Timestamp normalization error:', error);
        return null;
    }
};

// Export timezone configuration for external use
export const TIMEZONE_CONFIG = {
    name: 'SAST',
    timezone: SAST_TIMEZONE,
    offset: SAST_OFFSET_HOURS,
    offsetString: '+02:00'
};

export default {
    formatSASTDate,
    formatForDateTimeInput,
    getCurrentSASTTime,
    calculateDuration,
    formatDuration,
    isToday,
    parseDateTimeInput,
    formatProductionTimer,
    getDayRange,
    formatDateWithRelative,
    getTimezoneConfig,
    normalizeTimestamp,
    TIMEZONE_CONFIG
};