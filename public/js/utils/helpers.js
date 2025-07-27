// utils.js - Utility functions
// Save as: public/js/utils.js

window.APP_UTILS = {
  // Format date with timezone
  formatDate: (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-ZA', { 
      timeZone: APP_CONSTANTS.TIMEZONE,
      ...APP_CONSTANTS.DATE_FORMAT
    });
  },

  // Get status color class
  getStatusColor: (status) => {
    return APP_CONSTANTS.STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  },

  // Get priority color class
  getPriorityColor: (priority) => {
    return APP_CONSTANTS.PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600';
  },

  // Get machine status color
  getMachineStatusColor: (status) => {
    return APP_CONSTANTS.MACHINE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  },

  // Calculate efficiency percentage
  calculateEfficiency: (actual, target) => {
    if (!target || target === 0) return 0;
    return Math.round((actual / target) * 100);
  },

  // Format large numbers
  formatNumber: (num) => {
    return new Intl.NumberFormat('en-ZA').format(num);
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Check if user has role
  hasRole: (user, roles) => {
    if (!user || !user.role) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  },

  // Validate form data
  validateFormData: (data, rules) => {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
      const value = data[field];
      const fieldRules = rules[field];
      
      // Required
      if (fieldRules.required && !value) {
        errors[field] = `${fieldRules.label || field} is required`;
        return;
      }
      
      // Min length
      if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
        errors[field] = `${fieldRules.label || field} must be at least ${fieldRules.minLength} characters`;
      }
      
      // Min value
      if (fieldRules.min !== undefined && value < fieldRules.min) {
        errors[field] = `${fieldRules.label || field} must be at least ${fieldRules.min}`;
      }
      
      // Email
      if (fieldRules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = `${fieldRules.label || field} must be a valid email`;
      }
    });
    
    return errors;
  },

  // Group array by key
  groupBy: (array, key) => {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  },

  // Sort array by multiple keys
  sortBy: (array, ...keys) => {
    return [...array].sort((a, b) => {
      for (const key of keys) {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  },

  // Create Lucide icon component
  createIcon: (iconName) => {
    return (props) => {
      React.useEffect(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, []);
      
      return React.createElement('i', {
        ...props,
        'data-lucide': iconName,
        dangerouslySetInnerHTML: { __html: '' }
      });
    };
  }
};

// Create all icon components
window.ICONS = {
  Play: APP_UTILS.createIcon('play'),
  Pause: APP_UTILS.createIcon('pause'),
  CheckCircle: APP_UTILS.createIcon('check-circle'),
  XCircle: APP_UTILS.createIcon('x-circle'),
  Clock: APP_UTILS.createIcon('clock'),
  TrendingUp: APP_UTILS.createIcon('trending-up'),
  LogOut: APP_UTILS.createIcon('log-out'),
  Loader: APP_UTILS.createIcon('loader'),
  Bell: APP_UTILS.createIcon('bell'),
  BarChart3: APP_UTILS.createIcon('bar-chart-3'),
  Activity: APP_UTILS.createIcon('activity'),
  Plus: APP_UTILS.createIcon('plus'),
  Download: APP_UTILS.createIcon('download'),
  Settings: APP_UTILS.createIcon('settings'),
  Edit: APP_UTILS.createIcon('edit'),
  Trash2: APP_UTILS.createIcon('trash-2'),
  Save: APP_UTILS.createIcon('save'),
  X: APP_UTILS.createIcon('x'),
  AlertCircle: APP_UTILS.createIcon('alert-circle'),
  Info: APP_UTILS.createIcon('info'),
  Upload: APP_UTILS.createIcon('upload'),
  Filter: APP_UTILS.createIcon('filter'),
  Search: APP_UTILS.createIcon('search'),
  ChevronDown: APP_UTILS.createIcon('chevron-down'),
  ChevronUp: APP_UTILS.createIcon('chevron-up'),
  Package: APP_UTILS.createIcon('package'),
  Wrench: APP_UTILS.createIcon('wrench')
};
