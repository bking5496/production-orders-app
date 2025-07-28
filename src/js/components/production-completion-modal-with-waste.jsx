import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle, Package, AlertTriangle, TrendingUp, Target, 
  Clock, BarChart3, Trash2, Plus, Calculator, Save, X
} from 'lucide-react';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import API from '../core/api';
import { getCurrentSASTTime, getSASTDateTimeLocal, convertSASTToUTC, formatSASTDate } from '../utils/timezone.js';

export default function ProductionCompletionModalWithWaste({ isOpen, onClose, order, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('production');
  const [formData, setFormData] = useState({
    actual_quantity: 0,
    quality_rating: 'good',
    efficiency_score: 0,
    notes: '',
    completion_time: getSASTDateTimeLocal()
  });
  
  const [wasteData, setWasteData] = useState([
    { type: 'Raw Material', category: 'material', amount: 0, unit: 'kg', cost_per_unit: 0 },
    { type: 'Packaging Material', category: 'packaging', amount: 0, unit: 'kg', cost_per_unit: 0 },
    { type: 'Finished Product', category: 'product', amount: 0, unit: 'units', cost_per_unit: 0 }
  ]);

  // Waste management functions
  const addWasteItem = useCallback(() => {
    setWasteData(prev => [
      ...prev,
      { type: '', category: 'material', amount: 0, unit: 'kg', cost_per_unit: 0 }
    ]);
  }, []);

  const updateWasteItem = useCallback((index, field, value) => {
    setWasteData(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const removeWasteItem = useCallback((index) => {
    setWasteData(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Calculate metrics
  const metrics = useMemo(() => {
    const completionRate = order?.quantity > 0 
      ? Math.round((formData.actual_quantity / order.quantity) * 100) 
      : 0;
    
    const qualityScore = {
      excellent: 100,
      good: 85,
      fair: 70,
      poor: 50
    }[formData.quality_rating] || 85;
    
    const totalWasteAmount = wasteData.reduce((sum, waste) => sum + waste.amount, 0);
    const totalWasteCost = wasteData.reduce((sum, waste) => sum + (waste.amount * waste.cost_per_unit), 0);
    
    return {
      completionRate,
      qualityScore,
      totalWasteAmount,
      totalWasteCost
    };
  }, [formData, wasteData, order]);

  // When the 'order' prop changes, update the form's default data
  useEffect(() => {
    if (order) {
      setFormData({
        actual_quantity: order.quantity || 0,
        quality_rating: 'good',
        efficiency_score: 0,
        notes: '',
        completion_time: getSASTDateTimeLocal()
      });
      setError('');
      setNotification(null);
    }
  }, [order]);

  // Don't render anything if the modal isn't supposed to be open
  if (!isOpen || !order) return null;

  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!formData.actual_quantity || formData.actual_quantity <= 0) {
      errors.push('Actual quantity must be greater than 0');
    }
    
    if (formData.actual_quantity > (order?.quantity * 1.2)) {
      errors.push('Actual quantity cannot exceed 120% of target quantity');
    }
    
    if (!formData.completion_time) {
      errors.push('Completion time is required');
    }
    
    // Validate waste data
    const invalidWaste = wasteData.some(waste => 
      waste.amount > 0 && (!waste.type.trim() || waste.cost_per_unit < 0)
    );
    
    if (invalidWaste) {
      errors.push('All waste items with amounts must have a valid type and non-negative cost');
    }
    
    return errors;
  }, [formData, wasteData, order]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }
    
    setLoading(true);
    setError('');
    setNotification(null);
    
    try {
      const submitData = {
        ...formData,
        completion_time: convertSASTToUTC(formData.completion_time).toISOString(),
        waste_data: wasteData.filter(waste => waste.amount > 0),
        metrics: {
          completion_rate: metrics.completionRate,
          quality_score: metrics.qualityScore,
          total_waste_cost: metrics.totalWasteCost,
          total_waste_amount: metrics.totalWasteAmount
        }
      };
      
      const response = await API.post(`/orders/${order.id}/complete`, submitData);
      
      setNotification({
        type: 'success',
        message: 'Production order completed successfully!'
      });
      
      // Wait a moment to show success message
      setTimeout(() => {
        onComplete?.(response);
        onClose();
      }, 1500);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to complete order';
      setError(errorMessage);
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [formData, wasteData, order, metrics, validateForm, onComplete, onClose]);

  return (
    <Modal title="Complete Production Order" onClose={onClose} size="xl">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-100 text-red-800 border border-red-200" role="alert">
            {error}
          </div>
        )}
        
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`} role="alert">
            {notification.message}
          </div>
        )}
        
        {/* Order Summary */}
        <Card className="p-6 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">{order.order_number}</h3>
              <p className="text-blue-700">{order.product_name}</p>
              <p className="text-sm text-blue-600">Target: {order.quantity?.toLocaleString()} units</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Environment: {order.environment}</p>
              <p className="text-sm text-blue-600">Machine: {order.machine_name || 'N/A'}</p>
            </div>
          </div>
        </Card>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'production', label: 'Production Details', icon: Package },
            { id: 'waste', label: 'Waste Tracking', icon: Trash2 },
            { id: 'summary', label: 'Summary', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Production Details Tab */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Quantity Produced <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.actual_quantity}
                    onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                    max={order.quantity * 1.1}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: {Math.round(order.quantity * 1.1)} units (110% of target)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality Rating</label>
                  <select
                    value={formData.quality_rating}
                    onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="excellent">Excellent (100%)</option>
                    <option value="good">Good (85%)</option>
                    <option value="fair">Fair (70%)</option>
                    <option value="poor">Poor (50%)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Efficiency Score (%)</label>
                  <input
                    type="number"
                    value={formData.efficiency_score}
                    onChange={(e) => setFormData({ ...formData, efficiency_score: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="150"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculated automatically or enter manually</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Time (SAST)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.completion_time}
                    onChange={(e) => setFormData({ ...formData, completion_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current SAST time: {formatSASTDate(getCurrentSASTTime(), { includeSeconds: true })}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Production Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about the production run..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
            </div>
          )}
          
          {/* Waste Tracking Tab */}
          {activeTab === 'waste' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Waste Tracking</h3>
                <Button type="button" onClick={addWasteItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Waste Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {wasteData.map((waste, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
                        <input
                          type="text"
                          value={waste.type}
                          onChange={(e) => updateWasteItem(index, 'type', e.target.value)}
                          placeholder="e.g., Raw Material"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={waste.category}
                          onChange={(e) => updateWasteItem(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="material">Material</option>
                          <option value="packaging">Packaging</option>
                          <option value="product">Product</option>
                          <option value="energy">Energy</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={waste.amount}
                          onChange={(e) => updateWasteItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit & Cost</label>
                        <div className="flex gap-2">
                          <select
                            value={waste.unit}
                            onChange={(e) => updateWasteItem(index, 'unit', e.target.value)}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="kg">kg</option>
                            <option value="units">units</option>
                            <option value="liters">L</option>
                            <option value="meters">m</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={waste.cost_per_unit}
                            onChange={(e) => updateWasteItem(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                            placeholder="Cost/unit"
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={() => removeWasteItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 w-full"
                          disabled={wasteData.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {waste.amount > 0 && waste.cost_per_unit > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        Total cost: ${(waste.amount * waste.cost_per_unit).toFixed(2)}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              
              {wasteData.some(w => w.amount > 0) && (
                <Card className="p-4 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-900">Waste Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-yellow-700">Total Material Waste:</span>
                      <span className="ml-2 font-medium">{metrics.totalWasteAmount?.toFixed(2)} kg</span>
                    </div>
                    <div>
                      <span className="text-yellow-700">Total Cost Impact:</span>
                      <span className="ml-2 font-medium">${metrics.totalWasteCost?.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
          
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Production Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Completion Rate</p>
                      <p className="text-3xl font-bold text-green-600">{metrics.completionRate}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                </Card>
                
                <Card className="p-6 border-l-4 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Quality Score</p>
                      <p className="text-3xl font-bold text-blue-600">{metrics.qualityScore}%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </Card>
                
                <Card className="p-6 border-l-4 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Efficiency</p>
                      <p className="text-3xl font-bold text-purple-600">{formData.efficiency_score}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-medium text-gray-800 mb-4">Production Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target Quantity:</span>
                      <span className="font-medium">{order.quantity?.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Actual Quantity:</span>
                      <span className="font-medium">{formData.actual_quantity?.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quality Rating:</span>
                      <span className="font-medium capitalize">{formData.quality_rating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Efficiency Score:</span>
                      <span className="font-medium">{formData.efficiency_score}%</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h4 className="font-medium text-gray-800 mb-4">Waste Impact</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Waste:</span>
                      <span className="font-medium">{metrics.totalWasteAmount?.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Waste Cost:</span>
                      <span className="font-medium">${metrics.totalWasteCost?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Waste Items:</span>
                      <span className="font-medium">{wasteData.filter(w => w.amount > 0).length}</span>
                    </div>
                  </div>
                  
                  {metrics.totalWasteCost > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        Waste cost represents {((metrics.totalWasteCost / (order.quantity * 10)) * 100).toFixed(1)}% of estimated production value
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.actual_quantity <= 0}
              className={loading ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {!loading && <CheckCircle className="w-4 h-4 mr-2" />}
              {loading ? 'Completing...' : 'Complete Production'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
