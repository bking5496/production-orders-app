const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('production.db');

db.serialize(() => {
  // Insert machines
  const machines = [
    ['Blender-1', 'blending'],
    ['Blender-2', 'blending'],
    ['Maturation-Tank-1', 'maturation'],
    ['Milk-Processor-1', 'milk-powder'],
    ['Seasoning-Mixer-1', 'seasoning'],
    ['Beverage-Line-1', 'beverage']
  ];

  const stmt = db.prepare("INSERT OR IGNORE INTO machines (name, environment) VALUES (?, ?)");
  machines.forEach(([name, env]) => {
    stmt.run(name, env);
  });
  stmt.finalize();

  console.log('Seed data added');
});

db.close();
