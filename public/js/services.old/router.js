// js/services/router.js - Router and Navigation Service
// Simple client-side routing for single-page application

class RouterService {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.history = [];
    this.maxHistorySize = 50;
    this.beforeHooks = [];
    this.afterHooks = [];
    this.errorHandler = null;
    this.baseUrl = window.location.origin;
    this.isNavigating = false;
    this.init();
  }

  // Initialize router
  init() {
    this.listening = true;
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', (e) => {
      this.handleRouteChange();
    });
    
    // Initial route
    this/handleRouteChange();
  }

  addRoute(route) {
    this.routes.push(route);
  }
    // Intercept link clicks
    document.addEventListener('click', (e) => {
      this.handleLinkClick(e);
    });

    // Listen for custom navigation events
    if (window.EventBus) {
      window.EventBus.on('nav:route_change', ({ path, params }) => {
        this.navigate(path, params);
      });
      
      window.EventBus.on('nav:back', () => {
        this.back();
      });
    }
  }

  // Register a route
  register(path, options = {}) {
    const route = {
      path,
      pattern: this.createPattern(path),
      component: options.component,
      title: options.title,
      meta: options.meta || {},
      guards: options.guards || [],
      onEnter: options.onEnter,
      onLeave: options.onLeave,
      children: options.children || []
    };

    this.routes.set(path, route);

    // Register child routes
    if (route.children.length > 0) {
      route.children.forEach(child => {
        this.register(`${path}${child.path}`, {
          ...child,
          parent: route
        });
      });
    }

    return this;
  }
