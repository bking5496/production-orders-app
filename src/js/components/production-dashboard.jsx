import React, { useState, useEffect } from 'react';
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

const MachineStatusCard = ({ machine }) => {
    // This effect will re-render the component every second to update the timer
    const [_, setTick] = useState(0);
    useEffect(() => {
        if (machine.status === 'in_use') {
            const timer = setInterval(() => setTick(tick => tick + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [machine.status]);

    const statusStyles = {
        available: { border: 'border-green-500', text: 'text-green-600', bg: 'bg-green-50' },
        in_use: { border: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
        maintenance: { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' },
        offline: { border: 'border-red-500', text: 'text-red-600', bg: 'bg-red-50' },
    };

    const style = statusStyles[machine.status] || { border: 'border-gray-300', text: 'text-gray-600', bg: 'bg-gray-50' };

    return (
        <div className={`rounded-lg shadow-md border-l-4 ${style.border} ${style.bg}`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-800">{machine.name}</h3>
                        <p className="text-xs text-gray-500">{machine.type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg.replace('50', '100')} ${style.text}`}>
                        {machine.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                
                <div className="mt-4 h-20">
                    {machine.status === 'in_use' && machine.order_number ? (
                        <div>
                            <p className="text-sm font-semibold text-gray-700">{machine.order_number}</p>
                            <p className="text-xs text-gray-500">{machine.product_name}</p>
                            <p className="text-2xl font-mono mt-2 text-gray-800">{formatDuration(machine.start_time)}</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-sm text-gray-400">{machine.status.replace('_', ' ').toUpperCase()}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ProductionDashboard() {
    const [overviewData, setOverviewData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        try {
            const data = await API.get('/production/floor-overview');
            setOverviewData(data);
        } catch (error) {
            console.error("Failed to fetch production data:", error);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Loading Production Floor Data...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Production Floor Monitor</h1>
                <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {overviewData.map(machine => (
                    <MachineStatusCard key={machine.id} machine={machine} />
                ))}
            </div>
        </div>
    );
}
