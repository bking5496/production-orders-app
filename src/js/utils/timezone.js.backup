// timezone.js - South African Standard Time (SAST) Utility Functions
// SAST is UTC+2 year-round (no daylight saving time)

/**
 * Timezone configuration for South African Standard Time
 */
export const TIMEZONE_CONFIG = {
    name: 'SAST',
    fullName: 'South African Standard Time',
    offset: '+02:00',
    offsetMinutes: 120, // 2 hours * 60 minutes
    offsetHours: 2
};

/**
 * Get the current SAST time
 * @returns {Date} Current date and time in SAST
 */
export const getCurrentSASTTime = () => {
    const now = new Date();
    return convertToSAST(now);
};

/**
 * Convert UTC date to SAST
 * @param {Date|string} utcDate - UTC date to convert
 * @returns {Date} Date converted to SAST
 */
export const convertToSAST = (utcDate) => {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided');
    }
    
    // Add 2 hours (120 minutes) to UTC time to get SAST
    return new Date(date.getTime() + (TIMEZONE_CONFIG.offsetMinutes * 60 * 1000));
};

/**
 * Convert SAST date to UTC
 * @param {Date|string} sastDate - SAST date to convert
 * @returns {Date} Date converted to UTC
 */
export const convertSASTToUTC = (sastDate) => {
    const date = new Date(sastDate);
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided');
    }
    
    // Subtract 2 hours (120 minutes) from SAST time to get UTC
    return new Date(date.getTime() - (TIMEZONE_CONFIG.offsetMinutes * 60 * 1000));
};

/**
 * Format date for SAST timezone display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string with SAST indicator
 */
export const formatSASTDate = (date, options = {}) => {
    const {
        includeTime = true,
        includeSeconds = false,
        includeTimezone = true,
        dateStyle = 'medium',
        timeStyle = 'short',
        locale = 'en-ZA' // South African English
    } = options;
    
    const sastDate = convertToSAST(date);
    
    let formatOptions = {};
    
    if (dateStyle && timeStyle && includeTime) {
        formatOptions = {
            dateStyle,
            timeStyle: includeSeconds ? 'medium' : timeStyle
        };
    } else {
        formatOptions = {
            year: 'numeric',
            month: dateStyle === 'short' ? '2-digit' : 'long',
            day: '2-digit'
        };
        
        if (includeTime) {
            formatOptions.hour = '2-digit';
            formatOptions.minute = '2-digit';
            if (includeSeconds) {
                formatOptions.second = '2-digit';
            }
            formatOptions.hour12 = false; // Use 24-hour format
        }
    }
    
    const formatter = new Intl.DateTimeFormat(locale, formatOptions);
    let formatted = formatter.format(sastDate);
    
    if (includeTimezone) {
        formatted += ` (${TIMEZONE_CONFIG.name})`;
    }
    
    return formatted;
};

/**
 * Get SAST time for HTML datetime-local input
 * @param {Date|string} date - Date to format (optional, defaults to current time)
 * @returns {string} ISO string formatted for datetime-local input in SAST
 */
