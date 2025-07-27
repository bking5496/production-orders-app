import React, { useState, useEffect } from 'react';
import API from '../core/api';
import { Modal } from './ui-components.jsx';
import ProductionCompletionModalWithWaste from './production-completion-modal-with-waste.jsx';
import { Icon } from './layout-components.jsx';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState('');

  const [formData, setFormData] = useState({
    order_number: '', product_name: '', quantity: '', environment: 'blending',
    priority: 'normal', due_date: '', notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, machinesData] = await Promise.all([
        API.get('/orders'),
        API.get('/machines')
      ]);
      setOrders(ordersData);
      setMachines(machinesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
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
      loadData();
    } catch (error) {
      alert('Failed to create order: ' + error.message);
    }
  };

  const handleStartProduction = async () => {
    if (!selectedMachine) return alert('Please select a machine');
    try {
      await API.post(`/orders/${selectedOrder.id}/start`, { machine_id: selectedMachine });
      setShowStartModal(false);
      loadData();
    } catch (error) {
      alert('Failed to start production: ' + error.message);
    }
  };

  const handlePauseProduction = async (orderId) => {
    const reason = prompt("Enter reason for pausing:");
    if (reason) {
        try {
            await API.post(`/orders/${orderId}/pause`, { reason });
            loadData();
        } catch (error) {
            alert('Failed to pause production: ' + error.message);
        }
    }
  };

  const handleResumeProduction = async (orderId) => {
    try {
        await API.post(`/orders/${orderId}/resume`);
        loadData();
    } catch (error) {
        alert('Failed to resume production: ' + error.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await API.delete(`/orders/${orderId}`);
        loadData();
      } catch (error) {
        alert('Failed to delete order: ' + error.message);
      }
    }
  };

  const filteredOrders = selectedEnvironment === 'all'
    ? orders
    : orders.filter(order => order.environment === selectedEnvironment);

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-gray-100 text-gray-800', in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800', paused: 'bg-yellow-100 text-yellow-800',
      stopped: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || ''}`}>{status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Production Orders</h1>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Icon icon="plus" size={16} className="mr-2" />
            Create New Order
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-4 flex space-x-2 border-b border-gray-200 pb-4">
            {['all', 'blending', 'packaging'].map(env => (
              <button key={env} onClick={() => setSelectedEnvironment(env)} className={`px-4 py-2 rounded-md text-sm font-medium ${selectedEnvironment === env ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </button>
            ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order #', 'Product', 'Quantity', 'Environment', 'Status', 'Machine', 'Actions'].map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-500">Loading orders...</td></tr>
              ) : filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{order.environment}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.machine_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {order.status === 'pending' && <button onClick={() => { setSelectedOrder(order); setShowStartModal(true); }} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Start</button>}
                    {order.status === 'in_progress' && (
                      <>
                        <button onClick={() => handlePauseProduction(order.id)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">Pause</button>
                        <button onClick={() => { setSelectedOrder(order); setShowCompletionModal(true); }} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">Complete</button>
                      </>
                    )}
                    {order.status === 'paused' && <button onClick={() => handleResumeProduction(order.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Resume</button>}
                    {order.status === 'pending' && <button onClick={() => handleDeleteOrder(order.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <Modal title="Create New Order" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <input type="text" placeholder="Order Number" onChange={(e) => setFormData({...formData, order_number: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <input type="text" placeholder="Product Name" onChange={(e) => setFormData({...formData, product_name: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <input type="number" placeholder="Quantity" onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-2 border rounded" required min="1" />
            <div className="flex justify-end space-x-2 pt-4 border-t"><button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Order</button></div>
          </form>
        </Modal>
      )}

      {showStartModal && selectedOrder && (
        <Modal title="Start Production" onClose={() => setShowStartModal(false)}>
            <p className="text-sm text-gray-600 mb-4">Order: <span className="font-medium">{selectedOrder.order_number}</span> - {selectedOrder.product_name}</p>
            <select value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)} className="w-full px-3 py-2 border rounded" required>
                <option value="">Choose an available machine...</option>
                {machines.filter(m => m.environment === selectedOrder.environment && m.status === 'available').map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
            </select>
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t"><button type="button" onClick={() => setShowStartModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button><button onClick={handleStartProduction} disabled={!selectedMachine} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Start Production</button></div>
        </Modal>
      )}

      {showCompletionModal && selectedOrder && (
          <ProductionCompletionModalWithWaste
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            order={selectedOrder}
            onComplete={() => {
                setShowCompletionModal(false);
                loadData();
            }}
          />
      )}
    </div>
  );
}
