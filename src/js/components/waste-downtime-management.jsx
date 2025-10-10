import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Clock, Users, Package, Trash2, Plus, Save, X, Factory, Timer, AlertCircle, CheckCircle, User, Settings, RefreshCw, Calendar, Weight, Hash, FileText, Target } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent } from '../core/websocket-hooks.js';

// iPad-optimized form section component
const FormSection = ({ title, icon: IconComponent, children, className = "" }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-8 ${className}`}>
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-blue-600 rounded-xl">
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
};

// Large touch-friendly input component
const TouchInput = ({ label, type = "text", value, onChange, placeholder, required = false, options = [], className = "" }) => {
  if (type === "select") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          required={required}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option, idx) => (
            <option key={idx} value={option.value || option}>{option.label || option}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
          required={required}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-lg font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        required={required}
      />
    </div>
  );
};

// Large action button
const ActionButton = ({ onClick, icon: IconComponent, label, color = "blue", disabled = false, size = "large" }) => {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    green: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    red: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    orange: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
    gray: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
  };

  const sizeClasses = {
    large: 'px-8 py-4 text-lg min-h-[70px]',
    medium: 'px-6 py-3 text-base min-h-[60px]',
    small: 'px-4 py-2 text-sm min-h-[50px]'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} ${colorClasses[color]} text-white rounded-xl font-semibold flex items-center justify-center space-x-3 shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <IconComponent className="w-6 h-6" />
      <span>{label}</span>
    </button>
  );
};

// Downtime entry form
const DowntimeForm = ({ onSave, onCancel, orders = [], machines = [], users = [], categories = [] }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    machine_id: '',
    downtime_category_id: '',
    primary_cause: '',
    description: '',
    reported_by: '',
    assigned_to: '',
    start_time: new Date().toISOString().slice(0, 16),
    estimated_duration: '',
    severity: 'medium',
    notes: ''
  });

  const handleSubmit = useCallback(async () => {
    try {
      await onSave(formData);
      setFormData({
        order_id: '',
        machine_id: '',
        downtime_category_id: '',
        primary_cause: '',
        description: '',
        reported_by: '',
        assigned_to: '',
        start_time: new Date().toISOString().slice(0, 16),
        estimated_duration: '',
        severity: 'medium',
        notes: ''
      });
    } catch (error) {
      console.error('Error saving downtime:', error);
    }
  }, [formData, onSave]);

  return (
    <FormSection title="Record Downtime Event" icon={AlertTriangle}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TouchInput
          label="Order Number"
          type="select"
          value={formData.order_id}
          onChange={(value) => setFormData({...formData, order_id: value})}
          placeholder="Select Production Order"
          required
          options={orders.map(order => ({
            value: order.id,
            label: `${order.order_number} - ${order.product_name}`
          }))}
        />
        
        <TouchInput
          label="Machine Name"
          type="select"
          value={formData.machine_id}
          onChange={(value) => setFormData({...formData, machine_id: value})}
          placeholder="Select Machine"
          required
          options={machines.map(machine => ({
            value: machine.id,
            label: machine.name
          }))}
        />
        
        <TouchInput
          label="Downtime Reason"
          type="select"
          value={formData.downtime_category_id}
          onChange={(value) => setFormData({...formData, downtime_category_id: value})}
          placeholder="Select Downtime Category"
          required
          options={categories.map(category => ({
            value: category.id,
            label: category.category_name
          }))}
        />
        
        <TouchInput
          label="Start Time"
          type="datetime-local"
          value={formData.start_time}
          onChange={(value) => setFormData({...formData, start_time: value})}
          required
        />
        
        <TouchInput
          label="Supervisor on Duty"
          type="select"
          value={formData.reported_by}
          onChange={(value) => setFormData({...formData, reported_by: value})}
          placeholder="Select Supervisor"
          required
          options={users.filter(u => u.role === 'supervisor').map(user => ({
            value: user.id,
            label: user.full_name || user.username
          }))}
        />
        
        <TouchInput
          label="Operator on Duty"
          type="select"
          value={formData.assigned_to}
          onChange={(value) => setFormData({...formData, assigned_to: value})}
          placeholder="Select Operator"
          options={users.filter(u => u.role === 'operator').map(user => ({
            value: user.id,
            label: user.full_name || user.username
          }))}
        />
        
        <TouchInput
          label="Primary Cause"
          value={formData.primary_cause}
          onChange={(value) => setFormData({...formData, primary_cause: value})}
          placeholder="Brief description of the cause"
          required
        />
        
        <TouchInput
          label="Estimated Duration (minutes)"
          type="number"
          value={formData.estimated_duration}
          onChange={(value) => setFormData({...formData, estimated_duration: value})}
          placeholder="Expected downtime in minutes"
        />
      </div>
      
      <div className="mt-6">
        <TouchInput
          label="Detailed Description"
          type="textarea"
          value={formData.notes}
          onChange={(value) => setFormData({...formData, notes: value})}
          placeholder="Detailed description of the downtime event, actions taken, etc."
        />
      </div>
      
      <div className="flex space-x-4 mt-8">
        <ActionButton
          onClick={handleSubmit}
          icon={Save}
          label="Save Downtime"
          color="green"
          size="large"
        />
        <ActionButton
          onClick={onCancel}
          icon={X}
          label="Cancel"
          color="gray"
          size="large"
        />
      </div>
    </FormSection>
  );
};

// Waste entry form
const WasteForm = ({ onSave, onCancel, orders = [], users = [] }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    waste_type: '',
    quantity: '',
    unit: 'kg',
    reason: '',
    recorded_by: '',
    cost_per_unit: '',
    total_cost: ''
  });

  const wasteTypes = [
    'Material Spillage',
    'Defective Products',
    'Packaging Waste',
    'Raw Material Spoilage',
    'Processing Loss',
    'Quality Rejection',
    'Overproduction',
    'Setup Waste',
    'Other'
  ];

  const units = ['kg', 'g', 'tons', 'liters', 'ml', 'pieces', 'boxes', 'bags'];

  const handleSubmit = useCallback(async () => {
    try {
      const totalCost = formData.cost_per_unit && formData.quantity ? 
        (parseFloat(formData.cost_per_unit) * parseFloat(formData.quantity)).toFixed(2) : 
        formData.total_cost;
      
      await onSave({
        ...formData,
        total_cost: totalCost
      });
      
      setFormData({
        order_id: '',
        waste_type: '',
        quantity: '',
        unit: 'kg',
        reason: '',
        recorded_by: '',
        cost_per_unit: '',
        total_cost: ''
      });
    } catch (error) {
      console.error('Error saving waste:', error);
    }
  }, [formData, onSave]);

  return (
    <FormSection title="Record Waste" icon={Trash2}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TouchInput
          label="Order Number"
          type="select"
          value={formData.order_id}
          onChange={(value) => setFormData({...formData, order_id: value})}
          placeholder="Select Production Order"
          required
          options={orders.map(order => ({
            value: order.id,
            label: `${order.order_number} - ${order.product_name}`
          }))}
        />
        
        <TouchInput
          label="Waste Type"
          type="select"
          value={formData.waste_type}
          onChange={(value) => setFormData({...formData, waste_type: value})}
          placeholder="Select Waste Type"
          required
          options={wasteTypes}
        />
        
        <TouchInput
          label="Quantity"
          type="number"
          step="0.001"
          value={formData.quantity}
          onChange={(value) => setFormData({...formData, quantity: value})}
          placeholder="Enter quantity"
          required
        />
        
        <TouchInput
          label="Unit"
          type="select"
          value={formData.unit}
          onChange={(value) => setFormData({...formData, unit: value})}
          options={units}
          required
        />
        
        <TouchInput
          label="Recorded By"
          type="select"
          value={formData.recorded_by}
          onChange={(value) => setFormData({...formData, recorded_by: value})}
          placeholder="Select Supervisor/Operator"
          required
          options={users.map(user => ({
            value: user.id,
            label: user.full_name || user.username
          }))}
        />
        
        <TouchInput
          label="Cost per Unit (Optional)"
          type="number"
          step="0.01"
          value={formData.cost_per_unit}
          onChange={(value) => setFormData({...formData, cost_per_unit: value})}
          placeholder="Cost per unit in currency"
        />
      </div>
      
      <div className="mt-6">
        <TouchInput
          label="Reason/Description"
          type="textarea"
          value={formData.reason}
          onChange={(value) => setFormData({...formData, reason: value})}
          placeholder="Describe the reason for waste and any relevant details"
          required
        />
      </div>
      
      {formData.cost_per_unit && formData.quantity && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <div className="text-lg font-semibold text-blue-800">
            Calculated Total Cost: R{(parseFloat(formData.cost_per_unit) * parseFloat(formData.quantity)).toFixed(2)}
          </div>
        </div>
      )}
      
      <div className="flex space-x-4 mt-8">
        <ActionButton
          onClick={handleSubmit}
          icon={Save}
          label="Save Waste Record"
          color="green"
          size="large"
        />
        <ActionButton
          onClick={onCancel}
          icon={X}
          label="Cancel"
          color="gray"
          size="large"
        />
      </div>
    </FormSection>
  );
};

// Main Waste & Downtime Management Component
const WasteDowntimeManagement = () => {
  const [activeTab, setActiveTab] = useState('downtime');
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Subscribe to real-time updates - TEMPORARILY DISABLED
  // useOrderUpdates((newOrders) => setOrders(newOrders));
  // useMachineUpdates((newMachines) => setMachines(newMachines));

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersRes, machinesRes, usersRes, categoriesRes] = await Promise.all([
        API.get('/api/orders'),
        API.get('/api/machines'),
        API.get('/api/users'),
        API.get('/api/downtime-categories')
      ]);
      
      setOrders(ordersRes.data || []);
      setMachines(machinesRes.data || []);
      setUsers(usersRes.data || []);
      setCategories(categoriesRes.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []); // Only run on mount

  // Save downtime record
  const saveDowntime = useCallback(async (downtimeData) => {
    try {
      await API.post('/api/downtime', downtimeData);
      // Show success message or refresh data
      console.log('Downtime saved successfully');
    } catch (error) {
      console.error('Error saving downtime:', error);
      throw error;
    }
  }, []);

  // Save waste record
  const saveWaste = useCallback(async (wasteData) => {
    try {
      await API.post('/api/waste', wasteData);
      // Show success message or refresh data
      console.log('Waste saved successfully');
    } catch (error) {
      console.error('Error saving waste:', error);
      throw error;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-2xl font-semibold text-gray-700">Loading Management System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-4 bg-red-600 rounded-2xl">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Waste & Downtime Management</h1>
            <p className="text-xl text-gray-600">Supervisor Dashboard - Record and Track Production Issues</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('downtime')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              activeTab === 'downtime' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6" />
              <span>Downtime Recording</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              activeTab === 'waste' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-6 h-6" />
              <span>Waste Recording</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'downtime' && (
          <DowntimeForm
            onSave={saveDowntime}
            onCancel={() => {}}
            orders={orders}
            machines={machines}
            users={users}
            categories={categories}
          />
        )}
        
        {activeTab === 'waste' && (
          <WasteForm
            onSave={saveWaste}
            onCancel={() => {}}
            orders={orders}
            users={users}
          />
        )}
      </div>
    </div>
  );
};

export default WasteDowntimeManagement;