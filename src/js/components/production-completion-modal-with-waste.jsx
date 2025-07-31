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
    notes: ''
  });
  
  const [wasteData, setWasteData] = useState([
    { item_type: 'Raw Material Scrap', description: '', weight: 0, unit: 'kg' },
    { item_type: 'Packaging Waste', description: '', weight: 0, unit: 'kg' },
    { item_type: 'Defective Products', description: '', weight: 0, unit: 'units' }
  ]);

  // Waste management functions
  const addWasteItem = useCallback(() => {
    setWasteData(prev => [
      ...prev,
      { item_type: '', description: '', weight: 0, unit: 'kg' }
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
    
    const totalWasteWeight = wasteData.reduce((sum, waste) => sum + (waste.weight || 0), 0);
    const wasteItems = wasteData.filter(w => w.weight > 0).length;
    
    return {
      completionRate,
      totalWasteWeight,
      wasteItems
    };
  }, [formData, wasteData, order]);

  // When the 'order' prop changes, update the form's default data
  useEffect(() => {
    if (order) {
      setFormData({
        actual_quantity: order.actual_quantity || order.quantity || 0,
        notes: ''
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
    
    
    // Validate waste data
    const invalidWaste = wasteData.some(waste => 
      waste.weight > 0 && !waste.item_type.trim()
    );
    
    if (invalidWaste) {
      errors.push('All waste items with weight must have a valid item type');
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
        completion_time: new Date().toISOString(), // Current timestamp when button is pressed
        waste_data: wasteData.filter(waste => waste.weight > 0),
        metrics: {
          completion_rate: metrics.completionRate,
          total_waste_weight: metrics.totalWasteWeight,
          waste_items_count: metrics.wasteItems
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
    <Modal title="Complete Production Order" onClose={onClose} size="lg" className="glass backdrop-blur-xl">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl glass border-l-4 border-red-400 text-red-800 hover-lift" role="alert">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-xl glass border-l-4 hover-lift transition-all duration-500 transform animate-pulse ${
            notification.type === 'success' ? 'border-green-400 text-green-800' : 'border-red-400 text-red-800'
          }`} role="alert">
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? 
                <CheckCircle className="w-5 h-5 text-green-600" /> : 
                <AlertTriangle className="w-5 h-5 text-red-600" />
              }
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}
        
        {/* Order Summary */}
        <Card className="p-6 glass hover-lift card-hover gradient-animate">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 float">{order.order_number}</h3>
              <p className="text-gray-700 font-medium">{order.product_name}</p>
              <p className="text-sm text-gray-600">Target: {order.quantity?.toLocaleString()} units</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Environment: {order.environment}</p>
              <p className="text-sm text-gray-600">Machine: {order.machine_name || 'N/A'}</p>
            </div>
          </div>
        </Card>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'production', label: 'Production Details', icon: Package },
            { id: 'waste', label: 'Waste Tracking', icon: Trash2 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all duration-300 hover-lift btn-micro ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 glass'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:glass'
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Quantity Produced <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.actual_quantity}
                    onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                    required
                    min="0"
                    max={order.quantity * 1.2}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: {Math.round(order.quantity * 1.2)} units (120% of target allowed)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Production Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes about the production run (quality issues, machine performance, etc.)..."
                    className="w-full px-3 py-2 glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    rows="3"
                  />
                </div>
                
                <div className="glass p-3 rounded-lg border border-purple-300/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-medium text-gray-800">Completion Time</h4>
                  </div>
                  <p className="text-xs text-gray-600">
                    Order will be marked as completed when you submit this form.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Current time: {new Date().toLocaleString('en-ZA', { 
                      timeZone: 'Africa/Johannesburg',
                      year: 'numeric',
                      month: '2-digit', 
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })} SAST
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Waste Tracking Tab */}
          {activeTab === 'waste' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Waste Tracking</h3>
                <Button type="button" onClick={addWasteItem} variant="outline" size="sm" className="hover-lift btn-micro glass border-white/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Waste Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {wasteData.map((waste, index) => (
                  <Card key={index} className="p-3 glass hover-lift card-hover">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Item Type</label>
                        <select
                          value={waste.item_type}
                          onChange={(e) => updateWasteItem(index, 'item_type', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                        >
                          <option value="">Select waste type...</option>
                          <option value="Raw Material Scrap">Raw Material Scrap</option>
                          <option value="Metal Offcuts">Metal Offcuts</option>
                          <option value="Plastic Waste">Plastic Waste</option>
                          <option value="Packaging Material">Packaging Material</option>
                          <option value="Defective Products">Defective Products</option>
                          <option value="Production Rejects">Production Rejects</option>
                          <option value="Wood Offcuts">Wood Offcuts</option>
                          <option value="Fabric Scraps">Fabric Scraps</option>
                          <option value="Chemical Waste">Chemical Waste</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={waste.description}
                          onChange={(e) => updateWasteItem(index, 'description', e.target.value)}
                          placeholder="e.g., Aluminum sheets..."
                          className="w-full px-2 py-1.5 text-xs glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Weight/Quantity</label>
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={waste.weight}
                            onChange={(e) => updateWasteItem(index, 'weight', parseFloat(e.target.value) || 0)}
                            className="col-span-2 px-2 py-1.5 text-xs glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                            placeholder="0.00"
                          />
                          <select
                            value={waste.unit}
                            onChange={(e) => updateWasteItem(index, 'unit', e.target.value)}
                            className="px-1 py-1.5 text-xs glass border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="tons">tons</option>
                            <option value="units">units</option>
                            <option value="L">L</option>
                            <option value="m³">m³</option>
                            <option value="m">m</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={() => removeWasteItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 w-full hover-lift btn-micro glass border-red-300/50"
                          disabled={wasteData.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {wasteData.some(w => w.weight > 0) && (
                <Card className="p-3 glass hover-lift status-pending">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-yellow-600" />
                    <h4 className="text-sm font-medium text-yellow-900">Waste Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-yellow-700">Total Material Weight:</span>
                      <span className="ml-2 font-medium">{metrics.totalWasteWeight?.toFixed(2)} kg</span>
                    </div>
                    <div>
                      <span className="text-yellow-700">Waste Items:</span>
                      <span className="ml-2 font-medium">{metrics.wasteItems} recorded</span>
                    </div>
                  </div>
                  <div className="mt-2 p-2 glass rounded-lg border border-yellow-300/50">
                    <p className="text-xs text-yellow-700">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Waste tracking helps optimize material usage.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="outline" disabled={loading} className="hover-lift btn-micro glass border-white/20">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.actual_quantity <= 0}
              className={`bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0 hover-lift btn-micro ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
