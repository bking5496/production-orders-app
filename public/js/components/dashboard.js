// dashboard.js - Main Dashboard Component
// Save as: public/js/components/dashboard.js

window.Dashboard = () => {
  const [loading, setLoading] = React.useState(false);
  const [orders, setOrders] = React.useState([]);
  
  React.useEffect(() => {
    // Load initial data
    loadOrders();
  }, []);
  
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
  
  return React.createElement('div', {
    className: 'p-6'
  },
    React.createElement('h1', {
      className: 'text-2xl font-bold mb-6'
    }, 'Production Dashboard'),
    
    // Stats Cards
    React.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'
    },
      React.createElement('div', {
        className: 'bg-white p-6 rounded-lg shadow'
      },
        React.createElement('h3', {
          className: 'text-gray-500 text-sm'
        }, 'Total Orders'),
        React.createElement('p', {
          className: 'text-2xl font-bold'
        }, orders.length || 0)
      )
    ),
    
    // Orders Table
    React.createElement('div', {
      className: 'bg-white rounded-lg shadow p-6'
    },
      React.createElement('h2', {
        className: 'text-lg font-semibold mb-4'
      }, 'Recent Orders'),
      
      loading ? 
        React.createElement('p', {}, 'Loading...') :
        orders.length === 0 ?
          React.createElement('p', {
            className: 'text-gray-500'
          }, 'No orders found') :
          React.createElement('div', {
            className: 'overflow-x-auto'
          },
            React.createElement('table', {
              className: 'min-w-full'
            },
              React.createElement('thead', {},
                React.createElement('tr', {
                  className: 'border-b'
                },
                  React.createElement('th', {
                    className: 'text-left py-2'
                  }, 'Order Number'),
                  React.createElement('th', {
                    className: 'text-left py-2'
                  }, 'Product'),
                  React.createElement('th', {
                    className: 'text-left py-2'
                  }, 'Status')
                )
              ),
              React.createElement('tbody', {},
                orders.slice(0, 5).map(order =>
                  React.createElement('tr', {
                    key: order.id,
                    className: 'border-b'
                  },
                    React.createElement('td', {
                      className: 'py-2'
                    }, order.order_number),
                    React.createElement('td', {
                      className: 'py-2'
                    }, order.product_name),
                    React.createElement('td', {
                      className: 'py-2'
                    }, order.status)
                  )
                )
              )
            )
          )
    )
  );
};
