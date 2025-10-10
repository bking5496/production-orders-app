import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp, Eye, X, Wifi, Zap, Target, Timer, BarChart3, Gauge, Factory, Settings, CheckCircle, XCircle, Wrench, Tablet, Monitor, MapPin, Bell, Calendar, Clipboard, Headphones } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact, WebSocketIndicator } from './websocket-status.jsx';
import WasteDowntimeDashboard from './waste-downtime-dashboard.jsx';

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
  // Auto-connect WebSocket
  const isConnected = useAutoConnect();

  // Simply render the waste and downtime dashboard component
  return <WasteDowntimeDashboard />;
};

export default IPadSupervisorView;