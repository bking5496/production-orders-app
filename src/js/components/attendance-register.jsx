import React, { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { Modal, Button } from './ui-components.jsx';
import { formatUserDisplayName, formatEmployeeCode } from '../utils/text-utils';

export default function AttendanceRegister() {
    const { user: currentUser } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState('day');
    const [scheduledWorkers, setScheduledWorkers] = useState([]);
    const [availableMachines, setAvailableMachines] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const attendanceStatuses = [
        { value: 'present', label: 'Present', color: 'green', icon: Check },
        { value: 'absent', label: 'Absent', color: 'red', icon: X },
        { value: 'late', label: 'Late', color: 'yellow', icon: Clock },
        { value: 'sick', label: 'Sick Leave', color: 'blue', icon: AlertTriangle },
        { value: 'leave', label: 'Authorized Leave', color: 'purple', icon: Calendar }
    ];

    // Load scheduled workers when date or shift changes
    useEffect(() => {
        loadScheduledWorkers();
    }, [selectedDate, selectedShift]);

    const loadScheduledWorkers = async () => {
        setLoading(true);
        try {
            console.log('🔍 ATTENDANCE REGISTER DEBUG:');
            console.log(`📅 Date: ${selectedDate}, 🕐 Shift: ${selectedShift}`);
            console.log('🔑 Auth token exists:', !!localStorage.getItem('token'));
            
            // Use the attendance register API directly
            const params = new URLSearchParams({
                date: selectedDate,
                shift: selectedShift
            });
            
            console.log(`🌐 API call: /attendance-register?${params}`);
            const response = await API.get(`/attendance-register?${params}`);
            console.log('📥 Raw API response:', response);
            console.log('📥 Response type:', typeof response);
            console.log('📥 Response keys:', response ? Object.keys(response) : 'null');
            
            // Handle the response structure
            let workers = [];
            if (response && response.success && Array.isArray(response.data)) {
                workers = response.data;
                console.log('✅ Using response.data array');
            } else if (response && response.success && response.data === null) {
                workers = [];
                console.log('⚠️ Response data is null, treating as empty array');
            } else if (Array.isArray(response)) {
                workers = response;
                console.log('✅ Using direct response array');
            } else {
                console.log('❌ Unexpected response structure');
                console.log('   Response:', response);
            }
            
            console.log(`👥 Found ${workers.length} scheduled workers:`, workers);
            workers.forEach((worker, index) => {
                console.log(`   ${index + 1}. ${worker.employee_name} (${worker.employee_code}) - ${worker.machine_name}`);
            });
            
            setScheduledWorkers(workers);
            
            // Extract unique machines from the workers
            const machines = [...new Set(workers.map(w => w.machine_name).filter(Boolean))];
            console.log(`🏭 Available machines:`, machines);
            setAvailableMachines(['all', ...machines]);
            
        } catch (error) {
            console.error('❌ Failed to load scheduled workers:', error);
            console.error('❌ Error details:', error.response?.data || error.message);
            setScheduledWorkers([]);
            setAvailableMachines(['all']);
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (worker, status, checkInTime = null, notes = '') => {
        try {
            const attendanceRecord = {
                date: selectedDate,
                machine_id: worker.machine_id,
                employee_id: worker.employee_id,
                shift_type: selectedShift,
                status: status,
                check_in_time: checkInTime,
                notes: notes,
                marked_by: currentUser.id
            };

            console.log('Marking attendance:', attendanceRecord);
            await API.post('/attendance-register', attendanceRecord);
            
            // Refresh data to show updated status
            loadScheduledWorkers();
            setShowMarkModal(false);
            setSelectedEmployee(null);
            
        } catch (error) {
            console.error('Failed to mark attendance:', error);
            alert('Failed to mark attendance: ' + (error.response?.data?.message || error.message));
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = attendanceStatuses.find(s => s.value === status) || attendanceStatuses[0];
        const IconComponent = statusConfig.icon;
        
        if (!status) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Not Marked
                </span>
            );
        }
        
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}>
                <IconComponent className="w-4 h-4 mr-1" />
                {statusConfig.label}
            </span>
        );
    };

    // Filter workers based on search and machine selection
    const filteredWorkers = scheduledWorkers.filter(worker => {
        const matchesSearch = !searchTerm || 
            worker.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.machine_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesMachine = selectedMachine === 'all' || worker.machine_name === selectedMachine;
        
        return matchesSearch && matchesMachine;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                <Users className="w-8 h-8" />
                                Daily Attendance Register
                            </h1>
                            <p className="text-blue-100 mt-1">Mark attendance for scheduled workers</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        {/* Date Selection */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-300" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg border border-white border-opacity-20 focus:border-opacity-40"
                            />
                        </div>

                        {/* Shift Selection */}
                        <select
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                            className="bg-white bg-opacity-20 text-white rounded-lg px-3 py-2"
                        >
                            <option value="day" className="text-black">Day Shift</option>
                            <option value="night" className="text-black">Night Shift</option>
                        </select>

                        {/* Machine Filter */}
                        <select
                            value={selectedMachine}
                            onChange={(e) => setSelectedMachine(e.target.value)}
                            className="bg-white bg-opacity-20 text-white rounded-lg px-3 py-2"
                        >
                            {availableMachines.map((machine) => (
                                <option key={machine} value={machine} className="text-black">
                                    {machine === 'all' ? 'All Machines' : machine}
                                </option>
                            ))}
                        </select>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-300" />
                            <input
                                type="text"
                                placeholder="Search workers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white bg-opacity-20 text-white placeholder-blue-200 pl-10 pr-4 py-2 rounded-lg border border-white border-opacity-20 focus:border-opacity-40"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Scheduled Workers - {selectedDate} ({selectedShift === 'day' ? 'Day' : 'Night'} Shift)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{scheduledWorkers.length}</div>
                            <div className="text-sm text-gray-600">Total Scheduled</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {scheduledWorkers.filter(w => w.status === 'present').length}
                            </div>
                            <div className="text-sm text-gray-600">Present</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {scheduledWorkers.filter(w => w.status === 'absent').length}
                            </div>
                            <div className="text-sm text-gray-600">Absent</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">
                                {scheduledWorkers.filter(w => !w.status).length}
                            </div>
                            <div className="text-sm text-gray-600">Not Marked</div>
                        </div>
                    </div>
                </div>

                {/* Workers Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Loading scheduled workers...</p>
                            </div>
                        ) : filteredWorkers.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No scheduled workers found</p>
                                <p className="text-sm text-gray-400">
                                    {scheduledWorkers.length === 0 
                                        ? `No workers scheduled for ${selectedShift} shift on ${selectedDate}`
                                        : 'Try adjusting your search or machine filter'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredWorkers.map(worker => (
                                            <tr key={`${worker.employee_id}-${worker.machine_id}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                                                            <Users className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {formatUserDisplayName(worker)}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ID: {formatEmployeeCode(worker.employee_code)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{worker.machine_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(worker.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {worker.check_in_time || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEmployee(worker);
                                                            setShowMarkModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        {worker.status ? 'Update' : 'Mark Attendance'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mark Attendance Modal */}
            {showMarkModal && selectedEmployee && (
                <Modal 
                    title="Mark Attendance" 
                    onClose={() => {
                        setShowMarkModal(false);
                        setSelectedEmployee(null);
                    }}
                >
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900">Employee Details</h4>
                            <p className="text-sm text-gray-600">
                                {formatUserDisplayName(selectedEmployee)} ({formatEmployeeCode(selectedEmployee.employee_code)})
                            </p>
                            <p className="text-sm text-gray-600">Machine: {selectedEmployee.machine_name}</p>
                            <p className="text-sm text-gray-600">Shift: {selectedShift === 'day' ? 'Day' : 'Night'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {attendanceStatuses.map(status => {
                                const IconComponent = status.icon;
                                return (
                                    <button
                                        key={status.value}
                                        onClick={() => markAttendance(selectedEmployee, status.value, new Date().toLocaleTimeString())}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors
                                            border-${status.color}-200 hover:border-${status.color}-400 hover:bg-${status.color}-50`}
                                    >
                                        <IconComponent className={`w-5 h-5 text-${status.color}-600`} />
                                        <span className={`text-sm font-medium text-${status.color}-700`}>
                                            {status.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button 
                                variant="secondary" 
                                onClick={() => {
                                    setShowMarkModal(false);
                                    setSelectedEmployee(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}