// orders.js - Complete Orders Management with Pause/Resume and Waste Tracking
// Save as: public/js/components/orders.js

window.OrdersPage = () => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = React.useState('all');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showStartModal, setShowStartModal] = React.useState(false);
  const [showCompletionModal, setShowCompletionModal] = React.useState(false);
  const [showPauseModal, setShowPauseModal] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [orderToComplete, setOrderToComplete] = React.useState(null);
  const [orderToPause, setOrderToPause] = React.useState(null);
  const [selectedMachine, setSelectedMachine] = React.useState('');
  const [machines, setMachines] = React.useState([]);
  const [pauseReason, setPauseReason] = React.useState('');
  const [pauseNotes, setPauseNotes] = React.useState('');
  const [formData, setFormData] = React.useState({
    order_number: '',
    product_name: '',
    quantity: '',
    environment: 'blending',
    priority: 'normal',
    due_date: '',
    notes: ''
  });

  // Stoppage types
  const STOPPAGE_TYPES = [
    { value: 'machine_breakdown', label: 'Machine Breakdown or Equipment Failure' },
    { value: 'material_shortage', label: 'Material Shortages' },
    { value: 'quality_control', label: 'Quality Control' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  // Load orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await window.API.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load machines
  const loadMachines = async () => {
    try {
      const data = await window.API.getMachines();
      setMachines(data);
    } catch (error) {
      console.error('Failed to load machines:', error);
    }
  };

  React.useEffect(() => {
    loadOrders();
    loadMachines();
    
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await window.API.createOrder(formData);
      setShowCreateModal(false);
      setFormData({
        order_number: '',
        product_name: '',
        quantity: '',
        environment: 'blending',
        priority: 'normal',
        due_date: '',
        notes: ''
      });
      loadOrders();
    } catch (error) {
      alert('Failed to create order: ' + error.message);
    }
  };

  const handleStartProduction = async (orderId) => {
    if (!selectedMachine) {
      alert('Please select a machine');
      return;
    }
    
    try {
      await window.API.startProduction(orderId, selectedMachine);
      setShowStartModal(false);
      setSelectedMachine('');
      setSelectedOrder(null);
      loadOrders();
    } catch (error) {
      alert('Failed to start production: ' + error.message);
    }
  };

const handlePauseProduction = async () => {
  if (!pauseReason) {
    alert('Please select a stoppage reason');
    return;
  }
  
  try {
    await window.API.pauseProduction(orderToPause.id, pauseReason, pauseNotes);
    setShowPauseModal(false);
    setPauseReason('');
    setPauseNotes('');
    setOrderToPause(null);
    loadOrders();
  } catch (error) {
    alert('Failed to pause production: ' + error.message);
  }
};

  const handleResumeProduction = async (orderId) => {
    if (window.confirm('Resume production for this order?')) {
      try {
        await window.API.resumeProduction(orderId);
        loadOrders();
      } catch (error) {
        alert('Failed to resume production: ' + error.message);
      }
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await window.API.deleteOrder(orderId);
        loadOrders();
      } catch (error) {
        alert('Failed to delete order: ' + error.message);
      }
    }
  };

  const handleCompleteClick = (order) => {
    setOrderToComplete(order);
    setShowCompletionModal(true);
  };

  const handleCompletionSuccess = (result) => {
    loadOrders();
  };

  const filteredOrders = selectedEnvironment === 'all' 
    ? orders 
    : orders.filter(order => order.environment === selectedEnvironment);

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      stopped: 'bg-red-100 text-red-800'
    };
    
    return React.createElement('span', {
      className: `px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.pending}`
    }, status.replace('_', ' ').toUpperCase());
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      low: 'text-gray-600',
      normal: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600 font-bold'
    };
    
    return React.createElement('span', {
      className: priorityClasses[priority] || priorityClasses.normal
    }, priority.toUpperCase());
  };

  if (loading && orders.length === 0) {
    return React.createElement('div', { className: 'p-6' }, 'Loading orders...');
  }

  return React.createElement('div', { className: 'p-6' },
    // Header
    React.createElement('div', { className: 'mb-6 flex justify-between items-center' },
      React.createElement('h1', { className: 'text-2xl font-bold' }, 'Production Orders'),
      React.createElement('button', {
        onClick: () => setShowCreateModal(true),
        className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
      }, 'Create New Order')
    ),
    
    // Environment Filter
    React.createElement('div', { className: 'mb-4 flex space-x-2' },
      ['all', 'blending', 'packaging'].map(env =>
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
    
    // Orders Table
    React.createElement('div', { className: 'bg-white rounded-lg shadow overflow-hidden' },
      React.createElement('table', { className: 'min-w-full' },
        React.createElement('thead', { className: 'bg-gray-50' },
          React.createElement('tr', {},
            ['Order #', 'Product', 'Quantity', 'Environment', 'Priority', 'Status', 'Machine', 'Actions'].map(header =>
              React.createElement('th', {
                key: header,
                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              }, header)
            )
          )
        ),
        React.createElement('tbody', { className: 'bg-white divide-y divide-gray-200' },
          filteredOrders.map(order =>
            React.createElement('tr', { key: order.id },
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm font-medium' }, 
                order.order_number
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                order.product_name
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                order.status === 'completed' 
                  ? `${order.actual_quantity || order.quantity} / ${order.quantity}`
                  : order.quantity
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                order.environment
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                getPriorityBadge(order.priority)
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, 
                getStatusBadge(order.status)
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                order.machine_name || '-'
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm space-x-2' },
                // Pending - Start button
                order.status === 'pending' && React.createElement('button', {
                  onClick: () => {
                    setSelectedOrder(order);
                    setShowStartModal(true);
                  },
                  className: 'px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'
                }, 'Start'),
                
                // In Progress - Pause and Complete buttons
                order.status === 'in_progress' && React.createElement(React.Fragment, {},
                  React.createElement('button', {
                    onClick: () => {
                      setOrderToPause(order);
                      setShowPauseModal(true);
                    },
                    className: 'px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600'
                  }, 'Pause'),
                  React.createElement('button', {
                    onClick: () => handleCompleteClick(order),
                    className: 'px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600'
                  }, 'Complete')
                ),
                
                // Stopped - Resume button
                order.status === 'stopped' && React.createElement('button', {
                  onClick: () => handleResumeProduction(order.id),
                  className: 'px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'
                }, 'Resume'),
                
                // Pending - Delete button
                order.status === 'pending' && React.createElement('button', {
                  onClick: () => handleDeleteOrder(order.id),
                  className: 'px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600'
                }, 'Delete')
              )
            )
          )
        )
      )
    ),
    
    // Create Order Modal (same as before)
    showCreateModal && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => setShowCreateModal(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Create New Order'),
        React.createElement('form', { onSubmit: handleCreateOrder, className: 'space-y-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Order Number',
            value: formData.order_number,
            onChange: (e) => setFormData({...formData, order_number: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Product Name',
            value: formData.product_name,
            onChange: (e) => setFormData({...formData, product_name: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'number',
            placeholder: 'Quantity',
            value: formData.quantity,
            onChange: (e) => setFormData({...formData, quantity: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true,
            min: '1'
          }),
          React.createElement('select', {
            value: formData.environment,
            onChange: (e) => setFormData({...formData, environment: e.target.value}),
            className: 'w-full px-3 py-2 border rounded'
          },
            React.createElement('option', { value: 'blending' }, 'Blending'),
            React.createElement('option', { value: 'packaging' }, 'Packaging')
          ),
          React.createElement('select', {
            value: formData.priority,
            onChange: (e) => setFormData({...formData, priority: e.target.value}),
            className: 'w-full px-3 py-2 border rounded'
          },
            React.createElement('option', { value: 'low' }, 'Low Priority'),
            React.createElement('option', { value: 'normal' }, 'Normal Priority'),
            React.createElement('option', { value: 'high' }, 'High Priority'),
            React.createElement('option', { value: 'urgent' }, 'Urgent')
          ),
          React.createElement('input', {
            type: 'date',
            placeholder: 'Due Date',
            value: formData.due_date,
            onChange: (e) => setFormData({...formData, due_date: e.target.value}),
            className: 'w-full px-3 py-2 border rounded'
          }),
          React.createElement('textarea', {
            placeholder: 'Notes',
            value: formData.notes,
            onChange: (e) => setFormData({...formData, notes: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            rows: 3
          }),
          React.createElement('div', { className: 'flex justify-end space-x-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowCreateModal(false),
              className: 'px-4 py-2 border rounded hover:bg-gray-100'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            }, 'Create Order')
          )
        )
      )
    ),
    
    // Start Production Modal (same as before)
    showStartModal && selectedOrder && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => {
        setShowStartModal(false);
        setSelectedMachine('');
      }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Start Production'),
        React.createElement('div', { className: 'mb-4' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, 
            `Order: ${selectedOrder.order_number} - ${selectedOrder.product_name}`
          ),
          React.createElement('p', { className: 'text-sm text-gray-600' }, 
            `Quantity: ${selectedOrder.quantity}`
          )
        ),
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Select Machine'),
          React.createElement('select', {
            value: selectedMachine,
            onChange: (e) => setSelectedMachine(e.target.value),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          },
            React.createElement('option', { value: '' }, 'Choose a machine...'),
            machines
              .filter(m => m.environment === selectedOrder.environment && m.status === 'available')
              .map(machine =>
                React.createElement('option', { 
                  key: machine.id, 
                  value: machine.id 
                }, `${machine.name} (${machine.type})`)
              )
          )
        ),
        React.createElement('div', { className: 'flex justify-end space-x-2' },
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              setShowStartModal(false);
              setSelectedMachine('');
            },
            className: 'px-4 py-2 border rounded hover:bg-gray-100'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: () => handleStartProduction(selectedOrder.id),
            className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
            disabled: !selectedMachine
          }, 'Start Production')
        )
      )
    ),
    
    // Pause Production Modal
    showPauseModal && orderToPause && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => {
        setShowPauseModal(false);
        setPauseReason('');
        setPauseNotes('');
      }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Pause Production'),
        
        React.createElement('div', { className: 'mb-4 p-4 bg-gray-50 rounded' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, 
            `Order: ${orderToPause.order_number}`
          ),
          React.createElement('p', { className: 'text-sm text-gray-600' }, 
            `Product: ${orderToPause.product_name}`
          )
        ),
        
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { 
            className: 'block text-sm font-medium text-gray-700 mb-2' 
          }, 'Stoppage Reason *'),
          React.createElement('select', {
            value: pauseReason,
            onChange: (e) => setPauseReason(e.target.value),
            className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
            required: true
          },
            React.createElement('option', { value: '' }, 'Select a reason...'),
            STOPPAGE_TYPES.map(type =>
              React.createElement('option', { 
                key: type.value, 
                value: type.value 
              }, type.label)
            )
          )
        ),
        
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { 
            className: 'block text-sm font-medium text-gray-700 mb-2' 
          }, 'Additional Notes'),
          React.createElement('textarea', {
            value: pauseNotes,
            onChange: (e) => setPauseNotes(e.target.value),
            className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
            rows: 3,
            placeholder: 'Provide more details about the stoppage...'
          })
        ),
        
        React.createElement('div', { className: 'flex justify-end space-x-2' },
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              setShowPauseModal(false);
              setPauseReason('');
              setPauseNotes('');
            },
            className: 'px-4 py-2 border rounded hover:bg-gray-100'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handlePauseProduction,
            className: 'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600',
            disabled: !pauseReason
          }, 'Pause Production')
        )
      )
    ),
    
    // Production Completion Modal with Waste Tracking
    React.createElement(window.ProductionCompletionModalWithWaste, {
      isOpen: showCompletionModal,
      onClose: () => {
        setShowCompletionModal(false);
        setOrderToComplete(null);
      },
      order: orderToComplete,
      onComplete: handleCompletionSuccess
    })
  );

