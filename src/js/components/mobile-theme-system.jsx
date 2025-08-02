/**
 * Mobile Theme System for Manufacturing Environment
 * High-contrast colors optimized for industrial lighting conditions
 * Supports both standard and enhanced contrast modes
 */
import React, { useState, useEffect, createContext, useContext } from 'react';

// Color System - Industrial Grade Contrast
export const MobileTheme = {
  // High-contrast base colors (4.5:1 minimum ratio)
  colors: {
    // Status Colors - Enhanced contrast for manufacturing
    success: {
      primary: '#065f46', // Dark green for high contrast
      secondary: '#10b981',
      background: '#ecfdf5',
      text: '#064e3b'
    },
    danger: {
      primary: '#dc2626', // High contrast red
      secondary: '#ef4444',
      background: '#fef2f2',
      text: '#991b1b'
    },
    warning: {
      primary: '#d97706', // Amber for visibility
      secondary: '#f59e0b',
      background: '#fffbeb',
      text: '#92400e'
    },
    info: {
      primary: '#1d4ed8', // Deep blue
      secondary: '#3b82f6',
      background: '#eff6ff',
      text: '#1e40af'
    },
    
    // Neutral Colors - High contrast grayscale
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b'
    },
    
    // Production Status Colors
    production: {
      running: '#059669', // Green - clearly visible
      stopped: '#dc2626', // Red - high attention
      paused: '#d97706', // Orange - caution
      completed: '#7c3aed', // Purple - distinct from running
      pending: '#6b7280' // Gray - neutral
    }
  },
  
  // Typography Scale - Mobile-optimized
  typography: {
    // Minimum sizes for manufacturing environment
    sizes: {
      xs: '0.75rem',    // 12px - minimum readable
      sm: '0.875rem',   // 14px - secondary text
      base: '1rem',     // 16px - body text
      lg: '1.125rem',   // 18px - emphasis
      xl: '1.25rem',    // 20px - headings
      '2xl': '1.5rem',  // 24px - large headings
      '3xl': '1.875rem', // 30px - display text
      '4xl': '2.25rem', // 36px - metrics/numbers
      '5xl': '3rem',    // 48px - large metrics
      '6xl': '3.75rem'  // 60px - primary metrics
    },
    
    // Font weights for clarity
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    }
  },
  
  // Spacing System - Touch-friendly
  spacing: {
    // Minimum touch targets
    touch: {
      minimum: '44px',  // WCAG minimum
      comfortable: '48px', // Recommended
      primary: '56px'   // For critical actions
    },
    
    // Layout spacing
    layout: {
      xs: '0.25rem',  // 4px
      sm: '0.5rem',   // 8px
      md: '1rem',     // 16px
      lg: '1.5rem',   // 24px
      xl: '2rem',     // 32px
      '2xl': '3rem'   // 48px
    }
  },
  
  // Shadow System - Enhanced visibility
  shadows: {
    // High-contrast shadows for industrial lighting
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
  }
};

// CSS-in-JS Theme Provider Component
export const MobileThemeProvider = ({ children, contrastMode = 'standard' }) => {
  const cssVariables = {
    // Color variables
    '--color-success-primary': MobileTheme.colors.success.primary,
    '--color-success-bg': MobileTheme.colors.success.background,
    '--color-danger-primary': MobileTheme.colors.danger.primary,
    '--color-danger-bg': MobileTheme.colors.danger.background,
    '--color-warning-primary': MobileTheme.colors.warning.primary,
    '--color-warning-bg': MobileTheme.colors.warning.background,
    '--color-info-primary': MobileTheme.colors.info.primary,
    '--color-info-bg': MobileTheme.colors.info.background,
    
    // Production status colors
    '--color-running': MobileTheme.colors.production.running,
    '--color-stopped': MobileTheme.colors.production.stopped,
    '--color-paused': MobileTheme.colors.production.paused,
    '--color-completed': MobileTheme.colors.production.completed,
    '--color-pending': MobileTheme.colors.production.pending,
    
    // Touch target sizes
    '--touch-minimum': MobileTheme.spacing.touch.minimum,
    '--touch-comfortable': MobileTheme.spacing.touch.comfortable,
    '--touch-primary': MobileTheme.spacing.touch.primary,
    
    // Typography
    '--font-size-metrics': MobileTheme.typography.sizes['6xl'],
    '--font-size-display': MobileTheme.typography.sizes['3xl'],
    '--font-size-heading': MobileTheme.typography.sizes.xl,
    '--font-size-body': MobileTheme.typography.sizes.base,
    '--font-size-caption': MobileTheme.typography.sizes.sm
  };

  return (
    <div 
      className={`mobile-theme-provider ${contrastMode}`}
      style={cssVariables}
    >
      {children}
    </div>
  );
};

