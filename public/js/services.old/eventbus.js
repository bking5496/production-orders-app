// js/services/eventbus.js - Event Bus for Component Communication
// Central event system for decoupled component communication

class EventBus {
  constructor() {
    this.events = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.debug = window.APP_CONFIG?.DEBUG || false;
    this.wildcardChar = '*';
    this.namespaceDelimiter = ':';
    this.middlewares = [];
  }

  // Subscribe to an event
  on(event, callback, options = {}) {
    if (!event || typeof callback !== 'function') {
      throw new Error('Event name and callback function are required');
    }

    // Initialize event array if not exists
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    // Create subscription object
    const subscription = {
      id: this.generateId(),
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      namespace: options.namespace,
      filter: options.filter
    };

    // Add to subscriptions (sorted by priority)
    const subscriptions = this.events.get(event);
    subscriptions.push(subscription);
    subscriptions.sort((a, b) => b.priority - a.priority);

    this.log('Subscribed to event:', event, subscription.id);

    // Return unsubscribe function
    return () => this.off(event, subscription.id);
  }

  // Subscribe to an event only once
  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  // Unsubscribe from an event
  off(event, subscriptionId) {
    if (!this.events.has(event)) return;

    const subscriptions = this.events.get(event);
    const index = subscriptions.findIndex(s => s.id === subscriptionId);
    
    if (index !== -1) {
      subscriptions.splice(index, 1);
      this.log('Unsubscribed from event:', event, subscriptionId);
      
      // Clean up empty event arrays
      if (subscriptions.length === 0) {
        this.events.delete(event);
      }
    }
  }

  // Emit an event
  async emit(event, data = {}, options = {}) {
    const eventData = {
      event,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      source: options.source,
      async: options.async || false
    };

    // Add to history
    this.addToHistory(eventData);

    // Run middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(eventData);
      if (result === false) {
        this.log('Event cancelled by middleware:', event);
        return;
      }
    }

    this.log('Emitting event:', event, data);

    // Get all matching subscriptions
    const subscriptions = this.getMatchingSubscriptions(event);
    
    if (subscriptions.length === 0) {
      this.log('No subscriptions for event:', event);
      return;
    }

    // Execute callbacks
    const promises = [];
    const toRemove = [];

    for (const subscription of subscriptions) {
      // Apply filter if exists
      if (subscription.filter && !subscription.filter(data)) {
        continue;
      }

      try {
        if (options.async) {
          // Async execution
          promises.push(
            Promise.resolve(subscription.callback(data, eventData))
          );
        } else {
          // Sync execution
          await subscription.callback(data, eventData);
        }

        // Mark for removal if once
        if (subscription.once) {
          toRemove.push({ event: this.findOriginalEvent(event, subscription), id: subscription.id });
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        if (options.throwErrors) {
          throw error;
        }
      }
    }

    // Wait for all async callbacks if needed
    if (options.async && promises.length > 0) {
      await Promise.all(promises);
    }

    // Remove once subscriptions
    toRemove.forEach(({ event, id }) => this.off(event, id));
  }

  // Get all subscriptions matching an event (including wildcards)
  getMatchingSubscriptions(event) {
    const subscriptions = [];
    const eventParts = event.split(this.namespaceDelimiter);

    for (const [pattern, subs] of this.events.entries()) {
      const patternParts = pattern.split(this.namespaceDelimiter);
      
      if (this.matchesPattern(eventParts, patternParts)) {
        subscriptions.push(...subs);
      }
    }

    return subscriptions;
  }

  // Check if event matches pattern (with wildcard support)
  matchesPattern(eventParts, patternParts) {
    if (patternParts.length > eventParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === this.wildcardChar) continue;
      if (patternParts[i] !== eventParts[i]) return false;
    }

