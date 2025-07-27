const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('production.db');

db.serialize(() => {
  // Add missing columns to production_orders
  db.run("ALTER TABLE production_orders ADD COLUMN priority TEXT DEFAULT 'normal'", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added priority column');
  });
  
  db.run("ALTER TABLE production_orders ADD COLUMN due_date DATE", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added due_date column');
  });
  
  db.run("ALTER TABLE production_orders ADD COLUMN notes TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added notes column');
  });
  
  db.run("ALTER TABLE production_orders ADD COLUMN created_by INTEGER", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added created_by column');
  });
  
  db.run("ALTER TABLE production_orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added updated_at column');
  });

  // Add missing columns to machines
  db.run("ALTER TABLE machines ADD COLUMN capacity INTEGER", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added capacity column to machines');
  });

  // Add missing columns to users  
  db.run("ALTER TABLE users ADD COLUMN email TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added email column to users');
  });
  
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator'", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added role column to users');
  });
  
  db.run("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1", (err) => {
    if (err && !err.message.includes('duplicate column')) console.log('Added is_active column to users');
  });

  console.log('Migration completed');
});

setTimeout(() => {
  db.close();
}, 2000);
