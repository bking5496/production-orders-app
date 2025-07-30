import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Search, Filter, RefreshCw, Edit3, Trash2, AlertTriangle, Activity, Clock, BarChart3, CheckCircle, XCircle, Wrench, Users, Calendar, RotateCcw, Info } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';

export default function MachinesPage() {
  // State for storing the list of machines and UI status
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
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
    environment: '',
    capacity: 100,
    production_rate: 60,
    shift_cycle_enabled: false,
    cycle_start_date: '',
    crew_size: 1
  });
  
  // Shift cycle specific state
  const [crews, setCrews] = useState([
    { letter: 'A', offset: 0, employees: [] },
    { letter: 'B', offset: 2, employees: [] },
    { letter: 'C', offset: 4, employees: [] }
  ]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Update form environment when environments are loaded
  useEffect(() => {
    if (environments.length > 0 && !formData.environment) {
      setFormData(prev => ({ ...prev, environment: environments[0].code }));
    }
  }, [environments, formData.environment]);

  // Machine types will be loaded from environments
  const MACHINE_TYPES = useMemo(() => {
    const types = {};
    environments.forEach(env => {
      if (env.machine_types) {
        try {
          types[env.code] = typeof env.machine_types === 'string' 
            ? JSON.parse(env.machine_types) 
            : env.machine_types;
        } catch (e) {
          console.error('Failed to parse machine types for environment:', env.name, e);
          types[env.code] = [];
        }
      } else {
        types[env.code] = [];
      }
    });
    return types;
  }, [environments]);

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

  // Function to fetch environments from the backend API
  const loadEnvironments = async () => {
    try {
      const data = await API.get('/environments');
      setEnvironments(data);
    } catch (error) {
      console.error('Failed to load environments:', error);
      showNotification('Failed to load environments', 'danger');
    }
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
  
  // Function to load employees for crew assignments
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await API.get('/users');
      // Transform users to match expected employee format
      const employees = data.map(user => ({
        id: user.id,
        name: user.username,
        employee_code: user.employee_code || `EMP${user.id.toString().padStart(3, '0')}`,
        role: user.role,
        is_active: user.is_active
      })).filter(emp => emp.is_active !== false); // Only active employees
      setEmployees(employees);
    } catch (error) {
      console.error('Failed to load employees:', error);
      console.error('Error details:', error.message, error.response);
      
      // Provide fallback empty list so the interface still works
      setEmployees([]);
      
      // Show helpful error message
      if (error.message.includes('unauthorized') || error.message.includes('Session expired')) {
        showNotification('Please log in to manage crew assignments', 'danger');
      } else {
        showNotification(`Failed to load employees: ${error.message}. You can still configure shift cycles without employee assignments.`, 'danger');
      }
    } finally {
      setLoadingEmployees(false);
    }
  };
  
  // Function to load crew data for a machine
  const loadCrewsForMachine = async (machineId) => {
    try {
      const data = await API.get(`/machines/${machineId}/crews`);
      if (data.length > 0) {
        setCrews(data);
      } else {
        // Reset to default crews if none exist
        setCrews([
          { letter: 'A', offset: 0, employees: [] },
          { letter: 'B', offset: 2, employees: [] },
          { letter: 'C', offset: 4, employees: [] }
        ]);
      }
    } catch (error) {
      console.error('Failed to load crews:', error);
      // Keep default crews on error
    }
  };

  const handleRefresh = () => {
    loadMachines(true);
  };
  
  // 2-2-2 Shift Cycle Calculation Functions
  const calculateCrewAssignment = (startDate, currentDate, offset) => {
    if (!startDate) return 'rest';
    
    const start = new Date(startDate);
    const current = new Date(currentDate);
    const daysSinceStart = Math.floor((current - start) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysSinceStart + offset) % 6;
    
    if (cycleDay === 0 || cycleDay === 1) return 'day';
    if (cycleDay === 2 || cycleDay === 3) return 'night';
    return 'rest';
  };
  
  const getShiftAssignments = (startDate, date) => {
    if (!startDate) return { dayShift: [], nightShift: [], resting: ['A', 'B', 'C'] };
    
    const assignments = crews.reduce((acc, crew) => {
      const assignment = calculateCrewAssignment(startDate, date, crew.offset);
      acc[assignment].push(crew.letter);
      return acc;
    }, { day: [], night: [], rest: [] });
    
    return {
      dayShift: assignments.day,
      nightShift: assignments.night,
      resting: assignments.rest
    };
  };
  
  const generatePreviewDays = (startDate, days = 14) => {
    if (!startDate) return [];
    
    const preview = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const assignments = getShiftAssignments(startDate, date);
      preview.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...assignments
      });
    }
    return preview;
  };
  
  // Handle crew employee assignments
  const handleCrewEmployeeChange = (crewLetter, employeeIds) => {
    setCrews(prev => prev.map(crew => 
      crew.letter === crewLetter 
        ? { ...crew, employees: employeeIds }
        : crew
    ));
  };
  
  // Save crew assignments
  const saveCrewAssignments = async (machineId) => {
    try {
      await API.post(`/machines/${machineId}/crews`, crews);
      showNotification('Crew assignments saved successfully');
    } catch (error) {
      console.error('Failed to save crew assignments:', error);
      showNotification('Failed to save crew assignments: ' + (error.message || 'Unknown error'), 'danger');
    }
  };

  // useEffect runs when the component loads.
  useEffect(() => {
    loadEnvironments(); // Load environments first
    loadMachines(); // Fetch data immediately
    loadEmployees(); // Load employees for crew assignments
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
      // Update machine settings
      await API.put(`/machines/${selectedMachine.id}`, formData);
      
      // If shift cycle is enabled, save crew assignments
      if (formData.shift_cycle_enabled) {
        await saveCrewAssignments(selectedMachine.id);
      }
      
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
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading machines...
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
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Machine Management</h1>
          <p className="text-gray-600 mt-1">Manage manufacturing equipment and monitor status</p>
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
          
          <Button onClick={() => {
            setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
            setShowAddModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
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
              placeholder="Search machines..."
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
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          
          {/* Results Count */}
          <div className="flex items-center justify-center md:justify-start">
            <span className="text-sm text-gray-600">
              Showing {filteredMachines.length} of {machines.length} machines
            </span>
          </div>
        </div>
      </Card>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMachines.map(machine => {
          const statusConfig = STATUS_COLORS[machine.status] || STATUS_COLORS.offline;
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card key={machine.id} className={`p-6 border-l-4 ${statusConfig.border} hover:shadow-lg transition-all duration-300`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{machine.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{machine.type}</p>
                  <p className="text-xs text-gray-400 capitalize">{machine.environment} Environment</p>
                </div>
                {getStatusBadge(machine.status)}
              </div>
              
              {/* Machine Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="font-medium">{machine.capacity}</span>
                </div>
                {machine.production_rate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rate:</span>
                    <span className="font-medium">{machine.production_rate}/hr</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => {
                    setSelectedMachine(machine);
                    setShowStatusModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <StatusIcon className="w-4 h-4 mr-1" />
                  Status
                </Button>
                
                <Button 
                  onClick={async () => {
                    setSelectedMachine(machine);
                    setFormData({
                      ...machine,
                      shift_cycle_enabled: machine.shift_cycle_enabled || false,
                      cycle_start_date: machine.cycle_start_date || '',
                      crew_size: machine.crew_size || 1
                    });
                    // Load crews for this machine
                    await loadCrewsForMachine(machine.id);
                    setShowEditModal(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                
                {machine.status !== 'in_use' && (
                  <Button 
                    onClick={() => handleDeleteMachine(machine.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Empty State */}
      {filteredMachines.length === 0 && (
        <Card className="p-12 text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No machines found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedEnvironment !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Get started by adding your first machine'}
          </p>
          {!searchTerm && selectedEnvironment === 'all' && statusFilter === 'all' && (
            <Button onClick={() => {
              setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
              setShowAddModal(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Machine
            </Button>
          )}
        </Card>
      )}

      {/* Add Machine Modal */}
      {showAddModal && (
        <Modal title="Add New Machine" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddMachine} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine Name</label>
              <input 
                type="text" 
                placeholder="Enter machine name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <select 
                value={formData.environment} 
                onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.code}>{env.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine Type</label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required
              >
                <option value="">Select machine type...</option>
                {(MACHINE_TYPES[formData.environment] || []).map(type => 
                  <option key={type} value={type}>{type}</option>
                )}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input 
                  type="number" 
                  placeholder="100" 
                  value={formData.capacity} 
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Production Rate (/hr)</label>
                <input 
                  type="number" 
                  placeholder="60" 
                  value={formData.production_rate} 
                  onChange={(e) => setFormData({...formData, production_rate: parseInt(e.target.value)})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={() => setShowAddModal(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="w-4 h-4 mr-2" />
                Add Machine
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Machine Modal */}
      {showEditModal && selectedMachine && (
        <Modal title="Edit Machine" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditMachine} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine Name</label>
              <input 
                type="text" 
                placeholder="Machine Name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <select 
                value={formData.environment} 
                onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.code}>{env.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Changing environment will reset the machine type</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine Type</label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required
              >
                {(MACHINE_TYPES[formData.environment] || []).map(type => 
                  <option key={type} value={type}>{type}</option>
                )}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input 
                  type="number" 
                  placeholder="Capacity" 
                  value={formData.capacity} 
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Production Rate (/hr)</label>
                <input 
                  type="number" 
                  placeholder="Production Rate" 
                  value={formData.production_rate || ''} 
                  onChange={(e) => setFormData({...formData, production_rate: parseInt(e.target.value)})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
            </div>
            
            {/* 2-2-2 Shift Cycle Settings */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center space-x-3 mb-4">
                <input 
                  type="checkbox" 
                  id="shift_cycle_enabled"
                  checked={formData.shift_cycle_enabled || false}
                  onChange={(e) => setFormData({...formData, shift_cycle_enabled: e.target.checked})}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="shift_cycle_enabled" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  Enable 2-2-2 Shift Cycle
                </label>
              </div>
              
              {formData.shift_cycle_enabled && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Cycle Start Date
                      </label>
                      <input 
                        type="date" 
                        value={formData.cycle_start_date || ''}
                        onChange={(e) => setFormData({...formData, cycle_start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required={formData.shift_cycle_enabled}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Crew Size (people per shift)
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        value={formData.crew_size || 1}
                        onChange={(e) => setFormData({...formData, crew_size: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Crew Assignment Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Crew Assignments
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {crews.map(crew => (
                        <div key={crew.letter} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">Crew {crew.letter}</h5>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {crew.offset} day offset
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-2">
                            Pattern: Day → Night → Rest
                          </div>
                          
                          <select 
                            multiple
                            value={crew.employees}
                            onChange={(e) => {
                              const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                              handleCrewEmployeeChange(crew.letter, selectedIds);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-20"
                            disabled={loadingEmployees}
                          >
                            {loadingEmployees ? (
                              <option disabled>Loading employees...</option>
                            ) : employees.length === 0 ? (
                              <option disabled>No employees available - please log in or check permissions</option>
                            ) : (
                              employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.employee_code || 'No code'})
                                </option>
                              ))
                            )}
                          </select>
                          
                          <div className="text-xs text-gray-500 mt-1">
                            {crew.employees.length} / {formData.crew_size || 1} assigned
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Cycle Preview */}
                    {formData.cycle_start_date && (
                      <div className="mt-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          14-Day Cycle Preview
                        </h5>
                        
                        <div className="bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium text-gray-700">Date</th>
                                <th className="px-2 py-1 text-left font-medium text-gray-700">Day</th>
                                <th className="px-2 py-1 text-left font-medium text-blue-600">Day Shift</th>
                                <th className="px-2 py-1 text-left font-medium text-indigo-600">Night Shift</th>
                                <th className="px-2 py-1 text-left font-medium text-gray-600">Rest</th>
                              </tr>
                            </thead>
                            <tbody>
                              {generatePreviewDays(formData.cycle_start_date).map(day => (
                                <tr key={day.date} className="border-t border-gray-100">
                                  <td className="px-2 py-1 font-mono">{day.date}</td>
                                  <td className="px-2 py-1">{day.dayOfWeek}</td>
                                  <td className="px-2 py-1 text-blue-600 font-medium">
                                    {day.dayShift.length > 0 ? `Crew ${day.dayShift.join(', ')}` : '-'}
                                  </td>
                                  <td className="px-2 py-1 text-indigo-600 font-medium">
                                    {day.nightShift.length > 0 ? `Crew ${day.nightShift.join(', ')}` : '-'}
                                  </td>
                                  <td className="px-2 py-1 text-gray-500">
                                    {day.resting.length > 0 ? `Crew ${day.resting.join(', ')}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={() => setShowEditModal(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit">
                <Edit3 className="w-4 h-4 mr-2" />
                Update Machine
              </Button>
            </div>
          </form>
        </Modal>
      )}
      
      {/* Status Change Modal */}
      {showStatusModal && selectedMachine && (
        <Modal title="Change Machine Status" onClose={() => setShowStatusModal(false)}>
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-800 mb-2">{selectedMachine.name}</h3>
              <p className="text-sm text-gray-500">Current status: {getStatusBadge(selectedMachine.status)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(STATUS_COLORS).map(([status, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    variant={selectedMachine.status === status ? "default" : "outline"}
                    className={`${config.bg} ${config.text} border-2 ${config.border} h-16 flex flex-col items-center justify-center`}
                    disabled={selectedMachine.status === status}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                  </Button>
                );
              })}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowStatusModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
