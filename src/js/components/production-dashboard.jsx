import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp, Eye, X, Wifi } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact, WebSocketIndicator } from './websocket-status.jsx';

// Helper to format time from a start date to now, creating a running timer effect
const formatDuration = (sastStartTime) => {
    if (!sastStartTime) return '00:00:00';
    
    const start = Time.toSAST(sastStartTime).getTime();
    const now = Time.getSASTTimestamp();
    const diff = Math.max(0, now - start);

    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

// Helper to calculate efficiency percentage
const calculateEfficiency = (machine) => {
    if (!machine.start_time || machine.status !== 'in_use') return 0;
    
    // Work with UTC timestamps
    const startTime = new Date(machine.start_time).getTime();
    const runtime = Date.now() - startTime;
    const expectedProduction = (runtime / 3600000) * (machine.production_rate || 60);
    const actualProduction = machine.actual_quantity || 0;
    return expectedProduction > 0 ? Math.min(100, Math.round((actualProduction / expectedProduction) * 100)) : 0;
};

const MachineStatusCard = ({ machine, onClick }) => {
    const [tick, setTick] = useState(0);
    
    useEffect(() => {
        if (machine.status === 'in_use') {
            const timer = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [machine.status]);

    const statusStyles = {
        available: { 
            border: 'border-green-500', 
            text: 'text-green-600', 
            bg: 'bg-green-50',
            icon: <Activity className="w-4 h-4" />
        },
        in_use: { 
            border: 'border-blue-500', 
            text: 'text-blue-600', 
            bg: 'bg-blue-50',
            icon: <Play className="w-4 h-4" />
        },
        maintenance: { 
            border: 'border-yellow-500', 
            text: 'text-yellow-600', 
            bg: 'bg-yellow-50',
            icon: <AlertTriangle className="w-4 h-4" />
        },
        offline: { 
            border: 'border-red-500', 
            text: 'text-red-600', 
            bg: 'bg-red-50',
            icon: <Pause className="w-4 h-4" />
        },
    };

    const style = statusStyles[machine.status] || { 
        border: 'border-gray-300', 
        text: 'text-gray-600', 
        bg: 'bg-gray-50',
        icon: <Activity className="w-4 h-4" />
    };

    const efficiency = calculateEfficiency(machine);
    const isRunning = machine.status === 'in_use';
    const hasAssignedOrder = machine.order_number; // Any order assigned (running or stopped)

    return (
        <div 
            className={`rounded-xl shadow-sm border-l-4 ${style.border} ${style.bg} hover:shadow-lg transition-all duration-300 ${hasAssignedOrder ? 'cursor-pointer' : 'cursor-default'} transform hover:scale-105 ${hasAssignedOrder ? 'relative' : ''}`}
            onClick={() => onClick && onClick(machine)}
        >
            <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-sm truncate">{machine.name}</h3>
                        <p className="text-xs text-gray-500">{machine.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isRunning && efficiency > 0 && (
                            <span className="text-xs font-medium text-gray-600">{efficiency}%</span>
                        )}
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg.replace('50', '100')} ${style.text}`}>
                            {style.icon}
                            {machine.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {hasAssignedOrder ? (
                        <>
                            <div className="bg-white rounded-lg p-2 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-700 truncate">{machine.order_number}</p>
                                        <p className="text-xs text-gray-500 truncate">{machine.product_name}</p>
                                        {machine.order_status === 'stopped' && (
                                            <p className="text-xs text-red-600 font-medium mt-1">STOPPED</p>
                                        )}
                                    </div>
                                    <Eye className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2" title="Click to view order details" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-gray-600">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-lg font-mono">{formatDuration(machine.start_time)}</span>
                                </div>
                                {machine.operator && (
                                    <div className="flex items-center gap-1 text-gray-500">
                                        <Users className="w-3 h-3" />
                                        <span className="text-xs truncate max-w-20">{machine.operator}</span>
                                    </div>
                                )}
                            </div>
                            {efficiency > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            efficiency >= 90 ? 'bg-green-500' :
                                            efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(efficiency, 100)}%` }}
                                    ></div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-16 text-center">
                            <div className="text-gray-400">
                                {style.icon}
                                <p className="text-xs mt-1">{machine.status.replace('_', ' ').toUpperCase()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Summary stats component
const ProductionSummary = ({ machines }) => {
    const stats = useMemo(() => {
        const total = machines.length;
        const running = machines.filter(m => m.status === 'in_use').length;
        const available = machines.filter(m => m.status === 'available').length;
        const maintenance = machines.filter(m => m.status === 'maintenance').length;
        const offline = machines.filter(m => m.status === 'offline').length;
        const avgEfficiency = running > 0 ? 
            Math.round(machines.filter(m => m.status === 'in_use')
                .reduce((acc, m) => acc + calculateEfficiency(m), 0) / running) : 0;

        return { total, running, available, maintenance, offline, avgEfficiency };
    }, [machines]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    <div>
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-600" />
                    <div>
                        <p className="text-sm text-gray-500">Running</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="text-sm text-gray-500">Available</p>
                        <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <div>
                        <p className="text-sm text-gray-500">Maintenance</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <Pause className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm text-gray-500">Offline</p>
                        <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                        <p className="text-sm text-gray-500">Avg Efficiency</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.avgEfficiency}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Order Details Modal Component
const OrderDetailsModal = ({ isOpen, onClose, orderId, orderNumber }) => {
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tick, setTick] = useState(0);

    const fetchOrderDetails = useCallback(async () => {
        if (!orderId || !isOpen) return;
        
        setLoading(true);
        setError('');
        
        try {
            // Get order details from the main orders list and try to get downtime reports
            console.log('Fetching order details for ID:', orderId);
            
            const ordersResponse = await API.get('/orders');
            console.log('Orders response:', ordersResponse);
            
            // Find the specific order from the orders list
            const orders = ordersResponse.data || ordersResponse || [];
            const order = orders.find(o => o.id == orderId);
            
            if (!order) {
                throw new Error(`Order with ID ${orderId} not found`);
            }
            
            // Try to get stops/downtime data from the reports endpoint
            let stops = [];
            try {
                // Get downtime reports for this specific order
                const downtimeResponse = await API.get(`/reports/downtime?order_id=${orderId}`);
                stops = downtimeResponse.records || downtimeResponse.data?.records || [];
                console.log('Downtime response for order', orderId, ':', downtimeResponse);
                
                // If no data, try without the order_id filter to see all stops
                if (!Array.isArray(stops) || stops.length === 0) {
                    console.log('No stops found for specific order, trying all stops...');
                    const allStopsResponse = await API.get('/reports/downtime');
                    const allStops = allStopsResponse.records || allStopsResponse.data?.records || [];
                    console.log('All stops:', allStops);
                    // Filter by order_id on the client side
                    stops = Array.isArray(allStops) ? allStops.filter(stop => stop.order_id == orderId) : [];
                }
            } catch (downtimeError) {
                console.log('Downtime endpoint error:', downtimeError);
                stops = [];
            }
            
            setOrderDetails({
                order: order,
                stops: Array.isArray(stops) ? stops : []
            });
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            setError(error.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [orderId, isOpen]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    // Timer for live downtime updates
    useEffect(() => {
        if (isOpen && orderDetails?.stops?.some(stop => !stop.end_time)) {
            const timer = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [isOpen, orderDetails?.stops]);

    const calculateTotalDowntime = useCallback((stops) => {
        if (!stops || !Array.isArray(stops) || stops.length === 0) return 0;
        
        return stops.reduce((total, stop) => {
            if (stop.start_time) {
                const startTime = new Date(stop.start_time).getTime();
                let endTime;
                
                if (stop.end_time) {
                    // Stop has ended, use the end time
                    endTime = new Date(stop.end_time).getTime();
                } else {
                    // Stop is ongoing, use current time
                    endTime = Date.now();
                }
                
                return total + (endTime - startTime);
            }
            return total;
        }, 0);
    }, [tick]);

    const formatDowntimeDuration = useCallback((milliseconds) => {
        if (!milliseconds || milliseconds === 0) return '0m';
        
        const minutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    {/* Compact Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-bold text-white">{orderNumber}</h3>
                                {orderDetails && (
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        orderDetails.order.status === 'stopped' ? 'bg-red-500 text-white' : 
                                        orderDetails.order.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                        orderDetails.order.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                                    }`}>
                                        {orderDetails.order.status.replace('_', ' ').toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full p-1.5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                                <span className="text-gray-500 text-sm">Loading...</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                                    <span className="text-red-700 text-sm">{error}</span>
                                </div>
                            </div>
                        )}

                        {orderDetails && !loading && (
                            <div className="space-y-4">
                                {/* Compact Overview Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                            {orderDetails.order.start_time ? Time.formatSASTTime(orderDetails.order.start_time) : '--:--'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Started</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                            {orderDetails.order.quantity?.toLocaleString() || '0'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Target Qty</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                            {(orderDetails.order.actual_quantity || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Produced</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="relative w-8 h-8">
                                                <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                                                <div 
                                                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 rounded-full" 
                                                    style={{clipPath: `inset(0 ${100 - Math.round(((orderDetails.order.actual_quantity || 0) / orderDetails.order.quantity) * 100)}% 0 0)`}}
                                                ></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {Math.round(((orderDetails.order.actual_quantity || 0) / orderDetails.order.quantity) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Complete</div>
                                    </div>
                                </div>

                                {/* Downtime Summary - Modern */}
                                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            Downtime Analysis
                                        </h4>
                                        {orderDetails.order.status === 'stopped' && (
                                            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                Active Stop
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {orderDetails.stops.length}
                                            </div>
                                            <div className="text-xs text-gray-600">Total Stops</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops))}
                                            </div>
                                            <div className="text-xs text-gray-600">Total Time</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-500">
                                                {orderDetails.stops.length > 0 ? 
                                                    formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops) / orderDetails.stops.length) : '0m'}
                                            </div>
                                            <div className="text-xs text-gray-600">Avg Duration</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stop History - Compact Timeline */}
                                {(!orderDetails.stops || !Array.isArray(orderDetails.stops) || orderDetails.stops.length === 0) ? (
                                    <div className="text-center py-6 text-gray-400">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No stops recorded</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Stop History ({orderDetails.stops.length})
                                        </h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {(orderDetails.stops || []).map((stop, index) => (
                                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className={`w-2 h-2 rounded-full ${!stop.end_time ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                                <span className="font-medium text-gray-900 text-sm truncate">
                                                                    {stop.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                </span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                    stop.category === 'Equipment' ? 'bg-red-100 text-red-700' :
                                                                    stop.category === 'Material' ? 'bg-orange-100 text-orange-700' :
                                                                    stop.category === 'Quality' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {stop.category || 'Other'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span>{Time.formatSASTTime(stop.start_time)}</span>
                                                                {stop.end_time && (
                                                                    <>
                                                                        <span>→</span>
                                                                        <span>{Time.formatSASTTime(stop.end_time)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-3">
                                                            <div className={`text-sm font-bold ${!stop.end_time ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {stop.start_time ? 
                                                                    formatDowntimeDuration(
                                                                        stop.end_time ? 
                                                                            new Date(stop.end_time).getTime() - new Date(stop.start_time).getTime() :
                                                                            Date.now() - new Date(stop.start_time).getTime()
                                                                    ) : 
                                                                    <span className="text-orange-500">Unknown</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {!stop.end_time ? 'active' : 'resolved'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                        <div className="flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ProductionDashboard() {
    const [overviewData, setOverviewData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const data = await API.get('/production/floor-overview');
            console.log('Production floor overview data:', data);
            
            // Log machines with orders to debug stopped orders
            const machinesWithOrders = (data || []).filter(machine => machine.order_number);
            console.log('Machines with orders:', machinesWithOrders);
            
            // Log all machine statuses to see what's happening
            console.log('All machine statuses:', (data || []).map(m => ({
                name: m.name,
                status: m.status,
                order_number: m.order_number,
                order_id: m.order_id
            })));
            
            setOverviewData(data || []);
        } catch (error) {
            console.error("Failed to fetch production data:", error);
            setError(error.message || 'Failed to fetch production data');
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
            setRefreshing(false);
        }
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleMachineClick = (machine) => {
        // If machine has an assigned order (running or stopped), show order details
        if (machine.order_id && machine.order_number) {
            setSelectedOrder({
                id: machine.order_id,
                number: machine.order_number,
                machineId: machine.id,
                machineName: machine.name,
                status: machine.status
            });
            setShowOrderModal(true);
        } else {
            console.log('Machine clicked (no assigned order):', machine);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredMachines = useMemo(() => {
        if (filterStatus === 'all') return overviewData;
        return overviewData.filter(machine => machine.status === filterStatus);
    }, [overviewData, filterStatus]);

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading Production Floor Data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                    <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <p className="text-red-800 font-medium">Error loading production data</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <button 
                        onClick={handleRefresh}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Production Floor Monitor</h1>
                    <p className="text-gray-600 mt-1">Real-time production monitoring and machine status</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Machines</option>
                            <option value="in_use">Running</option>
                            <option value="available">Available</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="offline">Offline</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    
                </div>
            </div>

            <ProductionSummary machines={overviewData} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredMachines.map(machine => (
                    <MachineStatusCard 
                        key={machine.id} 
                        machine={machine} 
                        onClick={handleMachineClick}
                    />
                ))}
            </div>

            {filteredMachines.length === 0 && (
                <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No machines found for the selected filter</p>
                </div>
            )}

            {/* Order Details Modal */}
            <OrderDetailsModal
                isOpen={showOrderModal}
                onClose={() => setShowOrderModal(false)}
                orderId={selectedOrder?.id}
                orderNumber={selectedOrder?.number}
            />
        </div>
    );
}
