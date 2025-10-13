import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, Clock, Users, Package, Trash2, Plus, Save, X, Factory, Timer, AlertCircle, CheckCircle, User, Settings, RefreshCw, Calendar, Weight, Hash, FileText, Target, BarChart3, Edit, Eye, TrendingUp, TrendingDown, Home, ArrowLeft, Wifi, Battery, Signal, Menu, Bell, ChevronDown } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent } from '../core/websocket-hooks.js';
import WasteDowntimeReports from './waste-downtime-reports.jsx';

// App Status Bar Component
const AppStatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="bg-black text-white px-4 py-2 text-sm flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
      </div>
      <div className="font-medium">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs">100%</span>
        <Battery className="w-4 h-4" />
      </div>
    </div>
  );
};

// App Header Component
const AppHeader = ({ title, subtitle, onMenuClick, showBack, onBackClick }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {showBack ? (
            <button onClick={onBackClick} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <button onClick={onMenuClick} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          )}
          <div className="p-2 bg-white/20 rounded-xl">
            <Factory className="w-8 h-8" />
          </div>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-xl transition-colors relative">
          <Bell className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-indigo-100">{subtitle}</p>
      </div>
    </div>
  );
};

// Pull to Refresh Component
const PullToRefresh = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    isPulling.current = window.scrollY === 0;
  };
  
  const handleTouchMove = (e) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    setPullDistance(Math.min(distance, 100));
    
    if (distance > 0) {
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    isPulling.current = false;
  };
  
  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4 bg-gradient-to-b from-indigo-100 to-transparent" style={{ transform: `translateY(-${100 - pullDistance}px)` }}>
          <div className="flex items-center space-x-2 text-indigo-600">
            <RefreshCw className={`w-5 h-5 ${pullDistance > 60 || isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
};

// Enhanced Modal with app-like animations
const Modal = ({ isOpen, onClose, title, children, size = "large" }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black z-50 transition-all duration-300 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
      <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Enhanced Stats Card with haptic feedback simulation
const StatsCard = ({ title, value, change, icon: IconComponent, color = "blue", trend = "up", onClick }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const colorClasses = {
    blue: 'from-blue-600 to-slate-600 border-blue-400',
    green: 'from-green-600 to-emerald-600 border-green-400', 
    red: 'from-red-600 to-orange-700 border-red-400',
    orange: 'from-orange-600 to-amber-600 border-orange-400',
    purple: 'from-purple-600 to-indigo-600 border-purple-400'
  };
  
  const handleTouchStart = () => {
    setIsPressed(true);
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };
  
  const handleTouchEnd = () => {
    setIsPressed(false);
    if (onClick) onClick();
  };

  return (
    <div 
      className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-xl cursor-pointer transform transition-all duration-200 active:scale-95 ${isPressed ? 'scale-95 shadow-lg' : 'hover:scale-102 shadow-xl'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div className="flex flex-col items-center mb-3">
        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm mb-2">
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        {change && (
          <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3 text-green-200" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-200" />
            )}
            <span className={`text-xs font-bold ${trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
              {change}
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="text-white text-2xl font-black tracking-tight">{value}</div>
        <div className="text-white/90 text-xs font-semibold leading-tight">{title}</div>
      </div>
    </div>
  );
};

// Enhanced Quick Action Button with app-like feel
const QuickActionButton = ({ onClick, icon: IconComponent, label, color = "blue", size = "large" }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700 border-blue-500',
    green: 'from-green-600 to-green-700 border-green-500',
    red: 'from-red-600 to-red-700 border-red-500',
    orange: 'from-orange-600 to-orange-700 border-orange-500'
  };

  const sizeClasses = {
    large: 'p-8 text-xl min-h-[120px]',
    medium: 'p-6 text-lg min-h-[100px]'
  };
  
  const handleTouchStart = () => {
    setIsPressed(true);
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };
  
  const handleTouchEnd = () => {
    setIsPressed(false);
    if (onClick) onClick();
  };

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`${sizeClasses[size]} bg-gradient-to-br ${colorClasses[color]} border-2 text-white rounded-3xl font-bold flex flex-col items-center justify-center space-y-4 shadow-2xl transform transition-all duration-200 w-full backdrop-blur-sm ${isPressed ? 'scale-95 shadow-lg' : 'hover:scale-105 shadow-xl'}`}
    >
      <div className="p-3 bg-white/20 rounded-2xl">
        <IconComponent className="w-10 h-10" />
      </div>
      <span className="tracking-wide">{label}</span>
    </button>
  );
};