    return true;
  }

  // Find original event pattern for a subscription
  findOriginalEvent(emittedEvent, subscription) {
    for (const [pattern, subs] of this.events.entries()) {
      if (subs.includes(subscription)) {
        return pattern;
      }
    }
    return emittedEvent;
  }

  // Add middleware
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  // Remove all subscriptions for an event
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
      this.log('Removed all listeners for event:', event);
    } else {
      this.events.clear();
      this.log('Removed all event listeners');
    }
  }

  // Get all events
  getEvents() {
    return Array.from(this.events.keys());
  }

  // Get subscription count for an event
  getListenerCount(event) {
    if (!this.events.has(event)) return 0;
    return this.events.get(event).length;
  }

  // Event history management
  addToHistory(eventData) {
    this.eventHistory.push(eventData);
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getHistory(filter) {
    if (!filter) return [...this.eventHistory];
    
    return this.eventHistory.filter(event => {
      if (filter.event && !event.event.includes(filter.event)) return false;
      if (filter.source && event.source !== filter.source) return false;
      if (filter.since && new Date(event.timestamp) < new Date(filter.since)) return false;
      return true;
    });
  }

  clearHistory() {
    this.eventHistory = [];
  }

  // Utility methods
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(...args) {
    if (this.debug) {
      console.log('[EventBus]', ...args);
    }
  }

  // Namespaced events helper
  namespace(namespace) {
    const self = this;
    return {
      on: (event, callback, options) => 
        self.on(`${namespace}${self.namespaceDelimiter}${event}`, callback, { ...options, namespace }),
      
      once: (event, callback, options) => 
        self.once(`${namespace}${self.namespaceDelimiter}${event}`, callback, { ...options, namespace }),
      
      emit: (event, data, options) => 
        self.emit(`${namespace}${self.namespaceDelimiter}${event}`, data, { ...options, source: namespace }),
      
      off: (event, subscriptionId) => 
        self.off(`${namespace}${self.namespaceDelimiter}${event}`, subscriptionId),
      
      removeAllListeners: (event) => 
        self.removeAllListeners(event ? `${namespace}${self.namespaceDelimiter}${event}` : undefined)
    };
  }

  // Wait for an event (Promise-based)
  waitFor(event, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout;
      let timeoutId;

      const unsubscribe = this.once(event, (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  // Replay events from history
  replay(filter, targetCallback) {
    const events = this.getHistory(filter);
    events.forEach(eventData => {
      if (targetCallback) {
        targetCallback(eventData.data, eventData);
      } else {
        this.emit(eventData.event, eventData.data, { source: 'replay' });
      }
    });
  }
}

// Create singleton instance
window.EventBus = new EventBus();

// Application-specific event namespaces
window.Events = {
  // Order events
  ORDER: window.EventBus.namespace('order'),
  
  // Machine events  
  MACHINE: window.EventBus.namespace('machine'),
  
  // User/Auth events
  AUTH: window.EventBus.namespace('auth'),
  
  // UI events
  UI: window.EventBus.namespace('ui'),
  
  // System events
  SYSTEM: window.EventBus.namespace('system'),
  
  // Navigation events
  NAV: window.EventBus.namespace('nav')
};

// Common event names
window.EventNames = {
  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  ORDER_STARTED: 'order:started',
  ORDER_STOPPED: 'order:stopped',
  ORDER_COMPLETED: 'order:completed',
  ORDER_SELECTED: 'order:selected',
  
  // Machine events
  MACHINE_CREATED: 'machine:created',
  MACHINE_UPDATED: 'machine:updated',
  MACHINE_DELETED: 'machine:deleted',
  MACHINE_STATUS_CHANGED: 'machine:status_changed',
  
  // Auth events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_UNAUTHORIZED: 'auth:unauthorized',
  AUTH_TOKEN_REFRESH: 'auth:token_refresh',
  
  // UI events
  UI_MODAL_OPEN: 'ui:modal_open',
  UI_MODAL_CLOSE: 'ui:modal_close',
  UI_LOADING_START: 'ui:loading_start',
  UI_LOADING_END: 'ui:loading_end',
  UI_FILTER_CHANGE: 'ui:filter_change',
  UI_REFRESH_REQUEST: 'ui:refresh_request',
  
  // System events
  SYSTEM_ONLINE: 'system:online',
  SYSTEM_OFFLINE: 'system:offline',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_UPDATE_AVAILABLE: 'system:update_available',
  
  // Navigation events
  NAV_ROUTE_CHANGE: 'nav:route_change',
  NAV_TAB_CHANGE: 'nav:tab_change',
  NAV_BACK: 'nav:back'
};

// Integration with existing services
if (window.API) {
  // Emit events on API responses
  const originalRequest = window.API.request;
  window.API.request = async function(...args) {
    try {
      window.EventBus.emit('api:request_start', { endpoint: args[0], options: args[1] });
      const result = await originalRequest.apply(this, args);
      window.EventBus.emit('api:request_success', { endpoint: args[0], result });
      return result;
    } catch (error) {
      window.EventBus.emit('api:request_error', { endpoint: args[0], error });
      throw error;
    }
  };
}

// Handle system-wide events
window.addEventListener('online', () => {
  window.EventBus.emit(window.EventNames.SYSTEM_ONLINE);
});

window.addEventListener('offline', () => {
  window.EventBus.emit(window.EventNames.SYSTEM_OFFLINE);
});

// Handle auth events
window.addEventListener('auth:unauthorized', () => {
  window.EventBus.emit(window.EventNames.AUTH_UNAUTHORIZED);
  window.Events.NAV.emit('redirect', { path: '/login' });
});
