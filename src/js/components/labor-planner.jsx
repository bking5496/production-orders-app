import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, 
    Edit2, Save, Trash2, RefreshCw, Download, Copy, PlusCircle, MinusCircle,
    FileText, Settings, TrendingUp, AlertCircle
} from 'lucide-react';
import API from '../core/api';

// SAST Timezone Utilities (UTC+2)
const SAST_OFFSET_HOURS = 2;

// Convert UTC to SAST for display
const convertUTCToSAST = (utcDateString) => {
    if (!utcDateString) return null;
    const utcDate = new Date(utcDateString);
    const sastDate = new Date(utcDate.getTime() + (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return sastDate;
};

// Convert SAST to UTC for API calls
const convertSASTToUTC = (sastDateString) => {
    if (!sastDateString) return null;
    const sastDate = new Date(sastDateString);
    const utcDate = new Date(sastDate.getTime() - (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return utcDate.toISOString();
};

// Format SAST date for display
const formatSASTDate = (utcDateString, options = {}) => {
    if (!utcDateString) return 'N/A';
    const sastDate = convertUTCToSAST(utcDateString);
    if (!sastDate) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg',
        ...options
    };
    
    return sastDate.toLocaleString('en-ZA', defaultOptions);
};

// Format SAST time only
const formatSASTTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    const sastDate = convertUTCToSAST(utcDateString);
    if (!sastDate) return 'N/A';
    
    return sastDate.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg'
    });
};

