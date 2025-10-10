import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp, Eye, X, Wifi, Zap, Target, Timer, BarChart3, Gauge, Factory, Settings, CheckCircle, XCircle, Wrench, Tablet, Monitor, MapPin, Bell, Calendar, Clipboard, Headphones } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact, WebSocketIndicator } from './websocket-status.jsx';

// iPad-specific card component with larger touch targets
const SupervisorCard = ({ title, value, change, icon: IconComponent, color = "blue", children, className = "" }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const colorClasses = {
    blue: 'from-blue-600 to-slate-600 border-blue-400',
    green: 'from-green-600 to-emerald-600 border-green-400', 
    purple: 'from-slate-600 to-gray-700 border-slate-400',
    red: 'from-red-600 to-orange-700 border-red-400',
    orange: 'from-orange-600 to-amber-600 border-orange-400',
    teal: 'from-teal-600 to-cyan-600 border-teal-400'
  };

  return (
    <div 
      className={`p-8 rounded-3xl bg-gradient-to-br ${colorClasses[color]} border-2 shadow-xl transform transition-all duration-300 active:scale-95 ${isPressed ? 'scale-95' : 'hover:scale-105'} ${className}`}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <IconComponent className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl font-bold">{title}</h3>
        </div>
        {change && (
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${
            change.startsWith('+') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
          }`}>
            {change}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="text-white text-4xl font-bold">{value}</div>
        {children}
      </div>
    </div>
  );
};

// Large touch-friendly button component
const SupervisorButton = ({ onClick, icon: IconComponent, label, color = "blue", size = "large", disabled = false }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const sizeClasses = {
    large: 'p-6 text-lg',
    medium: 'p-4 text-base',
    small: 'p-3 text-sm'
  };
  
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    green: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    red: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    orange: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
    gray: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} ${colorClasses[color]} text-white rounded-2xl font-semibold flex items-center justify-center space-x-3 min-h-[80px] min-w-[200px] transform transition-all duration-200 shadow-lg ${
        isPressed ? 'scale-95' : 'hover:scale-105'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <IconComponent className="w-6 h-6" />
      <span>{label}</span>
    </button>
  );
};

// Production line status component optimized for iPad
const ProductionLineStatus = ({ machines = [] }) => {
  const activeMachines = machines.filter(m => m.status === 'running' || m.status === 'producing').length;
  const totalMachines = machines.length;
  const efficiency = totalMachines > 0 ? Math.round((activeMachines / totalMachines) * 100) : 0;

  return (
    <SupervisorCard
      title="Production Lines"
      value={`${activeMachines}/${totalMachines}`}
      change={`${efficiency}% Active`}
      icon={Factory}
      color="blue"
    >
      <div className="grid grid-cols-4 gap-4 mt-6">
        {machines.slice(0, 8).map((machine, idx) => (
          <div key={idx} className="bg-white/20 rounded-xl p-4 text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
              machine.status === 'running' || machine.status === 'producing' ? 'bg-green-400' :
              machine.status === 'maintenance' ? 'bg-orange-400' :
              machine.status === 'stopped' ? 'bg-red-400' : 'bg-gray-400'
            }`}></div>
            <div className="text-white text-sm font-medium">{machine.name}</div>
            <div className="text-white/70 text-xs capitalize">{machine.status}</div>
          </div>
        ))}
      </div>
    </SupervisorCard>
  );
};

