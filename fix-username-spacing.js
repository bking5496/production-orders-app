const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./production.db');

// Function to create proper username with spaces (using fullName as-is)
const createProperUsername = (fullName) => {
    return fullName.toLowerCase().trim();
};

async function fixUsernameSpacing() {
    console.log('🔧 Fixing username spacing to include spaces between first and last names...');
    
    try {
        // Get all packer employees
        const employees = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, fullName, username, employee_code
                FROM users 
                WHERE role = 'packer'
                ORDER BY fullName
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📄 Found ${employees.length} packer employees to update`);

        let fixedCount = 0;
        let duplicateCount = 0;

        for (const employee of employees) {
            const newUsername = createProperUsername(employee.fullName);

            // Skip if username is already correct
            if (employee.username === newUsername) {
                console.log(`✅ Username already correct for ${employee.fullName}: ${newUsername}`);
                continue;
            }

            // Check if this username already exists for a different user
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
                finalUsername = newUsername + ' ' + employee.employee_code;
                duplicateCount++;
                console.log(`⚠️  Duplicate username detected, using: "${finalUsername}" for ${employee.fullName}`);
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

            console.log(`✏️  Fixed username for ${employee.fullName}: "${employee.username}" → "${finalUsername}"`);
            fixedCount++;
        }

        console.log(`\n✅ Username spacing fix completed!`);
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
        console.log('   Full Name                 | Username                 | Emp Code');
        console.log('   --------------------------|--------------------------|----------');
        sampleUsers.forEach(user => {
            console.log(`   ${user.fullName.padEnd(25)} | ${user.username.padEnd(24)} | ${user.employee_code}`);
        });

        // Test search functionality with a few examples
        console.log('\n🔍 Testing search functionality with sample names:');
        const searchTests = ['abongile', 'amanda', 'cele'];
        
        for (const searchTerm of searchTests) {
            const searchResults = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT fullName, username, employee_code
                    FROM users 
                    WHERE role = 'packer' 
                    AND (
                        LOWER(fullName) LIKE ? OR 
                        LOWER(username) LIKE ? OR 
                        employee_code LIKE ?
                    )
                    LIMIT 3
                `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`   Search "${searchTerm}": ${searchResults.length} results found`);
            searchResults.forEach(result => {
                console.log(`     → ${result.fullName} (${result.username}) [${result.employee_code}]`);
            });
        }

    } catch (error) {
        console.error('❌ Username spacing fix failed:', error);
    } finally {
        db.close();
        console.log('\n🔐 Database connection closed');
    }
}

// Run the fix
fixUsernameSpacing();