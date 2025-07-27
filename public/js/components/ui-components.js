// ui-components.js - Reusable UI Components
// Save as: public/js/components/ui-components.js

// Loading Spinner
window.LoadingSpinner = ({ size = 32, className = '' }) => {
  return React.createElement('div', {
    className: `inline-flex items-center justify-center ${className}`
  },
    React.createElement('div', {
      className: `animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`,
      style: {
        width: `${size}px`,
        height: `${size}px`
      }
    })
  );
};

// Button Component
window.Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
  onClick,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return React.createElement('button', {
    className: `inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`,
    disabled: disabled || loading,
    onClick,
    ...props
  },
    loading && React.createElement(LoadingSpinner, { size: 16, className: 'mr-2' }),
    icon && !loading && React.createElement('span', { className: 'mr-2' }, icon),
    children
  );
};

// Input Component
window.Input = React.forwardRef(({ 
  label, 
  error, 
  icon, 
  className = '', 
  ...props 
}, ref) => {
  const id = props.id || props.name;
  
  return React.createElement('div', { className: 'w-full' },
    label && React.createElement('label', {
      htmlFor: id,
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, label),
    
    React.createElement('div', { className: 'relative' },
      icon && React.createElement('div', {
        className: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'
      }, icon),
      
      React.createElement('input', {
        ref,
        id,
        className: `block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          icon ? 'pl-10' : ''
        } ${error ? 'border-red-300' : ''} ${className}`,
        ...props
      })
    ),
    
    error && React.createElement('p', {
      className: 'mt-1 text-sm text-red-600'
    }, error)
  );
});

// Select Component
window.Select = React.forwardRef(({ 
  label, 
  error, 
  options = [], 
  placeholder = 'Select...', 
  className = '', 
  ...props 
}, ref) => {
  const id = props.id || props.name;
  
  return React.createElement('div', { className: 'w-full' },
    label && React.createElement('label', {
      htmlFor: id,
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, label),
    
    React.createElement('select', {
      ref,
      id,
      className: `block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
        error ? 'border-red-300' : ''
      } ${className}`,
      ...props
    },
      placeholder && React.createElement('option', { value: '' }, placeholder),
      options.map(option => 
        React.createElement('option', {
          key: option.value,
          value: option.value
        }, option.label)
      )
    ),
    
    error && React.createElement('p', {
      className: 'mt-1 text-sm text-red-600'
    }, error)
  );
});

// Modal Component
window.Modal = ({ isOpen, onClose, title, children, size = 'md', actions }) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    React.createElement('div', {
      className: 'fixed inset-0 z-50 overflow-y-auto',
      onClick: onClose
    },
      React.createElement('div', {
        className: 'flex min-h-screen items-center justify-center p-4'
      },
        React.createElement('div', {
          className: 'fixed inset-0 bg-black bg-opacity-25 transition-opacity'
        }),
        
        React.createElement('div', {
          className: `relative bg-white rounded-lg shadow-xl transform transition-all ${sizeClasses[size]} w-full`,
          onClick: (e) => e.stopPropagation()
        },
          // Header
          React.createElement('div', {
            className: 'border-b border-gray-200 px-6 py-4'
          },
            React.createElement('div', {
              className: 'flex items-center justify-between'
            },
              React.createElement('h3', {
                className: 'text-lg font-medium text-gray-900'
              }, title),
              React.createElement('button', {
                onClick: onClose,
                className: 'text-gray-400 hover:text-gray-500'
              },
                React.createElement(window.ICONS.X, { size: 20 })
              )
            )
          ),
          
          // Body
          React.createElement('div', {
            className: 'px-6 py-4'
          }, children),
          
          // Footer
          actions && React.createElement('div', {
            className: 'border-t border-gray-200 px-6 py-4 flex justify-end space-x-3'
          }, actions)
        )
      )
    ),
    document.getElementById('portal-root')
  );
};

// Alert Component
window.Alert = ({ type = 'info', title, children, onClose, className = '' }) => {
  const types = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: window.ICONS.Info
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: window.ICONS.CheckCircle
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: window.ICONS.AlertCircle
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: window.ICONS.XCircle
    }
  };

  const config = types[type];
  const Icon = config.icon;

  return React.createElement('div', {
    className: `rounded-md border p-4 ${config.bg} ${config.border} ${className}`
  },
    React.createElement('div', { className: 'flex' },
      React.createElement('div', { className: 'flex-shrink-0' },
        React.createElement(Icon, {
          size: 20,
          className: config.text
        })
      ),
      React.createElement('div', { className: 'ml-3 flex-1' },
        title && React.createElement('h3', {
          className: `text-sm font-medium ${config.text}`
        }, title),
        React.createElement('div', {
          className: `text-sm ${config.text} ${title ? 'mt-1' : ''}`
        }, children)
      ),
      onClose && React.createElement('div', { className: 'ml-auto pl-3' },
        React.createElement('button', {
          onClick: onClose,
          className: `inline-flex rounded-md p-1.5 ${config.text} hover:bg-opacity-20 focus:outline-none`
        },
          React.createElement(window.ICONS.X, { size: 16 })
        )
      )
    )
  );
};

