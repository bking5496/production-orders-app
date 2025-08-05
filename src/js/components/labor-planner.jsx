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
  Filter
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

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

const getWeekEnd = (date) => {
  const d = new Date(getWeekStart(date));
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
};

const formatWeekRange = (startDate) => {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

// Enhanced Worker Selection Component with Availability Status
const WorkerSelect = ({ 
  value, 
  onChange, 
  role, 
  environment, 
  shift, 
  date, 
  machineId, 
  workers, 
  assignments, 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter workers by role
  const availableWorkers = workers.filter(worker => {
    if (role === 'supervisor') return worker.role === 'supervisor';
    if (role === 'forklift') return worker.role === 'operator'; // Forklift drivers are operators with special skills
    return worker.role === 'operator' || worker.role === 'packer';
  });

  // Check worker availability
  const getWorkerStatus = (workerId) => {
    const workerAssignments = assignments.filter(a => 
      a.employee_id === workerId && 
      a.assignment_date === date
    );

    // Check if already assigned to this exact slot
    const currentAssignment = workerAssignments.find(a => 
      a.machine_id === machineId && a.shift_type === shift && a.role === role
    );
    if (currentAssignment) return 'current';

    // Check if assigned elsewhere
    if (workerAssignments.length > 0) {
      return 'assigned'; // Already assigned elsewhere
    }

    return 'available';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'assigned': return 'text-yellow-600 bg-yellow-50';
      case 'current': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-3 h-3" />;
      case 'assigned': return <Clock className="w-3 h-3" />;
      case 'current': return <User className="w-3 h-3" />;
      default: return null;
    }
  };

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
            {availableWorkers.map(worker => {
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
                      {worker.employee_code} • {worker.role}
                      {status === 'assigned' && ' • Already assigned'}
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

// Machine Row Component for Planning Grid
const MachineRow = ({ 
  machine, 
  workers, 
  assignments, 
  onAssignmentChange, 
  selectedDate,
  isLocked = false
}) => {
  const getMachineAssignments = (shift) => {
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

  // Determine required roles based on machine type and capacity
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
        </div>
      </div>

      {/* Day Shift Assignments */}
      <div className="col-span-4 grid grid-cols-2 gap-2">
        {requiredRoles.map(role => (
          <WorkerSelect
            key={`day-${role}`}
            value={getAssignedWorker('day', role)}
            onChange={(workerId) => handleAssignmentChange('day', role, workerId)}
            role={role}
            environment={machine.environment}
            shift="day"
            date={selectedDate}
            machineId={machine.id}
            workers={workers}
            assignments={assignments}
            className="text-sm"
          />
        ))}
      </div>

      {/* Night Shift Assignments */}
      <div className="col-span-4 grid grid-cols-2 gap-2">
        {requiredRoles.map(role => (
          <WorkerSelect
            key={`night-${role}`}
            value={getAssignedWorker('night', role)}
            onChange={(workerId) => handleAssignmentChange('night', role, workerId)}
            role={role}
            environment={machine.environment}
            shift="night"
            date={selectedDate}
            machineId={machine.id}
            workers={workers}
            assignments={assignments}
            className="text-sm"
          />
        ))}
      </div>

      {/* Status Indicator */}
      <div className="col-span-1 flex items-center justify-center">
        {isLocked ? (
          <Lock className="w-4 h-4 text-gray-400" />
        ) : (
          <div className="flex items-center gap-1">
            {getMachineAssignments('day').length > 0 && (
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Day shift assigned" />
            )}
            {getMachineAssignments('night').length > 0 && (
              <div className="w-2 h-2 bg-blue-400 rounded-full" title="Night shift assigned" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Environment Support Roles Component
const EnvironmentSupport = ({ 
  environment, 
  workers, 
  assignments, 
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
        {environment.toUpperCase()} ENVIRONMENT SUPPORT
      </h3>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <div className="font-medium text-gray-700">Support Role</div>
        </div>
        <div className="col-span-4">
          <div className="font-medium text-gray-700 text-center">Day Shift (06:00-18:00)</div>
        </div>
        <div className="col-span-4">
          <div className="font-medium text-gray-700 text-center">Night Shift (18:00-06:00)</div>
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
            <WorkerSelect
              value={getAssignedWorker('day', role)}
              onChange={(workerId) => handleAssignmentChange('day', role, workerId)}
              role={role}
              environment={environment}
              shift="day"
              date={selectedDate}
              machineId={null}
              workers={workers}
              assignments={assignments}
            />
          </div>
          <div className="col-span-4">
            <WorkerSelect
              value={getAssignedWorker('night', role)}
              onChange={(workerId) => handleAssignmentChange('night', role, workerId)}
              role={role}
              environment={environment}
              shift="night"
              date={selectedDate}
              machineId={null}
              workers={workers}
              assignments={assignments}
            />
          </div>
          <div className="col-span-1"></div>
        </div>
      ))}
    </div>
  );
};

// Weekly Planning Interface
const WeeklyPlanningInterface = ({ currentUser }) => {
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(getCurrentSASTDateString()));
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWeekLocked, setIsWeekLocked] = useState(false);
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

  // Fetch assignments when week or environment changes
  useEffect(() => {
    if (selectedEnvironment) {
      fetchWeeklyAssignments();
    }
  }, [currentWeek, selectedEnvironment]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [envResponse, workersResponse] = await Promise.all([
        API.get('/environments'),
        API.get('/users?role=operator,supervisor,packer')
      ]);

      setEnvironments(envResponse.data || []);
      setWorkers(workersResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAssignments = async () => {
    try {
      const weekEnd = getWeekEnd(currentWeek);
      
      // Fetch machines for the selected environment
      const machinesResponse = await API.get(`/machines?environment=${selectedEnvironment}&status=in_use,available`);
      
      // Fetch assignments for the week
      const assignmentsResponse = await API.get(
        `/labor-assignments?start_date=${currentWeek}&end_date=${weekEnd}&environment=${selectedEnvironment}`
      );

      setMachines(machinesResponse.data || []);
      setAssignments(assignmentsResponse.data || []);
      
      // Check if week is locked (assignments are finalized)
      checkWeekLockStatus();
      
    } catch (error) {
      console.error('Failed to fetch weekly assignments:', error);
    }
  };

  const checkWeekLockStatus = () => {
    // Week is locked if it's the current week and it's past Monday
    const today = new Date(getCurrentSASTDateString());
    const weekStart = new Date(currentWeek);
    const daysDiff = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24));
    
    // Lock after Monday (day 1) unless user is admin
    setIsWeekLocked(daysDiff > 1 && currentUser?.role !== 'admin');
  };

  const handleAssignmentChange = async (machineId, shift, role, workerId) => {
    if (isWeekLocked && currentUser?.role !== 'admin') return;

    try {
      // Create or update assignment
      const assignmentData = {
        employee_id: workerId,
        machine_id: machineId,
        assignment_date: currentWeek, // For weekly planning, we use Monday as reference
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
          a.assignment_date === currentWeek && 
          a.shift_type === shift && 
          a.role === role
        );
        if (existingAssignment) {
          await API.delete(`/labor-assignments/${existingAssignment.id}`);
        }
      }

      // Refresh assignments
      await fetchWeeklyAssignments();
      
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const handleCopyPreviousWeek = async () => {
    try {
      setSaving(true);
      const previousWeek = new Date(currentWeek);
      previousWeek.setDate(previousWeek.getDate() - 7);
      const previousWeekStr = previousWeek.toISOString().split('T')[0];

      await API.post('/labor-assignments/copy-week', {
        source_week: previousWeekStr,
        target_week: currentWeek,
        environment: selectedEnvironment
      });

      await fetchWeeklyAssignments();
    } catch (error) {
      console.error('Failed to copy previous week:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeek = async () => {
    try {
      setSaving(true);
      await API.post('/labor-assignments/finalize-week', {
        week: currentWeek,
        environment: selectedEnvironment
      });
      
      setIsWeekLocked(true);
    } catch (error) {
      console.error('Failed to save week:', error);
    } finally {
      setSaving(false);
    }
  };

  const validateAssignments = () => {
    const errors = [];
    
    // Check for required coverage
    machines.forEach(machine => {
      const dayAssignments = assignments.filter(a => 
        a.machine_id === machine.id && a.shift_type === 'day'
      );
      const nightAssignments = assignments.filter(a => 
        a.machine_id === machine.id && a.shift_type === 'night'
      );

      if (dayAssignments.length === 0) {
        errors.push(`${machine.name}: Missing day shift coverage`);
      }
      if (nightAssignments.length === 0) {
        errors.push(`${machine.name}: Missing night shift coverage`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading labor planning system...</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Weekly Labor Planning</h1>
          <p className="text-gray-600 mt-1">Plan and assign workers to machines for production shifts</p>
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

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-gray-900 min-w-48 text-center">
              Week of {formatWeekRange(currentWeek)}
            </span>
            <button
              onClick={() => navigateWeek(1)}
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
          <p className="text-gray-500">Choose an environment to start planning worker assignments</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <button
              onClick={handleCopyPreviousWeek}
              disabled={saving || isWeekLocked}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy Previous Week
            </button>

            <button
              onClick={handleSaveWeek}
              disabled={saving || isWeekLocked}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isWeekLocked ? 'Week Locked' : 'Save & Lock Week'}
            </button>

            {isWeekLocked && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Week is finalized</span>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{validationErrors.length} issues found</span>
              </div>
            )}
          </div>

          {/* Environment Support Roles */}
          {selectedEnvData && (
            <EnvironmentSupport
              environment={selectedEnvironment}
              workers={workers}
              assignments={assignments}
              onAssignmentChange={handleAssignmentChange}
              selectedDate={currentWeek}
              isLocked={isWeekLocked}
            />
          )}

          {/* Planning Grid */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-12 gap-4 py-4 px-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <div className="col-span-3">Machine</div>
              <div className="col-span-4 text-center">Day Shift (06:00-18:00)</div>
              <div className="col-span-4 text-center">Night Shift (18:00-06:00)</div>
              <div className="col-span-1 text-center">Status</div>
            </div>

            {/* Machine Rows */}
            <div className="divide-y divide-gray-100">
              {machines.length === 0 ? (
                <div className="text-center py-12">
                  <Factory className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No machines found for {selectedEnvironment}</p>
                </div>
              ) : (
                machines.map(machine => (
                  <MachineRow
                    key={machine.id}
                    machine={machine}
                    workers={workers}
                    assignments={assignments}
                    onAssignmentChange={handleAssignmentChange}
                    selectedDate={currentWeek}
                    isLocked={isWeekLocked}
                  />
                ))
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Assignment Issues
              </h4>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Factory className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{machines.length}</div>
                  <div className="text-sm text-gray-500">Total Machines</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
                  <div className="text-sm text-gray-500">Total Assignments</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
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
                  <Clock className="w-5 h-5 text-purple-600" />
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
      label: 'Weekly Planning',
      icon: Calendar,
      component: WeeklyPlanningInterface
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