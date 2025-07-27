import React, { useState, useEffect, useRef } from 'react';
import API from '../core/api';

// A simple component for displaying a stat card
const StatsCard = ({ title, value, color = 'text-gray-900' }) => (
    <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);

// A reusable bar chart component
const BarChart = ({ data, title, label }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);
        const maxValue = Math.max(...values, 1); // Avoid division by zero

        // Clear canvas for redraw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Chart drawing logic
        const chartHeight = canvas.height - 50; // More space for labels
        const chartWidth = canvas.width - 40;
        const barWidth = chartWidth / (labels.length * 2);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';

        // Draw Y-axis labels and lines
        for (let i = 0; i <= 4; i++) {
            const y = chartHeight - (i / 4) * chartHeight + 20;
            ctx.fillText(Math.round((i / 4) * maxValue), 15, y + 4);
            ctx.beginPath();
            ctx.moveTo(35, y);
            ctx.lineTo(chartWidth + 20, y);
            ctx.strokeStyle = '#e5e7eb';
            ctx.stroke();
        }
        
        values.forEach((value, i) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = 30 + i * (chartWidth / labels.length);
            const y = chartHeight - barHeight + 20;
            
            ctx.fillStyle = '#60a5fa'; // A nice blue color
            ctx.fillRect(x + barWidth / 2, y, barWidth, barHeight);
            
            ctx.fillStyle = '#374151';
            ctx.fillText(labels[i].replace('_', ' '), x + barWidth, chartHeight + 35);
        });

    }, [data]);

    return (
        <div className="bg-white p-4 rounded-lg shadow h-full">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <canvas ref={canvasRef} width="400" height="300"></canvas>
        </div>
    );
};


export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [downtime, setDowntime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(dateRange).toString();
            const [summaryData, downtimeData] = await Promise.all([
                API.get(`/analytics/summary?${params}`),
                API.get(`/analytics/downtime?${params}`)
            ]);
            setStats(summaryData);
            setDowntime(downtimeData);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const totalDowntime = downtime ? Object.values(downtime).reduce((sum, val) => sum + val, 0) : 0;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Analytics & Reports</h1>

            {/* Date Range Filters */}
            <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
                <div>
                    <label htmlFor="start_date" className="text-sm font-medium text-gray-700">Start Date</label>
                    <input type="date" id="start_date" value={dateRange.start_date} onChange={e => setDateRange({...dateRange, start_date: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="end_date" className="text-sm font-medium text-gray-700">End Date</label>
                    <input type="date" id="end_date" value={dateRange.end_date} onChange={e => setDateRange({...dateRange, end_date: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading analytics...</div>
            ) : stats ? (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatsCard title="Total Orders" value={stats.summary.total_orders || 0} />
                        <StatsCard title="Completed Orders" value={stats.summary.completed_orders || 0} />
                        <StatsCard title="Total Downtime" value={`${totalDowntime} min`} color="text-red-600" />
                        <StatsCard title="Avg. Efficiency" value={`${(stats.summary.average_efficiency || 0).toFixed(1)}%`} color="text-green-600" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BarChart data={stats.priorityDistribution || {}} title="Order Priority Distribution" />
                        <BarChart data={downtime || {}} title="Downtime by Reason (Minutes)" />
                    </div>
                </>
            ) : (
                <div className="text-center py-10 text-gray-500">No analytics data available for the selected period.</div>
            )}
        </div>
    );
}
