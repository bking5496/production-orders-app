// js/config/app-config.js - Enhanced Application Configuration
// Central configuration for the entire application

window.APP_CONFIG = {
  // Application Info
  APP_NAME: 'Production Management System',
  APP_VERSION: '2.0.0',
  COMPANY_NAME: 'Oracles Africa',
  COMPANY_EMAIL: 'admin@oracles.africa',
  
  // Environment Detection
  ENV: window.location.hostname === 'localhost' ? 'development' : 'production',
  DEBUG: window.location.hostname === 'localhost',
  
  // API Configuration
  API_BASE: '/api',
  API_TIMEOUT: 30000, // 30 seconds
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000, // 1 second
  
  // WebSocket Configuration
  WS_URL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`,
  WS_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_DELAY: 1000,
  WS_PING_INTERVAL: 30000, // 30 seconds
  
  // Authentication
  TOKEN_KEY: 'pms_token',
  USER_KEY: 'pms_user',
  SESSION_TIMEOUT: 600000, // 10 minutes
  SESSION_WARNING_TIME: 300000, // 5 minutes
  REMEMBER_ME_DURATION: 604800000, // 7 days
  
  // Environments Configuration
  ENVIRONMENTS: {
    BLENDING: 'blending',
    PACKAGING: 'packaging'
  },
  DEFAULT_ENVIRONMENTS: ['blending', 'packaging'],
  
  // Order Configuration
  ORDER_STATUSES: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    STOPPED: 'stopped',
    COMPLETED: 'completed'
  },
  
  ORDER_STATUS_FLOW: {
    pending: ['in_progress'],
    in_progress: ['stopped', 'completed'],
    stopped: ['in_progress', 'completed'],
    completed: []
  },
  
  // Priority Configuration
  PRIORITY_LEVELS: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  },
  
  PRIORITY_WEIGHTS: {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4
  },
  
  // Machine Configuration
  MACHINE_STATUSES: {
    AVAILABLE: 'available',
    IN_USE: 'in_use',
    MAINTENANCE: 'maintenance',
    OFFLINE: 'offline',
    PAUSED: 'paused'
  },
  
  MACHINE_STATUS_TRANSITIONS: {
    available: ['in_use', 'maintenance', 'offline'],
    in_use: ['paused', 'available', 'offline'],
    paused: ['in_use', 'available'],
    maintenance: ['available', 'offline'],
    offline: ['available', 'maintenance']
  },
  
  // User Roles and Permissions
  USER_ROLES: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    OPERATOR: 'operator'
  },
  
  ROLE_PERMISSIONS: {
    admin: [
      'createOrder', 'updateOrder', 'deleteOrder', 'viewOrders',
      'startProduction', 'stopProduction', 'completeOrder',
      'manageMachines', 'viewMachines',
      'manageUsers', 'viewUsers',
      'viewAnalytics', 'exportData',
      'manageSettings'
    ],
    supervisor: [
      'createOrder', 'updateOrder', 'deleteOrder', 'viewOrders',
      'startProduction', 'stopProduction', 'completeOrder',
      'viewMachines',
      'viewAnalytics', 'exportData'
    ],
    operator: [
      'viewOrders',
      'startProduction', 'stopProduction', 'completeOrder',
      'viewMachines'
    ]
  },
  
  // Stop Reasons Configuration
  STOP_REASONS: [
    { value: 'equipment_breakdown', label: 'Equipment Breakdown', category: 'mechanical' },
    { value: 'material_shortage', label: 'Material Shortage', category: 'supply' },
    { value: 'maintenance', label: 'Planned Maintenance', category: 'mechanical' },
    { value: 'quality_issue', label: 'Quality Issue', category: 'quality' },
    { value: 'safety_concern', label: 'Safety Concern', category: 'safety' },
    { value: 'operator_break', label: 'Operator Break', category: 'operational' },
    { value: 'power_outage', label: 'Power Outage', category: 'infrastructure' },
    { value: 'shift_change', label: 'Shift Change', category: 'operational' },
    { value: 'other', label: 'Other', category: 'other' }
  ],
  
  STOP_CATEGORIES: {
    mechanical: { label: 'Mechanical', color: 'red' },
    supply: { label: 'Supply Chain', color: 'orange' },
    quality: { label: 'Quality', color: 'yellow' },
    safety: { label: 'Safety', color: 'red' },
    operational: { label: 'Operational', color: 'blue' },
    infrastructure: { label: 'Infrastructure', color: 'purple' },
    other: { label: 'Other', color: 'gray' }
  },
  
  // Waste Configuration
  WASTE_TYPES: [
    'Raw Material',
    'Packaging Material',
    'Finished Product',
    'Energy',
    'Water',
    'Other'
  ],
  
  WASTE_UNITS: [
    { value: 'kg', label: 'Kilograms', type: 'weight' },
    { value: 'g', label: 'Grams', type: 'weight' },
    { value: 'tons', label: 'Tons', type: 'weight' },
    { value: 'units', label: 'Units', type: 'count' },
    { value: 'liters', label: 'Liters', type: 'volume' },
    { value: 'ml', label: 'Milliliters', type: 'volume' },
    { value: 'meters', label: 'Meters', type: 'length' },
    { value: 'kwh', label: 'kWh', type: 'energy' }
  ],
  
  // UI Configuration
  THEME: {
    PRIMARY_COLOR: 'blue',
    SECONDARY_COLOR: 'gray',
    SUCCESS_COLOR: 'green',
    WARNING_COLOR: 'yellow',
    ERROR_COLOR: 'red',
    INFO_COLOR: 'blue'
  },
  
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  DEFAULT_PAGE_SIZE: 25,
  
  TOAST_DURATION: 5000, // 5 seconds
  TOAST_POSITION: 'top-right',
  
  MODAL_SIZES: {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  },
  
  // Date/Time Configuration
  TIMEZONE: 'Africa/Johannesburg',
  DATE_FORMAT: {
    dateStyle: 'short',
    timeStyle: 'short'
  },
  DATE_FORMAT_LONG: {
    dateStyle: 'long',
    timeStyle: 'medium'
  },
  LOCALE: 'en-ZA',
  
  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
    ALLOWED_EXTENSIONS: ['xlsx', 'xls', 'csv', 'pdf', 'png', 'jpg', 'jpeg'],
    ALLOWED_MIME_TYPES: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'image/png',
      'image/jpeg'
    ],
    IMAGE_MAX_WIDTH: 2000,
    IMAGE_MAX_HEIGHT: 2000,
    IMAGE_QUALITY: 0.9
  },
  
  // Export Configuration
  EXPORT_FORMATS: ['json', 'csv', 'excel', 'pdf'],
  EXPORT_BATCH_SIZE: 1000,
  
  // Cache Configuration
  CACHE_TTL: {
    SHORT: 300000, // 5 minutes
    MEDIUM: 1800000, // 30 minutes
    LONG: 3600000, // 1 hour
    VERY_LONG: 86400000 // 24 hours
  },
  
  // Refresh Intervals (milliseconds)
  REFRESH_INTERVALS: {
    ORDERS: 30000, // 30 seconds
    MACHINES: 60000, // 1 minute
    ANALYTICS: 300000, // 5 minutes
    NOTIFICATIONS: 60000, // 1 minute
  },
  
  // Analytics Configuration
  ANALYTICS: {
    CHART_COLORS: [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316'  // orange
    ],
    DEFAULT_DATE_RANGE: 30, // days
    MAX_CHART_POINTS: 100,
    EFFICIENCY_TARGETS: {
      EXCELLENT: 95,
      GOOD: 85,
      AVERAGE: 75,
      POOR: 65
    }
  },
  
  // Validation Rules
  VALIDATION: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 128,
    ORDER_NUMBER_PATTERN: /^[A-Z0-9-]+$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[\d\s\-\+\(\)]+$/
  },
  
  // Business Rules
  BUSINESS_RULES: {
    MIN_ORDER_QUANTITY: 1,
    MAX_ORDER_QUANTITY: 999999,
    ORDER_NUMBER_PREFIX: 'ORD',
    AUTO_LOGOUT_AFTER_INACTIVITY: true,
    REQUIRE_STOP_REASON: true,
    REQUIRE_WASTE_TRACKING: true,
    ALLOW_NEGATIVE_EFFICIENCY: false,
    MAX_CONCURRENT_ORDERS_PER_MACHINE: 1
  },
  
  // Feature Flags
  FEATURES: {
    REAL_TIME_UPDATES: true,
    OFFLINE_MODE: true,
    EXPORT_FUNCTIONALITY: true,
    ADVANCED_ANALYTICS: true,
    MACHINE_MAINTENANCE_TRACKING: true,
    QUALITY_CONTROL: false, // Coming soon
    INVENTORY_MANAGEMENT: false, // Coming soon
    PREDICTIVE_MAINTENANCE: false // Coming soon
  },
  
  // External Services
  EXTERNAL_SERVICES: {
    ANALYTICS_ENABLED: false,
    ANALYTICS_ID: '',
    ERROR_TRACKING_ENABLED: false,
    ERROR_TRACKING_DSN: '',
    SUPPORT_EMAIL: 'support@oracles.africa',
    DOCUMENTATION_URL: 'https://docs.oracles.africa/pms'
  },
  
  // Status Colors Mapping
  STATUS_COLORS: {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      dot: 'bg-yellow-400'
    },
    in_progress: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-400'
    },
    stopped: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-400'
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      dot: 'bg-green-400'
    }
  },
  
  PRIORITY_COLORS: {
    low: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-300'
    },
    normal: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-300'
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-600',
      border: 'border-orange-300'
    },
    urgent: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      border: 'border-red-300'
    }
  },
  
  MACHINE_STATUS_COLORS: {
    available: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-400'
    },
    in_use: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-400'
    },
    paused: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-400'
    },
    maintenance: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      dot: 'bg-orange-400'
    },
    offline: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-400'
    }
  }
};

// Freeze configuration in production
if (window.APP_CONFIG.ENV === 'production') {
  Object.freeze(window.APP_CONFIG);
  Object.freeze(window.APP_CONFIG.ORDER_STATUSES);
  Object.freeze(window.APP_CONFIG.PRIORITY_LEVELS);
  Object.freeze(window.APP_CONFIG.MACHINE_STATUSES);
  Object.freeze(window.APP_CONFIG.USER_ROLES);
  Object.freeze(window.APP_CONFIG.ROLE_PERMISSIONS);
  Object.freeze(window.APP_CONFIG.FEATURES);
}
