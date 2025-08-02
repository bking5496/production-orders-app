// Dynamic Status Badge Component
// Provides configurable status styling and icons

import React from 'react';
import { Play, Square, CheckCircle, Clock, Pause, AlertTriangle, Settings, Wifi, WifiOff } from 'lucide-react';
import { useConfigArray, ConfigUtils } from '../core/dynamic-config.js';

export function DynamicStatusBadge({ 
  status, 
  type = 'order', // 'order' or 'machine'
  size = 'md',
  showIcon = true,
  customColors = null
}) {
  const { items: validStatuses } = useConfigArray(
    type === 'order' ? 'order_management.order_statuses' : 'machine_management.machine_statuses'
  );

  // Validate that the status is in our configuration
  if (!validStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Unknown Status
      </span>
    );
  }

  const colors = customColors || getStatusColors(status, type);
  const icon = showIcon ? getStatusIcon(status, type) : null;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border ? `border ${colors.border}` : ''}`}>
      {icon && (
        <span className={`${iconSizes[size]} mr-1`}>
          {React.cloneElement(icon, { className: iconSizes[size] })}
        </span>
      )}
      {formatStatusLabel(status)}
    </span>
  );
}

export function DynamicStatusIcon({ status, type = 'order', size = 'md', className = "" }) {
  const { items: validStatuses } = useConfigArray(
    type === 'order' ? 'order_management.order_statuses' : 'machine_management.machine_statuses'
  );

  if (!validStatuses.includes(status)) {
    return <AlertTriangle className={`${className} text-gray-400`} />;
  }

  const icon = getStatusIcon(status, type);
  const colors = getStatusColors(status, type);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return React.cloneElement(icon, { 
    className: `${sizeClasses[size]} ${colors.iconColor || colors.text} ${className}` 
  });
}

export function DynamicStatusFilter({ 
  value, 
  onChange, 
  type = 'order',
  includeAll = true,
  className = ""
}) {
  const { items: statuses } = useConfigArray(
    type === 'order' ? 'order_management.order_statuses' : 'machine_management.machine_statuses'
  );

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`${className} rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
    >
      {includeAll && <option value="all">All Statuses</option>}
      {statuses.map((status) => (
        <option key={status} value={status}>
          {formatStatusLabel(status)}
        </option>
      ))}
    </select>
  );
}

export function StatusTransitionButton({ 
  currentStatus, 
  targetStatus, 
  type = 'order',
  onClick,
  disabled = false,
  className = "",
  children
}) {
  const isValidTransition = ConfigUtils.isValidStatusTransition(currentStatus, targetStatus, type);
  
  if (!isValidTransition && !disabled) {
    return null; // Don't render button for invalid transitions
  }

  const colors = getStatusColors(targetStatus, type);
  const icon = getStatusIcon(targetStatus, type);

  return (
    <button
      onClick={onClick}
      disabled={disabled || !isValidTransition}
      className={`inline-flex items-center px-3 py-2 rounded-lg font-medium transition-colors
        ${isValidTransition && !disabled 
          ? `${colors.bg} ${colors.text} hover:opacity-80` 
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        } ${className}`}
    >
      {icon && React.cloneElement(icon, { className: 'w-4 h-4 mr-2' })}
      {children || formatStatusLabel(targetStatus)}
    </button>
  );
}

// Helper functions
function getStatusColors(status, type) {
  // Default color schemes - these could also be made configurable
  const orderColors = {
    pending: { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800', 
      border: 'border-yellow-300',
      iconColor: 'text-yellow-600'
    },
    in_progress: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      border: 'border-blue-300',
      iconColor: 'text-blue-600'
    },
    stopped: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-300',
      iconColor: 'text-red-600'
    },
    paused: { 
      bg: 'bg-orange-100', 
      text: 'text-orange-800', 
      border: 'border-orange-300',
      iconColor: 'text-orange-600'
    },
    completed: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      border: 'border-green-300',
      iconColor: 'text-green-600'
    },
    cancelled: { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-300',
      iconColor: 'text-gray-600'
    }
  };

  const machineColors = {
    available: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      border: 'border-green-300',
      iconColor: 'text-green-600'
    },
    in_use: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      border: 'border-blue-300',
      iconColor: 'text-blue-600'
    },
    maintenance: { 
      bg: 'bg-orange-100', 
      text: 'text-orange-800', 
      border: 'border-orange-300',
      iconColor: 'text-orange-600'
    },
    offline: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-300',
      iconColor: 'text-red-600'
    },
    paused: { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800', 
      border: 'border-yellow-300',
      iconColor: 'text-yellow-600'
    }
  };

  const colors = type === 'order' ? orderColors : machineColors;
  return colors[status] || { 
    bg: 'bg-gray-100', 
    text: 'text-gray-800', 
    border: 'border-gray-300',
    iconColor: 'text-gray-600'
  };
}

function getStatusIcon(status, type) {
  const orderIcons = {
    pending: <Clock />,
    in_progress: <Play />,
    stopped: <Square />,
    paused: <Pause />,
    completed: <CheckCircle />,
    cancelled: <AlertTriangle />
  };

  const machineIcons = {
    available: <CheckCircle />,
    in_use: <Play />,
    maintenance: <Settings />,
    offline: <WifiOff />,
    paused: <Pause />
  };

  const icons = type === 'order' ? orderIcons : machineIcons;
  return icons[status] || <AlertTriangle />;
}

function formatStatusLabel(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default DynamicStatusBadge;