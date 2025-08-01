#!/usr/bin/env node

// Script to create a test user for WebSocket testing
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function createTestUser() {
    console.log('👤 Creating test user for WebSocket testing...');
    
    const db = new sqlite3.Database('./production.db');
    
    try {
        // Create test user
        const username = 'websocket-test';
        const password = 'test123';
        const email = 'test@websocket.local';
        const role = 'admin';
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT OR REPLACE INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
                [username, email, passwordHash, role],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this);
                    }
                }
            );
        });
        
        console.log('✅ Test user created successfully!');
        console.log('📋 Credentials:');
        console.log('   Username:', username);
        console.log('   Password:', password);
        console.log('   Role:', role);
        console.log('');
        console.log('🚀 Now you can use these credentials with:');
        console.log('   node get-ws-token.js');
        
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            console.log('ℹ️ Test user already exists');
            console.log('📋 Use credentials: websocket-test / test123');
        } else {
            console.error('💥 Error creating test user:', error.message);
        }
    } finally {
        db.close();
    }
}

if (require.main === module) {
    createTestUser();
}