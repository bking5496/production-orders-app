/**
 * Enhanced PostgreSQL Time Module for Production Orders App
 * Leverages PostgreSQL native timezone handling for SAST (Africa/Johannesburg)
 * Version: 3.0.0 - PostgreSQL Native Implementation
 */

// PostgreSQL timezone configuration
export const POSTGRESQL_TIMEZONE_CONFIG = {
  name: 'SAST',
  fullName: 'South African Standard Time',
  postgresTimezone: 'Africa/Johannesburg',
  offset: '+02:00',
  offsetHours: 2,
  offsetMS: 2 * 60 * 60 * 1000, // For backward compatibility
  
  // PostgreSQL-specific configurations
  dateStyle: 'ISO, DMY',
  intervalStyle: 'postgres'
};

/**
 * Database helper for timezone-aware queries
 * Uses PostgreSQL's native AT TIME ZONE functionality
 */
export class PostgreSQLTimeHelper {
  constructor(dbPool) {
    this.pool = dbPool;
  }
  
  /**
   * Get current SAST time using PostgreSQL
   * @returns {Promise<Date>} Current SAST time
   */
  async getCurrentSASTTime() {
    const result = await this.pool.query(`
      SELECT NOW() AT TIME ZONE $1 as sast_time
    `, [POSTGRESQL_TIMEZONE_CONFIG.postgresTimezone]);
    
    return result.rows[0].sast_time;
  }
  
  /**
   * Convert UTC datetime to SAST using PostgreSQL
   * @param {string} utcDateTime - UTC datetime string
   * @returns {Promise<Date>} SAST datetime
   */
  async convertUTCToSAST(utcDateTime) {
    const result = await this.pool.query(`
      SELECT $1::timestamptz AT TIME ZONE $2 as sast_time
    `, [utcDateTime, POSTGRESQL_TIMEZONE_CONFIG.postgresTimezone]);
    
    return result.rows[0].sast_time;
  }
  
  /**
   * Format datetime in SAST timezone for display
   * @param {string} dateTime - Input datetime
   * @param {string} format - PostgreSQL format string
   * @returns {Promise<string>} Formatted SAST datetime
   */
  async formatSASTDateTime(dateTime, format = 'YYYY-MM-DD HH24:MI:SS TZ') {
    const result = await this.pool.query(`
      SELECT TO_CHAR($1::timestamptz AT TIME ZONE $2, $3) as formatted_time
    `, [dateTime, POSTGRESQL_TIMEZONE_CONFIG.postgresTimezone, format]);
    
    return result.rows[0].formatted_time;
  }
  
  /**
   * Get start and end of day in SAST for date range queries
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{start: Date, end: Date}>} Day boundaries in SAST
   */
  async getSASTDayBoundaries(date) {
    const result = await this.pool.query(`
      SELECT 
        ($1::date AT TIME ZONE $2)::timestamptz as day_start,
        (($1::date + interval '1 day') AT TIME ZONE $2)::timestamptz as day_end
    `, [date, POSTGRESQL_TIMEZONE_CONFIG.postgresTimezone]);
    
    return {
      start: result.rows[0].day_start,
      end: result.rows[0].day_end
    };
  }
  
  /**
   * Calculate production duration in minutes using PostgreSQL interval
   * @param {string} startTime - Production start time
   * @param {string} endTime - Production end time (optional, defaults to now)
   * @returns {Promise<number>} Duration in minutes
   */
  async calculateProductionDuration(startTime, endTime = null) {
    const query = endTime ? `
      SELECT EXTRACT(EPOCH FROM ($2::timestamptz - $1::timestamptz)) / 60 as duration_minutes
    ` : `
      SELECT EXTRACT(EPOCH FROM (NOW() - $1::timestamptz)) / 60 as duration_minutes
    `;
    
    const params = endTime ? [startTime, endTime] : [startTime];
    const result = await this.pool.query(query, params);
    
    return Math.round(result.rows[0].duration_minutes);
  }
  
  /**
   * Get production orders with SAST-formatted timestamps
   * @param {string} status - Order status filter
   * @returns {Promise<Array>} Orders with formatted timestamps
   */
  async getOrdersWithSASTTimes(status = null) {
    const whereClause = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];
    
