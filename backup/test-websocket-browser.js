// Test WebSocket connection from browser console
// Copy and paste this into your browser console after logging into the app

console.log('🧪 Testing WebSocket connection...');

// Test the WebSocket token endpoint first
fetch('/api/auth/websocket-token', {
    method: 'GET',
    credentials: 'include'
})
.then(response => response.json())
.then(data => {
    if (data.token) {
        console.log('✅ WebSocket token received');
        
        // Test WebSocket connection
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}?token=${encodeURIComponent(data.token)}`;
        console.log('🔗 Connecting to WebSocket...');
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('✅ WebSocket connected successfully!');
            ws.send(JSON.stringify({ type: 'ping' }));
        };
        
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            console.log('📨 WebSocket message:', msg);
            
            if (msg.type === 'welcome') {
                console.log('🎉 WebSocket authentication successful!');
                // Subscribe to channels
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    channels: ['orders', 'machines']
                }));
            }
        };
        
        ws.onclose = (event) => {
            console.log('🔌 WebSocket closed:', event.code, event.reason);
        };
        
        ws.onerror = (error) => {
            console.error('💥 WebSocket error:', error);
        };
        
        // Close after 10 seconds
        setTimeout(() => {
            ws.close();
            console.log('🔌 Test completed');
        }, 10000);
        
    } else {
        console.error('❌ Failed to get WebSocket token:', data);
    }
})
.catch(error => {
    console.error('❌ Error getting WebSocket token:', error);
    console.log('💡 Make sure you are logged into the application first');
});

// Also test if the WebSocket service is available
if (window.WebSocketService) {
    console.log('✅ WebSocketService is available');
    console.log('📊 Current status:', window.WebSocketService.getStatus());
    
    // Try to connect using the service
    setTimeout(() => {
        console.log('🔄 Testing WebSocketService.connect()...');
        window.WebSocketService.connect();
    }, 2000);
} else {
    console.log('❌ WebSocketService not found in window object');
}