// Badge Component
window.Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return React.createElement('span', {
    className: `inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`
  }, children);
};

// Empty State Component
window.EmptyState = ({ 
  icon = window.ICONS.Package, 
  title = 'No data', 
  message, 
  action 
}) => {
  return React.createElement('div', {
    className: 'text-center py-12'
  },
    React.createElement(icon, {
      size: 48,
      className: 'mx-auto text-gray-400 mb-4'
    }),
    React.createElement('h3', {
      className: 'text-lg font-medium text-gray-900 mb-2'
    }, title),
    message && React.createElement('p', {
      className: 'text-gray-500 mb-4'
    }, message),
    action
  );
};

// Table Component
window.Table = ({ columns, data, loading, emptyMessage = 'No data available' }) => {
  if (loading) {
    return React.createElement('div', {
      className: 'flex justify-center py-8'
    },
      React.createElement(LoadingSpinner)
    );
  }

  if (!data || data.length === 0) {
    return React.createElement(EmptyState, {
      title: emptyMessage
    });
  }

  return React.createElement('div', {
    className: 'overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'
  },
    React.createElement('table', {
      className: 'min-w-full divide-y divide-gray-300'
    },
      React.createElement('thead', { className: 'bg-gray-50' },
        React.createElement('tr', {},
          columns.map(column => 
            React.createElement('th', {
              key: column.key,
              className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
            }, column.label)
          )
        )
      ),
      React.createElement('tbody', {
        className: 'bg-white divide-y divide-gray-200'
      },
        data.map((row, index) => 
          React.createElement('tr', {
            key: row.id || index,
            className: 'hover:bg-gray-50'
          },
            columns.map(column => 
              React.createElement('td', {
                key: column.key,
                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'
              }, 
                column.render ? column.render(row[column.key], row) : row[column.key]
              )
            )
          )
        )
      )
    )
  );
};

// Dropdown Component
window.Dropdown = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const alignClasses = {
    left: 'left-0',
    right: 'right-0'
  };

  return React.createElement('div', {
    className: 'relative inline-block text-left',
    ref: dropdownRef
  },
    React.createElement('div', {
      onClick: () => setIsOpen(!isOpen)
    }, trigger),
    
    isOpen && React.createElement('div', {
      className: `absolute ${alignClasses[align]} z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100`
    },
      React.createElement('div', { className: 'py-1' },
        items.map((item, index) => 
          item.divider ? 
            React.createElement('div', {
              key: index,
              className: 'border-t border-gray-100'
            }) :
            React.createElement('button', {
              key: index,
              onClick: () => {
                item.onClick();
                setIsOpen(false);
              },
              className: 'group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              disabled: item.disabled
            },
              item.icon && React.createElement(item.icon, {
                size: 16,
                className: 'mr-3 text-gray-400 group-hover:text-gray-500'
              }),
              item.label
            )
        )
      )
    )
  );
};

// Progress Bar Component
window.ProgressBar = ({ value, max = 100, color = 'blue', showLabel = true }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  return React.createElement('div', { className: 'w-full' },
    React.createElement('div', {
      className: 'w-full bg-gray-200 rounded-full h-2.5'
    },
      React.createElement('div', {
        className: `${colors[color]} h-2.5 rounded-full transition-all duration-300`,
        style: { width: `${percentage}%` }
      })
    ),
    showLabel && React.createElement('div', {
      className: 'flex justify-between text-xs text-gray-600 mt-1'
    },
      React.createElement('span', {}, `${value} / ${max}`),
      React.createElement('span', {}, `${Math.round(percentage)}%`)
    )
  );
};

// Tabs Component
window.Tabs = ({ tabs, activeTab, onChange }) => {
  return React.createElement('div', {
    className: 'border-b border-gray-200'
  },
    React.createElement('nav', {
      className: '-mb-px flex space-x-8'
    },
      tabs.map(tab =>
        React.createElement('button', {
          key: tab.id,
          onClick: () => onChange(tab.id),
          className: `whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`
        }, tab.label)
      )
    )
  );
};

// Tooltip Component
window.Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return React.createElement('div', {
    className: 'relative inline-block',
    onMouseEnter: () => setIsVisible(true),
    onMouseLeave: () => setIsVisible(false)
  },
    children,
    isVisible && React.createElement('div', {
      className: `absolute ${positions[position]} z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap`
    }, content)
  );
};
