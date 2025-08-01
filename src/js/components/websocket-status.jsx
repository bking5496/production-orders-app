import React, { useState } from 'react';
import { useConnectionStatus } from '../core/websocket-hooks.js';

export default function WebSocketStatus() {
    const [expanded, setExpanded] = useState(false);
    const { status, isConnected, isAuthenticated, showReconnecting, color, text, icon, metrics } = useConnectionStatus();

    const getColorClass = () => {
        switch (color) {
            case 'green': return 'bg-green-500';
            case 'yellow': return 'bg-yellow-500';
            case 'blue': return 'bg-blue-500';
            case 'orange': return 'bg-orange-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getTextColorClass = () => {
        switch (color) {
            case 'green': return 'text-green-700';
            case 'yellow': return 'text-yellow-700';
            case 'blue': return 'text-blue-700';
            case 'orange': return 'text-orange-700';
            case 'red': return 'text-red-700';
            default: return 'text-gray-700';
        }
    };

    const formatUptime = (uptime) => {
        if (!uptime) return '0s';
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    return (
        <div className="relative">
            {/* Status Indicator */}
            <div 
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                onClick={() => setExpanded(!expanded)}
                title="WebSocket Connection Status"
            >
                <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${getColorClass()}`}>
                        {showReconnecting && (
                            <div className={`absolute inset-0 rounded-full ${getColorClass()} opacity-75 animate-ping`}></div>
                        )}
                    </div>
                </div>
                
                <span className={`text-sm font-medium ${getTextColorClass()}`}>
                    {text}
                </span>
                
                {metrics.messagesReceived > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {metrics.messagesReceived}
                    </span>
                )}
                
                <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">WebSocket Status</h3>
                            <div className="flex items-center space-x-2">
                                <span className="text-2xl">{icon}</span>
                                <span className={`font-medium ${getTextColorClass()}`}>{text}</span>
                            </div>
                        </div>

                        {/* Connection Details */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`ml-2 font-medium ${getTextColorClass()}`}>{status}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Authenticated:</span>
                                    <span className={`ml-2 font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                                        {isAuthenticated ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>

                            {/* Metrics */}
                            {isConnected && metrics && (
                                <div className="border-t pt-3">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Connection Metrics</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>
                                            <span>Messages Received:</span>
                                            <span className="ml-1 font-medium text-gray-900">{metrics.messagesReceived || 0}</span>
                                        </div>
                                        <div>
                                            <span>Messages Sent:</span>
                                            <span className="ml-1 font-medium text-gray-900">{metrics.messagesSent || 0}</span>
                                        </div>
                                        <div>
                                            <span>Reconnections:</span>
                                            <span className="ml-1 font-medium text-gray-900">{metrics.reconnections || 0}</span>
                                        </div>
                                        <div>
                                            <span>Uptime:</span>
                                            <span className="ml-1 font-medium text-gray-900">{formatUptime(metrics.uptime)}</span>
                                        </div>
                                        {metrics.lastPing && (
                                            <div className="col-span-2">
                                                <span>Last Ping:</span>
                                                <span className="ml-1 font-medium text-gray-900">
                                                    {new Date(metrics.lastPing).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Connection Actions */}
                            <div className="border-t pt-3 flex space-x-2">
                                <button
                                    onClick={() => {
                                        if (isConnected) {
                                            window.EnhancedWebSocketService?.disconnect();
                                        } else {
                                            window.EnhancedWebSocketService?.connect();
                                        }
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                                        isConnected 
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                >
                                    {isConnected ? 'Disconnect' : 'Connect'}
                                </button>
                                
                                {status === 'error' && (
                                    <button
                                        onClick={() => window.EnhancedWebSocketService?.connect()}
                                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md"
                                    >
                                        Retry
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => {
                                        const metrics = window.EnhancedWebSocketService?.getMetrics();
                                        console.log('WebSocket Metrics:', metrics);
                                        console.log('WebSocket Status:', window.EnhancedWebSocketService?.getConnectionStatus());
                                    }}
                                    className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
                                >
                                    Debug
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact version for header/toolbar
export function WebSocketStatusCompact() {
    const { icon, text, color } = useConnectionStatus();
    
    const getColorClass = () => {
        switch (color) {
            case 'green': return 'text-green-600';
            case 'yellow': return 'text-yellow-600';
            case 'blue': return 'text-blue-600';
            case 'orange': return 'text-orange-600';
            case 'red': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="flex items-center space-x-1" title={`WebSocket: ${text}`}>
            <span className="text-sm">{icon}</span>
            <span className={`text-xs font-medium ${getColorClass()}`}>
                WS
            </span>
        </div>
    );
}

// Simple indicator for minimal UI
export function WebSocketIndicator() {
    const { color, text, showReconnecting } = useConnectionStatus();
    
    const getColorClass = () => {
        switch (color) {
            case 'green': return 'bg-green-500';
            case 'yellow': return 'bg-yellow-500';
            case 'blue': return 'bg-blue-500';
            case 'orange': return 'bg-orange-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="relative" title={`WebSocket: ${text}`}>
            <div className={`w-2 h-2 rounded-full ${getColorClass()}`}>
                {showReconnecting && (
                    <div className={`absolute inset-0 rounded-full ${getColorClass()} opacity-75 animate-ping`}></div>
                )}
            </div>
        </div>
    );
}