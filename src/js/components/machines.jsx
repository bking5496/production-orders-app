import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Search, Filter, RefreshCw, Edit3, Trash2, AlertTriangle, Activity, Clock, BarChart3, CheckCircle, XCircle, Wrench, Users, Calendar, RotateCcw, Info, Wifi, Sun, Moon, Factory, Zap, Thermometer, Gauge, Power, MonitorSpeaker, ShieldCheck, Workflow, Layers } from 'lucide-react';
import API from '../core/api';
import { formatUserDisplayName, formatEmployeeCode } from '../utils/text-utils';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import { useMachineUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact } from './websocket-status.jsx';

export default function MachinesPage() {
  // State for storing the list of machines and UI status
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);

  // WebSocket integration
  useAutoConnect();
  const { lastUpdate, setMachines: setMachinesFromWS } = useMachineUpdates();
  const { notifications: wsNotifications, clearNotification } = useNotifications();
  
  // State for managing modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
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
    // Role-based crew configuration
    operators_per_shift: 2,
    hopper_loaders_per_shift: 1,
    packers_per_shift: 3
  });
  
  // Shift cycle specific state
  const [crews, setCrews] = useState([
    { letter: 'A', offset: 0, employees: [] },
    { letter: 'B', offset: 2, employees: [] },
    { letter: 'C', offset: 4, employees: [] }
  ]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Schedule modal state
  const [machineSchedule, setMachineSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Update form environment when environments are loaded
  useEffect(() => {
    if (environments.length > 0 && !formData.environment) {
      setFormData(prev => ({ ...prev, environment: environments[0].code }));
    }
  }, [environments, formData.environment]);

  // Machine types are now managed separately and filtered by environment
  const MACHINE_TYPES = useMemo(() => {
    const types = {};
    // Ensure environments is an array before using forEach
    if (Array.isArray(environments)) {
      environments.forEach(env => {
      // Get machine types allowed for this environment
      let allowedTypes = [];
      try {
        allowedTypes = typeof env.machine_types === 'string' 
          ? JSON.parse(env.machine_types) 
          : env.machine_types || [];
      } catch (e) {
        console.error('Failed to parse machine types for environment:', env.name, e);
        allowedTypes = [];
      }
      
      // Filter managed machine types to only those allowed in this environment
      types[env.code] = machineTypes
        .filter(mt => allowedTypes.includes(mt.name))
        .map(mt => ({ id: mt.id, name: mt.name, description: mt.description }));
      });
    }
    return types;
  }, [environments, machineTypes]);

  const STATUS_COLORS = {
    available: { 
      bg: 'bg-green-50', 
      text: 'text-green-600', 
      border: 'border-green-300', 
      icon: CheckCircle,
      glow: 'shadow-green-200',
      indicator: 'bg-green-400',
      pulse: 'animate-pulse'
    },
    in_use: { 
      bg: 'bg-blue-50', 
      text: 'text-blue-600', 
      border: 'border-blue-300', 
      icon: Activity,
      glow: 'shadow-blue-200',
      indicator: 'bg-blue-500',
      pulse: 'animate-bounce'
    },
    maintenance: { 
      bg: 'bg-yellow-50', 
      text: 'text-yellow-600', 
      border: 'border-yellow-300', 
      icon: Wrench,
      glow: 'shadow-yellow-200',
      indicator: 'bg-yellow-500',
      pulse: 'animate-pulse'
    },
    offline: { 
      bg: 'bg-red-50', 
      text: 'text-red-600', 
      border: 'border-red-300', 
      icon: XCircle,
      glow: 'shadow-red-200',
      indicator: 'bg-red-500',
      pulse: ''
    }
  };

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to fetch environments from the backend API
  const loadEnvironments = async () => {
    try {
      const response = await API.get('/environments');
      // Handle the response format - check for both new and old formats
      const environmentsData = response?.data || response || [];
      console.log('🌍 Environments loaded in machines.jsx:', Array.isArray(environmentsData) ? environmentsData.length : 'Invalid data format', environmentsData);
      setEnvironments(Array.isArray(environmentsData) ? environmentsData : []);
    } catch (error) {
      console.error('Failed to load environments:', error);
      showNotification('Failed to load environments', 'danger');
    }
  };

  // Function to fetch machine types from the backend API
  const loadMachineTypes = async () => {
    try {
      const response = await API.get('/machine-types');
      const data = response?.data || response || []; // Handle both new and old response formats
      console.log('🛠️ Machine types loaded:', Array.isArray(data) ? data.length : 'Invalid data format', data);
      setMachineTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load machine types:', error);
      showNotification('Failed to load machine types', 'danger');
    }
  };

  // Create machine type inline (without modal)
  const createMachineTypeInline = async (name) => {
    try {
      const newMachineType = {
        name: name,
        description: `Created during machine setup`,
        category: 'Production'
      };
      
      await API.post('/machine-types', newMachineType);
      loadMachineTypes(); // Refresh the machine types list
      showNotification(`Machine type "${name}" created successfully`);
    } catch (error) {
      console.error('Error creating machine type:', error);
      showNotification(`Failed to create machine type "${name}": ` + (error.response?.data?.error || error.message), 'danger');
    }
  };

  // Function to fetch machines from the backend API
  const loadMachines = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      console.log('🔧 Loading machines...');
      const response = await API.get('/machines');
      const data = response?.data || response || []; // Handle both new and old response formats
      console.log('✅ Raw machines response:', response);
      console.log('✅ Processed machines data:', data);
      console.log('✅ Machines loaded successfully:', Array.isArray(data) ? data.length : 'Invalid data format', 'machines');
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Failed to load machines:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load machines';
      if (error.message.includes('Unexpected token')) {
        errorMessage = 'Authentication error - please refresh the page and try again';
      } else if (error.message.includes('unauthorized') || error.message.includes('Session expired')) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error - please try again later';
      } else {
        errorMessage = `Failed to load machines: ${error.message}`;
      }
      
      showNotification(errorMessage, 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to load employees for crew assignments
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await API.get('/users');
      // Handle the response format - users API returns { success: true, data: [...] }
      const usersData = response?.data?.data || response?.data || [];
      console.log('🧑‍💼 Users loaded in machines.jsx:', usersData);
      
      // Transform users to match expected employee format with proper capitalization
      const employees = usersData.map(user => ({
        id: user.id,
        name: formatUserDisplayName(user),
        employee_code: formatEmployeeCode(user.employee_code),
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

  // Function to load schedule data for a machine
  const loadMachineSchedule = async (machineId) => {
    setLoadingSchedule(true);
    try {
      // Get production orders scheduled on this machine for the next 21 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const response = await API.get(`/orders`, {
        params: {
          machine_id: machineId,
          include_scheduled: true
        }
      });
      
      // Group orders by scheduled dates
      const scheduleByDate = {};
      if (Array.isArray(response) || (response.data && Array.isArray(response.data))) {
        const orders = Array.isArray(response) ? response : response.data;
        
        orders.forEach(order => {
          if (order.machine_id === machineId && order.scheduled_start_date) {
            const startDate = order.scheduled_start_date;
            const endDate = order.scheduled_end_date || startDate;
            
            // Add order to all dates it spans
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              if (!scheduleByDate[dateStr]) {
                scheduleByDate[dateStr] = { day: [], night: [], orders: [] };
              }
              
              // Add to appropriate shift based on start/end shifts
              const isStartDate = dateStr === startDate;
              const isEndDate = dateStr === endDate;
              
              if (isStartDate && order.scheduled_start_shift) {
                scheduleByDate[dateStr][order.scheduled_start_shift].push({
                  type: 'order',
                  ...order
                });
              }
              
              if (isEndDate && order.scheduled_end_shift && order.scheduled_end_shift !== order.scheduled_start_shift) {
                scheduleByDate[dateStr][order.scheduled_end_shift].push({
                  type: 'order',
                  ...order
                });
              }
              
              // For middle dates, show as running in both shifts
              if (!isStartDate && !isEndDate) {
                scheduleByDate[dateStr].day.push({
                  type: 'order_running',
                  ...order
                });
                scheduleByDate[dateStr].night.push({
                  type: 'order_running',
                  ...order
                });
              }
              
              // Store order reference for detailed view
              scheduleByDate[dateStr].orders.push(order);
            }
          }
        });
      }
      
      setMachineSchedule(scheduleByDate);
    } catch (error) {
      console.error('Failed to load machine schedule:', error);
      setMachineSchedule({});
    } finally {
      setLoadingSchedule(false);
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
    // Load data regardless of WebSocket authentication status  
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found - user needs to log in');
      setNotification({ message: 'Please log in to access machine data', type: 'warning' });
      setLoading(false);
      return;
    }
    
    // Load all data immediately (WebSocket is optional for data loading)
    loadEnvironments(); // Load environments first
    loadMachineTypes(); // Load managed machine types
    loadMachines(); // Fetch data immediately
    loadEmployees(); // Load employees for crew assignments
    
    // Set up periodic refresh (independent of WebSocket)
    const interval = setInterval(() => {
      console.log('🔄 Periodic refresh - reloading machines data');
      loadMachines();
    }, 30000);
    
    return () => clearInterval(interval); // Clean up the interval when the component is unmounted
  }, []);

  // WebSocket real-time updates
  useWebSocketEvent('machine_status_changed', (data) => {
    console.log('🔧 Machine status changed:', data.data);
    setMachines(prevMachines => {
      return prevMachines.map(machine => 
        machine.id === data.data.machine_id
          ? { ...machine, status: data.data.status, updated_at: new Date().toISOString() }
          : machine
      );
    });
    showNotification(`Machine ${data.data.machine_name} status changed to ${data.data.status}`, 'info');
  }, []);

  useWebSocketEvent('machine_created', (data) => {
    console.log('🆕 New machine added:', data.data);
    setMachines(prevMachines => [...prevMachines, data.data.machine]);
    showNotification(`New machine "${data.data.machine.name}" added`, 'success');
  }, []);

  useWebSocketEvent('machine_updated', (data) => {
    console.log('📝 Machine updated:', data);
    setMachines(prevMachines => {
      return prevMachines.map(machine => 
        machine.id === data.id ? data : machine
      );
    });
    showNotification(`Machine "${data.name}" updated`, 'info');
  }, []);

  useWebSocketEvent('machine_deleted', (data) => {
    console.log('🗑️ Machine deleted:', data.data);
    setMachines(prevMachines => {
      return prevMachines.filter(machine => machine.id !== data.data.machine_id);
    });
    showNotification(`Machine deleted`, 'warning');
  }, []);

  // Subscribe to relevant channels
  useEffect(() => {
    if (window.EnhancedWebSocketService?.isConnected()) {
      window.EnhancedWebSocketService.subscribe(['machines', 'production']);
    }
  }, []);

  // Show WebSocket notifications
  useEffect(() => {
    if (Array.isArray(wsNotifications)) {
      wsNotifications.forEach(notification => {
        if (notification.type === 'alert' && notification.message.includes('machine')) {
          showNotification(notification.message, 'danger');
          clearNotification(notification.id);
        }
      });
    }
  }, [wsNotifications]);

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
    // Ensure machines is an array before filtering
    let filtered = Array.isArray(machines) ? machines : [];
    
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
    // Ensure machines is an array before calculating stats
    const machinesArray = Array.isArray(machines) ? machines : [];
    const total = machinesArray.length;
    const available = machinesArray.filter(m => m.status === 'available').length;
    const inUse = machinesArray.filter(m => m.status === 'in_use').length;
    const maintenance = machinesArray.filter(m => m.status === 'maintenance').length;
    const offline = machinesArray.filter(m => m.status === 'offline').length;
    const utilizationRate = total > 0 ? Math.round((inUse / total) * 100) : 0;
    
    return { total, available, inUse, maintenance, offline, utilizationRate };
  }, [machines]);

  // Helper function to render SCADA status badge
  const getStatusBadge = (status) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.offline;
    const Icon = config.icon;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} border ${config.border}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${config.indicator} ${config.pulse}`}></div>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-12 text-center shadow-xl">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-6">
            <MonitorSpeaker className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-3 text-white mb-4">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-xl font-bold">INITIALIZING SYSTEM...</span>
          </div>
          <div className="w-64 bg-slate-700 rounded-full h-2 mx-auto">
            <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
          <p className="text-slate-400 mt-4 font-mono text-sm">Loading production equipment data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* SCADA Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`p-4 rounded-lg shadow-xl border-l-4 backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-slate-800/95 text-green-400 border-green-500' :
            notification.type === 'danger' ? 'bg-slate-800/95 text-red-400 border-red-500' :
            'bg-slate-800/95 text-blue-400 border-blue-500'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                notification.type === 'success' ? 'bg-green-400' :
                notification.type === 'danger' ? 'bg-red-400' :
                'bg-blue-400'
              }`}></div>
              <span className="font-mono text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* SCADA Header */}
      <div className="bg-slate-800 border-b border-slate-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <MonitorSpeaker className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">Production Control System</h1>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">ONLINE</span>
                  </div>
                  <WebSocketStatusCompact />
                </div>
                <p className="text-slate-300 mt-1 flex items-center gap-2">
                  <Workflow className="w-4 h-4" />
                  Industrial SCADA Interface • Real-time Equipment Monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                onClick={() => {
                  setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Machine
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SCADA Statistics Panel */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">TOTAL UNITS</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-green-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">AVAILABLE</p>
                <p className="text-3xl font-bold text-green-400">{stats.available}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{width: `${stats.total > 0 ? (stats.available / stats.total) * 100 : 0}%`}}></div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-blue-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">ACTIVE</p>
                <p className="text-3xl font-bold text-blue-400">{stats.inUse}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400 animate-bounce" />
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div className="bg-blue-400 h-1 rounded-full" style={{width: `${stats.total > 0 ? (stats.inUse / stats.total) * 100 : 0}%`}}></div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-yellow-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">MAINTENANCE</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.maintenance}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div className="bg-yellow-400 h-1 rounded-full animate-pulse" style={{width: `${stats.total > 0 ? (stats.maintenance / stats.total) * 100 : 0}%`}}></div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-red-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm font-medium">OFFLINE</p>
                <p className="text-3xl font-bold text-red-400">{stats.offline}</p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div className="bg-red-400 h-1 rounded-full" style={{width: `${stats.total > 0 ? (stats.offline / stats.total) * 100 : 0}%`}}></div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">EFFICIENCY</p>
                <p className="text-3xl font-bold text-purple-400">{stats.utilizationRate}%</p>
              </div>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Gauge className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div className="bg-purple-400 h-1 rounded-full" style={{width: `${stats.utilizationRate}%`}}></div>
            </div>
          </div>
        </div>

        {/* SCADA Control Panel */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">System Control Panel</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
            </div>
            
            {/* Environment Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select 
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white appearance-none"
              >
                <option value="all">All Production Areas</option>
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
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="all">All Status Types</option>
                <option value="available">Available</option>
                <option value="in_use">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            
            {/* Results Count */}
            <div className="flex items-center justify-center md:justify-start bg-slate-700 rounded-lg px-4 py-3 border border-slate-600">
              <span className="text-sm text-slate-300 font-mono">
                {filteredMachines.length} / {machines.length} units
              </span>
            </div>
          </div>
        </div>

        {/* SCADA Machine Grid - Separated by Environment */}
        {/* Blending Environment Section */}
        {(selectedEnvironment === 'all' || selectedEnvironment === 'blending') && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 mb-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">BLENDING PRODUCTION AREA</h2>
                  <p className="text-orange-100 flex items-center gap-2">
                    <Thermometer className="w-4 h-4" />
                    Raw Material Processing • Recipe Mixing • Quality Control
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-3xl font-bold text-white">
                    {filteredMachines.filter(m => m.environment === 'blending').length}
                  </div>
                  <div className="text-orange-200 text-sm">UNITS</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMachines.filter(m => m.environment === 'blending').map(machine => {
                const statusConfig = STATUS_COLORS[machine.status] || STATUS_COLORS.offline;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div key={machine.id} className={`bg-slate-800 border ${statusConfig.border} rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative`}>
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className={`w-3 h-3 rounded-full ${statusConfig.indicator} ${statusConfig.pulse}`}></div>
                    </div>
                    
                    {/* Machine Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 ${statusConfig.bg} rounded-lg flex items-center justify-center border ${statusConfig.border}`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{machine.name}</h3>
                          <p className="text-slate-400 text-sm">{machine.type}</p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig.indicator} ${statusConfig.pulse}`}></div>
                        {machine.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Machine Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center gap-2 mb-1">
                          <Gauge className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-400 text-xs">CAPACITY</span>
                        </div>
                        <div className="text-white font-bold">{machine.capacity}</div>
                      </div>
                      
                      {machine.production_rate && (
                        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-green-400" />
                            <span className="text-slate-400 text-xs">RATE</span>
                          </div>
                          <div className="text-white font-bold">{machine.production_rate}/hr</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="space-y-2">
                      <Button 
                        onClick={async () => {
                          setSelectedMachine(machine);
                          setFormData({
                            ...machine,
                            shift_cycle_enabled: machine.shift_cycle_enabled || false,
                            cycle_start_date: machine.cycle_start_date || '',
                            operators_per_shift: machine.operators_per_shift == null ? '' : machine.operators_per_shift,
                            hopper_loaders_per_shift: machine.hopper_loaders_per_shift == null ? '' : machine.hopper_loaders_per_shift,
                            packers_per_shift: machine.packers_per_shift == null ? '' : machine.packers_per_shift,
                            specifications: machine.specifications || {}
                          });
                          await loadCrewsForMachine(machine.id);
                          setShowEditModal(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        CONFIGURE
                      </Button>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => {
                            setSelectedMachine(machine);
                            setShowStatusModal(true);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs py-2"
                        >
                          <StatusIcon className="w-3 h-3" />
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            setSelectedMachine(machine);
                            loadMachineSchedule(machine.id);
                            setShowScheduleModal(true);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs py-2"
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                      
                        {machine.status !== 'in_use' && (
                          <Button 
                            onClick={() => handleDeleteMachine(machine.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs py-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Packaging Environment Section */}
        {(selectedEnvironment === 'all' || selectedEnvironment === 'packaging') && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                  <Factory className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">PACKAGING PRODUCTION AREA</h2>
                  <p className="text-blue-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Final Processing • Packaging Lines • Distribution Ready
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-3xl font-bold text-white">
                    {filteredMachines.filter(m => m.environment === 'packaging').length}
                  </div>
                  <div className="text-blue-200 text-sm">UNITS</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMachines.filter(m => m.environment === 'packaging').map(machine => {
                const statusConfig = STATUS_COLORS[machine.status] || STATUS_COLORS.offline;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div key={machine.id} className={`bg-slate-800 border ${statusConfig.border} rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative`}>
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className={`w-3 h-3 rounded-full ${statusConfig.indicator} ${statusConfig.pulse}`}></div>
                    </div>
                    
                    {/* Machine Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 ${statusConfig.bg} rounded-lg flex items-center justify-center border ${statusConfig.border}`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{machine.name}</h3>
                          <p className="text-slate-400 text-sm">{machine.type}</p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig.indicator} ${statusConfig.pulse}`}></div>
                        {machine.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Machine Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center gap-2 mb-1">
                          <Gauge className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-400 text-xs">CAPACITY</span>
                        </div>
                        <div className="text-white font-bold">{machine.capacity}</div>
                      </div>
                      
                      {machine.production_rate && (
                        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-green-400" />
                            <span className="text-slate-400 text-xs">RATE</span>
                          </div>
                          <div className="text-white font-bold">{machine.production_rate}/hr</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="space-y-2">
                      <Button 
                        onClick={async () => {
                          setSelectedMachine(machine);
                          setFormData({
                            ...machine,
                            shift_cycle_enabled: machine.shift_cycle_enabled || false,
                            cycle_start_date: machine.cycle_start_date || '',
                            operators_per_shift: machine.operators_per_shift == null ? '' : machine.operators_per_shift,
                            hopper_loaders_per_shift: machine.hopper_loaders_per_shift == null ? '' : machine.hopper_loaders_per_shift,
                            packers_per_shift: machine.packers_per_shift == null ? '' : machine.packers_per_shift,
                            specifications: machine.specifications || {}
                          });
                          await loadCrewsForMachine(machine.id);
                          setShowEditModal(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        CONFIGURE
                      </Button>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={() => {
                            setSelectedMachine(machine);
                            setShowStatusModal(true);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs py-2"
                        >
                          <StatusIcon className="w-3 h-3" />
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            setSelectedMachine(machine);
                            loadMachineSchedule(machine.id);
                            setShowScheduleModal(true);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs py-2"
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                      
                        {machine.status !== 'in_use' && (
                          <Button 
                            onClick={() => handleDeleteMachine(machine.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs py-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      
        {/* SCADA Empty State */}
        {filteredMachines.length === 0 && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-12 text-center shadow-lg">
            <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">NO EQUIPMENT DETECTED</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || selectedEnvironment !== 'all' || statusFilter !== 'all'
                ? 'Adjust system filters to locate equipment'
                : 'Initialize system by adding production equipment'}
            </p>
            {!searchTerm && selectedEnvironment === 'all' && statusFilter === 'all' && (
              <Button 
                onClick={() => {
                  setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                ADD FIRST UNIT
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SCADA Add Machine Modal */}
      {showAddModal && (
        <Modal title="ADD NEW EQUIPMENT" onClose={() => setShowAddModal(false)}>
          <div className="bg-slate-900 rounded-lg">
            <form onSubmit={handleAddMachine} className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Equipment Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter equipment designation" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400 font-mono" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Production Area</label>
                  <select 
                    value={formData.environment} 
                    onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    required
                  >
                    <option value="">Select Production Area</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.code}>{env.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Equipment Type</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white" 
                  required
                >
                  <option value="">Select equipment type...</option>
                  {(MACHINE_TYPES[formData.environment] || []).map(type => 
                    <option key={type.id || type.name} value={type.name || type}>{type.name || type}</option>
                  )}
                </select>
                <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-600">
                  <input
                    type="text"
                    placeholder="Create new equipment type (press Enter)"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newTypeName = e.target.value.trim();
                        setFormData({...formData, type: newTypeName});
                        createMachineTypeInline(newTypeName);
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-2">Press Enter to create and select new equipment type</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                  <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Capacity</label>
                  <input 
                    type="number" 
                    placeholder="100" 
                    value={formData.capacity} 
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white font-mono" 
                    required 
                  />
                </div>
                
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                  <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Rate (/hr)</label>
                  <input 
                    type="number" 
                    placeholder="60" 
                    value={formData.production_rate} 
                    onChange={(e) => setFormData({...formData, production_rate: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white font-mono" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-600">
                <Button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 px-6 py-3"
                >
                  CANCEL
                </Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  ADD EQUIPMENT
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Edit Machine Modal */}
      {showEditModal && selectedMachine && (
        <Modal 
          title={`Edit Machine - ${selectedMachine.name}`} 
          onClose={() => setShowEditModal(false)}
          size="large"
        >
          <div className="p-6">
            {/* Enhanced Header */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Machine Configuration</h3>
                  <p className="text-gray-600">Update machine settings and assignments</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditMachine} className="space-y-6">
              {/* Machine Name Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Machine Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter machine name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold" 
                    required 
                  />
                </div>
            
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Environment <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.environment} 
                    onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    required
                  >
                    <option value="">Select Environment</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.code}>{env.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Changing environment will reset the machine type</p>
                </div>
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
                  <option key={type.id || type.name} value={type.name || type}>{type.name || type}</option>
                )}
              </select>
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  placeholder="Or type new machine type and press Enter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const newTypeName = e.target.value.trim();
                      setFormData({...formData, type: newTypeName});
                      createMachineTypeInline(newTypeName);
                      e.target.value = '';
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter to create and select new machine type</p>
              </div>
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
            
            {/* Machine Image Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-sm">📸</span>
                </div>
                Machine Visual
              </h3>
              
              {/* Current Image Preview */}
              {selectedMachine?.specifications?.image && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Image</p>
                  <div className="relative w-48 h-32 mx-auto">
                    <img 
                      src={selectedMachine.specifications.image} 
                      alt={`${selectedMachine.name} machine`}
                      className="w-full h-full object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Path: {selectedMachine.specifications.image}
                  </p>
                </div>
              )}
              
              {/* Image Path Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Path (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="/assets/machines/machine-name.png" 
                  value={formData.specifications?.image || ''} 
                  onChange={(e) => {
                    const specs = formData.specifications || {};
                    setFormData({
                      ...formData, 
                      specifications: { ...specs, image: e.target.value }
                    });
                  }} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the path to machine image (relative to public directory)
                </p>
              </div>
            </div>
            
            {/* Workforce Configuration */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Workforce Requirements
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    <Settings className="w-4 h-4 inline mr-1" />
                    Operators per Shift
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="10"
                    value={formData.operators_per_shift ?? 2}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({...formData, operators_per_shift: value});
                    }}
                    placeholder="Not applicable"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-blue-600 mt-1">Machine operators needed • Blank = N/A, 0 = Automated</p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    <BarChart3 className="w-4 h-4 inline mr-1" />
                    Hopper Loaders per Shift
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="5"
                    value={formData.hopper_loaders_per_shift ?? 1}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({...formData, hopper_loaders_per_shift: value});
                    }}
                    placeholder="Not applicable"
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-orange-600 mt-1">Material handling staff • Blank = N/A, 0 = Automated</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Packers per Shift
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="15"
                    value={formData.packers_per_shift ?? 3}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                      setFormData({...formData, packers_per_shift: value});
                    }}
                    placeholder="Not applicable"
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-green-600 mt-1">Packaging staff needed • Blank = N/A, 0 = Automated</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Total Workforce per Shift</h4>
                    <p className="text-sm text-gray-600">Combined staffing requirement</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const operators = formData.operators_per_shift === '' ? 0 : (formData.operators_per_shift ?? 2);
                        const loaders = formData.hopper_loaders_per_shift === '' ? 0 : (formData.hopper_loaders_per_shift ?? 1);
                        const packers = formData.packers_per_shift === '' ? 0 : (formData.packers_per_shift ?? 3);
                        return operators + loaders + packers;
                      })()}
                    </div>
                    <div className="text-sm text-gray-500">people</div>
                  </div>
                </div>
              </div>
              
              {/* Simplified Shift Cycle Toggle */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <RotateCcw className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-gray-900">2-2-2 Shift Cycle</span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">Advanced</span>
                    </div>
                    <p className="text-sm text-gray-600">Automatic crew rotation with continuous coverage</p>
                    <p className="text-xs text-indigo-600 mt-1">Configure detailed scheduling in Labor Planner →</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="shift_cycle_enabled"
                      checked={formData.shift_cycle_enabled || false}
                      onChange={(e) => setFormData({...formData, shift_cycle_enabled: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="shift_cycle_enabled" className="text-sm font-medium text-gray-700">
                      Enable
                    </label>
                  </div>
                </div>
              
                {formData.shift_cycle_enabled && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
                    <div className="text-center">
                      <Calendar className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900 mb-1">Shift Cycle Enabled</p>
                      <p className="text-xs text-gray-600 mb-3">Configure detailed crew assignments and schedules in the Labor Planner</p>
                      <button 
                        type="button"
                        onClick={() => window.location.href = '/labor-planner'}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        Open Labor Planner →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
              {/* Enhanced Submit Section */}
              <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
                <Button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Update Machine
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      
      {/* SCADA Status Change Modal */}
      {showStatusModal && selectedMachine && (
        <Modal title="EQUIPMENT STATUS CONTROL" onClose={() => setShowStatusModal(false)}>
          <div className="bg-slate-900 rounded-lg p-6 space-y-6">
            <div className="text-center bg-slate-800 p-4 rounded-lg border border-slate-600">
              <h3 className="text-xl font-bold text-white mb-2">{selectedMachine.name}</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-slate-400">CURRENT STATUS:</span>
                {getStatusBadge(selectedMachine.status)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(STATUS_COLORS).map(([status, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`${selectedMachine.status === status ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-600'} border-2 h-20 flex flex-col items-center justify-center text-white font-bold transition-all duration-200`}
                    disabled={selectedMachine.status === status}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${config.text}`} />
                    <span className="text-xs font-bold">
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                    <div className={`w-2 h-2 rounded-full mt-1 ${config.indicator} ${config.pulse}`}></div>
                  </Button>
                );
              })}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-600">
              <Button 
                onClick={() => setShowStatusModal(false)} 
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 px-6 py-3"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedMachine && (
        <Modal 
          title={`Schedule - ${selectedMachine.name}`} 
          onClose={() => setShowScheduleModal(false)}
          size="large"
        >
          <div className="p-6">
            {loadingSchedule ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading schedule...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">21-Day Production Schedule</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Factory className="w-4 h-4 text-green-600" />
                      <span>Production Orders</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <span>Day Shift</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Moon className="w-4 h-4 text-blue-500" />
                      <span>Night Shift</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {/* Generate 21 days starting from 7 days ago */}
                  {Array.from({ length: 21 }, (_, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - 7 + index);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayData = machineSchedule[dateStr] || { day: [], night: [] };
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isPast = date < new Date(new Date().toDateString());
                    
                    // Determine the icon based on production orders and shift coverage
                    let shiftIcon;
                    const hasDayShift = dayData.day.length > 0;
                    const hasNightShift = dayData.night.length > 0;
                    const hasOrders = dayData.orders && dayData.orders.length > 0;
                    
                    if (hasOrders) {
                      if (hasDayShift && hasNightShift) {
                        // Production running both shifts
                        shiftIcon = (
                          <div className="flex items-center justify-center gap-1">
                            <Factory className="w-3 h-3 text-green-600" />
                            <div className="flex gap-1">
                              <Sun className="w-2 h-2 text-yellow-500" />
                              <Moon className="w-2 h-2 text-blue-500" />
                            </div>
                          </div>
                        );
                      } else if (hasDayShift) {
                        // Production day shift only
                        shiftIcon = (
                          <div className="flex items-center justify-center gap-1">
                            <Factory className="w-3 h-3 text-green-600" />
                            <Sun className="w-2 h-2 text-yellow-500" />
                          </div>
                        );
                      } else if (hasNightShift) {
                        // Production night shift only  
                        shiftIcon = (
                          <div className="flex items-center justify-center gap-1">
                            <Factory className="w-3 h-3 text-green-600" />
                            <Moon className="w-2 h-2 text-blue-500" />
                          </div>
                        );
                      } else {
                        // Production scheduled but no specific shift
                        shiftIcon = <Factory className="w-4 h-4 text-green-600" />;
                      }
                    } else {
                      // No production orders scheduled
                      shiftIcon = <div className="w-4 h-4 rounded-full bg-gray-200"></div>;
                    }
                    
                    return (
                      <div
                        key={dateStr}
                        className={`p-3 rounded-lg border text-center ${
                          isToday 
                            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                            : isPast 
                              ? 'bg-gray-50 border-gray-200' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        title={`${date.toLocaleDateString()} - ${hasOrders ? dayData.orders.map(o => `${o.order_number}: ${o.product_name}`).join(', ') : 'No production scheduled'}`}
                      >
                        <div className="text-xs font-medium text-gray-600 mb-1">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          {date.getDate()}
                        </div>
                        {shiftIcon}
                        {hasOrders && (
                          <div className="text-xs text-gray-500 mt-1">
                            {dayData.orders.length} order{dayData.orders.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Production Schedule Legend</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Factory className="w-4 h-4 text-green-600" />
                        <div className="flex gap-1">
                          <Sun className="w-3 h-3 text-yellow-500" />
                          <Moon className="w-3 h-3 text-blue-500" />
                        </div>
                      </div>
                      <span className="text-gray-700">Production both shifts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Factory className="w-4 h-4 text-green-600" />
                        <Sun className="w-3 h-3 text-yellow-500" />
                      </div>
                      <span className="text-gray-700">Day shift production</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Factory className="w-4 h-4 text-green-600" />
                        <Moon className="w-3 h-3 text-blue-500" />
                      </div>
                      <span className="text-gray-700">Night shift production</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                      <span className="text-gray-700">No production scheduled</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    <p>🏭 Shows production orders scheduled on this machine</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
