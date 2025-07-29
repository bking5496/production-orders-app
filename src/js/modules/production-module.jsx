import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../core/api';
import { useAuth } from '../core/auth';

// SAST Timezone Utilities (UTC+2) - Consistent across all components
const SAST_OFFSET_HOURS = 2;

// Convert UTC to SAST for display
const convertUTCToSAST = (utcDateString) => {
    if (!utcDateString) return null;
    const utcDate = new Date(utcDateString);
    const sastDate = new Date(utcDate.getTime() + (SAST_OFFSET_HOURS * 60 * 60 * 1000));
    return sastDate;
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

// Shared Components
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
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
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

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizes[size]} sm:w-full`}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 id="modal-title" className="text-lg font-medium text-gray-900">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                aria-label="Close modal"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Select = ({ label, value, onChange, options, disabled = false, error = '', required = false, className = '', ...props }) => (
    <div className={className}>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
        )}
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
            {...props}
        >
            <option value="">Select an option</option>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

const ProgressBar = ({ value, max, color = 'blue', showLabel = true, className = '' }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    
    const colors = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        red: 'bg-red-600',
        yellow: 'bg-yellow-600'
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${colors[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <div className="text-xs text-gray-600 mt-1">
                    {value} / {max} ({Math.round(percentage)}%)
                </div>
            )}
        </div>
    );
};

const Badge = ({ children, variant = 'default', size = 'md' }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800'
    };
    
    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm'
    };

    return (
        <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
            {children}
        </span>
    );
};

// Production Timer Component
export const ProductionTimer = ({ order, onUpdate }) => {
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const intervalRef = useRef(null);

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (order.status === 'in_progress' && !isPaused) {
            // Work with UTC timestamps from server
            const utcStartTime = order.start_time || order.started_at;
            if (utcStartTime) {
                const startTime = new Date(utcStartTime).getTime();
                const now = Date.now(); // Current UTC time
                setElapsed(now - startTime);
                
                intervalRef.current = setInterval(() => {
                    setElapsed(Date.now() - startTime);
                }, 1000);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [order, isPaused]);

    const formatTime = useCallback((ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }, []);

    const handleStop = useCallback(async () => {
        setIsLoading(true);
        setError('');
        
        try {
            await API.post(`/orders/${order.id}/stop`, { reason: 'operator_break' });
            setIsPaused(true);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            onUpdate?.();
        } catch (error) {
            setError('Failed to stop production');
            console.error('Failed to stop production:', error);
        } finally {
            setIsLoading(false);
        }
    }, [order.id, onUpdate]);

    const handleResume = useCallback(async () => {
        setIsLoading(true);
        setError('');
        
        try {
            await API.post(`/orders/${order.id}/resume`);
            setIsPaused(false);
            onUpdate?.();
        } catch (error) {
            setError('Failed to resume production');
            console.error('Failed to resume production:', error);
        } finally {
            setIsLoading(false);
        }
    }, [order.id, onUpdate]);

    const estimatedCompletion = useMemo(() => {
        if (order.completed_quantity === 0 || elapsed === 0) return null;
        
        const rate = order.completed_quantity / (elapsed / 1000 / 60); // items per minute
        const remaining = order.quantity - order.completed_quantity;
        const estimatedMinutes = remaining / rate;
        
        // Return UTC timestamp that will be converted to SAST for display
        return new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    }, [order, elapsed]);

    return (
        <div className="space-y-2">
            {error && (
                <div className="text-sm text-red-600" role="alert">
                    {error}
                </div>
            )}
            
            <div className="flex items-center space-x-4">
                <div className="text-2xl font-mono" aria-label={`Elapsed time: ${formatTime(elapsed)}`}>
                    {formatTime(elapsed)}
                </div>
                
                <div className="flex space-x-2">
                    {isPaused ? (
                        <Button
                            size="sm"
                            variant="success"
                            icon={<span>▶️</span>}
                            onClick={handleResume}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Resume
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="danger"
                            icon={<span>🛑</span>}
                            onClick={handleStop}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Stop
                        </Button>
                    )}
                </div>
            </div>
            
            {estimatedCompletion && (
                <div className="text-sm text-gray-600">
                    Estimated completion: {formatSASTDate(estimatedCompletion, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                    })} SAST
                </div>
            )}
        </div>
    );
};

// Production Stop Modal
export const ProductionStopModal = ({ isOpen, onClose, order, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const stopReasons = useMemo(() => [
        { value: 'material_shortage', label: 'Material Shortage' },
        { value: 'machine_breakdown', label: 'Machine Breakdown' },
        { value: 'quality_issue', label: 'Quality Issue' },
        { value: 'operator_break', label: 'Operator Break' },
        { value: 'shift_change', label: 'Shift Change' },
        { value: 'maintenance', label: 'Scheduled Maintenance' },
        { value: 'safety_incident', label: 'Safety Incident' },
        { value: 'other', label: 'Other' }
    ], []);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (!reason.trim()) {
            newErrors.reason = 'Stop reason is required';
        }
        
        if (reason === 'other' && !notes.trim()) {
            newErrors.notes = 'Please provide details for "Other" reason';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [reason, notes]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);
        
        try {
            await API.post(`/orders/${order.id}/stop`, {
                reason,
                notes: notes.trim(),
                timestamp: new Date().toISOString()
            });
            
            onSubmit?.();
            onClose();
            
            // Reset form
            setReason('');
            setNotes('');
            setErrors({});
        } catch (error) {
            setErrors({ submit: error.response?.data?.message || 'Failed to record stop' });
            console.error('Failed to record stop:', error);
        } finally {
            setLoading(false);
        }
    }, [order.id, reason, notes, validateForm, onSubmit, onClose]);

    const handleClose = useCallback(() => {
        if (!loading) {
            setReason('');
            setNotes('');
            setErrors({});
            onClose();
        }
    }, [loading, onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Record Production Stop"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors.submit && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                        {errors.submit}
                    </div>
                )}
                
                <Select
                    label="Stop Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    options={stopReasons}
                    required
                    error={errors.reason}
                />
                
                <div>
                    <label htmlFor="stop-notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                        {reason === 'other' && <span className="text-red-500"> *</span>}
                    </label>
                    <textarea
                        id="stop-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                            errors.notes ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe the issue or reason for stopping production..."
                        disabled={loading}
                    />
                    {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="danger"
                        loading={loading}
                        disabled={loading || !reason}
                        icon={<span>🛑</span>}
                    >
                        Record Stop
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Quantity Update Component
export const QuantityUpdater = ({ order, onUpdate }) => {
    const [quantity, setQuantity] = useState(order.completed_quantity);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        setQuantity(order.completed_quantity);
    }, [order.completed_quantity]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleUpdate = useCallback(async () => {
        if (quantity === order.completed_quantity) {
            setIsEditing(false);
            return;
        }

        if (quantity < 0 || quantity > order.quantity) {
            setError(`Quantity must be between 0 and ${order.quantity}`);
            setQuantity(order.completed_quantity);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await API.patch(`/orders/${order.id}`, {
                completed_quantity: quantity
            });
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            setError('Failed to update quantity');
            setQuantity(order.completed_quantity);
            console.error('Failed to update quantity:', error);
        } finally {
            setIsLoading(false);
        }
    }, [quantity, order.completed_quantity, order.quantity, order.id, onUpdate]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            handleUpdate();
        } else if (e.key === 'Escape') {
            setQuantity(order.completed_quantity);
            setIsEditing(false);
            setError('');
        }
    }, [handleUpdate, order.completed_quantity]);

    const handleInputChange = useCallback((e) => {
        const value = parseInt(e.target.value) || 0;
        setQuantity(value);
        setError('');
    }, []);

    return (
        <div className="space-y-2">
            {error && (
                <div className="text-sm text-red-600" role="alert">
                    {error}
                </div>
            )}
            
            <div className="flex items-center space-x-3">
                {isEditing ? (
                    <div className="flex items-center space-x-2">
                        <input
                            ref={inputRef}
                            type="number"
                            value={quantity}
                            onChange={handleInputChange}
                            onBlur={handleUpdate}
                            onKeyDown={handleKeyPress}
                            min={0}
                            max={order.quantity}
                            className={`w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                                error ? 'border-red-300' : 'border-gray-300'
                            }`}
                            disabled={isLoading}
                            aria-label="Update completed quantity"
                        />
                        <span className="text-gray-500">/ {order.quantity}</span>
                        {isLoading && <LoadingSpinner size={16} />}
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Current quantity: ${quantity} of ${order.quantity}. Click to edit.`}
                    >
                        <span className="font-medium">
                            {quantity} / {order.quantity}
                        </span>
                        <span className="text-gray-400">✏️</span>
                    </button>
                )}
            </div>
            
            <ProgressBar
                value={quantity}
                max={order.quantity}
                color={quantity === order.quantity ? 'green' : 'blue'}
                showLabel={false}
            />
        </div>
    );
};

