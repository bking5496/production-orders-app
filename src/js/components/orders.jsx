import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Filter, RefreshCw, Play, Square, Trash2, Clock, AlertTriangle, CheckCircle, BarChart3, Calendar, Target, Wifi, ArrowLeft, Menu } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import ProductionCompletionModalWithWaste from './production-completion-modal-with-waste.jsx';
import EnhancedProductionWorkflow from './enhanced-production-workflow.jsx';
import { useOrderUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import WebSocketStatus from './websocket-status.jsx';
import { 
  useDeviceDetection, 
  useTouchGestures, 
  ResponsiveTable, 
  TouchDropdown, 
  MobileActionMenu, 
  TouchButton,
  usePerformanceOptimization
} from './mobile-responsive-utils.jsx';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  
  // Mobile-specific state
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations, shouldLazyLoad } = usePerformanceOptimization();
  const [showFilters, setShowFilters] = useState(false);

  // WebSocket integration
  useAutoConnect(); // Automatically connect when user is authenticated
  const { notifications: wsNotifications, clearNotification } = useNotifications();
  const { lastUpdate } = useOrderUpdates();

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showEnhancedWorkflow, setShowEnhancedWorkflow] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [stopReason, setStopReason] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(0);

  const [formData, setFormData] = useState({
    order_number: '', product_name: '', quantity: '', environment: '',
    priority: 'normal', due_date: '', notes: ''
  });

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [ordersData, machinesData, environmentsData] = await Promise.all([
        API.get('/orders'),
        API.get('/machines'),
        API.get('/environments').catch(() => [])
      ]);
      setOrders(ordersData);
      setMachines(machinesData);
      setEnvironments(environmentsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('Failed to load orders', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket real-time updates
  useWebSocketEvent('order_started', (data) => {
    console.log('🟢 Order started:', data.data.order);
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => 
        order.id === data.data.order.id ? data.data.order : order
      );
      return updatedOrders;
    });
    showNotification(`Order #${data.data.order.order_number} started on ${data.data.order.machine_name}`, 'success');
  }, []);

  useWebSocketEvent('order_stopped', (data) => {
    console.log('🟡 Order stopped:', data.data.order);
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => 
        order.id === data.data.order.id ? data.data.order : order
      );
      return updatedOrders;
    });
    showNotification(`Order #${data.data.order.order_number} stopped: ${data.data.reason}`, 'warning');
  }, []);

  useWebSocketEvent('order_resumed', (data) => {
    console.log('🔵 Order resumed:', data.data.order);
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => 
        order.id === data.data.order.id ? data.data.order : order
      );
      return updatedOrders;
    });
    showNotification(`Order #${data.data.order.order_number} resumed`, 'success');
  }, []);

  useWebSocketEvent('order_completed', (data) => {
    console.log('✅ Order completed:', data.data.order);
    setOrders(prevOrders => {
      // Remove completed orders from active list
      return prevOrders.filter(order => order.id !== data.data.order.id);
    });
    showNotification(`Order #${data.data.order.order_number} completed with ${data.data.actual_quantity} units`, 'success');
  }, []);

  // Show WebSocket notifications
  useEffect(() => {
    wsNotifications.forEach(notification => {
      if (notification.type === 'alert') {
        showNotification(notification.message, 'danger');
        clearNotification(notification.id);
      }
    });
  }, [wsNotifications]);

  // Subscribe to relevant channels
  useEffect(() => {
    if (window.EnhancedWebSocketService?.isConnected()) {
      window.EnhancedWebSocketService.subscribe(['orders', 'machines', 'production']);
    }
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await API.post('/orders', formData);
      setShowCreateModal(false);
      setFormData({ order_number: '', product_name: '', quantity: '', environment: '', priority: 'normal', due_date: '', notes: '' });
      loadData();
      showNotification('Order created successfully');
    } catch (error) {
      showNotification('Failed to create order: ' + error.message, 'danger');
    }
  };

  const handleStartProduction = async () => {
    if (!selectedMachine) {
      showNotification('Please select a machine', 'warning');
      return;
    }
    try {
      await API.post(`/orders/${selectedOrder.id}/start`, { machine_id: selectedMachine });
      setShowStartModal(false);
      setSelectedMachine('');
      loadData();
      showNotification('Production started successfully');
    } catch (error) {
      showNotification('Failed to start production: ' + error.message, 'danger');
    }
  };

  const handleStopProduction = async () => {
    if (!stopReason.trim()) {
      showNotification('Please enter a reason for stopping', 'warning');
      return;
    }
    try {
      await API.post(`/orders/${selectedOrder.id}/stop`, { reason: stopReason });
      setShowStopModal(false);
      setStopReason('');
      loadData();
      showNotification('Production stopped successfully');
    } catch (error) {
      showNotification('Failed to stop production: ' + error.message, 'danger');
    }
  };

  // Handle quantity update with real-time tracking
  const handleQuantityUpdate = async (e) => {
    e.preventDefault();
    if (currentQuantity < 0 || currentQuantity > selectedOrder.quantity) {
      showNotification('Invalid quantity entered', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await API.patch(`/orders/${selectedOrder.id}/quantity`, {
        actual_quantity: currentQuantity,
        notes: `Updated from ${selectedOrder.actual_quantity || 0} to ${currentQuantity} by operator`
      });
      
      // Show enhanced feedback with shift tracking info
      if (response.shiftType && response.quantityChange !== undefined) {
        showNotification(
          `Quantity updated: ${response.quantityChange > 0 ? '+' : ''}${response.quantityChange} units (${response.shiftType} shift)`,
          'success'
        );
      } else {
        showNotification('Quantity updated successfully');
      }
      
      setShowQuantityModal(false);
      setCurrentQuantity(0);
      loadData();
    } catch (error) {
      showNotification('Failed to update quantity: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeProduction = async (orderId) => {
    try {
      await API.post(`/orders/${orderId}/resume`);
      loadData();
      showNotification('Production resumed successfully');
    } catch (error) {
      showNotification('Failed to resume production: ' + error.message, 'danger');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await API.delete(`/orders/${orderId}`);
        loadData();
        showNotification('Order deleted successfully');
      } catch (error) {
        showNotification('Failed to delete order: ' + error.message, 'danger');
      }
    }
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (selectedEnvironment !== 'all') {
      filtered = filtered.filter(order => order.environment === selectedEnvironment);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [orders, selectedEnvironment, statusFilter, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const stopped = orders.filter(o => o.status === 'stopped').length;
    const totalQuantity = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
    const completedQuantity = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (parseInt(o.actual_quantity || o.quantity) || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, pending, inProgress, completed, stopped, totalQuantity, completedQuantity, completionRate };
  }, [orders]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'default', icon: Clock },
      in_progress: { variant: 'info', icon: Play },
      completed: { variant: 'success', icon: CheckCircle },
      stopped: { variant: 'danger', icon: Square }
    };
    
    const config = statusConfig[status] || { variant: 'default', icon: AlertTriangle };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: 'default',
      normal: 'info', 
      high: 'warning',
      urgent: 'danger'
    };
    return <Badge variant={priorityConfig[priority] || 'default'} size="sm">{priority?.toUpperCase() || 'NORMAL'}</Badge>;
  };

  // Render desktop table actions
  const renderOrderActions = (order) => {
    if (isMobile) return null; // Mobile uses MobileOrderCard actions
    
    return (
      <div className="flex gap-1">
        {order.status === 'pending' && (
          <>
            <Button 
              onClick={() => { setSelectedOrder(order); setShowStartModal(true); }} 
              size="sm"
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover-lift btn-micro"
            >
              <Play className="w-3 h-3" />
            </Button>
            <Button 
              onClick={() => handleDeleteOrder(order.id)} 
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover-lift btn-micro"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
        {order.status === 'in_progress' && (
          <>
            <Button 
              onClick={() => { 
                setSelectedOrder(order); 
                setCurrentQuantity(order.actual_quantity || 0);
                setShowQuantityModal(true); 
              }} 
              size="sm"
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover-lift btn-micro"
              title="Update Quantity"
            >
              <Target className="w-3 h-3" />
            </Button>
            <Button 
              onClick={() => { setSelectedOrder(order); setShowStopModal(true); }} 
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover-lift btn-micro"
              title="Stop Production"
            >
              <Square className="w-3 h-3" />
            </Button>
            <Button 
              onClick={() => { setSelectedOrder(order); setShowCompletionModal(true); }} 
              size="sm"
              variant="outline"
              className="text-green-600 hover:text-green-700 hover-lift btn-micro"
              title="Complete Order"
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
          </>
        )}
        {order.status === 'stopped' && (
          <Button 
            onClick={() => handleResumeProduction(order.id)} 
            size="sm"
            variant="outline"
            className="text-blue-600 hover:text-blue-700 hover-lift btn-micro btn-pulse"
            title="Resume Production"
          >
            <Play className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  // Mobile Order Card Component
  const MobileOrderCard = ({ 
    order, 
    onStart, 
    onStop, 
    onResume, 
    onComplete, 
    onUpdateQuantity, 
    onDelete,
    getStatusBadge,
    getPriorityBadge
  }) => {
    const actionMenuRef = useRef(null);
    
    // Touch gesture support for swipe actions
    useTouchGestures(actionMenuRef.current, {
      onSwipeLeft: () => {
        // Quick action: Start or Resume production
        if (order.status === 'pending') onStart();
        else if (order.status === 'stopped') onResume();
      },
      onSwipeRight: () => {
        // Quick action: Stop or Complete production
        if (order.status === 'in_progress') onStop();
      },
      onLongPress: () => {
        // Long press shows action menu (fallback for complex actions)
        console.log('Long press detected on order:', order.order_number);
      }
    });

    const getQuickActions = () => {
      const actions = [];
      
      if (order.status === 'pending') {
        actions.push(
          { label: 'Enhanced Workflow', icon: BarChart3, onClick: () => {
            setSelectedOrder(order);
            setShowEnhancedWorkflow(true);
          }, primary: true },
          { label: 'Quick Start', icon: Play, onClick: onStart },
          { label: 'Delete Order', icon: Trash2, onClick: onDelete, danger: true }
        );
      } else if (order.status === 'in_progress') {
        actions.push(
          { label: 'Update Quantity', icon: Target, onClick: onUpdateQuantity },
          { label: 'Stop Production', icon: Square, onClick: onStop, danger: true },
          { label: 'Complete Order', icon: CheckCircle, onClick: onComplete, primary: true }
        );
      } else if (order.status === 'stopped') {
        actions.push(
          { label: 'Resume Production', icon: Play, onClick: onResume, primary: true }
        );
      }
      
      return actions;
    };

    return (
      <div ref={actionMenuRef} className="bg-white rounded-lg border p-4 space-y-3">
        {/* Header with Order Number and Status */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{order.order_number}</h3>
            {order.priority !== 'normal' && (
              <div className="mt-1">{getPriorityBadge(order.priority)}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <MobileActionMenu 
              actions={getQuickActions()}
              onActionSelect={(action) => action.onClick()}
            />
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Product:</span>
            <span className="text-sm text-gray-900 text-right flex-1 ml-2">{order.product_name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Quantity:</span>
            <span className="text-sm text-gray-900">
              {order.actual_quantity ? `${order.actual_quantity}/${order.quantity}` : order.quantity}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Environment:</span>
            <span className="text-sm text-gray-900 capitalize">{order.environment}</span>
          </div>
          
          {order.machine_name && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Machine:</span>
              <span className="text-sm text-gray-900">{order.machine_name}</span>
            </div>
          )}
          
          {order.notes && (
            <div className="pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Notes:</span>
              <p className="text-sm text-gray-700 mt-1">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          {getQuickActions().map((action, index) => (
            <TouchButton
              key={index}
              onClick={action.onClick}
              variant={action.primary ? 'primary' : action.danger ? 'danger' : 'secondary'}
              size="sm"
              className="flex-1"
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">{action.label.split(' ')[0]}</span>
            </TouchButton>
          ))}
        </div>
        
        {/* Swipe hint for first-time users */}
        <div className="text-xs text-gray-400 text-center pt-1">
          ← Swipe for quick actions →
        </div>
      </div>
    );
  };

  // Statistics panel component - Mobile-optimized with responsive grid
  const StatisticsPanel = () => {
    const { isMobile, isTablet } = useDeviceDetection();
    const { shouldReduceAnimations } = usePerformanceOptimization();
    
    return (
      <div className={`grid gap-4 mb-6 ${
        isMobile ? 'grid-cols-2' : 
        isTablet ? 'grid-cols-2' : 
        'grid-cols-4'
      }`}>
        <Card className={`p-4 glass hover-lift ${!shouldReduceAnimations ? 'card-hover' : ''}`}>
          <div className="flex items-center gap-3">
            <Package className={`w-6 h-6 text-blue-600 ${!shouldReduceAnimations ? 'float' : ''}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 truncate">Total Orders</p>
              <p className={`font-bold text-gray-800 ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 glass hover-lift ${!shouldReduceAnimations ? 'card-hover' : ''}`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-6 h-6 text-orange-600 ${
              !shouldReduceAnimations ? 'float' : ''
            }`} style={!shouldReduceAnimations ? {animationDelay: '1s'} : {}} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 truncate">Pending</p>
              <p className={`font-bold text-orange-600 status-pending rounded px-2 ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 glass hover-lift ${!shouldReduceAnimations ? 'card-hover' : ''}`}>
          <div className="flex items-center gap-3">
            <Play className={`w-6 h-6 text-blue-600 ${
              !shouldReduceAnimations ? 'float' : ''
            }`} style={!shouldReduceAnimations ? {animationDelay: '2s'} : {}} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 truncate">In Progress</p>
              <p className={`font-bold text-blue-600 status-progress rounded px-2 ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>{stats.inProgress}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 glass hover-lift ${!shouldReduceAnimations ? 'card-hover' : ''}`}>
          <div className="flex items-center gap-3">
            <Square className={`w-6 h-6 text-red-600 ${
              !shouldReduceAnimations ? 'float' : ''
            }`} style={!shouldReduceAnimations ? {animationDelay: '3s'} : {}} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 truncate">Stopped</p>
              <p className={`font-bold text-red-600 status-stopped rounded px-2 ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>{stats.stopped}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-6 text-center min-h-screen gradient-animate flex items-center justify-center">
        <div className="glass p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-center gap-3 text-white">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-lg font-medium shimmer">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 min-h-screen gradient-animate ${
      isMobile ? 'p-4' : 'p-6'
    }`}>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl z-50 glass backdrop-blur-xl hover-lift transition-all duration-500 transform animate-pulse ${
          notification.type === 'success' ? 'border-l-4 border-green-400 text-green-800' :
          notification.type === 'danger' ? 'border-l-4 border-red-400 text-red-800' :
          notification.type === 'warning' ? 'border-l-4 border-yellow-400 text-yellow-800' :
          'border-l-4 border-blue-400 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {notification.type === 'danger' && <AlertTriangle className="w-5 h-5 text-red-600" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
            {notification.type !== 'success' && notification.type !== 'danger' && notification.type !== 'warning' && <Package className="w-5 h-5 text-blue-600" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header - Mobile Responsive */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-col md:flex-row'} justify-between items-start md:items-center gap-4`}>
        <div className={!shouldReduceAnimations ? 'float' : ''}>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className={`font-bold gradient-text mb-2 ${
              isMobile ? 'text-2xl' : 'text-3xl'
            }`}>Production Orders</h1>
            <WebSocketStatus />
          </div>
          <p className="text-white/80 text-sm mb-4 backdrop-blur-sm">
            {isMobile ? 'Manage orders and track progress' : 'Manage production orders and track progress with real-time updates'}
          </p>
          <TouchButton 
            onClick={() => setShowCreateModal(true)}
            className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg ${
              !shouldReduceAnimations ? 'hover-lift btn-micro' : ''
            }`}
            size={isMobile ? 'md' : 'md'}
          >
            <Plus className="w-4 h-4" />
            {isMobile ? 'Create' : 'Create Order'}
          </TouchButton>
          
          {/* Test Enhanced Workflow Button */}
          <TouchButton
            onClick={() => {
              // Find first pending order or use a default
              const pendingOrder = orders.find(o => o.status === 'pending');
              if (pendingOrder) {
                setSelectedOrder(pendingOrder);
                setShowEnhancedWorkflow(true);
              } else {
                showNotification('Create a pending order first to test the enhanced workflow', 'info');
              }
            }}
            variant="outline"
            className="glass border-purple-300 text-purple-700 hover:bg-purple-50"
            size={isMobile ? 'md' : 'md'}
          >
            <BarChart3 className="w-4 h-4" />
            {isMobile ? 'Enhanced' : 'Test Enhanced Workflow'}
          </TouchButton>
        </div>
        
        <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
          {/* Search */}
          <div className={`relative ${isMobile ? 'flex-1' : ''}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={isMobile ? 'Search...' : 'Search orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 glass border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                isMobile ? 'w-full min-h-[44px]' : 'w-64 focus:scale-105'
              }`}
            />
          </div>
          
          {isMobile && (
            <TouchButton 
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="md"
              className="glass border-white/20 text-gray-700 hover:bg-white/20"
            >
              <Filter className="w-4 h-4" />
            </TouchButton>
          )}
          
          <TouchButton 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size={isMobile ? 'md' : 'sm'}
            className={`glass border-white/20 text-gray-700 hover:bg-white/20 ${
              !shouldReduceAnimations ? 'hover-lift btn-micro' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </TouchButton>
        </div>
      </div>

      {/* Statistics Panel */}
      <StatisticsPanel />

      {/* Filters - Mobile Responsive */}
      <div className={`${
        isMobile && !showFilters ? 'hidden' : 'block'
      } glass p-4 rounded-lg shadow-lg ${!shouldReduceAnimations ? 'hover-lift' : ''}`}>
        <div className={`flex ${
          isMobile ? 'flex-col' : 'flex-col sm:flex-row'
        } justify-between items-start sm:items-center gap-4`}>
          <div className={`flex gap-3 ${
            isMobile ? 'flex-col w-full' : 'flex-col sm:flex-row'
          }`}>
            {/* Environment Filter */}
            {isMobile ? (
              <TouchDropdown
                value={selectedEnvironment}
                onChange={setSelectedEnvironment}
                options={[
                  { value: 'all', label: 'All Environments' },
                  ...environments.map(env => ({ value: env.code, label: env.name }))
                ]}
                placeholder="Select Environment"
                className="w-full"
              />
            ) : (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select 
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Environments</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.code}>{env.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Status Filter */}
            {isMobile ? (
              <TouchDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'stopped', label: 'Stopped' }
                ]}
                placeholder="Select Status"
                className="w-full"
              />
            ) : (
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option key="all" value="all">All Statuses</option>
                <option key="pending" value="pending">Pending</option>
                <option key="in_progress" value="in_progress">In Progress</option>
                <option key="completed" value="completed">Completed</option>
                <option key="stopped" value="stopped">Stopped</option>
              </select>
            )}
          </div>
          
          {/* Results Count */}
          <div className={`text-sm text-gray-600 ${
            isMobile ? 'text-center w-full pt-2 border-t border-gray-200' : ''
          }`}>
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      </div>

      {/* Orders Table - Mobile Responsive */}
      <Card className="glass hover-lift shadow-2xl">
        {loading ? (
          <div className="text-center py-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-gray-600 shimmer">Loading orders...</span>
            </div>
          </div>
        ) : (
          <ResponsiveTable 
            data={filteredOrders}
            columns={[
              { key: 'order_number', label: 'Order #' },
              { key: 'product_name', label: 'Product' },
              { key: 'quantity_display', label: 'Qty', render: (_, order) => 
                order.actual_quantity ? `${order.actual_quantity}/${order.quantity}` : order.quantity
              },
              { key: 'environment', label: 'Environment' },
              { key: 'status', label: 'Status', render: (status) => getStatusBadge(status) },
              { key: 'machine_name', label: 'Machine', render: (machine) => machine || '-' },
              { key: 'actions', label: 'Actions', render: (_, order) => renderOrderActions(order) }
            ]}
            renderMobileCard={(order) => (
              <MobileOrderCard 
                key={order.id}
                order={order}
                onStart={() => { setSelectedOrder(order); setShowStartModal(true); }}
                onStop={() => { setSelectedOrder(order); setShowStopModal(true); }}
                onResume={() => handleResumeProduction(order.id)}
                onComplete={() => { setSelectedOrder(order); setShowCompletionModal(true); }}
                onUpdateQuantity={() => {
                  setSelectedOrder(order);
                  setCurrentQuantity(order.actual_quantity || 0);
                  setShowQuantityModal(true);
                }}
                onDelete={() => handleDeleteOrder(order.id)}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
              />
            )}
            emptyMessage={
              <div className="text-center py-10">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No orders found</p>
                {!searchTerm && selectedEnvironment === 'all' && statusFilter === 'all' ? (
                  <TouchButton onClick={() => setShowCreateModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Order
                  </TouchButton>
                ) : (
                  <p className="text-sm text-gray-400">Try adjusting your filters or search term</p>
                )}
              </div>
            }
          />
        )}
      </Card>

      {/* Create Order Modal - Mobile Responsive */}
      {showCreateModal && (
        <Modal title="Create New Order" onClose={() => setShowCreateModal(false)} className="glass backdrop-blur-xl">
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. ORD-2024-001" 
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isMobile ? 'min-h-[44px]' : ''
                  }`}
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                {isMobile ? (
                  <TouchDropdown
                    value={formData.environment}
                    onChange={(value) => setFormData({...formData, environment: value})}
                    options={environments.map(env => ({ value: env.code, label: env.name }))}
                    placeholder="Select Environment"
                    className="w-full"
                  />
                ) : (
                  <select 
                    value={formData.environment}
                    onChange={(e) => setFormData({...formData, environment: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Environment</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.code}>{env.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input 
                type="text" 
                placeholder="Product name" 
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})} 
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'min-h-[44px]' : ''
                }`}
                required 
              />
            </div>
            
            <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input 
                  type="number" 
                  placeholder="1000" 
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isMobile ? 'min-h-[44px]' : ''
                  }`}
                  required 
                  min="1" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                {isMobile ? (
                  <TouchDropdown
                    value={formData.priority}
                    onChange={(value) => setFormData({...formData, priority: value})}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' }
                    ]}
                    className="w-full"
                  />
                ) : (
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Optional)</label>
              <input 
                type="date" 
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'min-h-[44px]' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea 
                placeholder="Additional notes or instructions" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                rows={isMobile ? "2" : "3"}
              />
            </div>
            
            <div className={`flex gap-3 pt-4 ${
              isMobile ? 'flex-col-reverse' : 'justify-end'
            }`}>
              <TouchButton 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                variant="outline"
                size={isMobile ? 'md' : 'md'}
                className={isMobile ? 'w-full' : ''}
              >
                Cancel
              </TouchButton>
              <TouchButton 
                type="submit" 
                variant="primary"
                size={isMobile ? 'md' : 'md'}
                className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 ${
                  isMobile ? 'w-full' : ''
                } ${!shouldReduceAnimations ? 'hover-lift btn-micro' : ''}`}
              >
                <Plus className="w-4 h-4" />
                {isMobile ? 'Create Order' : 'Create Order'}
              </TouchButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Start Production Modal */}
      {showStartModal && selectedOrder && (
        <Modal title="Start Production" onClose={() => setShowStartModal(false)}>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Order Details</h3>
              <p className="text-sm text-blue-700 mt-1">
                <span className="font-medium">{selectedOrder.order_number}</span> - {selectedOrder.product_name}
              </p>
              <p className="text-sm text-blue-600">Quantity: {selectedOrder.quantity} | Environment: {selectedOrder.environment}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Machine</label>
              <select 
                value={selectedMachine} 
                onChange={(e) => setSelectedMachine(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required
              >
                <option value="">Choose an available machine...</option>
                {machines
                  .filter(m => m.environment === selectedOrder.environment && m.status === 'available')
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type}) - Capacity: {m.capacity}
                    </option>
                  ))
                }
              </select>
              {machines.filter(m => m.environment === selectedOrder.environment && m.status === 'available').length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  No available machines in {selectedOrder.environment} environment
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={() => setShowStartModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleStartProduction} 
                disabled={!selectedMachine}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0 hover-lift btn-micro"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Production
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stop Production Modal */}
      {showStopModal && selectedOrder && (
        <Modal title="Stop Production" onClose={() => setShowStopModal(false)}>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-900">Order Details</h3>
              <p className="text-sm text-red-700 mt-1">
                <span className="font-medium">{selectedOrder.order_number}</span> - {selectedOrder.product_name}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Stopping</label>
              <select 
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                required
              >
                <option value="">Select stop reason...</option>
                <option value="machine_breakdown">Machine Breakdown</option>
                <option value="material_shortage">Material Shortage</option>
                <option value="quality_issue">Quality Issue</option>
                <option value="operator_break">Operator Break</option>
                <option value="shift_change">Shift Change</option>
                <option value="maintenance">Scheduled Maintenance</option>
                <option value="safety_incident">Safety Incident</option>
                <option value="power_outage">Power Outage</option>
                <option value="other">Other</option>
              </select>
              
              {stopReason && (
                <textarea 
                  placeholder="Additional details about the stop reason..." 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  rows="3"
                />
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={() => setShowStopModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleStopProduction}
                disabled={!stopReason.trim()}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white border-0 hover-lift btn-micro"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Production
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Completion Modal */}
      {showCompletionModal && selectedOrder && (
        <ProductionCompletionModalWithWaste
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          order={selectedOrder}
          onComplete={() => {
            setShowCompletionModal(false);
            loadData();
            showNotification('Order completed successfully');
          }}
        />
      )}

      {/* Update Quantity Modal */}
      {showQuantityModal && selectedOrder && (
        <Modal title="Update Production Quantity" onClose={() => setShowQuantityModal(false)}>
          <form onSubmit={handleQuantityUpdate} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Order Details</h3>
              <p className="text-sm text-blue-700 mt-1">
                <span className="font-medium">{selectedOrder.order_number}</span> - {selectedOrder.product_name}
              </p>
              <div className="flex justify-between mt-2 text-sm">
                <span>Target Quantity: <span className="font-medium">{selectedOrder.quantity}</span></span>
                <span>Current: <span className="font-medium">{selectedOrder.actual_quantity || 0}</span></span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Produced Quantity
              </label>
              <input
                type="number"
                min="0"
                max={selectedOrder.quantity}
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current produced quantity"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the total quantity produced so far (0 to {selectedOrder.quantity})
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <Target className="w-4 h-4" />
                <span className="font-medium">Real-time Tracking:</span>
                <span>Updates are automatically tracked by shift and recorded with timestamp</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                onClick={() => setShowQuantityModal(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={loading || currentQuantity < 0 || currentQuantity > selectedOrder.quantity}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 hover-lift btn-micro"
              >
                <Target className="w-4 h-4 mr-2" />
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : 'Update Quantity'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enhanced Production Workflow Modal */}
      {showEnhancedWorkflow && selectedOrder && (
        <EnhancedProductionWorkflow
          orderId={selectedOrder.id}
          onClose={() => {
            setShowEnhancedWorkflow(false);
            setSelectedOrder(null);
            loadData(); // Refresh orders when workflow completes
          }}
        />
      )}
    </div>
  );
}
