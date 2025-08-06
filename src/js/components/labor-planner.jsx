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

  const selectedWorker = value ? availableWorkers.find(w => w.id === parseInt(value)) : null;

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
    <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <span>{environment.toUpperCase()} Support Staff</span>
        </h3>
        <p className="text-blue-100 mt-1">Environment-level support roles and assignments</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Support Roles</div>
          </div>
          <div className="lg:col-span-4">
            <div className="text-center font-medium text-gray-700 flex items-center justify-center gap-2 p-3 bg-yellow-50/80 backdrop-blur-sm rounded-xl border border-yellow-200">
              <Sun className="w-4 h-4 text-yellow-600" />
              <span>Day Shift (06:00-18:00)</span>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="text-center font-medium text-gray-700 flex items-center justify-center gap-2 p-3 bg-purple-50/80 backdrop-blur-sm rounded-xl border border-purple-200">
              <Moon className="w-4 h-4 text-purple-600" />
              <span>Night Shift (18:00-06:00)</span>
            </div>
          </div>
          <div className="lg:col-span-1"></div>
        </div>

        {supportRoles.map(({ role, label, icon: Icon }) => (
          <div key={role} className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 border-t border-gray-200 first:border-t-0">
            <div className="lg:col-span-3 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl shadow-sm">
                <Icon className="w-5 h-5 text-gray-700" />
              </div>
              <span className="font-semibold text-gray-900">{label}</span>
            </div>
            <div className="lg:col-span-4">
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
            <div className="lg:col-span-4">
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
            <div className="lg:col-span-1"></div>
          </div>
        ))}
      </div>
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
      const allMachines = machinesResponse.data || machinesResponse || [];
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
      // Check for duplicate assignments if assigning a worker
      if (workerId) {
        // Check if worker is already assigned on this date/shift
        const existingAssignment = assignments.find(a => 
          a.employee_id === parseInt(workerId) && 
          a.assignment_date === selectedDate &&
          a.shift_type === shift &&
          !(a.machine_id === machineId && a.role === role) // Allow updating same assignment
        );

        if (existingAssignment) {
          alert(`This worker is already assigned as ${existingAssignment.role} on ${shift} shift for ${selectedDate}`);
          return;
        }

        // Check if worker is assigned to opposite shift on same date
        const oppositeShift = shift === 'day' ? 'night' : 'day';
        const oppositeShiftAssignment = assignments.find(a => 
          a.employee_id === parseInt(workerId) && 
          a.assignment_date === selectedDate &&
          a.shift_type === oppositeShift
        );

        if (oppositeShiftAssignment) {
          alert(`This worker is already assigned to ${oppositeShift} shift on ${selectedDate}. Workers cannot work both shifts on the same day.`);
          return;
        }
      }

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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Industrial Header */}
        <div className="bg-white border-l-4 border-blue-600 shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Labor Planning Dashboard</h1>
                  <p className="text-sm text-gray-600">Workforce Assignment & Scheduling</p>
                </div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex items-center gap-4 ml-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{activeMachines.length} Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{assignments.length} Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${validationErrors.length > 0 ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm font-medium text-gray-700">{validationErrors.length} Gaps</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Environment Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Environment:</label>
                <select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium min-w-32"
                  disabled={currentUser?.role === 'supervisor'}
                >
                  <option value="">Select</option>
                  {availableEnvironments.map(env => (
                    <option key={env.id} value={env.code}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-1 border border-gray-300 rounded bg-white">
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 border-l border-r border-gray-300 bg-gray-50">
                  <div className="text-sm font-bold text-gray-900 min-w-32 text-center">
                    {formatTodaysDate(selectedDate)}
                  </div>
                </div>
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {!selectedEnvironment ? (
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-12 shadow-xl text-center">
            <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Factory className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Environment</h3>
            <p className="text-gray-600 max-w-md mx-auto">Choose an environment from the dropdown above to start planning worker assignments for active machines and production orders</p>
          </div>
        ) : (
          <div className="space-y-6">
          {/* Modern Quick Actions */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Planning Tools</h2>
                <p className="text-gray-600 text-sm">Manage worker assignments and finalize schedule</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAutoPopulate}
                  disabled={saving || isDayLocked}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Auto-Populate</span>
                </button>

                <button
                  onClick={handleLockDay}
                  disabled={saving || isDayLocked}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">{isDayLocked ? 'Day Locked' : 'Validate & Lock'}</span>
                </button>

                {isDayLocked && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-100/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-amber-200">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">Schedule Locked</span>
                  </div>
                )}
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">{validationErrors.length} Assignment Gaps Found</span>
                </div>
                <p className="text-red-600 text-sm">Please assign workers to all required positions before locking the schedule.</p>
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
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <span>Active Machines ({activeMachines.length})</span>
              </h3>
              <p className="text-green-100 mt-1">Production lines scheduled for today</p>
            </div>

            {/* Modern Grid Header */}
            <div className="p-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Machine & Order</div>
                </div>
                <div className="lg:col-span-4">
                  <div className="text-center font-medium text-gray-700 flex items-center justify-center gap-2 p-3 bg-yellow-50/80 backdrop-blur-sm rounded-xl border border-yellow-200">
                    <Sun className="w-4 h-4 text-yellow-600" />
                    <span>Day Shift (06:00-18:00)</span>
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="text-center font-medium text-gray-700 flex items-center justify-center gap-2 p-3 bg-purple-50/80 backdrop-blur-sm rounded-xl border border-purple-200">
                    <Moon className="w-4 h-4 text-purple-600" />
                    <span>Night Shift (18:00-06:00)</span>
                  </div>
                </div>
                <div className="lg:col-span-1 text-center">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</div>
                </div>
              </div>
            </div>

            {/* Machine Rows */}
            <div className="px-6 pb-6">
              {activeMachines.length === 0 ? (
                <div className="text-center py-16 bg-gray-50/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Pause className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Machines</h3>
                  <p className="text-gray-600 mb-1">No machines scheduled for {selectedEnvironment} on this date</p>
                  <p className="text-gray-500 text-sm">Production Manager needs to assign orders to machines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMachines.map(machine => (
                    <div key={machine.id} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                      <DailyMachineRow
                        machine={machine}
                        workers={workers}
                        assignments={assignments}
                        yesterdayAssignments={yesterdayAssignments}
                        onAssignmentChange={handleAssignmentChange}
                        selectedDate={selectedDate}
                        isLocked={isDayLocked}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900">Assignment Gaps Detected</h4>
                  <p className="text-red-700 text-sm">{validationErrors.length} positions need immediate attention</p>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-100">
                <ul className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-800 text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </div>
      )}
      </div>
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