// js/hooks/hooks.js - Custom React Hooks
// Reusable hooks for common functionality

const { useState, useEffect, useCallback, useMemo, useRef, useReducer } = React;

// API Hook - Handle API calls with loading and error states
window.useApi = (apiMethod, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiMethod(...args);
      if (isMounted.current) {
        setData(result);
        return result;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err);
        if (window.notify) {
          window.notify.error(err.message || 'An error occurred');
        }
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, deps);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

// WebSocket Hook - Subscribe to WebSocket events
window.useWebSocket = (eventHandlers = {}) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!window.WS) return;

    // Connection status
    const handleConnected = () => setConnected(true);
    const handleDisconnected = () => setConnected(false);

    const unsubscribeConnected = window.WS.on('connected', handleConnected);
    const unsubscribeDisconnected = window.WS.on('disconnected', handleDisconnected);

    // Set initial status
    setConnected(window.WS.isConnected);

    // Event handlers
    const unsubscribers = [];
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      const wrappedHandler = (data, timestamp) => {
        setLastMessage({ event, data, timestamp });
        handler(data, timestamp);
      };
      unsubscribers.push(window.WS.on(event, wrappedHandler));
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const send = useCallback((type, data) => {
    if (window.WS) {
      window.WS.send(type, data);
    }
  }, []);

  return { connected, lastMessage, send };
};

// Event Bus Hook - Subscribe to event bus events
window.useEventBus = (eventHandlers = {}) => {
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!window.EventBus) return;

    const unsubscribers = [];
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      const wrappedHandler = (data) => {
        setLastEvent({ event, data, timestamp: Date.now() });
        handler(data);
      };
      unsubscribers.push(window.EventBus.on(event, wrappedHandler));
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (window.EventBus) {
      window.EventBus.emit(event, data);
    }
  }, []);

  return { lastEvent, emit };
};

// Local Storage Hook
window.useLocalStorage = (key, initialValue) => {
  // Get from storage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      return window.Storage ? window.Storage.get(key, initialValue) : initialValue;
    } catch (error) {
      console.error('useLocalStorage error:', error);
      return initialValue;
    }
  });

  // Update both state and storage
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (window.Storage) {
        window.Storage.set(key, valueToStore);
      }
    } catch (error) {
      console.error('useLocalStorage setValue error:', error);
    }
  }, [key, storedValue]);

  // Listen for external changes
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key && event.newValue !== null) {
        setStoredValue(JSON.parse(event.newValue));
      }
    };

    if (window.EventBus) {
      return window.EventBus.on('storage:external_change', handleStorageChange);
    }
  }, [key]);

  return [storedValue, setValue];
};

// Session Storage Hook
window.useSessionStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      return window.Storage?.session.get(key, initialValue) || initialValue;
    } catch (error) {
      console.error('useSessionStorage error:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (window.Storage) {
        window.Storage.session.set(key, valueToStore);
      }
    } catch (error) {
      console.error('useSessionStorage setValue error:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// Debounce Hook
window.useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Interval Hook
window.useInterval = (callback, delay) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => {
        savedCallback.current();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// Window Size Hook
window.useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Media Query Hook
window.useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
};

// Click Outside Hook
window.useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// Previous Value Hook
window.usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// Toggle Hook
window.useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);
  
  const setTrue = useCallback(() => {
    setValue(true);
  }, []);
  
  const setFalse = useCallback(() => {
    setValue(false);
  }, []);
  
  return { value, toggle, setTrue, setFalse };
};

// Counter Hook
window.useCounter = (initialValue = 0, options = {}) => {
  const { min, max, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(c => {
      const newCount = c + step;
      return max !== undefined ? Math.min(newCount, max) : newCount;
    });
  }, [max, step]);

  const decrement = useCallback(() => {
    setCount(c => {
      const newCount = c - step;
      return min !== undefined ? Math.max(newCount, min) : newCount;
    });
  }, [min, step]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const setValue = useCallback((value) => {
    let newValue = value;
    if (min !== undefined) newValue = Math.max(newValue, min);
    if (max !== undefined) newValue = Math.min(newValue, max);
    setCount(newValue);
  }, [min, max]);

  return { count, increment, decrement, reset, setValue };
};

// Async Effect Hook
window.useAsyncEffect = (effect, deps) => {
  useEffect(() => {
    let cancelled = false;
    
    const asyncEffect = async () => {
      const cleanup = await effect(() => cancelled);
      if (cleanup && typeof cleanup === 'function') {
        return cleanup;
      }
    };
    
    const cleanup = asyncEffect();
    
    return () => {
      cancelled = true;
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && fn());
      }
    };
  }, deps);
};

// Fetch Hook
window.useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// List Hook - Manage list state
window.useList = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);

  const add = useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);

  const remove = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const update = useCallback((index, newItem) => {
    setItems(prev => prev.map((item, i) => i === index ? newItem : item));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const reset = useCallback(() => {
    setItems(initialItems);
  }, [initialItems]);

  const push = useCallback((...newItems) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const filter = useCallback((predicate) => {
    setItems(prev => prev.filter(predicate));
  }, []);

  const sort = useCallback((compareFn) => {
    setItems(prev => [...prev].sort(compareFn));
  }, []);

  return {
    items,
    setItems,
    add,
    remove,
    update,
    clear,
    reset,
    push,
    filter,
    sort
  };
};

// Modal Hook
window.useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return { isOpen, data, open, close, toggle };
};

// Pagination Hook
window.usePagination = (totalItems, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);
  
  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);
  
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Permission Hook
window.usePermission = (requiredRoles) => {
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    if (window.useAuth) {
      const { user } = window.useAuth();
      if (user && window.Utils?.hasRole) {
        setHasPermission(window.Utils.hasRole(user, requiredRoles));
      }
    }
  }, [requiredRoles]);
  
  return hasPermission;
};
