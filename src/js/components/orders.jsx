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

// Downtime History Component
const DowntimeHistory = ({ orderId }) => {
  const [downtimeData, setDowntimeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadDowntimeHistory();
    }
  }, [orderId]);

  const loadDowntimeHistory = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/orders/${orderId}/downtime`);
      setDowntimeData(response);
    } catch (error) {
      console.error('Failed to load downtime history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-500">Loading downtime history...</div>
      </div>
    );
  }

  if (!downtimeData?.history || downtimeData.history.length === 0) {
    return (
      <div className="text-center text-gray-500 italic py-8">
        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
        <p>No downtime events recorded</p>
        <p className="text-xs mt-1">Production has been running smoothly</p>
      </div>
    );
  }

  const { history, summary } = downtimeData;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{summary.total_stops}</div>
          <div className="text-xs text-red-700">Total Stops</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{Math.round(summary.total_downtime_minutes)}m</div>
          <div className="text-xs text-orange-700">Total Downtime</div>
        </div>
      </div>

      {/* Downtime Events */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((event, index) => (
          <div key={event.id || index} className="bg-gray-50 border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={event.end_time ? 'success' : 'warning'} size="sm">
                  {event.end_time ? 'Resolved' : 'Active'}
                </Badge>
                <span className="text-sm font-medium text-gray-700">{event.category}</span>
              </div>
              <div className="text-xs text-gray-500">
                {event.duration ? `${Math.round(event.duration)}m` : 'Active'}
              </div>
            </div>
            
            <div className="text-sm space-y-1">
              <div><strong>Started:</strong> {new Date(event.start_time).toLocaleString()}</div>
              {event.end_time && (
                <div><strong>Ended:</strong> {new Date(event.end_time).toLocaleString()}</div>
              )}
              <div><strong>Reason:</strong> {typeof event.reason === 'string' ? event.reason : 'No reason provided'}</div>
              {event.notes && (
                <div><strong>Notes:</strong> {typeof event.notes === 'string' ? event.notes : 'No additional notes'}</div>
              )}
              {event.resolved_by_name && (
                <div><strong>Resolved By:</strong> {event.resolved_by_name}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Modern Production Orders Component
export default function ProductionOrdersSystem() {
  // State Management - Using React 19 patterns
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [operators, setOperators] = useState([]);
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
  const [showStopModal, setShowStopModal] = useState(false);
  const [showMachineAssignModal, setShowMachineAssignModal] = useState(false);

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

  // Stop Production Data
  const [stopData, setStopData] = useState({
    reason: 'Unplanned Stop',
    category: 'Equipment',
    notes: ''
  });

  // Waste Capture Data
  const [wasteData, setWasteData] = useState({
    waste_type: 'BLND',
    weight: 0,
    units: 0,
    waste_reason: '',
    waste_category: 'material',
    recovery_possible: false,
    waste_notes: ''
  });

  // Machine Assignment Data
  const [machineAssignData, setMachineAssignData] = useState({
    machine_id: '',
    scheduled_date: '',
    shift: '',
    notes: ''
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
        loadEnvironments(),
        loadOperators()
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

  const loadOperators = async () => {
    try {
      const response = await API.get('/users?roles=operator,supervisor,admin');
      setOperators(response?.data || response || []);
    } catch (error) {
      console.error('Error loading operators:', error);
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
    if (!order.machine_id) {
      showNotification('No machine assigned to this order. Please assign a machine first.', 'error');
      return;
    }

    try {
      setLoading(true);
      await API.post(`/orders/${order.id}/start`, {
        machine_id: order.machine_id, // Use the order's assigned machine
        operator_id: null, // Operator will be assigned in labor planner
        batch_number: order.batch_number || productionData.batch_number || `BAT-${Date.now()}`,
        start_notes: productionData.start_notes || ''
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

  const handleStopProduction = (order) => {
    setSelectedOrder(order);
    setShowStopModal(true);
  };

  const handleStopSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setLoading(true);
      await API.post(`/orders/${selectedOrder.id}/stop`, { 
        reason: stopData.reason,
        category: stopData.category,
        notes: stopData.notes
      });
      setShowStopModal(false);
      resetStopData();
      showNotification(`Order ${selectedOrder.order_number} stopped`, 'error');
      loadOrders();
      loadMachines(); // Refresh machine status
    } catch (error) {
      console.error('Error stopping production:', error);
      showNotification(error.message || 'Failed to stop production', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMachineAssignment = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !machineAssignData.machine_id || !machineAssignData.scheduled_date || !machineAssignData.shift) {
      showNotification('Please select a machine, date, and shift', 'error');
      return;
    }

    try {
      setLoading(true);
      // Convert shift to start time
      const shiftTimes = {
        'day': '06:00:00',
        'night': '18:00:00',
        '24hr': '06:00:00' // 24hr shifts start with day shift
      };
      
      const startDateTime = `${machineAssignData.scheduled_date}T${shiftTimes[machineAssignData.shift]}`;
      
      await API.put(`/orders/${selectedOrder.id}`, {
        machine_id: machineAssignData.machine_id,
        start_time: startDateTime,
        shift_type: machineAssignData.shift,
        notes: machineAssignData.notes
      });
      
      setShowMachineAssignModal(false);
      resetMachineAssignData();
      showNotification(`Machine assigned to Order ${selectedOrder.order_number}`, 'success');
      loadOrders();
      loadMachines(); // Refresh machine status
    } catch (error) {
      console.error('Error assigning machine:', error);
      showNotification(error.message || 'Failed to assign machine', 'error');
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
        waste_data: wasteData.weight > 0 || (wasteData.units > 0 && (wasteData.waste_type === 'PM' || wasteData.waste_type === 'FP')) ? wasteData : null
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

  const resetStopData = () => {
    setStopData({
      reason: 'Unplanned Stop',
      category: 'Equipment',
      notes: ''
    });
  };

  const resetWasteData = () => {
    setWasteData({
      waste_type: 'BLND',
      weight: 0,
      units: 0,
      waste_reason: '',
      waste_category: 'material',
      recovery_possible: false,
      waste_notes: ''
    });
  };

  const resetMachineAssignData = () => {
    setMachineAssignData({
      machine_id: '',
      scheduled_date: '',
      shift: '',
      notes: ''
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

  // Get order status info with null safety
  const getOrderStatusInfo = (status) => {
    if (!status) return ORDER_STATUSES.pending;
    return ORDER_STATUSES[status] || ORDER_STATUSES.pending;
  };

  // Get priority info with null safety
  const getPriorityInfo = (priority) => {
    if (!priority) return PRIORITY_LEVELS.normal;
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

  // Get machine name with null safety
  const getMachineName = (machineId) => {
    if (!machineId || !machines || !Array.isArray(machines)) return 'Unknown';
    const machine = machines.find(m => m && m.id === machineId);
    return machine && machine.name ? machine.name : 'Unknown';
  };

  // Get environment name with null safety
  const getEnvironmentName = (environmentCode) => {
    if (!environmentCode || !environments || !Array.isArray(environments)) return environmentCode || 'Unknown';
    const env = environments.find(e => e && e.code === environmentCode);
    return env && env.name ? env.name : environmentCode;
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
                      <Badge className={statusInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo?.label || 'Unknown'}
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
                    <Badge className={priorityInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'}>
                      {priorityInfo?.label || 'Normal'}
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
                          <Badge className={`mt-1 ${priorityInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {priorityInfo?.label || 'Normal'}
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
                        <Badge className={statusInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'}>
                          <StatusIcon className="w-4 h-4 mr-1" />
                          {statusInfo?.label || 'Unknown'}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">{statusInfo?.description || 'Status information'}</div>
                        
                        {/* Duration and Due Date moved from Progress column */}
                        <div className="space-y-1 mt-2">
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
                          {order.status === 'in_progress' && order.quantity && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{width: '60%'}}></div>
                            </div>
                          )}
                          {order.status === 'pending' && !order.machine_id && (
                            <span className="text-amber-600 text-xs">Awaiting machine assignment</span>
                          )}
                          {order.status === 'assigned' && (
                            <span className="text-blue-600 text-xs">Ready to start</span>
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
                          {order.status === 'pending' && !order.machine_id && (
                            <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowMachineAssignModal(true);
                              }} 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Assign Machine
                            </Button>
                          )}
                          
                          {order.status === 'pending' && order.machine_id && (
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
                  <span className="text-blue-700">Assigned Machine:</span>
                  <span className="ml-2 font-medium">
                    {selectedOrder.machine_id ? getMachineName(selectedOrder.machine_id) : 'Not Assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Priority:</span>
                  <Badge className={getPriorityInfo(selectedOrder.priority)?.color || 'bg-gray-100 text-gray-800 border-gray-200'}>
                    {getPriorityInfo(selectedOrder.priority)?.label || 'Normal'}
                  </Badge>
                </div>
              </div>
            </div>

            {!selectedOrder.machine_id && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  No machine assigned to this order. Please assign a machine before starting production.
                </p>
              </div>
            )}

            {selectedOrder.machine_id && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Machine assigned! Operators will be assigned through the Labor Planner.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
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
              <div></div>
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
                disabled={!selectedOrder.machine_id || loading}
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
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waste Type
                  </label>
                  <select
                    value={wasteData.waste_type || 'BLND'}
                    onChange={(e) => setWasteData(prev => ({ ...prev, waste_type: e.target.value, waste_category: 'material' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="BLND">BLND</option>
                    <option value="RM">RM</option>
                    <option value="PM">PM</option>
                    <option value="FP">FP</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Weight field - always shown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={wasteData.weight || 0}
                      onChange={(e) => setWasteData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter weight"
                    />
                  </div>

                  {/* Units field - only for PM and FP */}
                  {(wasteData.waste_type === 'PM' || wasteData.waste_type === 'FP') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Units
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={wasteData.units || 0}
                        onChange={(e) => setWasteData(prev => ({ ...prev, units: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter units"
                      />
                    </div>
                  )}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows="2"
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
          title={`Order Details - ${selectedOrder.order_number || 'Unknown'}`} 
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          size="fullscreen"
        >
          <div className="p-6 bg-white h-full">
            {/* Compact Header */}
            <div className="mb-6 pb-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedOrder.product_name || 'Unknown Product'}</h2>
                  <p className="text-lg text-gray-700">Order #{selectedOrder.order_number || 'Unknown'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={(getOrderStatusInfo(selectedOrder.status)?.color || 'bg-gray-100 text-gray-800 border-gray-200') + " px-3 py-1 text-sm font-semibold"}>
                    {getOrderStatusInfo(selectedOrder.status)?.label || 'Unknown'}
                  </Badge>
                  <Badge className={(getPriorityInfo(selectedOrder.priority)?.color || 'bg-gray-100 text-gray-800 border-gray-200') + " px-3 py-1 text-sm font-semibold"}>
                    {getPriorityInfo(selectedOrder.priority)?.label || 'Normal'}
                  </Badge>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Created</div>
                    <div className="font-semibold">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : 'Unknown'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Column Layout - No Scrolling */}
            <div className="grid grid-cols-3 gap-6 h-full">
              
              {/* Left Column - Order Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-blue-600 mb-4 border-b border-blue-200 pb-2">Order Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Status:</span>
                    <Badge className={(getOrderStatusInfo(selectedOrder.status)?.color || 'bg-gray-100 text-gray-800 border-gray-200') + " px-2 py-1 text-xs"}>
                      {getOrderStatusInfo(selectedOrder.status)?.label || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Target Qty:</span>
                    <span className="font-bold text-green-600">{selectedOrder.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Actual Qty:</span>
                    <span className="font-bold text-blue-600">{selectedOrder.actual_quantity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Machine:</span>
                    <span className="text-gray-900">{selectedOrder.machine_id ? getMachineName(selectedOrder.machine_id) : 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Operator:</span>
                    <span className="text-gray-900">{selectedOrder.operator_id ? `#${selectedOrder.operator_id}` : 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Environment:</span>
                    <span className="text-gray-900">{getEnvironmentName(selectedOrder.environment)}</span>
                  </div>
                  {selectedOrder.batch_number && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Batch:</span>
                      <span className="text-gray-900">{selectedOrder.batch_number}</span>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <h4 className="text-lg font-bold text-blue-600 mt-6 mb-4 border-b border-blue-200 pb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="text-gray-900">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'Unknown'}</span>
                  </div>
                  {selectedOrder.start_time && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Started:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.start_time).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.complete_time && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Completed:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.complete_time).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.stop_time && (
                    <div className="flex justify-between">
                      <span className="font-medium text-red-700">Stopped:</span>
                      <span className="text-red-900">{new Date(selectedOrder.stop_time).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column - Downtime & Issues */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-red-600 mb-4 border-b border-red-200 pb-2">Downtime History & Issues</h3>
                <DowntimeHistory orderId={selectedOrder.id} />
                
                {/* Waste Information */}
                <h4 className="text-lg font-bold text-orange-600 mt-6 mb-4 border-b border-orange-200 pb-2">Waste Management</h4>
                {selectedOrder.waste_quantity ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="font-bold text-orange-700">{typeof selectedOrder.waste_type === 'string' ? selectedOrder.waste_type : 'Material'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Quantity:</span>
                        <span className="font-bold text-red-600">{typeof selectedOrder.waste_quantity === 'number' || typeof selectedOrder.waste_quantity === 'string' ? selectedOrder.waste_quantity : '0'}</span>
                      </div>
                      {selectedOrder.waste_notes && (
                        <div>
                          <span className="font-medium text-gray-700">Notes:</span>
                          <p className="text-gray-900 mt-1">{typeof selectedOrder.waste_notes === 'string' ? selectedOrder.waste_notes : 'No waste notes available'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 italic py-4">
                    No waste recorded
                  </div>
                )}
              </div>

              {/* Right Column - Production Notes & Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-green-600 mb-4 border-b border-green-200 pb-2">Production Notes</h3>
                {selectedOrder.notes ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                    <p className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">{typeof selectedOrder.notes === 'string' ? selectedOrder.notes : 'No notes available'}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 italic py-4 mb-6">
                    No production notes available
                  </div>
                )}

                {/* Specifications */}
                {selectedOrder.specifications && (
                  <div className="mb-6">
                    <h4 className="text-md font-bold text-purple-600 mb-2 border-b border-purple-200 pb-1">Specifications</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{typeof selectedOrder.specifications === 'string' ? selectedOrder.specifications : 'No specifications available'}</p>
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                {selectedOrder.customer_info && (
                  <div className="mb-6">
                    <h4 className="text-md font-bold text-indigo-600 mb-2 border-b border-indigo-200 pb-1">Customer Info</h4>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{typeof selectedOrder.customer_info === 'string' ? selectedOrder.customer_info : 'No customer info available'}</p>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="mt-auto pt-4">
                  <Button 
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedOrder(null);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Enhanced Stop Production Modal */}
      {showStopModal && selectedOrder && (
        <Modal 
          title={`Stop Production - Order ${selectedOrder.order_number}`} 
          onClose={() => {
            setShowStopModal(false);
            setSelectedOrder(null);
            resetStopData();
          }}
          size="medium"
        >
          <form onSubmit={handleStopSubmit} className="space-y-6 p-6">
            {/* Header */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Square className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-red-900">Stop Production</h3>
                  <p className="text-sm text-red-700">
                    You are about to stop production for <strong>{selectedOrder.product_name}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Stop Reason Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Stop Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={stopData.reason}
                onChange={(e) => setStopData({...stopData, reason: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                required
              >
                <option value="Planned Stop">📅 Planned Stop</option>
                <option value="Unplanned Stop">⚠️ Unplanned Stop</option>
              </select>
            </div>

            {/* Stop Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Stop Category <span className="text-red-500">*</span>
              </label>
              <select
                value={stopData.category}
                onChange={(e) => setStopData({...stopData, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                required
              >
                <option value="Equipment">🔧 Equipment</option>
                <option value="Material">📦 Material</option>
                <option value="Quality">🎯 Quality</option>
                <option value="Changeover">🔄 Changeover</option>
                <option value="Break">☕ Break</option>
                <option value="Safety">⚠️ Safety</option>
                <option value="Utilities">⚡ Utilities</option>
                <option value="Maintenance">⚙️ Maintenance</option>
                <option value="Other">❓ Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Additional Notes
              </label>
              <textarea
                value={stopData.notes}
                onChange={(e) => setStopData({...stopData, notes: e.target.value})}
                placeholder="Provide additional details about the stop reason..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => {
                  setShowStopModal(false);
                  setSelectedOrder(null);
                  resetStopData();
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Square className="w-5 h-5" />
                {loading ? 'Stopping...' : 'Stop Production'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Machine Assignment Modal */}
      {showMachineAssignModal && selectedOrder && (
        <Modal 
          title={`Assign Machine - Order ${selectedOrder.order_number}`} 
          onClose={() => {
            setShowMachineAssignModal(false);
            setSelectedOrder(null);
            resetMachineAssignData();
          }}
          size="large"
        >
          <form onSubmit={handleMachineAssignment} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Product:</span>
                  <span className="ml-2 text-gray-900">{selectedOrder.product_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Quantity:</span>
                  <span className="ml-2 text-gray-900">{selectedOrder.quantity}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Environment:</span>
                  <span className="ml-2 text-gray-900">{getEnvironmentName(selectedOrder.environment)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <Badge className={`ml-2 ${getPriorityInfo(selectedOrder.priority)?.color || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                    {getPriorityInfo(selectedOrder.priority)?.label || 'Normal'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Machine *
                </label>
                <select
                  value={machineAssignData.machine_id}
                  onChange={(e) => setMachineAssignData({...machineAssignData, machine_id: e.target.value})}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={machineAssignData.scheduled_date}
                    onChange={(e) => setMachineAssignData({...machineAssignData, scheduled_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift *
                  </label>
                  <select
                    value={machineAssignData.shift}
                    onChange={(e) => setMachineAssignData({...machineAssignData, shift: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select Shift</option>
                    <option value="day">Day Shift (06:00 - 18:00)</option>
                    <option value="night">Night Shift (18:00 - 06:00)</option>
                    <option value="24hr">24Hr Shift (Full Day)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Notes
              </label>
              <textarea
                value={machineAssignData.notes}
                onChange={(e) => setMachineAssignData({...machineAssignData, notes: e.target.value})}
                placeholder="Optional notes about this machine assignment..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
            
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                onClick={() => {
                  setShowMachineAssignModal(false);
                  setSelectedOrder(null);
                  resetMachineAssignData();
                }}
                variant="outline"
                className="px-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!machineAssignData.machine_id || !machineAssignData.scheduled_date || !machineAssignData.shift || loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? 'Assigning...' : 'Assign Machine'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

