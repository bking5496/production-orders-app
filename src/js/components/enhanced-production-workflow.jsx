import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Settings, 
  Play, 
  Square,
  FileCheck,
  Activity,
  Zap,
  XCircle,
  Pause
} from 'lucide-react';
import API from '../core/api';

const EnhancedProductionWorkflow = ({ orderId, onClose }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);
  const [machines, setMachines] = useState([]);

  // Material preparation state (will be loaded from API)
  const [materials, setMaterials] = useState([]);

  // Setup state (will be loaded from API)
  const [setupData, setSetupData] = useState({
    machine_id: null,
    setup_type: 'initial_setup',
    previous_product: '',
    setup_checklist: []
  });

  // Production state
  const [productionData, setProductionData] = useState({
    batch_number: `BAT${Date.now()}`,
    environmental_conditions: {
      temperature: 25.0,
      humidity: 60.0,
      pressure: 1013.25
    }
  });

  // Quality checks state (will be loaded from API)
  const [qualityChecks, setQualityChecks] = useState([]);

  const workflowSteps = [
    { 
      id: 'materials', 
      title: 'Material Preparation', 
      icon: Package, 
      description: 'Verify and allocate raw materials',
      status: 'pending'
    },
    { 
      id: 'setup', 
      title: 'Machine Setup', 
      icon: Settings, 
      description: 'Configure machine and complete setup checklist',
      status: 'pending'
    },
    { 
      id: 'production', 
      title: 'Production Start', 
      icon: Play, 
      description: 'Begin production with safety checks',
      status: 'pending'
    },
    { 
      id: 'quality', 
      title: 'Quality Control', 
      icon: FileCheck, 
      description: 'Monitor quality checkpoints',
      status: 'pending'
    },
    { 
      id: 'completion', 
      title: 'Completion', 
      icon: CheckCircle, 
      description: 'Complete production with final approval',
      status: 'pending'
    }
  ];

  // Load machines data
  const loadMachines = async () => {
    try {
      const machinesData = await API.get('/machines');
      setMachines(machinesData || []);
    } catch (error) {
      console.error('Error loading machines:', error);
      // Set fallback machines if API fails
      setMachines([]);
    }
  };

  useEffect(() => {
    loadOrderDetails();
    loadMachines();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      let response;
      
      try {
        // Try enhanced endpoint first
        response = await API.get(`/orders/${orderId}/enhanced`);
      } catch (enhancedError) {
        console.warn('Enhanced endpoint failed, falling back to regular order details:', enhancedError);
        // Fallback to regular order details
        const orderResponse = await API.get(`/orders/${orderId}`);
        response = {
          order: orderResponse,
          materials: [],
          quality_checks: [],
          setup: null,
          workflow_progress: {
            materials_prepared: orderResponse.material_check_completed || false,
            setup_completed: !!orderResponse.setup_complete_time,
            production_started: orderResponse.workflow_stage === 'in_progress',
            quality_approved: orderResponse.quality_approved || false
          }
        };
      }
      
      setOrderDetails(response);
      
      // Update workflow status based on order
      updateWorkflowStatus(response.order);
      
      // Set materials data from API response
      if (response.materials?.length > 0) {
        const formattedMaterials = response.materials.map(m => ({
          id: m.id,
          code: m.code,
          name: m.name,
          required_qty: m.required_quantity,
          unit: m.unit_of_measure,
          allocated_qty: m.allocated_quantity || 0,
          lot_number: m.lot_number || '',
          supplier: m.supplier || '',
          is_critical: m.is_critical,
          allocation_status: m.allocation_status || 'pending'
        }));
        setMaterials(formattedMaterials);
      }
      
      // Set setup checklist data from API response
      if (response.setup?.length > 0) {
        const formattedSetup = {
          machine_id: response.order.machine_id,
          setup_type: 'initial_setup',
          previous_product: '',
          setup_checklist: response.setup.map(s => ({
            id: s.id,
            task: s.task_description,
            completed: s.completed || false,
            estimated_time_minutes: s.estimated_time_minutes,
            instructions: s.instructions,
            completed_at: s.completed_at,
            notes: s.progress_notes
          }))
        };
        setSetupData(formattedSetup);
      }
      
      // Set quality checks data from API response  
      if (response.quality_checks?.length > 0) {
        const formattedQuality = response.quality_checks.map(qc => ({
          id: qc.id,
          checkpoint_name: qc.checkpoint_name,
          checkpoint_stage: qc.checkpoint_stage,
          target_value: qc.target_value,
          tolerance_min: qc.tolerance_min,
          tolerance_max: qc.tolerance_max,
          unit_of_measure: qc.unit_of_measure,
          measured_value: qc.measured_value,
          pass_fail: qc.pass_fail,
          test_method: qc.test_method,
          frequency: qc.frequency
        }));
        setQualityChecks(formattedQuality);
      }
      
    } catch (error) {
      setError('Failed to load order details');
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkflowStatus = (order) => {
    let currentStep = 0;
    
    if (order.material_check_completed) currentStep = 1;
    if (order.setup_complete_time) currentStep = 2;
    if (order.workflow_stage === 'in_progress') currentStep = 3;
    if (order.quality_approved) currentStep = 4;
    if (order.workflow_stage === 'completed') currentStep = 5;
    
    setActiveStep(currentStep);
  };

  const handlePrepareMaterials = async () => {
    try {
      setLoading(true);
      await API.post(`/orders/${orderId}/prepare-materials`, {
        materials,
        checked_by: 1, // Current user ID
        notes: 'Materials prepared via enhanced workflow'
      });
      
      setActiveStep(1);
      await loadOrderDetails();
      setError('');
    } catch (error) {
      setError('Failed to prepare materials: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      await API.post(`/orders/${orderId}/start-setup`, {
        machine_id: setupData.machine_id,
        setup_type: setupData.setup_type,
        previous_product: setupData.previous_product
      });
      
      await loadOrderDetails();
      setError('');
    } catch (error) {
      setError('Failed to start setup: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      setLoading(true);
      await API.post(`/orders/${orderId}/complete-setup`, {
        setup_checklist: setupData.setup_checklist,
        notes: 'Setup completed via enhanced workflow'
      });
      
      setActiveStep(2);
      await loadOrderDetails();
      setError('');
    } catch (error) {
      setError('Failed to complete setup: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProduction = async () => {
    try {
      setLoading(true);
      await API.post(`/orders/${orderId}/start-enhanced`, {
        batch_number: productionData.batch_number,
        environmental_conditions: productionData.environmental_conditions
      });
      
      setActiveStep(3);
      await loadOrderDetails();
      setError('');
    } catch (error) {
      setError('Failed to start production: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQualityCheck = async (checkIndex, measuredValue) => {
    const check = qualityChecks[checkIndex];
    try {
      await API.post(`/orders/${orderId}/quality-check`, {
        checkpoint_name: check.checkpoint_name,
        checkpoint_stage: check.checkpoint_stage,
        measured_value: parseFloat(measuredValue),
        target_value: check.target_value,
        tolerance_min: check.tolerance_min,
        tolerance_max: check.tolerance_max,
        unit_of_measure: check.unit_of_measure,
        notes: 'Quality check via enhanced workflow'
      });
      
      // Update local state
      const updatedChecks = [...qualityChecks];
      updatedChecks[checkIndex].measured_value = parseFloat(measuredValue);
      setQualityChecks(updatedChecks);
      
      await loadOrderDetails();
    } catch (error) {
      setError('Failed to record quality check: ' + error.response?.data?.error || error.message);
    }
  };

  const handleCompleteProduction = async () => {
    try {
      setLoading(true);
      await API.post(`/orders/${orderId}/complete-enhanced`, {
        actual_quantity: orderDetails?.order?.quantity,
        quality_approved: true,
        final_notes: 'Production completed via enhanced workflow'
      });
      
      setActiveStep(5);
      await loadOrderDetails();
      setError('');
    } catch (error) {
      setError('Failed to complete production: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (index) => {
    if (index < activeStep) return 'completed';
    if (index === activeStep) return 'active';
    return 'pending';
  };

  if (loading && !orderDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Enhanced Production Workflow</h2>
              <p className="text-gray-600">
                Order: {orderDetails?.order?.order_number} - {orderDetails?.order?.product_name}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Workflow Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {workflowSteps.map((step, index) => {
                const status = getStepStatus(index);
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center border-2
                        ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                          status === 'active' ? 'bg-blue-500 border-blue-500 text-white' :
                          'bg-gray-100 border-gray-300 text-gray-400'}
                      `}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium mt-2 text-center">{step.title}</span>
                      <span className="text-xs text-gray-500 text-center">{step.description}</span>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className={`
                        flex-1 h-0.5 mx-4
                        ${index < activeStep ? 'bg-green-500' : 'bg-gray-300'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-50 rounded-lg p-6">
            {/* Material Preparation */}
            {activeStep === 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Material Preparation
                </h3>
                <div className="space-y-4">
                  {materials.map((material, index) => (
                    <div key={material.code} className="bg-white p-4 rounded-lg border">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Code</label>
                          <p className="text-sm">{material.code}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Material</label>
                          <p className="text-sm">{material.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Required</label>
                          <p className="text-sm">{material.required_qty} {material.unit}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Allocated</label>
                          <p className="text-sm">{material.allocated_qty} {material.unit}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Lot Number</label>
                          <p className="text-sm">{material.lot_number}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Supplier</label>
                          <p className="text-sm">{material.supplier}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handlePrepareMaterials}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Preparing...' : 'Confirm Material Preparation'}
                  </button>
                </div>
              </div>
            )}

            {/* Machine Setup */}
            {activeStep === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Machine Setup
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                      <select
                        value={setupData.machine_id || ''}
                        onChange={(e) => setSetupData(prev => ({ ...prev, machine_id: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">Select Machine</option>
                        {machines.map(machine => (
                          <option key={machine.id} value={machine.id}>
                            {machine.name} ({machine.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Setup Type</label>
                      <select
                        value={setupData.setup_type}
                        onChange={(e) => setSetupData(prev => ({ ...prev, setup_type: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="initial_setup">Initial Setup</option>
                        <option value="changeover">Changeover</option>
                        <option value="maintenance_setup">Maintenance Setup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Previous Product</label>
                      <input
                        type="text"
                        value={setupData.previous_product}
                        onChange={(e) => setSetupData(prev => ({ ...prev, previous_product: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Previous product (if changeover)"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Setup Checklist</h4>
                    <div className="space-y-2">
                      {setupData.setup_checklist.map((item, index) => (
                        <label key={index} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => {
                              const updated = [...setupData.setup_checklist];
                              updated[index].completed = e.target.checked;
                              setSetupData(prev => ({ ...prev, setup_checklist: updated }));
                            }}
                            className="mr-2"
                          />
                          <span className={item.completed ? 'line-through text-gray-500' : ''}>{item.task}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {!orderDetails?.setup ? (
                      <button
                        onClick={handleStartSetup}
                        disabled={!setupData.machine_id || loading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Starting...' : 'Start Setup'}
                      </button>
                    ) : (
                      <button
                        onClick={handleCompleteSetup}
                        disabled={!setupData.setup_checklist.every(item => item.completed) || loading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Completing...' : 'Complete Setup'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Production Start */}
            {activeStep === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Play className="h-5 w-5 mr-2 text-green-600" />
                  Production Start
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                      <input
                        type="text"
                        value={productionData.batch_number}
                        onChange={(e) => setProductionData(prev => ({ ...prev, batch_number: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Environmental Conditions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={productionData.environmental_conditions.temperature}
                          onChange={(e) => setProductionData(prev => ({
                            ...prev,
                            environmental_conditions: {
                              ...prev.environmental_conditions,
                              temperature: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={productionData.environmental_conditions.humidity}
                          onChange={(e) => setProductionData(prev => ({
                            ...prev,
                            environmental_conditions: {
                              ...prev.environmental_conditions,
                              humidity: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pressure (hPa)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={productionData.environmental_conditions.pressure}
                          onChange={(e) => setProductionData(prev => ({
                            ...prev,
                            environmental_conditions: {
                              ...prev.environmental_conditions,
                              pressure: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartProduction}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Starting Production...' : 'Start Production with Safety Checks'}
                  </button>
                </div>
              </div>
            )}

            {/* Quality Control */}
            {activeStep === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileCheck className="h-5 w-5 mr-2 text-purple-600" />
                  Quality Control Checkpoints
                </h3>
                <div className="space-y-4">
                  {qualityChecks.map((check, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Checkpoint</label>
                          <p className="text-sm">{check.checkpoint_name}</p>
                          <p className="text-xs text-gray-500">{check.checkpoint_stage}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                          <p className="text-sm">{check.target_value} {check.unit_of_measure}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tolerance</label>
                          <p className="text-sm">{check.tolerance_min} - {check.tolerance_max}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Measured Value</label>
                          <input
                            type="number"
                            step="0.1"
                            value={check.measured_value || ''}
                            onChange={(e) => {
                              const updated = [...qualityChecks];
                              updated[index].measured_value = parseFloat(e.target.value);
                              setQualityChecks(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder={`Enter ${check.unit_of_measure}`}
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => handleQualityCheck(index, check.measured_value)}
                            disabled={!check.measured_value}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            Record
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => setActiveStep(4)}
                    disabled={qualityChecks.some(check => check.measured_value === null)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Proceed to Completion
                  </button>
                </div>
              </div>
            )}

            {/* Completion */}
            {activeStep === 4 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Production Completion
                </h3>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Final Quality Approval Required</h4>
                    <p className="text-green-700 text-sm">
                      All quality checkpoints have been completed successfully. 
                      Supervisor approval is required to complete production.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Production Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Order Number:</span>
                        <span className="ml-2 font-medium">{orderDetails?.order?.order_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Product:</span>
                        <span className="ml-2 font-medium">{orderDetails?.order?.product_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Batch Number:</span>
                        <span className="ml-2 font-medium">{productionData.batch_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <span className="ml-2 font-medium">{orderDetails?.order?.quantity} units</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteProduction}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Completing Production...' : 'Complete Production with Quality Approval'}
                  </button>
                </div>
              </div>
            )}

            {/* Production Monitoring & Downtime Tracking */}
            {(orderDetails?.order?.workflow_stage === 'in_progress' || activeStep >= 3) && (
              <div className="mt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-yellow-800 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Production Monitoring
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDowntimeModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Report Downtime
                      </button>
                      <button
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        Pause Production
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <p>Production is active. Monitor for any issues and report downtime immediately if problems occur.</p>
                    <p className="mt-1">Current batch: <span className="font-medium">{productionData.batch_number}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Completed */}
            {activeStep >= 5 && (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Production Completed Successfully!</h3>
                <p className="text-gray-600 mb-4">
                  Order {orderDetails?.order?.order_number} has been completed with full traceability and quality approval.
                </p>
                <button
                  onClick={onClose}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
                >
                  Close Workflow
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Downtime Reporting Modal */}
      {showDowntimeModal && (
        <DowntimeReportModal
          orderId={orderId}
          onClose={() => setShowDowntimeModal(false)}
          onSuccess={() => {
            setShowDowntimeModal(false);
            setError('Downtime reported successfully');
          }}
        />
      )}
    </div>
  );
};

// Downtime Report Modal Component
function DowntimeReportModal({ orderId, onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await API.get('/downtime/categories');
      setCategories(response);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await API.post('/downtime/create', {
        ...formData,
        order_id: orderId
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating downtime:', error);
      alert('Failed to report downtime: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Report Production Downtime
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-red-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-red-800">
            <strong>Order #{orderId}</strong> - Reporting downtime will alert supervisors and track production impact.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine ID *</label>
              <input
                type="number"
                required
                value={formData.machine_id}
                onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter machine ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Category *</label>
              <select
                required
                value={formData.downtime_category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, downtime_category_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Cause *</label>
            <input
              type="text"
              required
              value={formData.primary_cause}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_cause: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Brief description of the issue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Cause (Optional)</label>
            <input
              type="text"
              value={formData.secondary_cause}
              onChange={(e) => setFormData(prev => ({ ...prev, secondary_cause: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Additional contributing factors"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Production Impact</label>
              <select
                value={formData.production_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, production_impact: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="none">None</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration (min)</label>
              <input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0"
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
              placeholder="Additional details, immediate actions taken, etc."
            />
          </div>
          
          <div className="flex gap-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.quality_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, quality_impact: e.target.checked }))}
                className="mr-2"
              />
              Quality Impact
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.safety_incident}
                onChange={(e) => setFormData(prev => ({ ...prev, safety_incident: e.target.checked }))}
                className="mr-2"
              />
              Safety Incident
            </label>
            <label className="flex items-center text-sm">
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
              {submitting ? 'Reporting...' : 'Report Downtime'}
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

export default EnhancedProductionWorkflow;