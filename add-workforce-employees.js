// add-workforce-employees.js - Add workforce employees for labor planning
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || './production.db';

// Workforce employees for labor planning
const employees = [
    { employee_code: '1144', name: 'Abongile Khambule', role: 'Operator', company: 'Workforce' },
    { employee_code: '1240', name: 'Amanda Gwala', role: 'Packer', company: 'Workforce' }
];

const defaultPassword = 'Workforce123!';

async function addWorkforceEmployees() {
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        console.log('👥 Adding workforce employees for labor planning...');
        
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO users (
                username, email, password_hash, role, fullName, 
                employee_code, company, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        let added = 0;
        for (const employee of employees) {
            // Create username from name (lowercase, replace spaces with dots)
            const username = employee.name.toLowerCase().replace(/\s+/g, '.');
            const email = `${username}@workforce.com`;
            
            await new Promise((resolve, reject) => {
                stmt.run([
                    username,
                    email,
                    hashedPassword,
                    employee.role.toLowerCase(),
                    employee.name,
                    employee.employee_code,
                    employee.company
                ], function(err) {
                    if (err) {
                        console.log(`⚠️ Error adding ${employee.name}: ${err.message}`);
                        resolve();
                    } else if (this.changes > 0) {
                        console.log(`✅ Added ${employee.name} (${employee.employee_code})`);
                        added++;
                        resolve();
                    } else {
                        console.log(`⚠️ ${employee.name} already exists`);
                        resolve();
                    }
                });
            });
        }
        
        stmt.finalize();
        console.log(`\n📊 Summary: Added ${added} new workforce employees`);
        console.log(`🔑 Default password for all employees: ${defaultPassword}`);
        console.log('💡 Employees should change passwords on first login');
        
    } catch (error) {
        console.error('❌ Error adding workforce employees:', error);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    addWorkforceEmployees();
}

module.exports = { addWorkforceEmployees };