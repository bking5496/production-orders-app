import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Filter, RefreshCw, Play, Square, Trash2, Clock, AlertTriangle, CheckCircle, BarChart3, Calendar, Target } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import ProductionCompletionModalWithWaste from './production-completion-modal-with-waste.jsx';

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

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  
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

  // Statistics panel component - Simplified to 4 key metrics
  const StatisticsPanel = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4 glass hover-lift card-hover">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600 float" />
          <div>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 glass hover-lift card-hover">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-600 float" style={{animationDelay: '1s'}} />
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-orange-600 status-pending rounded px-2">{stats.pending}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 glass hover-lift card-hover">
        <div className="flex items-center gap-3">
          <Play className="w-6 h-6 text-blue-600 float" style={{animationDelay: '2s'}} />
          <div>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 status-progress rounded px-2">{stats.inProgress}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 glass hover-lift card-hover">
        <div className="flex items-center gap-3">
          <Square className="w-6 h-6 text-red-600 float" style={{animationDelay: '3s'}} />
          <div>
            <p className="text-sm text-gray-600">Stopped</p>
            <p className="text-2xl font-bold text-red-600 status-stopped rounded px-2">{stats.stopped}</p>
          </div>
        </div>
      </Card>
    </div>
  );

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
    <div className="p-6 space-y-6 min-h-screen gradient-animate">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="float">
          <h1 className="text-3xl font-bold gradient-text mb-2">Production Orders</h1>
          <p className="text-white/80 text-sm mb-4 backdrop-blur-sm">Manage production orders and track progress</p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="hover-lift btn-micro bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 glass border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 focus:scale-105"
            />
          </div>
          
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="hover-lift btn-micro glass border-white/20 text-gray-700 hover:bg-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statistics Panel */}
      <StatisticsPanel />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass p-4 rounded-lg shadow-lg hover-lift">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Environment Filter */}
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
          
          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
        
        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Orders Table */}
      <Card className="glass hover-lift shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order #', 'Product', 'Qty', 'Environment', 'Status', 'Machine', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-gray-600 shimmer">Loading orders...</span>
                  </div>
                </td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No orders found</p>
                  {!searchTerm && selectedEnvironment === 'all' && statusFilter === 'all' ? (
                    <Button onClick={() => setShowCreateModal(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Order
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-400">Try adjusting your filters or search term</p>
                  )}
                </td></tr>
              ) : filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-white/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                    {order.priority !== 'normal' && (
                      <div className="text-xs text-gray-500">{getPriorityBadge(order.priority)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.product_name}</div>
                    {order.notes && <div className="text-xs text-gray-500 truncate max-w-32">{order.notes}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {order.actual_quantity ? `${order.actual_quantity}/${order.quantity}` : order.quantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">{order.environment}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{order.machine_name || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <Modal title="Create New Order" onClose={() => setShowCreateModal(false)} className="glass backdrop-blur-xl">
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. ORD-2024-001" 
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
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
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input 
                type="text" 
                placeholder="Product name" 
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input 
                  type="number" 
                  placeholder="1000" 
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required 
                  min="1" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
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
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Optional)</label>
              <input 
                type="date" 
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea 
                placeholder="Additional notes or instructions" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={() => setShowCreateModal(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 hover-lift btn-micro">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
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
    </div>
  );
}
