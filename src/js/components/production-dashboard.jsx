import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp, Eye, X } from 'lucide-react';
import API from '../core/api';
import { Icon } from './layout-components.jsx';

// SAST Timezone Utilities (UTC+2) - Same as labor planner
const SAST_OFFSET_HOURS = 2;

// Convert UTC to SAST for display
const convertUTCToSAST = (utcDateString) => {
    if (!utcDateString) return null;
    const utcDate = new Date(utcDateString);
    const sastDate = new Date(utcDate.getTime() + (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return sastDate;
};

// Convert SAST to UTC for API calls
const convertSASTToUTC = (sastDateString) => {
    if (!sastDateString) return null;
    const sastDate = new Date(sastDateString);
    const utcDate = new Date(sastDate.getTime() - (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return utcDate.toISOString();
};

// Format SAST date for display
const formatSASTDate = (utcDateString, options = {}) => {
    if (!utcDateString) return 'N/A';
    const sastDate = convertUTCToSAST(utcDateString);
    if (!sastDate) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg',
        ...options
    };
    
    return sastDate.toLocaleString('en-ZA', defaultOptions);
};

// Format SAST time only
const formatSASTTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    const sastDate = convertUTCToSAST(utcDateString);
    if (!sastDate) return 'N/A';
    
    return sastDate.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg'
    });
};

// Helper to format time from a start date to now, creating a running timer effect
const formatDuration = (sastStartTime) => {
    if (!sastStartTime) return '00:00:00';
    
    // Server stores SAST time, but we need to subtract 2 more hours for correct display
    const start = new Date(sastStartTime).getTime();
    const now = Date.now() - (2 * 60 * 60 * 1000); // Subtract 2 hours from current time
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
    const hasActiveOrder = isRunning && machine.order_number;

    return (
        <div 
            className={`rounded-xl shadow-sm border-l-4 ${style.border} ${style.bg} hover:shadow-lg transition-all duration-300 ${hasActiveOrder ? 'cursor-pointer' : 'cursor-default'} transform hover:scale-105 ${hasActiveOrder ? 'relative' : ''}`}
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
                    {isRunning && machine.order_number ? (
                        <>
                            <div className="bg-white rounded-lg p-2 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-700 truncate">{machine.order_number}</p>
                                        <p className="text-xs text-gray-500 truncate">{machine.product_name}</p>
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

    const fetchOrderDetails = useCallback(async () => {
        if (!orderId || !isOpen) return;
        
        setLoading(true);
        setError('');
        
        try {
            // Get order details from the main orders list and downtime reports
            console.log('Fetching order details for ID:', orderId);
            
            const [ordersResponse] = await Promise.all([
                API.get('/orders')
            ]);
            
            console.log('Orders response:', ordersResponse);
            
            // Find the specific order from the orders list
            const orders = ordersResponse.data || ordersResponse || [];
            const order = orders.find(o => o.id == orderId);
            
            if (!order) {
                throw new Error(`Order with ID ${orderId} not found`);
            }
            
            // For now, just show order details without stops data until we find the right endpoint
            setOrderDetails({
                order: order,
                stops: [] // Empty for now - we'll add this when we find the right endpoint
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

    const calculateTotalDowntime = useCallback((stops) => {
        if (!stops || stops.length === 0) return 0;
        
        return stops.reduce((total, stop) => {
            if (stop.end_time && stop.start_time) {
                const startTime = new Date(stop.start_time).getTime();
                const endTime = new Date(stop.end_time).getTime();
                return total + (endTime - startTime);
            }
            return total;
        }, 0);
    }, []);

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
                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 pt-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{orderNumber}</h3>
                                <p className="text-sm text-gray-600 mt-1">Production Order Details</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-2 hover:bg-white/50 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="px-8 py-6">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-3" />
                                <span className="text-gray-600">Loading order details...</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg mb-6">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                                    <span className="text-red-700">{error}</span>
                                </div>
                            </div>
                        )}

                        {orderDetails && !loading && (
                            <div className="space-y-8">
                                {/* Order Summary - Minimal Cards */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-900 mb-1">
                                            {orderDetails.order.start_time ? 
                                                formatSASTTime(orderDetails.order.start_time) : '--:--'}
                                        </div>
                                        <div className="text-sm text-gray-500 uppercase tracking-wide">Start Time</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600 mb-1 capitalize">
                                            {orderDetails.order.status.replace('_', ' ')}
                                        </div>
                                        <div className="text-sm text-gray-500 uppercase tracking-wide">Status</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600 mb-1">
                                            {Math.round(((orderDetails.order.completed_quantity || 0) / orderDetails.order.quantity) * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-500 uppercase tracking-wide">Complete</div>
                                    </div>
                                </div>

                                {/* Downtime Summary - Compact */}
                                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
                                    <div className="grid grid-cols-3 gap-6 text-center">
                                        <div>
                                            <div className="text-3xl font-bold text-red-600 mb-1">
                                                {orderDetails.stops.length}
                                            </div>
                                            <div className="text-sm text-gray-600 uppercase tracking-wide">Stops</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-bold text-red-600 mb-1">
                                                {formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops))}
                                            </div>
                                            <div className="text-sm text-gray-600 uppercase tracking-wide">Total Downtime</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-bold text-red-600 mb-1">
                                                {orderDetails.stops.length > 0 ? 
                                                    formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops) / orderDetails.stops.length) : '0m'}
                                            </div>
                                            <div className="text-sm text-gray-600 uppercase tracking-wide">Avg Duration</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Stop History - Streamlined */}
                                {orderDetails.stops.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No production stops recorded</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Stop History</h4>
                                        {orderDetails.stops.map((stop, index) => (
                                            <div key={index} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="font-semibold text-gray-900">
                                                                {stop.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                                                {formatSASTTime(stop.start_time)}
                                                            </span>
                                                            {stop.end_time && (
                                                                <span className="text-xs bg-green-100 px-2 py-1 rounded-full text-green-700">
                                                                    {formatSASTTime(stop.end_time)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {stop.notes && (
                                                            <p className="text-sm text-gray-600 leading-relaxed">{stop.notes}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <div className="text-xl font-bold text-red-500">
                                                            {stop.end_time && stop.start_time ? 
                                                                formatDowntimeDuration(new Date(stop.end_time).getTime() - new Date(stop.start_time).getTime()) : 
                                                                <span className="text-orange-500">Ongoing</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
        // If machine has an active order, show order details
        if (machine.order_id && machine.order_number) {
            setSelectedOrder({
                id: machine.order_id,
                number: machine.order_number
            });
            setShowOrderModal(true);
        } else {
            console.log('Machine clicked (no active order):', machine);
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
