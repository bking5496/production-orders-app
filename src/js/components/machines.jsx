import React, { useState, useEffect } from 'react';
import API from '../core/api';
import { Modal } from './ui-components.jsx'; // Import our new Modal component

export default function MachinesPage() {
  // State for storing the list of machines and UI status
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  
  // State for managing modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // State for the machine being edited and the form data
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    environment: 'blending',
    capacity: 100,
    production_rate: 60
  });

  // Constants for machine types
  const MACHINE_TYPES = {
    blending: ['Ribbon Blender', 'V-Blender', 'Paddle Mixer', 'High Shear Mixer', 'Drum Mixer'],
    packaging: ['Form Fill Seal', 'Cartoning Machine', 'Labeling Machine', 'Capping Machine', 'Wrapping Machine'],
    beverage: ['Filling Machine', 'Carbonation Unit', 'Pasteurizer', 'Homogenizer', 'Bottling Line']
  };

  // Function to fetch machines from the backend API
  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await API.get('/machines'); // Use the API service
      setMachines(data);
    } catch (error) {
      console.error('Failed to load machines:', error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect runs when the component loads.
  useEffect(() => {
    loadMachines(); // Fetch data immediately
    const interval = setInterval(loadMachines, 30000); // And refresh every 30 seconds
    return () => clearInterval(interval); // Clean up the interval when the component is unmounted
  }, []);

  // Handler for submitting the "Add Machine" form
  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      await API.post('/machines', formData);
      setShowAddModal(false); // Close the modal on success
      loadMachines(); // Refresh the list
    } catch (error) {
      alert('Failed to add machine: ' + (error.message || 'Unknown error'));
    }
  };

  // Handler for submitting the "Edit Machine" form
  const handleEditMachine = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/machines/${selectedMachine.id}`, formData);
      setShowEditModal(false);
      loadMachines();
    } catch (error) {
      alert('Failed to update machine: ' + (error.message || 'Unknown error'));
    }
  };

  // Handler for the delete button
  const handleDeleteMachine = async (machineId) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      try {
        await API.delete(`/machines/${machineId}`);
        loadMachines();
      } catch (error) {
        alert('Failed to delete machine: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Filter the machines based on the selected environment tab
  const filteredMachines = selectedEnvironment === 'all'
    ? machines
    : machines.filter(machine => machine.environment === selectedEnvironment);

  // Helper function to render a styled status badge
  const getStatusBadge = (status) => {
    const statusStyles = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100'}`}>{status.replace('_', ' ').toUpperCase()}</span>;
  };

  if (loading && machines.length === 0) {
    return <div className="p-6 text-center">Loading machines...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Machine Management</h1>
        <button onClick={() => {
          setFormData({ name: '', type: '', environment: 'blending', capacity: 100, production_rate: 60 });
          setShowAddModal(true);
        }} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Add New Machine
        </button>
      </div>

      <div className="mb-4 flex space-x-2">
        {['all', 'blending', 'packaging', 'beverage'].map(env => (
          <button key={env} onClick={() => setSelectedEnvironment(env)} className={`px-4 py-2 rounded ${selectedEnvironment === env ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            {env.charAt(0).toUpperCase() + env.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map(machine => (
          <div key={machine.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{machine.name}</h3>
                <p className="text-sm text-gray-500">{machine.type}</p>
              </div>
              {getStatusBadge(machine.status)}
            </div>
            <div className="flex space-x-2 mt-4">
              <button onClick={() => {
                setSelectedMachine(machine);
                setFormData(machine);
                setShowEditModal(true);
              }} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Edit</button>
              {machine.status !== 'in_use' && (
                <button onClick={() => handleDeleteMachine(machine.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <Modal title="Add New Machine" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddMachine} className="space-y-4">
            <input type="text" placeholder="Machine Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <select value={formData.environment} onChange={(e) => setFormData({...formData, environment: e.target.value, type: ''})} className="w-full px-3 py-2 border rounded">
              <option value="blending">Blending</option>
              <option value="packaging">Packaging</option>
              <option value="beverage">Beverage</option>
            </select>
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded" required>
              <option value="">Select Type...</option>
              {(MACHINE_TYPES[formData.environment] || []).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded" required />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Machine</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && selectedMachine && (
        <Modal title="Edit Machine" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditMachine} className="space-y-4">
            <input type="text" placeholder="Machine Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <select value={formData.environment} className="w-full px-3 py-2 border rounded bg-gray-100" disabled>
              <option value="blending">Blending</option>
              <option value="packaging">Packaging</option>
              <option value="beverage">Beverage</option>
            </select>
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded" required>
              {(MACHINE_TYPES[formData.environment] || []).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
             <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded" required />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update Machine</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
