const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./production.db');

// Function to create a proper email domain from company name
const createEmailDomain = (company) => {
    return company.toLowerCase()
        .replace(/\s+/g, '')           // Remove spaces
        .replace(/[^a-z0-9]/g, '')     // Remove special characters including slashes
        .substring(0, 20)              // Limit length
        + '.com';
};

// Function to create username from name (clean version)
const createUsername = (name) => {
    return name.toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')    // Remove special characters except dots
        .replace(/\.+/g, '.')          // Replace multiple dots with single dot
        .replace(/^\.+|\.+$/g, '');    // Remove leading/trailing dots
};

async function fixEmployeeEmails() {
    console.log('🔧 Starting email fix for packer employees...');
    
    try {
        // Get all packer employees
        const employees = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, fullName, company, email 
                FROM users 
                WHERE role = 'packer'
                ORDER BY company, fullName
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📄 Found ${employees.length} packer employees to check`);

        let fixedCount = 0;

        for (const employee of employees) {
            const cleanUsername = createUsername(employee.fullName);
            const cleanDomain = createEmailDomain(employee.company);
            const newEmail = `${cleanUsername}@${cleanDomain}`;

            // Update email if it's different
            if (employee.email !== newEmail) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        UPDATE users 
                        SET email = ? 
                        WHERE id = ?
                    `, [newEmail, employee.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`📧 Fixed email for ${employee.fullName}: ${employee.email} → ${newEmail}`);
                fixedCount++;
            }
        }

        console.log(`\n✅ Email fix completed!`);
        console.log(`   📊 Emails fixed: ${fixedCount}`);
        console.log(`   📋 Total checked: ${employees.length}`);

        // Show sample of fixed emails by company
        const sampleEmails = await new Promise((resolve, reject) => {
            db.all(`
                SELECT company, fullName, email 
                FROM users 
                WHERE role = 'packer'
                GROUP BY company
                HAVING MIN(id)
                ORDER BY company
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n📧 Sample emails by company:');
        sampleEmails.forEach(emp => {
            console.log(`   ${emp.company.padEnd(25)} | ${emp.fullName.padEnd(20)} | ${emp.email}`);
        });

    } catch (error) {
        console.error('❌ Email fix failed:', error);
    } finally {
        db.close();
        console.log('\n🔐 Database connection closed');
    }
}

// Run the fix
fixEmployeeEmails();