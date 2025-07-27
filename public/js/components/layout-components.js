// layout-components.js - Layout Components
// Save as: public/js/components/layout-components.js

// Simple Icon component placeholder
window.Icon = ({ icon, size = 24, className = '' }) => {
  return React.createElement('i', {
    'data-lucide': icon,
    className: className,
    style: { width: size, height: size }
  });
};

// Header Component
window.Header = ({ title, onMenuClick }) => {
  return React.createElement('header', {
    className: 'bg-white shadow-sm border-b border-gray-200'
  },
    React.createElement('div', {
      className: 'px-4 sm:px-6 lg:px-8'
    },
      React.createElement('div', {
        className: 'flex items-center justify-between h-16'
      },
        React.createElement('h1', {
          className: 'text-xl font-semibold text-gray-900'
        }, title || 'Production Management System'),
        
        React.createElement(window.UserMenu || 'div', {})
      )
    )
  );
};

// Sidebar Component
window.Sidebar = ({ isOpen, onClose }) => {
  const auth = window.useAuth ? window.useAuth() : {};
  const user = auth.user || {};
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'layout-dashboard' },
    { name: 'Production Monitor', href: '/production', icon: 'activity' },
    { name: 'Orders', href: '/orders', icon: 'package' },
    { name: 'Machines', href: '/machines', icon: 'settings' },
    { name: 'Analytics', href: '/analytics', icon: 'bar-chart-3' },
    { name: 'Users', href: '/users', icon: 'users' },
    { name: 'Settings', href: '/settings', icon: 'settings' }
  ];
  
  return React.createElement('div', {
    className: `fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 lg:static lg:inset-0`
  },
    React.createElement('div', {
      className: 'flex flex-col h-full'
    },
      React.createElement('div', {
        className: 'flex items-center h-16 px-4 bg-gray-800'
      },
        React.createElement('span', {
          className: 'text-white font-semibold'
        }, 'PMS')
      ),
      
      React.createElement('nav', {
        className: 'flex-1 px-2 py-4 space-y-1'
      },
        navigation.map(item =>
          React.createElement('a', {
            key: item.name,
            href: item.href,
            onClick: (e) => {
              e.preventDefault();
              // Navigate function
              if (window.Router) {
                window.Router.navigate(item.href);
              }
              window.history.pushState({}, '', item.href);
              window.dispatchEvent(new PopStateEvent('popstate'));
            },
            className: 'text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md'
          }, item.name)
        )
      ),
      
      React.createElement('div', {
        className: 'p-4 bg-gray-800'
      },
        React.createElement('p', {
          className: 'text-sm text-white'
        }, user.username || 'User')
      )
    )
  );
};

// Main Layout Component
window.MainLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  return React.createElement('div', {
    className: 'h-screen flex overflow-hidden bg-gray-100'
  },
    React.createElement(Sidebar, {
      isOpen: sidebarOpen,
      onClose: () => setSidebarOpen(false)
    }),
    
    React.createElement('div', {
      className: 'flex-1 flex flex-col overflow-hidden'
    },
      React.createElement(Header, {
        title,
        onMenuClick: () => setSidebarOpen(true)
      }),
      
      React.createElement('main', {
        className: 'flex-1 overflow-y-auto'
      },
        React.createElement('div', {
          className: 'py-6'
        },
          React.createElement('div', {
            className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
          },
            children
          )
        )
      )
    )
  );
};

// Additional components
window.PageHeader = ({ title, subtitle }) => {
  return React.createElement('div', {
    className: 'mb-6'
  },
    React.createElement('h2', {
      className: 'text-2xl font-bold text-gray-900'
    }, title),
    subtitle && React.createElement('p', {
      className: 'mt-1 text-sm text-gray-500'
    }, subtitle)
  );
};

window.ContentCard = ({ title, children }) => {
  return React.createElement('div', {
    className: 'bg-white shadow rounded-lg'
  },
    title && React.createElement('div', {
      className: 'px-4 py-5 border-b border-gray-200 sm:px-6'
    },
      React.createElement('h3', {
        className: 'text-lg font-medium text-gray-900'
      }, title)
    ),
    React.createElement('div', {
      className: 'px-4 py-5 sm:p-6'
    }, children)
  );
};

window.StatsCard = ({ title, value }) => {
  return React.createElement('div', {
    className: 'bg-white overflow-hidden shadow rounded-lg'
  },
    React.createElement('div', {
      className: 'px-4 py-5 sm:p-6'
    },
      React.createElement('dt', {
        className: 'text-sm font-medium text-gray-500 truncate'
      }, title),
      React.createElement('dd', {
        className: 'mt-1 text-3xl font-semibold text-gray-900'
      }, value)
    )
  );
};
