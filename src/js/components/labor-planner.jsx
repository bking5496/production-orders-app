import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ClipboardList, 
  UserCheck, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  Settings,
  ArrowLeft,
  ArrowRight,
  X,
  Copy,
  Save,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Wrench,
  Truck,
  Factory,
  Shield,
  Eye,
  ChevronDown,
  Filter,
  Play,
  Pause,
  Moon,
  Sun,
  Zap,
  Users as UsersIcon
} from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import AttendanceModule from '../modules/attendance-module-simple.jsx';

// Utility Functions
const getCurrentSASTDateString = () => {
  const now = new Date();
  now.setHours(now.getHours() + 2); // Convert to SAST (UTC+2)
  return now.toISOString().split('T')[0];
};

const formatTodaysDate = (date) => {
  return new Date(date).toLocaleDateString('en-ZA', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Enhanced Worker Selection Component for Daily Operations
const DailyWorkerSelect = ({ 
  value, 
  onChange, 
  role, 
  environment, 
  shift, 
  date, 
  machineId, 
  orderId,
  workers, 
  assignments, 
  yesterdayAssignments = [],
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter workers by role
  const availableWorkers = workers.filter(worker => {
    if (role === 'supervisor') return worker.role === 'supervisor';
    if (role === 'forklift') return worker.role === 'operator'; // Forklift drivers are operators with special skills
    return worker.role === 'operator' || worker.role === 'packer';
  });

  // Check worker status with priority system
  const getWorkerStatus = (workerId) => {
    // Check if assigned to this exact slot today
    const currentAssignment = assignments.find(a => 
      a.employee_id === workerId && 
      a.machine_id === machineId && 
      a.shift_type === shift && 
      a.role === role &&
      a.assignment_date === date
    );
    if (currentAssignment) return 'current';

    // Check if assigned elsewhere today
    const todayAssignments = assignments.filter(a => 
      a.employee_id === workerId && 
      a.assignment_date === date
    );
    if (todayAssignments.length > 0) return 'assigned';

    // Check if worked same machine/order yesterday (continuity priority)
    const yesterdayMatch = yesterdayAssignments.find(a => 
      a.employee_id === workerId && 
      a.machine_id === machineId &&
      a.role === role
    );
    if (yesterdayMatch) return 'continuity';

    // Check if worked any machine yesterday (experience priority)
    const yesterdayExperience = yesterdayAssignments.find(a => 
      a.employee_id === workerId
    );
    if (yesterdayExperience) return 'experienced';

    return 'available';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'current': return 'text-blue-600 bg-blue-50';
      case 'continuity': return 'text-green-600 bg-green-50';
      case 'experienced': return 'text-emerald-600 bg-emerald-50';
      case 'available': return 'text-gray-600 bg-gray-50';
      case 'assigned': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'current': return <User className="w-3 h-3" />;
      case 'continuity': return <CheckCircle className="w-3 h-3" />;
      case 'experienced': return <Zap className="w-3 h-3" />;
      case 'available': return <UsersIcon className="w-3 h-3" />;
      case 'assigned': return <Clock className="w-3 h-3" />;
      default: return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'current': return 'Current';
      case 'continuity': return 'Same role yesterday';
      case 'experienced': return 'Worked yesterday';
      case 'available': return 'Available';
      case 'assigned': return 'Already assigned today';
      default: return '';
    }
  };

  // Sort workers by priority: continuity > experienced > available > assigned
  const sortedWorkers = availableWorkers.sort((a, b) => {
    const statusA = getWorkerStatus(a.id);
    const statusB = getWorkerStatus(b.id);
    
    const priority = {
      'current': 0,
      'continuity': 1,
      'experienced': 2,
      'available': 3,
      'assigned': 4
    };
    
    return (priority[statusA] || 5) - (priority[statusB] || 5);
  });

  const selectedWorker = value ? availableWorkers.find(w => w.id === value) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
          selectedWorker ? 'border-blue-200' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedWorker ? (
              <>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  getStatusColor(getWorkerStatus(selectedWorker.id))
                }`}>
                  {getStatusIcon(getWorkerStatus(selectedWorker.id))}
                </div>
                <span className="font-medium text-gray-900 truncate">
                  {selectedWorker.full_name || selectedWorker.username}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  ({selectedWorker.employee_code})
                </span>
              </>
            ) : (
              <span className="text-gray-400">Select {role}...</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="py-1">
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-gray-400 hover:bg-gray-50"
            >
              No assignment
            </button>
            {sortedWorkers.map(worker => {
              const status = getWorkerStatus(worker.id);
              return (
                <button
                  key={worker.id}
                  onClick={() => {
                    onChange(worker.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                    status === 'assigned' ? 'opacity-60' : ''
                  }`}
                >
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    getStatusColor(status)
                  }`}>
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {worker.full_name || worker.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {worker.employee_code} • {getStatusLabel(status)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Daily Machine Row Component
const DailyMachineRow = ({ 
  machine, 
  workers, 
  assignments, 
  yesterdayAssignments,
  onAssignmentChange, 
  selectedDate,
  isLocked = false
}) => {
  const getDailyAssignments = (shift) => {
    return assignments.filter(a => 
      a.machine_id === machine.id && 
      a.assignment_date === selectedDate && 
      a.shift_type === shift
    );
  };

  const getAssignedWorker = (shift, role) => {
    const assignment = assignments.find(a => 
      a.machine_id === machine.id && 
      a.assignment_date === selectedDate && 
      a.shift_type === shift && 
      a.role === role
    );
    return assignment ? assignment.employee_id : null;
  };

  const handleAssignmentChange = (shift, role, workerId) => {
    onAssignmentChange(machine.id, shift, role, workerId);
  };

  // Determine required roles based on machine type and specifications
  const getRequiredRoles = () => {
    const roles = ['operator']; // All machines need at least one operator
    
    // Add additional roles based on machine specifications
    if (machine.operators_per_shift > 1) {
      roles.push('helper');
    }
    if (machine.hopper_loaders_per_shift > 0) {
      roles.push('loader');
    }
    if (machine.packers_per_shift > 0) {
      roles.push('packer');
    }
    
    return roles;
  };

  const requiredRoles = getRequiredRoles();

  // Check which shifts this machine is running today
  const isDayShiftActive = machine.day_shift_active !== false; // Default to true if not specified
  const isNightShiftActive = machine.night_shift_active !== false; // Default to true if not specified

  return (
    <div className="grid grid-cols-12 gap-4 py-4 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Machine Info */}
      <div className="col-span-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          machine.status === 'in_use' ? 'bg-green-100 text-green-600' : 
          machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          <Factory className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{machine.name}</div>
          <div className="text-xs text-gray-500 truncate">{machine.type}</div>
          {machine.order_number && (
            <div className="text-xs text-blue-600 font-medium truncate">
              Order: {machine.order_number}
            </div>
          )}
          {machine.order_duration && (
            <div className="text-xs text-purple-600 truncate">
              {machine.order_duration} day order
            </div>
          )}
        </div>
      </div>

      {/* Day Shift Assignments */}
      <div className="col-span-4">
        {isDayShiftActive ? (
          <div className="grid grid-cols-2 gap-2">
            {requiredRoles.map(role => (
              <DailyWorkerSelect
                key={`day-${role}`}
                value={getAssignedWorker('day', role)}
                onChange={(workerId) => handleAssignmentChange('day', role, workerId)}
                role={role}
                environment={machine.environment}
                shift="day"
                date={selectedDate}
                machineId={machine.id}
                orderId={machine.order_id}
                workers={workers}
                assignments={assignments}
                yesterdayAssignments={yesterdayAssignments}
                className="text-sm"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Pause className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Not Running</span>
            </div>
          </div>
        )}
      </div>

      {/* Night Shift Assignments */}
      <div className="col-span-4">
        {isNightShiftActive ? (
          <div className="grid grid-cols-2 gap-2">
            {requiredRoles.map(role => (
              <DailyWorkerSelect
                key={`night-${role}`}
                value={getAssignedWorker('night', role)}
                onChange={(workerId) => handleAssignmentChange('night', role, workerId)}
                role={role}
                environment={machine.environment}
                shift="night"
                date={selectedDate}
                machineId={machine.id}
                orderId={machine.order_id}
                workers={workers}
                assignments={assignments}
                yesterdayAssignments={yesterdayAssignments}
                className="text-sm"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Moon className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Not Running</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="col-span-1 flex items-center justify-center">
        {isLocked ? (
          <Lock className="w-4 h-4 text-gray-400" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            {isDayShiftActive && getDailyAssignments('day').length > 0 && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Day shift assigned">
                <Sun className="w-2 h-2 text-yellow-600" />
              </div>
            )}
            {isNightShiftActive && getDailyAssignments('night').length > 0 && (
              <div className="w-2 h-2 bg-blue-400 rounded-full" title="Night shift assigned">
                <Moon className="w-2 h-2 text-blue-600" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Daily Environment Support Component
const DailyEnvironmentSupport = ({ 
  environment, 
  workers, 
  assignments, 
  yesterdayAssignments,
  onAssignmentChange, 
  selectedDate,
  isLocked = false 
}) => {
  const supportRoles = [
    { role: 'supervisor', label: 'Supervisor', icon: Shield },
    { role: 'forklift', label: 'Forklift Driver', icon: Truck }
  ];

  const getAssignedWorker = (shift, role) => {
    const assignment = assignments.find(a => 
      a.machine_id === null && // Environment-level assignments have null machine_id
      a.assignment_date === selectedDate && 
      a.shift_type === shift && 
      a.role === role
    );
    return assignment ? assignment.employee_id : null;
  };

  const handleAssignmentChange = (shift, role, workerId) => {
    onAssignmentChange(null, shift, role, workerId); // null machine_id for environment-level
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <Factory className="w-5 h-5" />
        {environment.toUpperCase()} ENVIRONMENT SUPPORT - TODAY
      </h3>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <div className="font-medium text-gray-700">Support Role</div>
        </div>
        <div className="col-span-4">
          <div className="font-medium text-gray-700 text-center flex items-center justify-center gap-2">
            <Sun className="w-4 h-4 text-yellow-600" />
            Day Shift (06:00-18:00)
          </div>
        </div>
        <div className="col-span-4">
          <div className="font-medium text-gray-700 text-center flex items-center justify-center gap-2">
            <Moon className="w-4 h-4 text-blue-600" />
            Night Shift (18:00-06:00)
          </div>
        </div>
        <div className="col-span-1"></div>
      </div>

      {supportRoles.map(({ role, label, icon: Icon }) => (
        <div key={role} className="grid grid-cols-12 gap-4 py-3 border-t border-blue-200 mt-2">
          <div className="col-span-3 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">{label}</span>
          </div>
          <div className="col-span-4">
            <DailyWorkerSelect
              value={getAssignedWorker('day', role)}
              onChange={(workerId) => handleAssignmentChange('day', role, workerId)}
              role={role}
              environment={environment}
              shift="day"
              date={selectedDate}
              machineId={null}
              workers={workers}
              assignments={assignments}
              yesterdayAssignments={yesterdayAssignments}
            />
          </div>
          <div className="col-span-4">
            <DailyWorkerSelect
              value={getAssignedWorker('night', role)}
              onChange={(workerId) => handleAssignmentChange('night', role, workerId)}
              role={role}
              environment={environment}
              shift="night"
              date={selectedDate}
              machineId={null}
              workers={workers}
              assignments={assignments}
              yesterdayAssignments={yesterdayAssignments}
            />
          </div>
          <div className="col-span-1"></div>
        </div>
      ))}
    </div>
  );
};

// Idle Machines Display
const IdleMachinesDisplay = ({ idleMachines, environment }) => {
  if (idleMachines.length === 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Pause className="w-4 h-4" />
        IDLE MACHINES TODAY ({idleMachines.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {idleMachines.map(machine => (
          <span 
            key={machine.id}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
          >
            {machine.name}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        These machines have no orders assigned for today
      </p>
    </div>
  );
};

// Daily Planning Interface
const DailyPlanningInterface = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(getCurrentSASTDateString());
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [activeMachines, setActiveMachines] = useState([]);
  const [idleMachines, setIdleMachines] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [yesterdayAssignments, setYesterdayAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDayLocked, setIsDayLocked] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Initialize with user's environment if they're a supervisor
  useEffect(() => {
    if (currentUser?.role === 'supervisor' && currentUser?.profile_data?.environment) {
      setSelectedEnvironment(currentUser.profile_data.environment);
    }
  }, [currentUser]);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch daily assignments when date or environment changes
  useEffect(() => {
    if (selectedEnvironment) {
      fetchDailyAssignments();
    }
  }, [selectedDate, selectedEnvironment]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching initial data for labor planner...');
      
      const [envResponse, workersResponse] = await Promise.all([
        API.get('/environments'),
        API.get('/users?role=operator,supervisor,packer')
      ]);

      console.log('🌍 Full environments response:', envResponse);
      console.log('👥 Full workers response:', workersResponse);
      
      // Handle the response format - environments API returns { success: true, data: [...] }
      const envData = (envResponse?.data?.data || envResponse?.data || []);
      const workersData = (workersResponse?.data?.data || workersResponse?.data || []);
      
      console.log('🌍 Processed environments data:', envData);
      console.log('👥 Processed workers data:', workersData);
      
      setEnvironments(envData);
      setWorkers(workersData);
      
      if (envData.length === 0) {
        console.warn('⚠️ No environments found! Check API authentication or database.');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch initial data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyAssignments = async () => {
    try {
      // Get yesterday's date for continuity suggestions
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Fetch today's active machines (machines with orders for today)
      const machinesResponse = await API.get(`/machines/daily-active?date=${selectedDate}&environment=${selectedEnvironment}`);
      
      // Fetch today's assignments
      const assignmentsResponse = await API.get(
        `/labor-assignments?start_date=${selectedDate}&end_date=${selectedDate}&environment=${selectedEnvironment}`
      );

      // Fetch yesterday's assignments for continuity suggestions
      const yesterdayResponse = await API.get(
        `/labor-assignments?start_date=${yesterdayStr}&end_date=${yesterdayStr}&environment=${selectedEnvironment}`
      );

      // Separate active and idle machines
      const allMachines = machinesResponse.data || [];
      const active = allMachines.filter(m => m.has_orders_today);
      const idle = allMachines.filter(m => !m.has_orders_today);

      setActiveMachines(active);
      setIdleMachines(idle);
      setAssignments(assignmentsResponse.data || []);
      setYesterdayAssignments(yesterdayResponse.data || []);
      
      // Check if day is locked
      checkDayLockStatus();
      
    } catch (error) {
      console.error('Failed to fetch daily assignments:', error);
    }
  };

  const checkDayLockStatus = () => {
    // Day is locked if it's past 06:00 on the selected day (unless admin)
    const now = new Date();
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(6, 0, 0, 0); // 06:00 on selected date
    
    setIsDayLocked(now > selectedDateTime && currentUser?.role !== 'admin');
  };

  const handleAssignmentChange = async (machineId, shift, role, workerId) => {
    if (isDayLocked && currentUser?.role !== 'admin') return;

    try {
      const assignmentData = {
        employee_id: workerId,
        machine_id: machineId,
        assignment_date: selectedDate,
        shift_type: shift,
        role: role,
        start_time: shift === 'day' ? '06:00' : '18:00',
        end_time: shift === 'day' ? '18:00' : '06:00'
      };

      if (workerId) {
        // Create or update assignment
        await API.post('/labor-assignments', assignmentData);
      } else {
        // Remove assignment
        const existingAssignment = assignments.find(a => 
          a.machine_id === machineId && 
          a.assignment_date === selectedDate && 
          a.shift_type === shift && 
          a.role === role
        );
        if (existingAssignment) {
          await API.delete(`/labor-assignments/${existingAssignment.id}`);
        }
      }

      // Refresh assignments
      await fetchDailyAssignments();
      
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const handleAutoPopulate = async () => {
    try {
      setSaving(true);
      
      // Auto-populate based on yesterday's assignments and availability
      await API.post('/labor-assignments/auto-populate-daily', {
        date: selectedDate,
        environment: selectedEnvironment
      });

      await fetchDailyAssignments();
    } catch (error) {
      console.error('Failed to auto-populate assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLockDay = async () => {
    try {
      setSaving(true);
      await API.post('/labor-assignments/lock-daily', {
        date: selectedDate,
        environment: selectedEnvironment
      });
      
      setIsDayLocked(true);
    } catch (error) {
      console.error('Failed to lock day:', error);
    } finally {
      setSaving(false);
    }
  };

  const validateDailyAssignments = () => {
    const errors = [];
    
    // Check for required coverage on active machines
    activeMachines.forEach(machine => {
      if (machine.day_shift_active) {
        const dayAssignments = assignments.filter(a => 
          a.machine_id === machine.id && a.shift_type === 'day'
        );
        if (dayAssignments.length === 0) {
          errors.push(`${machine.name}: Missing day shift operator`);
        }
      }
      
      if (machine.night_shift_active) {
        const nightAssignments = assignments.filter(a => 
          a.machine_id === machine.id && a.shift_type === 'night'
        );
        if (nightAssignments.length === 0) {
          errors.push(`${machine.name}: Missing night shift operator`);
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading daily planning system...</span>
        </div>
      </div>
    );
  }

  // Filter environments for supervisors
  const availableEnvironments = currentUser?.role === 'supervisor' 
    ? environments.filter(env => env.code === currentUser.profile_data?.environment)
    : environments;

  const selectedEnvData = environments.find(env => env.code === selectedEnvironment);
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Labor Planning</h1>
          <p className="text-gray-600 mt-1">Assign workers to today's active machines and orders</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Environment Selector */}
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={currentUser?.role === 'supervisor'}
          >
            <option value="">Select Environment</option>
            {availableEnvironments.map(env => (
              <option key={env.id} value={env.code}>
                {env.name}
              </option>
            ))}
          </select>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-gray-900 min-w-48 text-center">
              {formatTodaysDate(selectedDate)}
            </span>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!selectedEnvironment ? (
        <div className="text-center py-12">
          <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Environment</h3>
          <p className="text-gray-500">Choose an environment to start planning today's worker assignments</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <button
              onClick={handleAutoPopulate}
              disabled={saving || isDayLocked}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              Auto-Populate
            </button>

            <button
              onClick={handleLockDay}
              disabled={saving || isDayLocked}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {isDayLocked ? 'Day Locked' : 'Validate & Lock'}
            </button>

            {isDayLocked && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Today's schedule is locked</span>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{validationErrors.length} gaps found</span>
              </div>
            )}
          </div>

          {/* Environment Support Roles */}
          {selectedEnvData && (
            <DailyEnvironmentSupport
              environment={selectedEnvironment}
              workers={workers}
              assignments={assignments}
              yesterdayAssignments={yesterdayAssignments}
              onAssignmentChange={handleAssignmentChange}
              selectedDate={selectedDate}
              isLocked={isDayLocked}
            />
          )}

          {/* Active Machines Today */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                <Play className="w-5 h-5" />
                ACTIVE MACHINES TODAY ({activeMachines.length})
              </h3>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-12 gap-4 py-4 px-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <div className="col-span-3">Machine & Order</div>
              <div className="col-span-4 text-center flex items-center justify-center gap-2">
                <Sun className="w-4 h-4 text-yellow-600" />
                Day Shift (06:00-18:00)
              </div>
              <div className="col-span-4 text-center flex items-center justify-center gap-2">
                <Moon className="w-4 h-4 text-blue-600" />
                Night Shift (18:00-06:00)
              </div>
              <div className="col-span-1 text-center">Status</div>
            </div>

            {/* Machine Rows */}
            <div className="divide-y divide-gray-100">
              {activeMachines.length === 0 ? (
                <div className="text-center py-12">
                  <Pause className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active machines for {selectedEnvironment} today</p>
                  <p className="text-gray-400 text-sm">Production Manager needs to confirm today's orders</p>
                </div>
              ) : (
                activeMachines.map(machine => (
                  <DailyMachineRow
                    key={machine.id}
                    machine={machine}
                    workers={workers}
                    assignments={assignments}
                    yesterdayAssignments={yesterdayAssignments}
                    onAssignmentChange={handleAssignmentChange}
                    selectedDate={selectedDate}
                    isLocked={isDayLocked}
                  />
                ))
              )}
            </div>
          </div>

          {/* Idle Machines */}
          <IdleMachinesDisplay 
            idleMachines={idleMachines} 
            environment={selectedEnvironment}
          />

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Assignment Gaps - Need Attention
              </h4>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Daily Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{activeMachines.length}</div>
                  <div className="text-sm text-gray-500">Active Machines</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
                  <div className="text-sm text-gray-500">Worker Assignments</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sun className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignments.filter(a => a.shift_type === 'day').length}
                  </div>
                  <div className="text-sm text-gray-500">Day Shifts</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Moon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignments.filter(a => a.shift_type === 'night').length}
                  </div>
                  <div className="text-sm text-gray-500">Night Shifts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Tab Navigation Component
const TabNavigation = ({ activeTab, onTabChange, tabs = [] }) => {
  return (
    <div className="flex gap-0 bg-white shadow-sm border border-gray-100 rounded-xl p-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ${
              isActive 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-base">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Main Labor Management System Component
export const LaborManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('planning');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate] = useState(getCurrentSASTDateString());

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await API.get('/auth/me');
      setCurrentUser(response.user || response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const tabs = [
    {
      id: 'planning',
      label: 'Daily Planning',
      icon: Calendar,
      component: DailyPlanningInterface
    },
    {
      id: 'attendance',
      label: 'Daily Attendance',
      icon: UserCheck,
      component: AttendanceModule
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-full space-y-6">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 pb-4">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />
      </div>

      {/* Active Tab Content */}
      <div className="space-y-6">
        {ActiveComponent && (
          <ActiveComponent 
            currentUser={currentUser}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
};

export default LaborManagementSystem;