// Get current SAST date string for date inputs (YYYY-MM-DD)
const getCurrentSASTDateString = () => {
    const now = new Date();
    const sastNow = new Date(now.getTime() + (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return sastNow.toISOString().split('T')[0];
};

// Utility functions for export
const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
        [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const exportToJSON = (data, filename) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Professional Excel export with proper formatting
const exportToExcel = (assignments, machines, employees, date, supervisorsOnDuty) => {
    // Check if XLSX library is available
    if (!window.XLSX) {
        // Fallback to CSV if XLSX not available
        console.warn('XLSX library not available, falling back to CSV export');
        exportToCSV(
            assignments.map(assignment => {
                const employee = employees.find(e => e.id === assignment.employee_id);
                const machine = machines.find(m => m.id == assignment.machine_id);
                return {
                    'Employee Code': employee?.employee_code || 'N/A',
                    'Name': employee?.fullName || employee?.username || 'N/A',
                    'Machine': machine?.name || `Machine ${assignment.machine_id}`,
                    'Role': employee?.role || 'N/A',
                    'Shift': assignment.shift || 'N/A',
                    'Company': employee?.company || 'N/A'
                };
            }),
            `labor-schedule-${date}.csv`
        );
        return;
    }

    // Get day of week and format date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Create a new workbook
    const workbook = window.XLSX.utils.book_new();
    
    // Create worksheet data array
    const wsData = [];
    
    // Header section with styling
    wsData.push(['LABOR SCHEDULE REPORT']); // Title row
    wsData.push([]); // Empty row
    wsData.push(['Day of Week:', dayOfWeek]);
    wsData.push(['Date:', formattedDate]);
    wsData.push(['Supervisors on Duty:', supervisorsOnDuty.length > 0 ? supervisorsOnDuty.map(s => s.fullName || s.username).join(', ') : 'Not Assigned']);
    wsData.push([]); // Empty row
    wsData.push([]); // Empty row
    
    // Work table headers
    wsData.push(['Employee Code', 'Full Name', 'Machine', 'Role', 'Shift', 'Company', 'Attendance']);
    
    // Work table data
    assignments.forEach(assignment => {
        const employee = employees.find(e => e.id === assignment.employee_id);
        const machine = machines.find(m => m.id == assignment.machine_id);
        
        if (employee) {
            // Determine attendance status for display
            let attendanceStatus = 'Pending';
            if (assignment.status === 'present') {
                attendanceStatus = 'Present';
            } else if (assignment.status === 'absent') {
                attendanceStatus = 'Absent';
            } else if (assignment.status === 'planned') {
                attendanceStatus = 'Planned';
            }
            
            wsData.push([
                employee.employee_code || 'N/A',
                employee.fullName || employee.username || 'N/A', // Always use full name first
                machine?.name || `Machine ${assignment.machine_id}`,
                (employee.role || 'N/A').charAt(0).toUpperCase() + (employee.role || 'N/A').slice(1),
                (assignment.shift || 'N/A').charAt(0).toUpperCase() + (assignment.shift || 'N/A').slice(1),
                employee.company || 'N/A',
                attendanceStatus
            ]);
        }
    });
    
    // Create worksheet
    const worksheet = window.XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, // Employee Code
        { wch: 25 }, // Full Name
        { wch: 20 }, // Machine
        { wch: 15 }, // Role
        { wch: 12 }, // Shift
        { wch: 15 }, // Company
        { wch: 12 }  // Attendance
    ];
    
    // Apply formatting
    const range = window.XLSX.utils.decode_range(worksheet['!ref']);
    
    // Style the title row (A1)
    if (worksheet['A1']) {
        worksheet['A1'].s = {
            font: { bold: true, sz: 16, color: { rgb: "1F4E79" } },
            alignment: { horizontal: "center" }
        };
    }
    
    // Style header information rows (A3:B5)
    for (let row = 2; row <= 4; row++) {
        const cellA = `A${row + 1}`;
        const cellB = `B${row + 1}`;
        if (worksheet[cellA]) {
            worksheet[cellA].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "F2F2F2" } }
            };
        }
        if (worksheet[cellB]) {
            worksheet[cellB].s = {
                font: { bold: false },
                fill: { fgColor: { rgb: "F9F9F9" } }
            };
        }
    }
    
    // Style table headers (row 8)
    const headerRow = 8;
    for (let col = 0; col < 7; col++) { // Updated to 7 columns for attendance
        const cellRef = window.XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4472C4" } },
                alignment: { horizontal: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
    }
    
    // Style data rows with alternating colors
    for (let row = headerRow; row < range.e.r; row++) {
        const isEvenRow = (row - headerRow) % 2 === 0;
        const bgColor = isEvenRow ? "FFFFFF" : "F8F9FA";
        
        for (let col = 0; col < 7; col++) { // Updated to 7 columns for attendance
            const cellRef = window.XLSX.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellRef]) {
                // Special styling for attendance column based on status
                let cellBgColor = bgColor;
                if (col === 6) { // Attendance column
                    const cellValue = worksheet[cellRef].v;
                    if (cellValue === 'Present') {
                        cellBgColor = "D4EDDA"; // Light green for present
                    } else if (cellValue === 'Absent') {
                        cellBgColor = "F8D7DA"; // Light red for absent
                    } else if (cellValue === 'Planned') {
                        cellBgColor = "FFF3CD"; // Light yellow for planned
                    }
                }
                
                worksheet[cellRef].s = {
                    fill: { fgColor: { rgb: cellBgColor } },
                    border: {
                        top: { style: "thin", color: { rgb: "E0E0E0" } },
                        bottom: { style: "thin", color: { rgb: "E0E0E0" } },
                        left: { style: "thin", color: { rgb: "E0E0E0" } },
                        right: { style: "thin", color: { rgb: "E0E0E0" } }
                    },
                    alignment: { horizontal: col === 1 ? "left" : "center" }, // Name column left-aligned
                    font: col === 6 && worksheet[cellRef].v === 'Present' ? { bold: true } : undefined // Bold for present
                };
            }
        }
    }
    
    // Merge title cell across columns
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } // Merge title across all 7 columns
    ];
    
    // Add worksheet to workbook
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Labor Schedule');
    
    // Generate filename
    const filename = `Labor-Schedule-${date}.xlsx`;
    
    // Write and download the file
    window.XLSX.writeFile(workbook, filename);
};

// Sleek UI Components
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