// Add to helpers.js after line 70
window.useClickOutside = (ref, callback) => {
  React.useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
};
  // Create route pattern for matching
  createPattern(path) {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${pattern}$`);
  }

  // Navigate to a route
  async navigate(path, options = {}) {
    if (this.isNavigating) {
      console.warn('Navigation already in progress');
      return;
    }

    // Normalize path
    path = this.normalizePath(path);

    // Find matching route
    const match = this.matchRoute(path);
    if (!match) {
      this.handleNotFound(path);
      return;
    }

    const { route, params } = match;
    
    try {
      this.isNavigating = true;

      // Run before hooks
      for (const hook of this.beforeHooks) {
        const result = await hook(route, this.currentRoute, params);
        if (result === false) {
          this.isNavigating = false;
          return;
        }
      }

      // Run route guards
      for (const guard of route.guards) {
        const result = await guard(route, params);
        if (result === false) {
          this.isNavigating = false;
          return;
        }
        if (typeof result === 'string') {
          this.isNavigating = false;
          this.navigate(result);
          return;
        }
      }

      // Leave current route
      if (this.currentRoute && this.currentRoute.onLeave) {
        await this.currentRoute.onLeave();
      }

      // Update browser history
      if (!options.replace) {
        window.history.pushState(
          { path, params },
          route.title || '',
          path
        );
      } else {
        window.history.replaceState(
          { path, params },
          route.title || '',
          path
        );
      }

      // Update current route
      const previousRoute = this.currentRoute;
      this.currentRoute = route;
      
      // Add to history
      this.addToHistory({
        path,
        route,
        params,
        timestamp: Date.now()
      });

      // Update document title
      if (route.title) {
        document.title = typeof route.title === 'function' 
          ? route.title(params) 
          : route.title;
      }

      // Enter new route
      if (route.onEnter) {
        await route.onEnter(params);
      }

      // Emit events
      if (window.EventBus) {
        window.EventBus.emit('router:navigation', {
          path,
          route,
          params,
          previousRoute
        });
      }

      // Run after hooks
      for (const hook of this.afterHooks) {
        await hook(route, previousRoute, params);
      }

      // Render component if using React
      if (route.component && window.RouterOutlet) {
        window.RouterOutlet.render(route.component, { params, route });
      }

    } catch (error) {
      console.error('Navigation error:', error);
      if (this.errorHandler) {
        this.errorHandler(error, route);
      }
    } finally {
      this.isNavigating = false;
    }
  }

  // Match a path to a route
  matchRoute(path) {
    for (const [routePath, route] of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        return {
          route,
          params: match.groups || {}
        };
      }
    }
    return null;
  }

  // Handle browser back/forward
  handlePopState(event) {
    const state = event.state;
    if (state && state.path) {
      this.navigate(state.path, { 
        replace: true,
        skipHistory: true 
      });
    }
  }

  // Handle link clicks
  handleLinkClick(event) {
    // Check if it's a link
    const link = event.target.closest('a');
    if (!link) return;

    // Check if it's an internal link
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    // Check for data-router attribute
    if (link.getAttribute('data-router') === 'false') return;

    // Prevent default and navigate
    event.preventDefault();
    this.navigate(href);
  }

  // Navigate back
  back() {
    window.history.back();
  }

  // Navigate forward
  forward() {
    window.history.forward();
  }

  // Go to specific history index
  go(delta) {
    window.history.go(delta);
  }

  // Replace current route
  replace(path, options = {}) {
    this.navigate(path, { ...options, replace: true });
  }

  // Add before navigation hook
  beforeEach(hook) {
    this.beforeHooks.push(hook);
    return () => {
      const index = this.beforeHooks.indexOf(hook);
      if (index > -1) this.beforeHooks.splice(index, 1);
    };
  }

  // Add after navigation hook
  afterEach(hook) {
    this.afterHooks.push(hook);
    return () => {
      const index = this.afterHooks.indexOf(hook);
      if (index > -1) this.afterHooks.splice(index, 1);
    };
  }

  // Set error handler
  onError(handler) {
    this.errorHandler = handler;
  }

  // Handle not found
  handleNotFound(path) {
    console.warn('Route not found:', path);
    
    // Check if there's a catch-all route
    const catchAll = this.routes.get('*');
    if (catchAll) {
      this.navigate('*', { params: { path } });
    } else if (window.EventBus) {
      window.EventBus.emit('router:not_found', { path });
    }
  }

  // Get current route info
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      path: window.location.pathname,
      params: this.currentParams || {},
      query: this.getQueryParams()
    };
  }

  // Get query parameters
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  // Update query parameters
  updateQueryParams(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });

    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }

    if (window.EventBus) {
      window.EventBus.emit('router:query_change', params);
    }
  }

  // Normalize path
  normalizePath(path) {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove trailing slash except for root
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  // Add to history
  addToHistory(entry) {
    this.history.push(entry);
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Get navigation history
  getHistory() {
    return [...this.history];
  }

  // Check if can navigate back
  canGoBack() {
    return window.history.length > 1;
  }

  // Create link helper
  link(path, params = {}) {
    let url = path;
    
    // Replace params
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
    
    return url;
  }

  // Check if path is active
  isActive(path, exact = false) {
    const currentPath = window.location.pathname;
    
    if (exact) {
      return currentPath === path;
    }
    
    return currentPath.startsWith(path);
  }

  // Route guards
  guards = {
    // Authentication guard
    auth: async (route, params) => {
      if (window.useAuth) {
        const { isAuthenticated } = window.useAuth();
        if (!isAuthenticated) {
          return '/login';
        }
      }
      return true;
    },

    // Role-based guard
    role: (roles) => async (route, params) => {
      if (window.useAuth && window.Utils) {
        const { user } = window.useAuth();
        if (!user || !window.Utils.hasRole(user, roles)) {
          if (window.notify) {
            window.notify.error('You do not have permission to access this page');
          }
          return false;
        }
      }
      return true;
    },

    // Async data guard
    asyncData: (loader) => async (route, params) => {
      try {
        route.data = await loader(params);
        return true;
      } catch (error) {
        console.error('Failed to load route data:', error);
        return '/error';
      }
    }
  };
}

// Create singleton instance
window.Router = new RouterService();

// React Router Outlet Component
window.RouterOutlet = {
  component: null,
  props: null,
  
  render(component, props) {
    this.component = component;
    this.props = props;
    
    if (window.EventBus) {
      window.EventBus.emit('router:render', { component, props });
    }
  },
  
  getComponent() {
    return this.component;
  },
  
  getProps() {
    return this.props;
  }
};

// React Hook for Router
window.useRouter = () => {
  const [route, setRoute] = React.useState(window.Router.getCurrentRoute());
  
  React.useEffect(() => {
    const handleNavigation = ({ route, params, path }) => {
      setRoute({
        route,
        path,
        params,
        query: window.Router.getQueryParams()
      });
    };
    
    if (window.EventBus) {
      return window.EventBus.on('router:navigation', handleNavigation);
    }
  }, []);
  
  const navigate = React.useCallback((path, options) => {
    window.Router.navigate(path, options);
  }, []);
  
  const back = React.useCallback(() => {
    window.Router.back();
  }, []);
  
  const updateQuery = React.useCallback((params, replace) => {
    window.Router.updateQueryParams(params, replace);
  }, []);
  
  return {
    route: route.route,
    path: route.path,
    params: route.params,
    query: route.query,
    navigate,
    back,
    updateQuery,
    isActive: window.Router.isActive.bind(window.Router),
    link: window.Router.link.bind(window.Router)
  };
};

// Link Component Helper
window.RouterLink = ({ to, children, className, activeClassName, exact = false, ...props }) => {
  const { navigate, isActive } = window.useRouter();
  
  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  
  const isLinkActive = isActive(to, exact);
  const finalClassName = `${className || ''} ${isLinkActive && activeClassName ? activeClassName : ''}`.trim();
  
  return React.createElement('a', {
    href: to,
    onClick: handleClick,
    className: finalClassName,
    'data-active': isLinkActive,
    ...props
  }, children);
};
