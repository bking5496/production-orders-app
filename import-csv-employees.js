const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./production.db');

// Function to create username from name
const createUsername = (name) => {
    return name.toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, ''); // Remove special characters except dots
};

// Function to create email from name and company
const createEmail = (name, company) => {
    const username = createUsername(name);
    const domain = company.toLowerCase().replace(/\s+/g, '');
    return `${username}@${domain}.com`;
};

async function importEmployeesFromCSV() {
    console.log('🚀 Starting CSV employee import...');
    
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

        // Read and parse CSV file
        const csvContent = fs.readFileSync('./Employee.csv', 'utf-8');
        const lines = csvContent.split('\n');
        
        // Skip header and empty lines
        const employeeLines = lines.slice(1).filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.match(/^;+$/); // Skip empty lines and lines with only semicolons
        });

        console.log(`📄 Found ${employeeLines.length} employees in CSV file`);

        let importCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        for (const line of employeeLines) {
            const columns = line.split(';');
            
            // Skip if we don't have all required columns
            if (columns.length < 3 || !columns[0] || !columns[1] || !columns[2]) {
                continue;
            }

            const employeeCode = columns[0].trim();
            const fullName = columns[1].trim();
            const company = columns[2].trim();

            // Skip if any field is empty
            if (!employeeCode || !fullName || !company) {
                continue;
            }

            const username = createUsername(fullName);
            const email = createEmail(fullName, company);
            const role = 'packer'; // Assign all as packers as requested
            const passwordHash = await bcrypt.hash('temp123', 10); // Temporary password

            try {
                // Check if employee already exists
                const existingUser = await new Promise((resolve, reject) => {
                    db.get(
                        'SELECT id FROM users WHERE employee_code = ? OR username = ?',
                        [employeeCode, username],
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
                                username = ?,
                                is_active = 1
                            WHERE employee_code = ?
                        `, [fullName, company, role, email, username, employeeCode], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    updateCount++;
                    console.log(`📝 Updated employee: ${fullName} (${employeeCode}) - ${role} at ${company}`);
                } else {
                    // Insert new employee
                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT INTO users (
                                username, email, password_hash, role, fullName, 
                                company, employee_code, is_active
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                        `, [username, email, passwordHash, role, fullName, company, employeeCode], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    importCount++;
                    console.log(`➕ Added employee: ${fullName} (${employeeCode}) - ${role} at ${company}`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${fullName} (${employeeCode}):`, error.message);
                errorCount++;
            }
        }

        console.log(`\n🎉 CSV Import completed!`);
        console.log(`   📊 New employees added: ${importCount}`);
        console.log(`   📝 Employees updated: ${updateCount}`);
        console.log(`   ❌ Errors encountered: ${errorCount}`);
        console.log(`   📋 Total processed: ${importCount + updateCount}`);

        // Show summary of employees by company
        const companySummary = await new Promise((resolve, reject) => {
            db.all(`
                SELECT company, COUNT(*) as count 
                FROM users 
                WHERE is_active = 1 AND role = 'packer'
                GROUP BY company 
                ORDER BY count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n📈 Employee Summary by Company (Packers only):');
        companySummary.forEach(row => {
            console.log(`   ${row.company.padEnd(25)} | ${row.count} employees`);
        });

        // Show total count
        const totalCount = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as total 
                FROM users 
                WHERE is_active = 1 AND role = 'packer'
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        console.log(`\n📊 Total active packers in database: ${totalCount.total}`);

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        db.close();
        console.log('\n🔐 Database connection closed');
    }
}

// Run the import
importEmployeesFromCSV();