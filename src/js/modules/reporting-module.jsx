import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { formatSASTDate, getSASTDateOnly, getCurrentSASTTime } from '../utils/timezone.js';

// Shared components
const ContentCard = ({ title, subtitle, children, className = '' }) => (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {children}
    </div>
);

const LoadingSpinner = ({ size = 20 }) => (
    <svg 
        className="animate-spin text-blue-500" 
        width={size} 
        height={size} 
        fill="none" 
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const Button = ({ 
    children, 
    onClick, 
    disabled = false, 
    loading = false, 
    variant = 'primary', 
    size = 'md',
    type = 'button',
    className = '',
    icon = null,
    ...props 
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    };
    
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading && <LoadingSpinner size={16} />}
            {!loading && icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
};

const Select = ({ label, value, onChange, options, disabled = false, error = '', className = '', ...props }) => (
    <div className={className}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
        )}
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
            {...props}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

const Input = ({ label, error = '', className = '', ...props }) => (
    <div className={className}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
        )}
        <input
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
            }`}
            {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

// Report Generator Component
export const ReportGenerator = ({ initialType = 'production', initialFilters = {} }) => {
    const [selectedType, setSelectedType] = useState(initialType);
    const [generating, setGenerating] = useState(false);
    const [schedule, setSchedule] = useState('manual');
    const [recipients, setRecipients] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: '', type: 'success' });

    const reportTypes = useMemo(() => [
        { value: 'production', label: 'Production Report', description: 'Comprehensive production metrics and performance' },
        { value: 'downtime', label: 'Downtime Analysis', description: 'Equipment downtime and maintenance insights' },
        { value: 'efficiency', label: 'Efficiency Report', description: 'Overall operational efficiency metrics' },
        { value: 'inventory', label: 'Inventory Status', description: 'Current inventory levels and trends' }
    ], []);

    const scheduleOptions = useMemo(() => [
        { value: 'manual', label: 'Manual Generation' },
        { value: 'daily', label: 'Daily (08:00 AM)' },
        { value: 'weekly', label: 'Weekly (Monday 08:00 AM)' },
        { value: 'monthly', label: 'Monthly (1st day, 08:00 AM)' }
    ], []);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (schedule !== 'manual' && !recipients.trim()) {
            newErrors.recipients = 'Email recipients are required for scheduled reports';
        }
        
        if (recipients.trim()) {
            const emailList = recipients.split(',').map(e => e.trim()).filter(Boolean);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalidEmails = emailList.filter(email => !emailRegex.test(email));
            
            if (invalidEmails.length > 0) {
                newErrors.recipients = `Invalid email addresses: ${invalidEmails.join(', ')}`;
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [schedule, recipients]);

    const generateReport = useCallback(async (format = 'pdf') => {
        if (!validateForm()) return;
        
        setGenerating(true);
        setMessage({ text: '', type: 'success' });
        
        try {
            const response = await API.post('/reports/generate', {
                type: selectedType,
                format,
                filters: initialFilters,
                schedule,
                recipients: recipients.split(',').map(e => e.trim()).filter(Boolean)
            });

            if (response.url) {
                window.open(response.url, '_blank');
                setMessage({ text: 'Report generated successfully!', type: 'success' });
            } else if (response.download_url) {
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = `${selectedType}-report.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setMessage({ text: 'Report downloaded successfully!', type: 'success' });
            }
        } catch (error) {
            setMessage({ 
                text: error.response?.data?.message || 'Failed to generate report', 
                type: 'error' 
            });
        } finally {
            setGenerating(false);
        }
    }, [selectedType, initialFilters, schedule, recipients, validateForm]);

    return (
        <ContentCard 
            title="Generate Report" 
            subtitle="Create detailed reports with customizable scheduling options"
        >
            <div className="space-y-6">
                {message.text && (
                    <div 
                        className={`p-3 rounded-md ${
                            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                        role="alert"
                        aria-live="polite"
                    >
                        {message.text}
                    </div>
                )}

                {/* Report Type Selection */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Report Type</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {reportTypes.map(report => (
                            <button
                                key={report.value}
                                onClick={() => setSelectedType(report.value)}
                                className={`p-4 border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    selectedType === report.value 
                                        ? 'border-blue-500 bg-blue-50 text-blue-900' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                aria-pressed={selectedType === report.value}
                            >
                                <div className="font-medium">{report.label}</div>
                                <div className="text-sm text-gray-600 mt-1">{report.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Schedule Settings */}
                <Select
                    label="Report Schedule"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    options={scheduleOptions}
                    disabled={generating}
                />

                {/* Recipients (for scheduled reports) */}
                {schedule !== 'manual' && (
                    <Input
                        label="Email Recipients"
                        placeholder="email1@example.com, email2@example.com"
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                        error={errors.recipients}
                        disabled={generating}
                        type="email"
                        aria-describedby="recipients-help"
                    />
                )}
                {schedule !== 'manual' && (
                    <p id="recipients-help" className="text-sm text-gray-600">
                        Separate multiple email addresses with commas
                    </p>
                )}

                {/* Generate Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                        onClick={() => generateReport('pdf')}
                        loading={generating}
                        disabled={generating}
                        className="flex-1"
                        icon={<span>📄</span>}
                    >
                        Generate PDF
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => generateReport('excel')}
                        loading={generating}
                        disabled={generating}
                        className="flex-1"
                        icon={<span>📊</span>}
                    >
                        Generate Excel
                    </Button>
                </div>
            </div>
        </ContentCard>
    );
};

// Custom Report Builder
export const CustomReportBuilder = () => {
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [groupBy, setGroupBy] = useState('day');
    const [chartType, setChartType] = useState('line');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [errors, setErrors] = useState({});

    const metricCategories = useMemo(() => ({
        'Orders': [
            { id: 'orders_count', label: 'Order Count' },
            { id: 'orders_completed', label: 'Completed Orders' },
            { id: 'orders_pending', label: 'Pending Orders' }
        ],
        'Production': [
            { id: 'production_quantity', label: 'Production Quantity' },
            { id: 'production_rate', label: 'Production Rate' },
            { id: 'quality_score', label: 'Quality Score' }
        ],
        'Equipment': [
            { id: 'machine_utilization', label: 'Machine Utilization' },
            { id: 'downtime_duration', label: 'Downtime Duration' },
            { id: 'maintenance_cost', label: 'Maintenance Cost' }
        ],
        'Efficiency': [
            { id: 'efficiency_rate', label: 'Efficiency Rate' },
            { id: 'waste_percentage', label: 'Waste Percentage' },
            { id: 'energy_consumption', label: 'Energy Consumption' }
        ]
    }), []);

    const toggleMetric = useCallback((metricId) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        );
    }, []);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (selectedMetrics.length === 0) {
            newErrors.metrics = 'Please select at least one metric';
        }
        
        if (!dateRange.start) newErrors.startDate = 'Start date is required';
        if (!dateRange.end) newErrors.endDate = 'End date is required';
        
        if (dateRange.start && dateRange.end && new Date(dateRange.start) >= new Date(dateRange.end)) {
            newErrors.dateRange = 'End date must be after start date';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [selectedMetrics, dateRange]);

    const generateCustomReport = useCallback(async () => {
        if (!validateForm()) return;
        
        setIsGenerating(true);
        try {
            const response = await API.post('/reports/custom', {
                metrics: selectedMetrics,
                groupBy,
                chartType,
                dateRange
            });
            
            // Handle response - could open in new window or download
            if (response.preview_url) {
                window.open(response.preview_url, '_blank');
            }
        } catch (error) {
            console.error('Failed to generate custom report:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedMetrics, groupBy, chartType, dateRange, validateForm]);

    return (
        <ContentCard 
            title="Custom Report Builder" 
            subtitle="Build custom reports with your selected metrics and visualization preferences"
        >
            <div className="space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Start Date (SAST)"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        error={errors.startDate}
                        max={dateRange.end || getSASTDateOnly()}
                    />
                    <Input
                        label="End Date (SAST)"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        error={errors.endDate}
                        min={dateRange.start || undefined}
                        max={getSASTDateOnly()}
                    />
                </div>
                {errors.dateRange && <p className="text-sm text-red-600">{errors.dateRange}</p>}

                {/* Metric Selection */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Select Metrics
                        {errors.metrics && <span className="text-red-600 ml-2">*</span>}
                    </h4>
                    {errors.metrics && <p className="text-sm text-red-600 mb-3">{errors.metrics}</p>}
                    
                    <div className="space-y-4">
                        {Object.entries(metricCategories).map(([category, metrics]) => (
                            <div key={category} className="border rounded-lg p-4">
                                <h5 className="font-medium text-gray-800 mb-2">{category}</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {metrics.map(metric => (
                                        <label
                                            key={metric.id}
                                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedMetrics.includes(metric.id)}
                                                onChange={() => toggleMetric(metric.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">{metric.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grouping and Chart Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Group By"
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        options={[
                            { value: 'hour', label: 'Hour' },
                            { value: 'day', label: 'Day' },
                            { value: 'week', label: 'Week' },
                            { value: 'month', label: 'Month' },
                            { value: 'quarter', label: 'Quarter' },
                            { value: 'machine', label: 'Machine' },
                            { value: 'department', label: 'Department' }
                        ]}
                    />
                    <Select
                        label="Chart Type"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        options={[
                            { value: 'line', label: 'Line Chart' },
                            { value: 'bar', label: 'Bar Chart' },
                            { value: 'area', label: 'Area Chart' },
                            { value: 'pie', label: 'Pie Chart' },
                            { value: 'table', label: 'Data Table' }
                        ]}
                    />
                </div>

                {/* Preview Button */}
                <div className="pt-4 border-t">
                    <Button
                        onClick={generateCustomReport}
                        loading={isGenerating}
                        disabled={isGenerating || selectedMetrics.length === 0}
                        className="w-full md:w-auto"
                        icon={<span>👁️</span>}
                    >
                        {isGenerating ? 'Generating Preview...' : 'Preview Report'}
                    </Button>
                </div>
            </div>
        </ContentCard>
    );
};

// Report Template Manager
export const ReportTemplateManager = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await API.get('/reports/templates');
            setTemplates(data);
            setError('');
        } catch (error) {
            setError('Failed to load templates');
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteTemplate = useCallback(async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the template "${name}"?`)) return;
        
        try {
            await API.delete(`/reports/templates/${id}`);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            setError('Failed to delete template');
            console.error('Failed to delete template:', error);
        }
    }, []);

    const duplicateTemplate = useCallback(async (template) => {
        try {
            const response = await API.post('/reports/templates', {
                ...template,
                name: `${template.name} (Copy)`,
                id: undefined
            });
            setTemplates(prev => [...prev, response]);
        } catch (error) {
            setError('Failed to duplicate template');
            console.error('Failed to duplicate template:', error);
        }
    }, []);

    if (loading) {
        return (
            <ContentCard title="Report Templates">
                <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size={24} />
                    <span className="ml-2">Loading templates...</span>
                </div>
            </ContentCard>
        );
    }

    return (
        <ContentCard title="Report Templates" subtitle="Manage and organize your report templates">
            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                        {error}
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {templates.length} template{templates.length !== 1 ? 's' : ''} available
                    </div>
                    {user?.role === 'admin' && (
                        <Button
                            size="sm"
                            onClick={() => setShowCreateModal(true)}
                            icon={<span>➕</span>}
                        >
                            Create Template
                        </Button>
                    )}
                </div>

                {templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📊</div>
                        <div>No templates created yet</div>
                        <div className="text-sm">Create your first template to get started</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <div
                                key={template.id}
                                className="border rounded-lg p-4 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-medium text-gray-900 line-clamp-1">
                                        {template.name}
                                    </h4>
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => duplicateTemplate(template)}
                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Duplicate template"
                                        >
                                            📋
                                        </button>
                                        {(user?.role === 'admin' || template.created_by === user?.id) && (
                                            <button
                                                onClick={() => deleteTemplate(template.id, template.name)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete template"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {template.description || 'No description available'}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                        {template.type}
                                    </span>
                                    <span>
                                        {template.last_used 
                                            ? `Used ${formatSASTDate(template.last_used, { includeTime: false, includeTimezone: false })}`
                                            : 'Never used'
                                        }
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ContentCard>
    );
};

// Export Queue Monitor
export const ExportQueueMonitor = () => {
    const [queue, setQueue] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let ws = null;
        
        const connectWebSocket = () => {
            try {
                // Replace with actual WebSocket URL from config
                ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/exports`);
                
                ws.onopen = () => {
                    setWsConnected(true);
                    setError('');
                };
                
                ws.onclose = () => {
                    setWsConnected(false);
                    // Attempt to reconnect after 5 seconds
                    setTimeout(connectWebSocket, 5000);
                };
                
                ws.onerror = () => {
                    setError('WebSocket connection failed');
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'export_update') {
                            setQueue(data.queue);
                        }
                    } catch (err) {
                        console.error('Failed to parse WebSocket message:', err);
                    }
                };
            } catch (err) {
                setError('Failed to establish WebSocket connection');
            }
        };

        loadQueue();
        connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    const loadQueue = useCallback(async () => {
        try {
            const data = await API.get('/exports/queue');
            setQueue(data);
            setError('');
        } catch (error) {
            setError('Failed to load export queue');
            console.error('Failed to load export queue:', error);
        }
    }, []);

    const cancelExport = useCallback(async (id, name) => {
        if (!window.confirm(`Cancel export "${name}"?`)) return;
        
        try {
            await API.post(`/exports/${id}/cancel`);
            setQueue(prev => prev.filter(job => job.id !== id));
        } catch (error) {
            setError('Failed to cancel export');
            console.error('Failed to cancel export:', error);
        }
    }, []);

    const retryExport = useCallback(async (id) => {
        try {
            await API.post(`/exports/${id}/retry`);
            loadQueue();
        } catch (error) {
            setError('Failed to retry export');
            console.error('Failed to retry export:', error);
        }
    }, [loadQueue]);

    if (queue.length === 0 && !error) {
        return null;
    }

    return (
        <ContentCard 
            title="Export Queue" 
            subtitle="Monitor ongoing export operations"
            className="mt-6"
        >
            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {queue.length} export{queue.length !== 1 ? 's' : ''} in queue
                    </div>
                    <div className="flex items-center space-x-2">
                        <div 
                            className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
                            title={wsConnected ? 'Connected' : 'Disconnected'}
                        />
                        <span className="text-xs text-gray-500">
                            {wsConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                </div>

                {queue.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                        No exports in queue
                    </div>
                ) : (
                    <div className="space-y-2">
                        {queue.map(job => (
                            <div
                                key={job.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {job.name}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {job.status}
                                        </span>
                                        {job.status === 'processing' && (
                                            <div className="flex items-center space-x-1">
                                                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                                    <div 
                                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                        style={{ width: `${job.progress || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-600">{job.progress || 0}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                    {job.status === 'processing' && (
                                        <LoadingSpinner size={16} />
                                    )}
                                    {job.status === 'failed' && (
                                        <button
                                            onClick={() => retryExport(job.id)}
                                            className="text-blue-600 hover:text-blue-700 text-sm"
                                            title="Retry export"
                                        >
                                            🔄
                                        </button>
                                    )}
                                    {job.status === 'pending' && (
                                        <button
                                            onClick={() => cancelExport(job.id, job.name)}
                                            className="text-red-600 hover:text-red-700"
                                            title="Cancel export"
                                        >
                                            ❌
                                        </button>
                                    )}
                                    {job.status === 'completed' && job.download_url && (
                                        <a
                                            href={job.download_url}
                                            className="text-green-600 hover:text-green-700"
                                            title="Download"
                                            download
                                        >
                                            ⬇️
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ContentCard>
    );
};

// Main Reporting Page Component
export const ReportingPage = () => {
    const [activeTab, setActiveTab] = useState('generator');
    const { user } = useAuth();

    const tabs = useMemo(() => [
        { id: 'generator', label: 'Report Generator', icon: '📊' },
        { id: 'custom', label: 'Custom Builder', icon: '🔧' },
        { id: 'templates', label: 'Templates', icon: '📋' },
        { id: 'queue', label: 'Export Queue', icon: '⏳' }
    ], []);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>
                <div className="text-sm text-gray-600">
                    Welcome back, {user?.fullName || user?.email}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" role="tablist">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                                activeTab === tab.id 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`${tab.id}-panel`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div role="tabpanel">
                {activeTab === 'generator' && (
                    <div id="generator-panel" aria-labelledby="generator-tab">
                        <ReportGenerator />
                    </div>
                )}
                {activeTab === 'custom' && (
                    <div id="custom-panel" aria-labelledby="custom-tab">
                        <CustomReportBuilder />
                    </div>
                )}
                {activeTab === 'templates' && (
                    <div id="templates-panel" aria-labelledby="templates-tab">
                        <ReportTemplateManager />
                    </div>
                )}
                {activeTab === 'queue' && (
                    <div id="queue-panel" aria-labelledby="queue-tab">
                        <ExportQueueMonitor />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportingPage;