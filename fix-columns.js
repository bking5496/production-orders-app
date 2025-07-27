const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('production.db');

console.log('Fixing column names...\n');

db.serialize(() => {
  // Check if we need to add missing columns
  db.all("PRAGMA table_info(production_orders)", (err, columns) => {
    const columnNames = columns.map(col => col.name);
    
    // Add end_time if it doesn't exist
    if (!columnNames.includes('end_time')) {
      db.run("ALTER TABLE production_orders ADD COLUMN end_time DATETIME", (err) => {
        if (!err) {
          console.log('Added end_time column');
          // Copy data from complete_time to end_time
          db.run("UPDATE production_orders SET end_time = complete_time WHERE complete_time IS NOT NULL");
        }
      });
    }
    
    // Add updated_at if it doesn't exist
    if (!columnNames.includes('updated_at')) {
      db.run("ALTER TABLE production_orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (!err) console.log('Added updated_at column');
      });
    }
    
    // Add created_at if it doesn't exist
    if (!columnNames.includes('created_at')) {
      db.run("ALTER TABLE production_orders ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (!err) console.log('Added created_at column');
      });
    }
  });

  // Check machines table
  db.all("PRAGMA table_info(machines)", (err, columns) => {
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('created_at')) {
      db.run("ALTER TABLE machines ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (!err) console.log('Added created_at to machines');
      });
    }
  });

  // Create missing tables
  db.run(`CREATE TABLE IF NOT EXISTS production_stops (
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
  )`, (err) => {
    if (!err) console.log('Created production_stops table');
  });

  db.run(`CREATE TABLE IF NOT EXISTS waste_records (
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
  )`, (err) => {
    if (!err) console.log('Created waste_records table');
  });

  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
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
  )`, (err) => {
    if (!err) console.log('Created audit_log table');
  });

  db.run(`CREATE TABLE IF NOT EXISTS quality_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    check_type TEXT NOT NULL,
    parameters TEXT,
    result TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    notes TEXT,
    checked_by INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES production_orders(id),
    FOREIGN KEY (checked_by) REFERENCES users(id)
  )`, (err) => {
    if (!err) console.log('Created quality_checks table');
  });

  db.run(`CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    email_enabled BOOLEAN DEFAULT 1,
    push_enabled BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, event_type)
  )`, (err) => {
    if (!err) console.log('Created notification_preferences table');
  });
});

setTimeout(() => {
  db.close();
  console.log('\nColumn fix completed!');
}, 3000);
