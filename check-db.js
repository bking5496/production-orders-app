// check-db.js - Debug script to check database state
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'production.db');

console.log('🔍 Checking database state...\n');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
});

async function runQuery(query, title) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error(`❌ Error in ${title}:`, err);
        reject(err);
      } else {
        console.log(`\n📊 ${title}:`);
        if (rows.length === 0) {
          console.log('   No records found');
        } else {
          console.table(rows);
        }
        resolve(rows);
      }
    });
  });
}

async function checkDatabase() {
  try {
    // Check machines
    await runQuery(
      'SELECT id, name, environment, status FROM machines ORDER BY environment, name LIMIT 10',
      'Machines (first 10)'
    );
    
    // Check machine count by environment
    await runQuery(
      'SELECT environment, COUNT(*) as count, SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as available FROM machines GROUP BY environment',
      'Machines by Environment'
    );
    
    // Check users
    await runQuery(
      'SELECT id, username, role, is_active FROM users WHERE is_active = 1',
      'Active Users'
    );
    
    // Check recent orders
    await runQuery(
      'SELECT id, order_number, status, environment, machine_id, operator_id FROM production_orders ORDER BY id DESC LIMIT 5',
      'Recent Orders'
    );
    
    // Check for orders with invalid machine/operator references
    await runQuery(`
      SELECT 
        o.id, 
        o.order_number, 
        o.machine_id,
        o.operator_id,
        m.name as machine_name,
        u.username as operator_name
      FROM production_orders o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON o.operator_id = u.id
      WHERE o.status = 'in_progress' 
        AND (m.id IS NULL OR u.id IS NULL)
    `, 'Orders with Invalid References');
    
    // Check table structure
    console.log('\n📋 Checking table structures...');
    
    const tables = ['machines', 'production_orders', 'users'];
    for (const table of tables) {
      await new Promise((resolve) => {
        db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
          if (!err) {
            console.log(`\n${table} columns:`, rows.map(r => r.name).join(', '));
          }
          resolve();
        });
      });
    }
    
  } catch (error) {
    console.error('Error during check:', error);
  } finally {
    db.close();
    console.log('\n✅ Database check complete');
  }
}

checkDatabase();
