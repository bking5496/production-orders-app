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
  X
} from 'lucide-react';
import API from '../core/api';
import AttendanceModule from '../modules/attendance-module-simple.jsx';

const getCurrentSASTDateString = () => {
  const now = new Date();
  now.setHours(now.getHours() + 2); // Convert to SAST (UTC+2)
  return now.toISOString().split('T')[0];
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

// Simple Workers Module
const WorkersModule = ({ assignments = [], onShowNotification }) => {
  const [employees, setEmployees] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/users');
      setEmployees(response || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      onShowNotification?.('Failed to load employee data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredWorkers = useMemo(() => {  
    if (!workerSearch) return employees;
    
    return employees.filter(employee => {
      const searchTerm = workerSearch.toLowerCase();
      const fullName = employee.fullName?.toLowerCase() || '';
      const username = employee.username?.toLowerCase() || '';
      const employeeCode = employee.employee_code?.toLowerCase() || '';
      const role = employee.role?.toLowerCase() || '';
      
      return fullName.includes(searchTerm) ||
             username.includes(searchTerm) ||
             employeeCode.includes(searchTerm) ||
             role.includes(searchTerm);
    });
  }, [employees, workerSearch]);

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading employee data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Team Management</h2>
              <p className="text-slate-600 text-sm">Manage employee information and roles</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <input
                type="text"
                placeholder="Search employees..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 text-sm"
              />
            </div>
            
            <button
              onClick={() => fetchEmployees()}
              className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workers Grid */}
        {filteredWorkers.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Team Members ({filteredWorkers.length})
              </h3>
              {workerSearch && (
                <button
                  onClick={() => setWorkerSearch('')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map(employee => {
                const isAssigned = assignments.some(a => a.employee_id === employee.id);
                
                return (
                  <div key={employee.id} className={`bg-white rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-lg ${
                    isAssigned 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-medium text-sm">
                            {employee.employee_code?.slice(0, 2) || employee.username?.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-base truncate">
                            {employee.fullName || 
                             (employee.username ? 
                               employee.username.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                               'N/A')}
                          </p>
                          <p className="text-sm text-slate-600 truncate">
                            {employee.employee_code}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Role:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.role === 'supervisor' ? 'bg-purple-100 text-purple-700' :
                          employee.role === 'operator' ? 'bg-green-100 text-green-700' :
                          employee.role === 'packer' ? 'bg-blue-100 text-blue-700' :
                          employee.role === 'technician' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {employee.role?.charAt(0).toUpperCase() + employee.role?.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Company:</span>
                        <span className="text-sm font-medium text-slate-900 truncate ml-2">
                          {employee.company || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isAssigned 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isAssigned ? 'Assigned' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {workerSearch ? 'No employees found' : 'No employees available'}
            </h3>
            <p className="text-slate-500 mb-4">
              {workerSearch 
                ? 'No employees match your search criteria' 
                : 'No employee data available'}
            </p>
            {workerSearch ? (
              <button 
                onClick={() => setWorkerSearch('')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Clear Search
              </button>
            ) : (
              <p className="text-sm text-slate-400">
                Contact your administrator to add employees
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LaborPlannerContainer = () => {
  const [currentView, setCurrentView] = useState('planning');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [selectedDate, setSelectedDate] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    return dateParam || getCurrentSASTDateString();
  });

  // Show notification function
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  }, []);

  // Get current assignments for selected date
  const currentAssignments = useMemo(() => {
    return assignments.filter(a => a.assignment_date === selectedDate);
  }, [assignments, selectedDate]);

  // Tab configuration
  const tabs = [
    { id: 'planning', label: 'Planning', icon: ClipboardList },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'workers', label: 'Workers', icon: Users }
  ];

  // Simple Planning View
  const PlanningView = () => {
    const [machines, setMachines] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState('');
    const [selectedShift, setSelectedShift] = useState('day');
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
      // Load basic data for planning
      const loadPlanningData = async () => {
        try {
          const [machinesRes, employeesRes] = await Promise.all([
            API.get('/api/machines').catch(() => []),
            API.get('/api/users').catch(() => [])
          ]);
          setMachines(machinesRes || []);
          setEmployees(employeesRes || []);
        } catch (error) {
          console.error('Error loading planning data:', error);
        }
      };
      loadPlanningData();
    }, []);

    const assignEmployee = async (employeeId, machineId, shift) => {
      try {
        await API.post('/api/labor/assignments', {
          employee_id: employeeId,
          machine_id: machineId,
          shift: shift,
          assignment_date: selectedDate
        });
        showNotification('Employee assigned successfully', 'success');
        setShowAssignModal(false);
      } catch (error) {
        showNotification('Failed to assign employee', 'danger');
      }
    };

    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Workforce Planning</h2>
                <p className="text-slate-600 text-sm">Assign employees to machines and shifts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
                className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Assignment */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Machine</label>
                <select 
                  value={selectedMachine}
                  onChange={e => setSelectedMachine(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Machine</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Shift</label>
                <select 
                  value={selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Day Shift</option>
                  <option value="night">Night Shift</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={!selectedMachine}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Assign Employee
                </button>
              </div>
            </div>
          </div>

          {/* Current Assignments */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Current Assignments for {new Date(selectedDate).toLocaleDateString()}
            </h3>
            
            {currentAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentAssignments.map(assignment => (
                  <div key={assignment.id} className="bg-slate-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {assignment.fullName || assignment.username}
                        </p>
                        <p className="text-sm text-slate-600">
                          {assignment.machine_name} • {assignment.shift} shift
                        </p>
                        {assignment.job_role && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-1">
                            {assignment.job_role}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Remove this assignment?')) {
                            // Remove assignment logic would go here
                            showNotification('Assignment removed', 'success');
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No assignments for this date</p>
                <p className="text-sm text-slate-400 mt-1">Use the quick assignment tool above to assign employees</p>
              </div>
            )}
          </div>

          {/* Assignment Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Employee</h3>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {employees.map(employee => (
                      <button
                        key={employee.id}
                        onClick={() => assignEmployee(employee.id, selectedMachine, selectedShift)}
                        className="w-full p-3 text-left hover:bg-slate-50 rounded-lg border transition-colors"
                      >
                        <p className="font-medium text-slate-900">
                          {employee.fullName || employee.username}
                        </p>
                        <p className="text-sm text-slate-600">
                          {employee.employee_code} • {employee.role}
                        </p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Labor Management System</h1>
            <p className="text-gray-600">Mobile-optimized workforce management</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={currentView}
          onTabChange={setCurrentView}
          tabs={tabs}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {currentView === 'planning' && <PlanningView />}
        {currentView === 'attendance' && (
          <AttendanceModule 
            onShowNotification={showNotification}
          />
        )}
        {currentView === 'workers' && (
          <WorkersModule 
            assignments={currentAssignments}
            onShowNotification={showNotification}
          />
        )}
      </div>

      {/* Notification */}  
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'danger' ? 'bg-red-500 text-white' :
          notification.type === 'info' ? 'bg-blue-500 text-white' :
          'bg-gray-500 text-white'
        }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  );
};

// Export the main component
export function LaborManagementSystem() {
  return <LaborPlannerContainer />;
}

export default LaborPlannerContainer;