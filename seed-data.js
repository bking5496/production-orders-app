const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('production.db');

db.serialize(() => {
  // Add some machines
  const machines = [
    { name: 'Blender-1', environment: 'blending', capacity: 100 },
    { name: 'Blender-2', environment: 'blending', capacity: 150 },
    { name: 'Maturation-Tank-1', environment: 'maturation', capacity: 200 },
    { name: 'Maturation-Tank-2', environment: 'maturation', capacity: 200 },
    { name: 'Milk-Processor-1', environment: 'milk-powder', capacity: 300 },
    { name: 'Seasoning-Mixer-1', environment: 'seasoning', capacity: 100 },
    { name: 'Beverage-Line-1', environment: 'beverage', capacity: 500 }
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO machines (name, environment, capacity) VALUES (?, ?, ?)');
  
  machines.forEach(machine => {
    stmt.run(machine.name, machine.environment, machine.capacity);
  });
  
  stmt.finalize();

  console.log('Seed data added successfully');
});

db.close();
