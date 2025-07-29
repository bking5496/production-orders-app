import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, Users, TrendingUp, AlertTriangle, RefreshCw, Download, 
    Calendar, BarChart3, Activity, Target, CheckCircle, Play,
    FileText, ArrowRight, Filter, Search, Eye, Plus
} from 'lucide-react';
import API from '../core/api';
import { Card, Button, Badge, Modal } from './ui-components.jsx';

export default function ShiftReports() {
    const [currentShift, setCurrentShift] = useState(null);
    const [shiftReports, setShiftReports] = useState([]);
    const [quantityUpdates, setQuantityUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [selectedEnvironment, setSelectedEnvironment] = useState('packaging');
    const [environments, setEnvironments] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Notification helper
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Get current shift info
    const getCurrentShiftInfo = () => {
        const now = new Date();
        const hour = now.getHours();
        const shiftType = (hour >= 6 && hour < 18) ? 'day' : 'night';
        const shiftDate = now.toISOString().split('T')[0];
        
        const shiftTimes = {
            day: { start: '06:00', end: '18:00', label: 'Day Shift' },
            night: { start: '18:00', end: '06:00', label: 'Night Shift' }
        };
        
        return {
            type: shiftType,
            date: shiftDate,
            ...shiftTimes[shiftType]
        };
    };

    // Load data
    const loadData = async () => {
        try {
            setLoading(true);
            
            // Get environments
            const envData = await API.get('/environments');
            setEnvironments(envData || []);
            
            // Get current shift report
            const currentShiftData = await API.get(`/shifts/current?environment=${selectedEnvironment}`);
            setCurrentShift(currentShiftData);
            
            // Get shift reports history
            const reportsData = await API.get(`/shifts/reports?environment=${selectedEnvironment}&limit=10`);
            setShiftReports(reportsData || []);
            
            // Get today's quantity updates
            const shiftInfo = getCurrentShiftInfo();
            const updatesData = await API.get(`/shifts/quantity-updates?shift_date=${shiftInfo.date}&shift_type=${shiftInfo.type}&environment=${selectedEnvironment}`);
            setQuantityUpdates(updatesData || []);
            
        } catch (error) {
            console.error('Failed to load shift data:', error);
            showNotification('Failed to load shift data', 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Generate current shift report
    const generateShiftReport = async () => {
        try {
            setRefreshing(true);
            
            if (!currentShift?.id) {
                showNotification('No current shift found', 'warning');
                return;
            }
            
            const response = await API.post(`/shifts/${currentShift.id}/generate`);
            setCurrentShift(response.report);
            showNotification('Shift report generated successfully');
            loadData(); // Refresh data
            
        } catch (error) {
            console.error('Failed to generate shift report:', error);
            showNotification('Failed to generate shift report', 'danger');
        } finally {
            setRefreshing(false);
        }
    };

    // Export shift report
    const exportShiftReport = (report) => {
        const csvData = [
            ['Metric', 'Value'],
            ['Shift Date', report.shift_date],
            ['Shift Type', report.shift_type.toUpperCase()],
            ['Environment', report.environment],
            ['Total Orders', report.total_orders || 0],
            ['Completed Orders', report.completed_orders || 0],
            ['In Progress Orders', report.in_progress_orders || 0],
            ['Stopped Orders', report.stopped_orders || 0],
            ['Total Quantity Produced', report.total_quantity_produced || 0],
            ['Total Stops', report.total_stops || 0],
            ['Total Downtime (minutes)', report.total_downtime_minutes || 0],
            ['OEE Percentage', `${report.oee_percentage?.toFixed(1) || 0}%`],
            ['Efficiency Percentage', `${report.efficiency_percentage?.toFixed(1) || 0}%`],
            ['Quality Percentage', `${report.quality_percentage?.toFixed(1) || 100}%`]
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift-report-${report.shift_date}-${report.shift_type}-${report.environment}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Shift report exported successfully');
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [selectedEnvironment]);

    const shiftInfo = getCurrentShiftInfo();

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading shift reports...
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                    notification.type === 'danger' ? 'bg-red-100 text-red-800 border border-red-200' :
                    notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Shift Reports</h1>
                    <p className="text-gray-600 mt-1">Real-time production shift tracking and automated reporting</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <select
                        value={selectedEnvironment}
                        onChange={(e) => setSelectedEnvironment(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Environments</option>
                        {environments.map(env => (
                            <option key={env.code} value={env.code}>{env.name}</option>
                        ))}
                    </select>
                    
                    <Button onClick={loadData} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Current Shift Overview */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h2 className="text-xl font-bold text-gray-800">Current Shift - {shiftInfo.label}</h2>
                        <Badge variant="info">{shiftInfo.date}</Badge>
                        <Badge variant="default">{shiftInfo.start} - {shiftInfo.end}</Badge>
                    </div>
                    
                    <Button 
                        onClick={generateShiftReport}
                        disabled={refreshing}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {refreshing ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <BarChart3 className="w-4 h-4 mr-2" />
                        )}
                        Generate Report
                    </Button>
                </div>

                {currentShift && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{currentShift.total_orders || 0}</div>
                            <div className="text-sm text-gray-600">Total Orders</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{currentShift.completed_orders || 0}</div>
                            <div className="text-sm text-gray-600">Completed</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{currentShift.in_progress_orders || 0}</div>
                            <div className="text-sm text-gray-600">In Progress</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{currentShift.stopped_orders || 0}</div>
                            <div className="text-sm text-gray-600">Stopped</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {(currentShift.total_quantity_produced || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">Quantity Produced</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {currentShift.oee_percentage ? `${currentShift.oee_percentage.toFixed(1)}%` : '0%'}
                            </div>
                            <div className="text-sm text-gray-600">OEE</div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Recent Quantity Updates */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Quantity Updates ({quantityUpdates.length})
                </h3>
                
                {quantityUpdates.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No quantity updates recorded for current shift</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {quantityUpdates.map((update, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {update.order_number} - {update.product_name}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {update.machine_name} • {update.updated_by_name}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <div className="font-bold text-gray-900">
                                        {update.previous_quantity} → {update.new_quantity}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(update.update_time).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Shift Reports History */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Shift Reports History
                </h3>
                
                {shiftReports.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No shift reports available</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shiftReports.map((report) => (
                            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {report.shift_date} - {report.shift_type.toUpperCase()} Shift
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {report.environment} • {report.supervisor_name || 'No supervisor assigned'}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 text-sm">
                                            <div className="text-center">
                                                <div className="font-bold text-blue-600">{report.total_orders || 0}</div>
                                                <div className="text-gray-500">Orders</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-green-600">{report.completed_orders || 0}</div>
                                                <div className="text-gray-500">Completed</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-purple-600">
                                                    {(report.total_quantity_produced || 0).toLocaleString()}
                                                </div>
                                                <div className="text-gray-500">Produced</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-orange-600">
                                                    {report.oee_percentage ? `${report.oee_percentage.toFixed(1)}%` : '0%'}
                                                </div>
                                                <div className="text-gray-500">OEE</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                setSelectedReport(report);
                                                setShowReportModal(true);
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                        </Button>
                                        <Button
                                            onClick={() => exportShiftReport(report)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Report Detail Modal */}
            {showReportModal && selectedReport && (
                <Modal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    title={`Shift Report - ${selectedReport.shift_date} ${selectedReport.shift_type.toUpperCase()}`}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-gray-900">{selectedReport.total_orders || 0}</div>
                                <div className="text-xs text-gray-600">Total Orders</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-green-600">{selectedReport.completed_orders || 0}</div>
                                <div className="text-xs text-gray-600">Completed</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-yellow-600">{selectedReport.in_progress_orders || 0}</div>
                                <div className="text-xs text-gray-600">In Progress</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-red-600">{selectedReport.stopped_orders || 0}</div>
                                <div className="text-xs text-gray-600">Stopped</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-purple-600">
                                    {(selectedReport.total_quantity_produced || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-600">Quantity Produced</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-orange-600">
                                    {selectedReport.oee_percentage ? `${selectedReport.oee_percentage.toFixed(1)}%` : '0%'}
                                </div>
                                <div className="text-xs text-gray-600">OEE</div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Downtime Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>Total Stops: <span className="font-medium">{selectedReport.total_stops || 0}</span></div>
                                <div>Total Downtime: <span className="font-medium">{selectedReport.total_downtime_minutes || 0} minutes</span></div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Machine Utilization</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>Active Machines: <span className="font-medium">{selectedReport.total_machines_active || 0}</span></div>
                                <div>Available Machines: <span className="font-medium">{selectedReport.total_machines_available || 0}</span></div>
                            </div>
                        </div>

                        {selectedReport.summary_notes && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Summary Notes</h4>
                                <p className="text-sm text-gray-700">{selectedReport.summary_notes}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={() => exportShiftReport(selectedReport)}
                                variant="outline"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                            <Button onClick={() => setShowReportModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}