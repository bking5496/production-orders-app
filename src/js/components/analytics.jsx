import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Download, RefreshCw, Calendar, 
  Clock, Target, Activity, AlertTriangle, CheckCircle, Package, Users,
  Factory, PieChart, LineChart, Filter, Search, Settings, Play, Pause
} from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    orders: [],
    machines: [],
    assignments: [],
    employees: [],
    summary: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load analytics data
  const loadAnalytics = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams(dateRange).toString();
      const [ordersData, machinesData, summaryData, downtimeData, downtimeRecordsData, employeesData, assignmentsData] = await Promise.all([
        API.get('/orders'),
        API.get('/machines'),
        API.get(`/analytics/summary?${params}`),
        API.get(`/analytics/downtime?${params}`),
        API.get(`/reports/downtime?${params}`),
        API.get('/users'),
        API.get(`/planner/assignments?date=${dateRange.end_date}`)
      ]);
      
      setAnalytics({
        orders: ordersData || [],
        machines: machinesData || [],
        employees: employeesData || [],
        assignments: assignmentsData || [],
        summary: summaryData?.summary || {},
        downtime: downtimeData || {},
        downtimeRecords: downtimeRecordsData?.records || [],
        downtimeSummary: downtimeRecordsData?.summary || {},
        categoryBreakdown: downtimeRecordsData?.category_breakdown || {}
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      showNotification('Failed to load analytics data', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics(true);
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const { orders, machines } = analytics;
    
    // Order metrics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const pausedOrders = orders.filter(o => o.status === 'paused').length;
    
    // Completion rate
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    // Machine metrics
    const totalMachines = machines.length;
    const availableMachines = machines.filter(m => m.status === 'available').length;
    const activeMachines = machines.filter(m => m.status === 'in_use').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const offlineMachines = machines.filter(m => m.status === 'offline').length;
    
    // Utilization rate
    const utilizationRate = totalMachines > 0 ? Math.round((activeMachines / totalMachines) * 100) : 0;
    
    // Quantity metrics
    const totalQuantityOrdered = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
    const totalQuantityProduced = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (parseInt(o.actual_quantity || o.quantity) || 0), 0);
    
    // Priority distribution
    const priorityDistribution = orders.reduce((acc, order) => {
      const priority = order.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});
    
    // Environment distribution
    const environmentDistribution = orders.reduce((acc, order) => {
      const env = order.environment || 'unknown';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});
    
    // Status distribution
    const statusDistribution = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Machine environment distribution
    const machineEnvDistribution = machines.reduce((acc, machine) => {
      const env = machine.environment || 'unknown';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});
    
    // Recent orders trend (last 7 days)
    const recentTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const ordersCount = orders.filter(o => o.created_at?.startsWith(dateStr)).length;
      return { date: dateStr, count: ordersCount };
    }).reverse();
    
    return {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      pausedOrders,
      completionRate,
      totalMachines,
      availableMachines,
      activeMachines,
      maintenanceMachines,
      offlineMachines,
      utilizationRate,
      totalQuantityOrdered,
      totalQuantityProduced,
      priorityDistribution,
      environmentDistribution,
      statusDistribution,
      machineEnvDistribution,
      recentTrend
    };
  }, [analytics]);

  // Export functionality
  const exportData = (format) => {
    try {
      let exportContent;
      let filename;
      
      if (format === 'csv') {
        const csvData = [
          ['Metric', 'Value'],
          ['Total Orders', metrics.totalOrders],
          ['Completed Orders', metrics.completedOrders],
          ['Completion Rate', `${metrics.completionRate}%`],
          ['Total Machines', metrics.totalMachines],
          ['Active Machines', metrics.activeMachines],
          ['Utilization Rate', `${metrics.utilizationRate}%`],
          ['Total Quantity Ordered', metrics.totalQuantityOrdered],
          ['Total Quantity Produced', metrics.totalQuantityProduced]
        ];
        
        exportContent = csvData.map(row => row.join(',')).join('\\n');
        filename = `analytics-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
        
        const blob = new Blob([exportContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        exportContent = JSON.stringify({ metrics, dateRange }, null, 2);
        filename = `analytics-${dateRange.start_date}-to-${dateRange.end_date}.json`;
        
        const blob = new Blob([exportContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      showNotification(`Analytics exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showNotification('Failed to export data', 'danger');
    }
  };

  // Downtime export functionality
  const exportDowntimeData = () => {
    try {
      if (!analytics.downtimeRecords || analytics.downtimeRecords.length === 0) {
        showNotification('No downtime records to export', 'warning');
        return;
      }

      const csvContent = [
        ['Start Time', 'End Time', 'Duration (min)', 'Reason', 'Category', 'Order', 'Machine', 'Stopped By', 'Status', 'Notes'],
        ...analytics.downtimeRecords.map(record => [
          record.start_time || 'N/A',
          record.end_time || 'Active',
          record.duration || 'N/A',
          record.reason || 'N/A',
          record.category || 'N/A',
          record.order_number || 'N/A',
          record.machine_name || 'N/A',
          record.stopped_by || 'N/A',
          record.status || 'N/A',
          (record.notes || '').replace(/,/g, ';') // Replace commas to avoid CSV parsing issues
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `downtime-report-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('Downtime report exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export downtime data', 'danger');
    }
  };

  // Chart components
  const BarChart = ({ data, title, color = '#3b82f6' }) => {
    const canvasRef = useRef(null);
    
    useEffect(() => {
      if (!canvasRef.current || !data) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const labels = Object.keys(data);
      const values = Object.values(data);
      const maxValue = Math.max(...values, 1);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (labels.length === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
      }
      
      const chartHeight = canvas.height - 80;
      const chartWidth = canvas.width - 80;
      const barWidth = Math.min(60, chartWidth / (labels.length * 1.5));
      
      // Draw grid lines
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = 40 + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
        
        // Y-axis labels
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round((5 - i) / 5 * maxValue), 45, y + 4);
      }
      
      // Draw bars
      labels.forEach((label, i) => {
        const value = values[i];
        const barHeight = (value / maxValue) * chartHeight;
        const x = 60 + i * (chartWidth / labels.length);
        const y = 40 + chartHeight - barHeight;
        
        // Bar
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Value on top of bar
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
        
        // Label
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), 0, 0);
        ctx.restore();
      });
    }, [data, color]);
    
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <canvas ref={canvasRef} width="400" height="300" className="w-full h-auto max-w-full"></canvas>
      </Card>
    );
  };

  const PieChart = ({ data, title }) => {
    const canvasRef = useRef(null);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    useEffect(() => {
      if (!canvasRef.current || !data) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 40;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const values = Object.values(data);
      const labels = Object.keys(data);
      const total = values.reduce((sum, val) => sum + val, 0);
      
      if (total === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', centerX, centerY);
        return;
      }
      
      let currentAngle = -Math.PI / 2;
      
      values.forEach((value, i) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw percentage
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        const percentage = Math.round((value / total) * 100);
        if (percentage > 5) {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(`${percentage}%`, labelX, labelY);
        }
        
        currentAngle += sliceAngle;
      });
      
      // Draw legend
      labels.forEach((label, i) => {
        const legendY = 20 + i * 20;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(10, legendY, 15, 15);
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${values[i]}`, 30, legendY + 12);
      });
      
    }, [data]);
    
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <canvas ref={canvasRef} width="400" height="300" className="w-full h-auto max-w-full"></canvas>
      </Card>
    );
  };

  const StatsCard = ({ title, value, change, icon: Icon, color = "gray" }) => {
    const colorConfig = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      green: "bg-green-50 text-green-600 border-green-200",
      yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
      red: "bg-red-50 text-red-600 border-red-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
      gray: "bg-gray-50 text-gray-600 border-gray-200"
    };
    
    return (
      <Card className={`p-6 border-l-4 ${colorConfig[color]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}% from last period
                </span>
              </div>
            )}
          </div>
          <Icon className="w-8 h-8" />
        </div>
      </Card>
    );
  };

  if (loading && Object.keys(analytics).length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'danger' ? 'bg-red-100 text-red-800 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Production insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <div className="flex gap-2">
            <Button onClick={() => exportData('csv')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => exportData('json')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Date Range:</span>
          </div>
          
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start_date}
                onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={dateRange.end_date}
                onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Period: {Math.ceil((new Date(dateRange.end_date) - new Date(dateRange.start_date)) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Card className="p-1">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'orders', label: 'Order Analytics', icon: Package },
            { id: 'machines', label: 'Machine Analytics', icon: Factory },
            { id: 'labor', label: 'Labor Analytics', icon: Users },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'downtime', label: 'Downtime Report', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon={Package}
              color="blue"
            />
            <StatsCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Machine Utilization"
              value={`${metrics.utilizationRate}%`}
              icon={Factory}
              color="purple"
            />
            <StatsCard
              title="Active Machines"
              value={`${metrics.activeMachines}/${metrics.totalMachines}`}
              icon={Activity}
              color="yellow"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              data={metrics.statusDistribution}
              title="Order Status Distribution"
            />
            <BarChart
              data={metrics.environmentDistribution}
              title="Orders by Environment"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Pending Orders"
              value={metrics.pendingOrders}
              icon={Clock}
              color="gray"
            />
            <StatsCard
              title="In Progress"
              value={metrics.inProgressOrders}
              icon={Play}
              color="blue"
            />
            <StatsCard
              title="Completed"
              value={metrics.completedOrders}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Paused"
              value={metrics.pausedOrders}
              icon={Pause}
              color="yellow"
            />
            <StatsCard
              title="Total Quantity"
              value={metrics.totalQuantityOrdered.toLocaleString()}
              icon={Target}
              color="purple"
            />
          </div>

          {/* Order Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart
              data={metrics.priorityDistribution}
              title="Order Priority Distribution"
              color="#f59e0b"
            />
            <PieChart
              data={metrics.environmentDistribution}
              title="Orders by Environment"
            />
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          {/* Machine Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Total Machines"
              value={metrics.totalMachines}
              icon={Factory}
              color="gray"
            />
            <StatsCard
              title="Available"
              value={metrics.availableMachines}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="In Use"
              value={metrics.activeMachines}
              icon={Activity}
              color="blue"
            />
            <StatsCard
              title="Maintenance"
              value={metrics.maintenanceMachines}
              icon={AlertTriangle}
              color="yellow"
            />
            <StatsCard
              title="Offline"
              value={metrics.offlineMachines}
              icon={Users}
              color="red"
            />
          </div>

          {/* Machine Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              data={{
                Available: metrics.availableMachines,
                'In Use': metrics.activeMachines,
                Maintenance: metrics.maintenanceMachines,
                Offline: metrics.offlineMachines
              }}
              title="Machine Status Distribution"
            />
            <BarChart
              data={metrics.machineEnvDistribution}
              title="Machines by Environment"
              color="#8b5cf6"
            />
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Quantity Produced"
              value={metrics.totalQuantityProduced.toLocaleString()}
              icon={Target}
              color="green"
            />
            <StatsCard
              title="Production Efficiency"
              value={`${Math.round((metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100)}%`}
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard
              title="Avg Orders/Day"
              value={Math.round(metrics.totalOrders / 30)}
              icon={Package}
              color="purple"
            />
            <StatsCard
              title="Machine Efficiency"
              value={`${metrics.utilizationRate}%`}
              icon={Factory}
              color="yellow"
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 gap-6">
            <BarChart
              data={Object.fromEntries(
                analytics.downtime ? Object.entries(analytics.downtime) : [['No Data', 0]]
              )}
              title="Downtime by Reason (Minutes)"
              color="#ef4444"
            />
          </div>
          
          {/* Performance Table */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Performance Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Order Completion Rate</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{metrics.completionRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">85%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={metrics.completionRate >= 85 ? 'success' : metrics.completionRate >= 70 ? 'warning' : 'danger'}>
                        {metrics.completionRate >= 85 ? 'Excellent' : metrics.completionRate >= 70 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Machine Utilization</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{metrics.utilizationRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">80%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={metrics.utilizationRate >= 80 ? 'success' : metrics.utilizationRate >= 60 ? 'warning' : 'danger'}>
                        {metrics.utilizationRate >= 80 ? 'Excellent' : metrics.utilizationRate >= 60 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Production Efficiency</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {Math.round((metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">90%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 90 ? 'success' : 
                        (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 75 ? 'warning' : 'danger'
                      }>
                        {(metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 90 ? 'Excellent' : 
                         (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 75 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'labor' && (
        <div className="space-y-6">
          {/* Labor Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Employees"
              value={analytics.employees.filter(e => e.role !== 'admin').length}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Assigned Today"
              value={analytics.assignments.length}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Unique Workers"
              value={new Set(analytics.assignments.map(a => a.employee_id)).size}
              icon={Activity}
              color="purple"
            />
            <StatsCard
              title="Utilization"
              value={`${Math.round((analytics.assignments.length / Math.max(analytics.machines.length, 1)) * 100)}%`}
              icon={TrendingUp}
              color="orange"
            />
          </div>

          {/* Labor Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Employee Roles</h3>
              <div className="space-y-3">
                {['operator', 'supervisor', 'packer'].map(role => {
                  const count = analytics.employees.filter(e => e.role === role).length;
                  const percentage = Math.round((count / Math.max(analytics.employees.filter(e => e.role !== 'admin').length, 1)) * 100);
                  return (
                    <div key={role} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 capitalize">{role}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full bg-blue-500`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Shift Distribution</h3>
              <div className="space-y-3">
                {['day', 'night'].map(shift => {
                  const count = analytics.assignments.filter(a => a.shift === shift).length;
                  const percentage = Math.round((count / Math.max(analytics.assignments.length, 1)) * 100);
                  return (
                    <div key={shift} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 capitalize">{shift} Shift</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${shift === 'day' ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Recent Assignments Table */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Labor Assignments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.assignments.slice(0, 10).map((assignment, index) => {
                    const employee = analytics.employees.find(e => e.id === assignment.employee_id);
                    const machine = analytics.machines.find(m => m.id == assignment.machine_id);
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee?.fullName || employee?.username || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                          {employee?.role || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {machine?.name || `Machine ${assignment.machine_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                          {assignment.shift}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="success">Active</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'downtime' && (
        <div className="space-y-6">
          {/* Downtime Export Button */}
          <div className="flex justify-end">
            <Button onClick={exportDowntimeData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Downtime Report
            </Button>
          </div>

          {/* Downtime Summary Statistics */}
          {analytics.downtimeSummary && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <StatsCard
                title="Total Stops"
                value={analytics.downtimeSummary.total_stops || 0}
                icon={AlertTriangle}
                color="red"
              />
              <StatsCard
                title="Active Stops"
                value={analytics.downtimeSummary.active_stops || 0}
                icon={Clock}
                color="yellow"
              />
              <StatsCard
                title="Total Downtime"
                value={`${analytics.downtimeSummary.total_downtime_hours || 0}h`}
                icon={TrendingDown}
                color="blue"
              />
              <StatsCard
                title="Avg Duration"
                value={`${analytics.downtimeSummary.average_downtime_minutes || 0}m`}
                icon={BarChart3}
                color="purple"
              />
              <StatsCard
                title="Resolved"
                value={analytics.downtimeSummary.resolved_stops || 0}
                icon={CheckCircle}
                color="green"
              />
            </div>
          )}

          {/* Category Breakdown Chart */}
          {analytics.categoryBreakdown && Object.keys(analytics.categoryBreakdown).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                data={Object.fromEntries(
                  Object.entries(analytics.categoryBreakdown).map(([key, value]) => [
                    key, Math.round(value.total_minutes || 0)
                  ])
                )}
                title="Downtime by Category (Minutes)"
                color="#ef4444"
              />
              <PieChart
                data={Object.fromEntries(
                  Object.entries(analytics.categoryBreakdown).map(([key, value]) => [
                    key, value.count || 0
                  ])
                )}
                title="Stop Count by Category"
              />
            </div>
          )}

          {/* Detailed Downtime Records Table */}
          <Card>
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Recent Downtime Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {analytics.downtimeRecords?.length || 0} records for selected period
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Start Time', 'Duration', 'Reason', 'Category', 'Order', 'Machine', 'Status'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(!analytics.downtimeRecords || analytics.downtimeRecords.length === 0) ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">
                        No downtime records found for the selected period
                      </td>
                    </tr>
                  ) : (
                    analytics.downtimeRecords.slice(0, 20).map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.start_time ? new Date(record.start_time).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.duration ? `${record.duration}m` : 'Active'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            record.reason?.includes('breakdown') || record.reason?.includes('safety') ? 'danger' :
                            record.reason?.includes('maintenance') || record.reason?.includes('material') ? 'warning' :
                            record.reason?.includes('break') || record.reason?.includes('shift') ? 'info' : 'default'
                          } size="sm">
                            {record.reason?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.category || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.order_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.machine_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={record.status === 'Active' ? 'warning' : 'success'} size="sm">
                            {record.status || 'N/A'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {analytics.downtimeRecords && analytics.downtimeRecords.length > 20 && (
              <div className="p-4 text-center text-sm text-gray-500 border-t">
                Showing first 20 of {analytics.downtimeRecords.length} records. Export for complete data.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}