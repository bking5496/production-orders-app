// auth-components.js - Authentication UI Components
// Save as: public/js/components/auth-components.js

// Login Form Component
window.LoginForm = () => {
  const [credentials, setCredentials] = React.useState({ 
    username: '', 
    password: '' 
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let auth = null;
      try {
        auth = window.useAuth ? window.useAuth() : null;
      } catch (e) {
        auth = null;
      }
      if (auth && auth.login) {
        await auth.login(credentials.username, credentials.password);
      } else {
        // Fallback to direct API call
        const response = await window.API.login(credentials.username, credentials.password);
        if (response.token) {
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (error) setError('');
  };

  return React.createElement('div', {
    className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'
  },
    React.createElement('div', {
      className: 'bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md'
    },
      React.createElement('div', {
        className: 'text-center mb-8'
      },
        React.createElement('h1', {
          className: 'text-3xl font-bold text-gray-800 mb-2'
        }, 'Production Management'),
        React.createElement('p', {
          className: 'text-gray-600'
        }, 'Sign in to continue')
      ),
      
      React.createElement('form', {
        onSubmit: handleSubmit,
        className: 'space-y-6'
      },
        error && React.createElement(window.Alert, {
          type: 'error',
          onClose: () => setError('')
        }, error),
        
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Username'),
          React.createElement('div', {
            className: 'relative'
          },
            React.createElement('input', {
              type: 'text',
              value: credentials.username,
              onChange: handleInputChange('username'),
              className: 'w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              placeholder: 'Enter your username',
              required: true,
              autoFocus: true,
              disabled: loading
            }),
            React.createElement('div', {
              className: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'
            },
              React.createElement(window.Icon || 'span', { 
                icon: window.ICONS?.User || 'user', 
                size: 20, 
                className: 'text-gray-400' 
              })
            )
          )
        ),
        
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Password'),
          React.createElement('div', {
            className: 'relative'
          },
            React.createElement('input', {
              type: showPassword ? 'text' : 'password',
              value: credentials.password,
              onChange: handleInputChange('password'),
              className: 'w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              placeholder: 'Enter your password',
              required: true,
              disabled: loading
            }),
            React.createElement('div', {
              className: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'
            },
              React.createElement(window.Icon || 'span', { 
                icon: window.ICONS?.Lock || 'lock', 
                size: 20, 
                className: 'text-gray-400' 
              })
            ),
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowPassword(!showPassword),
              className: 'absolute inset-y-0 right-0 pr-3 flex items-center',
              tabIndex: -1
            },
              React.createElement(window.Icon || 'span', {
                icon: showPassword ? (window.ICONS?.EyeOff || 'eye-off') : (window.ICONS?.Eye || 'eye'),
                size: 20,
                className: 'text-gray-400 hover:text-gray-600'
              })
            )
          )
        ),
        
        React.createElement('button', {
          type: 'submit',
          disabled: loading || !credentials.username || !credentials.password,
          className: 'w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
        },
          loading ? 
            React.createElement('div', {
              className: 'flex items-center'
            },
              React.createElement(window.LoadingSpinner || 'span', { 
                size: 20, 
                className: 'mr-2' 
              }),
              'Signing in...'
            ) : 
            'Sign In'
        )
      ),
      
      React.createElement('div', {
        className: 'mt-6 text-center text-sm text-gray-600'
      },
        'Default: username: admin, password: admin123'
      )
    )
  );
};

// Protected Route Component
window.ProtectedRoute = ({ children, requiredRoles = [], fallback = null }) => {
  const auth = window.useAuth ? window.useAuth() : null;
  
  if (!auth) {
    return fallback || React.createElement('div', {}, 'Loading...');
  }
  
  const { isAuthenticated, hasRole, loading } = auth;
  
  if (loading) {
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center'
    },
      React.createElement(window.LoadingSpinner || 'div', { size: 48 })
    );
  }
  
  if (!isAuthenticated) {
    if (window.Router) {
      React.useEffect(() => {
        window.Router.navigate('/login');
      }, []);
    }
    return null;
  }
  
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center'
    },
      React.createElement('div', {
        className: 'text-center'
      },
        React.createElement('h2', {
          className: 'text-2xl font-semibold text-gray-800 mb-2'
        }, 'Access Denied'),
        React.createElement('p', {
          className: 'text-gray-600'
        }, 'You do not have permission to view this page.')
      )
    );
  }
  
  return children;
};

// User Menu Component
window.UserMenu = ({ className = '' }) => {
  const auth = window.useAuth ? window.useAuth() : null;
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!auth || !auth.user) return null;
  
  const { user, logout } = auth;
  
  return React.createElement('div', {
    className: `relative ${className}`
  },
    React.createElement('button', {
      onClick: () => setIsOpen(!isOpen),
      className: 'flex items-center space-x-3 focus:outline-none'
    },
      React.createElement('div', {
        className: 'w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center'
      },
        React.createElement('span', {
          className: 'text-lg font-semibold text-gray-700'
        }, user.username ? user.username.charAt(0).toUpperCase() : 'U')
      ),
      React.createElement('div', {
        className: 'hidden md:block text-left'
      },
        React.createElement('p', {
          className: 'text-sm font-medium text-gray-700'
        }, user.username),
        React.createElement('p', {
          className: 'text-xs text-gray-500'
        }, user.role)
      )
    ),
    
    isOpen && React.createElement('div', {
      className: 'absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50'
    },
      React.createElement('button', {
        onClick: logout,
        className: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
      }, 'Sign out')
    )
  );
};
