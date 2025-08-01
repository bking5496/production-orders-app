// Updated server.js for PostgreSQL
// This shows the key changes needed to adapt your existing server.js

// Replace SQLite imports with PostgreSQL
// OLD: const sqlite3 = require('sqlite3').verbose();
const { 
    pool, 
    dbRun, 
    dbGet, 
    dbAll, 
    dbTransaction, 
    dbBatch, 
    getServerTimestamp, 
    getSASTTimestamp,
    checkHealth,
    closePool 
} = require('./db-postgresql');

// Update timezone handling functions
const getServerTimestamp = () => {
    // PostgreSQL native timezone handling
    return "NOW()";
};

const getSASTTime = () => {
    return "NOW() AT TIME ZONE 'Africa/Johannesburg'";
};

// Example of updated route with PostgreSQL-specific optimizations
app.post('/api/orders/:id/start', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { machine_id } = req.body;
    
    try {
        // Use transaction for atomic operations
        const result = await dbTransaction(async (client) => {
            // Check if order exists and is pending
            const order = await client.query(
                'SELECT * FROM production_orders WHERE id = $1 AND status = $2',
                [id, 'pending']
            );
            
            if (order.rows.length === 0) {
                throw new Error('Order not found or not in pending status');
            }
            
            // Check machine availability
            const machine = await client.query(
                'SELECT * FROM machines WHERE id = $1 AND status = $2',
                [machine_id, 'available']
            );
            
            if (machine.rows.length === 0) {
                throw new Error('Machine not available');
            }
            
            // Update order status - using PostgreSQL RETURNING clause
            const orderUpdate = await client.query(`
                UPDATE production_orders 
                SET status = 'in_progress', 
                    machine_id = $1, 
                    operator_id = $2, 
                    start_time = NOW(),
                    updated_at = NOW()
                WHERE id = $3 
                RETURNING *
            `, [machine_id, req.user.id, id]);
            
            // Update machine status
            await client.query(`
                UPDATE machines 
                SET status = 'in_use', 
                    updated_at = NOW() 
                WHERE id = $1
            `, [machine_id]);
            
            return orderUpdate.rows[0];
        });
        
        // Broadcast WebSocket update
        broadcastToRoom(`order_started`, {
            order: result,
            user: req.user.username,
            timestamp: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: 'Order started successfully',
            order: result 
        });
        
    } catch (error) {
        console.error('Start order error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Example of bulk operations with PostgreSQL
app.get('/api/production/dashboard', authenticateToken, async (req, res) => {
    try {
        // Use batch queries for better performance
        const queries = [
            'SELECT COUNT(*) as total FROM production_orders WHERE status = $1',
            'SELECT COUNT(*) as in_progress FROM production_orders WHERE status = $1',
            'SELECT COUNT(*) as completed_today FROM production_orders WHERE status = $1 AND DATE(complete_time) = CURRENT_DATE',
            `SELECT 
                AVG(efficiency_percentage) as avg_efficiency,
                SUM(CASE WHEN status = 'completed' THEN actual_quantity ELSE 0 END) as total_produced
             FROM production_orders 
             WHERE DATE(created_at) = CURRENT_DATE`
        ];
        
        const [totalOrders, inProgressOrders, completedToday, metrics] = await Promise.all([
            dbGet(queries[0], ['pending']),
            dbGet(queries[1], ['in_progress']),
            dbGet(queries[2], ['completed']),
            dbGet(queries[3], [])
        ]);
        
        res.json({
            totalOrders: totalOrders.total,
            inProgressOrders: inProgressOrders.in_progress,
            completedToday: completedToday.completed_today,
            avgEfficiency: metrics.avg_efficiency || 0,
            totalProduced: metrics.total_produced || 0,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard data' 
        });
    }
});

// Health check endpoint with PostgreSQL metrics
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await checkHealth();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    
    // Close WebSocket server
    wss.close(() => {
        console.log('✅ WebSocket server closed');
    });
    
    // Close HTTP server
    server.close(async () => {
        console.log('✅ HTTP server closed');
        
        // Close database connection pool
        await closePool();
        
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    
    // Close database connection pool
    await closePool();
    
    process.exit(0);
});

// Updated query examples with PostgreSQL optimizations
const getOrdersWithMachineInfo = async (environment, limit = 50) => {
    return await dbAll(`
        SELECT 
            po.*,
            m.name as machine_name,
            m.type as machine_type,
            u.username as operator_name,
            -- PostgreSQL interval calculations
            CASE 
                WHEN po.status = 'in_progress' THEN 
                    EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 60
                ELSE 
                    EXTRACT(EPOCH FROM (po.complete_time - po.start_time)) / 60
            END as duration_minutes
        FROM production_orders po
        LEFT JOIN machines m ON po.machine_id = m.id
        LEFT JOIN users u ON po.operator_id = u.id
        WHERE po.environment = $1
        ORDER BY po.created_at DESC
        LIMIT $2
    `, [environment, limit]);
};

// Advanced reporting with PostgreSQL window functions
const getProductionEfficiencyReport = async (startDate, endDate) => {
    return await dbAll(`
        SELECT 
            DATE(complete_time) as production_date,
            COUNT(*) as orders_completed,
            AVG(efficiency_percentage) as avg_efficiency,
            SUM(actual_quantity) as total_produced,
            -- PostgreSQL window functions for analytics
            AVG(efficiency_percentage) OVER (
                ORDER BY DATE(complete_time) 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as rolling_7day_efficiency,
            RANK() OVER (
                ORDER BY AVG(efficiency_percentage) DESC
            ) as efficiency_rank
        FROM production_orders
        WHERE status = 'completed'
            AND complete_time >= $1
            AND complete_time <= $2
        GROUP BY DATE(complete_time)
        ORDER BY production_date DESC
    `, [startDate, endDate]);
};

module.exports = app;