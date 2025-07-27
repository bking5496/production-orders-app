// production-control.js - Production control component with pause/resume functionality
// Save as: public/js/components/production-control.js

window.ProductionControl = ({ order, onUpdate }) => {
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [stopNotes, setStopNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const stopReasons = [
    { value: 'machine_breakdown', label: 'Machine Breakdown or Equipment Failure' },
    { value: 'material_shortage', label: 'Material Shortages' },
    { value: 'quality_control', label: 'Quality Control' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  const handlePause = async () => {
    if (!stopReason) {
      alert('Please select a stoppage reason');
      return;
    }

    setLoading(true);
    try {
      await window.API.pauseProduction(order.id, stopReason, stopNotes);
      setShowStopModal(false);
      setStopReason('');
      setStopNotes('');
      onUpdate();
    } catch (error) {
      alert('Failed to pause production: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (window.confirm('Resume production for this order?')) {
      setLoading(true);
      try {
        await window.API.resumeProduction(order.id);
        onUpdate();
      } catch (error) {
        alert('Failed to resume production: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!order || (order.status !== 'in_progress' && order.status !== 'stopped')) {
    return null;
  }

  return React.createElement('div', {
    className: 'flex items-center space-x-2'
  },
    // Pause button (only show for in_progress orders)
    order.status === 'in_progress' && React.createElement('button', {
      onClick: () => setShowStopModal(true),
      className: 'px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center',
      disabled: loading
    },
      React.createElement('span', { className: 'mr-1' }, '⏸'),
      'Pause'
    ),

    // Resume button (only show for stopped orders)
    order.status === 'stopped' && React.createElement('button', {
      onClick: handleResume,
      className: 'px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center',
      disabled: loading
    },
      React.createElement('span', { className: 'mr-1' }, '▶'),
      'Resume'
    ),

    // Stop reason modal
    showStopModal && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => setShowStopModal(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h3', {
          className: 'text-lg font-semibold mb-4'
        }, 'Pause Production'),

        React.createElement('div', {
          className: 'mb-4'
        },
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Stoppage Reason *'),
          React.createElement('select', {
            value: stopReason,
            onChange: (e) => setStopReason(e.target.value),
            className: 'w-full px-3 py-2 border rounded focus:ring-2 focus:ring-yellow-500',
            required: true
          },
            React.createElement('option', { value: '' }, 'Select a reason...'),
            stopReasons.map(reason =>
              React.createElement('option', {
                key: reason.value,
                value: reason.value
              }, reason.label)
            )
          )
        ),

        React.createElement('div', {
          className: 'mb-4'
        },
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Additional Notes'),
          React.createElement('textarea', {
            value: stopNotes,
            onChange: (e) => setStopNotes(e.target.value),
            className: 'w-full px-3 py-2 border rounded focus:ring-2 focus:ring-yellow-500',
            rows: 3,
            placeholder: 'Provide additional details about the stoppage...'
          })
        ),

        React.createElement('div', {
          className: 'flex justify-end space-x-2'
        },
          React.createElement('button', {
            onClick: () => setShowStopModal(false),
            className: 'px-4 py-2 border rounded hover:bg-gray-100'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handlePause,
            className: 'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600',
            disabled: !stopReason || loading
          }, loading ? 'Pausing...' : 'Pause Production')
        )
      )
    )
  );
};
