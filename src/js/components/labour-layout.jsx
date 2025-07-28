import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, RefreshCw, Upload, FileText, Eye } from 'lucide-react';
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
const exportToExcel = (workers, selectedDate) => {
    // Check if XLSX library is available
    if (!window.XLSX) {
        // Fallback to CSV if XLSX not available
        console.warn('XLSX library not available, falling back to CSV export');
        exportToCSV(
            workers.map(worker => ({
                'Name': worker.name,
                'Production Area': worker.production_area,
                'Position': worker.position,
                'Shift': worker.shift,
                'Status': worker.status,
                'Date': selectedDate
            })),
            `labour-layout-${selectedDate}.csv`
        );
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
    wsData.push(['Total Workers:', workers.length]);
    wsData.push([]);
    
    // Workers table headers
    wsData.push(['Name', 'Production Area', 'Position', 'Shift', 'Status']);
    
    // Workers data
    workers.forEach(worker => {
        wsData.push([
            worker.name,
            worker.production_area,
            worker.position, 
            worker.shift,
            worker.status
        ]);
    });
    
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
        summary: {}
    });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('excel');
    const [selectedShift, setSelectedShift] = useState('all');
    const fileInputRef = useRef(null); // Ref to access the hidden file input

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
                    summary: { total_attendance: fallbackData.length }
                });
            } catch (fallbackError) {
                console.error("Failed to fetch roster:", fallbackError);
                alert("Failed to load roster. Please check the server connection.");
                setRosterData({ supervisors: [], assignments: [], attendance: [], summary: {} });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRosterForDate(selectedDate);
    }, [selectedDate]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('rosterFile', file);

        try {
            const response = await fetch('/api/labour/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upload failed');
            }
            const result = await response.json();
            alert(result.message || 'Roster uploaded successfully!');
            fetchRosterForDate(selectedDate);
        } catch (error) {
            alert('Error uploading roster: ' + error.message);
        }
    };

    const handleVerify = async (workerId) => {
        try {
            await API.put(`/labour/verify/${workerId}`);
            setWorkers(currentWorkers => 
                currentWorkers.map(w => w.id === workerId ? { ...w, status: 'present' } : w)
            );
        } catch (error) {
            alert('Failed to verify worker: ' + error.message);
        }
    };
    
    const handleDownload = () => {
        window.location.href = '/api/labour/export';
    };

    // Enhanced export functionality
    const handleExport = async () => {
        try {
            setLoading(true);
            
            if (exportFormat === 'excel') {
                exportToExcel(workers, selectedDate);
                alert(`Exported labour layout for ${selectedDate}`);
            } else {
                const exportData = workers.map(worker => ({
                    'Name': worker.name,
                    'Production Area': worker.production_area,
                    'Position': worker.position,
                    'Shift': worker.shift,
                    'Status': worker.status,
                    'Date': selectedDate
                }));
                
                const filename = `labour-layout-${selectedDate}.${exportFormat}`;
                
                if (exportFormat === 'csv') {
                    exportToCSV(exportData, filename);
                } else {
                    exportToJSON(exportData, filename);
                }
                
                alert(`Exported ${exportData.length} worker records to ${exportFormat.toUpperCase()}`);
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
                            <p className="text-sm text-gray-600">{selectedDate} • {(rosterData.summary.total_supervisors || 0) + (rosterData.summary.total_assignments || 0) + (rosterData.summary.total_attendance || 0)} total records</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
                        <button 
                            onClick={() => fileInputRef.current.click()} 
                            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Roster
                        </button>
                        <button 
                            onClick={handleDownload} 
                            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            Legacy Export
                        </button>
                    </div>
                </div>
                <div className="overflow-auto" style={{maxHeight: '60vh'}}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Production Area</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4 text-gray-500">Loading...</td></tr>
                            ) : workers.map(worker => (
                                <tr key={worker.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{worker.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.production_area}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.position}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.shift}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${worker.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{worker.status}</span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        {worker.status === 'pending' && (
                                            <button onClick={() => handleVerify(worker.id)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Verify Arrival</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                                <p className="text-sm text-blue-700">{workers.length} workers</p>
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
