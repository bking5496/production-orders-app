// production-dashboard.js - Real-Time Production Dashboard
// Save as: public/js/components/production-dashboard.js

window.ProductionDashboard = () => {
  const [activeOrders, setActiveOrders] = React.useState([]);
  const [machines, setMachines] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalActive: 0,
    machinesInUse: 0,
    averageEfficiency: 0,
    stoppedOrders: 0
  });

  // Auto-refresh interval
  const REFRESH_INTERVAL = 5000; // 5 seconds

  // Load production data
  const loadProductionData = async () => {
    try {
      // Get active production orders
      const activeOrdersResponse = await window.API.get('/production/active');
      
      // Get production stats
      const statsResponse = await window.API.get('/production/stats');
      
      // Get all machines
      const machinesResponse = await window.API.getMachines();
      
      setActiveOrders(activeOrdersResponse);
      setMachines(machinesResponse);
      setStats({
        totalActive: statsResponse.active_orders || 0,
        machinesInUse: statsResponse.machines_in_use || 0,
        averageEfficiency: parseFloat(statsResponse.avg_efficiency || 0).toFixed(1),
        stoppedOrders: statsResponse.stopped_orders || 0
      });
    } catch (error) {
      console.error('Failed to load production data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update quantity in real-time
  const updateQuantity = async (orderId, newQuantity) => {
    try {
      await window.API.patch(`/orders/${orderId}/quantity`, { 
        actual_quantity: newQuantity 
      });
      loadProductionData(); // Refresh data
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  // Calculate production time
  const getProductionTime = (startTime) => {
    if (!startTime) return '00:00:00';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = (order) => {
    if (!order.quantity) return 0;
    const produced = order.actual_quantity || 0;
    return Math.min((produced / order.quantity) * 100, 100);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get machine utilization color
  const getUtilizationColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  React.useEffect(() => {
    loadProductionData();
    
    // Set up auto-refresh
    const interval = setInterval(loadProductionData, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return React.createElement('div', { 
      className: 'flex items-center justify-center h-64' 
    },
      React.createElement('div', { className: 'text-lg' }, 'Loading production data...')
    );
  }

  return React.createElement('div', { className: 'p-6 space-y-6' },
    // Header
    React.createElement('div', { className: 'flex justify-between items-center mb-6' },
      React.createElement('div', {},
        React.createElement('h1', { className: 'text-2xl font-bold' }, 'Production Floor Monitor'),
        React.createElement('p', { className: 'text-sm text-gray-500' }, 
          `Auto-refreshing every ${REFRESH_INTERVAL / 1000} seconds`
        )
      ),
      React.createElement('div', { className: 'text-sm text-gray-500' },
        `Last updated: ${new Date().toLocaleTimeString()}`
      )
    ),

    // Stats Cards
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' },
      // Active Orders
      React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', {},
            React.createElement('p', { className: 'text-sm text-gray-500' }, 'Active Orders'),
            React.createElement('p', { className: 'text-3xl font-bold text-green-600' }, stats.totalActive)
          ),
          React.createElement('div', { 
            className: 'w-12 h-12 bg-green-100 rounded-full flex items-center justify-center' 
          },
            React.createElement('span', { className: 'text-green-600 text-xl' }, '📦')
          )
        )
      ),

      // Machines in Use
      React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', {},
            React.createElement('p', { className: 'text-sm text-gray-500' }, 'Machines Running'),
            React.createElement('p', { className: 'text-3xl font-bold text-blue-600' }, 
              `${stats.machinesInUse}/${machines.length}`
            )
          ),
          React.createElement('div', { 
            className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' 
          },
            React.createElement('span', { className: 'text-blue-600 text-xl' }, '⚙️')
          )
        )
      ),

      // Average Efficiency
      React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', {},
            React.createElement('p', { className: 'text-sm text-gray-500' }, 'Avg Efficiency'),
            React.createElement('p', { 
              className: `text-3xl font-bold ${getUtilizationColor(stats.averageEfficiency)}` 
            }, `${stats.averageEfficiency}%`)
          ),
          React.createElement('div', { 
            className: 'w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center' 
          },
            React.createElement('span', { className: 'text-yellow-600 text-xl' }, '�')
          )
        )
      ),

      // Stopped Orders
      React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', {},
            React.createElement('p', { className: 'text-sm text-gray-500' }, 'Stopped Orders'),
            React.createElement('p', { 
              className: `text-3xl font-bold ${stats.stoppedOrders > 0 ? 'text-red-600' : 'text-gray-600'}` 
            }, stats.stoppedOrders)
          ),
          React.createElement('div', { 
            className: `w-12 h-12 ${stats.stoppedOrders > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-full flex items-center justify-center` 
          },
            React.createElement('span', { 
              className: `${stats.stoppedOrders > 0 ? 'text-red-600' : 'text-gray-600'} text-xl` 
            }, '⚠️')
          )
        )
      )
    ),

    // Active Production Orders
    React.createElement('div', { className: 'bg-white rounded-lg shadow' },
      React.createElement('div', { className: 'px-6 py-4 border-b' },
        React.createElement('h2', { className: 'text-lg font-semibold' }, 'Active Production Orders')
      ),
      
      activeOrders.length === 0 ?
        React.createElement('div', { className: 'p-8 text-center text-gray-500' },
          'No active production orders at the moment'
        ) :
        React.createElement('div', { className: 'divide-y divide-gray-200' },
          activeOrders.map(order =>
            React.createElement('div', { 
              key: order.id,
              className: 'p-6 hover:bg-gray-50 transition-colors'
            },
              // Order Header
              React.createElement('div', { className: 'flex justify-between items-start mb-4' },
                React.createElement('div', {},
                  React.createElement('div', { className: 'flex items-center space-x-3' },
                    React.createElement('h3', { className: 'text-lg font-medium' }, 
                      `Order #${order.order_number}`
                    ),
                    React.createElement('span', {
                      className: `px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(order.status)}`
                    }, order.status.replace('_', ' ').toUpperCase())
                  ),
                  React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, 
                    order.product_name
                  )
                ),
                React.createElement('div', { className: 'text-right' },
                  React.createElement('p', { className: 'text-sm text-gray-500' }, 'Running Time'),
                  React.createElement('p', { className: 'text-xl font-mono font-medium' }, 
                    getProductionTime(order.start_time)
                  )
                )
              ),

              // Order Details Grid
              React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm' },
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-gray-500' }, 'Environment'),
                  React.createElement('p', { className: 'font-medium capitalize' }, order.environment)
                ),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-gray-500' }, 'Machine'),
                  React.createElement('p', { className: 'font-medium' }, order.machine_name || 'N/A')
                ),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-gray-500' }, 'Operator'),
                  React.createElement('p', { className: 'font-medium' }, order.operator_name || 'N/A')
                ),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-gray-500' }, 'Priority'),
                  React.createElement('p', { 
                    className: `font-medium ${
                      order.priority === 'urgent' ? 'text-red-600' :
                      order.priority === 'high' ? 'text-orange-600' :
                      'text-gray-600'
                    }` 
                  }, order.priority.toUpperCase())
                )
              ),

              // Progress Bar with Efficiency
              React.createElement('div', { className: 'space-y-2' },
                React.createElement('div', { className: 'flex justify-between text-sm' },
                  React.createElement('span', { className: 'text-gray-500' }, 'Progress'),
                  React.createElement('span', { className: 'font-medium' }, 
                    `${order.actual_quantity || 0} / ${order.quantity} units`
                  )
                ),
                React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2' },
                  React.createElement('div', {
                    className: `h-2 rounded-full transition-all duration-500 ${
                      order.status === 'stopped' ? 'bg-red-500' : 'bg-blue-500'
                    }`,
                    style: { width: `${getProgress(order)}%` }
                  })
                ),
                React.createElement('div', { className: 'flex justify-between text-xs text-gray-500' },
                  React.createElement('span', {}, '0%'),
                  React.createElement('span', {}, `${getProgress(order).toFixed(1)}%`),
                  React.createElement('span', {}, '100%')
                ),
                
                // Efficiency indicator if machine has production rate
                order.production_rate && order.minutes_running &&
                React.createElement('div', { 
                  className: 'mt-2 p-2 bg-gray-50 rounded' 
                },
                  React.createElement('div', { className: 'flex justify-between text-xs' },
                    React.createElement('span', { className: 'text-gray-600' }, 
                      `Expected: ${order.expected_quantity || 0} units (${order.production_rate}/hr)`
                    ),
                    React.createElement('span', { 
                      className: `font-medium ${
                        order.efficiency_percentage >= 90 ? 'text-green-600' :
                        order.efficiency_percentage >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }` 
                    }, `Efficiency: ${(order.efficiency_percentage || 0).toFixed(1)}%`)
                  )
                )
              ),

              // Stop Reason (if stopped)
              order.status === 'stopped' && order.current_stop_reason &&
              React.createElement('div', { 
                className: 'mt-3 p-3 bg-red-50 rounded-lg' 
              },
                React.createElement('p', { className: 'text-sm font-medium text-red-800' }, 
                  'Stop Reason:'
                ),
                React.createElement('p', { className: 'text-sm text-red-600' }, 
                  order.current_stop_reason.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                  order.current_stop_reason.slice(1).replace(/_/g, ' ')
                ),
                order.stop_time && React.createElement('p', { className: 'text-xs text-red-500 mt-1' }, 
                  `Stopped at: ${new Date(order.stop_time).toLocaleTimeString()}`
                )
              )
            )
          )
        )
    ),

    // Machine Status Grid
    React.createElement('div', { className: 'mt-6' },
      React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, 'Machine Status Overview'),
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
        machines.map(machine =>
          React.createElement('div', {
            key: machine.id,
            className: `bg-white p-4 rounded-lg shadow ${
              machine.status === 'in_use' ? 'border-l-4 border-green-500' :
              machine.status === 'maintenance' ? 'border-l-4 border-yellow-500' :
              machine.status === 'offline' ? 'border-l-4 border-red-500' :
              'border-l-4 border-gray-300'
            }`
          },
            React.createElement('div', { className: 'flex justify-between items-start' },
              React.createElement('div', {},
                React.createElement('h4', { className: 'font-medium' }, machine.name),
                React.createElement('p', { className: 'text-xs text-gray-500 capitalize' }, 
                  machine.environment
                )
              ),
              React.createElement('span', {
                className: `w-3 h-3 rounded-full ${
                  machine.status === 'available' ? 'bg-gray-400' :
                  machine.status === 'in_use' ? 'bg-green-500' :
                  machine.status === 'maintenance' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`
              })
            ),
            React.createElement('p', { 
              className: `text-sm mt-2 ${
                machine.status === 'in_use' ? 'text-green-600 font-medium' :
                machine.status === 'maintenance' ? 'text-yellow-600' :
                machine.status === 'offline' ? 'text-red-600' :
                'text-gray-600'
              }` 
            }, machine.status.replace('_', ' ').toUpperCase())
          )
        )
      )
    )
  );
};
