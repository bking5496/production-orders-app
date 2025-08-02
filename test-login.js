// Test login functionality directly
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const testLogin = async () => {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'production_orders',
        user: 'postgres',
        password: 'prodapp123'
    });

    try {
        console.log('🔍 Testing login with username: admin');
        
        // Query user
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = $2',
            ['admin', true]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ No user found');
            return;
        }
        
        const user = result.rows[0];
        console.log('✅ User found:', user.username, user.role);
        
        // Test password
        const passwordMatch = await bcrypt.compare('admin123', user.password_hash);
        console.log('🔑 Password match:', passwordMatch);
        
        if (passwordMatch) {
            console.log('🎉 Login would succeed!');
        } else {
            console.log('❌ Password does not match');
        }
        
    } catch (error) {
        console.error('❌ Login test failed:', error);
    } finally {
        await pool.end();
    }
};

testLogin();