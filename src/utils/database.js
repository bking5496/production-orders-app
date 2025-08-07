// Database Utility Functions
const db = require('../config/database');

/**
 * Database utility class with common operations
 */
class DatabaseUtils {
  
  /**
   * Execute a SELECT query and return rows
   */
  static async select(table, conditions = {}, options = {}) {
    const { columns = '*', orderBy, limit, offset } = options;
    
    let query = `SELECT ${columns} FROM ${table}`;
    const params = [];
    let paramCount = 0;

    // Add WHERE conditions
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = $${++paramCount}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    // Add LIMIT and OFFSET
    if (limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(limit);
    }
    if (offset) {
      query += ` OFFSET $${++paramCount}`;
      params.push(offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Insert a record and return the inserted row
   */
  static async insert(table, data, returning = '*') {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${table} (${columns.join(', ')}) 
      VALUES (${placeholders.join(', ')}) 
      RETURNING ${returning}
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update records and return updated rows
   */
  static async update(table, data, conditions, returning = '*') {
    const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    
    let query = `UPDATE ${table} SET ${setClause}`;
    let paramCount = values.length;

    // Add WHERE conditions
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        values.push(conditions[key]);
        return `${key} = $${++paramCount}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    query += ` RETURNING ${returning}`;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Delete records and return count
   */
  static async delete(table, conditions) {
    const params = Object.values(conditions);
    const whereClause = Object.keys(conditions).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await db.query(query, params);
    return result.rowCount;
  }

  /**
   * Check if a record exists
   */
  static async exists(table, conditions) {
    const params = Object.values(conditions);
    const whereClause = Object.keys(conditions).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause})`;
    const result = await db.query(query, params);
    return result.rows[0].exists;
  }

  /**
   * Get a single record
   */
  static async findOne(table, conditions, columns = '*') {
    const rows = await this.select(table, conditions, { columns, limit: 1 });
    return rows[0] || null;
  }

  /**
   * Get record count
   */
  static async count(table, conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params = [];
    let paramCount = 0;

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = $${++paramCount}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Execute raw SQL with parameters
   */
  static async raw(query, params = []) {
    return await db.query(query, params);
  }

  /**
   * Execute multiple queries in a transaction
   */
  static async transaction(queries) {
    return await db.transaction(queries);
  }
}

module.exports = DatabaseUtils;