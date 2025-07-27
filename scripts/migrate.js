// scripts/migrate.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../production.db');
const db = new sqlite3.Database(dbPath);

const migrations = [
  {
    id: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );
      CREATE TABLE IF NOT EXISTS machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT DEFAULT 'available',
        environment TEXT,
        capacity INTEGER,
        production_rate INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS production_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        completed_quantity INTEGER DEFAULT 0,
        environment TEXT,
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        machine_id INTEGER,
        operator_id INTEGER,
        due_date DATE,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        start_time DATETIME,
        completed_time DATETIME,
        efficiency_percentage REAL,
        archived INTEGER DEFAULT 0
      );
       CREATE TABLE IF NOT EXISTS production_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        duration INTEGER,
        created_by INTEGER
      );
       CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `
  },
  {
    id: 'add_user_details_for_planner',
    sql: `ALTER TABLE users ADD COLUMN employee_code TEXT;`,
  },
  {
    id: 'add_user_company',
    sql: `ALTER TABLE users ADD COLUMN company TEXT;`
  },
  {
      id: 'add_user_preferred_machine',
      sql: `ALTER TABLE users ADD COLUMN preferred_machine TEXT;`
  },
  {
    id: 'create_labor_assignments_table',
    sql: `
      CREATE TABLE IF NOT EXISTS labor_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        machine_id INTEGER NOT NULL,
        assignment_date TEXT NOT NULL,
        shift TEXT NOT NULL,
        status TEXT DEFAULT 'planned',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
      );
    `,
  },
];

console.log('Starting database migrations...');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY)", (err) => {
        if (err) return console.error("Error creating migrations table", err);
        
        const runMigration = (index) => {
            if (index >= migrations.length) {
                console.log("✨ All migrations checked. Database is up to date.");
                db.close();
                return;
            }

            const migration = migrations[index];
            db.get("SELECT id FROM migrations WHERE id = ?", [migration.id], (err, row) => {
                if (err) return console.error(`Error checking migration ${migration.id}`, err);
                
                if (row) {
                    runMigration(index + 1);
                } else {
                    db.exec(migration.sql, (err) => {
                        if (err) {
                           if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                                console.error(`✗ Migration '${migration.id}' failed: ${err.message}`);
                           }
                           runMigration(index + 1);
                        } else {
                            db.run("INSERT INTO migrations (id) VALUES (?)", [migration.id], () => {
                                console.log(`✓ Migration '${migration.id}' applied successfully.`);
                                runMigration(index + 1);
                            });
                        }
                    });
                }
            });
        };
        runMigration(0);
    });
});
