// app.js - Full working version
window.addEventListener('DOMContentLoaded', async () => {
  console.log('Starting app...');
  
  // Initialize modules
  await window.initializeModules();
  
  // Set React shortcuts
  window.useState = React.useState;
  window.useEffect = React.useEffect;
  window.useRef = React.useRef;
  window.useCallback = React.useCallback;
  window.useMemo = React.useMemo;
  
  // Initialize Router
  if (window.Router) window.Router.init();
  
  // Define routes
  const routes = [
    { path: '/', component: 'Dashboard' },
    { path: '/production', component: 'ProductionDashboard' },
    { path: '/orders', component: 'OrdersPage' },
    { path: '/machines', component: 'MachinesPage' },
    { path: '/analytics', component: 'AnalyticsPage' },
    { path: '/users', component: 'UsersPage' },
    { path: '/admin', component: 'AdminPanel' },
    { path: '/settings', component: 'SettingsPage' }
  ];
  
  routes.forEach(route => window.Router.addRoute(route));
  
  // Main App component
  const App = () => {
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    React.useEffect(() => {
      const handleRouteChange = () => {
        setCurrentPath(window.location.pathname);
      };
      
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }, []);
    
    if (!token) {
      return React.createElement(window.LoginForm);
    }
    
    // Set token in API
    if (window.API && token) {
      window.API.setToken(token);
    }
    
    // Get component based on current path
    let Component = window.Dashboard; // default
    
    if (currentPath === '/production') Component = window.ProductionDashboard;
    else if (currentPath === '/orders') Component = window.OrdersPage;
    else if (currentPath === '/machines') Component = window.MachinesPage;
    else if (currentPath === '/analytics') Component = window.AnalyticsPage;
    else if (currentPath === '/users') Component = window.UsersPage;
    else if (currentPath === '/admin') Component = window.AdminPanel;
    else if (currentPath === '/settings') Component = window.SettingsPage;
    
    return React.createElement(window.MainLayout, {title: 'Production System'},
      React.createElement(Component || window.Dashboard)
    );
  };
  
  // Wrap with AuthProvider
  const AppWithAuth = () => {
    return React.createElement(window.AuthProvider, {},
      React.createElement(App)
    );
  };
  
  // Render
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(AppWithAuth));
  
  console.log('App ready!');
});
