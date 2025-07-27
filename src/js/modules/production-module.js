// production-module.js - Production Management Module
// Save as: public/js/modules/production-module.js

window.loadModule('production-module', ['api', 'auth'], () => {
  
  // Production Timer Component
  const ProductionTimer = ({ order, onUpdate }) => {
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
      if (order.status === 'in_progress' && !isPaused) {
        const startTime = new Date(order.started_at).getTime();
        
        intervalRef.current = setInterval(() => {
          setElapsed(Date.now() - startTime);
        }, 1000);

        return () => clearInterval(intervalRef.current);
      }
    }, [order, isPaused]);

    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    const handlePause = async () => {
      try {
        await API.post(`/orders/${order.id}/pause`);
        setIsPaused(true);
        clearInterval(intervalRef.current);
        onUpdate();
      } catch (error) {
        console.error('Failed to pause production:', error);
      }
    };

    const handleResume = async () => {
      try {
        await API.post(`/orders/${order.id}/resume`);
        setIsPaused(false);
        onUpdate();
      } catch (error) {
        console.error('Failed to resume production:', error);
      }
    };

    return React.createElement('div', {
      className: 'flex items-center space-x-4'
    },
      React.createElement('div', {
        className: 'text-2xl font-mono'
      }, formatTime(elapsed)),
      
      React.createElement('div', {
        className: 'flex space-x-2'
      },
        isPaused ? 
          React.createElement(Button, {
            size: 'sm',
            variant: 'primary',
            icon: React.createElement(Icon, { icon: ICONS.Play, size: 16 }),
            onClick: handleResume
          }, 'Resume') :
          React.createElement(Button, {
            size: 'sm',
            variant: 'secondary',
            icon: React.createElement(Icon, { icon: ICONS.Pause, size: 16 }),
            onClick: handlePause
          }, 'Pause')
      )
    );
  };

  // Production Stop Modal
  const ProductionStopModal = ({ isOpen, onClose, order, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const stopReasons = [
      { value: 'material_shortage', label: 'Material Shortage' },
      { value: 'machine_breakdown', label: 'Machine Breakdown' },
      { value: 'quality_issue', label: 'Quality Issue' },
      { value: 'operator_break', label: 'Operator Break' },
      { value: 'shift_change', label: 'Shift Change' },
      { value: 'other', label: 'Other' }
    ];

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        await API.post(`/orders/${order.id}/stop`, {
          reason,
          notes
        });
        onSubmit();
        onClose();
      } catch (error) {
        console.error('Failed to record stop:', error);
      } finally {
        setLoading(false);
      }
    };

    return React.createElement(Modal, {
      isOpen,
      onClose,
      title: 'Record Production Stop',
      size: 'md'
    },
      React.createElement('form', {
        onSubmit: handleSubmit,
        className: 'space-y-4'
      },
        React.createElement(Select, {
          label: 'Stop Reason',
          value: reason,
          onChange: (e) => setReason(e.target.value),
          options: stopReasons,
          required: true
        }),
        
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Additional Notes'),
          React.createElement('textarea', {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            rows: 4,
            className: 'block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
          })
        ),
        
        React.createElement('div', {
          className: 'flex justify-end space-x-3 pt-4'
        },
          React.createElement(Button, {
            type: 'button',
            variant: 'ghost',
            onClick: onClose
          }, 'Cancel'),
          React.createElement(Button, {
            type: 'submit',
            variant: 'primary',
            loading,
            disabled: !reason
          }, 'Record Stop')
        )
      )
    );
  };

  // Quantity Update Component
  const QuantityUpdater = ({ order, onUpdate }) => {
    const [quantity, setQuantity] = useState(order.completed_quantity);
    const [isEditing, setIsEditing] = useState(false);

    const handleUpdate = async () => {
      if (quantity === order.completed_quantity) {
        setIsEditing(false);
        return;
      }

      try {
        await API.patch(`/orders/${order.id}`, {
          completed_quantity: quantity
        });
        setIsEditing(false);
        onUpdate();
      } catch (error) {
        console.error('Failed to update quantity:', error);
        setQuantity(order.completed_quantity);
      }
    };

    return React.createElement('div', {
      className: 'flex items-center space-x-2'
    },
      isEditing ? 
        React.createElement('div', {
          className: 'flex items-center space-x-2'
        },
          React.createElement('input', {
            type: 'number',
            value: quantity,
            onChange: (e) => setQuantity(parseInt(e.target.value) || 0),
            min: 0,
            max: order.quantity,
            className: 'w-24 px-2 py-1 border rounded',
            onBlur: handleUpdate,
            onKeyPress: (e) => e.key === 'Enter' && handleUpdate()
          }),
          React.createElement('span', {
            className: 'text-gray-500'
          }, `/ ${order.quantity}`)
        ) :
        React.createElement('div', {
          className: 'flex items-center space-x-2 cursor-pointer',
          onClick: () => setIsEditing(true)
        },
          React.createElement('span', {
            className: 'font-medium'
          }, `${quantity} / ${order.quantity}`),
          React.createElement(Icon, {
            icon: ICONS.Edit,
            size: 16,
            className: 'text-gray-400'
          })
        ),
      
      React.createElement(ProgressBar, {
        value: quantity,
        max: order.quantity,
        color: quantity === order.quantity ? 'green' : 'blue',
        showLabel: false
      })
    );
  };

  // Production Control Panel
  window.ProductionControlPanel = ({ order, onUpdate, onComplete }) => {
    const [showStopModal, setShowStopModal] = useState(false);
    const { hasRole } = useAuth();

    const canControl = hasRole(['admin', 'supervisor', 'operator']);

    if (!canControl || order.status !== 'in_progress') {
      return null;
    }

    const handleComplete = async () => {
      if (window.confirm('Mark this order as completed?')) {
        try {
          await API.post(`/orders/${order.id}/complete`);
          onComplete();
        } catch (error) {
          console.error('Failed to complete order:', error);
        }
      }
    };

    return React.createElement('div', {
      className: 'bg-gray-50 rounded-lg p-6 space-y-4'
    },
      React.createElement('h3', {
        className: 'text-lg font-semibold mb-4'
      }, 'Production Control'),
      
      // Timer
      React.createElement('div', {
        className: 'flex items-center justify-between'
      },
        React.createElement('span', {
          className: 'text-sm font-medium text-gray-700'
        }, 'Elapsed Time'),
        React.createElement(ProductionTimer, {
          order,
          onUpdate
        })
      ),
      
      // Quantity
      React.createElement('div', {
        className: 'flex items-center justify-between'
      },
        React.createElement('span', {
          className: 'text-sm font-medium text-gray-700'
        }, 'Completed Quantity'),
        React.createElement(QuantityUpdater, {
          order,
          onUpdate
        })
      ),
      
      // Actions
      React.createElement('div', {
        className: 'flex space-x-3 pt-4'
      },
        React.createElement(Button, {
          variant: 'danger',
          onClick: () => setShowStopModal(true)
        }, 'Record Stop'),
        
        React.createElement(Button, {
          variant: 'success',
          onClick: handleComplete,
          disabled: order.completed_quantity < order.quantity
        }, 'Complete Order')
      ),
      
      // Stop Modal
      React.createElement(ProductionStopModal, {
        isOpen: showStopModal,
        onClose: () => setShowStopModal(false),
        order,
        onSubmit: onUpdate
      })
    );
  };

  // Machine Monitor Component
  window.MachineMonitor = ({ machines }) => {
    const groupedMachines = Utils.groupBy(machines, 'environment');

    return React.createElement('div', {
      className: 'space-y-6'
    },
      Object.entries(groupedMachines).map(([environment, envMachines]) =>
        React.createElement('div', {
          key: environment,
          className: 'bg-white rounded-lg shadow p-6'
        },
          React.createElement('h3', {
            className: 'text-lg font-semibold mb-4'
          }, environment),
          
          React.createElement('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          },
            envMachines.map(machine =>
              React.createElement('div', {
                key: machine.id,
                className: 'border rounded-lg p-4'
              },
                React.createElement('div', {
                  className: 'flex items-center justify-between mb-2'
                },
                  React.createElement('h4', {
                    className: 'font-medium'
                  }, machine.name),
                  React.createElement(Badge, {
                    variant: machine.status === 'available' ? 'success' : 
                             machine.status === 'in_use' ? 'warning' : 'danger',
                    size: 'sm'
                  }, machine.status)
                ),
                
                React.createElement('div', {
                  className: 'text-sm text-gray-600 space-y-1'
                },
                  React.createElement('div', {}, `Type: ${machine.type}`),
                  React.createElement('div', {}, `Capacity: ${machine.capacity}%`),
                  machine.current_order && React.createElement('div', {
                    className: 'mt-2 pt-2 border-t'
                  }, `Current: ${machine.current_order}`)
                )
              )
            )
          )
        )
      )
    );
  };

  // Export module components
  return {
    ProductionTimer,
    ProductionStopModal,
    QuantityUpdater,
    ProductionControlPanel,
    MachineMonitor
  };
});
