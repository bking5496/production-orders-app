// Reset admin password for immediate login access
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const resetAdminPassword = async () => {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'production_orders',
        user: 'postgres',
        password: 'prodapp123'
    });

    try {
        // Hash the password 'admin123'
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Update admin password in PostgreSQL
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [hashedPassword, 'admin']
        );
        
        console.log('✅ Admin password reset successfully');
        console.log('📝 Username: admin');
        console.log('🔑 Password: admin123');
        console.log('🌐 Login at: https://oracles.africa/');
        
    } catch (error) {
        console.error('❌ Password reset failed:', error);
    } finally {
        await pool.end();
    }
};

resetAdminPassword();