import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Clock, 
  Play, Square, Plus, Target, Package, User, Settings,
  Camera, Mic, FileText, BarChart3
} from 'lucide-react';
import { HighContrastComponents } from './mobile-theme-system.jsx';
import { OfflineProductionControl } from './mobile-offline-system.jsx';

/**
 * Single-Task Focused Workflows for Manufacturing Operators
 * Each workflow is designed for completion with minimal navigation
 * Optimized for speed and error prevention in fast-paced environments
 */

// Workflow Step Component
const WorkflowStep = ({ 
  title, 
  description, 
  children, 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrevious, 
  onCancel,
  nextLabel = 'Next',
  nextDisabled = false,
  showProgress = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Progress */}
      <header className="bg-white shadow-sm p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Cancel
          </button>
          
          {showProgress && (
            <div className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {showProgress && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Step Title */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>

      {/* Footer Actions */}
      <footer className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex gap-3">
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="flex-1 h-12 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 active:scale-95 transition-all"
            >
              Previous
            </button>
          )}
          
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className={`flex-1 h-12 font-semibold rounded-lg transition-all active:scale-95 ${
                nextDisabled 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

// 1. START PRODUCTION WORKFLOW
export const StartProductionWorkflow = ({ order, machines, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [qualityChecked, setQualityChecked] = useState(false);
  const [materialsChecked, setMaterialsChecked] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);

  const availableMachines = machines.filter(m => 
    m.environment === order.environment && m.status === 'available'
  );

  const steps = [
    {
      title: 'Select Machine',
      description: 'Choose an available machine for this order',
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Order Details</h3>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              <div>Order: {order.order_number}</div>
              <div>Product: {order.product_name}</div>
              <div>Quantity: {order.quantity} units</div>
              <div>Environment: {order.environment}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Available Machines</h3>
            {availableMachines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                <p>No available machines in {order.environment} environment</p>
              </div>
            ) : (
              availableMachines.map(machine => (
                <button
                  key={machine.id}
                  onClick={() => setSelectedMachine(machine)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMachine?.id === machine.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{machine.name}</h4>
                      <p className="text-sm text-gray-600">{machine.type}</p>
                      <p className="text-sm text-gray-500">Capacity: {machine.capacity}</p>
                    </div>
                    {selectedMachine?.id === machine.id && (
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ),
      nextDisabled: !selectedMachine
    },
    {
      title: 'Pre-Production Checklist',
      description: 'Complete all safety and quality checks before starting',
      component: (
        <div className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Safety First</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Complete all checks before starting production
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ChecklistItem
              checked={materialsChecked}
              onChange={setMaterialsChecked}
              title="Materials Ready"
              description="All required materials are available and in correct quantities"
            />
            
            <ChecklistItem
              checked={qualityChecked}
              onChange={setQualityChecked}
              title="Quality Standards"
              description="Machine is calibrated and quality parameters are set"
            />
            
            <ChecklistItem
              checked={safetyConfirmed}
              onChange={setSafetyConfirmed}
              title="Safety Confirmed"
              description="Work area is clear and all safety protocols are followed"
            />
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Selected Machine</h4>
            <div className="text-sm text-green-800">
              <div>{selectedMachine?.name} ({selectedMachine?.type})</div>
              <div>Capacity: {selectedMachine?.capacity}</div>
            </div>
          </div>
        </div>
      ),
      nextDisabled: !materialsChecked || !qualityChecked || !safetyConfirmed,
      nextLabel: 'Start Production'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete workflow
      onComplete({ 
        machineId: selectedMachine.id,
        checksCompleted: {
          materials: materialsChecked,
          quality: qualityChecked,
          safety: safetyConfirmed
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <WorkflowStep
      title={currentStepData.title}
      description={currentStepData.description}
      currentStep={currentStep}
      totalSteps={steps.length}
      onNext={handleNext}
      onPrevious={currentStep > 1 ? handlePrevious : null}
      onCancel={onCancel}
      nextLabel={currentStepData.nextLabel}
      nextDisabled={currentStepData.nextDisabled}
    >
      {currentStepData.component}
    </WorkflowStep>
  );
};

// 2. QUANTITY UPDATE WORKFLOW
export const QuantityUpdateWorkflow = ({ order, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [newQuantity, setNewQuantity] = useState(order.actual_quantity || 0);
  const [updateReason, setUpdateReason] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);
  const [notes, setNotes] = useState('');

  const quantityDifference = newQuantity - (order.actual_quantity || 0);
  const isIncrease = quantityDifference > 0;
  const requiresReason = Math.abs(quantityDifference) > 10; // Significant change

  const steps = [
    {
      title: 'Update Quantity',
      description: 'Enter the current produced quantity',
      component: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Current Progress</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Target: {order.quantity} units</div>
              <div>Previously recorded: {order.actual_quantity || 0} units</div>
              <div>Remaining: {order.quantity - (order.actual_quantity || 0)} units</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                New Quantity
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                  min="0"
                  max={order.quantity}
                  className="flex-1 h-16 px-4 text-2xl font-mono text-center border-2 border-gray-300 rounded-lg focus:border-blue-500"
                />
                <div className="text-gray-600">
                  <div className="text-sm">of</div>
                  <div className="text-xl font-semibold">{order.quantity}</div>
                </div>
              </div>
            </div>

            {quantityDifference !== 0 && (
              <div className={`p-3 rounded-lg ${
                isIncrease ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
              }`}>
                <div className="flex items-center gap-2">
                  {isIncrease ? (
                    <ArrowRight className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span className="font-semibold">
                    {isIncrease ? 'Increase' : 'Decrease'} of {Math.abs(quantityDifference)} units
                  </span>
                </div>
              </div>
            )}

            {/* Quick increment buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map(increment => (
                <button
                  key={increment}
                  onClick={() => setNewQuantity(Math.min(newQuantity + increment, order.quantity))}
                  className="h-12 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
                >
                  +{increment}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      nextDisabled: newQuantity < 0 || newQuantity > order.quantity || newQuantity === (order.actual_quantity || 0)
    }
  ];

  // Add reason step if significant change
  if (requiresReason) {
    steps.push({
      title: 'Update Reason',
      description: 'Explain the significant quantity change',
      component: (
        <div className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <h3 className="font-semibold text-yellow-900">Significant Change Detected</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Changes of {Math.abs(quantityDifference)} units require explanation
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-900 mb-3">
                Select Reason
              </label>
              <div className="space-y-2">
                {[
                  'Batch completion',
                  'Quality issue discovered',
                  'Material shortage',
                  'Machine adjustment',
                  'Operator error correction',
                  'Other'
                ].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setUpdateReason(reason)}
                    className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                      updateReason === reason
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {updateReason === 'Other' && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Additional Details
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  placeholder="Explain the reason for this update..."
                />
              </div>
            )}
          </div>
        </div>
      ),
      nextDisabled: !updateReason || (updateReason === 'Other' && !notes.trim()),
      nextLabel: 'Confirm Update'
    });
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({
        newQuantity,
        reason: updateReason,
        notes,
        difference: quantityDifference
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <WorkflowStep
      title={currentStepData.title}
      description={currentStepData.description}
      currentStep={currentStep}
      totalSteps={steps.length}
      onNext={handleNext}
      onPrevious={currentStep > 1 ? handlePrevious : null}
      onCancel={onCancel}
      nextLabel={currentStepData.nextLabel}
      nextDisabled={currentStepData.nextDisabled}
    >
      {currentStepData.component}
    </WorkflowStep>
  );
};

// 3. ISSUE REPORTING WORKFLOW
export const IssueReportingWorkflow = ({ order, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);
  const [actionTaken, setActionTaken] = useState('');

  const issueTypes = [
    { id: 'quality', label: 'Quality Issue', icon: AlertTriangle, color: 'red' },
    { id: 'machine', label: 'Machine Problem', icon: Settings, color: 'orange' },
    { id: 'material', label: 'Material Issue', icon: Package, color: 'yellow' },
    { id: 'safety', label: 'Safety Concern', icon: AlertTriangle, color: 'red' },
    { id: 'other', label: 'Other Issue', icon: FileText, color: 'gray' }
  ];

  const severityLevels = [
    { id: 'low', label: 'Low', description: 'Minor issue, no immediate impact', color: 'green' },
    { id: 'medium', label: 'Medium', description: 'Some impact on production', color: 'yellow' },
    { id: 'high', label: 'High', description: 'Significant impact, needs attention', color: 'orange' },
    { id: 'critical', label: 'Critical', description: 'Production stopped, immediate action required', color: 'red' }
  ];

  const steps = [
    {
      title: 'Issue Type',
      description: 'What type of issue are you reporting?',
      component: (
        <div className="space-y-4">
          {issueTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setIssueType(type.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  issueType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 text-${type.color}-600`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.label}</h3>
                  </div>
                  {issueType === type.id && (
                    <CheckCircle className="w-6 h-6 text-blue-600 ml-auto" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ),
      nextDisabled: !issueType
    },
    {
      title: 'Severity Level',
      description: 'How severe is this issue?',
      component: (
        <div className="space-y-3">
          {severityLevels.map(level => (
            <button
              key={level.id}
              onClick={() => setSeverity(level.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                severity === level.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold text-${level.color}-600`}>{level.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                </div>
                {severity === level.id && (
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      ),
      nextDisabled: !severity
    },
    {
      title: 'Issue Details',
      description: 'Describe the issue and any actions taken',
      component: (
        <div className="space-y-6">
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Action Taken (Optional)
            </label>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              rows={3}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
              placeholder="What did you do to address this issue?"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-900 mb-3">
              Photo Evidence (Optional)
            </label>
            <button
              onClick={() => setPhotoTaken(!photoTaken)}
              className={`w-full h-16 border-2 border-dashed rounded-lg transition-all ${
                photoTaken 
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-6 h-6" />
                {photoTaken ? 'Photo Taken' : 'Take Photo'}
              </div>
            </button>
          </div>
        </div>
      ),
      nextDisabled: !description.trim(),
      nextLabel: 'Submit Report'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({
        type: issueType,
        severity,
        description,
        actionTaken,
        photoTaken,
        orderId: order.id,
        timestamp: Date.now()
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <WorkflowStep
      title={currentStepData.title}
      description={currentStepData.description}
      currentStep={currentStep}
      totalSteps={steps.length}
      onNext={handleNext}
      onPrevious={currentStep > 1 ? handlePrevious : null}
      onCancel={onCancel}
      nextLabel={currentStepData.nextLabel}
      nextDisabled={currentStepData.nextDisabled}
    >
      {currentStepData.component}
    </WorkflowStep>
  );
};

// Checklist Item Component
const ChecklistItem = ({ checked, onChange, title, description }) => (
  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
    <button
      onClick={() => onChange(!checked)}
      className={`w-6 h-6 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
        checked 
          ? 'bg-green-600 border-green-600 text-white' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {checked && <CheckCircle className="w-4 h-4" />}
    </button>
    
    <div className="flex-1">
      <h4 className={`font-semibold ${checked ? 'text-green-900' : 'text-gray-900'}`}>
        {title}
      </h4>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  </div>
);

export default {
  StartProductionWorkflow,
  QuantityUpdateWorkflow,
  IssueReportingWorkflow
};