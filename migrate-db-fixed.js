// migrate-db-fixed.js - Fixed Database Migration Script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'production.db');

console.log('Starting database migration...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Function to check if a column exists
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const exists = rows.some(row => row.name === columnName);
        resolve(exists);
      }
    });
  });
}

// Function to run a SQL command
function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Main migration function
async function migrate() {
  try {
    console.log('\nChecking and fixing production_orders table...');
    
    // Check if created_at exists
    const hasCreatedAt = await columnExists('production_orders', 'created_at');
    if (!hasCreatedAt) {
      console.log('Adding created_at to production_orders...');
      await runSQL('ALTER TABLE production_orders ADD COLUMN created_at DATETIME');
      await runSQL('UPDATE production_orders SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
      console.log('✓ Added created_at');
    } else {
      console.log('✓ created_at already exists');
    }

    // Check if updated_at exists
    const hasUpdatedAt = await columnExists('production_orders', 'updated_at');
    if (!hasUpdatedAt) {
      console.log('Adding updated_at to production_orders...');
      await runSQL('ALTER TABLE production_orders ADD COLUMN updated_at DATETIME');
      await runSQL('UPDATE production_orders SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL');
      console.log('✓ Added updated_at');
    } else {
      console.log('✓ updated_at already exists');
    }

    // Check if environment exists
    const hasEnvironment = await columnExists('production_orders', 'environment');
    if (!hasEnvironment) {
      console.log('Adding environment to production_orders...');
      await runSQL('ALTER TABLE production_orders ADD COLUMN environment TEXT');
      await runSQL('UPDATE production_orders SET environment = "production" WHERE environment IS NULL');
      console.log('✓ Added environment');
    } else {
      console.log('✓ environment already exists');
    }

    // Check if priority exists
    const hasPriority = await columnExists('production_orders', 'priority');
    if (!hasPriority) {
      console.log('Adding priority to production_orders...');
      await runSQL('ALTER TABLE production_orders ADD COLUMN priority TEXT');
      await runSQL('UPDATE production_orders SET priority = "normal" WHERE priority IS NULL');
      console.log('✓ Added priority');
    } else {
      console.log('✓ priority already exists');
    }

    // Check if status exists
    const hasStatus = await columnExists('production_orders', 'status');
    if (!hasStatus) {
      console.log('Adding status to production_orders...');
      await runSQL('ALTER TABLE production_orders ADD COLUMN status TEXT');
      await runSQL('UPDATE production_orders SET status = "pending" WHERE status IS NULL');
      console.log('✓ Added status');
    } else {
      console.log('✓ status already exists');
    }

    // Add other missing columns
    const columnsToAdd = [
      { name: 'due_date', type: 'DATE' },
      { name: 'notes', type: 'TEXT' },
      { name: 'machine_id', type: 'INTEGER' },
      { name: 'operator_id', type: 'INTEGER' },
      { name: 'created_by', type: 'INTEGER' },
      { name: 'start_time', type: 'DATETIME' },
      { name: 'end_time', type: 'DATETIME' },
      { name: 'actual_quantity', type: 'INTEGER' },
      { name: 'efficiency_percentage', type: 'REAL' }
    ];

    for (const col of columnsToAdd) {
      const exists = await columnExists('production_orders', col.name);
      if (!exists) {
        console.log(`Adding ${col.name} to production_orders...`);
        await runSQL(`ALTER TABLE production_orders ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name}`);
      } else {
        console.log(`✓ ${col.name} already exists`);
      }
    }

    console.log('\nChecking machines table...');
    
    // Fix machines table
    const machineColumns = [
      { name: 'created_at', type: 'DATETIME' },
      { name: 'environment', type: 'TEXT' }
    ];

    for (const col of machineColumns) {
      const exists = await columnExists('machines', col.name);
      if (!exists) {
        console.log(`Adding ${col.name} to machines...`);
        await runSQL(`ALTER TABLE machines ADD COLUMN ${col.name} ${col.type}`);
        
        if (col.name === 'created_at') {
          await runSQL('UPDATE machines SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
        } else if (col.name === 'environment') {
          await runSQL('UPDATE machines SET environment = "production" WHERE environment IS NULL');
        }
        
        console.log(`✓ Added ${col.name}`);
      }
    }

    console.log('\nCreating indexes...');
    
    // Create indexes (these won't fail if they already exist)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON production_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_environment ON production_orders(environment)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created ON production_orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_machines_environment ON machines(environment)'
    ];

    for (const index of indexes) {
      try {
        await runSQL(index);
        console.log(`✓ Index created or already exists`);
      } catch (err) {
        console.log(`! Index might already exist: ${err.message}`);
      }
    }

    console.log('\nCreating missing tables...');
    
    // Create production_stops table if it doesn't exist
    await runSQL(`CREATE TABLE IF NOT EXISTS production_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      reason TEXT NOT NULL,
      category TEXT,
      notes TEXT,
      reported_by INTEGER,
      FOREIGN KEY (order_id) REFERENCES production_orders(id),
      FOREIGN KEY (reported_by) REFERENCES users(id)
    )`);
    console.log('✓ production_stops table ready');

    // Create waste_records table if it doesn't exist
    await runSQL(`CREATE TABLE IF NOT EXISTS waste_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      waste_type TEXT,
      waste_amount REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      reason TEXT,
      preventable BOOLEAN DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      recorded_by INTEGER,
      FOREIGN KEY (order_id) REFERENCES production_orders(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    )`);
    console.log('✓ waste_records table ready');

    // Create audit_log table if it doesn't exist
    await runSQL(`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    console.log('✓ audit_log table ready');

    console.log('\n✅ Migration completed successfully!');
    
    // Display current schema
    console.log('\nCurrent production_orders schema:');
    const schema = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(production_orders)', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.table(schema.map(col => ({
      Column: col.name,
      Type: col.type,
      NotNull: col.notnull ? 'Yes' : 'No',
      Default: col.dflt_value || 'NULL'
    })));

  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('\nDatabase connection closed');
      }
    });
  }
}

// Run migration
migrate();
