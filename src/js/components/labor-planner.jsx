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
    role: 'operator',
    start_time: '',
    end_time: '',
    hourly_rate: ''
  });

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

  const handleAssignWorker = (machine, shift) => {
    setSelectedMachine(machine);
    setSelectedShift(shift);
    setAssignmentForm({
      employee_id: '',
      role: 'operator',
      start_time: shift === 'day' ? '06:00' : '18:00',
      end_time: shift === 'day' ? '18:00' : '06:00',
      hourly_rate: '150.00'
    });
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async () => {
    try {
      const assignmentData = {
        employee_id: parseInt(assignmentForm.employee_id),
        machine_id: selectedMachine.id,
        assignment_date: selectedDate,
        shift_type: selectedShift,
        role: assignmentForm.role,
        start_time: assignmentForm.start_time,
        end_time: assignmentForm.end_time,
        hourly_rate: parseFloat(assignmentForm.hourly_rate)
      };

      await API.post('/labor-assignments', assignmentData);
      
      // Refresh assignments
      fetchExistingAssignments();
      setShowAssignmentModal(false);
      
      alert('Worker assigned successfully!');
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to assign worker: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      await API.delete(`/labor-assignments/${assignmentId}`);
      fetchExistingAssignments();
      alert('Assignment removed successfully!');
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment: ' + (error.response?.data?.error || error.message));
    }
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
                    <div className="text-xs text-gray-600">
                      {machine.operators_per_shift} operators
                      {machine.hopper_loaders_per_shift > 0 && `, ${machine.hopper_loaders_per_shift} hopper loaders`}
                      {machine.packers_per_shift > 0 && `, ${machine.packers_per_shift} packers`}
                    </div>
                  </div>
                </div>
                
                {/* Shift Assignments */}
                <div className="border-t pt-4">
                  <div className="grid gap-4">
                    {machine.scheduled_shifts.map(shift => {
                      const assignmentKey = `${machine.id}-${shift}`;
                      const shiftAssignments = assignments[assignmentKey] || [];
                      
                      return (
                        <div key={shift} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                shift === 'day' ? 'bg-yellow-100 text-yellow-800' :
                                shift === 'night' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
                              </span>
                              <span className="text-sm text-gray-600">
                                ({shiftAssignments.length}/{machine.operators_per_shift} assigned)
                              </span>
                            </div>
                            <Button
                              onClick={() => handleAssignWorker(machine, shift)}
                              size="sm"
                              variant="outline"
                              leftIcon={<Plus className="w-4 h-4" />}
                            >
                              Assign Worker
                            </Button>
                          </div>
                          
                          {shiftAssignments.length > 0 ? (
                            <div className="space-y-2">
                              {shiftAssignments.map(assignment => (
                                <div key={assignment.id} className="flex items-center justify-between bg-white rounded p-3 border">
                                  <div className="flex items-center gap-3">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {assignment.username || `Employee #${assignment.employee_id}`}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {assignment.role} • {assignment.start_time} - {assignment.end_time}
                                        {assignment.hourly_rate && ` • R${assignment.hourly_rate}/hr`}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No workers assigned to this shift</p>
                          )}
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
          title={`Assign Worker to ${selectedMachine?.name || 'Machine'}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Assignment Details</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Machine: {selectedMachine?.name} • Shift: {selectedShift} • Date: {selectedDate}
                  </p>
                </div>
                <Factory className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  id="employee-select"
                  value={assignmentForm.employee_id}
                  onChange={(e) => setAssignmentForm({...assignmentForm, employee_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} {user.first_name ? `(${user.first_name} ${user.last_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  id="role-select"
                  value={assignmentForm.role}
                  onChange={(e) => setAssignmentForm({...assignmentForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="operator">Operator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="technician">Technician</option>
                  <option value="quality_inspector">Quality Inspector</option>
                  <option value="material_handler">Material Handler</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    id="start-time"
                    type="time"
                    value={assignmentForm.start_time}
                    onChange={(e) => setAssignmentForm({...assignmentForm, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    id="end-time"
                    type="time"
                    value={assignmentForm.end_time}
                    onChange={(e) => setAssignmentForm({...assignmentForm, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="hourly-rate" className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate (R)
                </label>
                <input
                  id="hourly-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={assignmentForm.hourly_rate}
                  onChange={(e) => setAssignmentForm({...assignmentForm, hourly_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="150.00"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowAssignmentModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignment}
              disabled={!assignmentForm.employee_id || !assignmentForm.role || !assignmentForm.start_time || !assignmentForm.end_time}
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