// Time Module Selector - Automatically selects the correct timezone utilities
// Based on the database configuration (SQLite vs PostgreSQL)

// Check if we're using PostgreSQL
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let timeModule;

if (DB_TYPE === 'postgresql') {
    // Use PostgreSQL timezone utilities
    console.log('🐘 Loading PostgreSQL timezone utilities');
    try {
        timeModule = require('./postgresql-time.js');
    } catch (error) {
        console.warn('PostgreSQL time module not found, falling back to SQLite utilities');
        timeModule = require('../utils/timezone.js');
    }
} else {
    // Use SQLite timezone utilities (legacy)
    console.log('📁 Loading SQLite timezone utilities');
    timeModule = require('../utils/timezone.js');
}

// Export all time utilities
export const {
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
    TIMEZONE_CONFIG,
    
    // Legacy SQLite functions (may be undefined in PostgreSQL mode)
    toSAST,
    getSASTTimestamp,
    convertToSAST,
    formatSASTDateTime,
    formatSASTTime
} = timeModule.default || timeModule;

// Default export for compatibility
export default timeModule.default || timeModule;