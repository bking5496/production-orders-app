import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Eye, Users, ClipboardList, UserCheck, Settings, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../core/api';
import { formatUserDisplayName, formatEmployeeCode, formatRoleName } from '../utils/text-utils';

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

const exportToExcel = (rosterData, selectedDate) => {
    if (!window.XLSX) {
        console.warn('XLSX library not available, falling back to CSV export');
        const allData = [
            ...rosterData.supervisors.map(s => ({
                'Type': 'Supervisor',
                'Employee Code': s.employee_code || 'N/A',
                'Name': s.fullName || s.name,
                'Machine': 'N/A',
                'Position': 'Supervisor',
                'Shift': s.shift,
                'Company': 'N/A',
                'Status': s.status,
                'Date': selectedDate
            })),
            ...rosterData.assignments.map(a => ({
                'Type': 'Employee',
                'Employee Code': a.employee_code || 'N/A',
                'Name': formatUserDisplayName(a),
                'Machine': a.machine || 'N/A',
                'Position': a.position ? a.position : (a.role ? a.role : 'Operator'),
                'Shift': a.shift,
                'Company': a.company || 'N/A',
                'Status': a.status,
                'Date': selectedDate
            })),
        ];
        exportToCSV(allData, `labour-layout-${selectedDate}.csv`);
        return;
    }

    const wb = window.XLSX.utils.book_new();
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const wsData = [];
    wsData.push(['DAILY LABOUR LAYOUT REPORT']);
    wsData.push([]);
    wsData.push(['Day of Week:', dayOfWeek]);
    wsData.push(['Date:', formattedDate]);
    wsData.push(['Total Supervisors:', rosterData.summary.total_supervisors || 0]);
    wsData.push(['Total Assignments:', rosterData.summary.total_assignments || 0]);
    wsData.push([]);
    
    if (rosterData.supervisors.length > 0) {
        wsData.push(['SUPERVISORS ON DUTY']);
        wsData.push(['Employee Code', 'Name', 'Area', 'Position', 'Shift', 'Status']);
        rosterData.supervisors.forEach(supervisor => {
            wsData.push([
                supervisor.employee_code || 'N/A',
                supervisor.fullName || supervisor.name,
                'Supervision',
                'Supervisor',
                supervisor.shift,
                supervisor.status
            ]);
        });
    }
    
    if (rosterData.assignments.length > 0) {
        wsData.push([]);
        wsData.push(['ASSIGNED EMPLOYEES']);
        wsData.push(['Employee Code', 'Name', 'Machine', 'Position', 'Shift', 'Company', 'Status']);
        rosterData.assignments.forEach(assignment => {
            wsData.push([
                assignment.employee_code || 'N/A',
                assignment.fullName || assignment.name,
                assignment.machine || 'N/A',
                assignment.position ? assignment.position : (assignment.role ? assignment.role : 'Operator'),
                assignment.shift,
                assignment.company || 'N/A',
                assignment.status
            ]);
        });
    }

    
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 }
    ];
    ws['!cols'] = colWidths;
    
    window.XLSX.utils.book_append_sheet(wb, ws, 'Labour Layout');
    window.XLSX.writeFile(wb, `labour-layout-${selectedDate}.xlsx`);
};

