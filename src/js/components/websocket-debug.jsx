import React, { useState, useEffect } from 'react';
import { useConnectionStatus, useWebSocket } from '../core/websocket-hooks.js';

// Debug component to help troubleshoot WebSocket issues
export default function WebSocketDebug() {
    const [isVisible, setIsVisible] = useState(false);
    const [debugInfo, setDebugInfo] = useState({});
    const connectionStatus = useConnectionStatus();
    const { connect, disconnect, send } = useWebSocket();

    useEffect(() => {
        const updateDebugInfo = () => {
            const info = {
                timestamp: new Date().toISOString(),
                location: window.location.href,
                userAgent: navigator.userAgent.substring(0, 100) + '...',
                webSocketSupport: typeof WebSocket !== 'undefined',
                enhancedServiceExists: typeof window.EnhancedWebSocketService !== 'undefined',
                enhancedServiceStatus: window.EnhancedWebSocketService ? window.EnhancedWebSocketService.getConnectionStatus() : null,
                cookies: document.cookie ? 'Present' : 'None',
                protocols: window.location.protocol
            };
            setDebugInfo(info);
        };

        updateDebugInfo();
        const interval = setInterval(updateDebugInfo, 2000);
        return () => clearInterval(interval);
    }, []); // Remove connectionStatus from dependencies to prevent infinite loop

    // Show debug panel only in development or when explicitly enabled
    const shouldShow = isVisible || 
        window.location.hostname === 'localhost' || 
        window.location.search.includes('debug=websocket') ||
        window.localStorage.getItem('websocket-debug') === 'true';

    if (!shouldShow) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsVisible(true)}
                    className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs opacity-50 hover:opacity-100"
                    title="Show WebSocket Debug"
                >
                    WS
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm">WebSocket Debug</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ×
                </button>
            </div>
            
            <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-white ${
                        connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                        {connectionStatus.text}
                    </span>
                </div>

                <div className="border-t pt-2">
                    <div><strong>WebSocket Support:</strong> {debugInfo.webSocketSupport ? '✅' : '❌'}</div>
                    <div><strong>Enhanced Service:</strong> {debugInfo.enhancedServiceExists ? '✅' : '❌'}</div>
                    <div><strong>Protocol:</strong> {debugInfo.protocols}</div>
                    <div><strong>Cookies:</strong> {debugInfo.cookies}</div>
                </div>

                {debugInfo.enhancedServiceStatus && (
                    <div className="border-t pt-2">
                        <div><strong>Connection ID:</strong> {debugInfo.enhancedServiceStatus.connectionId || 'None'}</div>
                        <div><strong>Subscriptions:</strong> {debugInfo.enhancedServiceStatus.subscriptions?.length || 0}</div>
                        <div><strong>Rooms:</strong> {debugInfo.enhancedServiceStatus.rooms?.length || 0}</div>
                        <div><strong>Queued Messages:</strong> {debugInfo.enhancedServiceStatus.queuedMessages || 0}</div>
                    </div>
                )}

                <div className="border-t pt-2 flex gap-2">
                    <button
                        onClick={() => connect()}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                        disabled={connectionStatus.isConnected}
                    >
                        Connect
                    </button>
                    <button
                        onClick={() => disconnect()}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                        disabled={!connectionStatus.isConnected}
                    >
                        Disconnect
                    </button>
                    <button
                        onClick={() => send('ping')}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                        disabled={!connectionStatus.isConnected}
                    >
                        Ping
                    </button>
                </div>

                <div className="border-t pt-2">
                    <button
                        onClick={() => {
                            console.log('🐛 WebSocket Debug Info:', debugInfo);
                            console.log('🐛 Enhanced Service:', window.EnhancedWebSocketService);
                            console.log('🐛 Connection Status:', connectionStatus);
                        }}
                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs w-full"
                    >
                        Log Debug Info
                    </button>
                </div>
            </div>
        </div>
    );
}