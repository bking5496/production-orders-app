// Modern Production Orders Management System - React 19
// Comprehensive order lifecycle management with real-time tracking and machine integration

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Package, Plus, Search, Filter, RefreshCw, Play, Square, CheckCircle, 
  Pause, Clock, AlertTriangle, Factory, Settings, Target, Zap, 
  Activity, XCircle, BarChart3, Trash2, Edit, Eye, Calendar,
  Timer, Gauge, MapPin, User, FileText, AlertCircle, Cpu
} from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import { useOrderUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import WebSocketStatus from './websocket-status.jsx';
import { 
  useDeviceDetection, 
  ResponsiveTable, 
  TouchDropdown, 
  MobileActionMenu, 
  TouchButton,
  usePerformanceOptimization
} from './mobile-responsive-utils.jsx';

// Order Status Configuration with colors and icons
const ORDER_STATUSES = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    description: 'Order created, awaiting machine assignment'
  },
  assigned: { 
    label: 'Assigned', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Settings,
    description: 'Machine assigned, ready to start production'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: Play,
    description: 'Production actively running'
  },
  paused: { 
    label: 'Paused', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: Pause,
    description: 'Production temporarily paused'
  },
  stopped: { 
    label: 'Stopped', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: Square,
    description: 'Production stopped due to issues'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
    icon: CheckCircle,
    description: 'Production completed successfully'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-400 text-white border-gray-500', 
    icon: XCircle,
    description: 'Order cancelled'
  }
};

const PRIORITY_LEVELS = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' }
};

