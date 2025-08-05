// dashboard.jsx - Modern Manufacturing Dashboard
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Activity, Clock, Users, Factory,
  AlertTriangle, CheckCircle, Package, Play, Pause, Settings, RefreshCw,
  Bell, Filter, Calendar, Download, Plus, Eye, Target, Zap, Award
} from 'lucide-react';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import API from '../core/api.js';
import { ActivityFeed } from './realtime-notifications.jsx';
import { useOrderUpdates, useMachineUpdates, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact } from './websocket-status.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState({
    orders: { total: 0, pending: 0, in_progress: 0, completed: 0, paused: 0 },
    machines: { total: 0, available: 0, in_use: 0, maintenance: 0, offline: 0 },
    production: { efficiency: 0, output: 0, quality_score: 0, on_time_delivery: 0 },
    alerts: { critical: 0, warning: 0, info: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const refreshIntervalRef = useRef(null);

  // WebSocket integration
  useAutoConnect();
  const { lastUpdate: orderUpdate } = useOrderUpdates();
  const { lastUpdate: machineUpdate } = useMachineUpdates();
  const { notifications: wsNotifications } = useNotifications();

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      loadDashboardData(true);
    }, 30000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [timeRange]);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (orderUpdate) {
      console.log('Dashboard received order update:', orderUpdate);
      // Refresh dashboard data when orders change
      loadDashboardData(true);
    }
  }, [orderUpdate]);

  useEffect(() => {
    if (machineUpdate) {
      console.log('Dashboard received machine update:', machineUpdate);
      // Refresh dashboard data when machines change
      loadDashboardData(true);
    }
  }, [machineUpdate]);

  // Subscribe to dashboard-specific channels
  useEffect(() => {
    if (window.EnhancedWebSocketService?.isConnected()) {
      window.EnhancedWebSocketService.subscribe(['dashboard', 'orders', 'machines', 'production', 'alerts']);
    }
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [orders, machines, users] = await Promise.all([
        API.getOrders().catch(() => []),
        API.getMachines().catch(() => []),
        API.get('/users').catch(() => [])
      ]);
      
      // Calculate comprehensive order stats
      const orderStats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        in_progress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length,
        paused: orders.filter(o => o.status === 'paused').length
      };
      
      // Calculate machine stats
      const machineStats = {
        total: machines.length,
        available: machines.filter(m => m.status === 'available').length,
        in_use: machines.filter(m => m.status === 'in_use').length,
        maintenance: machines.filter(m => m.status === 'maintenance').length,
        offline: machines.filter(m => m.status === 'offline').length
      };
      
      // Calculate production metrics
      const totalQuantityOrdered = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
      const totalQuantityProduced = orders.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (parseInt(o.actual_quantity || o.quantity) || 0), 0);
      
      const efficiency = machineStats.total > 0 ? 
        Math.round((machineStats.in_use / machineStats.total) * 100) : 0;
      const quality_score = totalQuantityOrdered > 0 ? 
        Math.round((totalQuantityProduced / totalQuantityOrdered) * 100) : 0;
      const on_time_delivery = orderStats.total > 0 ? 
        Math.round((orderStats.completed / orderStats.total) * 100) : 0;
      
      // Generate alerts
      const alerts = [];
      if (machineStats.offline > 0) {
        alerts.push({ type: 'critical', message: `${machineStats.offline} machine(s) offline`, time: new Date() });
      }
      if (machineStats.maintenance > 0) {
        alerts.push({ type: 'warning', message: `${machineStats.maintenance} machine(s) in maintenance`, time: new Date() });
      }
      if (orderStats.paused > 0) {
        alerts.push({ type: 'warning', message: `${orderStats.paused} order(s) paused`, time: new Date() });
      }
      if (efficiency < 60) {
        alerts.push({ type: 'warning', message: `Low machine utilization: ${efficiency}%`, time: new Date() });
      }
      
      const alertStats = {
        critical: alerts.filter(a => a.type === 'critical').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        info: alerts.filter(a => a.type === 'info').length
      };
      
      setStats({
        orders: orderStats,
        machines: machineStats,
        production: { efficiency, output: totalQuantityProduced, quality_score, on_time_delivery },
        alerts: alertStats
      });
      
      setRecentOrders(orders.slice(0, 6));
      setRecentAlerts(alerts.slice(0, 5));
      
      if (isRefresh) {
        showNotification('Dashboard updated', 'success');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const quickActions = [
    { label: 'Create Order', icon: Plus, action: () => window.location.href = '#/orders', color: 'blue' },
    { label: 'View Analytics', icon: BarChart3, action: () => window.location.href = '#/analytics', color: 'purple' },
    { label: 'Manage Machines', icon: Settings, action: () => window.location.href = '#/machines', color: 'green' },
    { label: 'Labor Planning', icon: Users, action: () => window.location.href = '#/labor-planner', color: 'orange' }
  ];
  
  const priorityAlerts = useMemo(() => {
    return recentAlerts.filter(alert => alert.type === 'critical').slice(0, 3);
  }, [recentAlerts]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <div className="text-lg text-gray-600">Loading dashboard...</div>
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">Production Dashboard</h1>
            <WebSocketStatusCompact />
          </div>
          <p className="text-gray-600 mt-1">Real-time overview of your manufacturing operations</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          
          <Button 
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => setShowQuickActions(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Quick Actions
          </Button>
        </div>
      </div>
      
      {/* Priority Alerts */}
      {priorityAlerts.length > 0 && (
        <Card className="p-4 bg-red-50 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Critical Alerts</h3>
          </div>
          <div className="space-y-2">
            {priorityAlerts.map((alert, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-red-800">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{alert.message}</span>
                <span className="text-red-600 ml-auto">{alert.time.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Machine Efficiency"
          value={`${stats.production.efficiency}%`}
          change={stats.production.efficiency >= 80 ? 5 : -3}
          icon={Activity}
          color="blue"
          target="80%"
        />
        <KPICard
          title="On-Time Delivery"
          value={`${stats.production.on_time_delivery}%`}
          change={stats.production.on_time_delivery >= 85 ? 4 : -2}
          icon={Target}
          color="purple"
          target="85%"
        />
        <KPICard
          title="Daily Output"
          value={stats.production.output.toLocaleString()}
          change={12}
          icon={Package}
          color="orange"
          target="5000"
          unit=" units"
        />
      </div>
      
      {/* Production Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Production Orders</h3>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '#/orders'}>
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.orders.in_progress}</div>
              <div className="text-sm text-blue-600">In Progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.orders.completed}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pending:</span>
              <span className="font-medium">{stats.orders.pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paused:</span>
              <span className="font-medium text-yellow-600">{stats.orders.paused}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Orders:</span>
              <span className="font-medium">{stats.orders.total}</span>
            </div>
          </div>
        </Card>
        
        {/* Machine Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Machine Status</h3>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '#/machines'}>
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </Button>
          </div>
          
          <div className="space-y-4">
            <MachineStatusBar label="In Use" count={stats.machines.in_use} total={stats.machines.total} color="blue" />
            <MachineStatusBar label="Available" count={stats.machines.available} total={stats.machines.total} color="green" />
            <MachineStatusBar label="Maintenance" count={stats.machines.maintenance} total={stats.machines.total} color="yellow" />
            <MachineStatusBar label="Offline" count={stats.machines.offline} total={stats.machines.total} color="red" />
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Utilization Rate</div>
            <div className="text-2xl font-bold text-gray-800">{stats.production.efficiency}%</div>
            <div className="text-xs text-gray-500">of total capacity</div>
          </div>
        </Card>
      </div>
      
      {/* Recent Orders & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '#/orders'}>
              View All
            </Button>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <ModernOrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No recent orders</p>
            </div>
          )}
        </Card>
        
        {/* System Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">System Alerts</h3>
            <Badge variant="info">{recentAlerts.length}</Badge>
          </div>
          
          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <AlertRow key={index} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p>All systems running smoothly</p>
            </div>
          )}
        </Card>
        
        {/* Real-time Activity Feed */}
        <ActivityFeed maxItems={8} />
      </div>
      
      {/* Quick Actions Modal */}
      {showQuickActions && (
        <Modal title="Quick Actions" onClose={() => setShowQuickActions(false)}>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    setShowQuickActions(false);
                  }}
                  className={`p-6 border-2 border-gray-200 rounded-lg hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-all group`}
                >
                  <Icon className={`w-8 h-8 text-${action.color}-600 mx-auto mb-3`} />
                  <div className="text-sm font-medium text-gray-800">{action.label}</div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

// Modern KPI Card Component
const KPICard = ({ title, value, change, icon: Icon, color, target, unit = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };
  
  const isPositive = change >= 0;
  
  return (
    <Card className={`p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}{unit}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(change)}%
          </span>
          <span className="text-gray-500">vs yesterday</span>
        </div>
        {target && (
          <span className="text-gray-500">Target: {target}</span>
        )}
      </div>
    </Card>
  );
};

// Machine Status Bar Component
const MachineStatusBar = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{count}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Modern Order Row Component
const ModernOrderRow = ({ order }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'default', icon: Clock },
      in_progress: { variant: 'info', icon: Play },
      completed: { variant: 'success', icon: CheckCircle },
      paused: { variant: 'warning', icon: Pause }
    };
    
    const config = statusConfig[status] || { variant: 'default', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status ? status.replace('_', ' ').toUpperCase() : 'PENDING'}
      </Badge>
    );
  };
  
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-all">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-gray-800">{order.order_number || `Order #${order.id}`}</p>
            <p className="text-sm text-gray-500">{order.product_name || 'Product'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>Qty: {order.quantity?.toLocaleString() || 'N/A'}</span>
          <span>Env: {order.environment || 'N/A'}</span>
          {order.due_date && (
            <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge(order.status)}
      </div>
    </div>
  );
};

// Alert Row Component
const AlertRow = ({ alert }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };
  
  const getAlertColor = (type) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };
  
  return (
    <div className={`p-3 border-l-4 rounded-r-lg ${getAlertColor(alert.type)}`}>
      <div className="flex items-start gap-3">
        {getAlertIcon(alert.type)}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{alert.message}</p>
          <p className="text-xs text-gray-500 mt-1">{alert.time.toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};