// Production Control Panel
export const ProductionControlPanel = ({ order, onUpdate, onComplete }) => {
    const [showStopModal, setShowStopModal] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [error, setError] = useState('');
    const { user, hasRole } = useAuth();

    const canControl = useMemo(() => 
        hasRole?.(['admin', 'supervisor', 'operator']) || 
        user?.role === 'admin' || 
        user?.role === 'supervisor' || 
        user?.role === 'operator'
    , [hasRole, user?.role]);

    const isInProgress = order.status === 'in_progress';
    const isComplete = order.completed_quantity >= order.quantity;

    const handleComplete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to mark this order as completed?')) {
            return;
        }
        
        setIsCompleting(true);
        setError('');
        
        try {
            await API.post(`/orders/${order.id}/complete`);
            onComplete?.();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to complete order');
            console.error('Failed to complete order:', error);
        } finally {
            setIsCompleting(false);
        }
    }, [order.id, onComplete]);

    if (!canControl || !isInProgress) {
        return null;
    }

    return (
        <div className="bg-gray-50 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Production Control</h3>
                <Badge variant={isComplete ? 'success' : 'warning'}>
                    {isComplete ? 'Ready to Complete' : 'In Progress'}
                </Badge>
            </div>
            
            {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                    {error}
                </div>
            )}
            
            {/* Timer Section */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Production Time</h4>
                <ProductionTimer order={order} onUpdate={onUpdate} />
            </div>
            
            {/* Quantity Section */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Progress</h4>
                <QuantityUpdater order={order} onUpdate={onUpdate} />
            </div>
            
            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                    variant="danger"
                    onClick={() => setShowStopModal(true)}
                    className="flex-1"
                    icon={<span>🛑</span>}
                >
                    Record Stop
                </Button>
                
                <Button
                    variant="success"
                    onClick={handleComplete}
                    loading={isCompleting}
                    disabled={isCompleting || !isComplete}
                    className="flex-1"
                    icon={<span>✅</span>}
                >
                    {isCompleting ? 'Completing...' : 'Complete Order'}
                </Button>
            </div>
            
            {!isComplete && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    <span className="font-medium">Note:</span> Complete all {order.quantity} items before marking the order as complete.
                </div>
            )}
            
            {/* Stop Modal */}
            <ProductionStopModal
                isOpen={showStopModal}
                onClose={() => setShowStopModal(false)}
                order={order}
                onSubmit={onUpdate}
            />
        </div>
    );
};

// Machine Monitor Component
export const MachineMonitor = ({ machines = [] }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Simulate loading state
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const groupedMachines = useMemo(() => {
        if (!machines.length) return {};
        
        return machines.reduce((groups, machine) => {
            const environment = machine.environment || 'Unknown';
            if (!groups[environment]) {
                groups[environment] = [];
            }
            groups[environment].push(machine);
            return groups;
        }, {});
    }, [machines]);

    const filteredMachines = useMemo(() => {
        if (filter === 'all') return groupedMachines;
        
        const filtered = {};
        Object.entries(groupedMachines).forEach(([env, envMachines]) => {
            const filteredEnvMachines = envMachines.filter(machine => machine.status === filter);
            if (filteredEnvMachines.length > 0) {
                filtered[env] = filteredEnvMachines;
            }
        });
        return filtered;
    }, [groupedMachines, filter]);

    const statusCounts = useMemo(() => {
        const counts = { available: 0, in_use: 0, maintenance: 0, offline: 0 };
        machines.forEach(machine => {
            counts[machine.status] = (counts[machine.status] || 0) + 1;
        });
        return counts;
    }, [machines]);

    const getStatusIcon = useCallback((status) => {
        const icons = {
            available: '🟢',
            in_use: '🟡',
            maintenance: '🔧',
            offline: '🔴'
        };
        return icons[status] || '❓';
    }, []);

    const getStatusVariant = useCallback((status) => {
        const variants = {
            available: 'success',
            in_use: 'warning',
            maintenance: 'info',
            offline: 'danger'
        };
        return variants[status] || 'default';
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner size={24} />
                <span className="ml-2">Loading machine status...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-800 rounded-md" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Summary */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Machine Status Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="text-center">
                            <div className="text-2xl mb-1">{getStatusIcon(status)}</div>
                            <div className="text-xl font-bold">{count}</div>
                            <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All ({machines.length})
                </Button>
                {Object.entries(statusCounts).map(([status, count]) => (
                    <Button
                        key={status}
                        variant={filter === status ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter(status)}
                        disabled={count === 0}
                    >
                        {getStatusIcon(status)} {status.replace('_', ' ')} ({count})
                    </Button>
                ))}
            </div>

            {/* Machine Groups */}
            {Object.keys(filteredMachines).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🔧</div>
                    <div>No machines found</div>
                    <div className="text-sm">Try adjusting your filter or check if machines are configured</div>
                </div>
            ) : (
                Object.entries(filteredMachines).map(([environment, envMachines]) => (
                    <div key={environment} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{environment}</h3>
                            <Badge variant="info">{envMachines.length} machines</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {envMachines.map(machine => (
                                <div
                                    key={machine.id}
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium text-gray-900">
                                            {machine.name}
                                        </h4>
                                        <Badge 
                                            variant={getStatusVariant(machine.status)}
                                            size="sm"
                                        >
                                            {getStatusIcon(machine.status)} {machine.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Type:</span>
                                            <span className="font-medium">{machine.type}</span>
                                        </div>
                                        
                                        <div className="flex justify-between">
                                            <span>Capacity:</span>
                                            <span className="font-medium">{machine.capacity}%</span>
                                        </div>
                                        
                                        {machine.utilization && (
                                            <div className="flex justify-between">
                                                <span>Utilization:</span>
                                                <span className="font-medium">{machine.utilization}%</span>
                                            </div>
                                        )}
                                        
                                        {machine.current_order && (
                                            <div className="mt-2 pt-2 border-t">
                                                <div className="text-xs text-gray-500">Current Order:</div>
                                                <div className="font-medium text-gray-900 truncate">
                                                    {machine.current_order}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {machine.last_maintenance && (
                                            <div className="text-xs text-gray-500">
                                                Last maintenance: {formatSASTDate(machine.last_maintenance, { 
                                                    year: 'numeric',
                                                    month: 'short', 
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Production Dashboard Component
export const ProductionDashboard = () => {
    const [activeOrders, setActiveOrders] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setError('');
            const [ordersResponse, machinesResponse] = await Promise.all([
                API.get('/orders?status=in_progress'),
                API.get('/machines')
            ]);
            
            setActiveOrders(ordersResponse.data || ordersResponse);
            setMachines(machinesResponse.data || machinesResponse);
        } catch (error) {
            setError('Failed to load production data');
            console.error('Failed to load production data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
    }, [loadData]);

    useEffect(() => {
        loadData();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner size={32} />
                <span className="ml-3 text-lg">Loading production dashboard...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1>
                <Button
                    onClick={handleRefresh}
                    loading={refreshing}
                    disabled={refreshing}
                    icon={<span>🔄</span>}
                >
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-800 rounded-md" role="alert">
                    {error}
                </div>
            )}

            {/* Active Orders */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Active Production Orders</h2>
                {activeOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <div>No active production orders</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {activeOrders.map(order => (
                            <ProductionControlPanel
                                key={order.id}
                                order={order}
                                onUpdate={loadData}
                                onComplete={loadData}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Machine Monitor */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Machine Status</h2>
                <MachineMonitor machines={machines} />
            </div>
        </div>
    );
};

export default ProductionDashboard;