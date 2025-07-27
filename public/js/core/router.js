// router.js - Client-side Router
// Save as: public/js/core/router.js

class RouterService {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.listening = false;
  }
  
  init() {
    this.listening = true;
    
    // Listen for popstate events
    window.addEventListener('popstate', (e) => {
      this.handleRouteChange();
    });
    
    // Initial route
    this.handleRouteChange();
  }
  
  addRoute(route) {
    this.routes.push(route);
  }
  
  navigate(path, options = {}) {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
      this.handleRouteChange();
    }
  }
  
  back() {
    window.history.back();
  }
  
  handleRouteChange() {
    const path = window.location.pathname;
    const route = this.findRoute(path);
    
    this.currentRoute = route;
    
    if (window.EventBus) {
      window.EventBus.emit('router:navigation', {
        route,
        path,
        params: route ? {} : null
      });
    }
  }
  
  findRoute(path) {
    return this.routes.find(route => {
      if (route.path === path) return true;
      
      // Simple pattern matching for dynamic routes
      const routeParts = route.path.split('/');
      const pathParts = path.split('/');
      
      if (routeParts.length !== pathParts.length) return false;
      
      return routeParts.every((part, index) => {
        return part.startsWith(':') || part === pathParts[index];
      });
    });
  }
  
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      path: window.location.pathname,
      params: {},
      query: this.getQueryParams()
    };
  }
  
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
  
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
  }
  
  isActive(path, exact = false) {
    const currentPath = window.location.pathname;
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  }
  
  link(path) {
    return path;
  }
}

// Create singleton instance
window.Router = new RouterService();

// React Hook for Router
window.useRouter = () => {
  const [route, setRoute] = React.useState(window.Router.getCurrentRoute());
  
  React.useEffect(() => {
    const handleNavigation = (data) => {
      setRoute({
        route: data.route,
        path: data.path,
        params: data.params || {},
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
