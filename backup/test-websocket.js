// test-websocket.js - Simple WebSocket connection test
// Run this with: node test-websocket.js

const WebSocket = require('ws');

// Test configuration
const WS_URL = 'ws://localhost:3000';
// Get a real token by:
// 1. Login to your app in browser
// 2. Open dev tools → Application → Cookies → copy 'token' value
const TEST_TOKEN = 'paste-real-jwt-token-here';

console.log('🧪 WebSocket Connection Test');
console.log('============================');

async function testWebSocketConnection() {
    try {
        console.log(`📡 Connecting to: ${WS_URL}?token=${TEST_TOKEN.substring(0, 10)}...`);
        
        const ws = new WebSocket(`${WS_URL}?token=${TEST_TOKEN}`);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            
            // Test ping
            console.log('📤 Sending ping...');
            ws.send(JSON.stringify({ type: 'ping' }));
            
            // Test subscription
            setTimeout(() => {
                console.log('📤 Subscribing to channels...');
                ws.send(JSON.stringify({ 
                    type: 'subscribe', 
                    channels: ['orders', 'machines'] 
                }));
            }, 1000);
            
            // Close after 10 seconds
            setTimeout(() => {
                console.log('🔌 Closing connection...');
                ws.close();
            }, 10000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log(`📨 Received: ${message.type}`, message.data || '');
            } catch (error) {
                console.log('📨 Received (raw):', data.toString());
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed: ${code} - ${reason}`);
        });
        
        ws.on('error', (error) => {
            console.error('💥 WebSocket error:', error.message);
        });
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Run test if executed directly
if (require.main === module) {
    console.log('⚠️  Note: Make sure the server is running and you have a valid JWT token');
    console.log('⚠️  Edit TEST_TOKEN variable with a real token from your browser cookies');
    console.log('');
    
    testWebSocketConnection();
}

module.exports = { testWebSocketConnection };