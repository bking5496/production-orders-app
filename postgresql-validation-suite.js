/**
 * PostgreSQL Migration Validation Suite
 * Comprehensive testing framework for Production Orders App migration
 * Version: 1.0.0
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs').promises;

class MigrationValidator {
    constructor(config) {
        this.config = {
            sqlite: {
                path: config.sqlite?.path || './production.db'
            },
            postgres: {
                host: config.postgres?.host || 'localhost',
                port: config.postgres?.port || 5432,
                database: config.postgres?.database || 'production_orders',
                user: config.postgres?.user || 'production_app',
                password: config.postgres?.password
            },
            api: {
                baseUrl: config.api?.baseUrl || 'http://localhost:3001',
                timeout: config.api?.timeout || 5000
            },
            websocket: {
                url: config.websocket?.url || 'ws://localhost:3001'
            }
        };
        
        this.results = {
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            startTime: null,
            endTime: null
        };
    }
    
    async initialize() {
        console.log('🔧 Initializing Migration Validator...');
        
        // Initialize PostgreSQL connection
        this.pgPool = new Pool(this.config.postgres);
        
        // Initialize SQLite connection
        this.sqliteDb = new sqlite3.Database(this.config.sqlite.path);
        
        console.log('✅ Database connections initialized');
    }
    
    async cleanup() {
        if (this.pgPool) {
            await this.pgPool.end();
        }
        if (this.sqliteDb) {
            this.sqliteDb.close();
        }
        console.log('🧹 Database connections closed');
    }
    
    addTestResult(testName, status, message, details = null) {
        const result = {
            name: testName,
            status, // 'PASS', 'FAIL', 'WARN'
            message,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(result);
        this.results.summary.total++;
        
        switch (status) {
            case 'PASS':
                this.results.summary.passed++;
                console.log(`✅ ${testName}: ${message}`);
                break;
            case 'FAIL':
                this.results.summary.failed++;
                console.log(`❌ ${testName}: ${message}`);
                if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
                break;
            case 'WARN':
                this.results.summary.warnings++;
                console.log(`⚠️  ${testName}: ${message}`);
                break;
        }
    }
    
    async runDataIntegrityTests() {
        console.log('\n📊 Running Data Integrity Tests...');
        
        // Test 1: Record count comparison
        try {
            const tables = [
                'production_orders',
                'users',
                'machines',
                'production_stops',
                'labor_assignments'
            ];
            
            for (const table of tables) {
                const sqliteCount = await this.getSQLiteRecordCount(table);
                const pgCount = await this.getPostgreSQLRecordCount(table);
                
                if (sqliteCount === pgCount) {
                    this.addTestResult(
                        `Record Count - ${table}`,
                        'PASS',
                        `${sqliteCount} records match between SQLite and PostgreSQL`
                    );
                } else {
                    this.addTestResult(
                        `Record Count - ${table}`,
                        'FAIL',
                        `Record count mismatch: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`
                    );
                }
            }
        } catch (error) {
            this.addTestResult(
                'Record Count Comparison',
                'FAIL',
                'Failed to compare record counts',
                error.message
            );
        }
        
        // Test 2: Timezone data integrity
        try {
            const pgResult = await this.pgPool.query(`
                SELECT 
                    id,
                    TO_CHAR(created_at AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as created_at_sast,
                    TO_CHAR(start_time AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') as start_time_sast
                FROM production_orders 
                WHERE start_time IS NOT NULL 
                LIMIT 5
            `);
            
            if (pgResult.rows.length > 0) {
                // Verify timezone format
                const timezoneSample = pgResult.rows[0];
                const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                
                if (datePattern.test(timezoneSample.created_at_sast)) {
                    this.addTestResult(
                        'Timezone Data Format',
                        'PASS',
                        'SAST timezone formatting is correct'
                    );
                } else {
                    this.addTestResult(
                        'Timezone Data Format',
                        'FAIL',
                        'SAST timezone formatting is incorrect',
                        timezoneSample
                    );
                }
            }
        } catch (error) {
            this.addTestResult(
                'Timezone Data Integrity',
                'FAIL',
                'Failed to verify timezone data',
                error.message
            );
        }
        
        // Test 3: Foreign key relationships
        try {
            const fkResult = await this.pgPool.query(`
                SELECT 
                    COUNT(*) as orders_with_machines
                FROM production_orders po
                INNER JOIN machines m ON po.machine_id = m.id
                WHERE po.machine_id IS NOT NULL
            `);
            
            const totalOrders = await this.pgPool.query(`
                SELECT COUNT(*) as total 
                FROM production_orders 
                WHERE machine_id IS NOT NULL
            `);
            
            if (fkResult.rows[0].orders_with_machines === totalOrders.rows[0].total) {
                this.addTestResult(
                    'Foreign Key Integrity',
                    'PASS',
                    'All foreign key relationships are intact'
                );
            } else {
                this.addTestResult(
                    'Foreign Key Integrity',
                    'FAIL',
                    'Foreign key relationship inconsistencies detected'
                );
            }
        } catch (error) {
            this.addTestResult(
                'Foreign Key Integrity',
                'FAIL',
                'Failed to verify foreign key relationships',
                error.message
            );
        }
    }
    
    async runAPITests() {
        console.log('\n🌐 Running API Endpoint Tests...');
        
        const endpoints = [
            { path: '/api/health', method: 'GET', description: 'Health Check' },
            { path: '/api/orders', method: 'GET', description: 'Get Orders' },
            { path: '/api/machines', method: 'GET', description: 'Get Machines' },
            { path: '/api/users', method: 'GET', description: 'Get Users' },
            { path: '/api/production/stats', method: 'GET', description: 'Production Stats' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios({
                    method: endpoint.method,
                    url: `${this.config.api.baseUrl}${endpoint.path}`,
                    timeout: this.config.api.timeout,
                    validateStatus: (status) => status < 500 // Accept all non-server-error responses
                });
                
                if (response.status === 200) {
                    this.addTestResult(
                        `API - ${endpoint.description}`,
                        'PASS',
                        `${endpoint.method} ${endpoint.path} returned ${response.status}`
                    );
                } else if (response.status === 401 || response.status === 403) {
                    this.addTestResult(
                        `API - ${endpoint.description}`,
                        'WARN',
                        `${endpoint.method} ${endpoint.path} returned ${response.status} (authentication required)`
                    );
                } else {
                    this.addTestResult(
                        `API - ${endpoint.description}`,
                        'FAIL',
                        `${endpoint.method} ${endpoint.path} returned ${response.status}`
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `API - ${endpoint.description}`,
                    'FAIL',
                    `${endpoint.method} ${endpoint.path} failed`,
                    error.message
                );
            }
        }
    }
    
    async runWebSocketTests() {
        console.log('\n🔌 Running WebSocket Tests...');
        
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(this.config.websocket.url);
                let testTimeout;
                
                ws.on('open', () => {
                    this.addTestResult(
                        'WebSocket Connection',
                        'PASS',
                        'WebSocket connection established successfully'
                    );
                    
                    // Test message sending
                    ws.send(JSON.stringify({
                        type: 'ping',
                        timestamp: Date.now()
                    }));
                    
                    testTimeout = setTimeout(() => {
                        this.addTestResult(
                            'WebSocket Message Response',
                            'WARN',
                            'WebSocket message response timeout (authentication may be required)'
                        );
                        ws.close();
                        resolve();
                    }, 5000);
                });
                
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'welcome' || message.type === 'pong') {
                            this.addTestResult(
                                'WebSocket Message Response',
                                'PASS',
                                'WebSocket message handling is working'
                            );
                        } else if (message.type === 'auth_error') {
                            this.addTestResult(
                                'WebSocket Authentication',
                                'WARN',
                                'WebSocket requires authentication token'
                            );
                        }
                    } catch (parseError) {
                        this.addTestResult(
                            'WebSocket Message Format',
                            'WARN',
                            'Received non-JSON WebSocket message'
                        );
                    }
                    
                    clearTimeout(testTimeout);
                    ws.close();
                    resolve();
                });
                
                ws.on('error', (error) => {
                    this.addTestResult(
                        'WebSocket Connection',
                        'FAIL',
                        'WebSocket connection failed',
                        error.message
                    );
                    clearTimeout(testTimeout);
                    resolve();
                });
                
                ws.on('close', () => {
                    console.log('WebSocket connection closed');
                    clearTimeout(testTimeout);
                    resolve();
                });
                
            } catch (error) {
                this.addTestResult(
                    'WebSocket Test Setup',
                    'FAIL',
                    'Failed to initialize WebSocket test',
                    error.message
                );
                resolve();
            }
        });
    }
    
    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...');
        
        // Test 1: Database query performance
        try {
            const startTime = Date.now();
            await this.pgPool.query(`
                SELECT 
                    po.*,
                    m.name as machine_name,
                    u.username as operator_name
                FROM production_orders po
                LEFT JOIN machines m ON po.machine_id = m.id
                LEFT JOIN users u ON po.operator_id = u.id
                LIMIT 100
            `);
            const queryTime = Date.now() - startTime;
            
            if (queryTime < 1000) {
                this.addTestResult(
                    'Database Query Performance',
                    'PASS',
                    `Complex query completed in ${queryTime}ms`
                );
            } else if (queryTime < 3000) {
                this.addTestResult(
                    'Database Query Performance',
                    'WARN',
                    `Complex query took ${queryTime}ms (consider optimization)`
                );
            } else {
                this.addTestResult(
                    'Database Query Performance',
                    'FAIL',
                    `Complex query took ${queryTime}ms (too slow)`
                );
            }
        } catch (error) {
            this.addTestResult(
                'Database Query Performance',
                'FAIL',
                'Performance test query failed',
                error.message
            );
        }
        
        // Test 2: API response time
        try {
            const startTime = Date.now();
            await axios.get(`${this.config.api.baseUrl}/api/orders`, {
                timeout: this.config.api.timeout
            });
            const responseTime = Date.now() - startTime;
            
            if (responseTime < 500) {
                this.addTestResult(
                    'API Response Performance',
                    'PASS',
                    `API response time: ${responseTime}ms`
                );
            } else if (responseTime < 2000) {
                this.addTestResult(
                    'API Response Performance',
                    'WARN',
                    `API response time: ${responseTime}ms (could be faster)`
                );
            } else {
                this.addTestResult(
                    'API Response Performance',
                    'FAIL',
                    `API response time: ${responseTime}ms (too slow)`
                );
            }
        } catch (error) {
            this.addTestResult(
                'API Response Performance',
                'FAIL',
                'API performance test failed',
                error.message
            );
        }
    }
    
    async runProductionSimulation() {
        console.log('\n🏭 Running Production Simulation Tests...');
        
        try {
            // Simulate typical production operations
            const operations = [
                'Get active orders',
                'Get machine status',
                'Get production statistics',
                'Get downtime reports'
            ];
            
            let successfulOps = 0;
            
            for (const operation of operations) {
                try {
                    switch (operation) {
                        case 'Get active orders':
                            await this.pgPool.query(`
                                SELECT * FROM production_orders 
                                WHERE status IN ('pending', 'in_progress')
                            `);
                            break;
                        case 'Get machine status':
                            await this.pgPool.query(`
                                SELECT 
                                    m.*,
                                    COUNT(po.id) as active_orders
                                FROM machines m
                                LEFT JOIN production_orders po ON m.id = po.machine_id 
                                    AND po.status = 'in_progress'
                                GROUP BY m.id
                            `);
                            break;
                        case 'Get production statistics':
                            await this.pgPool.query(`
                                SELECT 
                                    COUNT(*) as total_orders,
                                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                                    AVG(CASE 
                                        WHEN start_time IS NOT NULL AND complete_time IS NOT NULL 
                                        THEN EXTRACT(EPOCH FROM (complete_time - start_time)) / 60 
                                    END) as avg_duration
                                FROM production_orders
                                WHERE created_at >= NOW() - INTERVAL '24 hours'
                            `);
                            break;
                        case 'Get downtime reports':
                            await this.pgPool.query(`
                                SELECT 
                                    ps.*,
                                    po.order_number,
                                    EXTRACT(EPOCH FROM (COALESCE(ps.end_time, NOW()) - ps.start_time)) / 60 as duration_minutes
                                FROM production_stops ps
                                JOIN production_orders po ON ps.order_id = po.id
                                WHERE ps.start_time >= NOW() - INTERVAL '7 days'
                            `);
                            break;
                    }
                    successfulOps++;
                } catch (opError) {
                    console.log(`   ❌ ${operation} failed: ${opError.message}`);
                }
            }
            
            if (successfulOps === operations.length) {
                this.addTestResult(
                    'Production Simulation',
                    'PASS',
                    `All ${operations.length} production operations completed successfully`
                );
            } else {
                this.addTestResult(
                    'Production Simulation',
                    'FAIL',
                    `Only ${successfulOps}/${operations.length} production operations completed`
                );
            }
        } catch (error) {
            this.addTestResult(
                'Production Simulation',
                'FAIL',
                'Production simulation failed',
                error.message
            );
        }
    }
    
    async getSQLiteRecordCount(tableName) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }
    
    async getPostgreSQLRecordCount(tableName) {
        const result = await this.pgPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        return parseInt(result.rows[0].count);
    }
    
    async runAllTests() {
        console.log('🚀 Starting PostgreSQL Migration Validation Suite');
        console.log('============================================\n');
        
        this.results.startTime = new Date();
        
        try {
            await this.initialize();
            
            await this.runDataIntegrityTests();
            await this.runAPITests();
            await this.runWebSocketTests();
            await this.runPerformanceTests();
            await this.runProductionSimulation();
            
        } catch (error) {
            console.error('❌ Test suite execution failed:', error);
        } finally {
            await this.cleanup();
        }
        
        this.results.endTime = new Date();
        this.generateReport();
    }
    
    generateReport() {
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        
        console.log('\n📋 MIGRATION VALIDATION REPORT');
        console.log('===============================');
        console.log(`Test Duration: ${duration.toFixed(2)} seconds`);
        console.log(`Total Tests: ${this.results.summary.total}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
        
        const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
        console.log(`Success Rate: ${successRate}%`);
        
        if (this.results.summary.failed === 0) {
            console.log('\n🎉 MIGRATION VALIDATION SUCCESSFUL');
            console.log('The PostgreSQL migration is ready for production deployment!');
        } else {
            console.log('\n⚠️  MIGRATION VALIDATION HAS ISSUES');
            console.log('Please review and fix the failed tests before deployment.');
        }
        
        // Save detailed report
        const reportPath = `./migration-validation-report-${Date.now()}.json`;
        fs.writeFile(reportPath, JSON.stringify(this.results, null, 2))
            .then(() => console.log(`\n📄 Detailed report saved: ${reportPath}`))
            .catch(err => console.error('Failed to save report:', err));
    }
}

// CLI execution
if (require.main === module) {
    const config = {
        postgres: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'production_orders',
            user: process.env.DB_USER || 'production_app',
            password: process.env.DB_PASSWORD
        },
        api: {
            baseUrl: process.argv[2] || 'http://localhost:3001'
        }
    };
    
    const validator = new MigrationValidator(config);
    validator.runAllTests()
        .then(() => {
            process.exit(validator.results.summary.failed === 0 ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Validation suite failed:', error);
            process.exit(1);
        });
}

module.exports = MigrationValidator;