export default function LabourLayoutPage() {
    const [rosterData, setRosterData] = useState({
        supervisors: [],
        assignments: [],
        machinesInUse: [],
        summary: {
            total_supervisors: 0,
            total_assignments: 0,
            total_machines_in_use: 0,
            day_supervisors: 0,
            night_supervisors: 0,
            day_assignments: 0,
            night_assignments: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        if (dateParam) {
            return dateParam;
        }
        return new Date().toISOString().split('T')[0];
    });
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('excel');
    const [selectedShift, setSelectedShift] = useState('all');
    const [selectedMachine, setSelectedMachine] = useState('all');

    // Date navigation functions
    const navigateDate = (direction) => {
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + direction);
        const newDate = currentDate.toISOString().split('T')[0];
        setSelectedDate(newDate);
    };

    const fetchRosterForDate = async (date) => {
        setLoading(true);
        try {
            const response = await API.get('/labour/roster?date=' + date);
            const data = response?.data || response;
            console.log('✅ Labour roster loaded for', date, ':', data);
            setRosterData(data);
        } catch (error) {
            console.error('❌ Failed to fetch roster for ' + date + ':', error);
            try {
                const fallbackResponse = await API.get('/labour/today');
                const fallbackData = fallbackResponse?.data || fallbackResponse;
                console.log('📅 Using today\'s labour data as fallback:', fallbackData);
                setRosterData(fallbackData || {
                    supervisors: [],
                    assignments: [],
                    machinesInUse: [],
                    summary: { 
                        total_supervisors: 0,
                        total_assignments: 0,
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
                    machinesInUse: [],
                    summary: {
                        total_supervisors: 0,
                        total_assignments: 0,
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
                        'Name': formatUserDisplayName(a),
                        'Employee Code': a.employee_code || 'N/A',
                        'Machine': a.machine || 'N/A',
                        'Production Area': a.production_area || 'N/A',
                        'Position': a.position,
                        'Shift': a.shift,
                        'Status': a.status,
                        'Date': selectedDate
                    })),
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
        <>
            <div className="min-h-screen bg-gray-50">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
                                    <span className="cursor-pointer hover:text-white transition-colors" onClick={() => window.location.href = '/labor-planner?date=' + selectedDate}>Labor Planner</span>
                                    <span>&gt;</span>
                                    <span className="text-white font-medium">Layout View</span>
                                    <span className="ml-2 px-2 py-1 bg-green-500 bg-opacity-20 text-green-200 rounded-full text-xs">Live Data</span>
                                </div>
                                <h1 className="text-2xl font-bold flex items-center gap-3">
                                    <Users className="w-8 h-8" />
                                    Daily Labour Layout
                                </h1>
                                <p className="text-blue-100 mt-1">Real-time workforce management and reporting</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                                <button 
                                    onClick={() => navigateDate(-1)}
                                    className="text-white hover:text-blue-200 transition-colors p-1 hover:bg-white hover:bg-opacity-10 rounded"
                                    title="Previous day"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <Calendar className="w-4 h-4" />
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={e => setSelectedDate(e.target.value)} 
                                    className="bg-transparent text-white placeholder-blue-200 border-none outline-none text-sm font-medium"
                                />
                                <button 
                                    onClick={() => navigateDate(1)}
                                    className="text-white hover:text-blue-200 transition-colors p-1 hover:bg-white hover:bg-opacity-10 rounded"
                                    title="Next day"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <button 
                                onClick={() => window.location.href = '/labor-planner?date=' + selectedDate}
                                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Plan Workforce
                            </button>
                            <button 
                                onClick={() => setShowExportModal(true)}
                                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                            <button 
                                onClick={() => fetchRosterForDate(selectedDate)}
                                className="bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Supervisors</p>
                                    <p className="text-2xl font-bold text-gray-900">{rosterData.summary?.total_supervisors || 0}</p>
                                </div>
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <UserCheck className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600">Assignments</p>
                                    <p className="text-2xl font-bold text-gray-900">{rosterData.summary?.total_assignments || 0}</p>
                                </div>
                                <div className="bg-green-100 p-3 rounded-full">
                                    <ClipboardList className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-600">Machines Active</p>
                                    <p className="text-2xl font-bold text-gray-900">{rosterData.summary?.total_machines_in_use || 0}</p>
                                </div>
                                <div className="bg-orange-100 p-3 rounded-full">
                                    <Settings className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Workforce Overview</h2>
                                    <p className="text-sm text-gray-600 mt-1">{selectedDate} • {((rosterData.summary?.total_supervisors || 0) + (rosterData.summary?.total_assignments || 0) + (rosterData.summary?.total_machines_in_use || 0))} total records</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={selectedShift} 
                                            onChange={e => setSelectedShift(e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">All Shifts</option>
                                            <option value="day">Day Shift</option>
                                            <option value="night">Night Shift</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={selectedMachine} 
                                            onChange={e => setSelectedMachine(e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Machine [all]</option>
                                            {/* Only show machines that have assigned employees */}
                                            {Array.from(new Set(rosterData.assignments?.map(a => a.machine).filter(m => m))).sort().map((machineName, index) => (
                                                <option key={index} value={machineName}>
                                                    {machineName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-500 mt-3">Loading workforce data...</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {rosterData.supervisors && rosterData.supervisors.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <div className="bg-blue-100 p-2 rounded-lg">
                                                    <Users className="w-5 h-5 text-blue-600" />
                                                </div>
                                                Supervisors on Duty
                                            </h3>
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full">
                                                        <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                                            <tr>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Employee Code</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Area</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Position</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Shift</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-blue-100">
                                                            {rosterData.supervisors.filter(s => selectedShift === 'all' ? true : s.shift === selectedShift).map(supervisor => (
                                                                <tr key={`supervisor-${supervisor.id}`} className="hover:bg-blue-50 transition-colors">
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600 font-mono font-semibold">
                                                                            {formatEmployeeCode(supervisor.employee_code)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex items-center">
                                                                            <div className="bg-blue-100 rounded-full p-2 mr-3">
                                                                                <Users className="w-4 h-4 text-blue-600" />
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-900">
                                                                                {formatUserDisplayName(supervisor)}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600">Supervision</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-900 font-medium">Supervisor</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${supervisor.shift === 'day' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                                            {supervisor.shift === 'day' ? 'Day Shift' : 'Night Shift'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                            {supervisor.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {rosterData.assignments && rosterData.assignments.filter(a => {
                                        const shiftMatch = selectedShift === 'all' ? true : a.shift === selectedShift;
                                        const machineMatch = selectedMachine === 'all' ? true : a.machine === selectedMachine;
                                        return shiftMatch && machineMatch;
                                    }).length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <div className="bg-green-100 p-2 rounded-lg">
                                                    <ClipboardList className="w-5 h-5 text-green-600" />
                                                </div>
                                                Assigned Employees
                                            </h3>
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full">
                                                        <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                                                            <tr>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Employee Code</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Machine</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Position</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Shift</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Company</th>
                                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-green-100">
                                                            {rosterData.assignments.filter(a => {
                                                                const shiftMatch = selectedShift === 'all' ? true : a.shift === selectedShift;
                                                                const machineMatch = selectedMachine === 'all' ? true : a.machine === selectedMachine;
                                                                return shiftMatch && machineMatch;
                                                            }).map(assignment => (
                                                                <tr key={`assignment-${assignment.id}`} className="hover:bg-green-50 transition-colors">
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600 font-mono font-semibold">
                                                                            {formatEmployeeCode(assignment.employee_code)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex items-center">
                                                                            <div className="bg-green-100 rounded-full p-2 mr-3">
                                                                                <Users className="w-4 h-4 text-green-600" />
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-900">
                                                                                {formatUserDisplayName(assignment)}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-900 font-medium">
                                                                            {assignment.machine || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600">
                                                                            {assignment.position ? assignment.position : (assignment.role ? assignment.role : 'Operator')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${assignment.shift === 'day' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                                            {assignment.shift === 'day' ? 'Day Shift' : 'Night Shift'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600">
                                                                            {assignment.company || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                                            assignment.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
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
                                        </div>
                                    )}


                                    {((rosterData.supervisors ? rosterData.supervisors.length : 0) === 0) && 
                                     ((rosterData.assignments ? rosterData.assignments.length : 0) === 0) && (
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
                </div>
            </div>

            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-semibold mb-4">Export Labour Layout</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                                <select 
                                    value={exportFormat} 
                                    onChange={e => setExportFormat(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="excel">Excel (.xlsx)</option>
                                    <option value="csv">CSV (.csv)</option>
                                    <option value="json">JSON (.json)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExport}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}