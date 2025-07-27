import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Search, Filter, RefreshCw, Edit3, Trash2, AlertTriangle, Activity, Clock, BarChart3, CheckCircle, XCircle, Wrench } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';

export default function MachinesPage() {
  // State for storing the list of machines and UI status
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  
  // State for managing modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // State for the machine being edited and the form data
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    environment: 'blending',
    capacity: 100,
    production_rate: 60
  });

  // Constants for machine types
  const MACHINE_TYPES = {
    blending: ['Bulk Line', 'Canning line', 'Corraza cubes', 'Corazza tablet', 'Enflex fb 10 1;2'],
    packaging: ['Nps 5 Lane', 'Nps Auger', 'Universal 1', 'Universal 2', 'Universal 3'],
    beverage: ['Filling Machine', 'Carbonation Unit', 'Pasteurizer', 'Homogenizer', 'Bottling Line']
  };

  const STATUS_COLORS = {
    available: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: CheckCircle },
    in_use: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Activity },
    maintenance: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', icon: Wrench },
    offline: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: XCircle }
  };

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to fetch machines from the backend API
  const loadMachines = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await API.get('/machines');
      setMachines(data);
    } catch (error) {
      console.error('Failed to load machines:', error);
      showNotification('Failed to load machines', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMachines(true);
  };

  // useEffect runs when the component loads.
  useEffect(() => {
    loadMachines(); // Fetch data immediately
    const interval = setInterval(loadMachines, 30000); // And refresh every 30 seconds
    return () => clearInterval(interval); // Clean up the interval when the component is unmounted
  }, []);

  // Handler for submitting the "Add Machine" form
  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      await API.post('/machines', formData);
      setShowAddModal(false);
      loadMachines();
      showNotification('Machine added successfully');
    } catch (error) {
      showNotification('Failed to add machine: ' + (error.message || 'Unknown error'), 'danger');
    }
  };

  // Handler for submitting the "Edit Machine" form
  const handleEditMachine = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/machines/${selectedMachine.id}`, formData);
      setShowEditModal(false);
      loadMachines();
      showNotification('Machine updated successfully');
    } catch (error) {
      showNotification('Failed to update machine: ' + (error.message || 'Unknown error'), 'danger');
    }
  };

  // Handler for the delete button
  const handleDeleteMachine = async (machineId) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      try {
        await API.delete(`/machines/${machineId}`);
        loadMachines();
        showNotification('Machine deleted successfully');
      } catch (error) {
        showNotification('Failed to delete machine: ' + (error.message || 'Unknown error'), 'danger');
      }
    }
  };

  // Handler for changing machine status
  const handleStatusChange = async (status) => {
    try {
      await API.patch(`/machines/${selectedMachine.id}/status`, { status });
      setShowStatusModal(false);
      loadMachines();
      showNotification(`Machine status changed to ${status}`);
    } catch (error) {
      showNotification('Failed to update status: ' + (error.message || 'Unknown error'), 'danger');
    }
  };

  // Filter and search machines
  const filteredMachines = useMemo(() => {
    let filtered = machines;
    
    if (selectedEnvironment !== 'all') {
      filtered = filtered.filter(machine => machine.environment === selectedEnvironment);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(machine => machine.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(machine => 
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [machines, selectedEnvironment, statusFilter, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = machines.length;
    const available = machines.filter(m => m.status === 'available').length;
    const inUse = machines.filter(m => m.status === 'in_use').length;
    const maintenance = machines.filter(m => m.status === 'maintenance').length;
    const offline = machines.filter(m => m.status === 'offline').length;
    const utilizationRate = total > 0 ? Math.round((inUse / total) * 100) : 0;
    
    return { total, available, inUse, maintenance, offline, utilizationRate };
  }, [machines]);

  // Helper function to render a modern status badge
  const getStatusBadge = (status) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.offline;
    const Icon = config.icon;
    
    return (
      <Badge variant={status === 'available' ? 'success' : status === 'in_use' ? 'info' : status === 'maintenance' ? 'warning' : 'danger'}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Statistics panel component
  const StatisticsPanel = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">In Use</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inUse}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm text-gray-500">Maintenance</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm text-gray-500">Offline</p>
            <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm text-gray-500">Utilization</p>
            <p className="text-2xl font-bold text-purple-600">{stats.utilizationRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  );

  if (loading && machines.length === 0) {
    return <div className="p-6 text-center">Loading machines...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Machine Management</h1>
        <button onClick={() => {
          setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
          setShowAddModal(true);
        }} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Add New Machine
        </button>
      </div>

      <div className="mb-4 flex space-x-2">
        {['all', 'blending', 'packaging', 'beverage'].map(env => (
          <button key={env} onClick={() => setSelectedEnvironment(env)} className={`px-4 py-2 rounded ${selectedEnvironment === env ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            {env.charAt(0).toUpperCase() + env.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map(machine => (
          <div key={machine.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{machine.name}</h3>
                <p className="text-sm text-gray-500">{machine.type}</p>
              </div>
              {getStatusBadge(machine.status)}
            </div>
            <div className="flex space-x-2 mt-4">
              <button onClick={() => {
                setSelectedMachine(machine);
                setFormData(machine);
                setShowEditModal(true);
              }} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Edit</button>
              {machine.status !== 'in_use' && (
                <button onClick={() => handleDeleteMachine(machine.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <Modal title="Add New Machine" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddMachine} className="space-y-4">
            <input type="text" placeholder="Machine Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <select value={formData.environment} onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} className="w-full px-3 py-2 border rounded">
              <option value="blending">Blending</option>
              <option value="packaging">Packaging</option>
              <option value="beverage">Beverage</option>
            </select>
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded" required>
              <option value="">Select Type...</option>
              {(MACHINE_TYPES[formData.environment] || []).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded" required />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Machine</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && selectedMachine && (
        <Modal title="Edit Machine" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditMachine} className="space-y-4">
            <input type="text" placeholder="Machine Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <select value={formData.environment} className="w-full px-3 py-2 border rounded bg-gray-100" disabled>
              <option value="blending">Blending</option>
              <option value="packaging">Packaging</option>
              <option value="beverage">Beverage</option>
            </select>
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded" required>
              {(MACHINE_TYPES[formData.environment] || []).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
             <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded" required />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update Machine</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
