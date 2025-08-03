// Unified Orders Management System
// Single, comprehensive production workflow with enhanced features and downtime tracking

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Filter, RefreshCw, Play, Square, CheckCircle, BarChart3, Target, Wifi, Menu, Clock, AlertTriangle } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import EnhancedProductionWorkflow from './enhanced-production-workflow.jsx';
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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archive'
  const [notification, setNotification] = useState(null);
  
  // Mobile-specific state
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  const [showFilters, setShowFilters] = useState(false);

  // WebSocket integration
  useAutoConnect();
  const { notifications: wsNotifications, clearNotification } = useNotifications();
  const { lastUpdate } = useOrderUpdates();

  // Unified workflow state - only one workflow system
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form data for order creation
  const [formData, setFormData] = useState({
    order_number: '',
    product_name: '',
    quantity: '',
    priority: 'normal',
    environment: '',
    due_date: '',
    specifications: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadOrders();
    loadMachines();
    loadEnvironments();
  }, []);

  // Refresh data when WebSocket updates arrive
  useEffect(() => {
    if (lastUpdate) {
      loadOrders();
    }
  }, [lastUpdate]);

  // WebSocket notifications
  useWebSocketEvent('order_started', (data) => {
    console.log('🟢 Order started:', data.data);
    showNotification(`Order ${data.data.order?.order_number} started`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('order_completed', (data) => {
    console.log('✅ Order completed:', data.data);
    showNotification(`Order ${data.data.order?.order_number} completed`, 'success');
    loadOrders();
  }, []);

  useWebSocketEvent('order_stopped', (data) => {
    console.log('🔴 Order stopped:', data.data);
    showNotification(`Order ${data.data.order?.order_number} stopped: ${data.data.reason}`, 'warning');
    loadOrders();
  }, []);

  useWebSocketEvent('downtime_started', (data) => {
    console.log('⚠️ Downtime reported:', data.data);
    showNotification(`Downtime reported on Machine ${data.data.machine_id}: ${data.data.primary_cause}`, 'error');
  }, []);

  const loadOrders = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await API.get('/orders');
      setOrders(response || []);
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
      setMachines(response || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const loadEnvironments = async () => {
    try {
      const response = await API.get('/environments');
      setEnvironments(response || []);
    } catch (error) {
      console.error('Error loading environments:', error);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await API.post('/orders', formData);
      setShowCreateModal(false);
      setFormData({
        order_number: '',
        product_name: '',
        quantity: '',
        priority: 'normal',
        environment: '',
        due_date: '',
        specifications: ''
      });
      showNotification('Order created successfully', 'success');
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      showNotification('Failed to create order', 'error');
    }
  };

  // Quick action handlers for simple operations
  const handleQuickStart = async (order) => {
    try {
      await API.post(`/orders/${order.id}/start`);
      showNotification(`Order ${order.order_number} started`, 'success');
      loadOrders();
    } catch (error) {
      console.error('Error starting order:', error);
      showNotification('Failed to start order. Use Enhanced Workflow for complex operations.', 'warning');
    }
  };

  const handleQuickStop = async (order) => {
    try {
      await API.post(`/orders/${order.id}/stop`, { 
        reason: 'Quick stop from orders page',
        notes: 'Stopped via quick action'
      });
      showNotification(`Order ${order.order_number} stopped`, 'success');
      loadOrders();
    } catch (error) {
      console.error('Error stopping order:', error);
      showNotification('Failed to stop order', 'error');
    }
  };

  const handleQuickComplete = async (order) => {
    try {
      await API.post(`/orders/${order.id}/complete`, { 
        actual_quantity: order.quantity,
        quality_approved: true,
        completion_notes: 'Completed via quick action'
      });
      showNotification(`Order ${order.order_number} completed`, 'success');
      loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      showNotification('Failed to complete order. Use Enhanced Workflow for complex completion.', 'warning');
    }
  };

  // Open Enhanced Workflow for comprehensive operations
  const openEnhancedWorkflow = (order) => {
    setSelectedOrder(order);
    setShowWorkflow(true);
  };

  // Filter orders based on search, filters, and archive mode
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEnvironment = selectedEnvironment === 'all' || order.environment === selectedEnvironment;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // Archive filtering
      const isArchived = order.status === 'completed' || order.status === 'cancelled';
      const matchesViewMode = viewMode === 'archive' ? isArchived : !isArchived;
      
      return matchesSearch && matchesEnvironment && matchesStatus && matchesViewMode;
    });
  }, [orders, searchTerm, selectedEnvironment, statusFilter, viewMode]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'stopped': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-400 text-white border-gray-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'stopped': return <Square className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 md:w-8 h-8" />
            Production Orders
          </h1>
          <p className="text-gray-600 mt-1">Unified production workflow system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <WebSocketStatus />
          <TouchButton
            onClick={handleRefresh}
            disabled={refreshing}
            size={isMobile ? "sm" : "md"}
            variant="outline"
            icon={RefreshCw}
            className={refreshing ? 'animate-spin' : ''}
          >
            {isMobile ? '' : 'Refresh'}
          </TouchButton>
          <TouchButton
            onClick={() => setShowCreateModal(true)}
            size={isMobile ? "sm" : "md"}
            icon={Plus}
          >
            {isMobile ? '' : 'New Order'}
          </TouchButton>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* WebSocket Notifications */}
      {wsNotifications.map((notif, index) => (
        <div key={index} className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 flex justify-between items-center">
          <span>{notif.message}</span>
          <button onClick={() => clearNotification(notif.id)} className="text-blue-600 hover:text-blue-800">
            ×
          </button>
        </div>
      ))}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setViewMode('archive')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'archive'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Archive
            </button>
          </div>
          
          <div className="flex gap-3">
            <select 
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="all" value="all">All Environments</option>
              {environments.map(env => (
                <option key={env.id} value={env.code}>{env.name}</option>
              ))}
            </select>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="all" value="all">All Statuses</option>
              <option key="pending" value="pending">Pending</option>
              <option key="in_progress" value="in_progress">In Progress</option>
              <option key="completed" value="completed">Completed</option>
              <option key="stopped" value="stopped">Stopped</option>
              <option key="cancelled" value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table/Cards */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">
            {viewMode === 'archive' ? 'Archived Orders' : 'Active Orders'} ({filteredOrders.length})
          </h3>
        </div>
        
        {isMobile ? (
          // Mobile Card Layout
          <div className="p-4 space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{order.order_number}</h4>
                    <p className="text-sm text-gray-600">{order.product_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status}</span>
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
                    <span className="ml-1 font-medium">{order.environment}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                  
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <TouchButton 
                        onClick={() => handleQuickStart(order)} 
                        size="xs" 
                        icon={Play}
                      >
                        Start
                      </TouchButton>
                    )}
                    {order.status === 'in_progress' && (
                      <TouchButton 
                        onClick={() => handleQuickStop(order)} 
                        size="xs" 
                        variant="outline"
                        icon={Square}
                      >
                        Stop
                      </TouchButton>
                    )}
                    <TouchButton 
                      onClick={() => openEnhancedWorkflow(order)} 
                      size="xs" 
                      variant="secondary"
                      icon={BarChart3}
                    >
                      Workflow
                    </TouchButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop Table Layout
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{order.order_number}</div>
                      <div className="text-sm text-gray-500">ID: {order.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{order.product_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{order.quantity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{order.environment}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <Button 
                            onClick={() => handleQuickStart(order)} 
                            size="sm" 
                            variant="outline"
                          >
                            Quick Start
                          </Button>
                        )}
                        {order.status === 'in_progress' && (
                          <>
                            <Button 
                              onClick={() => handleQuickStop(order)} 
                              size="sm" 
                              variant="outline"
                            >
                              Quick Stop
                            </Button>
                            <Button 
                              onClick={() => handleQuickComplete(order)} 
                              size="sm" 
                              variant="outline"
                            >
                              Quick Complete
                            </Button>
                          </>
                        )}
                        <Button 
                          onClick={() => openEnhancedWorkflow(order)} 
                          size="sm"
                        >
                          Enhanced Workflow
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No orders found</p>
            <p className="text-sm">Try adjusting your filters or create a new order</p>
          </div>
        )}
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <Modal title="Create New Order" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option key="low" value="low">Low</option>
                  <option key="normal" value="normal">Normal</option>
                  <option key="high" value="high">High</option>
                  <option key="urgent" value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({...formData, environment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option key="select" value="">Select Environment</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.code}>{env.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Additional specifications or notes..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Create Order
              </Button>
              <Button type="button" onClick={() => setShowCreateModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enhanced Production Workflow */}
      {showWorkflow && selectedOrder && (
        <EnhancedProductionWorkflow
          orderId={selectedOrder.id}
          onClose={() => {
            setShowWorkflow(false);
            setSelectedOrder(null);
            loadOrders(); // Refresh orders after workflow completion
          }}
        />
      )}
    </div>
  );
}