    const result = await this.pool.query(`
      SELECT 
        *,
        TO_CHAR(created_at AT TIME ZONE $${params.length + 1}, 'YYYY-MM-DD HH24:MI:SS') as created_at_sast,
        TO_CHAR(start_time AT TIME ZONE $${params.length + 1}, 'YYYY-MM-DD HH24:MI:SS') as start_time_sast,
        TO_CHAR(complete_time AT TIME ZONE $${params.length + 1}, 'YYYY-MM-DD HH24:MI:SS') as complete_time_sast,
        CASE 
          WHEN start_time IS NOT NULL AND complete_time IS NULL THEN
            EXTRACT(EPOCH FROM (NOW() - start_time)) / 60
          WHEN start_time IS NOT NULL AND complete_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (complete_time - start_time)) / 60
          ELSE NULL
        END as duration_minutes
      FROM production_orders 
      ${whereClause}
      ORDER BY created_at DESC
    `, [...params, POSTGRESQL_TIMEZONE_CONFIG.postgresTimezone]);
    
    return result.rows;
  }
}

/**
 * Frontend-compatible SAST utilities (maintains backward compatibility)
 */

/**
 * Get current SAST time (client-side calculation for immediate use)
 * @returns {Date} Current time in SAST
 */
export function getCurrentSASTTime() {
  return new Date(Date.now() + POSTGRESQL_TIMEZONE_CONFIG.offsetMS);
}

/**
 * Format date for SAST display with PostgreSQL-style formatting
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatSASTDate(date, options = {}) {
  const {
    includeTime = true,
    includeSeconds = false,
    includeTimezone = false,
    format = 'display' // 'display', 'database', 'api'
  } = options;
  
  if (!date) return '';
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return 'Invalid Date';
  
  // Ensure we're working with SAST time
  const sastDate = new Date(targetDate.getTime() + POSTGRESQL_TIMEZONE_CONFIG.offsetMS);
  
  const year = sastDate.getFullYear();
  const month = String(sastDate.getMonth() + 1).padStart(2, '0');
  const day = String(sastDate.getDate()).padStart(2, '0');
  
  let formatted = `${year}-${month}-${day}`;
  
  if (includeTime) {
    const hours = String(sastDate.getHours()).padStart(2, '0');
    const minutes = String(sastDate.getMinutes()).padStart(2, '0');
    const seconds = String(sastDate.getSeconds()).padStart(2, '0');
    
    formatted += ` ${hours}:${minutes}`;
    
    if (includeSeconds) {
      formatted += `:${seconds}`;
    }
  }
  
  if (includeTimezone) {
    formatted += ` (SAST)`;
  }
  
  return formatted;
}

/**
 * Calculate production timer display (maintains existing interface)
 * @param {string|Date} startTime - Production start time
 * @param {string|Date} endTime - Production end time (optional)
 * @returns {Object} Timer object with hours, minutes, seconds
 */
export function calculateProductionTimer(startTime, endTime = null) {
  if (!startTime) return { hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 };
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  if (isNaN(start.getTime())) return { hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 };
  
  // Add SAST offset for accurate timer display
  const duration = (end.getTime() + POSTGRESQL_TIMEZONE_CONFIG.offsetMS) - 
                  (start.getTime() + POSTGRESQL_TIMEZONE_CONFIG.offsetMS);
  
  const totalSeconds = Math.floor(duration / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  
  return {
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    totalMinutes: Math.max(0, totalMinutes),
    totalSeconds: Math.max(0, totalSeconds)
  };
}

/**
 * Database query helpers for common SAST operations
 */
export const SASTQueries = {
  // Get current SAST timestamp for inserts
  NOW_SAST: `NOW() AT TIME ZONE 'Africa/Johannesburg'`,
  
  // Format timestamp as SAST string
  FORMAT_SAST: (column) => `TO_CHAR(${column} AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS')`,
  
  // Filter by SAST date range
  DATE_RANGE_SAST: (column, startDate, endDate) => `
    ${column} AT TIME ZONE 'Africa/Johannesburg' >= '${startDate} 00:00:00'::timestamp
    AND ${column} AT TIME ZONE 'Africa/Johannesburg' <= '${endDate} 23:59:59'::timestamp
  `,
  
  // Calculate duration in minutes
  DURATION_MINUTES: (startCol, endCol = 'NOW()') => `
    EXTRACT(EPOCH FROM (${endCol} - ${startCol})) / 60
  `
};

// Export configuration and utilities
export {
  POSTGRESQL_TIMEZONE_CONFIG as TIMEZONE_CONFIG,
  PostgreSQLTimeHelper
};

// Backward compatibility exports
export {
  getCurrentSASTTime as getSASTNow,
  formatSASTDate as formatSASTDateTime,
  calculateProductionTimer as getProductionDuration
};