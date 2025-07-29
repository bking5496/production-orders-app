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

  // Statistics panel component
  const StatisticsPanel = () => (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Square className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm text-gray-500">Stopped</p>
            <p className="text-2xl font-bold text-red-600">{stats.stopped}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm text-gray-500">Total Qty</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalQuantity.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm text-gray-500">Completion</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.completionRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  );

  if (loading && orders.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading orders...
        </div>
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
          <h1 className="text-3xl font-bold text-gray-800">Production Orders</h1>
          <p className="text-gray-600 mt-1">Manage production orders and track progress</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Statistics Panel */}
      <StatisticsPanel />

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
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
          
          {/* Environment Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select 
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Environments</option>
              {environments.map(env => (
                <option key={env.id} value={env.code}>{env.name}</option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
          
          {/* Results Count */}
          <div className="flex items-center justify-center md:justify-start">
            <span className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order #', 'Product', 'Quantity', 'Environment', 'Priority', 'Status', 'Machine', 'Due Date', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-10 text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading orders...
                </td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-10">
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
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                    {order.notes && <div className="text-xs text-gray-500 truncate max-w-32">{order.notes}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.actual_quantity ? `${order.actual_quantity}/${order.quantity}` : order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{order.environment}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(order.priority)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.machine_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {order.status === 'pending' && (
                      <>
                        <Button 
                          onClick={() => { setSelectedOrder(order); setShowStartModal(true); }} 
                          size="sm"
                          variant="outline"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                        <Button 
                          onClick={() => handleDeleteOrder(order.id)} 
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Target className="w-4 h-4 mr-1" />
                          Update Qty
                        </Button>
                        <Button 
                          onClick={() => { setSelectedOrder(order); setShowStopModal(true); }} 
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                        <Button 
                          onClick={() => { setSelectedOrder(order); setShowCompletionModal(true); }} 
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    {order.status === 'stopped' && (
                      <Button 
                        onClick={() => handleResumeProduction(order.id)} 
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Order Modal */}
      {showCreateModal && (
        <Modal title="Create New Order" onClose={() => setShowCreateModal(false)}>
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
              <Button type="submit">
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
                variant="danger"
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
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Target className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Quantity'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
