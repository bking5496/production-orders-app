const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const db = new sqlite3.Database('./production.db');
  
  // First, create the users table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, async (err) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Insert or update admin user
    db.run(`
      INSERT INTO users (username, password_hash, email, role, is_active)
      VALUES ('admin', ?, 'admin@example.com', 'admin', 1)
      ON CONFLICT(username) 
      DO UPDATE SET password_hash = ?, is_active = 1
    `, [passwordHash, passwordHash], (err) => {
      if (err) {
        console.error('Error creating admin:', err);
      } else {
        console.log('✅ Admin user created/updated successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
      }
      db.close();
    });
  });
}

createAdmin();
