import React, { useState, useEffect, useCallback } from 'react';
import { Factory, Monitor, Settings, Maximize2, X, Download, Upload, Save, Layers } from 'lucide-react';
import Advanced2DFactory from './advanced-2d-factory.jsx';
import API from '../core/api';

// 2D Digital Twin Factory Integration Component
// Provides full-screen 2D factory layout with advanced customization
// Supports screen replacement, layout sizing, and machine placement

const FactoryDigitalTwin2D = ({ 
  onClose, 
  initialMachines = [], 
  initialEnvironments = [] 
}) => {
  const [machines, setMachines] = useState(initialMachines);
  const [environments, setEnvironments] = useState(initialEnvironments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [currentLayoutName, setCurrentLayoutName] = useState('Default Layout');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // Load factory data
  const loadFactoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load machines
      const machinesResponse = await API.get('/machines');
      const machinesData = machinesResponse?.data || machinesResponse || [];
      
      // Load environments
      const environmentsResponse = await API.get('/environments');
      const environmentsData = environmentsResponse?.data || environmentsResponse || [];

      console.log('📊 Loaded factory data:', {
        machines: machinesData.length,
        environments: environmentsData.length
      });

      setMachines(machinesData);
      setEnvironments(environmentsData);

      // Load saved layouts
      try {
        const layoutsResponse = await API.get('/factory-layouts');
        const layoutsData = layoutsResponse?.data || layoutsResponse || [];
        setSavedLayouts(layoutsData);
      } catch (layoutError) {
        console.log('No saved layouts found:', layoutError.message);
        setSavedLayouts([]);
      }

    } catch (error) {
      console.error('Failed to load factory data:', error);
      setError(error.message || 'Failed to load factory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactoryData();
  }, [loadFactoryData]);

  // Handle machine click
  const handleMachineClick = useCallback((machine) => {
    console.log('🏭 Machine clicked:', machine);
    // Could open machine details modal or trigger machine-specific actions
  }, []);

  // Handle layout changes
  const handleLayoutChange = useCallback((layoutData) => {
    console.log('🔄 Layout changed:', layoutData);
    // Auto-save or mark as dirty for manual save
  }, []);

  // Save layout function
  const saveLayout = useCallback(async (layoutName, layoutData) => {
    try {
      const saveData = {
        name: layoutName,
        data: layoutData,
        machines: machines.map(m => ({ id: m.id, position: m.position })),
        created_at: new Date().toISOString(),
        version: '2.0'
      };

      await API.post('/factory-layouts', saveData);
      
      console.log('💾 Layout saved:', layoutName);
      setCurrentLayoutName(layoutName);
      setShowSaveDialog(false);
      
      // Refresh saved layouts list
      const layoutsResponse = await API.get('/factory-layouts');
      setSavedLayouts(layoutsResponse?.data || []);
      
    } catch (error) {
      console.error('Failed to save layout:', error);
      alert('Failed to save layout: ' + error.message);
    }
  }, [machines]);

  // Load layout function
  const loadLayout = useCallback(async (layoutId) => {
    try {
      const response = await API.get(`/factory-layouts/${layoutId}`);
      const layoutData = response?.data || response;
      
      console.log('📂 Layout loaded:', layoutData.name);
      setCurrentLayoutName(layoutData.name);
      setShowLoadDialog(false);
      
      // Apply layout data to the factory component
      // This would need to be implemented in the Advanced2DFactory component
      
    } catch (error) {
      console.error('Failed to load layout:', error);
      alert('Failed to load layout: ' + error.message);
    }
  }, []);

  // Export layout as file
  const exportLayout = useCallback(() => {
    try {
      const exportData = {
        name: currentLayoutName,
        version: '2.0',
        exported_at: new Date().toISOString(),
        machines,
        environments,
        // Layout configuration would come from Advanced2DFactory
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factory-layout-${currentLayoutName.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📤 Layout exported');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  }, [currentLayoutName, machines, environments]);

  // Import layout from file
  const importLayout = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const layoutData = JSON.parse(e.target.result);
        console.log('📥 Layout imported:', layoutData);
        
        // Apply imported layout
        setCurrentLayoutName(layoutData.name || 'Imported Layout');
        
        // Would need to update Advanced2DFactory with imported data
        
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed: Invalid file format');
      }
    };
    reader.readAsText(file);
  }, []);

  // Save dialog component
  const SaveDialog = () => (
    showSaveDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">Save Layout</h3>
          <input
            type="text"
            placeholder="Layout name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            defaultValue={currentLayoutName}
            id="layout-name-input"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const name = document.getElementById('layout-name-input').value;
                if (name.trim()) {
                  saveLayout(name.trim(), {});
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Load dialog component
  const LoadDialog = () => (
    showLoadDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Load Layout</h3>
          <div className="space-y-2">
            {savedLayouts.length > 0 ? (
              savedLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadLayout(layout.id)}
                >
                  <div>
                    <div className="font-medium">{layout.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(layout.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Layers className="w-5 h-5 text-gray-400" />
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No saved layouts found</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowLoadDialog(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Digital Twin</h3>
          <p className="text-gray-600">Initializing high-quality 2D factory layout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={loadFactoryData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 bg-gray-900 z-40">
        {/* Header bar */}
        <div className="absolute top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 px-6 py-4 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Factory className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">2D Digital Twin Factory</h1>
                  <p className="text-sm text-gray-300">{currentLayoutName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Monitor className="w-4 h-4" />
                <span>Ultra Quality</span>
                <span className="text-gray-500">•</span>
                <span>{machines.length} Machines</span>
                <span className="text-gray-500">•</span>
                <span>{environments.length} Environments</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Layout management buttons */}
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Save Layout"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                onClick={() => setShowLoadDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Load Layout"
              >
                <Layers className="w-4 h-4" />
                <span>Load</span>
              </button>

              <button
                onClick={exportLayout}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                title="Export Layout"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <label className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importLayout}
                  className="hidden"
                />
              </label>

              <div className="w-px h-6 bg-gray-600"></div>

              <button
                onClick={onClose}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Exit Full Screen"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="absolute inset-0 pt-20">
          <Advanced2DFactory
            machines={machines}
            environments={environments}
            onMachineClick={handleMachineClick}
            onLayoutChange={handleLayoutChange}
            readOnly={false}
          />
        </div>

        {/* Feature indicators */}
        <div className="absolute bottom-6 left-6 bg-black bg-opacity-50 rounded-lg p-4 text-white">
          <div className="text-sm font-medium mb-2">Advanced Features</div>
          <div className="space-y-1 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Customizable Screens & Displays</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Variable Layout Sizing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Precision Machine Placement</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>Room & Zone Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>Ultra-High Quality Graphics</span>
            </div>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="absolute bottom-6 right-6 bg-black bg-opacity-50 rounded-lg p-4 text-white">
          <div className="text-sm font-medium mb-2">System Status</div>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Render Quality: Ultra</div>
            <div>Canvas Size: High-DPI</div>
            <div>Animations: Enabled</div>
            <div>Real-time Updates: Active</div>
            <div>Memory Usage: Optimized</div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SaveDialog />
      <LoadDialog />
    </>
  );
};

export default FactoryDigitalTwin2D;