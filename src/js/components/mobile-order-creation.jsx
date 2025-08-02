import React, { useState, useEffect } from 'react';
import { 
  Plus, Package, User, Calendar, Hash, 
  ChevronRight, Check, X, ArrowLeft 
} from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { TouchButton, TouchDropdown, useDeviceDetection } from './mobile-responsive-utils.jsx';

/**
 * Mobile-Optimized Order Creation Workflow
 * Simplified 3-step process optimized for manufacturing supervisors
 */
export default function MobileOrderCreation({ onClose, onOrderCreated }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    order_number: '',
    product_name: '',
    quantity: '',
    environment: '',
    priority: 'normal',
    due_date: '',
    notes: ''
  });
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();

  useEffect(() => {
    loadEnvironments();
    generateOrderNumber();
  }, []);

  const loadEnvironments = async () => {
    try {
      const envs = await API.get('/environments');
      setEnvironments(envs.map(env => ({ value: env.name, label: env.name })));
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const orderNum = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, order_number: orderNum }));
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};
    
    switch (stepNumber) {
      case 1:
        if (!formData.order_number.trim()) newErrors.order_number = 'Order number required';
        if (!formData.product_name.trim()) newErrors.product_name = 'Product name required';
        break;
      case 2:
        if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Valid quantity required';
        if (!formData.environment) newErrors.environment = 'Environment required';
        break;
      case 3:
        // Final validation - all fields
        if (!formData.order_number.trim()) newErrors.order_number = 'Required';
        if (!formData.product_name.trim()) newErrors.product_name = 'Required';
        if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Required';
        if (!formData.environment) newErrors.environment = 'Required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setLoading(true);
    try {
      const newOrder = await API.post('/orders', {
        ...formData,
        quantity: parseInt(formData.quantity),
        created_by: user.id
      });
      
      onOrderCreated && onOrderCreated(newOrder);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create order' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div className="mobile-order-creation fixed inset-0 z-50 bg-white">
      {/* Header with Progress */}
      <div className="sticky top-0 bg-blue-600 text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={step === 1 ? onClose : handleBack}
            className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Create New Order</h1>
            <div className="text-sm text-blue-200">Step {step} of 3</div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-blue-800">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {step === 1 && <Step1BasicInfo formData={formData} updateField={updateField} errors={errors} />}
        {step === 2 && <Step2Production formData={formData} updateField={updateField} errors={errors} environments={environments} />}
        {step === 3 && <Step3Review formData={formData} updateField={updateField} errors={errors} />}
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
        {step < 3 ? (
          <TouchButton
            onClick={handleNext}
            variant="primary"
            size="large"
            className="w-full h-14 text-lg font-semibold"
          >
            Continue <ChevronRight className="w-6 h-6 ml-2" />
          </TouchButton>
        ) : (
          <TouchButton
            onClick={handleSubmit}
            disabled={loading}
            variant="success"
            size="large"
            loading={loading}
            className="w-full h-14 text-lg font-semibold"
          >
            <Check className="w-6 h-6 mr-2" />
            Create Order
          </TouchButton>
        )}
        
        {errors.submit && (
          <div className="text-red-600 text-center text-sm font-medium">
            {errors.submit}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Step 1: Basic Order Information
 */
const Step1BasicInfo = ({ formData, updateField, errors }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
      <p className="text-gray-600">Enter basic order information</p>
    </div>

    <div className="space-y-4">
      <MobileInput
        label="Order Number"
        value={formData.order_number}
        onChange={(value) => updateField('order_number', value)}
        placeholder="Auto-generated"
        error={errors.order_number}
        icon={Hash}
      />

      <MobileInput
        label="Product Name"
        value={formData.product_name}
        onChange={(value) => updateField('product_name', value)}
        placeholder="Enter product name"
        error={errors.product_name}
        icon={Package}
        required
      />
    </div>
  </div>
);

/**
 * Step 2: Production Details
 */
const Step2Production = ({ formData, updateField, errors, environments }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">Production Setup</h2>
      <p className="text-gray-600">Configure production parameters</p>
    </div>

    <div className="space-y-4">
      <MobileInput
        label="Quantity"
        type="number"
        value={formData.quantity}
        onChange={(value) => updateField('quantity', value)}
        placeholder="Enter quantity"
        error={errors.quantity}
        required
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Environment <span className="text-red-500">*</span>
        </label>
        <TouchDropdown
          value={formData.environment}
          onChange={(value) => updateField('environment', value)}
          options={environments}
          placeholder="Select environment"
          className={errors.environment ? 'border-red-300' : ''}
        />
        {errors.environment && (
          <p className="text-red-600 text-sm">{errors.environment}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <TouchDropdown
          value={formData.priority}
          onChange={(value) => updateField('priority', value)}
          options={[
            { value: 'low', label: 'Low Priority' },
            { value: 'normal', label: 'Normal Priority' },
            { value: 'high', label: 'High Priority' },
            { value: 'urgent', label: 'Urgent' }
          ]}
        />
      </div>

      <MobileInput
        label="Due Date (Optional)"
        type="date"
        value={formData.due_date}
        onChange={(value) => updateField('due_date', value)}
        icon={Calendar}
      />
    </div>
  </div>
);

/**
 * Step 3: Review & Submit
 */
const Step3Review = ({ formData, updateField, errors }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">Review Order</h2>
      <p className="text-gray-600">Verify all details before creating</p>
    </div>

    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
      <ReviewItem label="Order Number" value={formData.order_number} />
      <ReviewItem label="Product" value={formData.product_name} />
      <ReviewItem label="Quantity" value={`${formData.quantity} units`} />
      <ReviewItem label="Environment" value={formData.environment} />
      <ReviewItem label="Priority" value={formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} />
      {formData.due_date && <ReviewItem label="Due Date" value={new Date(formData.due_date).toLocaleDateString()} />}
    </div>

    <MobileInput
      label="Notes (Optional)"
      value={formData.notes}
      onChange={(value) => updateField('notes', value)}
      placeholder="Add any additional notes..."
      multiline
      rows={3}
    />
  </div>
);

/**
 * Review Item Component
 */
const ReviewItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
    <span className="font-medium text-gray-700">{label}:</span>
    <span className="text-gray-900 text-right">{value}</span>
  </div>
);

/**
 * Mobile-Optimized Input Component
 */
const MobileInput = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder = '', 
  error = null,
  icon: Icon = null,
  required = false,
  multiline = false,
  rows = 1,
  className = ''
}) => {
  const InputComponent = multiline ? 'textarea' : 'input';
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <InputComponent
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={multiline ? rows : undefined}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          } ${multiline ? 'resize-none' : ''}`}
        />
      </div>
      {error && (
        <p className="text-red-600 text-sm font-medium">{error}</p>
      )}
    </div>
  );
};