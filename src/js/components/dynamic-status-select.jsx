// Dynamic Status Select Component
// Uses configurable status lists from the configuration system

import React from 'react';
import { useConfigArray } from '../core/dynamic-config.js';

export function DynamicStatusSelect({ 
  value, 
  onChange, 
  type = 'order', // 'order' or 'machine'
  includeAll = false,
  className = "",
  disabled = false
}) {
  const path = type === 'order' 
    ? 'order_management.order_statuses' 
    : 'machine_management.machine_statuses';
  
  const { items: statuses, loading } = useConfigArray(path);

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {includeAll && <option value="all">All Statuses</option>}
      {statuses.map((status) => (
        <option key={status} value={status}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </option>
      ))}
    </select>
  );
}

export function DynamicPrioritySelect({ 
  value, 
  onChange, 
  includeAll = false,
  className = "",
  disabled = false
}) {
  const { items: priorities, loading } = useConfigArray('order_management.order_priorities');

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {includeAll && <option value="all">All Priorities</option>}
      {priorities.map((priority) => (
        <option key={priority} value={priority}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </option>
      ))}
    </select>
  );
}

export function DynamicEnvironmentSelect({ 
  value, 
  onChange, 
  includeAll = false,
  className = "",
  disabled = false
}) {
  const { items: environments, loading } = useConfigArray('machine_management.environments');

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {includeAll && <option value="all">All Environments</option>}
      {environments.map((environment) => (
        <option key={environment} value={environment}>
          {environment.charAt(0).toUpperCase() + environment.slice(1)}
        </option>
      ))}
    </select>
  );
}

export function DynamicMachineTypeSelect({ 
  value, 
  onChange, 
  includeAll = false,
  className = "",
  disabled = false
}) {
  const { items: machineTypes, loading } = useConfigArray('machine_management.machine_types');

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {includeAll && <option value="all">All Types</option>}
      {machineTypes.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}

export function DynamicStopReasonSelect({ 
  value, 
  onChange, 
  className = "",
  disabled = false,
  groupByCategory = true
}) {
  const { items: stopReasons, loading } = useConfigArray('production_workflow.stop_reasons');

  if (loading) {
    return (
      <select disabled className={`${className} opacity-50`}>
        <option>Loading...</option>
      </select>
    );
  }

  if (groupByCategory) {
    // Group reasons by category
    const groupedReasons = stopReasons.reduce((groups, reason) => {
      const category = reason.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(reason);
      return groups;
    }, {});

    return (
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className={className}
        disabled={disabled}
      >
        <option value="">Select a reason...</option>
        {Object.entries(groupedReasons).map(([category, reasons]) => (
          <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
            {reasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      <option value="">Select a reason...</option>
      {stopReasons.map((reason) => (
        <option key={reason.value} value={reason.value}>
          {reason.label}
        </option>
      ))}
    </select>
  );
}