// production-completion-modal-with-waste.js - Production Completion Modal with Waste Tracking
// Save as: public/js/components/production-completion-modal-with-waste.js
// Updated production-completion-modal-with-waste.js to handle multiple waste types for packaging

window.ProductionCompletionModalWithWaste = ({ isOpen, onClose, order, onComplete }) => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    actual_quantity: order?.quantity || 0,
    notes: '',
    // For blending
    waste_quantity: 0,
    waste_type: 'product_kg',
    // For packaging - multiple waste types
    waste_powder: 0,
    waste_corrugated_box: 0,
    waste_paper: 0,
    waste_display: 0
  });
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (order) {
      setFormData({
        actual_quantity: order.actual_quantity || order.quantity,
        notes: '',
        waste_quantity: 0,
        waste_type: 'product_kg',
        waste_powder: 0,
        waste_corrugated_box: 0,
        waste_paper: 0,
        waste_display: 0
      });
      setError('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        actual_quantity: parseInt(formData.actual_quantity),
        notes: formData.notes
      };

      // Add waste data based on environment
      if (order.environment === 'blending') {
        submitData.waste_quantity = parseFloat(formData.waste_quantity) || 0;
        submitData.waste_type = formData.waste_type;
      } else if (order.environment === 'packaging') {
        submitData.waste_powder = parseFloat(formData.waste_powder) || 0;
        submitData.waste_corrugated_box = parseFloat(formData.waste_corrugated_box) || 0;
        submitData.waste_paper = parseFloat(formData.waste_paper) || 0;
        submitData.waste_display = parseFloat(formData.waste_display) || 0;
      }

      const response = await window.API.completeOrder(order.id, submitData);

      if (response.message) {
        if (window.showNotification) {
          window.showNotification('success', 
            `Order completed! Efficiency: ${response.efficiency.toFixed(1)}%`
          );
        }
        onComplete(response);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to complete production');
    } finally {
      setLoading(false);
    }
  };

  const efficiency = (formData.actual_quantity / order.quantity * 100).toFixed(1);
  const isUnderProduction = formData.actual_quantity < order.quantity;
  
  // Calculate total waste for packaging
  const totalPackagingWaste = order.environment === 'packaging' 
    ? (parseFloat(formData.waste_powder) || 0) + 
      (parseFloat(formData.waste_corrugated_box) || 0) + 
      (parseFloat(formData.waste_paper) || 0) + 
      (parseFloat(formData.waste_display) || 0)
    : 0;

  // Calculate production time
  const getProductionTime = () => {
    if (order.start_time) {
      const start = new Date(order.start_time);
      const now = new Date();
      const duration = now - start;
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return 'N/A';
  };

  return React.createElement('div', {
    className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto',
    onClick: onClose
  },
    React.createElement('div', {
      className: 'bg-white rounded-lg p-6 w-full max-w-2xl my-8 transform transition-all',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      React.createElement('div', {
        className: 'flex justify-between items-center mb-4'
      },
        React.createElement('h2', { 
          className: 'text-xl font-bold' 
        }, 'Complete Production'),
        React.createElement('button', {
          onClick: onClose,
          className: 'text-gray-400 hover:text-gray-600 text-2xl'
        }, '×')
      ),
      
      // Order Details
      React.createElement('div', {
        className: 'mb-4 p-4 bg-gray-50 rounded'
      },
        React.createElement('div', { className: 'grid grid-cols-2 gap-2 text-sm' },
          React.createElement('div', {},
            React.createElement('span', { className: 'text-gray-600' }, 'Order: '),
            React.createElement('span', { className: 'font-medium' }, order.order_number)
          ),
          React.createElement('div', {},
            React.createElement('span', { className: 'text-gray-600' }, 'Product: '),
            React.createElement('span', { className: 'font-medium' }, order.product_name)
          ),
          React.createElement('div', {},
            React.createElement('span', { className: 'text-gray-600' }, 'Target Qty: '),
            React.createElement('span', { className: 'font-medium' }, order.quantity)
          ),
          React.createElement('div', {},
            React.createElement('span', { className: 'text-gray-600' }, 'Environment: '),
            React.createElement('span', { className: 'font-medium capitalize' }, order.environment)
          )
        ),
        React.createElement('div', {
          className: 'mt-2 pt-2 border-t text-sm'
        },
          React.createElement('span', { className: 'text-gray-600' }, 'Production Time: '),
          React.createElement('span', { className: 'font-medium' }, getProductionTime()),
          React.createElement('span', { className: 'text-gray-600 ml-4' }, 'Started: '),
          React.createElement('span', { className: 'font-medium' }, 
            order.start_time ? new Date(order.start_time).toLocaleString() : 'N/A'
          )
        )
      ),

      // Error Message
      error && React.createElement('div', {
        className: 'mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center'
      },
        React.createElement('span', { className: 'mr-2' }, '⚠'),
        error
      ),

      // Form
      React.createElement('form', { 
        onSubmit: handleSubmit,
        className: 'space-y-4'
      },
        // Production Section
        React.createElement('div', {
          className: 'p-4 border rounded-lg'
        },
          React.createElement('h3', {
            className: 'font-medium text-gray-700 mb-3'
          }, 'Production Output'),
          
          // Actual Quantity Input
          React.createElement('div', { className: 'mb-3' },
            React.createElement('label', {
              className: 'block text-sm font-medium text-gray-700 mb-1'
            }, 'Actual Quantity Produced *'),
            React.createElement('input', {
              type: 'number',
              value: formData.actual_quantity,
              onChange: (e) => setFormData({...formData, actual_quantity: e.target.value}),
              className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              min: '0',
              max: order.quantity * 2,
              required: true,
              disabled: loading
            })
          ),

          // Efficiency Indicator
          React.createElement('div', {
            className: 'p-3 rounded-lg border ' + (
              efficiency >= 95 ? 'bg-green-50 border-green-200' :
              efficiency >= 80 ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            )
          },
            React.createElement('div', {
              className: 'flex justify-between items-center'
            },
              React.createElement('span', {
                className: 'text-sm font-medium text-gray-700'
              }, 'Production Efficiency:'),
              React.createElement('span', {
                className: 'text-xl font-bold ' + (
                  efficiency >= 95 ? 'text-green-600' :
                  efficiency >= 80 ? 'text-yellow-600' :
                  'text-red-600'
                )
              }, `${efficiency}%`)
            ),
            
            // Progress Bar
            React.createElement('div', {
              className: 'mt-2 w-full bg-gray-200 rounded-full h-2'
            },
              React.createElement('div', {
                className: 'h-2 rounded-full transition-all duration-300 ' + (
                  efficiency >= 95 ? 'bg-green-500' :
                  efficiency >= 80 ? 'bg-yellow-500' :
                  'bg-red-500'
                ),
                style: { width: `${Math.min(efficiency, 100)}%` }
              })
            )
          )
        ),

        // Waste Section
        React.createElement('div', {
          className: 'p-4 border rounded-lg'
        },
          React.createElement('h3', {
            className: 'font-medium text-gray-700 mb-3'
          }, 'Waste Tracking'),
          
          // Blending waste (single input)
          order.environment === 'blending' && React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
            React.createElement('div', {},
              React.createElement('label', {
                className: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Waste Type'),
              React.createElement('input', {
                type: 'text',
                value: 'Product (kg)',
                className: 'w-full px-3 py-2 border rounded-lg bg-gray-100',
                disabled: true
              })
            ),
            
            React.createElement('div', {},
              React.createElement('label', {
                className: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Waste Quantity (kg)'),
              React.createElement('input', {
                type: 'number',
                value: formData.waste_quantity,
                onChange: (e) => setFormData({...formData, waste_quantity: e.target.value}),
                className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                min: '0',
                step: '0.01',
                placeholder: '0',
                disabled: loading
              })
            )
          ),
          
          // Packaging waste (multiple inputs)
          order.environment === 'packaging' && React.createElement('div', { className: 'space-y-3' },
            React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
              // Powder
              React.createElement('div', {},
                React.createElement('label', {
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Powder Waste'),
                React.createElement('input', {
                  type: 'number',
                  value: formData.waste_powder,
                  onChange: (e) => setFormData({...formData, waste_powder: e.target.value}),
                  className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  min: '0',
                  step: '0.01',
                  placeholder: '0',
                  disabled: loading
                })
              ),
              
              // Corrugated Box
              React.createElement('div', {},
                React.createElement('label', {
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Corrugated Box Waste'),
                React.createElement('input', {
                  type: 'number',
                  value: formData.waste_corrugated_box,
                  onChange: (e) => setFormData({...formData, waste_corrugated_box: e.target.value}),
                  className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  min: '0',
                  step: '0.01',
                  placeholder: '0',
                  disabled: loading
                })
              ),
              
              // Paper
              React.createElement('div', {},
                React.createElement('label', {
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Paper Waste'),
                React.createElement('input', {
                  type: 'number',
                  value: formData.waste_paper,
                  onChange: (e) => setFormData({...formData, waste_paper: e.target.value}),
                  className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  min: '0',
                  step: '0.01',
                  placeholder: '0',
                  disabled: loading
                })
              ),
              
              // Display
              React.createElement('div', {},
                React.createElement('label', {
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Display Waste'),
                React.createElement('input', {
                  type: 'number',
                  value: formData.waste_display,
                  onChange: (e) => setFormData({...formData, waste_display: e.target.value}),
                  className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  min: '0',
                  step: '0.01',
                  placeholder: '0',
                  disabled: loading
                })
              )
            ),
            
            // Total waste summary for packaging
            totalPackagingWaste > 0 && React.createElement('div', {
              className: 'mt-2 p-2 bg-gray-50 rounded text-sm'
            },
              React.createElement('span', { className: 'font-medium' }, 'Total Waste: '),
              React.createElement('span', {}, totalPackagingWaste.toFixed(2)),
              React.createElement('span', { className: 'text-gray-600 ml-2' }, 
                `(${((totalPackagingWaste / order.quantity) * 100).toFixed(1)}% of target quantity)`
              )
            )
          ),
          
          // Waste percentage warning
          ((order.environment === 'blending' && formData.waste_quantity > order.quantity * 0.1) ||
           (order.environment === 'packaging' && totalPackagingWaste > order.quantity * 0.1)) &&
          React.createElement('p', {
            className: 'text-sm text-amber-600 mt-2'
          }, '⚠ High waste percentage detected')
        ),

        // Notes
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Completion Notes'),
          React.createElement('textarea', {
            value: formData.notes,
            onChange: (e) => setFormData({...formData, notes: e.target.value}),
            className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            rows: 3,
            placeholder: 'Any issues, observations, or comments about this production run...',
            disabled: loading
          })
        ),

        // Warning for significant variance
        (efficiency < 80 || efficiency > 120 || 
         (order.environment === 'blending' && formData.waste_quantity > order.quantity * 0.1) ||
         (order.environment === 'packaging' && totalPackagingWaste > order.quantity * 0.1)) && 
        React.createElement('div', {
          className: 'p-3 bg-amber-50 border border-amber-200 rounded-lg'
        },
          React.createElement('p', {
            className: 'text-sm text-amber-800 flex items-center'
          },
            React.createElement('span', { className: 'mr-2' }, '⚠'),
            'Significant variance or waste detected. Please add notes explaining the situation.'
          )
        ),

        // Action Buttons
        React.createElement('div', { 
          className: 'flex justify-end space-x-2 pt-4 border-t' 
        },
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className: 'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors',
            disabled: loading
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            className: 'px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center',
            disabled: loading
          }, 
            loading && React.createElement('span', {
              className: 'mr-2 animate-spin'
            }, '⟳'),
            loading ? 'Completing...' : 'Complete Production'
          )
        )
      )
    )
  );
};
