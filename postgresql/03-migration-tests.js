// Comprehensive Migration Testing Suite
// Tests data integrity, performance, and functionality after PostgreSQL migration

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class MigrationTester {
    constructor(postgresConfig, sqlitePath) {
        this.pgPool = new Pool(postgresConfig);
        this.sqlitePath = sqlitePath;
        this.testResults = {
            dataIntegrity: {},
            performance: {},
            functionality: {},
            timezone: {}
        };
    }

    async runAllTests() {
        console.log('🧪 Starting PostgreSQL Migration Test Suite');
        console.log('=' * 60);

        try {
            // Data integrity tests
            await this.testDataIntegrity();
            
            // Timezone handling tests
            await this.testTimezoneHandling();
            
            // Performance tests
            await this.testPerformance();
            
            // Functionality tests
            await this.testFunctionality();
            
            // Generate test report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async testDataIntegrity() {
        console.log('\n📊 Testing Data Integrity...');
        
        const tables = ['users', 'machines', 'environments', 'production_orders', 'production_stops'];
        
        for (const table of tables) {
            try {
                // Count records in both databases
                const pgCount = await this.pgPool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const sqliteCount = await this.querySQLite(`SELECT COUNT(*) as count FROM ${table}`);
                
                const pgRecords = parseInt(pgCount.rows[0].count);
                const sqliteRecords = sqliteCount.count;
                
                const isMatch = pgRecords === sqliteRecords;
                
                this.testResults.dataIntegrity[table] = {
                    postgresql_count: pgRecords,
                    sqlite_count: sqliteRecords,
                    match: isMatch,
                    status: isMatch ? 'PASS' : 'FAIL'
                };
                
                const status = isMatch ? '✅' : '❌';
                console.log(`${status} ${table}: PostgreSQL=${pgRecords}, SQLite=${sqliteRecords}`);
                
                // Sample data comparison for critical tables
                if (['production_orders', 'users'].includes(table)) {
                    await this.testSampleData(table);
                }
                
            } catch (error) {
                console.error(`❌ Error testing ${table}:`, error.message);
                this.testResults.dataIntegrity[table] = {
                    status: 'ERROR',
                    error: error.message
                };
            }
        }
    }

    async testSampleData(table) {
        console.log(`  🔍 Comparing sample data for ${table}...`);
        
        try {
            // Get sample records from both databases
            const pgSample = await this.pgPool.query(`SELECT * FROM ${table} ORDER BY id LIMIT 5`);
            const sqliteSample = await this.querySQLite(`SELECT * FROM ${table} ORDER BY id LIMIT 5`);
            
            const pgRows = pgSample.rows;
            const sqliteRows = sqliteSample;
            
            if (pgRows.length !== sqliteRows.length) {
                console.log(`    ⚠️  Sample size mismatch: PG=${pgRows.length}, SQLite=${sqliteRows.length}`);
                return;
            }
            
            let matches = 0;
            for (let i = 0; i < pgRows.length; i++) {
                const pgRow = pgRows[i];
                const sqliteRow = sqliteRows[i];
                
                // Compare key fields (ignore timestamps due to timezone conversion)
                const keyFields = table === 'production_orders' 
                    ? ['id', 'order_number', 'product_name', 'quantity', 'status']
                    : ['id', 'name'];
                
                let rowMatch = true;
                for (const field of keyFields) {
                    if (pgRow[field] !== sqliteRow[field]) {
                        rowMatch = false;
                        console.log(`    ❌ Field mismatch in row ${i + 1}, field '${field}': PG='${pgRow[field]}', SQLite='${sqliteRow[field]}'`);
                    }
                }
                
                if (rowMatch) matches++;
            }
            
            const matchPercentage = (matches / pgRows.length) * 100;
            console.log(`    📈 Sample data match: ${matches}/${pgRows.length} (${matchPercentage.toFixed(1)}%)`);
            
        } catch (error) {
            console.error(`    ❌ Sample data comparison failed for ${table}:`, error.message);
        }
    }

    async testTimezoneHandling() {
        console.log('\n🕒 Testing Timezone Handling...');
        
        try {
            // Test current timezone setting
            const timezoneResult = await this.pgPool.query('SHOW timezone');
            const currentTimezone = timezoneResult.rows[0].timezone;
            
            console.log(`  📍 Database timezone: ${currentTimezone}`);
            
            const expectedTimezone = 'Africa/Johannesburg';
            const timezoneCorrect = currentTimezone === expectedTimezone;
            
            this.testResults.timezone.setting = {
                expected: expectedTimezone,
                actual: currentTimezone,
                correct: timezoneCorrect,
                status: timezoneCorrect ? 'PASS' : 'FAIL'
            };
            
            console.log(`  ${timezoneCorrect ? '✅' : '❌'} Timezone setting: ${timezoneCorrect ? 'CORRECT' : 'INCORRECT'}`);
            
            // Test timestamp operations
            await this.testTimestampOperations();
            
            // Test timezone conversion functions
            await this.testTimezoneConversions();
            
        } catch (error) {
            console.error('❌ Timezone testing failed:', error.message);
            this.testResults.timezone.error = error.message;
        }
    }

    async testTimestampOperations() {
        console.log('  🕐 Testing timestamp operations...');
        
        try {
            // Test NOW() function
            const nowResult = await this.pgPool.query('SELECT NOW() as current_time, NOW() AT TIME ZONE \'UTC\' as utc_time');
            const { current_time, utc_time } = nowResult.rows[0];
            
            console.log(`    📅 SAST time: ${current_time}`);
            console.log(`    📅 UTC time: ${utc_time}`);
            
            // Verify 2-hour offset
            const sastTime = new Date(current_time);
            const utcTime = new Date(utc_time);
            const offsetHours = (sastTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
            
            const offsetCorrect = Math.abs(offsetHours - 2) < 0.1; // Allow small floating-point errors
            
            this.testResults.timezone.offset = {
                expected: 2,
                actual: offsetHours,
                correct: offsetCorrect,
                status: offsetCorrect ? 'PASS' : 'FAIL'
            };
            
            console.log(`    ${offsetCorrect ? '✅' : '❌'} Timezone offset: ${offsetHours.toFixed(1)} hours`);
            
        } catch (error) {
            console.error('    ❌ Timestamp operations test failed:', error.message);
        }
    }

    async testTimezoneConversions() {
        console.log('  🔄 Testing timezone conversions...');
        
        try {
            // Test conversion from SAST to UTC and back
            const testTimestamp = '2025-08-01 14:30:00';
            
            const conversionResult = await this.pgPool.query(`
                SELECT 
                    '${testTimestamp}'::timestamp AT TIME ZONE 'Africa/Johannesburg' AT TIME ZONE 'UTC' as to_utc,
                    ('${testTimestamp}'::timestamp AT TIME ZONE 'Africa/Johannesburg' AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Johannesburg' as back_to_sast
            `);
            
            const { to_utc, back_to_sast } = conversionResult.rows[0];
            
            console.log(`    🔄 Original: ${testTimestamp}`);
            console.log(`    🔄 To UTC: ${to_utc}`);
            console.log(`    🔄 Back to SAST: ${back_to_sast}`);
            
            // Verify round-trip conversion
            const originalDate = new Date(`${testTimestamp}+02:00`);
            const roundTripDate = new Date(to_utc);
            const timeDiff = Math.abs(originalDate.getTime() - roundTripDate.getTime());
            
            const conversionCorrect = timeDiff < 1000; // Less than 1 second difference
            
            this.testResults.timezone.conversion = {
                original: testTimestamp,
                utc: to_utc,
                round_trip: back_to_sast,
                correct: conversionCorrect,
                status: conversionCorrect ? 'PASS' : 'FAIL'
            };
            
            console.log(`    ${conversionCorrect ? '✅' : '❌'} Timezone conversion: ${conversionCorrect ? 'CORRECT' : 'INCORRECT'}`);
            
        } catch (error) {
            console.error('    ❌ Timezone conversion test failed:', error.message);
        }
    }

    async testPerformance() {
        console.log('\n⚡ Testing Performance...');
        
        const performanceTests = [
            {
                name: 'Simple SELECT',
                query: 'SELECT COUNT(*) FROM production_orders',
                expectedMs: 100
            },
            {
                name: 'JOIN Query',
                query: `
                    SELECT po.*, m.name as machine_name 
                    FROM production_orders po 
                    LEFT JOIN machines m ON po.machine_id = m.id 
                    LIMIT 100
                `,
                expectedMs: 500
            },
            {
                name: 'Complex Analytics',
                query: `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as order_count,
                        AVG(efficiency_percentage) as avg_efficiency
                    FROM production_orders 
                    WHERE created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `,
                expectedMs: 1000
            },
            {
                name: 'INSERT Performance',
                query: `
                    INSERT INTO production_orders (order_number, product_name, quantity, status, environment, created_at)
                    VALUES ('TEST-' || generate_random_uuid(), 'Test Product', 100, 'pending', 'testing', NOW())
                `,
                expectedMs: 50
            }
        ];

        for (const test of performanceTests) {
            try {
                const startTime = Date.now();
                await this.pgPool.query(test.query);
                const duration = Date.now() - startTime;
                
                const withinExpected = duration <= test.expectedMs;
                
                this.testResults.performance[test.name] = {
                    duration_ms: duration,
                    expected_ms: test.expectedMs,
                    within_expected: withinExpected,
                    status: withinExpected ? 'PASS' : 'SLOW'
                };
                
                const status = withinExpected ? '✅' : '⚠️';
                console.log(`  ${status} ${test.name}: ${duration}ms (expected <${test.expectedMs}ms)`);
                
            } catch (error) {
                console.error(`  ❌ ${test.name} failed:`, error.message);
                this.testResults.performance[test.name] = {
                    status: 'ERROR',
                    error: error.message
                };
            }
        }
    }

    async testFunctionality() {
        console.log('\n🔧 Testing Functionality...');
        
        try {
            // Test WebSocket-related queries
            await this.testWebSocketQueries();
            
            // Test reporting queries
            await this.testReportingQueries();
            
            // Test CRUD operations
            await this.testCRUDOperations();
            
        } catch (error) {
            console.error('❌ Functionality testing failed:', error.message);
        }
    }

    async testWebSocketQueries() {
        console.log('  📡 Testing WebSocket-related queries...');
        
        try {
            // Test active orders query (used by WebSocket)
            const activeOrdersResult = await this.pgPool.query(`
                SELECT po.*, m.name as machine_name, u.username as operator_name
                FROM production_orders po
                LEFT JOIN machines m ON po.machine_id = m.id
                LEFT JOIN users u ON po.operator_id = u.id
                WHERE po.status = 'in_progress'
                ORDER BY po.start_time DESC
            `);
            
            console.log(`    📊 Active orders found: ${activeOrdersResult.rows.length}`);
            
            this.testResults.functionality.websocket_queries = {
                active_orders: activeOrdersResult.rows.length,
                status: 'PASS'
            };
            
        } catch (error) {
            console.error('    ❌ WebSocket queries test failed:', error.message);
            this.testResults.functionality.websocket_queries = {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    async testReportingQueries() {
        console.log('  📈 Testing reporting queries...');
        
        try {
            // Test efficiency report query
            const efficiencyReport = await this.pgPool.query(`
                SELECT 
                    DATE(complete_time) as date,
                    COUNT(*) as completed_orders,
                    AVG(efficiency_percentage) as avg_efficiency,
                    SUM(actual_quantity) as total_produced
                FROM production_orders
                WHERE status = 'completed'
                    AND complete_time >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(complete_time)
                ORDER BY date DESC
            `);
            
            console.log(`    📊 Efficiency report rows: ${efficiencyReport.rows.length}`);
            
            // Test downtime report query
            const downtimeReport = await this.pgPool.query(`
                SELECT 
                    ps.category,
                    COUNT(*) as stop_count,
                    AVG(ps.duration) as avg_duration,
                    SUM(ps.duration) as total_duration
                FROM production_stops ps
                WHERE ps.start_time >= NOW() - INTERVAL '7 days'
                GROUP BY ps.category
                ORDER BY total_duration DESC
            `);
            
            console.log(`    📊 Downtime report categories: ${downtimeReport.rows.length}`);
            
            this.testResults.functionality.reporting_queries = {
                efficiency_report_rows: efficiencyReport.rows.length,
                downtime_categories: downtimeReport.rows.length,
                status: 'PASS'
            };
            
        } catch (error) {
            console.error('    ❌ Reporting queries test failed:', error.message);
            this.testResults.functionality.reporting_queries = {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    async testCRUDOperations() {
        console.log('  🔄 Testing CRUD operations...');
        
        try {
            // Test INSERT
            const insertResult = await this.pgPool.query(`
                INSERT INTO production_orders (order_number, product_name, quantity, status, environment, created_at)
                VALUES ('MIGRATION-TEST-001', 'Test Product', 100, 'pending', 'testing', NOW())
                RETURNING id
            `);
            
            const testOrderId = insertResult.rows[0].id;
            console.log(`    ➕ Insert test: Created order ID ${testOrderId}`);
            
            // Test SELECT
            const selectResult = await this.pgPool.query(
                'SELECT * FROM production_orders WHERE id = $1',
                [testOrderId]
            );
            
            const insertSuccess = selectResult.rows.length === 1;
            console.log(`    🔍 Select test: ${insertSuccess ? 'PASS' : 'FAIL'}`);
            
            // Test UPDATE
            const updateResult = await this.pgPool.query(`
                UPDATE production_orders 
                SET status = 'in_progress', start_time = NOW(), updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `, [testOrderId]);
            
            const updateSuccess = updateResult.rows[0].status === 'in_progress';
            console.log(`    ✏️  Update test: ${updateSuccess ? 'PASS' : 'FAIL'}`);
            
            // Test DELETE (cleanup)
            const deleteResult = await this.pgPool.query(
                'DELETE FROM production_orders WHERE id = $1',
                [testOrderId]
            );
            
            const deleteSuccess = deleteResult.rowCount === 1;
            console.log(`    🗑️  Delete test: ${deleteSuccess ? 'PASS' : 'FAIL'}`);
            
            this.testResults.functionality.crud_operations = {
                insert: insertSuccess,
                select: insertSuccess,
                update: updateSuccess,
                delete: deleteSuccess,
                status: (insertSuccess && updateSuccess && deleteSuccess) ? 'PASS' : 'FAIL'
            };
            
        } catch (error) {
            console.error('    ❌ CRUD operations test failed:', error.message);
            this.testResults.functionality.crud_operations = {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    async querySQLite(query) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.sqlitePath);
            db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
                db.close();
            });
        });
    }

    generateReport() {
        console.log('\n' + '=' * 60);
        console.log('📋 MIGRATION TEST REPORT');
        console.log('=' * 60);
        
        // Data Integrity Summary
        console.log('\n📊 DATA INTEGRITY RESULTS:');
        const integrityTests = Object.entries(this.testResults.dataIntegrity);
        const integrityPassed = integrityTests.filter(([_, result]) => result.status === 'PASS').length;
        console.log(`  Passed: ${integrityPassed}/${integrityTests.length}`);
        
        for (const [table, result] of integrityTests) {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`  ${status} ${table}: ${result.status}`);
        }
        
        // Timezone Summary
        console.log('\n🕒 TIMEZONE HANDLING RESULTS:');
        const timezoneTests = Object.entries(this.testResults.timezone);
        for (const [test, result] of timezoneTests) {
            if (result.status) {
                const status = result.status === 'PASS' ? '✅' : '❌';
                console.log(`  ${status} ${test}: ${result.status}`);
            }
        }
        
        // Performance Summary
        console.log('\n⚡ PERFORMANCE RESULTS:');
        const performanceTests = Object.entries(this.testResults.performance);
        const performancePassed = performanceTests.filter(([_, result]) => result.status === 'PASS').length;
        console.log(`  Passed: ${performancePassed}/${performanceTests.length}`);
        
        for (const [test, result] of performanceTests) {
            if (result.duration_ms) {
                const status = result.status === 'PASS' ? '✅' : result.status === 'SLOW' ? '⚠️' : '❌';
                console.log(`  ${status} ${test}: ${result.duration_ms}ms`);
            }
        }
        
        // Functionality Summary
        console.log('\n🔧 FUNCTIONALITY RESULTS:');
        const functionalityTests = Object.entries(this.testResults.functionality);
        for (const [test, result] of functionalityTests) {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`  ${status} ${test}: ${result.status}`);
        }
        
        // Overall Status
        const allIntegrityPassed = integrityTests.every(([_, result]) => result.status === 'PASS');
        const allTimezonePassed = Object.values(this.testResults.timezone).every(result => !result.status || result.status === 'PASS');
        const allFunctionalityPassed = Object.values(this.testResults.functionality).every(result => result.status === 'PASS');
        
        const overallPassed = allIntegrityPassed && allTimezonePassed && allFunctionalityPassed;
        
        console.log('\n' + '=' * 60);
        console.log(`🎯 OVERALL RESULT: ${overallPassed ? '✅ MIGRATION SUCCESSFUL' : '❌ MIGRATION ISSUES DETECTED'}`);
        console.log('=' * 60);
        
        // Save detailed report to file
        const reportPath = path.join(__dirname, 'migration-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        return overallPassed;
    }

    async cleanup() {
        try {
            await this.pgPool.end();
            console.log('✅ Database connections closed');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

// Export for use in other scripts
module.exports = MigrationTester;

// Run tests if called directly
if (require.main === module) {
    const postgresConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'production_orders',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        options: '-c timezone=Africa/Johannesburg'
    };
    
    const sqlitePath = process.env.SQLITE_PATH || './production.db';
    
    const tester = new MigrationTester(postgresConfig, sqlitePath);
    
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}