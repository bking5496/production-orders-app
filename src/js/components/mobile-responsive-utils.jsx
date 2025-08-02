// mobile-responsive-utils.jsx - Mobile-specific utilities and components for manufacturing use
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Menu, X, ArrowLeft, MoreHorizontal } from 'lucide-react';

// Hook for detecting mobile device and screen size
export const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768); // Mobile: < 768px
      setIsTablet(width >= 768 && width < 1024); // Tablet: 768px - 1024px
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, screenSize, isDesktop: !isMobile && !isTablet };
};

// Hook for touch gestures (swipe, long press, etc.)
export const useTouchGestures = (element, options = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    longPressDelay = 500,
    swipeThreshold = 50
  } = options;

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (!element) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      // Start long press timer
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          onLongPress(e);
        }, longPressDelay);
      }
    };

    const handleTouchMove = () => {
      // Cancel long press if user moves finger
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const handleTouchEnd = (e) => {
      // Cancel long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;

      // Only consider swipes if they're fast enough and far enough
      if (deltaTime < 500 && (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold)) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) onSwipeRight(e);
          else if (deltaX < 0 && onSwipeLeft) onSwipeLeft(e);
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) onSwipeDown(e);
          else if (deltaY < 0 && onSwipeUp) onSwipeUp(e);
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [element, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onLongPress, longPressDelay, swipeThreshold]);
};

// Mobile-optimized table component that switches to cards on small screens
export const ResponsiveTable = ({ 
  data = [], 
  columns = [], 
  renderMobileCard,
  className = "",
  emptyMessage = "No data available"
}) => {
  const { isMobile } = useDeviceDetection();

  if (isMobile) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          data.map((item, index) => (
            <div key={item.id || index} className="bg-white rounded-lg shadow-sm border p-4">
              {renderMobileCard ? renderMobileCard(item, index) : (
                <div className="space-y-2">
                  {columns.map(col => (
                    <div key={col.key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">{col.label}:</span>
                      <span className="text-sm text-gray-900">{item[col.key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Mobile-optimized dropdown with touch-friendly interface
export const TouchDropdown = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select option",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
          transition-colors duration-200
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150
                ${value === option.value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Mobile-optimized action menu for table rows
export const MobileActionMenu = ({ 
  actions = [], 
  onActionSelect,
  triggerIcon = MoreHorizontal,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TriggerIcon = triggerIcon;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <TriggerIcon className="w-5 h-5 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onActionSelect(action);
                setIsOpen(false);
              }}
              disabled={action.disabled}
              className={`
                w-full px-4 py-3 text-left text-sm transition-colors duration-150
                ${action.disabled 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
                ${action.danger ? 'hover:bg-red-50 hover:text-red-700' : ''}
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === actions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'}
              `}
            >
              <div className="flex items-center gap-3">
                {action.icon && <action.icon className="w-4 h-4" />}
                {action.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Mobile navigation component with hamburger menu
export const MobileNavigation = ({ 
  isOpen, 
  onToggle, 
  navigationItems = [],
  currentPath = "",
  onNavigate,
  className = ""
}) => {
  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 
          hover:bg-gray-100 transition-colors duration-200 ${className}
        `}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onToggle} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4">
              <ul className="space-y-2">
                {navigationItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => {
                        onNavigate(item.path);
                        onToggle();
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                        transition-colors duration-200
                        ${currentPath === item.path 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      {item.icon && <item.icon className="w-5 h-5" />}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

// Touch-optimized button with larger hit targets for manufacturing use
export const TouchButton = ({ 
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = "",
  ...props
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[44px]', // Minimum 44px touch target
    md: 'px-6 py-3 text-base min-h-[48px]', // Minimum 48px touch target
    lg: 'px-8 py-4 text-lg min-h-[52px]'   // Minimum 52px touch target
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <icon className="w-5 h-5" />
      )}
      {children}
    </button>
  );
};

// Performance optimization hook for mobile devices
export const usePerformanceOptimization = () => {
  const [isLowPower, setIsLowPower] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Check if device is in power saving mode or has limited resources
    const checkPerformance = () => {
      // Check memory (if available)
      if ('memory' in navigator) {
        const memory = navigator.memory;
        if (memory.totalJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          setIsLowPower(true);
        }
      }

      // Check connection type
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setConnectionType(connection.effectiveType || 'unknown');
        
        // Consider slow connections as low power scenarios
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setIsLowPower(true);
        }
      }

      // Check if user prefers reduced motion (accessibility + performance)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setIsLowPower(true);
      }
    };

    checkPerformance();

    // Listen for connection changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', checkPerformance);
      return () => navigator.connection.removeEventListener('change', checkPerformance);
    }
  }, []);

  return {
    isLowPower,
    connectionType,
    shouldReduceAnimations: isLowPower,
    shouldLazyLoad: connectionType === 'slow-2g' || connectionType === '2g'
  };
};

// Mobile-optimized tab navigation component
export const TabNavigation = ({ activeTab, onTabChange, tabs = [], variant = "default" }) => {
  const { isMobile } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  
  const baseClasses = variant === "white" 
    ? "bg-white/10 backdrop-blur-sm" 
    : "bg-white shadow-sm border border-gray-100";
    
  const activeTabClasses = variant === "white"
    ? "bg-white text-blue-600 shadow-sm"
    : "bg-blue-500 text-white shadow-sm";
    
  const inactiveTabClasses = variant === "white"
    ? "text-white/90 hover:bg-white/20"
    : "text-gray-600 hover:bg-gray-50";

  return (
    <div className={`flex gap-0 ${baseClasses} rounded-xl p-1`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <TouchButton
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            variant="ghost"
            size={isMobile ? "sm" : "md"}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ${
              isActive ? activeTabClasses : inactiveTabClasses
            } ${!shouldReduceAnimations ? 'hover:scale-[1.02]' : ''}`}
          >
            <Icon className="w-4 h-4" />
            <span className={isMobile ? "text-sm" : "text-base"}>{tab.label}</span>
          </TouchButton>
        );
      })}
    </div>
  );
};


// Optimized image component for mobile
export const OptimizedImage = ({ 
  src, 
  alt, 
  className = "",
  lazy = true,
  fallback = null 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { shouldLazyLoad } = usePerformanceOptimization();

  return (
    <div className={`relative ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      {error && fallback ? (
        fallback
      ) : (
        <img
          src={src}
          alt={alt}
          loading={lazy && shouldLazyLoad ? "lazy" : "eager"}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

// Mobile-optimized modal component
export const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  const { isMobile } = useDeviceDetection();
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    small: isMobile ? 'w-full h-full' : 'w-96 max-h-[80vh]',
    medium: isMobile ? 'w-full h-full' : 'w-[500px] max-h-[80vh]',
    large: isMobile ? 'w-full h-full' : 'w-[800px] max-h-[80vh]',
    full: 'w-full h-full'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white rounded-lg shadow-xl
        ${sizes[size]}
        ${isMobile ? 'rounded-none' : 'rounded-lg'}
        flex flex-col overflow-hidden
      `}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};