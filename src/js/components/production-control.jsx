import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, Clock, AlertTriangle, CheckCircle, 
  Settings, BarChart3, Target, Users, Wrench, Activity,
  Timer, Gauge, TrendingUp, RefreshCw, Save, X
} from 'lucide-react';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import API from '../core/api';
import Time from '../core/time';

export default function ProductionControl({ order, onUpdate, className = "" }) {
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseNotes, setPauseNotes] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(order?.actual_quantity || 0);
  const [productionRate, setProductionRate] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [runtime, setRuntime] = useState(0);

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Stop/Pause reasons with categories
  const pauseReasons = [
    { 
      category: 'Equipment Issues',
      reasons: [
        { value: 'machine_breakdown', label: 'Machine Breakdown', severity: 'high' },
        { value: 'equipment_failure', label: 'Equipment Failure', severity: 'high' },
        { value: 'calibration_needed', label: 'Calibration Required', severity: 'medium' },
        { value: 'maintenance_required', label: 'Maintenance Required', severity: 'medium' }
      ]
    },
    {
      category: 'Material & Supply',
      reasons: [
        { value: 'material_shortage', label: 'Material Shortage', severity: 'high' },
        { value: 'raw_material_quality', label: 'Raw Material Quality Issue', severity: 'medium' },
        { value: 'supply_delay', label: 'Supply Chain Delay', severity: 'medium' }
      ]
    },
    {
      category: 'Quality Control',
      reasons: [
        { value: 'quality_control', label: 'Quality Control Check', severity: 'low' },
        { value: 'product_defect', label: 'Product Defect Detected', severity: 'high' },
        { value: 'specification_review', label: 'Specification Review', severity: 'low' }
      ]
    },
    {
      category: 'Operational',
      reasons: [
        { value: 'shift_change', label: 'Shift Change', severity: 'low' },
        { value: 'break_time', label: 'Scheduled Break', severity: 'low' },
        { value: 'training', label: 'Operator Training', severity: 'low' },
        { value: 'safety_incident', label: 'Safety Incident', severity: 'high' },
        { value: 'other', label: 'Other Reason', severity: 'medium' }
      ]
    }
  ];

  // Calculate real-time metrics
  useEffect(() => {
    if (!order || order.status !== 'in_progress') return;

    const interval = setInterval(() => {
      // Use Time module for SAST timezone handling
      const startTime = Time.toSAST(order.start_time).getTime();
      const now = Date.now();
      const runtimeMinutes = Math.floor((now - startTime) / (1000 * 60));
      setRuntime(runtimeMinutes);

      // Calculate production rate (units per hour)
      if (runtimeMinutes > 0) {
        const rate = Math.round((currentQuantity / runtimeMinutes) * 60);
        setProductionRate(rate);
        
        // Calculate efficiency vs expected rate
        const expectedRate = order.production_rate || 60;
        const eff = expectedRate > 0 ? Math.round((rate / expectedRate) * 100) : 0;
        setEfficiency(Math.min(eff, 150)); // Cap at 150%
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [order, currentQuantity]);

  // Handle pause production
  const handlePause = async () => {
    if (!pauseReason) {
      showNotification('Please select a pause reason', 'warning');
      return;
    }

    setLoading(true);
    try {
      await API.post(`/orders/${order.id}/pause`, {
        reason: pauseReason,
        notes: pauseNotes
      });
      
      setShowPauseModal(false);
      setPauseReason('');
      setPauseNotes('');
      onUpdate && onUpdate();
      showNotification('Production paused successfully');
    } catch (error) {
      showNotification('Failed to pause production: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Handle resume production
  const handleResume = async () => {
    setLoading(true);
    try {
      await API.post(`/orders/${order.id}/resume`);
      onUpdate && onUpdate();
      showNotification('Production resumed successfully');
    } catch (error) {
      showNotification('Failed to resume production: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Handle quantity update
  const handleQuantityUpdate = async () => {
    if (currentQuantity < 0 || currentQuantity > order.quantity) {
      showNotification('Invalid quantity entered', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await API.patch(`/orders/${order.id}/quantity`, {
        actual_quantity: currentQuantity,
        notes: `Updated from ${order.actual_quantity || 0} to ${currentQuantity}`
      });
      
      // Show enhanced feedback with shift tracking info
      if (response.shiftType && response.quantityChange) {
        showNotification(
          `Quantity updated: ${response.quantityChange > 0 ? '+' : ''}${response.quantityChange} units (${response.shiftType} shift)`,
          'success'
        );
      } else {
        showNotification('Quantity updated successfully');
      }
      
      setShowQuantityModal(false);
      onUpdate && onUpdate();
    } catch (error) {
      showNotification('Failed to update quantity: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Format runtime display
  const formatRuntime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Get status styling
  const getStatusConfig = (status) => {
    const configs = {
      in_progress: { color: 'blue', icon: Play, label: 'In Progress' },
      paused: { color: 'yellow', icon: Pause, label: 'Paused' },
      stopped: { color: 'red', icon: Square, label: 'Stopped' },
      completed: { color: 'green', icon: CheckCircle, label: 'Completed' }
    };
    return configs[status] || { color: 'gray', icon: Clock, label: 'Unknown' };
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[severity] || 'text-gray-600';
  };

  if (!order) return null;

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`space-y-4 ${className}`}>
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

      {/* Production Status Overview */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600`} />
              <h2 className="text-xl font-semibold text-gray-800">
                {order.order_number} - {order.product_name}
              </h2>
              <Badge variant={statusConfig.color === 'blue' ? 'info' : statusConfig.color === 'green' ? 'success' : statusConfig.color === 'yellow' ? 'warning' : 'danger'}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Target Quantity:</span>
                <span className="ml-2 font-medium">{order.quantity?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Current Quantity:</span>
                <span className="ml-2 font-medium">{(order.actual_quantity || 0).toLocaleString()}</span>
              </div>
              {order.status === 'in_progress' && (
                <>
                  <div>
                    <span className="text-gray-500">Runtime:</span>
                    <span className="ml-2 font-medium">{formatRuntime(runtime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Machine:</span>
                    <span className="ml-2 font-medium">{order.machine_name || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {order.status === 'in_progress' && (
              <>
                <Button
                  onClick={() => setShowQuantityModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Update Quantity
                </Button>
                <Button
                  onClick={() => setShowPauseModal(true)}
                  variant="outline"
                  disabled={loading}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              </>
            )}
            
            {order.status === 'paused' && (
              <Button
                onClick={handleResume}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}

            {(order.status === 'in_progress' || order.status === 'paused') && (
              <Button
                onClick={() => onUpdate && onUpdate()}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Real-time Metrics (only for in-progress orders) */}
      {order.status === 'in_progress' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Production Rate</p>
                <p className="text-2xl font-bold text-blue-600">{productionRate}</p>
                <p className="text-xs text-gray-400">units/hour</p>
              </div>
              <Gauge className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">{efficiency}%</p>
                <p className="text-xs text-gray-400">vs target rate</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(((order.actual_quantity || 0) / order.quantity) * 100)}%
                </p>
                <p className="text-xs text-gray-400">completed</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Progress Bar */}
      {order.quantity > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Production Progress</span>
            <span className="text-sm text-gray-500">
              {(order.actual_quantity || 0).toLocaleString()} / {order.quantity.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(((order.actual_quantity || 0) / order.quantity) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </Card>
      )}

      {/* Pause Production Modal */}
      {showPauseModal && (
        <Modal 
          title="Pause Production" 
          onClose={() => setShowPauseModal(false)}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900">Order Details</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {order.order_number} - {order.product_name}
              </p>
              <p className="text-sm text-yellow-600">
                Progress: {(order.actual_quantity || 0).toLocaleString()} / {order.quantity.toLocaleString()} units
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a reason...</option>
                {pauseReasons.map(category => (
                  <optgroup key={category.category} label={category.category}>
                    {category.reasons.map(reason => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              
              {pauseReason && (
                <div className="mt-2">
                  {pauseReasons.flatMap(cat => cat.reasons).find(r => r.value === pauseReason) && (
                    <div className={`text-sm ${getSeverityColor(pauseReasons.flatMap(cat => cat.reasons).find(r => r.value === pauseReason).severity)}`}>
                      Severity: {pauseReasons.flatMap(cat => cat.reasons).find(r => r.value === pauseReason).severity.toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={pauseNotes}
                onChange={(e) => setPauseNotes(e.target.value)}
                placeholder="Provide additional details about the pause reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                onClick={() => setShowPauseModal(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePause}
                disabled={!pauseReason || loading}
                variant="warning"
              >
                <Pause className="w-4 h-4 mr-2" />
                {loading ? 'Pausing...' : 'Pause Production'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update Quantity Modal */}
      {showQuantityModal && (
        <Modal 
          title="Update Production Quantity" 
          onClose={() => setShowQuantityModal(false)}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Current Progress</h3>
              <p className="text-sm text-blue-700 mt-1">
                Target: {order.quantity.toLocaleString()} units
              </p>
              <p className="text-sm text-blue-600">
                Current: {(order.actual_quantity || 0).toLocaleString()} units
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Quantity Produced
              </label>
              <input
                type="number"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                min="0"
                max={order.quantity}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter actual quantity produced"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum: {order.quantity.toLocaleString()} units
              </p>
            </div>

            {currentQuantity > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Progress:</span>
                  <span className="font-medium">
                    {Math.round((currentQuantity / order.quantity) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min((currentQuantity / order.quantity) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                onClick={() => setShowQuantityModal(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleQuantityUpdate}
                disabled={loading || currentQuantity < 0 || currentQuantity > order.quantity}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Quantity'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}