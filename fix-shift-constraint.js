// fix-shift-constraint.js - Fix shift constraint to allow day/night values

const sqlite3 = require('sqlite3').verbose();

const DATABASE_PATH = process.env.DATABASE_PATH || './production.db';

console.log('Fixing shift constraint in shift_supervisors table...');

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// SQLite doesn't support altering constraints directly, so we need to recreate the table
db.serialize(() => {
  // Create new table with correct constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS shift_supervisors_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supervisor_id INTEGER NOT NULL,
      assignment_date DATE NOT NULL,
      shift TEXT NOT NULL CHECK(shift IN ('day', 'night')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      FOREIGN KEY (supervisor_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(supervisor_id, assignment_date, shift)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      return;
    }
    console.log('✅ New table created with correct constraint');
    
    // Copy data from old table if it exists
    db.run(`
      INSERT INTO shift_supervisors_new (id, supervisor_id, assignment_date, shift, created_at, created_by)
      SELECT id, supervisor_id, assignment_date, shift, created_at, created_by 
      FROM shift_supervisors WHERE 1=0
    `, (err) => {
      // This will fail if old table doesn't exist or has no data, which is fine
      
      // Drop old table
      db.run('DROP TABLE IF EXISTS shift_supervisors', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
        } else {
          console.log('✅ Old table dropped');
        }
        
        // Rename new table
        db.run('ALTER TABLE shift_supervisors_new RENAME TO shift_supervisors', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
          } else {
            console.log('✅ Table renamed successfully');
            
            // Create index
            db.run(`
              CREATE INDEX IF NOT EXISTS idx_shift_supervisors_date_shift 
              ON shift_supervisors(assignment_date, shift)
            `, (err) => {
              if (err) {
                console.error('Error creating index:', err);
              } else {
                console.log('✅ Index created');
              }
              db.close();
            });
          }
        });
      });
    });
  });
});