export const getSASTDateTimeLocal = (date = null) => {
    const sastDate = date ? convertToSAST(date) : getCurrentSASTTime();
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = sastDate.getFullYear();
    const month = String(sastDate.getMonth() + 1).padStart(2, '0');
    const day = String(sastDate.getDate()).padStart(2, '0');
    const hours = String(sastDate.getHours()).padStart(2, '0');
    const minutes = String(sastDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get SAST time for HTML date input
 * @param {Date|string} date - Date to format (optional, defaults to current time)
 * @returns {string} ISO date string formatted for date input in SAST
 */
export const getSASTDateOnly = (date = null) => {
    const sastDate = date ? convertToSAST(date) : getCurrentSASTTime();
    
    // Format as YYYY-MM-DD for date input
    const year = sastDate.getFullYear();
    const month = String(sastDate.getMonth() + 1).padStart(2, '0');
    const day = String(sastDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

/**
 * Get SAST time for HTML time input
 * @param {Date|string} date - Date to format (optional, defaults to current time)
 * @returns {string} Time string formatted for time input in SAST
 */
export const getSASTTimeOnly = (date = null) => {
    const sastDate = date ? convertToSAST(date) : getCurrentSASTTime();
    
    // Format as HH:mm for time input
    const hours = String(sastDate.getHours()).padStart(2, '0');
    const minutes = String(sastDate.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
};

/**
 * Parse datetime-local input value as SAST and convert to UTC
 * @param {string} datetimeLocalValue - Value from datetime-local input
 * @returns {Date} UTC date
 */
export const parseSASTDateTimeLocal = (datetimeLocalValue) => {
    if (!datetimeLocalValue) return null;
    
    // Datetime-local format: YYYY-MM-DDTHH:mm
    const sastDate = new Date(datetimeLocalValue);
    return convertSASTToUTC(sastDate);
};

/**
 * Get relative time string in SAST
 * @param {Date|string} date - Date to get relative time for
 * @returns {string} Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getSASTRelativeTime = (date) => {
    const sastDate = convertToSAST(date);
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
        return formatSASTDate(date, { includeTime: false, includeTimezone: false });
    }
};

/**
 * Get business hours information for SAST
 * @returns {Object} Business hours configuration
 */
export const getSASTBusinessHours = () => {
    return {
        timezone: TIMEZONE_CONFIG.name,
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: '08:00',
        endTime: '17:00',
        lunchStart: '12:00',
        lunchEnd: '13:00'
    };
};

/**
 * Check if a SAST time falls within business hours
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if within business hours
 */
export const isWithinSASTBusinessHours = (date) => {
    const sastDate = convertToSAST(date);
    const dayOfWeek = sastDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = sastDate.getHours();
    const minutes = sastDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const businessHours = getSASTBusinessHours();
    
    // Check if it's a work day
    if (!businessHours.workDays.includes(dayOfWeek)) {
        return false;
    }
    
    // Convert business hours to minutes
    const startMinutes = parseInt(businessHours.startTime.split(':')[0]) * 60 + 
                        parseInt(businessHours.startTime.split(':')[1]);
    const endMinutes = parseInt(businessHours.endTime.split(':')[0]) * 60 + 
                      parseInt(businessHours.endTime.split(':')[1]);
    const lunchStartMinutes = parseInt(businessHours.lunchStart.split(':')[0]) * 60 + 
                             parseInt(businessHours.lunchStart.split(':')[1]);
    const lunchEndMinutes = parseInt(businessHours.lunchEnd.split(':')[0]) * 60 + 
                           parseInt(businessHours.lunchEnd.split(':')[1]);
    
    // Check if within working hours but not during lunch
    return (timeInMinutes >= startMinutes && timeInMinutes <= endMinutes) &&
           !(timeInMinutes >= lunchStartMinutes && timeInMinutes <= lunchEndMinutes);
};

/**
 * Get next business day in SAST
 * @param {Date|string} date - Starting date (optional, defaults to current time)
 * @returns {Date} Next business day in SAST
 */
export const getNextSASTBusinessDay = (date = null) => {
    let sastDate = date ? convertToSAST(date) : getCurrentSASTTime();
    const businessHours = getSASTBusinessHours();
    
    do {
        sastDate.setDate(sastDate.getDate() + 1);
    } while (!businessHours.workDays.includes(sastDate.getDay()));
    
    return sastDate;
};

/**
 * Format duration in a human-readable way
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (milliseconds) => {
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
};

/**
 * Get SAST timezone offset string for API calls
 * @returns {string} Timezone offset string (+02:00)
 */
export const getSASTOffset = () => {
    return TIMEZONE_CONFIG.offset;
};

/**
 * Create a new Date object set to SAST timezone
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @param {number} hours - Hours (optional, default 0)
 * @param {number} minutes - Minutes (optional, default 0)
 * @param {number} seconds - Seconds (optional, default 0)
 * @returns {Date} Date object in SAST
 */
export const createSASTDate = (year, month, day, hours = 0, minutes = 0, seconds = 0) => {
    // Create UTC date and then convert to SAST
    const utcDate = new Date(Date.UTC(year, month, day, hours - TIMEZONE_CONFIG.offsetHours, minutes, seconds));
    return convertToSAST(utcDate);
};

// Export all functions as default object as well
export default {
    TIMEZONE_CONFIG,
    getCurrentSASTTime,
    convertToSAST,
    convertSASTToUTC,
    formatSASTDate,
    getSASTDateTimeLocal,
    getSASTDateOnly,
    getSASTTimeOnly,
    parseSASTDateTimeLocal,
    getSASTRelativeTime,
    getSASTBusinessHours,
    isWithinSASTBusinessHours,
    getNextSASTBusinessDay,
    formatDuration,
    getSASTOffset,
    createSASTDate
};