// Modern Production Orders Component
export default function ProductionOrdersSystem() {
  // State Management - Using React 19 patterns
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Advanced Filtering and Search
  const [filters, setFilters] = useState({
    environment: 'all',
    status: 'all',
    priority: 'all',
    machine: 'all',
    search: '',
    dateRange: 'all'
  });

  // View Management
  const [viewMode, setViewMode] = useState('active'); // 'active', 'archive', 'analytics'
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);

  // Mobile and Performance
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  
  // WebSocket Integration
  useAutoConnect();
  const { notifications: wsNotifications, clearNotification } = useNotifications();
  const { lastUpdate } = useOrderUpdates();

  // Form Data
  const [formData, setFormData] = useState({
    order_number: '',
    product_name: '',
    quantity: '',
    priority: 'normal',
    environment: '',
    due_date: '',
    specifications: '',
    customer_info: ''
  });

  // Production Control Data
  const [productionData, setProductionData] = useState({
    machine_id: null,
    operator_id: null,
    batch_number: '',
    start_notes: ''
  });

  // Waste Capture Data
  const [wasteData, setWasteData] = useState({
    material_waste: 0,
    waste_type: 'BLND',
    waste_reason: '',
    waste_category: 'material',
    recovery_possible: false,
    waste_notes: ''
  });

  // Real-time updates and data loading
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (lastUpdate) {
      loadOrders();
    }
  }, [lastUpdate]);

  // WebSocket Event Handlers
  useWebSocketEvent('order_created', (data) => {
    console.log('🆕 New order created:', data.data);
    showNotification(`Order ${data.data.order_number} created successfully`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('order_started', (data) => {
    console.log('▶️ Order production started:', data.data);
    showNotification(`Production started for Order ${data.data.order_number}`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('order_resumed', (data) => {
    console.log('▶️ Order resumed:', data.data);
    showNotification(`Order ${data.data.order_number} resumed`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('order_stopped', (data) => {
    console.log('⏹️ Order stopped:', data.data);
    showNotification(`Order ${data.data.order_number} stopped: ${data.data.reason}`, 'error');
    loadOrders();
  }, []);

  useWebSocketEvent('order_completed', (data) => {
    console.log('✅ Order completed:', data.data);
    showNotification(`Order ${data.data.order_number} completed successfully`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('machine_reserved', (data) => {
    console.log('🔒 Machine reserved:', data.data);
    showNotification(`Machine ${data.data.machine_name} reserved for Order ${data.data.order_number}`, 'info');
    loadMachines();
  }, []);

  useWebSocketEvent('downtime_reported', (data) => {
    console.log('⚠️ Downtime reported:', data.data);
    showNotification(`Downtime reported: ${data.data.reason}`, 'error');
  }, []);

  // Data Loading Functions
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrders(),
        loadMachines(),
        loadEnvironments()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      showNotification('Failed to load system data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await API.get('/orders');
      setOrders(response?.data || response || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      showNotification('Failed to load orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await API.get('/machines');
      setMachines(response?.data || response || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const loadEnvironments = async () => {
    try {
      const response = await API.get('/environments');
      setEnvironments(response?.data || response || []);
    } catch (error) {
      console.error('Error loading environments:', error);
    }
  };

  // Utility Functions
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, []);

  // Order Management Functions
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const orderData = {
        ...formData,
        order_number: formData.order_number || `ORD-${Date.now()}`,
        created_by: 1 // Current user ID
      };
      
      await API.post('/orders', orderData);
      setShowCreateModal(false);
      resetFormData();
      showNotification('Order created successfully', 'success');
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      showNotification(error.message || 'Failed to create order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProduction = async (order) => {
    if (!productionData.machine_id) {
      showNotification('Please select a machine before starting production', 'error');
      return;
    }

    try {
      setLoading(true);
      await API.post(`/orders/${order.id}/start`, {
        machine_id: productionData.machine_id,
        operator_id: productionData.operator_id || 1,
        batch_number: productionData.batch_number || `BAT-${Date.now()}`,
        start_notes: productionData.start_notes
      });
      
      setShowProductionModal(false);
      resetProductionData();
      showNotification(`Production started for Order ${order.order_number}`, 'success');
      loadOrders();
      loadMachines(); // Refresh machine status
    } catch (error) {
      console.error('Error starting production:', error);
      showNotification(error.message || 'Failed to start production', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleResumeProduction = async (order) => {
    try {
      setLoading(true);
      await API.post(`/orders/${order.id}/resume`);
      showNotification(`Order ${order.order_number} resumed`, 'success');
      loadOrders();
    } catch (error) {
      console.error('Error resuming production:', error);
      showNotification(error.message || 'Failed to resume production', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopProduction = async (order) => {
    const reason = prompt('Please provide reason for stopping production:');
    if (!reason) return;

    try {
      setLoading(true);
      await API.post(`/orders/${order.id}/stop`, { 
        reason,
        stop_notes: `Production stopped: ${reason}`
      });
      showNotification(`Order ${order.order_number} stopped`, 'error');
      loadOrders();
      loadMachines(); // Refresh machine status
    } catch (error) {
      console.error('Error stopping production:', error);
      showNotification(error.message || 'Failed to stop production', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProduction = async (order) => {
    try {
      setLoading(true);
      const completionData = {
        actual_quantity: order.quantity, // This could be modified in the waste modal
        completion_notes: 'Production completed successfully',
        waste_data: wasteData.material_waste > 0 || wasteData.time_waste > 0 ? wasteData : null
      };

      await API.post(`/orders/${order.id}/complete`, completionData);
      setShowWasteModal(false);
      resetWasteData();
      showNotification(`Order ${order.order_number} completed successfully`, 'success');
      loadOrders();
      loadMachines(); // Refresh machine status
    } catch (error) {
      console.error('Error completing production:', error);
      showNotification(error.message || 'Failed to complete production', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper Functions
  const resetFormData = () => {
    setFormData({
      order_number: '',
      product_name: '',
      quantity: '',
      priority: 'normal',
      environment: '',
      due_date: '',
      specifications: '',
      customer_info: ''
    });
  };

  const resetProductionData = () => {
    setProductionData({
      machine_id: null,
      operator_id: null,
      batch_number: '',
      start_notes: ''
    });
  };

  const resetWasteData = () => {
    setWasteData({
      material_waste: 0,
      waste_type: 'BLND',
      waste_reason: '',
      waste_category: 'material',
      recovery_possible: false,
      waste_notes: ''
    });
  };

  // Get available machines for selected environment
  const getAvailableMachines = (environmentCode) => {
    return machines.filter(machine => 
      machine.environment === environmentCode && 
      (machine.status === 'available' || machine.status === 'idle')
    );
  };

  // Advanced filtering logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      const matchesSearch = !filters.search || 
        order.order_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.customer_info?.toLowerCase().includes(filters.search.toLowerCase());

      // Environment filter
      const matchesEnvironment = filters.environment === 'all' || order.environment === filters.environment;
      
      // Status filter
      const matchesStatus = filters.status === 'all' || order.status === filters.status;
      
      // Priority filter
      const matchesPriority = filters.priority === 'all' || order.priority === filters.priority;
      
      // Machine filter
      const matchesMachine = filters.machine === 'all' || order.machine_id?.toString() === filters.machine;
      
      // Archive filtering based on view mode - keep stopped orders in active view
      const isArchived = order.status === 'completed' || order.status === 'cancelled';
      const matchesViewMode = viewMode === 'archive' ? isArchived : !isArchived;
      
      return matchesSearch && matchesEnvironment && matchesStatus && 
             matchesPriority && matchesMachine && matchesViewMode;
    });
  }, [orders, filters, viewMode]);

  // Get order status info
  const getOrderStatusInfo = (status) => {
    return ORDER_STATUSES[status] || ORDER_STATUSES.pending;
  };

  // Get priority info
  const getPriorityInfo = (priority) => {
    return PRIORITY_LEVELS[priority] || PRIORITY_LEVELS.normal;
  };

  // Calculate production time
  const getProductionTime = (order) => {
    if (!order.start_time) return null;
    
    const start = new Date(order.start_time);
    const end = order.end_time ? new Date(order.end_time) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Get machine name
  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? machine.name : 'Unknown';
  };

  // Get environment name
  const getEnvironmentName = (environmentCode) => {
    const env = environments.find(e => e.code === environmentCode);
    return env ? env.name : environmentCode;
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Loading production system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-4 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Factory className="w-8 h-8 text-blue-600" />
            Production Orders System
          </h1>
          <p className="text-gray-600 mt-2">Complete order lifecycle management with real-time tracking</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {filteredOrders.length} orders
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              {orders.filter(o => o.status === 'in_progress').length} active
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-4 h-4" />
              {machines.filter(m => m.status === 'in_use').length}/{machines.length} machines
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <WebSocketStatus />
          <TouchButton
            onClick={handleRefresh}
            disabled={refreshing}
            size={isMobile ? "sm" : "md"}
            variant="outline"
            icon={RefreshCw}
            className={`${refreshing ? 'animate-spin' : ''} transition-all duration-200`}
          >
            {isMobile ? '' : 'Refresh'}
          </TouchButton>
          <TouchButton
            onClick={() => setShowCreateModal(true)}
            size={isMobile ? "sm" : "md"}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            icon={Plus}
          >
            {isMobile ? '' : 'New Order'}
          </TouchButton>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-lg border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-current hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* WebSocket Notifications */}
      {wsNotifications.map((notif, index) => (
        <div key={index} className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 flex justify-between items-center transition-all duration-300">
          <span className="font-medium">{notif.message}</span>
          <button 
            onClick={() => clearNotification(notif.id)} 
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Advanced Filters */}
      <Card className="p-6 bg-white shadow-lg border border-gray-200">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders, products, customers..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-5 gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('active')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'active'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Active
              </button>
              <button
                onClick={() => setViewMode('archive')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'archive'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Archive
              </button>
            </div>

            {/* Environment Filter */}
            <select 
              value={filters.environment}
              onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Environments</option>
              {environments.map(env => (
                <option key={env.id} value={env.code}>{env.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Statuses</option>
              {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                <option key={key} value={key}>{status.label}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select 
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Priorities</option>
              {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                <option key={key} value={key}>{priority.label}</option>
              ))}
            </select>

            {/* Machine Filter */}
            <select 
              value={filters.machine}
              onChange={(e) => setFilters(prev => ({ ...prev, machine: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Machines</option>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>{machine.name} ({machine.environment})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Display */}
      <Card className="overflow-hidden bg-white shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <h3 className="font-semibold text-gray-900 text-lg">
            {viewMode === 'archive' ? 'Archived Orders' : 'Active Orders'} ({filteredOrders.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {viewMode === 'archive' ? 'Completed and cancelled orders' : 'Current production orders'}
          </p>
        </div>
        
        {isMobile ? (
          // Mobile Card Layout
          <div className="p-4 space-y-4">
            {filteredOrders.map(order => {
              const statusInfo = getOrderStatusInfo(order.status);
              const priorityInfo = getPriorityInfo(order.priority);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{order.order_number}</h4>
                      <p className="text-sm text-gray-600">{order.product_name}</p>
                      {order.customer_info && (
                        <p className="text-xs text-gray-500 mt-1">Customer: {order.customer_info}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <span className="ml-1 font-medium">{order.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Environment:</span>
                      <span className="ml-1 font-medium">{getEnvironmentName(order.environment)}</span>
                    </div>
                    {order.machine_id && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Machine:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {getMachineName(order.machine_id)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Production Time */}
                  {getProductionTime(order) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Timer className="w-4 h-4" />
                      <span>Runtime: {getProductionTime(order)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <Badge className={priorityInfo.color}>
                      {priorityInfo.label}
                    </Badge>
                    
                    <div className="flex gap-2">
                      <TouchButton 
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }} 
                        size="xs" 
                        variant="outline"
                        icon={Eye}
                      >
                        View
                      </TouchButton>
                      
                      {/* Production Controls */}
                      {order.status === 'pending' && (
                        <TouchButton 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowProductionModal(true);
                          }} 
                          size="xs" 
                          className="bg-green-600 hover:bg-green-700"
                          icon={Play}
                        >
                          Start
                        </TouchButton>
                      )}
                      
                      {order.status === 'in_progress' && (
                        <>
                          <TouchButton 
                            onClick={() => handleStopProduction(order)} 
                            size="xs" 
                            className="bg-red-600 hover:bg-red-700"
                            icon={Square}
                          >
                            Stop
                          </TouchButton>
                        </>
                      )}
                      
                      {order.status === 'stopped' && (
                        <TouchButton 
                          onClick={() => handleResumeProduction(order)} 
                          size="xs" 
                          className="bg-blue-600 hover:bg-blue-700"
                          icon={Play}
                        >
                          Resume
                        </TouchButton>
                      )}
                      
                      {(order.status === 'in_progress' || order.status === 'stopped') && (
                        <TouchButton 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowWasteModal(true);
                          }} 
                          size="xs" 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          icon={CheckCircle}
                        >
                          Complete
                        </TouchButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop Table Layout
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Info</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => {
                  const statusInfo = getOrderStatusInfo(order.status);
                  const priorityInfo = getPriorityInfo(order.priority);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{order.order_number}</div>
                          <div className="text-sm text-gray-500">
                            Qty: {order.quantity} | {getEnvironmentName(order.environment)}
                          </div>
                          <Badge className={`mt-1 ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{order.product_name}</div>
                        {order.customer_info && (
                          <div className="text-xs text-gray-500">Customer: {order.customer_info}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-4 h-4 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">{statusInfo.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        {order.machine_id ? (
                          <div className="flex items-center text-sm">
                            <Cpu className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="font-medium text-blue-600">
                              {getMachineName(order.machine_id)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.start_time && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Timer className="w-3 h-3 mr-1" />
                              {getProductionTime(order)}
                            </div>
                          )}
                          {order.due_date && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              Due: {new Date(order.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }} 
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Production Controls */}
                          {order.status === 'pending' && (
                            <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowProductionModal(true);
                              }} 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          )}
                          
                          {order.status === 'in_progress' && (
                            <>
                              <Button 
                                onClick={() => handleStopProduction(order)} 
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Square className="w-4 h-4 mr-1" />
                                Stop
                              </Button>
                            </>
                          )}
                          
                          {order.status === 'stopped' && (
                            <Button 
                              onClick={() => handleResumeProduction(order)} 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          
                          {(order.status === 'in_progress' || order.status === 'stopped') && (
                            <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowWasteModal(true);
                              }} 
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-sm">Try adjusting your filters or create a new order to get started</p>
          </div>
        )}
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <Modal 
          title="Create New Production Order" 
          onClose={() => {
            setShowCreateModal(false);
            resetFormData();
          }}
          size="large"
        >
          <form onSubmit={handleCreateOrder} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number
                </label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                  min="1"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="Enter product name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                    <option key={key} value={key}>{priority.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment *
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({...formData, environment: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select Environment</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.code}>{env.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Information
              </label>
              <input
                type="text"
                value={formData.customer_info}
                onChange={(e) => setFormData({...formData, customer_info: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Customer name or reference"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specifications
              </label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows="4"
                placeholder="Product specifications, requirements, or notes..."
              />
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Order'}
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  setShowCreateModal(false);
                  resetFormData();
                }} 
                variant="outline"
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Production Start Modal */}
      {showProductionModal && selectedOrder && (
        <Modal 
          title={`Start Production - ${selectedOrder.order_number}`} 
          onClose={() => {
            setShowProductionModal(false);
            resetProductionData();
          }}
          size="large"
        >
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Order Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Product:</span>
                  <span className="ml-2 font-medium">{selectedOrder.product_name}</span>
                </div>
                <div>
                  <span className="text-blue-700">Quantity:</span>
                  <span className="ml-2 font-medium">{selectedOrder.quantity}</span>
                </div>
                <div>
                  <span className="text-blue-700">Environment:</span>
                  <span className="ml-2 font-medium">{getEnvironmentName(selectedOrder.environment)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Priority:</span>
                  <Badge className={getPriorityInfo(selectedOrder.priority).color}>
                    {getPriorityInfo(selectedOrder.priority).label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Machine *
                </label>
                <select
                  value={productionData.machine_id || ''}
                  onChange={(e) => setProductionData(prev => ({ ...prev, machine_id: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select Machine</option>
                  {getAvailableMachines(selectedOrder.environment).map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.type}) - {machine.status}
                    </option>
                  ))}
                </select>
                {getAvailableMachines(selectedOrder.environment).length === 0 && (
                  <p className="text-red-600 text-sm mt-1">
                    No available machines in {getEnvironmentName(selectedOrder.environment)} environment
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={productionData.batch_number}
                  onChange={(e) => setProductionData(prev => ({ ...prev, batch_number: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={`BAT-${Date.now()}`}
                />
              </div>
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Notes
              </label>
              <textarea
                value={productionData.start_notes}
                onChange={(e) => setProductionData(prev => ({ ...prev, start_notes: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows="3"
                placeholder="Pre-production notes, setup information, or special instructions..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => handleStartProduction(selectedOrder)}
                disabled={!productionData.machine_id || loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Starting Production...' : 'Start Production'}
              </Button>
              <Button
                onClick={() => {
                  setShowProductionModal(false);
                  resetProductionData();
                }}
                variant="outline"
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Waste Capture Modal for Completion */}
      {showWasteModal && selectedOrder && (
        <Modal 
          title={`Complete Production - ${selectedOrder.order_number}`} 
          onClose={() => {
            setShowWasteModal(false);
            resetWasteData();
          }}
          size="large"
        >
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Production Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Order:</span>
                  <span className="ml-2 font-medium">{selectedOrder.order_number}</span>
                </div>
                <div>
                  <span className="text-green-700">Product:</span>
                  <span className="ml-2 font-medium">{selectedOrder.product_name}</span>
                </div>
                <div>
                  <span className="text-green-700">Target Quantity:</span>
                  <span className="ml-2 font-medium">{selectedOrder.quantity}</span>
                </div>
                <div>
                  <span className="text-green-700">Runtime:</span>
                  <span className="ml-2 font-medium">{getProductionTime(selectedOrder) || 'Calculating...'}</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Material Waste Tracking
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Waste Type
                  </label>
                  <select
                    value={wasteData.waste_type || 'BLND'}
                    onChange={(e) => setWasteData(prev => ({ ...prev, waste_type: e.target.value, waste_category: 'material' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="BLND">BLND - Blending Material</option>
                    <option value="FP">FP - Finished Product</option>
                    <option value="RM">RM - Raw Material</option>
                    <option value="PM">PM - Packaging Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waste Quantity (units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wasteData.material_waste || 0}
                    onChange={(e) => setWasteData(prev => ({ ...prev, material_waste: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter waste quantity"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waste Reason
                </label>
                <input
                  type="text"
                  value={wasteData.waste_reason || ''}
                  onChange={(e) => setWasteData(prev => ({ ...prev, waste_reason: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Brief description of waste cause"
                />
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={wasteData.recovery_possible || false}
                    onChange={(e) => setWasteData(prev => ({ ...prev, recovery_possible: e.target.checked }))}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Material recovery possible
                  </span>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={wasteData.waste_notes || ''}
                  onChange={(e) => setWasteData(prev => ({ ...prev, waste_notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                  placeholder="Additional details about material waste..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => handleCompleteProduction(selectedOrder)}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Completing Production...' : 'Complete Production'}
              </Button>
              <Button
                onClick={() => {
                  setShowWasteModal(false);
                  resetWasteData();
                }}
                variant="outline"
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Desktop-Optimized Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <Modal 
          title={`Order Details - ${selectedOrder.order_number}`} 
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          size="full"
        >
          <div className="min-h-[90vh] p-12 bg-gray-50">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 mb-12">
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center space-x-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">{selectedOrder.product_name}</h2>
                    <div className="flex items-center space-x-6 text-xl text-gray-600">
                      <span>Order #{selectedOrder.order_number}</span>
                      {selectedOrder.batch_number && (
                        <>
                          <span>•</span>
                          <span>Batch: {selectedOrder.batch_number}</span>
                        </>
                      )}
                      {selectedOrder.product_code && (
                        <>
                          <span>•</span>
                          <span>Code: {selectedOrder.product_code}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <Badge className={getOrderStatusInfo(selectedOrder.status).color + ' px-6 py-3 text-lg'}>
                    {React.createElement(getOrderStatusInfo(selectedOrder.status).icon, { className: "w-6 h-6 mr-3" })}
                    {getOrderStatusInfo(selectedOrder.status).label}
                  </Badge>
                  <Badge className={getPriorityInfo(selectedOrder.priority).color + ' px-6 py-3 text-lg'}>
                    {getPriorityInfo(selectedOrder.priority).label}
                  </Badge>
                </div>
              </div>

              {/* Key Performance Metrics */}
              <div className="grid grid-cols-6 gap-8">
                <div className="bg-green-50 rounded-xl p-8 border border-green-200">
                  <div className="flex items-center justify-between mb-6">
                    <Target className="w-10 h-10 text-green-600" />
                    <span className="text-green-600 text-sm font-semibold uppercase tracking-wide">Target</span>
                  </div>
                  <div className="text-4xl font-bold text-green-900 mb-3">{selectedOrder.quantity}</div>
                  <div className="text-green-700 text-base">Units</div>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-8 border border-blue-200">
                  <div className="flex items-center justify-between mb-6">
                    <CheckCircle className="w-10 h-10 text-blue-600" />
                    <span className="text-blue-600 text-sm font-semibold uppercase tracking-wide">Actual</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-900 mb-3">{selectedOrder.actual_quantity || 0}</div>
                  <div className="text-blue-700 text-base">Units</div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-8 border border-purple-200">
                  <div className="flex items-center justify-between mb-6">
                    <Clock className="w-10 h-10 text-purple-600" />
                    <span className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Runtime</span>
                  </div>
                  <div className="text-4xl font-bold text-purple-900 mb-3">
                    {getProductionTime(selectedOrder) || '0h 0m'}
                  </div>
                  <div className="text-purple-700 text-base">Duration</div>
                </div>
                
                <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200">
                  <div className="flex items-center justify-between mb-6">
                    <Gauge className="w-10 h-10 text-yellow-600" />
                    <span className="text-yellow-600 text-sm font-semibold uppercase tracking-wide">Efficiency</span>
                  </div>
                  <div className="text-4xl font-bold text-yellow-900 mb-3">
                    {selectedOrder.efficiency_percentage ? `${selectedOrder.efficiency_percentage}%` : 'N/A'}
                  </div>
                  <div className="text-yellow-700 text-base">Performance</div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-8 border border-indigo-200">
                  <div className="flex items-center justify-between mb-6">
                    <Factory className="w-10 h-10 text-indigo-600" />
                    <span className="text-indigo-600 text-sm font-semibold uppercase tracking-wide">Machine</span>
                  </div>
                  <div className="text-xl font-bold text-indigo-900 mb-3">
                    {selectedOrder.machine_id ? getMachineName(selectedOrder.machine_id) : 'Unassigned'}
                  </div>
                  <div className="text-indigo-700 text-base">Assignment</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <User className="w-10 h-10 text-gray-600" />
                    <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Operator</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-3">
                    {selectedOrder.operator_id ? `Op #${selectedOrder.operator_id}` : 'TBD'}
                  </div>
                  <div className="text-gray-700 text-base">Assigned</div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-12">
              {/* Left Column - Order & Production Info */}
              <div className="space-y-10">
                {/* Order Information */}
                <Card className="p-10 bg-white shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                    <FileText className="w-8 h-8 mr-4 text-blue-600" />
                    Order Information
                  </h3>
                  
                  <div className="space-y-10">
                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-lg">Environment:</span>
                      <span className="font-semibold text-gray-900 text-lg">{getEnvironmentName(selectedOrder.environment)}</span>
                    </div>
                    
                    {selectedOrder.due_date && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-600 font-medium text-lg">Due Date:</span>
                        <span className="font-semibold text-gray-900 text-lg">
                          {new Date(selectedOrder.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-lg">Created:</span>
                      <span className="font-semibold text-gray-900 text-lg">
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-4">
                      <span className="text-gray-600 font-medium text-lg">Last Updated:</span>
                      <span className="font-semibold text-gray-900 text-lg">
                        {new Date(selectedOrder.updated_at || selectedOrder.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Production Timing */}
                <Card className="p-10 bg-white shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                    <Timer className="w-8 h-8 mr-4 text-purple-600" />
                    Production Timing
                  </h3>
                  
                  <div className="space-y-10">
                    {selectedOrder.start_time && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-600 font-medium text-lg">Started:</span>
                        <span className="font-semibold text-gray-900 text-lg">
                          {new Date(selectedOrder.start_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedOrder.setup_complete_time && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Setup Complete:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(selectedOrder.setup_complete_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedOrder.stop_time && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Stopped:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(selectedOrder.stop_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedOrder.complete_time && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Completed:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(selectedOrder.complete_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedOrder.setup_time && (
                      <div className="flex justify-between items-center py-4">
                        <span className="text-gray-600 font-medium">Setup Duration:</span>
                        <span className="font-semibold text-gray-900">{selectedOrder.setup_time} minutes</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Center Column - Timeline & Quality */}
              <div className="space-y-10">
                {/* Production Timeline */}
                {(selectedOrder.start_time || selectedOrder.stop_time || selectedOrder.complete_time) && (
                  <Card className="p-10 bg-white shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                      <Activity className="w-6 h-6 mr-3 text-green-600" />
                      Production Timeline
                    </h3>
                    
                    <div className="space-y-10">
                      <div className="flex items-start space-x-4">
                        <div className="w-4 h-4 bg-blue-500 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">Order Created</h4>
                          <p className="text-gray-600 mt-1">
                            {new Date(selectedOrder.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {selectedOrder.start_time && (
                        <div className="flex items-start space-x-4">
                          <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">Production Started</h4>
                            <p className="text-gray-600 mt-1">
                              {new Date(selectedOrder.start_time).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.stop_time && (
                        <div className="flex items-start space-x-4">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full mt-1"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">Production Stopped</h4>
                            <p className="text-gray-600 mt-1">
                              {new Date(selectedOrder.stop_time).toLocaleString()}
                            </p>
                            {selectedOrder.stop_reason && (
                              <p className="text-sm text-gray-500 mt-1 bg-yellow-50 p-2 rounded">
                                Reason: {selectedOrder.stop_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.complete_time && (
                        <div className="flex items-start space-x-4">
                          <div className="w-4 h-4 bg-green-600 rounded-full mt-1"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">Production Completed</h4>
                            <p className="text-gray-600 mt-1">
                              {new Date(selectedOrder.complete_time).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Quality Information */}
                {(selectedOrder.quality_score || selectedOrder.quality_approved !== undefined) && (
                  <Card className="p-10 bg-white shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                      <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                      Quality Information
                    </h3>
                    
                    <div className="space-y-4">
                      {selectedOrder.quality_score && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-green-700 font-medium">Quality Score</span>
                            <span className="text-2xl font-bold text-green-900">{selectedOrder.quality_score}/100</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700 font-medium">Approval Status</span>
                          <span className="text-lg font-semibold text-blue-900">
                            {selectedOrder.quality_approved ? 'Approved' : 'Pending Review'}
                          </span>
                        </div>
                        {selectedOrder.quality_check_time && (
                          <p className="text-sm text-blue-600 mt-2">
                            Checked: {new Date(selectedOrder.quality_check_time).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column - Notes & Specifications */}
              <div className="space-y-10">
                {selectedOrder.notes && (
                  <Card className="p-10 bg-white shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                      <AlertCircle className="w-6 h-6 mr-3 text-orange-600" />
                      Production Notes
                    </h3>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedOrder.notes}</p>
                    </div>
                  </Card>
                )}
                
                {selectedOrder.specifications && (
                  <Card className="p-10 bg-white shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                      <Settings className="w-6 h-6 mr-3 text-indigo-600" />
                      Specifications
                    </h3>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <pre className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                        {typeof selectedOrder.specifications === 'object' 
                          ? JSON.stringify(selectedOrder.specifications, null, 2)
                          : selectedOrder.specifications
                        }
                      </pre>
                    </div>
                  </Card>
                )}

                {/* Actions Card */}
                <Card className="p-10 bg-white shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                    <Zap className="w-6 h-6 mr-3 text-purple-600" />
                    Actions
                  </h3>
                  
                  <div className="space-y-4">
                    {selectedOrder.status === 'pending' && (
                      <Button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSelectedOrder(selectedOrder);
                          setShowProductionModal(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Start Production
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => setShowDetailsModal(false)}
                      variant="outline"
                      className="w-full py-3 text-lg"
                    >
                      Close Details
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}