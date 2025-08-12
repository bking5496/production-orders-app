const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Note: Since we can't directly read the Excel file in this environment,
// I'll create the employee data based on the structure you described:
// Column A: Employee Code, Column B: First and Last Name, Column C: Company

const employeeData = [
    // Based on your Excel file structure - you can update this with actual data
    { code: 'EMP001', name: 'John Smith', company: 'Production' },
    { code: 'EMP002', name: 'Sarah Johnson', company: 'Packaging' },
    { code: 'EMP003', name: 'Mike Wilson', company: 'Quality' },
    { code: 'EMP004', name: 'Lisa Brown', company: 'Production' },
    { code: 'EMP005', name: 'David Jones', company: 'Packaging' },
    { code: 'EMP006', name: 'Emma Davis', company: 'Maintenance' },
    { code: 'EMP007', name: 'Chris Miller', company: 'Production' },
    { code: 'EMP008', name: 'Anna Taylor', company: 'Quality' },
    { code: 'EMP009', name: 'Tom Anderson', company: 'Packaging' },
    { code: 'EMP010', name: 'Jane Wilson', company: 'Production' },
    // Add more employees as needed from your Excel file
];

const db = new sqlite3.Database('./production.db');

// Function to determine default role based on company
const getDefaultRole = (company) => {
    const roleMap = {
        'Production': 'operator',
        'Packaging': 'packer',
        'Quality': 'operator',
        'Maintenance': 'operator'
    };
    return roleMap[company] || 'operator';
};

// Function to create username from name
const createUsername = (name) => {
    return name.toLowerCase().replace(/\s+/g, '.');
};

// Function to create email from name and company
const createEmail = (name, company) => {
    const username = createUsername(name);
    const domain = company.toLowerCase();
    return `${username}@${domain}.com`;
};

async function importEmployees() {
    console.log('🚀 Starting employee import...');
    
    try {
        // Create daily_role_overrides table if it doesn't exist
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS daily_role_overrides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    original_role TEXT NOT NULL,
                    override_role TEXT NOT NULL,
                    override_date DATE NOT NULL,
                    shift_type TEXT CHECK(shift_type IN ('day', 'night', 'both')) DEFAULT 'both',
                    assigned_by INTEGER NOT NULL,
                    notes TEXT,
                    created_at DATETIME DEFAULT (datetime('now', '+2 hours')),
                    FOREIGN KEY(employee_id) REFERENCES users(id),
                    FOREIGN KEY(assigned_by) REFERENCES users(id),
                    UNIQUE(employee_id, override_date, shift_type)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Created daily_role_overrides table');

        // Import employees
        let importCount = 0;
        let updateCount = 0;

        for (const employee of employeeData) {
            const { code, name, company } = employee;
            const username = createUsername(name);
            const email = createEmail(name, company);
            const role = getDefaultRole(company);
            const passwordHash = await bcrypt.hash('temp123', 10); // Temporary password

            try {
                // Check if employee already exists
                const existingUser = await new Promise((resolve, reject) => {
                    db.get(
                        'SELECT id FROM users WHERE employee_code = ? OR username = ?',
                        [code, username],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                if (existingUser) {
                    // Update existing employee
                    await new Promise((resolve, reject) => {
                        db.run(`
                            UPDATE users SET 
                                fullName = ?,
                                company = ?,
                                role = ?,
                                email = ?,
                                username = ?
                            WHERE employee_code = ?
                        `, [name, company, role, email, username, code], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    updateCount++;
                    console.log(`📝 Updated employee: ${name} (${code})`);
                } else {
                    // Insert new employee
                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT INTO users (
                                username, email, password_hash, role, fullName, 
                                company, employee_code, is_active
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                        `, [username, email, passwordHash, role, name, company, code], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    importCount++;
                    console.log(`➕ Added employee: ${name} (${code}) - ${role} at ${company}`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${name}:`, error.message);
            }
        }

        console.log(`\n🎉 Import completed!`);
        console.log(`   📊 New employees added: ${importCount}`);
        console.log(`   📝 Employees updated: ${updateCount}`);
        console.log(`   📋 Total processed: ${employeeData.length}`);

        // Show summary of employees by role
        const roleSummary = await new Promise((resolve, reject) => {
            db.all(`
                SELECT role, company, COUNT(*) as count 
                FROM users 
                WHERE is_active = 1 AND role != 'admin'
                GROUP BY role, company 
                ORDER BY role, company
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n📈 Employee Summary by Role & Company:');
        roleSummary.forEach(row => {
            console.log(`   ${row.role.padEnd(12)} | ${row.company.padEnd(12)} | ${row.count} employees`);
        });

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        db.close();
        console.log('\n🔐 Database connection closed');
    }
}

// Run the import
importEmployees();