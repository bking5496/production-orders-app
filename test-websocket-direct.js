// Direct WebSocket connection test
const WebSocket = require('ws');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJ3ZWJzb2NrZXQiLCJpYXQiOjE3NTQwNDY1MDYsImV4cCI6MTc1NDA1MDEwNn0.y2gWrq9D_bOgnIyIasBcdHWIYvcS2GO4svRkFt9M3IA';

console.log('🔗 Testing WebSocket connection...');

const ws = new WebSocket(`ws://localhost:3000?token=${encodeURIComponent(token)}`);

ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('📨 Received message:', message);
    } catch (error) {
        console.log('📨 Received raw data:', data.toString());
    }
});

ws.on('error', (error) => {
    console.error('💥 WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
});

// Send a test message after 1 second
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('📤 Sending test message...');
        ws.send(JSON.stringify({ type: 'ping' }));
    }
}, 1000);

// Close after 5 seconds
setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close();
    process.exit(0);
}, 5000);