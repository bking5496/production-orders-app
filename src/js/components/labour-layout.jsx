import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, RefreshCw, Eye, Users, ClipboardList, UserCheck, Settings } from 'lucide-react';
import API from '../core/api';
import { Icon } from './layout-components.jsx';

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

// Professional Excel export with proper formatting
const exportToExcel = (rosterData, selectedDate) => {
    // Check if XLSX library is available
    if (!window.XLSX) {
        // Fallback to CSV if XLSX not available
        console.warn('XLSX library not available, falling back to CSV export');
        const allData = [
            ...rosterData.supervisors.map(s => ({
                'Type': 'Supervisor',
                'Name': s.fullName || s.name,
                'Employee Code': s.employee_code || 'N/A',
                'Machine': 'N/A',
                'Production Area': 'Supervision',
                'Position': s.position,
                'Shift': s.shift,
                'Status': s.status,
                'Date': selectedDate
            })),
            ...rosterData.assignments.map(a => ({
                'Type': 'Employee',
                'Name': a.fullName || a.name,
                'Employee Code': a.employee_code || 'N/A',
                'Machine': a.machine || 'N/A',
                'Production Area': a.production_area || 'N/A',
                'Position': a.position,
                'Shift': a.shift,
                'Status': a.status,
                'Date': selectedDate
            })),
            ...rosterData.machinesInUse.map(m => ({
                'Type': 'Machine',
                'Name': m.name,
                'Employee Code': 'N/A',
                'Machine': m.name,
                'Production Area': m.environment || 'N/A',
                'Position': m.type || 'N/A',
                'Shift': m.shifts_in_use || 'N/A',
                'Status': m.status,
                'Date': selectedDate
            })),
            ...rosterData.attendance.map(w => ({
                'Type': 'Attendance',
                'Name': w.name,
                'Employee Code': 'N/A',
                'Machine': 'N/A',
                'Production Area': w.production_area || 'N/A',
                'Position': w.position || 'N/A',
                'Shift': w.shift,
                'Status': w.status,
                'Date': selectedDate
            }))
        ];
        exportToCSV(allData, `labour-layout-${selectedDate}.csv`);
        return;
    }

    const wb = window.XLSX.utils.book_new();
    
    // Get day of week and format date
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Create worksheet data
    const wsData = [];
    
    // Header information
    wsData.push(['DAILY LABOUR LAYOUT REPORT']);
    wsData.push([]);
    wsData.push(['Day of Week:', dayOfWeek]);
    wsData.push(['Date:', formattedDate]);
    wsData.push(['Total Supervisors:', rosterData.summary.total_supervisors || 0]);
    wsData.push(['Total Assignments:', rosterData.summary.total_assignments || 0]);
    wsData.push(['Total Machines:', rosterData.summary.total_machines_in_use || 0]);
    wsData.push(['Total Attendance Records:', rosterData.summary.total_attendance || 0]);
    wsData.push([]);
    
    // Supervisors section
    if (rosterData.supervisors.length > 0) {
        wsData.push([]);
        wsData.push(['SUPERVISORS ON DUTY']);
        wsData.push(['Name', 'Employee Code', 'Shift', 'Status']);
        rosterData.supervisors.forEach(supervisor => {
            wsData.push([
                supervisor.fullName || supervisor.name,
                supervisor.employee_code || 'N/A',
                supervisor.shift,
                supervisor.status
            ]);
        });
    }
    
    // Assigned employees section
    if (rosterData.assignments.length > 0) {
        wsData.push([]);
        wsData.push(['ASSIGNED EMPLOYEES']);
        wsData.push(['Name', 'Employee Code', 'Machine', 'Production Area', 'Shift', 'Status']);
        rosterData.assignments.forEach(assignment => {
            wsData.push([
                assignment.fullName || assignment.name,
                assignment.employee_code || 'N/A',
                assignment.machine || 'N/A',
                assignment.production_area || 'N/A',
                assignment.shift,
                assignment.status
            ]);
        });
    }

    // Machines in use section
    if (rosterData.machinesInUse.length > 0) {
        wsData.push([]);
        wsData.push(['MACHINES IN USE']);
        wsData.push(['Machine', 'Type', 'Environment', 'Assigned Workers', 'Shifts', 'Status']);
        rosterData.machinesInUse.forEach(machine => {
            wsData.push([
                machine.name,
                machine.type || 'N/A',
                machine.environment || 'N/A',
                machine.assigned_workers,
                machine.shifts_in_use || 'N/A',
                machine.status
            ]);
        });
    }
    
    // Attendance records section
    if (rosterData.attendance.length > 0) {
        wsData.push([]);
        wsData.push(['ATTENDANCE RECORDS']);
        wsData.push(['Name', 'Production Area', 'Position', 'Shift', 'Status']);
        rosterData.attendance.forEach(worker => {
            wsData.push([
                worker.name,
                worker.production_area || 'N/A',
                worker.position || 'N/A',
                worker.shift,
                worker.status
            ]);
        });
    }
    
    // Create worksheet
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [
        { wch: 20 }, // Name
        { wch: 18 }, // Production Area
        { wch: 15 }, // Position
        { wch: 10 }, // Shift
        { wch: 12 }  // Status
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    window.XLSX.utils.book_append_sheet(wb, ws, 'Labour Layout');
    
    // Save file
    window.XLSX.writeFile(wb, `labour-layout-${selectedDate}.xlsx`);
};

export default function LabourLayoutPage() {
    const [rosterData, setRosterData] = useState({
        supervisors: [],
        assignments: [],
        attendance: [],
        machinesInUse: [],
        summary: {
            total_supervisors: 0,
            total_assignments: 0,
            total_attendance: 0,
            total_machines_in_use: 0,
            day_supervisors: 0,
            night_supervisors: 0,
            day_assignments: 0,
            night_assignments: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('excel');
    const [selectedShift, setSelectedShift] = useState('all');

    const fetchRosterForDate = async (date) => {
        setLoading(true);
        try {
            const data = await API.get(`/labour/roster?date=${date}`);
            setRosterData(data);
        } catch (error) {
            console.error(`Failed to fetch roster for ${date}:`, error);
            // Fallback to today's roster if date-specific endpoint doesn't exist
            try {
                const fallbackData = await API.get('/labour/today');
                setRosterData({
                    supervisors: [],
                    assignments: [],
                    attendance: fallbackData,
                    machinesInUse: [],
                    summary: { 
                        total_supervisors: 0,
                        total_assignments: 0,
                        total_attendance: fallbackData.length,
                        total_machines_in_use: 0,
                        day_supervisors: 0,
                        night_supervisors: 0,
                        day_assignments: 0,
                        night_assignments: 0
                    }
                });
            } catch (fallbackError) {
                console.error("Failed to fetch roster:", fallbackError);
                alert("Failed to load roster. Please check the server connection.");
                setRosterData({ 
                    supervisors: [], 
                    assignments: [], 
                    attendance: [],
                    machinesInUse: [],
                    summary: {
                        total_supervisors: 0,
                        total_assignments: 0,
                        total_attendance: 0,
                        total_machines_in_use: 0,
                        day_supervisors: 0,
                        night_supervisors: 0,
                        day_assignments: 0,
                        night_assignments: 0
                    }
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRosterForDate(selectedDate);
    }, [selectedDate]);


    const handleVerify = async (workerId) => {
        try {
            await API.put(`/labour/verify/${workerId}`);
            // Refresh the data after verification
            fetchRosterForDate(selectedDate);
        } catch (error) {
            alert('Failed to verify worker: ' + error.message);
        }
    };
    

    // Enhanced export functionality
    const handleExport = async () => {
        try {
            setLoading(true);
            
            if (exportFormat === 'excel') {
                exportToExcel(rosterData, selectedDate);
                alert(`Exported labour layout for ${selectedDate}`);
            } else {
                const allData = [
                    ...rosterData.supervisors.map(s => ({
                        'Type': 'Supervisor',
                        'Name': s.fullName || s.name,
                        'Employee Code': s.employee_code || 'N/A',
                        'Machine': 'N/A',
                        'Production Area': 'Supervision',
                        'Position': s.position,
                        'Shift': s.shift,
                        'Status': s.status,
                        'Date': selectedDate
                    })),
                    ...rosterData.assignments.map(a => ({
                        'Type': 'Employee',
                        'Name': a.fullName || a.name,
                        'Employee Code': a.employee_code || 'N/A',
                        'Machine': a.machine || 'N/A',
                        'Production Area': a.production_area || 'N/A',
                        'Position': a.position,
                        'Shift': a.shift,
                        'Status': a.status,
                        'Date': selectedDate
                    })),
                    ...rosterData.machinesInUse.map(m => ({
                        'Type': 'Machine',
                        'Name': m.name,
                        'Employee Code': 'N/A',
                        'Machine': m.name,
                        'Production Area': m.environment || 'N/A',
                        'Position': m.type || 'N/A',
                        'Shift': m.shifts_in_use || 'N/A',
                        'Status': m.status,
                        'Date': selectedDate
                    })),
                    ...rosterData.attendance.map(w => ({
                        'Type': 'Attendance',
                        'Name': w.name,
                        'Employee Code': 'N/A',
                        'Machine': 'N/A',
                        'Production Area': w.production_area || 'N/A',
                        'Position': w.position || 'N/A',
                        'Shift': w.shift,
                        'Status': w.status,
                        'Date': selectedDate
                    }))
                ];
                
                const filename = `labour-layout-${selectedDate}.${exportFormat}`;
                
                if (exportFormat === 'csv') {
                    exportToCSV(allData, filename);
                } else {
                    exportToJSON(allData, filename);
                }
                
                alert(`Exported ${allData.length} records to ${exportFormat.toUpperCase()}`);
            }
            
            setShowExportModal(false);
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Daily Labour Layout</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button 
                        onClick={() => fetchRosterForDate(selectedDate)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <div>
                            <h2 className="text-lg font-semibold">Labour Layout</h2>
                            <p className="text-sm text-gray-600">{selectedDate} • {((rosterData.summary?.total_supervisors || 0) + (rosterData.summary?.total_assignments || 0) + (rosterData.summary?.total_attendance || 0) + (rosterData.summary?.total_machines_in_use || 0))} total records</p>
                        </div>
                    </div>
                </div>
                {/* Shift Filter */}
                <div className="p-4 border-b">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-gray-700">Filter by Shift:</label>
                        <select 
                            value={selectedShift} 
                            onChange={e => setSelectedShift(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Shifts</option>
                            <option value="day">Day Shift</option>
                            <option value="night">Night Shift</option>
                        </select>
                        <div className="flex items-center gap-6 ml-auto text-sm">
                            <span className="text-blue-600">Supervisors: {rosterData.summary?.total_supervisors || 0}</span>
                            <span className="text-green-600">Assignments: {rosterData.summary?.total_assignments || 0}</span>
                            <span className="text-orange-600">Machines: {rosterData.summary?.total_machines_in_use || 0}</span>
                            <span className="text-purple-600">Attendance: {rosterData.summary?.total_attendance || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-auto" style={{maxHeight: '60vh'}}>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                        <div className="space-y-6 p-4">
                            {/* Supervisors Section */}
                            {rosterData.supervisors && rosterData.supervisors.filter(s => selectedShift === 'all' || s.shift === selectedShift).length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Supervisors on Duty
                                    </h3>
                                    <div className="bg-blue-50 rounded-lg overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-blue-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Name</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Employee Code</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Shift</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-blue-100">
                                                {rosterData.supervisors.filter(s => selectedShift === 'all' || s.shift === selectedShift).map(supervisor => (
                                                    <tr key={`supervisor-${supervisor.id}`}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {supervisor.fullName || supervisor.name}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {supervisor.employee_code || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${supervisor.shift === 'day' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                                                {supervisor.shift === 'day' ? 'Day Shift' : 'Night Shift'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                {supervisor.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Assigned Employees Section */}
                            {rosterData.assignments && rosterData.assignments.filter(a => selectedShift === 'all' || a.shift === selectedShift).length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5" />
                                        Assigned Employees
                                    </h3>
                                    <div className="bg-green-50 rounded-lg overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Name</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Employee Code</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Machine</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Production Area</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Shift</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-green-100">
                                                {rosterData.assignments.filter(a => selectedShift === 'all' || a.shift === selectedShift).map(assignment => (
                                                    <tr key={`assignment-${assignment.id}`}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {assignment.fullName || assignment.name}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {assignment.employee_code || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {assignment.machine || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {assignment.production_area || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${assignment.shift === 'day' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                                                {assignment.shift === 'day' ? 'Day Shift' : 'Night Shift'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                assignment.status === 'present' ? 'bg-green-100 text-green-800' :
                                                                assignment.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {assignment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Machines in Use Section */}
                            {rosterData.machinesInUse && rosterData.machinesInUse.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                        <Settings className="w-5 h-5" />
                                        Machines in Use
                                    </h3>
                                    <div className="bg-orange-50 rounded-lg overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-orange-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Machine</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Type</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Environment</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Assigned Workers</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Shifts</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Capacity</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-orange-100">
                                                {rosterData.machinesInUse.map(machine => (
                                                    <tr key={`machine-${machine.id}`}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {machine.name}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {machine.type || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {machine.environment || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                                    Total: {machine.assigned_workers}
                                                                </span>
                                                                {machine.day_workers > 0 && (
                                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                                                                        Day: {machine.day_workers}
                                                                    </span>
                                                                )}
                                                                {machine.night_workers > 0 && (
                                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                                        Night: {machine.night_workers}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                {machine.shifts_in_use || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                            {machine.capacity || 'N/A'}%
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                machine.status === 'available' ? 'bg-green-100 text-green-800' : 
                                                                machine.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {machine.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Attendance Records Section */}
                            {rosterData.attendance && rosterData.attendance.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                        <UserCheck className="w-5 h-5" />
                                        Attendance Records
                                    </h3>
                                    <div className="bg-purple-50 rounded-lg overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-purple-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Name</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Production Area</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Position</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Shift</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Status</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-purple-100">
                                                {rosterData.attendance.map(worker => (
                                                    <tr key={`attendance-${worker.id}`}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{worker.name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{worker.production_area || 'N/A'}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{worker.position || 'N/A'}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{worker.shift}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                worker.status === 'present' ? 'bg-green-100 text-green-800' : 
                                                                worker.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {worker.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            {worker.status === 'pending' && (
                                                                <button onClick={() => handleVerify(worker.id)} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                                                                    Verify Arrival
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* No Data Message */}
                            {(!rosterData.supervisors || rosterData.supervisors.length === 0) && 
                             (!rosterData.assignments || rosterData.assignments.length === 0) && 
                             (!rosterData.machinesInUse || rosterData.machinesInUse.length === 0) &&
                             (!rosterData.attendance || rosterData.attendance.length === 0) && (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No labour data found for {selectedDate}</p>
                                    <p className="text-sm">Try selecting a different date or check if data has been entered for this date.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Export Labour Layout</h3>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                                <select 
                                    value={exportFormat} 
                                    onChange={e => setExportFormat(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="excel">Excel (.xlsx)</option>
                                    <option value="csv">CSV (.csv)</option>
                                    <option value="json">JSON (.json)</option>
                                </select>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-800">Exporting labour layout for:</p>
                                <p className="font-medium text-blue-900">{selectedDate}</p>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>Supervisors: {rosterData.summary?.total_supervisors || 0}</p>
                                    <p>Assignments: {rosterData.summary?.total_assignments || 0}</p>
                                    <p>Machines: {rosterData.summary?.total_machines_in_use || 0}</p>
                                    <p>Attendance: {rosterData.summary?.total_attendance || 0}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExport}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {loading ? 'Exporting...' : 'Export'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
