// create-shift-supervisors-table.js - Create shift supervisors table for labor planning

const sqlite3 = require('sqlite3').verbose();

const DATABASE_PATH = process.env.DATABASE_PATH || './production.db';

console.log('Creating shift supervisors table...');

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Create shift_supervisors table
db.run(`
  CREATE TABLE IF NOT EXISTS shift_supervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supervisor_id INTEGER NOT NULL,
    assignment_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('dayshift', 'nightshift')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    FOREIGN KEY (supervisor_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(supervisor_id, assignment_date, shift)
  )
`, (err) => {
  if (err) {
    console.error('Error creating shift_supervisors table:', err);
  } else {
    console.log('✅ Shift supervisors table created successfully');
    
    // Create index for faster queries
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_shift_supervisors_date_shift 
      ON shift_supervisors(assignment_date, shift)
    `, (err) => {
      if (err) {
        console.error('Error creating index:', err);
      } else {
        console.log('✅ Index created for shift supervisors table');
      }
      db.close();
    });
  }
});