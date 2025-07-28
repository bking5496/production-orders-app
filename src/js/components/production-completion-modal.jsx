// production-completion-modal.js - Production Completion Modal Component
// Save as: public/js/components/production-completion-modal.js

window.ProductionCompletionModal = ({ isOpen, onClose, order, onComplete }) => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    actual_quantity: order?.quantity || 0,
    notes: ''
  });
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (order) {
      setFormData({
        actual_quantity: order.actual_quantity || order.quantity,
        notes: ''
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
      const response = await window.API.completeOrder(order.id, {
        actual_quantity: parseInt(formData.actual_quantity),
        notes: formData.notes
      });

      if (response.message) {
        // Show success message
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
  const isOverProduction = formData.actual_quantity > order.quantity;

  return React.createElement('div', {
    className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
    onClick: onClose
  },
    React.createElement('div', {
      className: 'bg-white rounded-lg p-6 w-full max-w-md transform transition-all',
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
          className: 'text-gray-400 hover:text-gray-600'
        }, '✕')
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
            React.createElement('span', { className: 'text-gray-600' }, 'Machine: '),
            React.createElement('span', { className: 'font-medium' }, order.machine_name || 'N/A')
          )
        ),
        // Production Time
        order.start_time && React.createElement('div', {
          className: 'mt-2 pt-2 border-t text-sm'
        },
          React.createElement('span', { className: 'text-gray-600' }, 'Production Time: '),
          React.createElement('span', { className: 'font-medium' }, 
            (() => {
              // Add 2 hours to database timestamp to align with local SAST time
              const start = new Date(order.start_time).getTime() + (2 * 60 * 60 * 1000);
              const duration = Date.now() - start;
              const hours = Math.floor(duration / (1000 * 60 * 60));
              const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
              return `${hours}h ${minutes}m`;
            })()
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
        // Actual Quantity Input
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Actual Quantity Produced *'),
          React.createElement('input', {
            type: 'number',
            value: formData.actual_quantity,
            onChange: (e) => setFormData({...formData, actual_quantity: e.target.value}),
            className: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            min: '0',
            max: order.quantity * 2, // Allow up to 200% overproduction
            required: true,
            disabled: loading
          })
        ),

        // Efficiency Indicator
        React.createElement('div', {
          className: 'p-4 rounded-lg border ' + (
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
          
          // Efficiency Status Message
          React.createElement('p', {
            className: 'text-sm mt-2 ' + (
              efficiency >= 95 ? 'text-green-600' :
              efficiency >= 80 ? 'text-yellow-600' :
              'text-red-600'
            )
          }, 
            isUnderProduction ? 
              `${order.quantity - formData.actual_quantity} units short of target` :
            isOverProduction ?
              `${formData.actual_quantity - order.quantity} units over target` :
              'Target quantity achieved!'
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
        ),

        // Notes
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Completion Notes (Optional)'),
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
        (efficiency < 80 || efficiency > 120) && React.createElement('div', {
          className: 'p-3 bg-amber-50 border border-amber-200 rounded-lg'
        },
          React.createElement('p', {
            className: 'text-sm text-amber-800 flex items-center'
          },
            React.createElement('span', { className: 'mr-2' }, '⚠'),
            'Significant variance from target. Please add notes explaining the variance.'
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

// Add this to your HTML file:
// <script src="/js/components/production-completion-modal.js"></script>