// Recent entries list
const RecentEntriesList = ({ title, entries = [], type = "waste", onViewAll }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <button
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-2"
        >
          <span>View All</span>
          <Eye className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg">No recent entries</div>
            <div className="text-sm">Start recording {type} events</div>
          </div>
        ) : (
          entries.slice(0, 5).map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {type === 'waste' ? entry.waste_type : entry.category_name}
                </div>
                <div className="text-sm text-gray-600">
                  {type === 'waste' 
                    ? `${entry.quantity} ${entry.unit} - ${entry.order_number || 'No order'}`
                    : `${entry.machine_name} - ${entry.primary_cause}`
                  }
                </div>
                <div className="text-xs text-gray-500">
                  {Time.format(new Date(type === 'waste' ? entry.recorded_at : entry.start_time), 'datetime')}
                </div>
              </div>
              <div className="ml-4">
                {type === 'waste' ? (
                  <span className="text-green-600 font-semibold">
                    R{parseFloat(entry.total_cost || 0).toFixed(2)}
                  </span>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    entry.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    entry.status === 'active' ? 'bg-red-100 text-red-800' :
                    entry.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {entry.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Large touch-friendly input component for modals
const TouchInput = ({ label, type = "text", value, onChange, placeholder, required = false, options = [], className = "" }) => {
  if (type === "select") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          required={required}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option, idx) => (
            <option key={idx} value={option.value || option}>{option.label || option}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
          required={required}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        required={required}
      />
    </div>
  );
};

// Add Downtime Modal
const AddDowntimeModal = ({ isOpen, onClose, onSave, machines = [], users = [], categories = [], laborData = [] }) => {
  const [formData, setFormData] = useState({
    order_number: '',
    machine_id: '',
    downtime_category_id: '',
    primary_cause: '',
    reported_by: '',
    assigned_to: '',
    start_time: new Date().toISOString().slice(0, 16),
    estimated_duration: '',
    severity: 'medium',
    notes: ''
  });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await onSave(formData);
      setFormData({
        order_number: '',
        machine_id: '',
        downtime_category_id: '',
        primary_cause: '',
        reported_by: '',
        assigned_to: '',
        start_time: new Date().toISOString().slice(0, 16),
        estimated_duration: '',
        severity: 'medium',
        notes: ''
      });
      onClose();
    } catch (error) {
      console.error('Error saving downtime:', error);
    }
  }, [formData, onSave, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Downtime Event" size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TouchInput
            label="Order Number"
            value={formData.order_number}
            onChange={(value) => setFormData({...formData, order_number: value})}
            placeholder="Enter order number (e.g. ORD-2024-001)"
            required
          />
          
          <TouchInput
            label="Machine"
            type="select"
            value={formData.machine_id}
            onChange={(value) => setFormData({...formData, machine_id: value})}
            placeholder="Select Machine"
            required
            options={machines.map(machine => ({
              value: machine.id,
              label: machine.name
            }))}
          />
          
          <TouchInput
            label="Downtime Category"
            type="select"
            value={formData.downtime_category_id}
            onChange={(value) => setFormData({...formData, downtime_category_id: value})}
            placeholder="Select Category"
            required
            options={categories.map(category => ({
              value: category.id,
              label: category.category_name
            }))}
          />
          
          <TouchInput
            label="Start Time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(value) => setFormData({...formData, start_time: value})}
            required
          />
          
          <TouchInput
            label="Supervisor on Duty"
            type="select"
            value={formData.reported_by}
            onChange={(value) => setFormData({...formData, reported_by: value})}
            placeholder="Select Supervisor"
            required
            options={laborData.filter(l => l.role === 'supervisor' || l.position === 'Supervisor').map(person => ({
              value: person.user_id || person.id,
              label: person.full_name || person.name || person.employee_name
            }))}
          />
          
          <TouchInput
            label="Operator on Duty"
            type="select"
            value={formData.assigned_to}
            onChange={(value) => setFormData({...formData, assigned_to: value})}
            placeholder="Select Operator"
            options={laborData.filter(l => l.role === 'operator' || l.position === 'Operator').map(person => ({
              value: person.user_id || person.id,
              label: person.full_name || person.name || person.employee_name
            }))}
          />
          
          <TouchInput
            label="Primary Cause"
            value={formData.primary_cause}
            onChange={(value) => setFormData({...formData, primary_cause: value})}
            placeholder="Brief description of the cause"
            required
          />
          
          <TouchInput
            label="Estimated Duration (minutes)"
            type="number"
            value={formData.estimated_duration}
            onChange={(value) => setFormData({...formData, estimated_duration: value})}
            placeholder="Expected downtime"
          />
        </div>
        
        <TouchInput
          label="Detailed Notes"
          type="textarea"
          value={formData.notes}
          onChange={(value) => setFormData({...formData, notes: value})}
          placeholder="Detailed description of the downtime event..."
        />
        
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-6 h-6" />
            <span>Save Downtime Event</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-4 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-semibold text-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Add Waste Modal
const AddWasteModal = ({ isOpen, onClose, onSave, orders = [], users = [], laborData = [] }) => {
  const [formData, setFormData] = useState({
    order_number: '',
    waste_type: '',
    quantity: '',
    unit: 'kg',
    reason: '',
    recorded_by: ''
  });

  const wasteTypes = [
    'Material Spillage', 'Defective Products', 'Packaging Waste', 'Raw Material Spoilage',
    'Processing Loss', 'Quality Rejection', 'Overproduction', 'Setup Waste', 'Other'
  ];

  const units = ['kg', 'g', 'tons', 'liters', 'ml', 'pieces', 'boxes', 'bags'];

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await onSave(formData);
      
      setFormData({
        order_number: '',
        waste_type: '',
        quantity: '',
        unit: 'kg',
        reason: '',
        recorded_by: ''
      });
      onClose();
    } catch (error) {
      console.error('Error saving waste:', error);
    }
  }, [formData, onSave, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Waste Record" size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TouchInput
            label="Order Number"
            value={formData.order_number}
            onChange={(value) => setFormData({...formData, order_number: value})}
            placeholder="Enter order number (e.g. ORD-2024-001)"
            required
          />
          
          <TouchInput
            label="Waste Type"
            type="select"
            value={formData.waste_type}
            onChange={(value) => setFormData({...formData, waste_type: value})}
            placeholder="Select Waste Type"
            required
            options={wasteTypes}
          />
          
          <TouchInput
            label="Quantity"
            type="number"
            step="0.001"
            value={formData.quantity}
            onChange={(value) => setFormData({...formData, quantity: value})}
            placeholder="Enter quantity"
            required
          />
          
          <TouchInput
            label="Unit"
            type="select"
            value={formData.unit}
            onChange={(value) => setFormData({...formData, unit: value})}
            options={units}
            required
          />
          
          <TouchInput
            label="Recorded By"
            type="select"
            value={formData.recorded_by}
            onChange={(value) => setFormData({...formData, recorded_by: value})}
            placeholder="Select Person"
            required
            options={laborData.map(person => ({
              value: person.user_id || person.id,
              label: person.full_name || person.name || person.employee_name
            }))}
          />
        </div>
        
        <TouchInput
          label="Reason/Description"
          type="textarea"
          value={formData.reason}
          onChange={(value) => setFormData({...formData, reason: value})}
          placeholder="Describe the reason for waste and any relevant details"
          required
        />
        
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-6 h-6" />
            <span>Save Waste Record</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-4 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-semibold text-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Main Dashboard Component
const WasteDowntimeDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  // Data states
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [recentWaste, setRecentWaste] = useState([]);
  const [recentDowntime, setRecentDowntime] = useState([]);
  const [stats, setStats] = useState({
    todayWaste: 0,
    todayDowntime: 0,
    totalDowntimeHours: 0
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersRes, machinesRes, usersRes, categoriesRes, laborRes] = await Promise.all([
        API.get('/orders'),
        API.get('/machines'),
        API.get('/users'),
        API.get('/downtime-categories'),
        API.get('/labor/assignments')
      ]);
      
      setOrders(ordersRes.data || []);
      setMachines(machinesRes.data || []);
      setUsers(usersRes.data || []);
      setCategories(categoriesRes.data || []);
      setLaborData(laborRes.data || []);
      
      // Load recent entries and stats
      loadRecentEntries();
      loadStats();
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecentEntries = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [wasteRes, downtimeRes] = await Promise.all([
        API.get(`/api/waste/reports?start_date=${today}`),
        API.get(`/api/downtime/reports?start_date=${today}`)
      ]);
      
      setRecentWaste(wasteRes.data || []);
      setRecentDowntime(downtimeRes.data || []);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [wasteSummary, downtimeSummary] = await Promise.all([
        API.get(`/api/waste/summary?start_date=${today}&end_date=${today}`),
        API.get(`/api/downtime/summary?start_date=${today}&end_date=${today}`)
      ]);
      
      const wasteData = wasteSummary.data || [];
      const downtimeData = downtimeSummary.data || [];
      
      setStats({
        todayWaste: wasteData.reduce((sum, item) => sum + parseInt(item.total_records || 0), 0),
        todayDowntime: downtimeData.reduce((sum, item) => sum + parseInt(item.total_incidents || 0), 0),
        totalDowntimeHours: Math.round(downtimeData.reduce((sum, item) => sum + parseInt(item.total_duration || 0), 0) / 60)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save functions
  const saveDowntime = useCallback(async (downtimeData) => {
    try {
      await API.post('/downtime', downtimeData);
      loadRecentEntries();
      loadStats();
    } catch (error) {
      console.error('Error saving downtime:', error);
      throw error;
    }
  }, [loadRecentEntries, loadStats]);

  const saveWaste = useCallback(async (wasteData) => {
    try {
      await API.post('/waste', wasteData);
      loadRecentEntries();
      loadStats();
    } catch (error) {
      console.error('Error saving waste:', error);
      throw error;
    }
  }, [loadRecentEntries, loadStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-2xl font-semibold text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (showReports) {
    return <WasteDowntimeReports onBack={() => setShowReports(false)} />;
  }

  const handleRefresh = async () => {
    await loadData();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 overflow-hidden">
      <AppStatusBar />
      <AppHeader 
        title="Supervisor Dashboard" 
        subtitle="Waste & Downtime Control Center"
        onMenuClick={() => {}}
      />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 pb-20">

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6 mt-6">
            <StatsCard
              title="Today's Waste Events"
              value={stats.todayWaste}
              change="+12%"
              icon={Trash2}
              color="red"
              trend="up"
            />
            <StatsCard
              title="Today's Downtime Events"
              value={stats.todayDowntime}
              change="-5%"
              icon={AlertTriangle}
              color="orange"
              trend="down"
            />
            <StatsCard
              title="Downtime Hours Today"
              value={`${stats.totalDowntimeHours}h`}
              change="-15%"
              icon={Clock}
              color="blue"
              trend="down"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <QuickActionButton
              onClick={() => setShowDowntimeModal(true)}
              icon={AlertTriangle}
              label="Add Downtime Event"
              color="orange"
            />
            <QuickActionButton
              onClick={() => setShowWasteModal(true)}
              icon={Trash2}
              label="Add Waste Record"
              color="red"
            />
            <QuickActionButton
              onClick={() => setShowReports(true)}
              icon={BarChart3}
              label="View Reports"
              color="blue"
            />
          </div>

          {/* Recent Entries */}
          <div className="space-y-6">
            <RecentEntriesList
              title="Recent Waste Records"
              entries={recentWaste}
              type="waste"
              onViewAll={() => setShowReports(true)}
            />
            <RecentEntriesList
              title="Recent Downtime Events"
              entries={recentDowntime}
              type="downtime"
              onViewAll={() => setShowReports(true)}
            />
          </div>
        </div>
      </PullToRefresh>
      
      {/* Bottom Safe Area */}
      <div className="h-6 bg-transparent"></div>

      {/* Modals */}
      <AddDowntimeModal
        isOpen={showDowntimeModal}
        onClose={() => setShowDowntimeModal(false)}
        onSave={saveDowntime}
        machines={machines}
        users={users}
        categories={categories}
        laborData={laborData}
      />

      <AddWasteModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        onSave={saveWaste}
        orders={orders}
        users={users}
        laborData={laborData}
      />
    </div>
  );
};

export default WasteDowntimeDashboard;