#!/usr/bin/env node

// Script to get a valid WebSocket token for testing
const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getWebSocketToken() {
    console.log('🔐 WebSocket Token Generator');
    console.log('============================');

    return new Promise((resolve, reject) => {
        rl.question('Enter username: ', (username) => {
            rl.question('Enter password: ', async (password) => {
                try {
                    console.log('\n🔄 Authenticating...');

                    // First, login to get session cookie
                    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    if (!loginResponse.ok) {
                        throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
                    }

                    // Get cookies from login response
                    const cookies = loginResponse.headers.get('set-cookie');
                    if (!cookies) {
                        throw new Error('No authentication cookie received');
                    }

                    console.log('✅ Login successful');

                    // Now get WebSocket token
                    console.log('🎫 Getting WebSocket token...');

                    const tokenResponse = await fetch('http://localhost:3000/api/auth/websocket-token', {
                        method: 'GET',
                        headers: {
                            'Cookie': cookies,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!tokenResponse.ok) {
                        throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
                    }

                    const tokenData = await tokenResponse.json();
                    
                    console.log('\n✅ WebSocket token obtained successfully!');
                    console.log('🎫 Token:', tokenData.token);
                    console.log('⏰ Expires in:', tokenData.expiresIn, 'seconds');
                    console.log('\n📋 Copy this token to use with websocket-test.js:');
                    console.log('\n' + '='.repeat(50));
                    console.log(tokenData.token);
                    console.log('='.repeat(50));

                    rl.close();
                    resolve(tokenData.token);

                } catch (error) {
                    console.error('💥 Error:', error.message);
                    rl.close();
                    reject(error);
                }
            });
        });
    });
}

// Also create a simple version that works with existing sessions
async function getTokenFromSession() {
    try {
        console.log('🔄 Checking for existing session...');
        
        const response = await fetch('http://localhost:3000/api/auth/websocket-token', {
            method: 'GET',
            credentials: 'include', // This would work in browser context
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Got token from existing session:', data.token);
            return data.token;
        } else {
            console.log('ℹ️ No valid session found, need to login');
            return null;
        }
    } catch (error) {
        console.log('ℹ️ Could not get token from session:', error.message);
        return null;
    }
}

async function main() {
    try {
        // Try to get token from existing session first
        let token = await getTokenFromSession();
        
        if (!token) {
            // If no session, prompt for credentials
            token = await getWebSocketToken();
        }

        // Now test the WebSocket connection
        console.log('\n🧪 Testing WebSocket connection...');
        
        const WebSocketTester = require('./websocket-test.js');
        const tester = new WebSocketTester();
        
        await tester.connect(token);
        
        // Wait a moment for authentication
        setTimeout(() => {
            if (tester.authenticated) {
                console.log('🎉 WebSocket test successful!');
                console.log('✨ You can now use the token with websocket-test.js');
            } else {
                console.log('⚠️ WebSocket connected but authentication may have failed');
            }
            
            tester.disconnect();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error('💥 Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { getWebSocketToken, getTokenFromSession };