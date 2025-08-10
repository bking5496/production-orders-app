import React, { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, AlertTriangle, Search, Filter, Download } from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { Modal, Button } from './ui-components.jsx';
import { formatUserDisplayName, formatEmployeeCode } from '../utils/text-utils';

export default function AttendanceRegister() {
    const { user: currentUser } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMachine, setSelectedMachine] = useState('all');
    const [selectedShift, setSelectedShift] = useState('day');
    const [machines, setMachines] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
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

    // Load running machines on component mount
    useEffect(() => {
        loadRunningMachines();
    }, []);

    // Load attendance data when date, machine, or shift changes
    useEffect(() => {
        if (machines.length > 0) {
            loadAttendanceData();
        }
    }, [selectedDate, selectedMachine, selectedShift, machines]);

    const loadRunningMachines = async () => {
        try {
            const response = await API.get('/machines');
            const runningMachines = response.filter(machine => 
                machine.status === 'running' || machine.status === 'active' || machine.status === 'in_use'
            );
            setMachines(runningMachines);
        } catch (error) {
            console.error('Failed to load machines:', error);
        }
    };

    const loadAttendanceData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                date: selectedDate,
                shift: selectedShift
            });
            if (selectedMachine !== 'all') {
                params.append('machine_id', selectedMachine);
            }
            
            const response = await API.get(`/attendance-register?${params}`);
            setAttendanceData(response.data || response);
        } catch (error) {
            console.error('Failed to load attendance data:', error);
            setAttendanceData([]);
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (employeeData, status, checkInTime = null, notes = '') => {
        try {
            const attendanceRecord = {
                date: selectedDate,
                machine_id: employeeData.machine_id,
                employee_id: employeeData.employee_id,
                shift_type: selectedShift,
                status: status,
                check_in_time: checkInTime,
                notes: notes,
                marked_by: currentUser.id
            };

            await API.post('/attendance-register', attendanceRecord);
            loadAttendanceData(); // Refresh data
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
        
        return (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}>
                <IconComponent className="w-4 h-4 mr-1" />
                {statusConfig.label}
            </div>
        );
    };

    const filterAttendanceData = () => {
        // Ensure attendanceData is always an array
        const dataArray = Array.isArray(attendanceData) ? attendanceData : [];
        if (!searchTerm.trim()) return dataArray;
        
        const searchLower = searchTerm.toLowerCase();
        return dataArray.filter(record => 
            record.employee_name?.toLowerCase().includes(searchLower) ||
            record.employee_code?.toLowerCase().includes(searchLower) ||
            record.machine_name?.toLowerCase().includes(searchLower)
        );
    };

    const exportAttendance = () => {
        const csvContent = [
            ['Date', 'Machine', 'Employee Code', 'Employee Name', 'Shift', 'Status', 'Check In', 'Check Out', 'Hours', 'Notes'].join(','),
            ...filterAttendanceData().map(record => [
                selectedDate,
                record.machine_name || 'N/A',
                record.employee_code || 'N/A',
                record.employee_name || 'N/A',
                record.shift_type,
                record.status,
                record.check_in_time || 'N/A',
                record.check_out_time || 'N/A',
                record.hours_worked || 'N/A',
                (record.notes || '').replace(/,/g, ';')
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance-register-${selectedDate}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filteredData = filterAttendanceData();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
                                <span className="cursor-pointer hover:text-white transition-colors">Daily Operations</span>
                                <span>&gt;</span>
                                <span className="text-white font-medium">Attendance Register</span>
                                <span className="ml-2 px-2 py-1 bg-green-500 bg-opacity-20 text-green-200 rounded-full text-xs">Live</span>
                            </div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                <Users className="w-8 h-8" />
                                Daily Attendance Register
                            </h1>
                            <p className="text-blue-100 mt-1">Mark worker attendance for running machines</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-transparent text-white placeholder-blue-200 border-none outline-none text-sm font-medium"
                            />
                        </div>

                        <select
                            value={selectedMachine}
                            onChange={e => setSelectedMachine(e.target.value)}
                            className="bg-white bg-opacity-10 text-white rounded-lg px-3 py-2 text-sm font-medium"
                        >
                            <option value="all">All Machines</option>
                            {machines.map(machine => (
                                <option key={machine.id} value={machine.id} className="text-black">
                                    {machine.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedShift}
                            onChange={e => setSelectedShift(e.target.value)}
                            className="bg-white bg-opacity-10 text-white rounded-lg px-3 py-2 text-sm font-medium"
                        >
                            <option value="day" className="text-black">Day Shift</option>
                            <option value="night" className="text-black">Night Shift</option>
                        </select>

                        <button
                            onClick={exportAttendance}
                            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search and Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees, codes, or machines..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Total: {filteredData.length}</span>
                                <span className="text-green-600">Present: {filteredData.filter(r => r.status === 'present').length}</span>
                                <span className="text-red-600">Absent: {filteredData.filter(r => r.status === 'absent').length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Loading attendance data...</p>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No attendance records found</p>
                                <p className="text-sm text-gray-400">Select a date with active labor assignments</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredData.map((record, index) => (
                                            <tr key={`${record.employee_id}-${record.machine_id}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{record.machine_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatUserDisplayName({ username: record.employee_name })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 font-mono">
                                                        {formatEmployeeCode(record.employee_code)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {record.status ? getStatusBadge(record.status) : (
                                                        <span className="text-gray-400 text-sm">Not marked</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {record.check_in_time 
                                                            ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                                                            : '-'
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {record.hours_worked || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {!record.status ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedEmployee(record);
                                                                setShowMarkModal(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Mark Attendance
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedEmployee(record);
                                                                setShowMarkModal(true);
                                                            }}
                                                            className="text-gray-600 hover:text-gray-800"
                                                        >
                                                            Update
                                                        </button>
                                                    )}
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
                <Modal title="Mark Attendance" onClose={() => setShowMarkModal(false)}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Employee: {formatUserDisplayName({ username: selectedEmployee.employee_name })}</p>
                            <p className="text-sm text-gray-500">Machine: {selectedEmployee.machine_name}</p>
                            <p className="text-sm text-gray-500">Date: {selectedDate} | Shift: {selectedShift}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {attendanceStatuses.map(status => {
                                const IconComponent = status.icon;
                                return (
                                    <button
                                        key={status.value}
                                        onClick={() => markAttendance(selectedEmployee, status.value, new Date().toISOString())}
                                        className={`p-3 rounded-lg border-2 transition-colors hover:bg-${status.color}-50 hover:border-${status.color}-300 flex items-center justify-center gap-2`}
                                    >
                                        <IconComponent className="w-5 h-5" />
                                        <span className="font-medium">{status.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}