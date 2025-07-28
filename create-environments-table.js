// create-environments-table.js - Create environments table for production app

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_PATH = process.env.DATABASE_PATH || './production.db';

console.log('Creating environments table...');

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Create environments table
db.run(`
  CREATE TABLE IF NOT EXISTS environments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'blue',
    machine_types TEXT, -- JSON array of machine types
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating environments table:', err);
  } else {
    console.log('✅ Environments table created successfully');
    
    // Insert some default environments based on existing machine environments
    db.all('SELECT DISTINCT environment FROM machines', (err, machines) => {
      if (!err && machines && machines.length > 0) {
        console.log('Found existing machine environments:', machines.map(m => m.environment));
        
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO environments (name, code, description, color) 
          VALUES (?, ?, ?, ?)
        `);
        
        machines.forEach(machine => {
          const env = machine.environment;
          const code = env.toLowerCase().replace(/\s+/g, '_');
          const description = `${env} production environment`;
          const color = env === 'blending' ? 'blue' : env === 'packaging' ? 'green' : 'purple';
          
          stmt.run(env, code, description, color, (err) => {
            if (err) {
              console.error(`Error inserting environment ${env}:`, err);
            } else {
              console.log(`✅ Created environment: ${env}`);
            }
          });
        });
        
        stmt.finalize(() => {
          console.log('✅ Default environments created');
          db.close();
        });
      } else {
        console.log('No existing machine environments found');
        db.close();
      }
    });
  }
});