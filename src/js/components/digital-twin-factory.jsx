import React, { useState, useEffect } from 'react';
import { Factory, Maximize2, Minimize2, RotateCcw, Zap, Info, Monitor, Layers, Settings } from 'lucide-react';
import BabylonFactory from './babylon-factory.jsx';
import FactoryDigitalTwin2D from './factory-digital-twin-2d.jsx';
import API from '../core/api';

export default function DigitalTwinFactory() {
  const [machines, setMachines] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
  const [show2DFactory, setShow2DFactory] = useState(false);

  // Load factory data
  useEffect(() => {
    loadFactoryData();
  }, []);

  const loadFactoryData = async () => {
    try {
      setLoading(true);
      
      // Load machines
      const machinesResponse = await API.get('/machines');
      const machinesData = machinesResponse?.data || machinesResponse || [];
      setMachines(Array.isArray(machinesData) ? machinesData : []);

      // Load environments
      try {
        const environmentsResponse = await API.get('/environments');
        const environmentsData = environmentsResponse?.data || environmentsResponse || [];
        setEnvironments(Array.isArray(environmentsData) ? environmentsData : []);
      } catch (envError) {
        console.log('No environments endpoint available');
        setEnvironments([]);
      }
      
    } catch (error) {
      console.error('Failed to load factory data for digital twin:', error);
      setMachines([]);
      setEnvironments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineClick = (machine) => {
    setSelectedMachine(machine);
    console.log('🏭 Digital Twin - Machine selected:', machine.name, '- Status:', machine.status);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Digital Twin Factory</h1>
              <p className="text-gray-600 mt-1">
                {viewMode === '3d' ? 'Real-time 3D visualization of your production facility' : 'Advanced 2D layout design with ultra-high quality graphics'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  viewMode === '3d' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                3D View
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  viewMode === '2d' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Monitor className="w-4 h-4" />
                2D Layout
              </button>
            </div>

            <button
              onClick={loadFactoryData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {viewMode === '2d' ? (
              <button
                onClick={() => setShow2DFactory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Advanced 2D Editor
              </button>
            ) : (
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Factory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">TOTAL MACHINES</p>
              <p className="text-3xl font-bold">{machines.length}</p>
            </div>
            <Factory className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">ACTIVE</p>
              <p className="text-3xl font-bold">{machines.filter(m => m.status === 'in_use').length}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">AVAILABLE</p>
              <p className="text-3xl font-bold">{machines.filter(m => m.status === 'available').length}</p>
            </div>
            <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">MAINTENANCE</p>
              <p className="text-3xl font-bold">{machines.filter(m => m.status === 'maintenance').length}</p>
            </div>
            <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Machine Info */}
      {selectedMachine && (
        <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedMachine.name}</h3>
              <p className="text-slate-300 text-sm">
                Environment: {selectedMachine.environment} • Status: {selectedMachine.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-slate-300">Click machines in 3D view for details</span>
            </div>
          </div>
        </div>
      )}

      {/* Factory Visualization */}
      {viewMode === '3d' ? (
        <div className={`transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'
        }`}>
          <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-2xl ${
            isFullscreen ? 'h-full' : 'h-[800px]'
          }`}>
            {/* 3D Factory Component */}
            <div className="relative w-full h-full">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading 3D Digital Twin Factory...</p>
                    <p className="text-slate-400 text-sm mt-2">Initializing 3D visualization</p>
                  </div>
                </div>
              ) : (
                <BabylonFactory 
                  machines={machines} 
                  onMachineClick={handleMachineClick}
                  className="w-full h-full"
                />
              )}
              
              {/* Fullscreen toggle button overlay */}
              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden h-[800px]">
          {/* 2D Factory Preview */}
          <div className="relative w-full h-full">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-800 text-lg">Loading 2D Digital Twin Factory...</p>
                  <p className="text-gray-600 text-sm mt-2">Initializing advanced 2D layout system</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Monitor className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Advanced 2D Factory Layout</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Create and customize your factory layout with ultra-high quality 2D graphics. 
                    Replace screens, adjust room sizes, and precisely position machines.
                  </p>
                  <div className="space-y-3 text-sm text-gray-600 mb-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Customizable screens and displays</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Variable layout and room sizing</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Precision machine placement</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Ultra-high quality graphics (&gt;15MB)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShow2DFactory(true)}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
                  >
                    <Settings className="w-5 h-5 inline mr-2" />
                    Launch Advanced 2D Editor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Factory Information */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {viewMode === '3d' ? 'Factory Layout' : '2D Layout Features'}
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            {viewMode === '3d' ? (
              <>
                <p><span className="font-medium">Main Factory:</span> 80m × 33m</p>
                <p><span className="font-medium">Inbound Warehouse:</span> 42.4m × 37m (Left)</p>
                <p><span className="font-medium">Outbound Warehouse:</span> 80m × 29m (Right)</p>
                <p><span className="font-medium">Rebate Store:</span> 37.6m × 37m (Far Left)</p>
              </>
            ) : (
              <>
                <p><span className="font-medium">Screen Replacement:</span> Custom displays</p>
                <p><span className="font-medium">Layout Sizing:</span> Variable dimensions</p>
                <p><span className="font-medium">Room Management:</span> Customizable zones</p>
                <p><span className="font-medium">Machine Placement:</span> Precision positioning</p>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Machine Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">{machines.filter(m => m.status === 'available').length}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">{machines.filter(m => m.status === 'in_use').length}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Maintenance</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{machines.filter(m => m.status === 'maintenance').length}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Environments</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">{environments.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {viewMode === '3d' ? 'Interaction' : 'Capabilities'}
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            {viewMode === '3d' ? (
              <>
                <p><span className="font-medium">Click:</span> Select machine for details</p>
                <p><span className="font-medium">Drag:</span> Rotate camera view</p>
                <p><span className="font-medium">Scroll:</span> Zoom in/out</p>
                <p><span className="font-medium">Colors:</span> Indicate machine status</p>
              </>
            ) : (
              <>
                <p><span className="font-medium">Ultra Quality:</span> &gt;15MB graphics</p>
                <p><span className="font-medium">Real-time:</span> Live data integration</p>
                <p><span className="font-medium">Export/Import:</span> Layout management</p>
                <p><span className="font-medium">Professional:</span> Industrial design</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2D Factory Modal */}
      {show2DFactory && (
        <FactoryDigitalTwin2D
          onClose={() => setShow2DFactory(false)}
          initialMachines={machines}
          initialEnvironments={environments}
        />
      )}
    </div>
  );
}