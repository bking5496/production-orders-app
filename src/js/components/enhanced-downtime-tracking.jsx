// Enhanced Downtime Tracking Component
// Comprehensive downtime recording and management integrated with production workflow

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, XCircle, CheckCircle, Edit, Eye, Search, Filter, Download, Play, Pause, RotateCcw, Activity, Wrench, AlertOctagon, Clock4 } from 'lucide-react';
import API from '../core/api';
import { formatSASTDate, timeAgo } from '../utils/timezone';
import { useWebSocketEvent, useAutoConnect } from '../core/websocket-hooks';

export default function EnhancedDowntimeTracking() {
  const [activeDowntime, setActiveDowntime] = useState([]);
  const [downtimeHistory, setDowntimeHistory] = useState([]);
  const [downtimeCategories, setDowntimeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDowntime, setSelectedDowntime] = useState(null);
  const [filters, setFilters] = useState({
    machine_id: '',
    category_id: '',
    severity: '',
    start_date: '',
    end_date: ''
  });

  // Auto-connect to WebSocket for real-time updates
  useAutoConnect();

  // Listen for real-time downtime events
  useWebSocketEvent('downtime_started', (data) => {
    console.log('🔴 Downtime started:', data.data);
    loadActiveDowntime();
  }, []);

  useWebSocketEvent('downtime_resolved', (data) => {
    console.log('🟢 Downtime resolved:', data.data);
    loadActiveDowntime();
    loadDowntimeHistory();
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActiveDowntime(),
        loadDowntimeHistory(),
        loadDowntimeCategories()
      ]);
    } catch (error) {
      console.error('Error loading downtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveDowntime = async () => {
    try {
      const response = await API.get('/downtime/active');
      setActiveDowntime(response);
    } catch (error) {
      console.error('Error loading active downtime:', error);
    }
  };

  const loadDowntimeHistory = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await API.get(`/downtime/history?${params}`);
      setDowntimeHistory(response);
    } catch (error) {
      console.error('Error loading downtime history:', error);
    }
  };

  const loadDowntimeCategories = async () => {
    try {
      const response = await API.get('/downtime/categories');
      setDowntimeCategories(response);
    } catch (error) {
      console.error('Error loading downtime categories:', error);
    }
  };

  // Filter history when filters change
  useEffect(() => {
    loadDowntimeHistory();
  }, [filters]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertOctagon className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'low': return <Activity className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-red-500" />;
      case 'investigating': return <Search className="w-4 h-4 text-yellow-500" />;
      case 'resolving': return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading downtime tracking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Downtime Tracking</h2>
          <p className="text-gray-600">Monitor and manage production downtime events</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Report Downtime
        </button>
      </div>

      {/* Active Downtime Alert Section */}
      {activeDowntime.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Active Downtime Events ({activeDowntime.length})
              </h3>
              <div className="space-y-2">
                {activeDowntime.map(downtime => (
                  <div key={downtime.id} className="bg-white p-3 rounded border border-red-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityIcon(downtime.severity)}
                          <span className="font-medium text-gray-900">
                            {downtime.machine_name} - {downtime.primary_cause}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(downtime.severity)}`}>
                            {downtime.severity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Order: {downtime.order_number} | 
                          Duration: {downtime.current_duration_minutes} min | 
                          Category: {downtime.category_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(downtime.status)}
                        <button
                          onClick={() => setSelectedDowntime(downtime)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {downtimeCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                machine_id: '',
                category_id: '',
                severity: '',
                start_date: '',
                end_date: ''
              })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Downtime History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock4 className="w-4 h-4" />
              Downtime History
            </h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time & Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine & Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category & Cause
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {downtimeHistory.map(downtime => (
                <tr key={downtime.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {formatSASTDate(downtime.start_time)}
                      </div>
                      <div className="text-gray-500">
                        {downtime.duration_minutes ? `${downtime.duration_minutes} min` : 'Ongoing'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{downtime.machine_name}</div>
                      <div className="text-gray-500">Order: {downtime.order_number}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900" style={{color: downtime.color_code}}>
                        {downtime.category_name}
                      </div>
                      <div className="text-gray-500 truncate max-w-xs">
                        {downtime.primary_cause}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(downtime.severity)}`}>
                      {downtime.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(downtime.status)}
                      <span className="text-sm text-gray-900 capitalize">{downtime.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDowntime(downtime)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {downtime.status !== 'resolved' && (
                        <button
                          onClick={() => setSelectedDowntime(downtime)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Manage/Resolve"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {downtimeHistory.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No downtime events found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Downtime Form Modal */}
      {showCreateForm && (
        <CreateDowntimeModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadAllData();
          }}
          categories={downtimeCategories}
        />
      )}

      {/* Downtime Details/Management Modal */}
      {selectedDowntime && (
        <DowntimeDetailsModal
          downtime={selectedDowntime}
          onClose={() => setSelectedDowntime(null)}
          onSuccess={() => {
            setSelectedDowntime(null);
            loadAllData();
          }}
          categories={downtimeCategories}
        />
      )}
    </div>
  );
}

// Create Downtime Modal Component
function CreateDowntimeModal({ onClose, onSuccess, categories }) {
  const [formData, setFormData] = useState({
    order_id: '',
    machine_id: '',
    downtime_category_id: '',
    primary_cause: '',
    secondary_cause: '',
    severity: 'medium',
    production_impact: 'moderate',
    estimated_duration: '',
    notes: '',
    workflow_stage: 'in_progress',
    quality_impact: false,
    safety_incident: false,
    environmental_impact: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await API.post('/downtime/create', formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating downtime:', error);
      alert('Failed to create downtime record: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Report Downtime Event</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input
                type="number"
                required
                value={formData.order_id}
                onChange={(e) => setFormData(prev => ({ ...prev, order_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine ID</label>
              <input
                type="number"
                required
                value={formData.machine_id}
                onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Category</label>
            <select
              required
              value={formData.downtime_category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, downtime_category_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.category_name} - {category.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Cause</label>
            <input
              type="text"
              required
              value={formData.primary_cause}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_cause: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Brief description of the primary cause"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (min)</label>
              <input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows="3"
              placeholder="Additional details about the downtime event"
            />
          </div>
          
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.quality_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, quality_impact: e.target.checked }))}
                className="mr-2"
              />
              Quality Impact
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.safety_incident}
                onChange={(e) => setFormData(prev => ({ ...prev, safety_incident: e.target.checked }))}
                className="mr-2"
              />
              Safety Incident
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.environmental_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, environmental_impact: e.target.checked }))}
                className="mr-2"
              />
              Environmental Impact
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-md transition-colors"
            >
              {submitting ? 'Creating...' : 'Report Downtime'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Downtime Details Modal Component
function DowntimeDetailsModal({ downtime, onClose, onSuccess, categories }) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolveData, setResolveData] = useState({
    corrective_action: '',
    preventive_action: '',
    notes: '',
    cost_impact: '',
    units_lost: ''
  });

  const handleResolve = async (e) => {
    e.preventDefault();
    setIsResolving(true);
    
    try {
      await API.post(`/downtime/${downtime.id}/resolve`, resolveData);
      onSuccess();
    } catch (error) {
      console.error('Error resolving downtime:', error);
      alert('Failed to resolve downtime: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Downtime Details & Resolution</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        {/* Downtime Information */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Machine:</span> {downtime.machine_name}</div>
                <div><span className="font-medium">Order:</span> {downtime.order_number}</div>
                <div><span className="font-medium">Category:</span> {downtime.category_name}</div>
                <div><span className="font-medium">Started:</span> {formatSASTDate(downtime.start_time)}</div>
                <div><span className="font-medium">Duration:</span> {downtime.duration_minutes || downtime.current_duration_minutes || 'Ongoing'} min</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Impact & Status</h4>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Severity:</span> <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(downtime.severity)}`}>{downtime.severity}</span></div>
                <div><span className="font-medium">Status:</span> <span className="capitalize">{downtime.status}</span></div>
                <div><span className="font-medium">Primary Cause:</span> {downtime.primary_cause}</div>
                <div><span className="font-medium">Reported by:</span> {downtime.reported_by_name}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resolution Form (if not resolved) */}
        {downtime.status !== 'resolved' && (
          <form onSubmit={handleResolve} className="space-y-4">
            <h4 className="font-medium text-gray-900">Resolve Downtime</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action Taken *</label>
              <textarea
                required
                value={resolveData.corrective_action}
                onChange={(e) => setResolveData(prev => ({ ...prev, corrective_action: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="3"
                placeholder="Describe what was done to resolve the issue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Action</label>
              <textarea
                value={resolveData.preventive_action}
                onChange={(e) => setResolveData(prev => ({ ...prev, preventive_action: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="2"
                placeholder="Steps to prevent this issue in the future"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Impact ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={resolveData.cost_impact}
                  onChange={(e) => setResolveData(prev => ({ ...prev, cost_impact: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units Lost</label>
                <input
                  type="number"
                  value={resolveData.units_lost}
                  onChange={(e) => setResolveData(prev => ({ ...prev, units_lost: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
              <textarea
                value={resolveData.notes}
                onChange={(e) => setResolveData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="2"
                placeholder="Additional notes about the resolution"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isResolving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md transition-colors"
              >
                {isResolving ? 'Resolving...' : 'Resolve Downtime'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </form>
        )}
        
        {/* Show resolution details if already resolved */}
        {downtime.status === 'resolved' && downtime.corrective_action && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Resolution Details</h4>
            <div className="space-y-2 text-sm text-green-800">
              <div><span className="font-medium">Corrective Action:</span> {downtime.corrective_action}</div>
              {downtime.preventive_action && (
                <div><span className="font-medium">Preventive Action:</span> {downtime.preventive_action}</div>
              )}
              {downtime.cost_impact > 0 && (
                <div><span className="font-medium">Cost Impact:</span> ${downtime.cost_impact}</div>
              )}
              {downtime.units_lost > 0 && (
                <div><span className="font-medium">Units Lost:</span> {downtime.units_lost}</div>
              )}
              <div><span className="font-medium">Resolved by:</span> {downtime.resolved_by_name}</div>
              <div><span className="font-medium">Resolved at:</span> {formatSASTDate(downtime.end_time)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for severity colors (duplicated for modal use)
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}