// High-Contrast Component Variants
export const HighContrastComponents = {
  
  // Enhanced Button for Manufacturing
  IndustrialButton: ({ 
    children, 
    variant = 'primary', 
    size = 'comfortable',
    loading = false,
    disabled = false,
    onClick,
    className = '',
    ...props 
  }) => {
    const variants = {
      primary: `
        bg-blue-700 text-white border-2 border-blue-800
        hover:bg-blue-800 active:bg-blue-900
        focus:ring-4 focus:ring-blue-300
        shadow-lg hover:shadow-xl
      `,
      success: `
        bg-green-700 text-white border-2 border-green-800
        hover:bg-green-800 active:bg-green-900
        focus:ring-4 focus:ring-green-300
        shadow-lg hover:shadow-xl
      `,
      danger: `
        bg-red-700 text-white border-2 border-red-800
        hover:bg-red-800 active:bg-red-900
        focus:ring-4 focus:ring-red-300
        shadow-lg hover:shadow-xl
      `,
      warning: `
        bg-orange-600 text-white border-2 border-orange-700
        hover:bg-orange-700 active:bg-orange-800
        focus:ring-4 focus:ring-orange-300
        shadow-lg hover:shadow-xl
      `,
      outline: `
        bg-white text-gray-900 border-3 border-gray-400
        hover:bg-gray-50 active:bg-gray-100
        focus:ring-4 focus:ring-gray-300
        shadow-lg hover:shadow-xl
      `
    };
    
    const sizes = {
      minimum: 'h-11 px-4 text-sm font-semibold', // 44px
      comfortable: 'h-12 px-6 text-base font-semibold', // 48px
      primary: 'h-14 px-8 text-lg font-bold' // 56px
    };
    
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          w-full flex items-center justify-center rounded-lg
          transition-all duration-200 active:scale-95
          focus:outline-none
          ${variants[variant]}
          ${sizes[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
  
  // High-Contrast Status Badge
  StatusBadge: ({ status, size = 'medium', showIcon = true }) => {
    const statusConfig = {
      running: {
        color: 'bg-green-700 text-white border-green-800',
        icon: '●',
        label: 'RUNNING'
      },
      stopped: {
        color: 'bg-red-700 text-white border-red-800',
        icon: '■',
        label: 'STOPPED'
      },
      paused: {
        color: 'bg-orange-600 text-white border-orange-700',
        icon: '⏸',
        label: 'PAUSED'
      },
      completed: {
        color: 'bg-purple-700 text-white border-purple-800',
        icon: '✓',
        label: 'COMPLETED'
      },
      pending: {
        color: 'bg-gray-600 text-white border-gray-700',
        icon: '⏳',
        label: 'PENDING'
      }
    };
    
    const sizes = {
      small: 'px-2 py-1 text-xs font-bold',
      medium: 'px-3 py-1.5 text-sm font-bold',
      large: 'px-4 py-2 text-base font-bold'
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`
        inline-flex items-center rounded-full border-2
        ${config.color}
        ${sizes[size]}
        shadow-lg
      `}>
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {config.label}
      </span>
    );
  },
  
  // High-Contrast Progress Ring
  ProgressRing: ({ value, max, size = 120, strokeWidth = 8, showLabel = true }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    const getProgressColor = (percent) => {
      if (percent >= 90) return '#059669'; // Green
      if (percent >= 75) return '#0ea5e9'; // Blue
      if (percent >= 50) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
    };
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getProgressColor(percentage)}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Center label */}
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-gray-600 -mt-1">
                Complete
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  
  // High-Contrast Alert Component
  IndustrialAlert: ({ type = 'info', title, message, onClose, actions = [] }) => {
    const variants = {
      success: 'bg-green-50 border-green-700 text-green-900',
      danger: 'bg-red-50 border-red-700 text-red-900',
      warning: 'bg-orange-50 border-orange-600 text-orange-900',
      info: 'bg-blue-50 border-blue-700 text-blue-900'
    };
    
    const icons = {
      success: '✓',
      danger: '⚠',
      warning: '!',
      info: 'i'
    };
    
    return (
      <div className={`
        border-l-4 p-4 rounded-lg shadow-lg
        ${variants[type]}
      `}>
        <div className="flex items-start gap-3">
          <div className="text-2xl font-bold">
            {icons[type]}
          </div>
          
          <div className="flex-1">
            {title && (
              <h4 className="text-lg font-bold mb-1">{title}</h4>
            )}
            <p className="text-base">{message}</p>
            
            {actions.length > 0 && (
              <div className="flex gap-3 mt-4">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      px-4 py-2 text-sm font-semibold rounded-lg
                      border-2 transition-colors
                      ${action.variant === 'primary' 
                        ? 'bg-current text-white border-current' 
                        : 'bg-transparent border-current hover:bg-current hover:text-white'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-2xl font-bold hover:opacity-75 p-1"
              aria-label="Close alert"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }
};

// Industrial Environment Styles (CSS)
export const IndustrialCSS = `
  /* High-contrast mobile theme for manufacturing */
  .mobile-theme-provider {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Enhanced contrast mode */
  .mobile-theme-provider.enhanced {
    --color-success-primary: #047857;
    --color-danger-primary: #b91c1c;
    --color-warning-primary: #b45309;
    --color-info-primary: #1e40af;
  }
  
  /* Focus styles for accessibility */
  .mobile-theme-provider *:focus {
    outline: 3px solid #3b82f6;
    outline-offset: 2px;
  }
  
  /* High-contrast text */
  .high-contrast-text {
    color: #1f2937;
    font-weight: 600;
    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
  }
  
  /* Industrial button styles */
  .industrial-button {
    text-transform: uppercase;
    letter-spacing: 0.025em;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  }
  
  .industrial-button:active {
    transform: translateY(1px);
  }
  
  /* Status indicators */
  .status-running {
    background-color: var(--color-running);
    color: white;
    animation: pulse-success 2s infinite;
  }
  
  .status-stopped {
    background-color: var(--color-stopped);
    color: white;
    animation: pulse-danger 2s infinite;
  }
  
  @keyframes pulse-success {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  @keyframes pulse-danger {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  /* Mobile-specific improvements */
  @media (max-width: 768px) {
    .mobile-theme-provider {
      font-size: 16px; /* Prevent zoom on iOS */
    }
    
    /* Larger touch targets on mobile */
    .touch-target {
      min-height: var(--touch-comfortable);
      min-width: var(--touch-comfortable);
    }
    
    /* Enhanced contrast for outdoor/bright conditions */
    .outdoor-mode {
      filter: contrast(1.2) brightness(1.1);
    }
  }
  
  /* Print styles for work orders */
  @media print {
    .mobile-theme-provider {
      background: white !important;
      color: black !important;
    }
    
    .no-print {
      display: none !important;
    }
  }
`;

// High Contrast Theme Hook
export const useHighContrastTheme = () => {
  const [contrastMode, setContrastMode] = useState('standard');
  
  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('mobile_contrast_mode');
    if (saved && ['standard', 'enhanced'].includes(saved)) {
      setContrastMode(saved);
    }
  }, []);

  const toggleContrast = () => {
    const newMode = contrastMode === 'standard' ? 'enhanced' : 'standard';
    setContrastMode(newMode);
    localStorage.setItem('mobile_contrast_mode', newMode);
  };

  const setEnhanced = () => {
    setContrastMode('enhanced');
    localStorage.setItem('mobile_contrast_mode', 'enhanced');
  };

  const setStandard = () => {
    setContrastMode('standard');
    localStorage.setItem('mobile_contrast_mode', 'standard');
  };

  return {
    contrastMode,
    isEnhanced: contrastMode === 'enhanced',
    toggleContrast,
    setEnhanced,
    setStandard
  };
};

export default MobileTheme;