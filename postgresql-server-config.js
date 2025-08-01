/**
 * PostgreSQL Server Configuration for Production Orders App
 * Replaces SQLite implementation with enhanced PostgreSQL features
 * Version: 1.0.0 - Production Ready
 */

const { Pool } = require('pg');
const { PostgreSQLTimeHelper } = require('./src/js/core/postgresql-time.js');

// PostgreSQL Connection Configuration
const DATABASE_CONFIG = {
    user: process.env.DB_USER || 'production_app',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'production_orders',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 60000,
    
    // PostgreSQL specific settings
    statement_timeout: 60000, // 60 seconds
    query_timeout: 30000,     // 30 seconds
    application_name: 'production_orders_app',
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
};

// Create connection pool
const pool = new Pool(DATABASE_CONFIG);

// Initialize timezone helper
const timeHelper = new PostgreSQLTimeHelper(pool);

// Connection event handlers
pool.on('connect', (client) => {
    console.log('✅ New PostgreSQL client connected');
    
    // Set session timezone and other settings
    client.query(`
        SET timezone TO 'Africa/Johannesburg';
        SET datestyle TO 'ISO, DMY';
        SET intervalstyle TO 'postgres';
    `).catch(err => {
        console.error('❌ Failed to set client session settings:', err);
    });
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected PostgreSQL client error:', err);
    // Don't exit the process - let the pool handle reconnection
});

pool.on('acquire', (client) => {
    console.log('🔗 PostgreSQL client acquired from pool');
});

pool.on('release', (client) => {
    console.log('🔓 PostgreSQL client returned to pool');
});

// Enhanced database helper functions (replaces SQLite functions)
const dbQuery = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const start = Date.now();
        const result = await client.query(sql, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) { // Log slow queries
            console.warn(`🐌 Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
        }
        
        return result.rows;
    } catch (error) {
        console.error('❌ Database query error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    } finally {
        client.release();
    }
};

const dbGet = async (sql, params = []) => {
    const result = await dbQuery(sql, params);
    return result.length > 0 ? result[0] : null;
};

const dbRun = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return {
            changes: result.rowCount,
            lastID: result.rows.length > 0 ? result.rows[0].id : null
        };
    } finally {
        client.release();
    }
};

// Transaction helpers
const dbTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Enhanced SAST-aware database operations
const SASTOperations = {
    // Get current production orders with SAST formatting
    async getActiveOrders() {
        return await dbQuery(`
            SELECT 
                po.*,
                TO_CHAR(po.created_at AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as created_at_sast,
                TO_CHAR(po.start_time AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as start_time_sast,
                TO_CHAR(po.complete_time AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as complete_time_sast,
                CASE 
                    WHEN po.start_time IS NOT NULL AND po.complete_time IS NULL THEN
                        EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 60
                    WHEN po.start_time IS NOT NULL AND po.complete_time IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (po.complete_time - po.start_time)) / 60
                    ELSE NULL
                END as duration_minutes,
                m.name as machine_name,
                u.username as operator_name
            FROM production_orders po
            LEFT JOIN machines m ON po.machine_id = m.id
            LEFT JOIN users u ON po.operator_id = u.id
            WHERE po.status IN ('pending', 'in_progress')
            ORDER BY po.created_at DESC
        `);
    },
    
    // Start production order with SAST timestamp
    async startOrder(orderId, machineId, operatorId) {
        return await dbTransaction(async (client) => {
            // Update order status
            const orderResult = await client.query(`
                UPDATE production_orders 
                SET 
                    status = 'in_progress',
                    start_time = NOW(),
                    machine_id = $2,
                    operator_id = $3
                WHERE id = $1
                RETURNING 
                    *,
                    TO_CHAR(start_time AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as start_time_sast
            `, [orderId, machineId, operatorId]);
            
            // Update machine status
            await client.query(`
                UPDATE machines 
                SET status = 'in_use' 
                WHERE id = $1
            `, [machineId]);
            
            return orderResult.rows[0];
        });
    },
    
    // Stop production order with reason
    async stopOrder(orderId, reason, notes = null) {
        return await dbTransaction(async (client) => {
            // Create stop record
            const stopResult = await client.query(`
                INSERT INTO production_stops (order_id, reason, notes, start_time)
                VALUES ($1, $2, $3, NOW())
                RETURNING 
                    *,
                    TO_CHAR(start_time AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as start_time_sast
            `, [orderId, reason, notes]);
            
            // Update order status
            const orderResult = await client.query(`
                UPDATE production_orders 
                SET 
                    status = 'stopped',
                    stop_time = NOW(),
                    stop_reason = $2
                WHERE id = $1
                RETURNING *
            `, [orderId, reason]);
            
            return {
                order: orderResult.rows[0],
                stop: stopResult.rows[0]
            };
        });
    },
    
    // Get production statistics for dashboard
    async getProductionStats(dateFrom = null, dateTo = null) {
        const dateFilter = dateFrom && dateTo ? `
            AND po.created_at AT TIME ZONE 'Africa/Johannesburg' >= $1::date
            AND po.created_at AT TIME ZONE 'Africa/Johannesburg' <= $2::date
        ` : '';
        
        const params = dateFrom && dateTo ? [dateFrom, dateTo] : [];
        
        return await dbGet(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders,
                COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_orders,
                ROUND(AVG(CASE 
                    WHEN start_time IS NOT NULL AND complete_time IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (complete_time - start_time)) / 60
                    ELSE NULL
                END), 2) as avg_duration_minutes,
                ROUND(AVG(efficiency_percentage), 2) as avg_efficiency
            FROM production_orders po
            WHERE 1=1 ${dateFilter}
        `, params);
    }
};

// Health check function
const checkDatabaseHealth = async () => {
    try {
        const result = await dbGet(`
            SELECT 
                NOW() as current_time,
                NOW() AT TIME ZONE 'Africa/Johannesburg' as sast_time,
                version() as postgres_version
        `);
        
        console.log('✅ Database health check passed');
        console.log(`   PostgreSQL Version: ${result.postgres_version}`);
        console.log(`   Current UTC: ${result.current_time}`);
        console.log(`   Current SAST: ${result.sast_time}`);
        
        return true;
    } catch (error) {
        console.error('❌ Database health check failed:', error);
        return false;
    }
};

// Graceful shutdown
const closeDatabaseConnections = async () => {
    try {
        await pool.end();
        console.log('✅ PostgreSQL connection pool closed gracefully');
    } catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
};

// Export database functions and utilities
module.exports = {
    // Connection pool
    pool,
    
    // Helper functions (maintains SQLite compatibility)
    dbQuery,
    dbGet,
    dbRun,
    dbTransaction,
    
    // SAST operations
    SASTOperations,
    timeHelper,
    
    // Utilities
    checkDatabaseHealth,
    closeDatabaseConnections,
    
    // Configuration
    DATABASE_CONFIG
};

// Handle process termination
process.on('SIGINT', closeDatabaseConnections);
process.on('SIGTERM', closeDatabaseConnections);