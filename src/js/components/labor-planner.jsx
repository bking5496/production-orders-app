import React, { useState, useEffect } from 'react';
import { Calendar, Factory, Plus, Users, X } from 'lucide-react';
import API from '../core/api';
import { Modal, Button } from './ui-components.jsx';

const LaborPlanner = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [scheduledMachines, setScheduledMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedShift, setSelectedShift] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [assignmentForm, setAssignmentForm] = useState({
    employee_id: '',
    role: 'operator'
  });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Fetch scheduled machines when date changes
  useEffect(() => {
    fetchScheduledMachines();
    fetchAvailableUsers();
    fetchExistingAssignments();
  }, [selectedDate]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await API.get('/users');
      setAvailableUsers(response?.data || response || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchExistingAssignments = async () => {
    try {
      const response = await API.get(`/labor-assignments?date=${selectedDate}`);
      const assignmentData = {};
      (response?.data || response || []).forEach(assignment => {
        const key = `${assignment.machine_id}-${assignment.shift_type}`;
        if (!assignmentData[key]) assignmentData[key] = [];
        assignmentData[key].push(assignment);
      });
      setAssignments(assignmentData);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchScheduledMachines = async () => {
    try {
      setLoading(true);
      console.log(`Fetching machines for date: ${selectedDate}`);
      console.log('Current auth token:', localStorage.getItem('token') ? 'Present' : 'MISSING');
      
      // Fetch machines that have labor assignments for the selected date
      const response = await API.get(`/labor-planner/machines`, { date: selectedDate });
      console.log('API Response:', response);
      
      // Handle different response formats
      let machines = [];
      if (Array.isArray(response)) {
        machines = response;
      } else if (response.data && Array.isArray(response.data)) {
        machines = response.data;
      } else if (response.success && Array.isArray(response.data)) {
        machines = response.data;
      }
      
      console.log(`Found ${machines.length} machines for ${selectedDate}:`, machines);
      
      // Process machines data
      const processedMachines = machines.map(machine => ({
        id: machine.machine_id,
        name: machine.machine_name || `Machine ${machine.machine_id}`,
        order_number: machine.order_number || 'No active order',
        product_name: machine.product_name || 'N/A',
        order_status: machine.order_status || 'N/A',
        environment: machine.environment,
        scheduled_shifts: Array.isArray(machine.scheduled_shifts) ? 
          machine.scheduled_shifts.filter(s => s !== null) : [],
        // Get machine config from database
        operators_per_shift: machine.operators_per_shift || 1,
        hopper_loaders_per_shift: machine.hopper_loaders_per_shift || 0,
        packers_per_shift: machine.packers_per_shift || 0
      }));
      
      console.log(`Processed ${processedMachines.length} machines:`, processedMachines);
      setScheduledMachines(processedMachines);
    } catch (error) {
      console.error('Failed to fetch scheduled machines:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status
      });
      setScheduledMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorker = (machine, shift, role = 'operator') => {
    setSelectedMachine(machine);
    setSelectedShift(shift);
    setAssignmentForm({
      employee_id: '',
      role: role
    });
    setEmployeeSearch('');
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async () => {
    try {
      // Set default times based on shift
      const defaultTimes = {
        day: { start_time: '06:00', end_time: '18:00' },
        night: { start_time: '18:00', end_time: '06:00' }
      };

      const assignmentData = {
        employee_id: parseInt(assignmentForm.employee_id),
        machine_id: selectedMachine.id,
        assignment_date: selectedDate,
        shift_type: selectedShift,
        role: assignmentForm.role,
        start_time: defaultTimes[selectedShift]?.start_time || '08:00',
        end_time: defaultTimes[selectedShift]?.end_time || '17:00',
        hourly_rate: 150.00
      };

      await API.post('/labor-assignments', assignmentData);
      
      // Refresh assignments
      fetchExistingAssignments();
      setShowAssignmentModal(false);
      
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to assign worker: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await API.delete(`/labor-assignments/${assignmentId}`);
      fetchExistingAssignments();
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  // Helper function to get filtered employees based on search
  const getFilteredEmployees = () => {
    if (!employeeSearch.trim()) return availableUsers;
    const searchLower = employeeSearch.toLowerCase();
    return availableUsers.filter(user => 
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower)
    );
  };

  // Helper function to get role requirements for a machine
  const getRoleRequirements = (machine) => {
    return [
      { role: 'operator', required: machine.operators_per_shift || 2, label: 'Operators' },
      { role: 'hopper_loader', required: machine.hopper_loaders_per_shift || 1, label: 'Hopper Loaders' },
      { role: 'packer', required: machine.packers_per_shift || 3, label: 'Packers' }
    ].filter(req => req.required > 0);
  };

  // Helper function to count assignments by role for a machine-shift combination
  const getAssignmentCounts = (machineId, shift) => {
    const assignmentKey = `${machineId}-${shift}`;
    const shiftAssignments = assignments[assignmentKey] || [];
    
    const counts = {};
    shiftAssignments.forEach(assignment => {
      counts[assignment.role] = (counts[assignment.role] || 0) + 1;
    });
    
    return counts;
  };

  return (
    <div className="p-6">
      {/* Header with Date Picker */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Labor Planning</h1>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
            Select Date:
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Scheduled Machines */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Scheduled Machines for {selectedDate}
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scheduled machines...</p>
          </div>
        ) : scheduledMachines.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No machines scheduled for {selectedDate}</p>
            <div className="text-sm text-gray-500 mt-2">
              <p>Try these dates with scheduled machines:</p>
              <div className="mt-2 space-x-2">
                <button 
                  onClick={() => setSelectedDate('2025-08-07')}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  Aug 7 (14 machines)
                </button>
                <button 
                  onClick={() => setSelectedDate('2025-08-08')}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  Aug 8 (1 machine)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledMachines.map(machine => (
              <div key={machine.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{machine.name}</h3>
                    <p className="text-sm text-blue-600">Order: {machine.order_number}</p>
                    {machine.product_name && machine.product_name !== 'N/A' && (
                      <p className="text-sm text-gray-600">Product: {machine.product_name}</p>
                    )}
                    <p className="text-xs text-gray-500">Status: {machine.order_status}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Shifts:</span>
                      {machine.scheduled_shifts.map(shift => (
                        <span 
                          key={shift}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            shift === 'day' ? 'bg-yellow-100 text-yellow-800' :
                            shift === 'night' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}
                        >
                          {shift}
                        </span>
                      ))}
                      {machine.scheduled_shifts.length === 0 && (
                        <span className="text-xs text-red-500">No shifts assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Required per shift:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      {getRoleRequirements(machine).map(req => (
                        <div key={req.role} className="flex items-center justify-end gap-2">
                          <span className="text-gray-500">{req.required}</span>
                          <span className="font-medium">{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Shift Assignments - Side by Side Layout */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {['day', 'night'].map(shift => {
                      const isScheduled = machine.scheduled_shifts.includes(shift);
                      const assignmentKey = `${machine.id}-${shift}`;
                      const shiftAssignments = assignments[assignmentKey] || [];
                      const roleRequirements = getRoleRequirements(machine);
                      const assignmentCounts = getAssignmentCounts(machine.id, shift);
                      
                      return (
                        <div key={shift} className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border shadow-sm ${
                          isScheduled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                                shift === 'day' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200' :
                                'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200'
                              }`}>
                                {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
                              </span>
                              {!isScheduled && (
                                <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                                  Not Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {isScheduled && (
                            <div className="mb-3 flex items-center gap-2 flex-wrap">
                              {roleRequirements.map(req => {
                                const assigned = assignmentCounts[req.role] || 0;
                                const isComplete = assigned >= req.required;
                                return (
                                  <span key={req.role} className={`px-2 py-1 rounded-md text-xs font-medium border ${
                                    isComplete ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {req.label}: {assigned}/{req.required}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Role-based assignment sections */}
                          <div className="space-y-3">
                            {roleRequirements.map(req => {
                              const roleAssignments = shiftAssignments.filter(a => a.role === req.role);
                              const needed = Math.max(0, req.required - roleAssignments.length);
                              
                              return (
                                <div key={req.role} className={`bg-white rounded-lg p-3 border shadow-sm ${
                                  isScheduled ? 'border-gray-100' : 'border-gray-50 bg-gray-50'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${isScheduled ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {req.label}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        !isScheduled ? 'bg-gray-200 text-gray-500' :
                                        roleAssignments.length >= req.required ? 
                                        'bg-green-100 text-green-800' : 
                                        'bg-orange-100 text-orange-800'
                                      }`}>
                                        {roleAssignments.length}/{req.required}
                                      </span>
                                    </div>
                                    {isScheduled && needed > 0 && (
                                      <Button
                                        onClick={() => handleAssignWorker(machine, shift, req.role)}
                                        size="sm"
                                        variant="outline"
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 shadow-sm"
                                        leftIcon={<Plus className="w-3 h-3" />}
                                      >
                                        Add {req.label.slice(0, -1)}
                                      </Button>
                                    )}
                                  </div>

                                  {roleAssignments.length > 0 ? (
                                    <div className="space-y-2">
                                      {roleAssignments.map(assignment => (
                                        <div key={assignment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-100">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                              <Users className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900 text-sm">
                                                {assignment.username || `Employee #${assignment.employee_id}`}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {assignment.start_time} - {assignment.end_time}
                                              </p>
                                            </div>
                                          </div>
                                          {isScheduled && (
                                            <Button
                                              onClick={() => handleRemoveAssignment(assignment.id)}
                                              size="sm"
                                              variant="ghost"
                                              className="w-6 h-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className={`text-xs italic text-center py-2 ${
                                      isScheduled ? 'text-gray-400' : 'text-gray-300'
                                    }`}>
                                      No {req.label.toLowerCase()} assigned
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker Assignment Modal */}
      {showAssignmentModal && (
        <Modal
          isOpen={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          title={`Assign ${assignmentForm.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} to ${selectedMachine?.name || 'Machine'}`}
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">Assignment Details</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Machine: <span className="font-medium">{selectedMachine?.name}</span> • 
                    Shift: <span className="font-medium">{selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1)}</span> • 
                    Date: <span className="font-medium">{selectedDate}</span>
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Factory className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="employee-search" className="block text-sm font-semibold text-gray-700 mb-3">
                  Search Employee *
                </label>
                <div className="relative">
                  <input
                    id="employee-search"
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all duration-200"
                    placeholder="Type to search employees..."
                  />
                  <Users className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                
                {/* Employee List */}
                <div className="mt-3 max-h-40 overflow-y-auto border-2 border-gray-100 rounded-xl bg-white shadow-sm">
                  {getFilteredEmployees().slice(0, 8).map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setAssignmentForm({...assignmentForm, employee_id: user.id.toString()});
                        setEmployeeSearch(`${user.username} ${user.first_name ? `(${user.first_name} ${user.last_name})` : ''}`);
                      }}
                      className={`p-3 cursor-pointer transition-all duration-150 hover:bg-blue-50 border-b border-gray-50 last:border-b-0 ${
                        assignmentForm.employee_id === user.id.toString() ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.username}</p>
                          {user.first_name && (
                            <p className="text-xs text-gray-500">{user.first_name} {user.last_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getFilteredEmployees().length === 0 && (
                    <p className="p-4 text-gray-500 text-sm text-center">No employees found</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="role-select" className="block text-sm font-semibold text-gray-700 mb-3">
                  Role *
                </label>
                <select
                  id="role-select"
                  value={assignmentForm.role}
                  onChange={(e) => setAssignmentForm({...assignmentForm, role: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all duration-200 bg-white"
                  required
                >
                  <option value="operator">Operator</option>
                  <option value="hopper_loader">Hopper Loader</option>
                  <option value="packer">Packer</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="technician">Technician</option>
                  <option value="quality_inspector">Quality Inspector</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button
              onClick={() => setShowAssignmentModal(false)}
              variant="outline"
              className="px-6 py-2.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignment}
              disabled={!assignmentForm.employee_id || !assignmentForm.role}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              Assign Worker
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// For compatibility with existing imports
export const LaborManagementSystem = LaborPlanner;

export default LaborPlanner;