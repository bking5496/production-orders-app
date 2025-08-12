// add-machines.js - Script to add all your machines to the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'production.db');

console.log('Adding machines to database...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Define your machines with their environments
const machines = [
  // Blending Machines (first 6)
  { name: 'BLENDER LEAL', environment: 'blending', capacity: 100 },
  { name: 'BLENDER MAXMIX', environment: 'blending', capacity: 100 },
  { name: 'BLENDER PLOUGHSHARE', environment: 'blending', capacity: 100 },
  { name: 'BLENDER WINKWORK', environment: 'blending', capacity: 100 },
  { name: 'DRUM BLENDER', environment: 'blending', capacity: 100 },
  { name: 'LIQUID LINE', environment: 'blending', capacity: 100 },
  
  // Packaging Machines
  { name: 'BULKFILLER', environment: 'packaging', capacity: 100 },
  { name: 'CANISTER LINE', environment: 'packaging', capacity: 100 },
  { name: 'CANLINE', environment: 'packaging', capacity: 100 },
  { name: 'CORAZZA CUBE', environment: 'packaging', capacity: 100 },
  { name: 'CORAZZA TABLET', environment: 'packaging', capacity: 100 },
  { name: 'ENFLEX F14', environment: 'packaging', capacity: 100 },
  { name: 'ENFLEX FB 10 1', environment: 'packaging', capacity: 100 },
  { name: 'ENFLEX FB 10 2', environment: 'packaging', capacity: 100 },
  { name: 'ENFLEX FB 10 3', environment: 'packaging', capacity: 100 },
  { name: 'ILAPAK', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 1', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 2', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 3', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 4', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 5', environment: 'packaging', capacity: 100 },
  { name: 'NPS 5 LANE 6', environment: 'packaging', capacity: 100 },
  { name: 'NPS AUGER 3', environment: 'packaging', capacity: 100 },
  { name: 'NPS STICK PACK', environment: 'packaging', capacity: 100 },
  { name: 'UNIVERSAL 1', environment: 'packaging', capacity: 100 },
  { name: 'UNIVERSAL 2', environment: 'packaging', capacity: 100 },
  { name: 'UNIVERSAL 3', environment: 'packaging', capacity: 100 }
];

// First, let's clear existing machines (optional - comment out if you want to keep existing)
console.log('Clearing existing machines...');
db.run('DELETE FROM machines', [], function(err) {
  if (err) {
    console.error('Error clearing machines:', err);
    process.exit(1);
  }
  console.log(`Cleared ${this.changes} existing machines\n`);
  
  // Now add the new machines
  addMachines();
});

function addMachines() {
  const stmt = db.prepare(`
    INSERT INTO machines (name, environment, status, capacity, efficiency_rating, created_at) 
    VALUES (?, ?, 'available', ?, 100.0, CURRENT_TIMESTAMP)
  `);

  let successCount = 0;
  let errorCount = 0;

  machines.forEach((machine, index) => {
    stmt.run(machine.name, machine.environment, machine.capacity, function(err) {
      if (err) {
        console.error(`❌ Error adding ${machine.name}:`, err.message);
        errorCount++;
      } else {
        console.log(`✅ Added ${machine.name} (${machine.environment})`);
        successCount++;
      }
      
      // Check if we're done
      if (successCount + errorCount === machines.length) {
        stmt.finalize();
        
        // Display summary
        console.log('\n📊 Summary:');
        console.log(`   Total machines: ${machines.length}`);
        console.log(`   ✅ Successfully added: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        
        // Show machine count by environment
        db.all(`
          SELECT environment, COUNT(*) as count 
          FROM machines 
          GROUP BY environment 
          ORDER BY environment
        `, [], (err, rows) => {
          if (!err && rows) {
            console.log('\n📦 Machines by Environment:');
            rows.forEach(row => {
              console.log(`   ${row.environment}: ${row.count} machines`);
            });
          }
          
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
            } else {
              console.log('\n✅ Database connection closed');
              console.log('\nMachines have been successfully added to your system!');
              console.log('You can now create orders and assign them to these machines.');
            }
          });
        });
      }
    });
  });
}
