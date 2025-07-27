import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, Settings, 
    Edit2, Save, Trash2, Upload, Download, Filter, Copy, FileText, Eye, Clock,
    AlertCircle, RefreshCw, PlusCircle, MinusCircle, BarChart3, TrendingUp
} from 'lucide-react';
import API from '../core/api';

// Export utilities
const exportToCSV = (data, filename) => {
    const csvContent = data.map(row => Object.values(row).join(',')).join('\n');
    const headers = Object.keys(data[0] || {}).join(',');
    const fullContent = headers + '\n' + csvContent;
    
    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

const exportToJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

// Enhanced Excel export with proper template structure
const exportToExcel = (assignments, machines, employees, date, supervisorOnDuty) => {
    // Get day of week and format date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Create Excel content with proper structure
    let excelContent = '';
    
    // Header section
    excelContent += `Day of Week,${dayOfWeek}\n`;
    excelContent += `Date,${formattedDate}\n`;
    excelContent += `Supervisor on Duty,${supervisorOnDuty || 'Not Assigned'}\n`;
    excelContent += '\n'; // Empty line separator
    
    // Work table headers
    excelContent += 'Employee Code,Name,Machine,Role,Shift,Company\n';
    
    // Work table data
    assignments.forEach(assignment => {
        const employee = employees.find(e => e.id === assignment.employee_id);
        const machine = machines.find(m => m.id == assignment.machine_id);
        
        if (employee) {
            const row = [
                employee.employee_code || 'N/A',
                employee.fullName || employee.username || 'N/A',
                machine?.name || `Machine ${assignment.machine_id}`,
                employee.role || 'N/A',
                assignment.shift || 'N/A',
                employee.company || 'N/A'
            ].join(',');
            excelContent += row + '\n';
        }
    });
    
    // Create and download file
    const blob = new Blob([excelContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `labor-schedule-${date}.csv`;
    link.click();
};

// Enhanced UI Components
const Card = ({ children, className = "", hover = false }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, size = "md", ...props }) => {
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-300",
        outline: "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50",
    };
    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-lg"
    };
    return (
        <button 
            onClick={onClick} 
            className={`${sizes[size]} rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} 
            disabled={disabled} 
            {...props}
        >
            {children}
        </button>
    );
};

const Modal = ({ children, onClose, title, size = "default" }) => {
    const sizes = {
        sm: "max-w-md",
        default: "max-w-4xl",
        lg: "max-w-6xl",
        xl: "max-w-7xl"
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white rounded-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Badge = ({ children, variant = "default", size = "sm" }) => {
    const variants = {
        default: "bg-gray-100 text-gray-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800"
    };
    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1 text-sm"
    };
    return (
        <span className={`${sizes[size]} rounded-full font-medium ${variants[variant]}`}>
            {children}
        </span>
    );
};

// Statistics Summary Component
const StatisticsPanel = ({ assignments, machines, employees }) => {
    const stats = useMemo(() => {
        const totalAssignments = assignments.length;
        const uniqueMachines = new Set(assignments.map(a => a.machine_id)).size;
        const uniqueEmployees = new Set(assignments.map(a => a.employee_id)).size;
        const shiftDistribution = assignments.reduce((acc, a) => {
            acc[a.shift] = (acc[a.shift] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalAssignments,
            uniqueMachines,
            uniqueEmployees,
            utilizationRate: machines.length > 0 ? Math.round((uniqueMachines / machines.length) * 100) : 0,
            shiftDistribution
        };
    }, [assignments, machines, employees]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Assignments</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalAssignments}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Settings className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Machines Used</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.uniqueMachines}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Employees Assigned</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.uniqueEmployees}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Utilization</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.utilizationRate}%</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};


// Main Component
export function LaborManagementSystem() {
    const [currentView, setCurrentView] = useState('planning');
    const [machines, setMachines] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [error, setError] = useState(null);

    // Planning state
    const [selectedMachine, setSelectedMachine] = useState('');
    const [selectedShift, setSelectedShift] = useState('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [planningSearch, setPlanningSearch] = useState('');
    const [bulkAssignMode, setBulkAssignMode] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

    // Worker management state
    const [workerSearch, setWorkerSearch] = useState('');
    const [editingWorker, setEditingWorker] = useState(null);

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('csv');
    const [exportDateRange, setExportDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Filtering state
    const [filters, setFilters] = useState({
        machine: '',
        shift: '',
        employee: '',
        status: ''
    });

    const fetchData = useCallback(async (date) => {
        setLoading(true);
        try {
            const [machinesData, employeesData, assignmentsData] = await Promise.all([
                API.get('/machines'),
                API.get('/users'),
                API.get(`/planner/assignments?date=${date}`)
            ]);
            setMachines(machinesData);
            setEmployees(employeesData.filter(u => u.role !== 'admin'));
            setAssignments(assignmentsData);
        } catch (error) {
            showNotification('Failed to load initial data: ' + error.message, 'danger');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const dateToFetch = currentView === 'attendance' ? attendanceDate : selectedDate;
        fetchData(dateToFetch);
    }, [selectedDate, attendanceDate, currentView, fetchData]);
    
    // Memos for filtering
    const currentAssignments = useMemo(() => assignments.filter(a => a.machine_id == selectedMachine && a.shift === selectedShift && a.assignment_date === selectedDate), [assignments, selectedMachine, selectedShift, selectedDate]);
    const attendanceAssignments = useMemo(() => assignments.filter(a => a.assignment_date === attendanceDate), [assignments, attendanceDate]);
    const filteredEmployees = useMemo(() => employees.filter(e => !workerSearch || e.username.toLowerCase().includes(workerSearch.toLowerCase()) || (e.employee_code && e.employee_code.toLowerCase().includes(workerSearch.toLowerCase()))), [employees, workerSearch]);

    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    // API Functions
    const assignEmployee = async (employeeId) => {
        if (currentAssignments.some(a => a.employee_id === employeeId)) return showNotification('Employee already assigned', 'danger');
        if (!selectedMachine) return showNotification('Please select a machine first', 'danger');
        if (!selectedDate) return showNotification('Please select a date first', 'danger');
        
        try {
            console.log('Assigning employee:', { employee_id: employeeId, machine_id: selectedMachine, shift: selectedShift, assignment_date: selectedDate });
            const newAssignment = await API.post('/planner/assignments', { employee_id: employeeId, machine_id: selectedMachine, shift: selectedShift, assignment_date: selectedDate });
            fetchData(selectedDate); // Refetch to get all details
            showNotification('Employee assigned successfully');
        } catch (error) { 
            console.error('Assignment error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to assign employee';
            showNotification(`Assignment failed: ${errorMessage}`, 'danger'); 
        }
    };

    const removeAssignment = async (id) => {
        try {
            await API.delete(`/planner/assignments/${id}`);
            fetchData(selectedDate);
            showNotification('Assignment removed');
        } catch (error) { showNotification('Failed to remove assignment', 'danger'); }
    };

    const updateAttendanceStatus = async (id, status) => {
        try {
            await API.patch(`/planner/assignments/${id}`, { status });
            fetchData(attendanceDate);
            showNotification(`Attendance updated to ${status}`);
        } catch (error) { showNotification('Failed to update status', 'danger'); }
    };
    
    const saveWorkerEdit = async () => {
        try {
            const { id, ...data } = editingWorker;
            await API.put(`/users/${id}`, data);
            fetchData(selectedDate);
            setEditingWorker(null);
            showNotification('Worker updated');
        } catch (error) { showNotification('Failed to update worker', 'danger'); }
    };

    // Enhanced export functionality
    const handleExport = async () => {
        try {
            setLoading(true);
            const response = await API.get(`/planner/assignments/export`, {
                params: {
                    startDate: exportDateRange.start,
                    endDate: exportDateRange.end,
                    format: exportFormat
                }
            });
            
            const exportData = response.map(assignment => ({
                'Assignment ID': assignment.id,
                'Date': assignment.assignment_date,
                'Machine': assignment.machine_name || `Machine ${assignment.machine_id}`,
                'Employee': assignment.fullName || assignment.username,
                'Employee Code': assignment.employee_code,
                'Shift': assignment.shift,
                'Status': assignment.status,
                'Role': assignment.role
            }));

            const filename = `labor-assignments-${exportDateRange.start}-to-${exportDateRange.end}.${exportFormat}`;
            
            if (exportFormat === 'csv') {
                exportToCSV(exportData, filename);
            } else {
                exportToJSON(exportData, filename);
            }
            
            showNotification(`Exported ${exportData.length} assignments to ${exportFormat.toUpperCase()}`, 'success');
            setShowExportModal(false);
        } catch (error) {
            showNotification('Export failed: ' + error.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Bulk assignment functionality
    const handleBulkAssign = async () => {
        if (selectedEmployees.length === 0) {
            showNotification('Please select employees to assign', 'warning');
            return;
        }
        if (!selectedMachine) {
            showNotification('Please select a machine first', 'warning');
            return;
        }

        try {
            const promises = selectedEmployees.map(employeeId => 
                API.post('/planner/assignments', {
                    employee_id: employeeId,
                    machine_id: selectedMachine,
                    shift: selectedShift,
                    assignment_date: selectedDate
                })
            );
            
            await Promise.all(promises);
            fetchData(selectedDate);
            setSelectedEmployees([]);
            setBulkAssignMode(false);
            showNotification(`Successfully assigned ${selectedEmployees.length} employees`, 'success');
        } catch (error) {
            showNotification('Bulk assignment failed: ' + error.message, 'danger');
        }
    };

    // Copy assignments from previous day
    const copyFromPreviousDay = async () => {
        const previousDate = new Date(selectedDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const prevDateStr = previousDate.toISOString().split('T')[0];
        
        try {
            const prevAssignments = await API.get(`/planner/assignments?date=${prevDateStr}`);
            const filteredPrev = prevAssignments.filter(a => a.shift === selectedShift);
            
            if (filteredPrev.length === 0) {
                showNotification('No assignments found for previous day', 'warning');
                return;
            }

            const promises = filteredPrev.map(assignment =>
                API.post('/planner/assignments', {
                    employee_id: assignment.employee_id,
                    machine_id: assignment.machine_id,
                    shift: selectedShift,
                    assignment_date: selectedDate
                })
            );
            
            await Promise.all(promises);
            fetchData(selectedDate);
            showNotification(`Copied ${filteredPrev.length} assignments from ${prevDateStr}`, 'success');
        } catch (error) {
            showNotification('Failed to copy assignments: ' + error.message, 'danger');
        }
    };

    if (loading) return (
        <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading Labor Planner...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            {/* Enhanced Header with Export and Actions */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Labor Management System</h1>
                        <p className="text-gray-600 mt-1">Plan, track, and manage workforce assignments</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowExportModal(true)}>
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                        <Button variant="secondary" onClick={() => fetchData(currentView === 'attendance' ? attendanceDate : selectedDate)}>
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
                    {[
                        { id: 'planning', label: 'Planning', icon: ClipboardList },
                        { id: 'attendance', label: 'Attendance', icon: UserCheck },
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { id: 'workers', label: 'Workers', icon: Users }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentView(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                                    currentView === tab.id 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Statistics Panel */}
            <StatisticsPanel assignments={assignments} machines={machines} employees={employees} />

            {/* Planning View */}
            {currentView === 'planning' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <ClipboardList className="w-8 h-8 text-blue-500" />
                            <h2 className="text-2xl font-bold">Labor Planning</h2>
                        </div>

                        {/* Enhanced Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Machine</label>
                                <select 
                                    value={selectedMachine} 
                                    onChange={e => setSelectedMachine(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select Machine...</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                                <select 
                                    value={selectedShift} 
                                    onChange={e => setSelectedShift(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="day">Day Shift (6AM - 6PM)</option>
                                    <option value="night">Night Shift (6PM - 6AM)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={e => setSelectedDate(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button 
                                    variant="outline" 
                                    onClick={copyFromPreviousDay}
                                    className="w-full"
                                    disabled={!selectedShift}
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy Previous Day
                                </Button>
                            </div>
                        </div>

                        {selectedMachine && (
                            <div className="border-t pt-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            Assigned Workers
                                            <Badge variant="info" className="ml-2">
                                                {currentAssignments.length} assigned
                                            </Badge>
                                        </h3>
                                        <p className="text-gray-600 text-sm mt-1">
                                            {machines.find(m => m.id == selectedMachine)?.name} - {selectedShift} shift
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant={bulkAssignMode ? "warning" : "ghost"}
                                            onClick={() => setBulkAssignMode(!bulkAssignMode)}
                                            size="sm"
                                        >
                                            {bulkAssignMode ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                            {bulkAssignMode ? 'Cancel Bulk' : 'Bulk Assign'}
                                        </Button>
                                        
                                        {bulkAssignMode && selectedEmployees.length > 0 && (
                                            <Button onClick={handleBulkAssign} size="sm">
                                                Assign {selectedEmployees.length} Workers
                                            </Button>
                                        )}
                                        
                                        <Button onClick={() => setShowEmployeeModal(true)}>
                                            <Plus className="w-4 h-4" />
                                            Add Worker
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {currentAssignments.map(assignment => (
                                        <Card key={assignment.id} hover className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800">
                                                                {assignment.fullName || assignment.username}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {assignment.employee_code} • {assignment.role}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="success">{assignment.status}</Badge>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => removeAssignment(assignment.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                    
                                    {currentAssignments.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-gray-500">
                                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p>No workers assigned yet</p>
                                            <p className="text-sm">Click "Add Worker" to get started</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {currentView === 'attendance' && (
                <Card>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><UserCheck className="w-8 h-8 text-green-500" />Attendance Confirmation</h2>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full md:w-1/3 p-3 border rounded-lg mb-4"/>
                    <div className="space-y-3">
                        {attendanceAssignments.map(a => (
                            <div key={a.id} className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-bold">{a.username}</p>
                                    <p className="text-sm text-gray-600">{a.machine_name} | {a.shift} shift</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => updateAttendanceStatus(a.id, 'present')} variant={a.status === 'present' ? 'success' : 'secondary'}>Present</Button>
                                    <Button onClick={() => updateAttendanceStatus(a.id, 'absent')} variant={a.status === 'absent' ? 'danger' : 'secondary'}>Absent</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {currentView === 'workers' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Users className="w-8 h-8 text-purple-500" />
                                <div>
                                    <h2 className="text-2xl font-bold">Worker Management</h2>
                                    <p className="text-gray-600">Manage employee information and roles</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search employees..."
                                        value={workerSearch}
                                        onChange={e => setWorkerSearch(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <Button variant="outline" onClick={() => setShowExportModal(true)}>
                                    <Download className="w-4 h-4" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Workers Table */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                <div className="grid grid-cols-5 gap-4 font-medium text-gray-700">
                                    <div>Employee Code</div>
                                    <div>Name</div>
                                    <div>Role</div>
                                    <div>Company</div>
                                    <div className="text-right">Actions</div>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {filteredEmployees.map(employee => (
                                    <div key={employee.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div className="grid grid-cols-5 gap-4 items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-medium text-sm">
                                                        {employee.employee_code?.slice(0, 2) || employee.username?.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-gray-800">
                                                    {employee.employee_code || 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    {employee.fullName || employee.username}
                                                </p>
                                                <p className="text-sm text-gray-500">{employee.email}</p>
                                            </div>
                                            <div>
                                                <Badge variant={
                                                    employee.role === 'supervisor' ? 'info' :
                                                    employee.role === 'operator' ? 'success' :
                                                    employee.role === 'technician' ? 'warning' :
                                                    'default'
                                                }>
                                                    {employee.role?.charAt(0).toUpperCase() + employee.role?.slice(1)}
                                                </Badge>
                                            </div>
                                            <div className="text-gray-600">
                                                {employee.company || 'N/A'}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => setEditingWorker(employee)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {filteredEmployees.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No employees found</p>
                                <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}
            
            {/* Enhanced Employee Assignment Modal */}
            {showEmployeeModal && (
                <Modal title="Assign Employee" onClose={() => setShowEmployeeModal(false)} size="lg">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Search by name or employee code..." 
                                    value={planningSearch}
                                    onChange={e => setPlanningSearch(e.target.value)} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            {bulkAssignMode && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="info">
                                        {selectedEmployees.length} selected
                                    </Badge>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setSelectedEmployees([])}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredEmployees.map(employee => {
                                const isAssigned = currentAssignments.some(a => a.employee_id === employee.id);
                                const isSelected = selectedEmployees.includes(employee.id);
                                
                                return (
                                    <div 
                                        key={employee.id} 
                                        className={`p-4 rounded-lg border transition-all ${
                                            isAssigned 
                                                ? 'bg-gray-100 border-gray-300' 
                                                : isSelected
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'hover:bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                {bulkAssignMode && !isAssigned && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEmployees([...selectedEmployees, employee.id]);
                                                            } else {
                                                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                )}
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{employee.fullName || employee.username}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {employee.employee_code} • {employee.role}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {!bulkAssignMode && (
                                                <Button 
                                                    onClick={() => assignEmployee(employee.id)} 
                                                    disabled={isAssigned}
                                                    variant={isAssigned ? "secondary" : "primary"}
                                                    size="sm"
                                                >
                                                    {isAssigned ? 'Already Assigned' : 'Assign'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {filteredEmployees.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No employees found</p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <Modal title="Export Labor Assignments" onClose={() => setShowExportModal(false)}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={exportDateRange.start}
                                    onChange={e => setExportDateRange({...exportDateRange, start: e.target.value})}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={exportDateRange.end}
                                    onChange={e => setExportDateRange({...exportDateRange, end: e.target.value})}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setExportFormat('csv')}
                                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                                        exportFormat === 'csv' 
                                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <FileText className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">CSV</p>
                                    <p className="text-sm text-gray-500">Spreadsheet format</p>
                                </button>
                                <button
                                    onClick={() => setExportFormat('json')}
                                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                                        exportFormat === 'json' 
                                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <Settings className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">JSON</p>
                                    <p className="text-sm text-gray-500">Data format</p>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-2">Export Preview</h4>
                            <p className="text-sm text-gray-600">
                                This will export all labor assignments between {exportDateRange.start} and {exportDateRange.end} 
                                in {exportFormat.toUpperCase()} format.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleExport} disabled={loading}>
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export Data
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            
            {/* Worker Edit Modal */}
            {editingWorker && (
                 <Modal title="Edit Worker" onClose={() => setEditingWorker(null)}>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
                            <input 
                                value={editingWorker.employee_code || ''} 
                                onChange={e => setEditingWorker({...editingWorker, employee_code: e.target.value})} 
                                placeholder="Employee Code" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input 
                                value={editingWorker.fullName || ''} 
                                onChange={e => setEditingWorker({...editingWorker, fullName: e.target.value})} 
                                placeholder="Full Name" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <select 
                                value={editingWorker.role || ''} 
                                onChange={e => setEditingWorker({...editingWorker, role: e.target.value})} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="operator">Operator</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="technician">Technician</option>
                                <option value="packer">Packer</option>
                                <option value="quality_inspector">Quality Inspector</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setEditingWorker(null)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={saveWorkerEdit} className="flex-1">
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                        </div>
                     </div>
                 </Modal>
            )}

            {/* Enhanced Notification */}
            {notification.show && (
                <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-lg border max-w-sm ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : notification.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                        {notification.type === 'danger' && <X className="w-5 h-5 text-red-600" />}
                        <p className="font-medium">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