// Sleek Statistics Panel
const StatisticsPanel = ({ assignments, machines, employees }) => {
    const stats = useMemo(() => {
        const totalAssignments = assignments.length;
        const uniqueMachines = new Set(assignments.map(a => a.machine_id)).size;
        const uniqueEmployees = new Set(assignments.map(a => a.employee_id)).size;
        const utilizationRate = machines.length > 0 ? Math.round((uniqueMachines / machines.length) * 100) : 0;
        
        return {
            totalAssignments,
            uniqueMachines,
            uniqueEmployees,
            utilizationRate
        };
    }, [assignments, machines, employees]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Assignments</p>
                        <p className="text-xl font-bold text-gray-800">{stats.totalAssignments}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Machines</p>
                        <p className="text-xl font-bold text-gray-800">{stats.uniqueMachines}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Employees</p>
                        <p className="text-xl font-bold text-gray-800">{stats.uniqueEmployees}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Utilization</p>
                        <p className="text-xl font-bold text-gray-800">{stats.utilizationRate}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Employee Card Component
const EmployeeCard = ({ employee, onAssign, onRemove, isAssigned, showActions = true }) => (
    <div className={`p-4 rounded-lg border transition-all ${
        isAssigned ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
    }`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                        {employee.employee_code?.slice(0, 2) || employee.username?.slice(0, 2).toUpperCase()}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-gray-800">
                        {employee.fullName || employee.username}
                    </p>
                    <p className="text-sm text-gray-500">
                        {employee.employee_code} • {employee.role}
                    </p>
                </div>
            </div>
            {showActions && (
                <div>
                    {isAssigned ? (
                        <Button variant="ghost" size="sm" onClick={() => onRemove?.(employee.id)}>
                            <X className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button variant="primary" size="sm" onClick={() => onAssign?.(employee.id)}>
                            Assign
                        </Button>
                    )}
                </div>
            )}
        </div>
    </div>
);

// Machine Card Component
const MachineCard = ({ machine, assignmentCount = 0, onClick }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => onClick?.(machine)}>
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">{machine.name}</h3>
            <Badge variant="info">{assignmentCount} assigned</Badge>
        </div>
        <p className="text-sm text-gray-500">{machine.type}</p>
        <p className="text-xs text-gray-400 mt-1">{machine.environment}</p>
    </div>
);

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
    const [selectedDate, setSelectedDate] = useState(getCurrentSASTDateString());
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [planningSearch, setPlanningSearch] = useState('');
    const [bulkAssignMode, setBulkAssignMode] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(getCurrentSASTDateString());

    // Worker management state
    const [workerSearch, setWorkerSearch] = useState('');
    const [editingWorker, setEditingWorker] = useState(null);

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('excel');
    const [exportDateRange, setExportDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Supervisor management - Changed to support multiple supervisors
    const [supervisorsOnDuty, setSupervisorsOnDuty] = useState([]);
    const [showSupervisorModal, setShowSupervisorModal] = useState(false);

    // Weekly planning state
    const [showWeeklyPlanModal, setShowWeeklyPlanModal] = useState(false);
    const [weeklyPlanData, setWeeklyPlanData] = useState({
        startDate: '',
        endDate: '',
        template: 'current_week', // 'current_week', 'previous_week', 'custom'
        applyToShifts: ['day', 'night'],
        copyFrom: ''
    });

    // Filtering state
    const [filters, setFilters] = useState({
        machine: '',
        shift: '',
        employee: '',
        status: ''
    });

    const fetchData = useCallback(async (sastDate) => {
        setLoading(true);
        try {
            // Convert SAST date to UTC for API call
            const utcDate = convertSASTToUTC(sastDate + 'T00:00:00');
            const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : sastDate;
            
            const [machinesData, employeesData, assignmentsData, supervisorsData] = await Promise.all([
                API.get('/machines'),
                API.get('/users'),
                API.get(`/planner/assignments?date=${apiDate}`),
                API.get(`/planner/supervisors?date=${apiDate}&shift=${selectedShift}`)
            ]);
            setMachines(machinesData);
            setEmployees(employeesData.filter(u => u.role !== 'admin'));
            setAssignments(assignmentsData);
            setSupervisorsOnDuty(supervisorsData);
        } catch (error) {
            showNotification('Failed to load initial data: ' + error.message, 'danger');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedShift]);

    useEffect(() => {
        const dateToFetch = currentView === 'attendance' ? attendanceDate : selectedDate;
        fetchData(dateToFetch);
    }, [selectedDate, attendanceDate, currentView, selectedShift, fetchData]);
    
    // Memos for filtering with timezone conversion
    const currentAssignments = useMemo(() => {
        // Convert SAST date to UTC for comparison
        const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
        const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
        
        return assignments.filter(a => 
            a.machine_id == selectedMachine && 
            a.shift === selectedShift && 
            a.assignment_date === apiDate
        );
    }, [assignments, selectedMachine, selectedShift, selectedDate]);
    
    const attendanceAssignments = useMemo(() => {
        // Convert SAST date to UTC for comparison
        const utcDate = convertSASTToUTC(attendanceDate + 'T00:00:00');
        const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : attendanceDate;
        
        return assignments.filter(a => a.assignment_date === apiDate);
    }, [assignments, attendanceDate]);
    const filteredEmployees = useMemo(() => employees.filter(e => !workerSearch || e.username.toLowerCase().includes(workerSearch.toLowerCase()) || (e.employee_code && e.employee_code.toLowerCase().includes(workerSearch.toLowerCase()))), [employees, workerSearch]);

    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    // Weekly planning helper functions
    const getWeekDates = (startDate, days = 7) => {
        const dates = [];
        const start = new Date(startDate);
        for (let i = 0; i < days; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    const getNextWeekDates = () => {
        const today = new Date();
        const nextMonday = new Date(today);
        const daysUntilMonday = (1 + 7 - today.getDay()) % 7;
        nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
        
        const nextFriday = new Date(nextMonday);
        nextFriday.setDate(nextMonday.getDate() + 4);
        
        return {
            start: nextMonday.toISOString().split('T')[0],
            end: nextFriday.toISOString().split('T')[0]
        };
    };

    // Supervisor management functions
    const addSupervisor = async (supervisorId) => {
        try {
            // Convert SAST date to UTC for API
            const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
            const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
            
            console.log('Adding supervisor:', { supervisorId, apiDate, selectedShift });
            await API.post('/planner/supervisors', {
                supervisor_id: supervisorId,
                assignment_date: apiDate,
                shift: selectedShift
            });
            
            // Close modal first
            setShowSupervisorModal(false);
            
            // Reload supervisors data
            const supervisorsData = await API.get(`/planner/supervisors?date=${apiDate}&shift=${selectedShift}`);
            setSupervisorsOnDuty(supervisorsData);
            showNotification('Supervisor assigned successfully', 'success');
        } catch (error) {
            console.error('Error adding supervisor:', error);
            showNotification(error.response?.data?.error || 'Failed to assign supervisor', 'error');
        }
    };

    const removeSupervisor = async (supervisorAssignmentId) => {
        try {
            await API.delete(`/planner/supervisors/${supervisorAssignmentId}`);
            
            // Convert SAST date to UTC for API
            const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
            const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
            
            // Reload supervisors data
            const supervisorsData = await API.get(`/planner/supervisors?date=${apiDate}&shift=${selectedShift}`);
            setSupervisorsOnDuty(supervisorsData);
            showNotification('Supervisor removed successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to remove supervisor', 'error');
        }
    };

    // Weekly planning functions
    const planWeeklyLabor = async () => {
        try {
            setLoading(true);
            const { startDate, endDate, template, applyToShifts, copyFrom } = weeklyPlanData;
            
            if (!startDate || !endDate) {
                showNotification('Please select both start and end dates', 'error');
                return;
            }

            const weekDates = getWeekDates(startDate, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
            let sourceDate = copyFrom;

            // Determine source date based on template
            if (template === 'current_week') {
                sourceDate = selectedDate;
            } else if (template === 'previous_week') {
                const prevWeek = new Date(startDate);
                prevWeek.setDate(prevWeek.getDate() - 7);
                sourceDate = prevWeek.toISOString().split('T')[0];
            }

            if (!sourceDate) {
                showNotification('Please specify a source date to copy from', 'error');
                return;
            }

            console.log('Planning weekly labor:', { sourceDate, weekDates, applyToShifts });

            // Get source assignments and supervisors
            let sourceAssignments = [];
            let sourceSupervisors = [];
            let sourceNightSupervisors = [];

            try {
                sourceAssignments = await API.get(`/planner/assignments?date=${sourceDate}`);
            } catch (error) {
                console.warn('No source assignments found:', error);
                sourceAssignments = [];
            }

            try {
                sourceSupervisors = await API.get(`/planner/supervisors?date=${sourceDate}&shift=day`);
            } catch (error) {
                console.warn('No day supervisors found:', error);
                sourceSupervisors = [];
            }

            try {
                sourceNightSupervisors = await API.get(`/planner/supervisors?date=${sourceDate}&shift=night`);
            } catch (error) {
                console.warn('No night supervisors found:', error);
                sourceNightSupervisors = [];
            }

            if (sourceAssignments.length === 0 && sourceSupervisors.length === 0 && sourceNightSupervisors.length === 0) {
                showNotification(`No assignments or supervisors found for ${sourceDate} to copy from`, 'warning');
                setShowWeeklyPlanModal(false);
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            // Apply to each date in the range
            for (const targetDate of weekDates) {
                for (const shift of applyToShifts) {
                    try {
                        // Copy regular assignments
                        const shiftAssignments = sourceAssignments.filter(a => a.shift === shift);
                        console.log(`Found ${shiftAssignments.length} assignments for ${shift} shift to copy to ${targetDate}`);
                        
                        for (const assignment of shiftAssignments) {
                            try {
                                await API.post('/planner/assignments', {
                                    employee_id: assignment.employee_id,
                                    machine_id: assignment.machine_id,
                                    shift: shift,
                                    assignment_date: targetDate
                                });
                                successCount++;
                            } catch (error) {
                                console.error('Assignment error:', error);
                                if (error.message.includes('already assigned')) {
                                    skippedCount++;
                                } else {
                                    errorCount++;
                                }
                            }
                        }

                        // Copy supervisors
                        const supervisorsToAssign = shift === 'day' ? sourceSupervisors : sourceNightSupervisors;
                        console.log(`Found ${supervisorsToAssign.length} supervisors for ${shift} shift to copy to ${targetDate}`);
                        
                        for (const supervisor of supervisorsToAssign) {
                            try {
                                await API.post('/planner/supervisors', {
                                    supervisor_id: supervisor.supervisor_id,
                                    assignment_date: targetDate,
                                    shift: shift
                                });
                            } catch (error) {
                                console.error('Supervisor assignment error:', error);
                                if (!error.message.includes('already assigned')) {
                                    console.warn('Failed to assign supervisor:', error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error planning for ${targetDate} ${shift}:`, error);
                        errorCount++;
                    }
                }
            }

            setShowWeeklyPlanModal(false);
            fetchData(selectedDate); // Refresh current view
            
            let message = `Planned labor for ${weekDates.length} days: ${successCount} successful`;
            if (skippedCount > 0) message += `, ${skippedCount} skipped (already assigned)`;
            if (errorCount > 0) message += `, ${errorCount} failed`;
            
            const notificationType = errorCount > 0 ? 'warning' : 'success';
            showNotification(message, notificationType);

        } catch (error) {
            console.error('Weekly planning error:', error);
            showNotification('Failed to plan weekly labor: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Initialize weekly planning modal with next week dates
    const openWeeklyPlanModal = () => {
        const nextWeek = getNextWeekDates();
        setWeeklyPlanData({
            ...weeklyPlanData,
            startDate: nextWeek.start,
            endDate: nextWeek.end,
            copyFrom: selectedDate
        });
        setShowWeeklyPlanModal(true);
    };

    // API Functions
    const assignEmployee = async (employeeId) => {
        if (currentAssignments.some(a => a.employee_id === employeeId)) return showNotification('Employee already assigned', 'danger');
        if (!selectedMachine) return showNotification('Please select a machine first', 'danger');
        if (!selectedDate) return showNotification('Please select a date first', 'danger');
        
        try {
            // Convert SAST date to UTC for API
            const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
            const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
            
            console.log('Assigning employee:', { employee_id: employeeId, machine_id: selectedMachine, shift: selectedShift, assignment_date: apiDate });
            const newAssignment = await API.post('/planner/assignments', { 
                employee_id: employeeId, 
                machine_id: selectedMachine, 
                shift: selectedShift, 
                assignment_date: apiDate 
            });
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
            console.log('Updating worker:', id, data);
            const response = await API.put(`/users/${id}`, data);
            console.log('Update response:', response);
            
            // Update the local employees state immediately to reflect changes
            setEmployees(prevEmployees => 
                prevEmployees.map(emp => 
                    emp.id === id ? { ...emp, ...data } : emp
                )
            );
            
            fetchData(selectedDate);
            setEditingWorker(null);
            showNotification('Worker updated successfully');
        } catch (error) { 
            console.error('Worker update error:', error);
            showNotification(`Failed to update worker: ${error.message}`, 'danger'); 
        }
    };

    // Enhanced export functionality
    const handleExport = async () => {
        try {
            setLoading(true);
            
            if (exportFormat === 'excel') {
                // Use the Excel template format for single day export
                const exportDate = exportDateRange.start;
                const dayAssignments = assignments.filter(a => a.assignment_date === exportDate);
                
                exportToExcel(dayAssignments, machines, employees, exportDate, supervisorsOnDuty);
                showNotification(`Exported labor schedule for ${exportDate}`, 'success');
            } else {
                // For CSV/JSON, get data from API
                const response = await API.get(`/planner/assignments`, {
                    params: {
                        startDate: exportDateRange.start,
                        endDate: exportDateRange.end
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
                    'Role': assignment.role,
                    'Company': assignment.company
                }));

                const filename = `labor-assignments-${exportDateRange.start}-to-${exportDateRange.end}.${exportFormat}`;
                
                if (exportFormat === 'csv') {
                    exportToCSV(exportData, filename);
                } else {
                    exportToJSON(exportData, filename);
                }
                
                showNotification(`Exported ${exportData.length} assignments to ${exportFormat.toUpperCase()}`, 'success');
            }
            
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

    // Cancel all assignments for the day
    const cancelDayLabour = async () => {
        // Convert SAST date to UTC for comparison
        const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
        const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
        
        const dayAssignments = assignments.filter(a => a.assignment_date === apiDate);
        
        if (dayAssignments.length === 0) {
            showNotification('No assignments found for this date', 'warning');
            return;
        }

        // Display SAST date to user but work with UTC internally
        if (!window.confirm(`Are you sure you want to cancel all ${dayAssignments.length} assignments for ${selectedDate} (SAST)? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const promises = dayAssignments.map(assignment =>
                API.delete(`/planner/assignments/${assignment.id}`)
            );
            
            await Promise.all(promises);
            fetchData(selectedDate);
            showNotification(`Cancelled ${dayAssignments.length} assignments for ${selectedDate}`, 'success');
        } catch (error) {
            showNotification('Failed to cancel assignments: ' + error.message, 'danger');
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            {/* Sleek Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Labor Planner</h1>
                        <p className="text-gray-500 text-sm">Streamlined workforce management</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowExportModal(true)}>
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => fetchData(currentView === 'attendance' ? attendanceDate : selectedDate)}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Modern Tab Navigation */}
                <div className="flex gap-0 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    {[
                        { id: 'planning', label: 'Planning', icon: ClipboardList },
                        { id: 'attendance', label: 'Attendance', icon: UserCheck },
                        { id: 'workers', label: 'Workers', icon: Users }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentView(tab.id)}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 ${
                                    currentView === tab.id 
                                        ? 'bg-blue-500 text-white shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>


            {/* Planning View */}
            {currentView === 'planning' && (
                <div className="space-y-4">
                    {/* Quick Controls */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={e => setSelectedDate(e.target.value)} 
                                    className="border-0 bg-transparent text-gray-700 font-medium focus:ring-0 p-0"
                                />
                            </div>
                            <div className="h-5 w-px bg-gray-200"></div>
                            <select 
                                value={selectedShift} 
                                onChange={e => setSelectedShift(e.target.value)} 
                                className="border-0 bg-transparent text-gray-700 font-medium focus:ring-0 p-0 text-sm"
                            >
                                <option value="day">Day Shift</option>
                                <option value="night">Night Shift</option>
                            </select>
                            <div className="ml-auto flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={openWeeklyPlanModal}>
                                    <Calendar className="w-4 h-4" />
                                    Weekly
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowSupervisorModal(true)}>
                                    <UserCheck className="w-4 h-4" />
                                    Supervisors
                                </Button>
                                <Button variant="danger" size="sm" onClick={cancelDayLabour}>
                                    <X className="w-4 h-4" />
                                    Cancel Day
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Machine Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {machines.map(machine => {
                            // Convert SAST date to UTC for assignment count
                            const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
                            const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
                            
                            const assignmentCount = assignments.filter(a => 
                                a.machine_id == machine.id && 
                                a.shift === selectedShift && 
                                a.assignment_date === apiDate
                            ).length;
                            const isSelected = selectedMachine == machine.id;
                            
                            return (
                                <div 
                                    key={machine.id}
                                    onClick={() => setSelectedMachine(machine.id)}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                                        isSelected 
                                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-900 text-sm">{machine.name}</h3>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                            assignmentCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {assignmentCount}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">{machine.type}</p>
                                    <p className="text-xs text-gray-400">{machine.environment}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Worker Assignment Panel */}
                    {selectedMachine && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Settings className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 text-sm">
                                            {machines.find(m => m.id == selectedMachine)?.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {currentAssignments.length} workers • {selectedShift} shift
                                        </p>
                                    </div>
                                </div>
                                
                                <Button onClick={() => setShowEmployeeModal(true)} size="sm">
                                    <Plus className="w-4 h-4" />
                                    Add
                                </Button>
                            </div>

                            {currentAssignments.length > 0 ? (
                                <div className="space-y-2">
                                    {currentAssignments.map(assignment => (
                                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-medium text-xs">
                                                        {assignment.employee_code?.slice(0, 2) || assignment.username?.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-xs">
                                                        {assignment.fullName || assignment.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {assignment.employee_code} • {assignment.role}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => removeAssignment(assignment.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Users className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-xs mb-2">No workers assigned</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowEmployeeModal(true)}
                                    >
                                        Assign Worker
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {currentView === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Attendance</h2>
                                <p className="text-gray-500 text-sm">Track daily attendance</p>
                            </div>
                        </div>
                        <input 
                            type="date" 
                            value={attendanceDate} 
                            onChange={e => setAttendanceDate(e.target.value)} 
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Attendance List */}
                    <div className="space-y-2">
                        {attendanceAssignments.map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-medium text-sm">
                                            {assignment.employee_code?.slice(0, 2) || assignment.username?.slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                            {assignment.fullName || assignment.username}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {assignment.employee_code} • {assignment.machine_name} • {assignment.shift} shift
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge 
                                            variant={
                                                assignment.status === 'present' ? 'success' :
                                                assignment.status === 'absent' ? 'danger' :
                                                'default'
                                            }
                                        >
                                            {assignment.status === 'present' ? 'Present' :
                                             assignment.status === 'absent' ? 'Absent' : 'Pending'}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => updateAttendanceStatus(assignment.id, 'present')} 
                                        variant={assignment.status === 'present' ? 'success' : 'ghost'}
                                        size="sm"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => updateAttendanceStatus(assignment.id, 'absent')} 
                                        variant={assignment.status === 'absent' ? 'danger' : 'ghost'}
                                        size="sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {attendanceAssignments.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserCheck className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">No assignments found for this date</p>
                            <p className="text-xs text-gray-400">Check the planning section to create assignments</p>
                        </div>
                    )}
                </div>
            )}

            {currentView === 'workers' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Workers</h2>
                                <p className="text-gray-500 text-sm">Manage employee information</p>
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
                        </div>
                    </div>

                    {/* Workers List */}
                    <div className="space-y-2">
                        {filteredEmployees.map(employee => (
                            <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-medium text-sm">
                                            {employee.employee_code?.slice(0, 2) || employee.username?.slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {employee.fullName || (employee.username ? employee.username.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {employee.employee_code} • {employee.company || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={
                                                    employee.role === 'supervisor' ? 'info' :
                                                    employee.role === 'operator' ? 'success' :
                                                    employee.role === 'technician' ? 'warning' :
                                                    'default'
                                                }>
                                                    {employee.role?.charAt(0).toUpperCase() + employee.role?.slice(1)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setEditingWorker(employee)}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {filteredEmployees.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">No employees found</p>
                            <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                        </div>
                    )}
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
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => setExportFormat('excel')}
                                    className={`p-4 border-2 rounded-lg text-center transition-all relative ${
                                        exportFormat === 'excel' 
                                            ? 'border-green-500 bg-green-50 text-green-700' 
                                            : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
                                    }`}
                                >
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="success" size="sm">Recommended</Badge>
                                    </div>
                                    <FileText className="w-6 h-6 mx-auto mb-2 text-green-600" />
                                    <p className="font-medium">Excel Template</p>
                                    <p className="text-sm text-gray-500">Professional format</p>
                                </button>
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
                            {exportFormat === 'excel' ? (
                                <div className="text-sm text-gray-600">
                                    <p className="mb-2">Professional Excel template will include:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li><strong>Header:</strong> Day of week, date, supervisor on duty</li>
                                        <li><strong>Work Table:</strong> Employee code, full name, machine, role, shift, company, attendance</li>
                                        <li><strong>Attendance Status:</strong> Present (green), Absent (red), Planned (yellow)</li>
                                        <li><strong>Formatting:</strong> Colors, borders, proper column widths</li>
                                        <li><strong>Date:</strong> {exportDateRange.start}</li>
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    This will export all labor assignments between {exportDateRange.start} and {exportDateRange.end} 
                                    in {exportFormat.toUpperCase()} format.
                                </p>
                            )}
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

            {/* Supervisor Assignment Modal */}
            {showSupervisorModal && (
                <Modal title="Assign Supervisor" onClose={() => setShowSupervisorModal(false)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Supervisor for {selectedDate}
                            </label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {employees.filter(e => e.role === 'supervisor' || e.role === 'admin')
                                    .filter(supervisor => !supervisorsOnDuty.some(s => s.supervisor_id === supervisor.id))
                                    .map(supervisor => (
                                    <div 
                                        key={supervisor.id}
                                        className="p-3 border rounded-lg cursor-pointer transition-all border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                        onClick={() => addSupervisor(supervisor.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                <UserCheck className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{supervisor.fullName || supervisor.username}</p>
                                                <p className="text-sm text-gray-500">
                                                    {supervisor.employee_code} • {supervisor.role}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {employees.filter(e => e.role === 'supervisor' || e.role === 'admin')
                            .filter(supervisor => !supervisorsOnDuty.some(s => s.supervisor_id === supervisor.id)).length === 0 && (
                            <p className="text-center text-gray-500 py-4">All available supervisors are already assigned.</p>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowSupervisorModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Weekly Planning Modal */}
            {showWeeklyPlanModal && (
                <Modal title="Plan Weekly Labor" onClose={() => setShowWeeklyPlanModal(false)}>
                    <div className="space-y-6">
                        {/* Date Range Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                                <input
                                    type="date"
                                    value={weeklyPlanData.startDate}
                                    onChange={(e) => setWeeklyPlanData({...weeklyPlanData, startDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                                <input
                                    type="date"
                                    value={weeklyPlanData.endDate}
                                    onChange={(e) => setWeeklyPlanData({...weeklyPlanData, endDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Template Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Copy Template From</label>
                            <select
                                value={weeklyPlanData.template}
                                onChange={(e) => setWeeklyPlanData({...weeklyPlanData, template: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="current_week">Current Day ({selectedDate})</option>
                                <option value="previous_week">Previous Week</option>
                                <option value="custom">Custom Date</option>
                            </select>
                        </div>

                        {/* Custom Date Selection */}
                        {weeklyPlanData.template === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Copy From Date</label>
                                <input
                                    type="date"
                                    value={weeklyPlanData.copyFrom}
                                    onChange={(e) => setWeeklyPlanData({...weeklyPlanData, copyFrom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* Shift Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Apply to Shifts</label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={weeklyPlanData.applyToShifts.includes('day')}
                                        onChange={(e) => {
                                            const shifts = e.target.checked 
                                                ? [...weeklyPlanData.applyToShifts, 'day']
                                                : weeklyPlanData.applyToShifts.filter(s => s !== 'day');
                                            setWeeklyPlanData({...weeklyPlanData, applyToShifts: shifts});
                                        }}
                                        className="mr-2"
                                    />
                                    Day Shift (6AM - 6PM)
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={weeklyPlanData.applyToShifts.includes('night')}
                                        onChange={(e) => {
                                            const shifts = e.target.checked 
                                                ? [...weeklyPlanData.applyToShifts, 'night']
                                                : weeklyPlanData.applyToShifts.filter(s => s !== 'night');
                                            setWeeklyPlanData({...weeklyPlanData, applyToShifts: shifts});
                                        }}
                                        className="mr-2"
                                    />
                                    Night Shift (6PM - 6AM)
                                </label>
                            </div>
                        </div>

                        {/* Preview Information */}
                        {weeklyPlanData.startDate && weeklyPlanData.endDate && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-800 mb-2">Planning Summary</h4>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p><strong>Date Range:</strong> {weeklyPlanData.startDate} to {weeklyPlanData.endDate}</p>
                                    <p><strong>Days:</strong> {Math.ceil((new Date(weeklyPlanData.endDate) - new Date(weeklyPlanData.startDate)) / (1000 * 60 * 60 * 24)) + 1}</p>
                                    <p><strong>Shifts:</strong> {weeklyPlanData.applyToShifts.join(', ')}</p>
                                    <p><strong>Source:</strong> {
                                        weeklyPlanData.template === 'current_week' ? `Current day (${selectedDate})` :
                                        weeklyPlanData.template === 'previous_week' ? 'Previous week' :
                                        `Custom date (${weeklyPlanData.copyFrom})`
                                    }</p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowWeeklyPlanModal(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={planWeeklyLabor}
                                disabled={!weeklyPlanData.startDate || !weeklyPlanData.endDate || weeklyPlanData.applyToShifts.length === 0}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Calendar className="w-4 h-4" />
                                Plan Labor
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
