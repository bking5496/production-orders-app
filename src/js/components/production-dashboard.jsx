import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp } from 'lucide-react';
import API from '../core/api';
import { Icon } from './layout-components.jsx';

// Helper to format time from a start date to now, creating a running timer effect
const formatDuration = (startTime) => {
    if (!startTime) return '00:00:00';
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);

    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

// Helper to calculate efficiency percentage
const calculateEfficiency = (machine) => {
    if (!machine.start_time || machine.status !== 'in_use') return 0;
    const runtime = Date.now() - new Date(machine.start_time).getTime();
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

    return (
        <div 
            className={`rounded-xl shadow-sm border-l-4 ${style.border} ${style.bg} hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105`}
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
                            <div className="bg-white rounded-lg p-2">
                                <p className="text-sm font-semibold text-gray-700 truncate">{machine.order_number}</p>
                                <p className="text-xs text-gray-500 truncate">{machine.product_name}</p>
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

export default function ProductionDashboard() {
    const [overviewData, setOverviewData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

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
        // Navigate to machine details or show modal
        console.log('Machine clicked:', machine);
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
                    
                    <div className="text-sm text-gray-500">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {lastUpdated.toLocaleTimeString()}
                    </div>
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
        </div>
    );
}
