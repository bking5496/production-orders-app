// Database Configuration and Connection Management
const { Pool } = require('pg');
const { getSecret } = require('../../security/secrets-manager');

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'production_orders',
      password: getSecret('DB_PASSWORD'),
      port: 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('connect', () => {
      console.log('✅ New PostgreSQL client connected');
    });

    this.pool.on('error', (err) => {
      console.error('🔴 PostgreSQL pool error:', err);
    });
  }

  // Get the pool instance
  getPool() {
    return this.pool;
  }

  // Execute a query with automatic connection management
  async query(text, params = []) {
    const client = await this.pool.connect();
    console.log('🔗 Client acquired from pool');
    
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
      console.log('🔓 Client released back to pool');
    }
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    const client = await this.pool.connect();
    console.log('🔗 Transaction client acquired from pool');
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      console.log('🔓 Transaction client released back to pool');
    }
  }

  // Execute queries with manual connection management
  async withConnection(callback) {
    const client = await this.pool.connect();
    console.log('🔗 Manual client acquired from pool');
    
    try {
      return await callback(client);
    } finally {
      client.release();
      console.log('🔓 Manual client released back to pool');
    }
  }

  // Close all connections (for graceful shutdown)
  async close() {
    await this.pool.end();
    console.log('🔒 Database pool closed');
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = {
  pool: dbManager.getPool(),
  query: dbManager.query.bind(dbManager),
  transaction: dbManager.transaction.bind(dbManager),
  withConnection: dbManager.withConnection.bind(dbManager),
  close: dbManager.close.bind(dbManager)
};