import React, { Component } from 'react';
import { Icon } from './layout-components.jsx';

class ManufacturingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  getErrorMessage = (error) => {
    const errorMap = {
      'NETWORK_ERROR': {
        title: 'Connection Problem',
        message: 'Check your network connection and try again.',
        actions: ['retry', 'work_offline'],
        severity: 'warning'
      },
      'MACHINE_OFFLINE': {
        title: 'Machine Communication Lost',
        message: 'Unable to communicate with selected machine.',
        actions: ['check_machine', 'contact_maintenance'],
        severity: 'critical'
      },
      'DATA_SYNC_FAILED': {
        title: 'Data Sync Failed',
        message: 'Your changes may not be saved. Try again.',
        actions: ['retry', 'save_locally'],
        severity: 'warning'
      },
      'SESSION_EXPIRED': {
        title: 'Session Expired',
        message: 'Please log in again to continue.',
        actions: ['login'],
        severity: 'warning'
      }
    };
    
    // Try to match error message to known patterns
    const errorCode = error?.code || 
      (error?.message?.includes('fetch') ? 'NETWORK_ERROR' : 
       error?.message?.includes('session') ? 'SESSION_EXPIRED' : 'UNKNOWN');
    
    return errorMap[errorCode] || {
      title: 'System Error',
      message: 'An unexpected error occurred. Please try refreshing the page.',
      actions: ['retry', 'contact_support'],
      severity: 'critical'
    };
  };

  handleErrorAction = (action) => {
    switch(action) {
      case 'retry':
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
        break;
      case 'work_offline':
        // Implement offline mode logic
        this.setState({ hasError: false, error: null, errorInfo: null });
        break;
      case 'check_machine':
        // Navigate to machine status page
        window.history.pushState({}, '', '/machines');
        this.setState({ hasError: false, error: null, errorInfo: null });
        break;
      case 'contact_maintenance':
        // Could integrate with maintenance system
        alert('Please contact maintenance team at ext. 1234');
        break;
      case 'save_locally':
        // Implement local storage save
        console.log('Attempting to save data locally...');
        break;
      case 'contact_support':
        alert('Please contact IT support at ext. 5678');
        break;
      case 'login':
        // Clear auth and redirect to login
        localStorage.removeItem('token');
        window.location.reload();
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  render() {
    if (this.state.hasError) {
      const errorInfo = this.getErrorMessage(this.state.error);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className={`p-6 rounded-lg border-l-4 ${
              errorInfo.severity === 'critical' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex items-start">
                <Icon 
                  icon="x" 
                  size={24} 
                  className={`mr-3 mt-1 ${
                    errorInfo.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                  }`} 
                />
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${
                    errorInfo.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {errorInfo.title}
                  </h3>
                  <p className={`mt-2 ${
                    errorInfo.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {errorInfo.message}
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {errorInfo.actions.map(action => (
                      <button
                        key={action}
                        className={`flex-1 px-4 py-3 rounded text-sm font-medium min-h-[44px] touch-manipulation ${
                          errorInfo.severity === 'critical' 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                        onClick={() => this.handleErrorAction(action)}
                      >
                        {action.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                  
                  {/* Technical details (collapsed by default) */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                      {this.state.error && this.state.error.toString()}
                      <br />
                      {this.state.errorInfo.componentStack}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error, errorInfo = {}) => {
    console.error('Error handled by useErrorHandler:', error, errorInfo);
    setError({ error, errorInfo });
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

// Toast notification component for non-critical errors
export const ErrorToast = ({ error, onClose }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!error || !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon icon="x" size={20} className="text-red-400" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">
              {error.title || 'Error'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {error.message || 'Something went wrong'}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
            >
              <span className="sr-only">Close</span>
              <Icon icon="x" size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingErrorBoundary;