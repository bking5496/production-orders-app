// js/services/storage.js - Local Storage Service with Caching
// Handles local data storage, caching, and synchronization

class StorageService {
  constructor() {
    this.prefix = 'pms_'; // Production Management System prefix
    this.cache = new Map();
    this.ttlTimers = new Map();
    this.maxSize = 5 * 1024 * 1024; // 5MB limit
    this.compressionThreshold = 1024; // Compress data larger than 1KB
    this.version = '1.0';
    this.encryptionKey = null;
    this.syncQueue = [];
    this.init();
  }

  // Initialize storage service
  init() {
    // Check storage availability
    this.isAvailable = this.checkAvailability();
    
    // Load existing cache
    if (this.isAvailable) {
      this.loadCache();
      this.cleanupExpired();
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => this.handleStorageEvent(e));

    // Periodic cleanup
    setInterval(() => this.cleanupExpired(), 60000); // Every minute

    // Listen for sync events
    if (window.EventBus) {
      window.EventBus.on('system:online', () => this.processSyncQueue());
    }
  }

  // Check if localStorage is available
  checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  }

  // Set item with optional TTL
  set(key, value, options = {}) {
    if (!this.isAvailable) return false;

    const fullKey = this.getKey(key);
    const now = Date.now();
    
    // Prepare data object
    const data = {
      value,
      timestamp: now,
      version: this.version,
      compressed: false,
      encrypted: false
    };

    // Add expiration if TTL provided
    if (options.ttl) {
      data.expires = now + options.ttl;
      this.setTTLTimer(fullKey, options.ttl);
    }

    // Compress if needed
    if (options.compress !== false && this.shouldCompress(value)) {
      data.value = this.compress(value);
      data.compressed = true;
    }

    // Encrypt if needed
    if (options.encrypt && this.encryptionKey) {
      data.value = this.encrypt(data.value);
      data.encrypted = true;
    }

    try {
      const serialized = JSON.stringify(data);
      
      // Check size limit
      if (serialized.length > this.maxSize) {
        throw new Error('Data too large for storage');
      }

      // Store in localStorage
      localStorage.setItem(fullKey, serialized);
      
      // Update cache
      this.cache.set(key, {
        value,
        expires: data.expires,
        size: serialized.length
      });

      // Emit event
      if (window.EventBus) {
        window.EventBus.emit('storage:set', { key, value, options });
      }

      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      
      // Try to free up space if quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.cleanup(serialized.length);
        
        // Retry once
        try {
          localStorage.setItem(fullKey, serialized);
          return true;
        } catch (retryError) {
          console.error('Storage set retry failed:', retryError);
        }
      }
      
      return false;
    }
  }

  // Get item from storage
  get(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (!cached.expires || cached.expires > Date.now())) {
      return cached.value;
    }

    const fullKey = this.getKey(key);
    
    try {
      const stored = localStorage.getItem(fullKey);
      if (!stored) return defaultValue;

      const data = JSON.parse(stored);
      
      // Check expiration
      if (data.expires && data.expires < Date.now()) {
        this.remove(key);
        return defaultValue;
      }

      let value = data.value;

      // Decrypt if needed
      if (data.encrypted && this.encryptionKey) {
        value = this.decrypt(value);
      }

      // Decompress if needed
      if (data.compressed) {
        value = this.decompress(value);
      }

      // Update cache
      this.cache.set(key, {
        value,
        expires: data.expires,
        size: stored.length
      });

      return value;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  // Remove item
  remove(key) {
    if (!this.isAvailable) return false;

    const fullKey = this.getKey(key);
    
    try {
      localStorage.removeItem(fullKey);
      this.cache.delete(key);
      this.clearTTLTimer(fullKey);

      // Emit event
      if (window.EventBus) {
        window.EventBus.emit('storage:remove', { key });
      }

      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  // Clear all storage
  clear(pattern) {
    if (!this.isAvailable) return;

    try {
      if (pattern) {
        // Clear only matching keys
        const keys = this.keys(pattern);
        keys.forEach(key => this.remove(key));
      } else {
        // Clear all with prefix
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
        
        this.cache.clear();
        this.ttlTimers.forEach(timer => clearTimeout(timer));
        this.ttlTimers.clear();
      }

      // Emit event
      if (window.EventBus) {
        window.EventBus.emit('storage:clear', { pattern });
      }
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  // Get all keys
  keys(pattern) {
    if (!this.isAvailable) return [];

    const keys = [];
    const fullPattern = pattern ? new RegExp(pattern) : null;

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        const shortKey = key.substring(this.prefix.length);
        if (!fullPattern || fullPattern.test(shortKey)) {
          keys.push(shortKey);
        }
      }
    });

    return keys;
  }

  // Check if key exists
  has(key) {
    return this.get(key) !== null;
  }

  // Get storage size
  getSize() {
    if (!this.isAvailable) return 0;

    let size = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        size += localStorage.getItem(key).length;
      }
    });

    return size;
  }

  // Session storage methods
  session = {
    set: (key, value) => {
      try {
        sessionStorage.setItem(this.getKey(key), JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Session storage set error:', error);
        return false;
      }
    },

    get: (key, defaultValue = null) => {
      try {
        const stored = sessionStorage.getItem(this.getKey(key));
        return stored ? JSON.parse(stored) : defaultValue;
      } catch (error) {
        console.error('Session storage get error:', error);
        return defaultValue;
      }
    },

    remove: (key) => {
      try {
        sessionStorage.removeItem(this.getKey(key));
        return true;
      } catch (error) {
        console.error('Session storage remove error:', error);
        return false;
      }
    },

    clear: () => {
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('Session storage clear error:', error);
      }
    }
  };

  // Cache specific methods
  cache = {
    set: (key, value, ttl = 3600000) => { // Default 1 hour
      return this.set(`cache:${key}`, value, { ttl, compress: true });
    },

    get: (key, fetcher) => {
      const cached = this.get(`cache:${key}`);
      if (cached !== null) return Promise.resolve(cached);

      if (fetcher) {
        return fetcher().then(value => {
          this.cache.set(key, value);
          return value;
        });
      }

      return Promise.resolve(null);
    },

    invalidate: (pattern) => {
      const keys = this.keys(`cache:${pattern || '.*'}`);
      keys.forEach(key => this.remove(key));
    }
  };

  // Application state storage
  state = {
    save: (key, state) => {
      return this.set(`state:${key}`, state, { compress: true });
    },

    load: (key, defaultState = {}) => {
      return this.get(`state:${key}`, defaultState);
    },

    update: (key, updater) => {
      const current = this.state.load(key);
      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return this.state.save(key, updated);
    }
  };

  // User preferences storage
  preferences = {
    set: (key, value) => {
      const prefs = this.get('preferences', {});
      prefs[key] = value;
      return this.set('preferences', prefs);
    },

    get: (key, defaultValue) => {
      const prefs = this.get('preferences', {});
      return prefs[key] !== undefined ? prefs[key] : defaultValue;
    },

    getAll: () => {
      return this.get('preferences', {});
    },

    clear: () => {
      return this.remove('preferences');
    }
  };

  // Sync queue for offline operations
  queueForSync(operation) {
    this.syncQueue.push({
      id: this.generateId(),
      operation,
      timestamp: Date.now(),
      attempts: 0
    });
    
    this.set('syncQueue', this.syncQueue);
    
    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        await item.operation();
        console.log('Sync operation completed:', item.id);
      } catch (error) {
        console.error('Sync operation failed:', item.id, error);
        item.attempts++;
        
        if (item.attempts < 3) {
          this.syncQueue.push(item);
        }
      }
    }

    if (this.syncQueue.length > 0) {
      this.set('syncQueue', this.syncQueue);
    } else {
      this.remove('syncQueue');
    }
  }

  // Helper methods
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  shouldCompress(value) {
    const size = JSON.stringify(value).length;
    return size > this.compressionThreshold;
  }

  compress(value) {
    // Simple compression using LZ-string would go here
    // For now, just return the value
    return value;
  }

  decompress(value) {
    // Decompression logic would go here
    return value;
  }

  encrypt(value) {
    // Encryption logic would go here
    return value;
  }

  decrypt(value) {
    // Decryption logic would go here
    return value;
  }

  setTTLTimer(key, ttl) {
    this.clearTTLTimer(key);
    
    const timer = setTimeout(() => {
      this.remove(key.substring(this.prefix.length));
    }, ttl);
    
    this.ttlTimers.set(key, timer);
  }

  clearTTLTimer(key) {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  loadCache() {
    // Pre-load frequently accessed items into cache
    const cacheKeys = ['preferences', 'state:filters', 'state:ui'];
    cacheKeys.forEach(key => this.get(key));
  }

  cleanupExpired() {
    const now = Date.now();
    const keys = this.keys();
    
    keys.forEach(key => {
      const fullKey = this.getKey(key);
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expires && data.expires < now) {
            this.remove(key);
          }
        }
      } catch (error) {
        // Remove corrupted data
        this.remove(key);
      }
    });
  }

  cleanup(bytesNeeded = 0) {
    // Remove expired items first
    this.cleanupExpired();
    
    // If still need space, remove oldest cached items
    if (bytesNeeded > 0) {
      const items = [];
      this.cache.forEach((value, key) => {
        if (key.startsWith('cache:')) {
          items.push({ key, size: value.size, timestamp: value.timestamp });
        }
      });
      
      // Sort by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp);
      
      let freed = 0;
      for (const item of items) {
        this.remove(item.key);
        freed += item.size;
        if (freed >= bytesNeeded) break;
      }
    }
  }

  handleStorageEvent(event) {
    if (!event.key || !event.key.startsWith(this.prefix)) return;
    
    const key = event.key.substring(this.prefix.length);
    
    // Update cache
    if (event.newValue === null) {
      this.cache.delete(key);
    } else {
      // Invalidate cache entry
      this.cache.delete(key);
    }

    // Emit event
    if (window.EventBus) {
      window.EventBus.emit('storage:external_change', {
        key,
        oldValue: event.oldValue,
        newValue: event.newValue
      });
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export/Import functionality
  async export() {
    const data = {};
    const keys = this.keys();
    
    keys.forEach(key => {
      data[key] = this.get(key);
    });
    
    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      data
    };
  }

  async import(exportedData) {
    if (exportedData.version !== this.version) {
      console.warn('Version mismatch during import');
    }
    
    Object.entries(exportedData.data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
}

// Create singleton instance
window.Storage = new StorageService();

// Convenience methods
window.storage = {
  set: (key, value, options) => window.Storage.set(key, value, options),
  get: (key, defaultValue) => window.Storage.get(key, defaultValue),
  remove: (key) => window.Storage.remove(key),
  clear: (pattern) => window.Storage.clear(pattern),
  has: (key) => window.Storage.has(key)
};
