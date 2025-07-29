const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./production.db');

// Function to create username without dots
const createCleanUsername = (name) => {
    return name.toLowerCase()
        .replace(/\s+/g, '')           // Remove spaces
        .replace(/[^a-z0-9]/g, '')     // Remove all special characters including dots
        .substring(0, 20);             // Limit length
};

async function fixUsernames() {
    console.log('🔧 Starting username cleanup...');
    
    try {
        // Get all employees with problematic usernames
        const employees = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, fullName, username, employee_code
                FROM users 
                WHERE username LIKE '%.%'
                ORDER BY fullName
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📄 Found ${employees.length} employees with dots in usernames`);

        let fixedCount = 0;
        let duplicateCount = 0;

        for (const employee of employees) {
            const newUsername = createCleanUsername(employee.fullName);

            // Check if this username already exists
            const existingUser = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT id FROM users 
                    WHERE username = ? AND id != ?
                `, [newUsername, employee.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            let finalUsername = newUsername;
            
            // If duplicate exists, add employee code to make it unique
            if (existingUser) {
                finalUsername = newUsername + employee.employee_code;
                duplicateCount++;
                console.log(`⚠️  Duplicate username detected, using: ${finalUsername} for ${employee.fullName}`);
            }

            // Update the username
            await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE users 
                    SET username = ? 
                    WHERE id = ?
                `, [finalUsername, employee.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✏️  Fixed username for ${employee.fullName}: ${employee.username} → ${finalUsername}`);
            fixedCount++;
        }

        console.log(`\n✅ Username cleanup completed!`);
        console.log(`   📊 Usernames fixed: ${fixedCount}`);
        console.log(`   ⚠️  Duplicates handled: ${duplicateCount}`);

        // Show sample of updated usernames
        const sampleUsers = await new Promise((resolve, reject) => {
            db.all(`
                SELECT fullName, username, employee_code 
                FROM users 
                WHERE role = 'packer'
                ORDER BY RANDOM()
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n📋 Sample updated usernames:');
        sampleUsers.forEach(user => {
            console.log(`   ${user.fullName.padEnd(25)} | ${user.username.padEnd(20)} | ${user.employee_code}`);
        });

    } catch (error) {
        console.error('❌ Username fix failed:', error);
    } finally {
        db.close();
        console.log('\n🔐 Database connection closed');
    }
}

// Run the fix
fixUsernames();