// Add this to your orders.js or create a new archived-orders.js file

window.ArchivedOrdersModal = ({ isOpen, onClose }) => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const loadArchivedOrders = async () => {
    setLoading(true);
    try {
      const response = await window.API.get('/orders/archived');
      setOrders(response);
    } catch (error) {
      console.error('Failed to load archived orders:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadArchivedOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.environment === filter);

  return React.createElement('div', {
    className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
    onClick: onClose
  },
    React.createElement('div', {
      className: 'bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      React.createElement('div', {
        className: 'flex justify-between items-center mb-4'
      },
        React.createElement('h2', { 
          className: 'text-xl font-bold' 
        }, 'Archived Orders'),
        React.createElement('button', {
          onClick: onClose,
          className: 'text-gray-400 hover:text-gray-600 text-2xl'
        }, '×')
      ),

      // Filter
      React.createElement('div', { className: 'mb-4 flex space-x-2' },
        ['all', 'blending', 'packaging'].map(env =>
          React.createElement('button', {
            key: env,
            onClick: () => setFilter(env),
            className: `px-4 py-2 rounded ${
              filter === env 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`
          }, env.charAt(0).toUpperCase() + env.slice(1))
        )
      ),

      // Table
      React.createElement('div', { 
        className: 'flex-1 overflow-auto' 
      },
        loading ? 
          React.createElement('div', { className: 'text-center py-4' }, 'Loading archived orders...') :
        filteredOrders.length === 0 ?
          React.createElement('div', { className: 'text-center py-4 text-gray-500' }, 'No archived orders found') :
        React.createElement('table', { className: 'min-w-full divide-y divide-gray-200' },
          React.createElement('thead', { className: 'bg-gray-50' },
            React.createElement('tr', {},
              ['Order #', 'Product', 'Quantity', 'Actual', 'Efficiency', 'Environment', 'Completed', 'Duration'].map(header =>
                React.createElement('th', {
                  key: header,
                  className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, header)
              )
            )
          ),
          React.createElement('tbody', { className: 'bg-white divide-y divide-gray-200' },
            filteredOrders.map(order =>
              React.createElement('tr', { key: order.id },
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.order_number
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.product_name
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.quantity
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.actual_quantity || order.quantity
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  React.createElement('span', {
                    className: 'font-medium ' + (
                      order.efficiency_percentage >= 95 ? 'text-green-600' :
                      order.efficiency_percentage >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    )
                  }, `${order.efficiency_percentage?.toFixed(1) || '100.0'}%`)
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.environment
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  order.complete_time ? new Date(order.complete_time).toLocaleDateString() : 'N/A'
                ),
                React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm' }, 
                  (() => {
                    if (order.start_time && order.complete_time) {
                      const start = new Date(order.start_time);
                      const end = new Date(order.complete_time);
                      const duration = end - start;
                      const hours = Math.floor(duration / (1000 * 60 * 60));
                      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                      return `${hours}h ${minutes}m`;
                    }
                    return 'N/A';
                  })()
                )
              )
            )
          )
        )
      )
    )
  );
};

// Add this to your OrdersPage component:
// Add state:
// const [showArchivedModal, setShowArchivedModal] = useState(false);

// Add button in header:
// React.createElement('button', {
//   onClick: () => setShowArchivedModal(true),
//   className: 'px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600'
// }, 'View Archived'),

// Add modal at the end:
// React.createElement(window.ArchivedOrdersModal, {
//   isOpen: showArchivedModal,
//   onClose: () => setShowArchivedModal(false)
// })

};
