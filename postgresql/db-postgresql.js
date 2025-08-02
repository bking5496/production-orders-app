// PostgreSQL Database Connection Module
// Replaces SQLite connection with optimized PostgreSQL connection pool

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { getSecret } = require('../security/secrets-manager');

// SAST Timezone Utility Functions
// PostgreSQL handles timezone conversion natively
const getServerTimestamp = () => {
    // Use PostgreSQL's NOW() function with timezone
    return "NOW()";
};

const convertToSAST = (utcDate) => {
    // PostgreSQL will handle timezone conversion automatically
    // when timezone is set to 'Africa/Johannesburg'
    return utcDate;
};

const getSASTTimestamp = () => {
    // Get current timestamp in SAST timezone
    return "NOW() AT TIME ZONE 'Africa/Johannesburg'";
};

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'production_orders',
    user: process.env.DB_USER || 'postgres',
    password: getSecret('DB_PASSWORD') || process.env.DB_PASSWORD || (() => {
        console.error('🚨 FATAL: DB_PASSWORD not found in secrets manager or environment');
        process.exit(1);
    })(),
    
    // Connection pool settings for high availability
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
    
    // Query timeout settings
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    
    // SSL configuration for production
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA) : undefined,
        cert: process.env.DB_SSL_CERT ? fs.readFileSync(process.env.DB_SSL_CERT) : undefined,
        key: process.env.DB_SSL_KEY ? fs.readFileSync(process.env.DB_SSL_KEY) : undefined,
    } : false,
    
    // Set timezone for all connections
    timezone: process.env.DB_TIMEZONE || 'Africa/Johannesburg'
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool event handlers for monitoring
pool.on('connect', (client) => {
    console.log('✅ New PostgreSQL client connected');
    
    // Set timezone for each connection
    client.query(`SET timezone = '${dbConfig.timezone}'`, (err) => {
        if (err) {
            console.error('❌ Failed to set timezone on client:', err);
        }
    });
});

pool.on('error', (err, client) => {
    console.error('❌ PostgreSQL pool error:', err);
});

pool.on('acquire', () => {
    console.log('🔗 Client acquired from pool');
});

pool.on('release', () => {
    console.log('🔓 Client released back to pool');
});

// Promise-based database methods for compatibility with existing code
const dbRun = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return {
            changes: result.rowCount,
            lastID: result.rows[0]?.id || null
        };
    } catch (error) {
        console.error('❌ Database run error:', error);
        throw error;
    } finally {
        client.release();
    }
};

const dbGet = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Database get error:', error);
        throw error;
    } finally {
        client.release();
    }
};

const dbAll = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows || [];
    } catch (error) {
        console.error('❌ Database all error:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Transaction support for complex operations
const dbTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Transaction error:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Batch operations for performance
const dbBatch = async (operations) => {
    return await dbTransaction(async (client) => {
        const results = [];
        for (const { sql, params } of operations) {
            const result = await client.query(sql, params);
            results.push(result);
        }
        return results;
    });
};

// Health check function
const checkHealth = async () => {
    try {
        const result = await dbGet('SELECT NOW() as current_time, version() as version');
        return {
            status: 'healthy',
            timestamp: result.current_time,
            version: result.version,
            pool_total: pool.totalCount,
            pool_idle: pool.idleCount,
            pool_waiting: pool.waitingCount
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

// Query execution with metrics
const dbQuery = async (sql, params = []) => {
    const startTime = Date.now();
    const client = await pool.connect();
    
    try {
        const result = await client.query(sql, params);
        const duration = Date.now() - startTime;
        
        // Log slow queries
        if (duration > (process.env.SLOW_QUERY_THRESHOLD || 1000)) {
            console.warn(`🐌 Slow query (${duration}ms):`, sql.substring(0, 100));
        }
        
        return result;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Graceful shutdown
const closePool = async () => {
    try {
        await pool.end();
        console.log('✅ PostgreSQL connection pool closed');
    } catch (error) {
        console.error('❌ Error closing pool:', error);
    }
};

// Convert SQLite datetime functions to PostgreSQL equivalents
const convertSQLiteQuery = (sqliteQuery) => {
    return sqliteQuery
        // Replace SQLite datetime functions with PostgreSQL equivalents
        .replace(/datetime\('now'\)/g, 'NOW()')
        .replace(/datetime\('now',\s*'\+2\s*hours'\)/g, "NOW() AT TIME ZONE 'Africa/Johannesburg'")
        .replace(/strftime\('%Y-%m-%d',\s*([^)]+)\)/g, 'DATE($1)')
        .replace(/julianday\(([^)]+)\)/g, 'EXTRACT(EPOCH FROM $1) / 86400')
        // Replace AUTOINCREMENT with SERIAL (handled in schema)
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        // Replace SQLite LIMIT/OFFSET with PostgreSQL syntax
        .replace(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/g, 'LIMIT $1 OFFSET $2');
};

// Export all functions and utilities
module.exports = {
    // Connection pool
    pool,
    
    // Compatibility functions (same interface as SQLite version)
    dbRun,
    dbGet,
    dbAll,
    
    // Enhanced PostgreSQL functions
    dbQuery,
    dbTransaction,
    dbBatch,
    
    // Timezone utilities
    getServerTimestamp,
    convertToSAST,
    getSASTTimestamp,
    
    // Utility functions
    checkHealth,
    closePool,
    convertSQLiteQuery,
    
    // Configuration
    config: dbConfig
};