// Staff overview component with shift information
const StaffOverview = ({ laborData = [] }) => {
  const presentStaff = laborData.filter(l => l.attendance_status === 'present').length;
  const totalStaff = laborData.length;
  const attendanceRate = totalStaff > 0 ? Math.round((presentStaff / totalStaff) * 100) : 0;

  return (
    <SupervisorCard
      title="Staff Attendance"
      value={`${presentStaff}/${totalStaff}`}
      change={`${attendanceRate}%`}
      icon={Users}
      color="green"
    >
      <div className="space-y-3 mt-4">
        <div className="flex justify-between items-center">
          <span className="text-white/80">Day Shift</span>
          <span className="text-white font-semibold">{laborData.filter(l => l.shift === 'Day' && l.attendance_status === 'present').length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/80">Night Shift</span>
          <span className="text-white font-semibold">{laborData.filter(l => l.shift === 'Night' && l.attendance_status === 'present').length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/80">Supervisors</span>
          <span className="text-white font-semibold">{laborData.filter(l => l.role === 'supervisor' && l.attendance_status === 'present').length}</span>
        </div>
      </div>
    </SupervisorCard>
  );
};

// Alert management panel
const AlertPanel = ({ alerts = [] }) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  const totalAlerts = alerts.length;

  return (
    <SupervisorCard
      title="Active Alerts"
      value={totalAlerts}
      change={criticalAlerts > 0 ? `${criticalAlerts} Critical` : `${warningAlerts} Warnings`}
      icon={AlertTriangle}
      color={criticalAlerts > 0 ? "red" : warningAlerts > 0 ? "orange" : "green"}
    >
      <div className="space-y-3 mt-4">
        {alerts.slice(0, 4).map((alert, idx) => (
          <div key={idx} className="bg-white/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">{alert.title}</div>
              <div className="text-white/70 text-xs">{alert.machine || alert.location}</div>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              alert.severity === 'critical' ? 'bg-red-500/30 text-red-200' :
              alert.severity === 'warning' ? 'bg-orange-500/30 text-orange-200' :
              'bg-blue-500/30 text-blue-200'
            }`}>
              {alert.severity}
            </div>
          </div>
        ))}
      </div>
    </SupervisorCard>
  );
};

// Main iPad Supervisor View Component
const IPadSupervisorView = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-connect WebSocket
  const isConnected = useAutoConnect();
  
  // Subscribe to real-time updates
  useOrderUpdates((newOrders) => setOrders(newOrders));
  useMachineUpdates((newMachines) => setMachines(newMachines));

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [machinesRes, ordersRes, laborRes] = await Promise.all([
        API.get('/api/machines'),
        API.get('/api/orders'),
        API.get('/api/labor/assignments')
      ]);
      
      setMachines(machinesRes.data || []);
      setOrders(ordersRes.data || []);
      setLaborData(laborRes.data || []);
      
      // Simulate alerts for demo
      setAlerts([
        { id: 1, title: 'Low Temperature', machine: 'Line 1', severity: 'warning', time: '2 min ago' },
        { id: 2, title: 'Material Running Low', machine: 'Line 3', severity: 'critical', time: '5 min ago' },
        { id: 3, title: 'Scheduled Maintenance', machine: 'Line 2', severity: 'info', time: '15 min ago' }
      ]);
      
    } catch (error) {
      console.error('Error loading supervisor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick action handlers
  const handleQuickAction = useCallback((action) => {
    console.log('Supervisor action:', action);
    // Implement specific supervisor actions
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-2xl font-semibold">Loading Supervisor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-white/20 rounded-2xl">
            <Tablet className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-white text-3xl font-bold">Supervisor Dashboard</h1>
            <p className="text-white/70 text-lg">iPad Optimized View</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <WebSocketIndicator />
          <div className="text-right">
            <div className="text-white text-2xl font-bold">
              {Time.format(currentTime, 'time')}
            </div>
            <div className="text-white/70 text-lg">
              {Time.format(currentTime, 'date')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Production Overview */}
        <ProductionLineStatus machines={machines} />
        
        {/* Staff Overview */}
        <StaffOverview laborData={laborData} />
        
        {/* Alert Panel */}
        <AlertPanel alerts={alerts} />
        
        {/* Quick Actions */}
        <SupervisorCard
          title="Quick Actions"
          value=""
          icon={Settings}
          color="purple"
          className="lg:col-span-2 xl:col-span-1"
        >
          <div className="grid grid-cols-2 gap-4 mt-4">
            <SupervisorButton
              onClick={() => handleQuickAction('emergency-stop')}
              icon={XCircle}
              label="Emergency Stop"
              color="red"
              size="medium"
            />
            <SupervisorButton
              onClick={() => handleQuickAction('maintenance-mode')}
              icon={Wrench}
              label="Maintenance"
              color="orange"
              size="medium"
            />
            <SupervisorButton
              onClick={() => handleQuickAction('staff-call')}
              icon={Headphones}
              label="Staff Call"
              color="blue"
              size="medium"
            />
            <SupervisorButton
              onClick={() => handleQuickAction('shift-report')}
              icon={Clipboard}
              label="Shift Report"
              color="green"
              size="medium"
            />
          </div>
        </SupervisorCard>
        
        {/* Production Status */}
        <SupervisorCard
          title="Production Status"
          value={`${orders.filter(o => o.status === 'in_progress').length} Active`}
          change={`${orders.length} Total Orders`}
          icon={BarChart3}
          color="teal"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="bg-white/20 rounded-xl p-4">
              <div className="text-white/80 text-sm mb-2">Today's Production</div>
              <div className="text-white text-2xl font-bold">
                {orders.filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString()).length}
              </div>
              <div className="text-white/60 text-sm">Orders Completed</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4">
              <div className="text-white/80 text-sm mb-2">Efficiency Rate</div>
              <div className="text-white text-2xl font-bold">94%</div>
              <div className="text-white/60 text-sm">This Shift</div>
            </div>
          </div>
        </SupervisorCard>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-center space-x-6">
        <SupervisorButton
          onClick={() => handleQuickAction('refresh')}
          icon={RefreshCw}
          label="Refresh Data"
          color="gray"
          size="medium"
        />
        <SupervisorButton
          onClick={() => handleQuickAction('view-details')}
          icon={Monitor}
          label="Detailed View"
          color="blue"
          size="medium"
        />
        <SupervisorButton
          onClick={() => handleQuickAction('notifications')}
          icon={Bell}
          label="Notifications"
          color="orange"
          size="medium"
        />
      </div>
    </div>
  );
};

export default IPadSupervisorView;