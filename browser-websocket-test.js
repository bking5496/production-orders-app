// browser-websocket-test.js - Browser WebSocket Test
// Copy and paste this into your browser console while on the application

console.log('🧪 Browser WebSocket Test');
console.log('=========================');

// Test WebSocket Service if available
if (window.WebSocketService) {
    console.log('✅ WebSocket service found');
    
    // Get current status
    const status = window.WebSocketService.getStatus();
    console.log('📊 Current status:', status);
    
    // Test event listeners
    window.WebSocketService.on('connected', () => {
        console.log('🎉 WebSocket connected event received');
    });
    
    window.WebSocketService.on('order_update', (data) => {
        console.log('📦 Order update received:', data);
    });
    
    window.WebSocketService.on('machine_update', (data) => {
        console.log('🔧 Machine update received:', data);
    });
    
    // Subscribe to test channels
    console.log('📺 Subscribing to test channels...');
    window.WebSocketService.subscribe(['orders', 'machines', 'notifications']);
    
    // Test manual connection if not connected
    if (!status.isConnected) {
        console.log('🔄 Attempting to connect...');
        window.WebSocketService.connect();
    }
    
    console.log('✅ Test setup complete. Watch for real-time events above.');
    console.log('💡 Tip: Try starting/stopping production orders to see WebSocket events');
    
} else {
    console.error('❌ WebSocket service not available');
    console.log('🔍 Checking for WebSocket in window object...');
    console.log('WebSocket available:', typeof WebSocket !== 'undefined');
    console.log('Window keys containing "socket":', Object.keys(window).filter(k => k.toLowerCase().includes('socket')));
}

// Manual WebSocket test function
window.testWebSocket = function() {
    console.log('🧪 Manual WebSocket Test');
    
    // Get token from cookie
    const token = document.cookie.split(';').find(cookie => cookie.trim().startsWith('token='));
    if (!token) {
        console.error('❌ No authentication token found in cookies');
        return;
    }
    
    const tokenValue = token.split('=')[1];
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}?token=${encodeURIComponent(tokenValue)}`;
    
    console.log('📡 Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('✅ Manual WebSocket connected');
        ws.send(JSON.stringify({ type: 'ping' }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Manual WebSocket message:', data);
    };
    
    ws.onclose = (event) => {
        console.log('🔌 Manual WebSocket closed:', event.code, event.reason);
    };
    
    ws.onerror = (error) => {
        console.error('💥 Manual WebSocket error:', error);
    };
    
    // Close after 5 seconds
    setTimeout(() => {
        ws.close();
        console.log('🔌 Closing manual test connection');
    }, 5000);
};

console.log('💡 Run testWebSocket() to perform a manual connection test');

// Simulate some test events for demonstration
window.simulateOrderEvents = function() {
    if (!window.WebSocketService || !window.WebSocketService.isConnected()) {
        console.error('❌ WebSocket not connected. Cannot simulate events.');
        return;
    }
    
    console.log('🎭 Simulating order events...');
    
    // Simulate events (these would normally come from the server)
    const events = [
        {
            type: 'order_started',
            data: {
                order: { order_number: 'TEST001', machine_name: 'Test Machine' },
                operator: 'Test User'
            },
            timestamp: new Date().toISOString()
        },
        {
            type: 'order_completed',
            data: {
                order: { order_number: 'TEST001' },
                efficiency: 95.5,
                completed_by: 'Test User'
            },
            timestamp: new Date().toISOString()
        }
    ];
    
    events.forEach((event, index) => {
        setTimeout(() => {
            console.log('🎭 Simulating event:', event.type);
            window.WebSocketService.emit('order_update', event);
        }, index * 2000);
    });
};

console.log('🎭 Run simulateOrderEvents() to test the notification system');