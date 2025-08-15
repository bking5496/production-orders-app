import React, { useState, useEffect } from 'react';
import { Factory, Maximize2, Minimize2, RotateCcw, Zap, Info } from 'lucide-react';
import BabylonFactory from './babylon-factory.jsx';
import API from '../core/api';

export default function DigitalTwinFactory() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Load machines for the 3D factory
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const response = await API.get('/machines');
      const data = response?.data || response || [];
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load machines for digital twin:', error);
      setMachines([]);
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
              <h1 className="text-3xl font-bold text-gray-900">4D Digital Twin Factory</h1>
              <p className="text-gray-600 mt-1">Real-time 3D visualization of your production facility</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadMachines}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
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

      {/* 3D Factory Visualization */}
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
                  <p className="text-white text-lg">Loading Digital Twin Factory...</p>
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

      {/* Factory Information */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Factory Layout</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Main Factory:</span> 80m × 33m</p>
            <p><span className="font-medium">Inbound Warehouse:</span> 42.4m × 37m (Left)</p>
            <p><span className="font-medium">Outbound Warehouse:</span> 80m × 29m (Right)</p>
            <p><span className="font-medium">Rebate Store:</span> 37.6m × 37m (Far Left)</p>
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
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Interaction</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Click:</span> Select machine for details</p>
            <p><span className="font-medium">Drag:</span> Rotate camera view</p>
            <p><span className="font-medium">Scroll:</span> Zoom in/out</p>
            <p><span className="font-medium">Colors:</span> Indicate machine status</p>
          </div>
        </div>
      </div>
    </div>
  );
}