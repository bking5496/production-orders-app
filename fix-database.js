const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('production.db');

console.log('Fixing database...\n');

db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create all required tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'operator',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    environment TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    capacity INTEGER,
    efficiency_rating REAL DEFAULT 100.0,
    last_maintenance DATETIME,
    next_maintenance DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, environment)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS production_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    environment TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    due_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    machine_id INTEGER,
    operator_id INTEGER,
    created_by INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    actual_quantity INTEGER,
    efficiency_percentage REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id),
    FOREIGN KEY (operator_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Create admin user
  bcrypt.hash('admin123', 10, (err, hash) => {
    if (!err) {
      db.run(`INSERT OR REPLACE INTO users (id, username, password_hash, email, role) 
              VALUES (1, 'admin', ?, 'admin@oracles.africa', 'admin')`, [hash], (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
        } else {
          console.log('Admin user created/updated');
        }
      });
    }
  });

  // Create operator user
  bcrypt.hash('operator123', 10, (err, hash) => {
    if (!err) {
      db.run(`INSERT OR IGNORE INTO users (username, password_hash, email, role) 
              VALUES ('operator', ?, 'operator@oracles.africa', 'operator')`, [hash], (err) => {
        if (!err) console.log('Operator user created');
      });
    }
  });

  // Insert machines
  const machines = [
    ['Blender-1', 'blending', 100],
    ['Blender-2', 'blending', 150],
    ['Maturation-Tank-1', 'maturation', 200],
    ['Maturation-Tank-2', 'maturation', 200],
    ['Milk-Processor-1', 'milk-powder', 300],
    ['Seasoning-Mixer-1', 'seasoning', 100],
    ['Beverage-Line-1', 'beverage', 500]
  ];

  machines.forEach(([name, env, capacity]) => {
    db.run(`INSERT OR IGNORE INTO machines (name, environment, capacity) VALUES (?, ?, ?)`,
      [name, env, capacity], (err) => {
        if (!err) console.log(`Machine ${name} added`);
      });
  });

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON production_orders(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_environment ON production_orders(environment)');
  db.run('CREATE INDEX IF NOT EXISTS idx_machines_environment ON machines(environment)');
});

setTimeout(() => {
  db.close();
  console.log('\nDatabase fix completed!');
  console.log('\nYou can now login with:');
  console.log('Username: admin');
  console.log('Password: admin123');
}, 3000);
