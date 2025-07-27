// machines.js - Complete Machine Management UI
// Update your existing machines.js file with this complete version

window.MachinesPage = () => {
  const [machines, setMachines] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = React.useState('all');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedMachine, setSelectedMachine] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: '',
    type: '',
    environment: 'blending',
    capacity: 100,
    status: 'available',
    production_rate: 60
  });

  // Machine types based on environment
  const MACHINE_TYPES = {
    blending: ['Ribbon Blender', 'V-Blender', 'Paddle Mixer', 'High Shear Mixer', 'Drum Mixer'],
    packaging: ['Form Fill Seal', 'Cartoning Machine', 'Labeling Machine', 'Capping Machine', 'Wrapping Machine'],
    beverage: ['Filling Machine', 'Carbonation Unit', 'Pasteurizer', 'Homogenizer', 'Bottling Line']
  };

  // Load machines
  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await window.API.getMachines();
      setMachines(data);
    } catch (error) {
      console.error('Failed to load machines:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadMachines();
    const interval = setInterval(loadMachines, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      await window.API.createMachine(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        type: '',
        environment: 'blending',
        capacity: 100,
        status: 'available',
        production_rate: 60
      });
      loadMachines();
    } catch (error) {
      alert('Failed to add machine: ' + error.message);
    }
  };

  const handleEditMachine = async (e) => {
    e.preventDefault();
    try {
      await window.API.updateMachine(selectedMachine.id, formData);
      setShowEditModal(false);
      setSelectedMachine(null);
      loadMachines();
    } catch (error) {
      alert('Failed to update machine: ' + error.message);
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (window.confirm('Are you sure you want to delete this machine? This action cannot be undone.')) {
      try {
        await window.API.deleteMachine(machineId);
        loadMachines();
      } catch (error) {
        alert('Failed to delete machine: ' + error.message);
      }
    }
  };

  const handleStatusChange = async (machineId, newStatus) => {
    try {
      await window.API.updateMachineStatus(machineId, newStatus);
      loadMachines();
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const filteredMachines = selectedEnvironment === 'all' 
    ? machines 
    : machines.filter(machine => machine.environment === selectedEnvironment);

  const getStatusBadge = (status) => {
    const statusStyles = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-800',
      paused: 'bg-orange-100 text-orange-800'
    };
    
    return React.createElement('span', {
      className: `px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.offline}`
    }, status.replace('_', ' ').toUpperCase());
  };

  const getUtilization = (machine) => {
    // This would calculate actual utilization from orders
    // For now, showing based on status
    if (machine.status === 'in_use') return 100;
    if (machine.status === 'paused') return 50;
    return 0;
  };

  if (loading && machines.length === 0) {
    return React.createElement('div', { className: 'p-6' }, 'Loading machines...');
  }

  return React.createElement('div', { className: 'p-6' },
    // Header
    React.createElement('div', { className: 'mb-6 flex justify-between items-center' },
      React.createElement('h1', { className: 'text-2xl font-bold' }, 'Machine Management'),
      React.createElement('button', {
        onClick: () => setShowAddModal(true),
        className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
      }, 'Add New Machine')
    ),
    
    // Stats Cards
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' },
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Total Machines'),
        React.createElement('p', { className: 'text-2xl font-bold' }, machines.length)
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Available'),
        React.createElement('p', { className: 'text-2xl font-bold text-green-600' }, 
          machines.filter(m => m.status === 'available').length
        )
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'In Use'),
        React.createElement('p', { className: 'text-2xl font-bold text-blue-600' }, 
          machines.filter(m => m.status === 'in_use').length
        )
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Maintenance'),
        React.createElement('p', { className: 'text-2xl font-bold text-yellow-600' }, 
          machines.filter(m => m.status === 'maintenance').length
        )
      )
    ),
    
    // Environment Filter
    React.createElement('div', { className: 'mb-4 flex space-x-2' },
      ['all', 'blending', 'packaging', 'beverage'].map(env =>
        React.createElement('button', {
          key: env,
          onClick: () => setSelectedEnvironment(env),
          className: `px-4 py-2 rounded ${
            selectedEnvironment === env 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`
        }, env.charAt(0).toUpperCase() + env.slice(1))
      )
    ),
    
    // Machines Grid
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
      filteredMachines.map(machine =>
        React.createElement('div', {
          key: machine.id,
          className: 'bg-white rounded-lg shadow p-6'
        },
          // Machine Header
          React.createElement('div', { className: 'flex justify-between items-start mb-4' },
            React.createElement('div', {},
              React.createElement('h3', { className: 'text-lg font-semibold' }, machine.name),
              React.createElement('p', { className: 'text-sm text-gray-500' }, machine.type)
            ),
            getStatusBadge(machine.status)
          ),
          
          // Machine Details
          React.createElement('div', { className: 'space-y-2 mb-4' },
            React.createElement('div', { className: 'flex justify-between text-sm' },
              React.createElement('span', { className: 'text-gray-500' }, 'Environment:'),
              React.createElement('span', { className: 'font-medium capitalize' }, machine.environment)
            ),
            React.createElement('div', { className: 'flex justify-between text-sm' },
              React.createElement('span', { className: 'text-gray-500' }, 'Capacity:'),
              React.createElement('span', { className: 'font-medium' }, `${machine.capacity}%`)
            ),
            React.createElement('div', { className: 'flex justify-between text-sm' },
              React.createElement('span', { className: 'text-gray-500' }, 'Utilization:'),
              React.createElement('span', { className: 'font-medium' }, `${getUtilization(machine)}%`)
            ),
            React.createElement('div', { className: 'flex justify-between text-sm' },
              React.createElement('span', { className: 'text-gray-500' }, 'Production Rate:'),
              React.createElement('span', { className: 'font-medium' }, `${machine.production_rate || 60} units/hr`)
            )
          ),
          
          // Utilization Bar
          React.createElement('div', { className: 'mb-4' },
            React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2' },
              React.createElement('div', {
                className: 'h-2 rounded-full transition-all ' + 
                  (machine.status === 'in_use' ? 'bg-blue-500' : 
                   machine.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-300'),
                style: { width: `${getUtilization(machine)}%` }
              })
            )
          ),
          
          // Actions
          React.createElement('div', { className: 'flex space-x-2' },
            // Status dropdown
            React.createElement('select', {
              value: machine.status,
              onChange: (e) => handleStatusChange(machine.id, e.target.value),
              className: 'flex-1 px-3 py-1 border rounded text-sm',
              disabled: machine.status === 'in_use'
            },
              React.createElement('option', { value: 'available' }, 'Available'),
              React.createElement('option', { value: 'maintenance' }, 'Maintenance'),
              React.createElement('option', { value: 'offline' }, 'Offline'),
              machine.status === 'in_use' && React.createElement('option', { value: 'in_use' }, 'In Use')
            ),
            
            // Edit button
            React.createElement('button', {
              onClick: () => {
                setSelectedMachine(machine);
                setFormData({
                  name: machine.name,
                  type: machine.type,
                  environment: machine.environment,
                  capacity: machine.capacity,
                  status: machine.status,
                  production_rate: machine.production_rate || 60
                });
                setShowEditModal(true);
              },
              className: 'px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600'
            }, 'Edit'),
            
            // Delete button (only if not in use)
            machine.status !== 'in_use' && React.createElement('button', {
              onClick: () => handleDeleteMachine(machine.id),
              className: 'px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600'
            }, 'Delete')
          )
        )
      )
    ),
    
    // Add Machine Modal
    showAddModal && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => setShowAddModal(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Add New Machine'),
        React.createElement('form', { onSubmit: handleAddMachine, className: 'space-y-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Machine Name',
            value: formData.name,
            onChange: (e) => setFormData({...formData, name: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('select', {
            value: formData.environment,
            onChange: (e) => setFormData({...formData, environment: e.target.value, type: ''}),
            className: 'w-full px-3 py-2 border rounded'
          },
            React.createElement('option', { value: 'blending' }, 'Blending'),
            React.createElement('option', { value: 'packaging' }, 'Packaging'),
            React.createElement('option', { value: 'beverage' }, 'Beverage')
          ),
          React.createElement('select', {
            value: formData.type,
            onChange: (e) => setFormData({...formData, type: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          },
            React.createElement('option', { value: '' }, 'Select Type...'),
            (MACHINE_TYPES[formData.environment] || []).map(type =>
              React.createElement('option', { key: type, value: type }, type)
            )
          ),
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
              `Capacity (%) - Default: 100`
            ),
            React.createElement('input', {
              type: 'number',
              value: formData.capacity,
              onChange: (e) => setFormData({...formData, capacity: parseInt(e.target.value) || 100}),
              className: 'w-full px-3 py-2 border rounded',
              min: '1',
              max: '200',
              required: true
            })
          ),
          // In the Add Machine form, add this field after capacity:
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
              'Production Rate (units/hour)'
            ),
            React.createElement('input', {
              type: 'number',
              value: formData.production_rate,
              onChange: (e) => setFormData({...formData, production_rate: parseInt(e.target.value) || 60}),
              className: 'w-full px-3 py-2 border rounded',
              min: '1',
              max: '1000',
              required: true
            })
          ),
          React.createElement('div', { className: 'flex justify-end space-x-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowAddModal(false),
              className: 'px-4 py-2 border rounded hover:bg-gray-100'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            }, 'Add Machine')
          )
        )
      )
    ),
    
    // Edit Machine Modal
    showEditModal && selectedMachine && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => {
        setShowEditModal(false);
        setSelectedMachine(null);
      }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Edit Machine'),
        React.createElement('form', { onSubmit: handleEditMachine, className: 'space-y-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Machine Name',
            value: formData.name,
            onChange: (e) => setFormData({...formData, name: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('select', {
            value: formData.environment,
            onChange: (e) => setFormData({...formData, environment: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            disabled: true // Can't change environment after creation
          },
            React.createElement('option', { value: 'blending' }, 'Blending'),
            React.createElement('option', { value: 'packaging' }, 'Packaging'),
            React.createElement('option', { value: 'beverage' }, 'Beverage')
          ),
          React.createElement('select', {
            value: formData.type,
            onChange: (e) => setFormData({...formData, type: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          },
            (MACHINE_TYPES[formData.environment] || []).map(type =>
              React.createElement('option', { key: type, value: type }, type)
            )
          ),
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
              'Capacity (%)'
            ),
            React.createElement('input', {
              type: 'number',
              value: formData.capacity,
              onChange: (e) => setFormData({...formData, capacity: parseInt(e.target.value) || 100}),
              className: 'w-full px-3 py-2 border rounded',
              min: '1',
              max: '200',
              required: true
            })
          ),
          // In the Edit Machine form, add this field after capacity:
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
              'Production Rate (units/hour)'
            ),
            React.createElement('input', {
              type: 'number',
              value: formData.production_rate,
              onChange: (e) => setFormData({...formData, production_rate: parseInt(e.target.value) || 60}),
              className: 'w-full px-3 py-2 border rounded',
              min: '1',
              max: '1000',
              required: true
            })
          ),
          React.createElement('div', { className: 'flex justify-end space-x-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => {
                setShowEditModal(false);
                setSelectedMachine(null);
              },
              className: 'px-4 py-2 border rounded hover:bg-gray-100'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            }, 'Update Machine')
          )
        )
      )
    )
  );
};
