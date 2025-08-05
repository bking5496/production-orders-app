// dashboard.jsx - Ultra-Modern Manufacturing Dashboard with Advanced Animations
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Activity, Clock, Users, Factory,
  AlertTriangle, CheckCircle, Package, Play, Pause, Settings, RefreshCw,
  Bell, Filter, Calendar, Download, Plus, Eye, Target, Zap, Award,
  Cpu, Gauge, Layers, Workflow, Timer, BarChart, PieChart, LineChart,
  ArrowUp, ArrowDown, Sparkles, Flame, Bolt, Star, Rocket, Shield
} from 'lucide-react';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import API from '../core/api.js';
import { ActivityFeed } from './realtime-notifications.jsx';
import { useOrderUpdates, useMachineUpdates, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact } from './websocket-status.jsx';

// Advanced Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const startAnimation = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(easeOutCubic * value));
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(startAnimation);
      }
    };

    if (value > 0) {
      startTimeRef.current = null;
      frameRef.current = requestAnimationFrame(startAnimation);
    } else {
      setDisplayValue(0);
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

// Ultra-Modern KPI Card with Advanced Animations
const UltraKPICard = ({ title, value, change, icon: Icon, color = "blue", target, trend, sparklineData = [] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const colorConfig = {
    blue: {
      bg: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-200',
      glow: 'bg-blue-100',
      text: 'text-blue-700',
      accent: 'border-blue-300'
    },
    green: {
      bg: 'from-green-500 to-emerald-500',
      shadow: 'shadow-green-200',
      glow: 'bg-green-100',
      text: 'text-green-700',
      accent: 'border-green-300'
    },
    purple: {
      bg: 'from-purple-500 to-indigo-500',
      shadow: 'shadow-purple-200',
      glow: 'bg-purple-100',
      text: 'text-purple-700',
      accent: 'border-purple-300'
    },
    orange: {
      bg: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-200',
      glow: 'bg-orange-100',
      text: 'text-orange-700',
      accent: 'border-orange-300'
    },
    pink: {
      bg: 'from-pink-500 to-rose-500',
      shadow: 'shadow-pink-200',
      glow: 'bg-pink-100',
      text: 'text-pink-700',
      accent: 'border-pink-300'
    }
  };

  const config = colorConfig[color];

  return (
    <div
      ref={cardRef}
      className={`group relative overflow-hidden rounded-2xl border ${config.accent} bg-white ${config.shadow} transition-all duration-700 hover:scale-105 hover:shadow-2xl ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: isVisible ? `${Math.random() * 300}ms` : '0ms'
      }}
    >
      {/* Animated Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      {/* Animated Border Glow */}
      <div className={`absolute inset-0 rounded-2xl ${config.glow} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 scale-110`}></div>
      
      {/* Floating Particles */}
      {isHovered && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 ${config.glow} rounded-full animate-bounce`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 200}ms`,
                animationDuration: '2s'
              }}
            ></div>
          ))}
        </div>
      )}

      <div className="relative p-6">
        {/* Header with Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.bg} shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-600 mb-2 group-hover:text-gray-800 transition-colors">
          {title}
        </h3>

        {/* Main Value with Animation */}
        <div className="mb-3">
          <div className={`text-3xl font-bold ${config.text} group-hover:text-4xl transition-all duration-300`}>
            <AnimatedCounter value={parseInt(value) || 0} />
            {typeof value === 'string' && value.includes('%') && '%'}
          </div>
        </div>

        {/* Progress Bar */}
        {target && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((parseInt(value) / target) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 bg-gradient-to-r ${config.bg} rounded-full transition-all duration-1000 ease-out transform origin-left`}
                style={{ 
                  width: `${Math.min((parseInt(value) / target) * 100, 100)}%`,
                  transitionDelay: isVisible ? '500ms' : '0ms'
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Mini Sparkline */}
        {sparklineData.length > 0 && (
          <div className="h-8 flex items-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
            {sparklineData.slice(-12).map((point, i) => (
              <div
                key={i}
                className={`w-1 bg-gradient-to-t ${config.bg} rounded-t opacity-60 transition-all duration-300 hover:opacity-100`}
                style={{ 
                  height: `${(point / Math.max(...sparklineData)) * 100}%`,
                  animationDelay: `${i * 50}ms`
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Change Indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className={`flex items-center gap-1 text-xs font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
            <span className="text-xs text-gray-500">vs last period</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Real-time Pulse Indicator
const PulseIndicator = ({ active = false, color = 'green' }) => (
  <div className="relative">
    <div className={`w-3 h-3 bg-${color}-500 rounded-full ${active ? 'animate-pulse' : ''}`}></div>
    {active && (
      <div className={`absolute inset-0 w-3 h-3 bg-${color}-500 rounded-full animate-ping opacity-75`}></div>
    )}
  </div>
);

// Enhanced Modern Alert Card
const EnhancedAlertCard = ({ alert, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const severityConfig = {
    critical: { 
      bg: 'from-red-500 to-pink-500', 
      border: 'border-red-300', 
      icon: AlertTriangle, 
      pulse: true,
      glow: 'shadow-red-200'
    },
    warning: { 
      bg: 'from-yellow-500 to-orange-500', 
      border: 'border-yellow-300', 
      icon: Clock, 
      pulse: false,
      glow: 'shadow-yellow-200'
    },
    info: { 
      bg: 'from-blue-500 to-cyan-500', 
      border: 'border-blue-300', 
      icon: Bell, 
      pulse: false,
      glow: 'shadow-blue-200'
    }
  };

  const config = severityConfig[alert.type] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`transform transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
    }`}>
      <div className={`group relative overflow-hidden rounded-xl border ${config.border} bg-white ${config.glow} hover:shadow-xl transition-all duration-300 hover:scale-102`}>
        <div className="flex items-center gap-4 p-4">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {alert.message}
            </p>
            <p className="text-xs text-gray-500">
              {alert.time.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <PulseIndicator 
              active={alert.type === 'critical'} 
              color={alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'} 
            />
            <Badge variant={alert.type === 'critical' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'} size="sm">
              {alert.type}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    orders: { total: 0, pending: 0, in_progress: 0, completed: 0, paused: 0 },
    machines: { total: 0, available: 0, in_use: 0, maintenance: 0, offline: 0 },
    production: { efficiency: 0, output: 0, on_time_delivery: 0 },
    alerts: { critical: 0, warning: 0, info: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [sparklineData, setSparklineData] = useState({
    orders: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)),
    machines: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)),
    efficiency: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100))
  });
  
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
      loadDashboardData(true);
    }
  }, [orderUpdate]);

  useEffect(() => {
    if (machineUpdate) {
      console.log('Dashboard received machine update:', machineUpdate);
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
      
      // Calculate production stats
      const totalQuantity = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
      const completedQuantity = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (parseInt(o.actual_quantity || o.quantity) || 0), 0);
      const efficiency = totalQuantity > 0 ? Math.round((completedQuantity / totalQuantity) * 100) : 0;
      const onTimeDelivery = Math.round(75 + Math.random() * 20); // Simulated
      
      const productionStats = {
        efficiency,
        output: completedQuantity,
        on_time_delivery: onTimeDelivery
      };

      // Generate mock alerts for demo
      const mockAlerts = [
        { message: 'Machine M001 efficiency below threshold', type: 'warning', time: new Date() },
        { message: 'Order ORD-2024-001 completed successfully', type: 'info', time: new Date(Date.now() - 300000) },
        { message: 'Quality check required for Batch B123', type: 'critical', time: new Date(Date.now() - 600000) }
      ].slice(0, Math.floor(Math.random() * 3) + 1);

      setStats({
        orders: orderStats,
        machines: machineStats,
        production: productionStats,
        alerts: { critical: 1, warning: 2, info: 1 }
      });
      
      setRecentOrders(orders.slice(0, 5));
      setRecentAlerts(mockAlerts);
      
      // Update sparkline data
      setSparklineData(prev => ({
        orders: [...prev.orders.slice(1), orderStats.total],
        machines: [...prev.machines.slice(1), machineStats.in_use],
        efficiency: [...prev.efficiency.slice(1), efficiency]
      }));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
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
  
  // Enhanced Order Row Component
  const ModernOrderRow = ({ order }) => (
    <div className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:scale-102">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${
          order.status === 'completed' ? 'from-green-500 to-emerald-500' :
          order.status === 'in_progress' ? 'from-blue-500 to-cyan-500' :
          order.status === 'paused' ? 'from-yellow-500 to-orange-500' :
          'from-gray-500 to-slate-500'
        } shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {order.order_number?.slice(-3) || 'N/A'}
        </div>
        
        <div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
            {order.order_number}
          </div>
          <div className="text-sm text-gray-600">{order.product_name}</div>
          {order.quantity && (
            <div className="text-xs text-gray-500">{order.quantity} units</div>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <Badge variant={
          order.status === 'completed' ? 'success' :
          order.status === 'in_progress' ? 'info' :
          order.status === 'paused' ? 'warning' : 'secondary'
        } className="mb-2">
          {order.status?.replace('_', ' ')}
        </Badge>
        <div className="text-xs text-gray-500">
          {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
        </div>
      </div>
    </div>
  );

  // Enhanced Alert Row Component
  const AlertRow = ({ alert }) => <EnhancedAlertCard alert={alert} index={0} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-200 rounded-full animate-ping mx-auto"></div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading Production Dashboard
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Initializing real-time manufacturing intelligence system...
            </p>
            <div className="flex items-center justify-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Ultra-Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 mb-8">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                    <Factory className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                </div>
                
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                    Production Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">Real-time manufacturing intelligence & performance metrics</p>
                </div>
                
                <WebSocketStatusCompact />
              </div>
              
              {/* Live Status Indicators */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-full">
                  <PulseIndicator active={true} color="green" />
                  <span className="font-medium text-green-800">System Online</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-full">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">{stats.orders.in_progress} Active Orders</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-full">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-800">{stats.machines.in_use} Machines Running</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh'}
              </Button>
              
              <Button 
                onClick={() => setShowQuickActions(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Actions
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 p-4 rounded-xl shadow-2xl z-50 backdrop-blur-xl border transform transition-all duration-500 scale-105 ${
          notification.type === 'success' ? 'bg-green-100/90 text-green-800 border-green-300' :
          notification.type === 'danger' ? 'bg-red-100/90 text-red-800 border-red-300' :
          notification.type === 'warning' ? 'bg-yellow-100/90 text-yellow-800 border-yellow-300' :
          'bg-blue-100/90 text-blue-800 border-blue-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              notification.type === 'success' ? 'bg-green-200' :
              notification.type === 'danger' ? 'bg-red-200' :
              notification.type === 'warning' ? 'bg-yellow-200' :
              'bg-blue-200'
            }`}>
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {notification.type === 'danger' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              {(!notification.type || notification.type === 'info') && <Bell className="w-5 h-5 text-blue-600" />}
            </div>
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Priority Alerts */}
        {priorityAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500 rounded-xl animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-red-900">Critical System Alerts</h3>
              <Badge variant="danger">{priorityAlerts.length}</Badge>
            </div>
            <div className="space-y-3">
              {priorityAlerts.map((alert, index) => (
                <EnhancedAlertCard key={index} alert={alert} index={index} />
              ))}
            </div>
          </div>
        )}
        
        {/* Ultra-Modern KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UltraKPICard
            title="Total Orders"
            value={stats.orders.total}
            change={5}
            icon={Package}
            color="blue"
            target={100}
            trend={8}
            sparklineData={sparklineData.orders}
          />
          <UltraKPICard
            title="Machine Utilization"
            value={`${Math.round((stats.machines.in_use / Math.max(stats.machines.total, 1)) * 100)}%`}
            change={3}
            icon={Factory}
            color="purple"
            target={80}
            trend={-2}
            sparklineData={sparklineData.machines}
          />
          <UltraKPICard
            title="On-Time Delivery"
            value={`${stats.production.on_time_delivery}%`}
            change={2}
            icon={Target}
            color="green"
            target={95}
            trend={4}
            sparklineData={sparklineData.efficiency}
          />
          <UltraKPICard
            title="Active Production"
            value={stats.orders.in_progress}
            change={-1}
            icon={Activity}
            color="orange"
            target={20}
            trend={-3}
            sparklineData={sparklineData.orders}
          />
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
              </div>
              <Badge variant="info" className="px-3 py-1">{recentOrders.length}</Badge>
            </div>
            
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map(order => (
                  <ModernOrderRow key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">No recent orders</p>
              </div>
            )}
          </Card>
          
          {/* System Alerts */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">System Alerts</h3>
              </div>
              <Badge variant="warning" className="px-3 py-1">{recentAlerts.length}</Badge>
            </div>
            
            {recentAlerts.length > 0 ? (
              <div className="space-y-4">
                {recentAlerts.map((alert, index) => (
                  <EnhancedAlertCard key={index} alert={alert} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <p className="text-gray-500 text-lg">All systems running smoothly</p>
              </div>
            )}
          </Card>
        </div>
        
        {/* Real-time Activity Feed */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Live Activity Feed</h3>
              <PulseIndicator active={true} color="green" />
            </div>
          </div>
          <ActivityFeed maxItems={8} />
        </div>
      </div>
      
      {/* Enhanced Quick Actions Modal */}
      {showQuickActions && (
        <Modal 
          title="Quick Actions" 
          onClose={() => setShowQuickActions(false)}
          className="backdrop-blur-xl"
        >
          <div className="p-6">
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
                    className={`group p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-${action.color}-400 hover:bg-${action.color}-50 transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                  >
                    <div className="text-center space-y-3">
                      <div className={`mx-auto w-12 h-12 bg-gradient-to-br from-${action.color}-500 to-${action.color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-semibold text-gray-900 group-hover:text-gray-700">
                        {action.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}